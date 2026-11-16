import { captureOriginalRow, cleanRawRow } from './cleaner';
import { COUNTRY_TO_REGION, DEFAULT_RULES_CONFIG } from './constants';
import { scoreRecord } from './scorer';
import { buildDuplicateKey, getTodayIsoDate, validateCleanedRow } from './validator';
import type {
  AccessibilityFlag,
  BankSummary,
  CategorySummary,
  DatasetSummaries,
  PipelineResult,
  PipelineRulesConfig,
  RawUxRow,
  RegionSummary,
  RejectedUxRecord,
  RejectionReasonSummary,
  UxGrade,
  ValidUxRecord,
} from '../types/ux';

/**
 * Generates a unique internal ID for rejected rows so React tables and editors
 * can track them reliably even when record_id is blank or duplicated.
 */
function createRejectedId(index: number): string {
  return `rej-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Groups rejection reasons into clean buckets for charts and filters
 * while keeping full detailed strings in `reasons`.
 */
export function categorizeRejectionReason(reason: string): string {
  if (reason.startsWith('BR1:')) return 'Missing mandatory field (BR1)';
  if (reason.includes('Unsupported country')) return 'Unsupported country (BR2)';
  if (reason.includes('Invalid screen_category')) return 'Invalid screen category (BR2)';
  if (reason.includes('Invalid auth_method')) return 'Invalid auth method (BR2)';
  if (reason.includes('Invalid accessibility_flag')) return 'Invalid accessibility flag (BR2)';
  if (reason.includes('Unknown feature')) return 'Unknown feature (BR2)';
  if (reason.includes('ux_rating')) return 'Invalid UX rating (BR3)';
  if (reason.includes('screen_no')) return 'Invalid screen number (BR3)';
  if (reason.includes('collected_date')) return 'Invalid or future date (BR4)';
  if (reason.startsWith('BR5:')) return 'Duplicate screen key (BR5)';
  return reason;
}

/**
 * Step 5: Aggregates valid and rejected records into Bank, Category, Region,
 * and Rejection Reason summaries.
 */
export function buildSummaries(
  validRecords: ValidUxRecord[],
  rejectedRecords: RejectedUxRecord[]
): DatasetSummaries {
  // 1. Bank Summary
  const bankMap = new Map<
    string,
    {
      bank_name: string;
      country: string;
      region: string;
      app_name: string;
      count: number;
      ratingSum: number;
      scoreSum: number;
      accessibleCount: number;
      gradeCounts: Record<UxGrade, number>;
    }
  >();

  for (const rec of validRecords) {
    const key = `${rec.bank_name}||${rec.country}`;
    let entry = bankMap.get(key);
    if (!entry) {
      entry = {
        bank_name: rec.bank_name,
        country: rec.country,
        region: rec.region,
        app_name: rec.app_name,
        count: 0,
        ratingSum: 0,
        scoreSum: 0,
        accessibleCount: 0,
        gradeCounts: { Excellent: 0, Good: 0, Fair: 0, Poor: 0 },
      };
      bankMap.set(key, entry);
    }
    entry.count += 1;
    entry.ratingSum += rec.ux_rating;
    entry.scoreSum += rec.ux_score;
    if (rec.accessibility_flag === 'Yes') entry.accessibleCount += 1;
    entry.gradeCounts[rec.grade] += 1;
  }

  const byBank: BankSummary[] = Array.from(bankMap.values())
    .map((b) => {
      const dominant_grade = (Object.entries(b.gradeCounts) as [UxGrade, number][]).sort(
        (a, c) => c[1] - a[1]
      )[0][0];
      return {
        bank_name: b.bank_name,
        country: b.country,
        region: b.region,
        app_name: b.app_name,
        screen_count: b.count,
        avg_ux_rating: Math.round((b.ratingSum / b.count) * 100) / 100,
        avg_score: Math.round((b.scoreSum / b.count) * 10) / 10,
        accessibility_pct: Math.round((b.accessibleCount / b.count) * 1000) / 10,
        dominant_grade,
      };
    })
    .sort((a, b) => b.avg_score - a.avg_score || a.bank_name.localeCompare(b.bank_name));

  // 2. Category Summary
  const catMap = new Map<
    string,
    {
      count: number;
      ratingSum: number;
      scoreSum: number;
      authCounts: Record<string, number>;
    }
  >();

  for (const rec of validRecords) {
    let entry = catMap.get(rec.screen_category);
    if (!entry) {
      entry = { count: 0, ratingSum: 0, scoreSum: 0, authCounts: {} };
      catMap.set(rec.screen_category, entry);
    }
    entry.count += 1;
    entry.ratingSum += rec.ux_rating;
    entry.scoreSum += rec.ux_score;
    entry.authCounts[rec.auth_method] = (entry.authCounts[rec.auth_method] || 0) + 1;
  }

  const byCategory: CategorySummary[] = Array.from(catMap.entries())
    .map(([screen_category, c]) => {
      const top_auth_method =
        Object.entries(c.authCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';
      return {
        screen_category,
        record_count: c.count,
        avg_ux_rating: Math.round((c.ratingSum / c.count) * 100) / 100,
        avg_score: Math.round((c.scoreSum / c.count) * 10) / 10,
        top_auth_method,
      };
    })
    .sort((a, b) => b.avg_score - a.avg_score);

  // 3. Region Summary
  const regionMap = new Map<
    string,
    {
      countries: Set<string>;
      banks: Set<string>;
      count: number;
      ratingSum: number;
      scoreSum: number;
      excellentCount: number;
    }
  >();

  for (const rec of validRecords) {
    let entry = regionMap.get(rec.region);
    if (!entry) {
      entry = {
        countries: new Set(),
        banks: new Set(),
        count: 0,
        ratingSum: 0,
        scoreSum: 0,
        excellentCount: 0,
      };
      regionMap.set(rec.region, entry);
    }
    entry.countries.add(rec.country);
    entry.banks.add(rec.bank_name);
    entry.count += 1;
    entry.ratingSum += rec.ux_rating;
    entry.scoreSum += rec.ux_score;
    if (rec.grade === 'Excellent') entry.excellentCount += 1;
  }

  const byRegion: RegionSummary[] = Array.from(regionMap.entries())
    .map(([region, r]) => ({
      region,
      countries_count: r.countries.size,
      banks_count: r.banks.size,
      record_count: r.count,
      avg_ux_rating: Math.round((r.ratingSum / r.count) * 100) / 100,
      avg_score: Math.round((r.scoreSum / r.count) * 10) / 10,
      excellent_pct: Math.round((r.excellentCount / r.count) * 1000) / 10,
    }))
    .sort((a, b) => b.avg_score - a.avg_score);

  // 4. Rejection Reason Summary
  const reasonCounts = new Map<string, number>();
  for (const rej of rejectedRecords) {
    // Count each unique category of failure on the rejected row
    const categories = new Set(rej.reasons.map(categorizeRejectionReason));
    for (const cat of categories) {
      reasonCounts.set(cat, (reasonCounts.get(cat) ?? 0) + 1);
    }
  }

  const totalRejected = rejectedRecords.length || 1;
  const byRejectionReason: RejectionReasonSummary[] = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: Math.round((count / totalRejected) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    byBank,
    byCategory,
    byRegion,
    byRejectionReason,
  };
}

/**
 * Full 5-Step Pipeline:
 * 1. Load & combine rows
 * 2. Clean each row
 * 3. Validate against BR1-BR5 (checking duplicates across existing + incoming rows)
 * 4. Score & grade valid rows
 * 5. Build Bank, Category, Region, and Rejection summaries
 */
export function runPipeline(
  rawRows: RawUxRow[],
  config: PipelineRulesConfig = DEFAULT_RULES_CONFIG,
  existingValidRecords: ValidUxRecord[] = [],
  existingRejectedRecords: RejectedUxRecord[] = []
): PipelineResult {
  const todayIso = getTodayIsoDate();
  const seenKeys = new Set<string>();

  // Pre-seed duplicate keys from any existing valid dataset when appending
  for (const rec of existingValidRecords) {
    seenKeys.add(buildDuplicateKey(rec.bank_name, rec.app_name, rec.screen_no));
  }

  const newValid: ValidUxRecord[] = [];
  const newRejected: RejectedUxRecord[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const original = captureOriginalRow(raw);

    // Step 2: Clean
    const cleaned = cleanRawRow(raw);

    // Step 3: Validate
    const validation = validateCleanedRow(cleaned, seenKeys, todayIso);

    if (!validation.valid) {
      newRejected.push({
        id: createRejectedId(i),
        original,
        reasons: validation.reasons,
        primary_reason: validation.reasons[0],
        rejected_at: new Date().toISOString(),
      });
      continue;
    }

    // Record uniqueness key so subsequent rows with same (bank, app, screen_no) fail BR5
    const dupKey = buildDuplicateKey(
      cleaned.bank_name,
      cleaned.app_name,
      cleaned.screen_no as number
    );
    seenKeys.add(dupKey);

    // Step 4: Score & Grade
    const scoring = scoreRecord(
      {
        ux_rating: cleaned.ux_rating as number,
        featuresCount: cleaned.features_list.length,
        accessibility_flag: cleaned.accessibility_flag as AccessibilityFlag,
        languagesCount: cleaned.languages_list.length,
      },
      config
    );

    newValid.push({
      record_id: cleaned.record_id,
      bank_name: cleaned.bank_name,
      country: cleaned.country,
      region: COUNTRY_TO_REGION[cleaned.country] ?? 'Other',
      app_name: cleaned.app_name,
      screen_no: cleaned.screen_no as number,
      screen_name: cleaned.screen_name,
      screen_category: cleaned.screen_category,
      features_present: cleaned.features_present,
      features_list: cleaned.features_list,
      auth_method: cleaned.auth_method,
      languages_supported: cleaned.languages_supported,
      languages_list: cleaned.languages_list,
      accessibility_flag: cleaned.accessibility_flag as AccessibilityFlag,
      ux_rating: cleaned.ux_rating as number,
      collected_by: cleaned.collected_by,
      collected_date: cleaned.collected_date,
      ux_score: scoring.ux_score,
      score_breakdown: scoring.score_breakdown,
      grade: scoring.grade,
    });
  }

  const combinedValid = [...existingValidRecords, ...newValid];
  const combinedRejected = [...existingRejectedRecords, ...newRejected];
  const summaries = buildSummaries(combinedValid, combinedRejected);

  return {
    validRecords: combinedValid,
    rejectedRecords: combinedRejected,
    summaries,
    stats: {
      loaded: rawRows.length,
      cleaned: rawRows.length,
      valid: newValid.length,
      rejected: newRejected.length,
    },
  };
}

/**
 * Re-scores all existing valid records instantly when the user updates
 * score weights or grade limits in Rules & Settings.
 */
export function recalculateValidRecords(
  validRecords: ValidUxRecord[],
  rejectedRecords: RejectedUxRecord[],
  config: PipelineRulesConfig
): { validRecords: ValidUxRecord[]; summaries: DatasetSummaries } {
  const recalculated = validRecords.map((rec) => {
    const scoring = scoreRecord(
      {
        ux_rating: rec.ux_rating,
        featuresCount: rec.features_list.length,
        accessibility_flag: rec.accessibility_flag,
        languagesCount: rec.languages_list.length,
      },
      config
    );
    return {
      ...rec,
      ux_score: scoring.ux_score,
      score_breakdown: scoring.score_breakdown,
      grade: scoring.grade,
    };
  });

  return {
    validRecords: recalculated,
    summaries: buildSummaries(recalculated, rejectedRecords),
  };
}

/**
 * Attempts to clean, validate, and score a single edited row (from Add Record
 * or Rejected Records re-validation) against existing valid records.
 */
export function validateAndScoreSingleRow(
  rawRow: RawUxRow,
  existingValidRecords: ValidUxRecord[],
  config: PipelineRulesConfig
):
  | { passed: true; record: ValidUxRecord; cleaned: ReturnType<typeof cleanRawRow> }
  | { passed: false; reasons: string[]; cleaned: ReturnType<typeof cleanRawRow> } {
  const seenKeys = new Set<string>();
  for (const rec of existingValidRecords) {
    seenKeys.add(buildDuplicateKey(rec.bank_name, rec.app_name, rec.screen_no));
  }

  const cleaned = cleanRawRow(rawRow);
  const validation = validateCleanedRow(cleaned, seenKeys, getTodayIsoDate());

  if (!validation.valid) {
    return {
      passed: false,
      reasons: validation.reasons,
      cleaned,
    };
  }

  const scoring = scoreRecord(
    {
      ux_rating: cleaned.ux_rating as number,
      featuresCount: cleaned.features_list.length,
      accessibility_flag: cleaned.accessibility_flag as AccessibilityFlag,
      languagesCount: cleaned.languages_list.length,
    },
    config
  );

  const record: ValidUxRecord = {
    record_id: cleaned.record_id,
    bank_name: cleaned.bank_name,
    country: cleaned.country,
    region: COUNTRY_TO_REGION[cleaned.country] ?? 'Other',
    app_name: cleaned.app_name,
    screen_no: cleaned.screen_no as number,
    screen_name: cleaned.screen_name,
    screen_category: cleaned.screen_category,
    features_present: cleaned.features_present,
    features_list: cleaned.features_list,
    auth_method: cleaned.auth_method,
    languages_supported: cleaned.languages_supported,
    languages_list: cleaned.languages_list,
    accessibility_flag: cleaned.accessibility_flag as AccessibilityFlag,
    ux_rating: cleaned.ux_rating as number,
    collected_by: cleaned.collected_by,
    collected_date: cleaned.collected_date,
    ux_score: scoring.ux_score,
    score_breakdown: scoring.score_breakdown,
    grade: scoring.grade,
  };

  return { passed: true, record, cleaned };
}
