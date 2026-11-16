import { DEFAULT_RULES_CONFIG } from './constants';
import { generateSyntheticDataset } from './generator';
import { runPipeline } from './pipeline';
import { checkRequiredColumns } from './validator';
import type { CustomTestCase, RawUxRow, TestCaseResult } from '../types/ux';

function makeBaseValidRow(overrides: Partial<RawUxRow> = {}): RawUxRow {
  return {
    record_id: 'TC-001',
    bank_name: 'Liberty Crest Bank',
    country: 'United States',
    app_name: 'Liberty Mobile',
    screen_no: 1,
    screen_name: 'Biometric Sign-In',
    screen_category: 'Login',
    features_present: 'Biometric Login; Dark Mode',
    auth_method: 'Face ID',
    languages_supported: 'English; Spanish',
    accessibility_flag: 'Yes',
    ux_rating: 4,
    collected_by: 'QA Auditor',
    collected_date: '2025-11-15',
    ...overrides,
  };
}

/**
 * Runs all 14 built-in test cases (TC01-TC14) plus any user-defined custom test cases
 * directly against the live cleaning, validation, scoring, and column-check engine.
 */
export async function runAllTestCases(
  customTests: CustomTestCase[] = []
): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = [];

  const runSingle = (
    id: string,
    name: string,
    description: string,
    fn: () => { passed: boolean; expected: string; actual: string }
  ) => {
    const start = performance.now();
    const outcome = fn();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    results.push({ id, name, description, ...outcome, durationMs });
  };

  // TC01: Valid record accepted
  runSingle('TC01', 'Valid record accepted', 'Standard compliant record passes all rules', () => {
    const res = runPipeline([makeBaseValidRow()], DEFAULT_RULES_CONFIG);
    const passed = res.validRecords.length === 1 && res.rejectedRecords.length === 0;
    return {
      passed,
      expected: 'Accepted (1 valid, 0 rejected)',
      actual: `${res.validRecords.length} valid, ${res.rejectedRecords.length} rejected`,
    };
  });

  // TC02: Country alias "USA" becomes United States
  runSingle('TC02', 'Country alias "USA" normalized', 'Alias "USA" cleans to "United States"', () => {
    const res = runPipeline([makeBaseValidRow({ country: 'USA' })], DEFAULT_RULES_CONFIG);
    const actualCountry = res.validRecords[0]?.country ?? 'Rejected';
    return {
      passed: res.validRecords.length === 1 && actualCountry === 'United States',
      expected: 'Accepted with country = "United States"',
      actual: res.validRecords.length === 1 ? `Accepted with country = "${actualCountry}"` : `Rejected: ${res.rejectedRecords[0]?.primary_reason}`,
    };
  });

  // TC03: Blank bank name rejected
  runSingle('TC03', 'Blank bank name rejected', 'Whitespace-only bank_name fails BR1', () => {
    const res = runPipeline([makeBaseValidRow({ bank_name: '   ' })], DEFAULT_RULES_CONFIG);
    const reason = res.rejectedRecords[0]?.reasons.join('; ') ?? 'Accepted';
    return {
      passed: res.rejectedRecords.length === 1 && reason.includes('bank_name'),
      expected: 'Rejected for missing mandatory field bank_name',
      actual: res.rejectedRecords.length === 1 ? `Rejected: ${reason}` : 'Accepted',
    };
  });

  // TC04: Rating 7 rejected
  runSingle('TC04', 'Rating 7 rejected', 'ux_rating outside 1-5 fails BR3', () => {
    const res = runPipeline([makeBaseValidRow({ ux_rating: 7 })], DEFAULT_RULES_CONFIG);
    const reason = res.rejectedRecords[0]?.reasons.join('; ') ?? 'Accepted';
    return {
      passed: res.rejectedRecords.length === 1 && reason.includes('ux_rating'),
      expected: 'Rejected (ux_rating must be between 1 and 5)',
      actual: res.rejectedRecords.length === 1 ? `Rejected: ${reason}` : 'Accepted',
    };
  });

  // TC05: Rating "abc" rejected
  runSingle('TC05', 'Rating "abc" rejected', 'Non-numeric ux_rating fails BR3', () => {
    const res = runPipeline([makeBaseValidRow({ ux_rating: 'abc' })], DEFAULT_RULES_CONFIG);
    const reason = res.rejectedRecords[0]?.reasons.join('; ') ?? 'Accepted';
    return {
      passed: res.rejectedRecords.length === 1 && reason.includes('ux_rating'),
      expected: 'Rejected (ux_rating is not a valid number)',
      actual: res.rejectedRecords.length === 1 ? `Rejected: ${reason}` : 'Accepted',
    };
  });

  // TC06: Invalid category rejected
  runSingle('TC06', 'Invalid category rejected', 'Unlisted screen_category fails BR2', () => {
    const res = runPipeline([makeBaseValidRow({ screen_category: 'CryptoWallet' })], DEFAULT_RULES_CONFIG);
    const reason = res.rejectedRecords[0]?.reasons.join('; ') ?? 'Accepted';
    return {
      passed: res.rejectedRecords.length === 1 && reason.includes('screen_category'),
      expected: 'Rejected (Invalid screen_category)',
      actual: res.rejectedRecords.length === 1 ? `Rejected: ${reason}` : 'Accepted',
    };
  });

  // TC07: Future date rejected
  runSingle('TC07', 'Future date rejected', 'collected_date in future fails BR4', () => {
    const res = runPipeline([makeBaseValidRow({ collected_date: '2099-05-01' })], DEFAULT_RULES_CONFIG);
    const reason = res.rejectedRecords[0]?.reasons.join('; ') ?? 'Accepted';
    return {
      passed: res.rejectedRecords.length === 1 && reason.includes('future'),
      expected: 'Rejected (collected_date cannot be in the future)',
      actual: res.rejectedRecords.length === 1 ? `Rejected: ${reason}` : 'Accepted',
    };
  });

  // TC08: Duplicate (bank, app, screen_no) rejected and first kept
  runSingle('TC08', 'Duplicate (bank, app, screen_no) rejected', 'BR5 keeps first occurrence and rejects duplicate', () => {
    const first = makeBaseValidRow({ record_id: 'FIRST-1', screen_name: 'First Screen' });
    const dup = makeBaseValidRow({ record_id: 'DUP-2', screen_name: 'Duplicate Screen' });
    const res = runPipeline([first, dup], DEFAULT_RULES_CONFIG);
    const keptFirst = res.validRecords[0]?.record_id === 'FIRST-1';
    const dupReason = res.rejectedRecords[0]?.reasons.join('; ') ?? '';
    return {
      passed: res.validRecords.length === 1 && keptFirst && res.rejectedRecords.length === 1 && dupReason.includes('BR5'),
      expected: '1 valid (FIRST-1 kept), 1 rejected (BR5 duplicate)',
      actual: `${res.validRecords.length} valid (${res.validRecords[0]?.record_id ?? 'none'}), ${res.rejectedRecords.length} rejected (${dupReason})`,
    };
  });

  // TC09: "y"/"N" become Yes/No
  runSingle('TC09', '"y"/"N" become Yes/No', 'Accessibility flag normalizes boolean shorthand', () => {
    const rowY = makeBaseValidRow({ record_id: 'Y-1', screen_no: 1, accessibility_flag: 'y' });
    const rowN = makeBaseValidRow({ record_id: 'N-2', screen_no: 2, accessibility_flag: 'N' });
    const res = runPipeline([rowY, rowN], DEFAULT_RULES_CONFIG);
    const f1 = res.validRecords[0]?.accessibility_flag;
    const f2 = res.validRecords[1]?.accessibility_flag;
    return {
      passed: res.validRecords.length === 2 && f1 === 'Yes' && f2 === 'No',
      expected: 'accessibility_flag = "Yes" and "No"',
      actual: `accessibility_flag = "${f1 ?? 'N/A'}" and "${f2 ?? 'N/A'}"`,
    };
  });

  // TC10: Unknown feature rejected
  runSingle('TC10', 'Unknown feature rejected', 'Unapproved feature in features_present fails BR2', () => {
    const res = runPipeline(
      [makeBaseValidRow({ features_present: 'QR Pay; Laser Authentication' })],
      DEFAULT_RULES_CONFIG
    );
    const reason = res.rejectedRecords[0]?.reasons.join('; ') ?? 'Accepted';
    return {
      passed: res.rejectedRecords.length === 1 && reason.includes('Unknown feature'),
      expected: 'Rejected (Unknown feature "Laser Authentication")',
      actual: res.rejectedRecords.length === 1 ? `Rejected: ${reason}` : 'Accepted',
    };
  });

  // TC11: Maximum inputs give score 100
  runSingle('TC11', 'Maximum inputs give score 100', 'Rating 5 + 5 features + Yes + 5 languages = 100', () => {
    const res = runPipeline(
      [
        makeBaseValidRow({
          ux_rating: 5,
          features_present: 'Biometric Login; QR Pay; Bill Pay; Card Controls; Instant Transfer',
          accessibility_flag: 'Yes',
          languages_supported: 'English; Spanish; French; German; Japanese',
        }),
      ],
      DEFAULT_RULES_CONFIG
    );
    const score = res.validRecords[0]?.ux_score;
    return {
      passed: res.validRecords.length === 1 && score === 100,
      expected: 'ux_score = 100 (Excellent)',
      actual: `ux_score = ${score ?? 'Rejected'} (${res.validRecords[0]?.grade ?? 'N/A'})`,
    };
  });

  // TC12: Minimum inputs give score 12
  runSingle('TC12', 'Minimum inputs give score 12', 'Rating 1 + 0 features + No + 0 languages = 12', () => {
    const res = runPipeline(
      [
        makeBaseValidRow({
          ux_rating: 1,
          features_present: '',
          accessibility_flag: 'No',
          languages_supported: '',
        }),
      ],
      DEFAULT_RULES_CONFIG
    );
    const score = res.validRecords[0]?.ux_score;
    return {
      passed: res.validRecords.length === 1 && score === 12,
      expected: 'ux_score = 12 (Poor)',
      actual: `ux_score = ${score ?? 'Rejected'} (${res.validRecords[0]?.grade ?? 'N/A'})`,
    };
  });

  // TC13: File with missing columns is rejected with a clear message
  runSingle('TC13', 'Missing columns rejected with clear message', 'Schema validator lists missing required columns', () => {
    const headers = ['record_id', 'bank_name', 'country', 'ux_rating'];
    const colCheck = checkRequiredColumns(headers);
    return {
      passed: !colCheck.valid && colCheck.missingColumns.length === 10 && colCheck.message.includes('Missing required column'),
      expected: 'Rejected with explicit list of missing columns',
      actual: colCheck.message,
    };
  });

  // TC14: End-to-end run on generated data
  const tc14Start = performance.now();
  const generated = await generateSyntheticDataset({
    recordCount: 1000,
    bankCount: 60,
    seed: 1400,
    messyPercent: 15,
    invalidPercent: 10,
  });
  const tc14Res = runPipeline(generated, DEFAULT_RULES_CONFIG);
  const tc14Duration = Math.round((performance.now() - tc14Start) * 100) / 100;
  const tc14Passed =
    tc14Res.stats.loaded === 1000 &&
    tc14Res.validRecords.length > 750 &&
    tc14Res.rejectedRecords.length > 50 &&
    tc14Res.summaries.byBank.length >= 50 &&
    tc14Res.summaries.byRegion.length === 5;
  results.push({
    id: 'TC14',
    name: 'End-to-end run on generated data',
    description: 'Generates 1,000 records (60 banks, messy + invalid) and runs full 5-step pipeline',
    passed: tc14Passed,
    expected: '1,000 loaded, valid & rejected partitioned, 5 region & 50+ bank summaries built',
    actual: `${tc14Res.stats.loaded} loaded -> ${tc14Res.validRecords.length} valid, ${tc14Res.rejectedRecords.length} rejected, ${tc14Res.summaries.byBank.length} banks, ${tc14Res.summaries.byRegion.length} regions`,
    durationMs: tc14Duration,
  });

  // Execute user-defined custom test cases
  for (let i = 0; i < customTests.length; i++) {
    const ct = customTests[i];
    const start = performance.now();
    const res = runPipeline([ct.sampleRow], DEFAULT_RULES_CONFIG);
    const durationMs = Math.round((performance.now() - start) * 100) / 100;

    const isAccepted = res.validRecords.length === 1;
    let passed = ct.expectedOutcome === 'accepted' ? isAccepted : !isAccepted;
    const expectedParts: string[] = [
      ct.expectedOutcome === 'accepted' ? 'Valid / Accepted' : 'Rejected',
    ];

    if (ct.expectedOutcome === 'accepted' && isAccepted) {
      if (typeof ct.expectedScore === 'number' && !Number.isNaN(ct.expectedScore)) {
        expectedParts.push(`score = ${ct.expectedScore}`);
        if (res.validRecords[0].ux_score !== ct.expectedScore) passed = false;
      }
      if (ct.expectedCountry && ct.expectedCountry.trim()) {
        expectedParts.push(`country = "${ct.expectedCountry.trim()}"`);
        if (res.validRecords[0].country !== ct.expectedCountry.trim()) passed = false;
      }
    }

    if (ct.expectedOutcome === 'rejected' && ct.expectedRejectionReason?.trim()) {
      const targetReason = ct.expectedRejectionReason.trim().toLowerCase();
      expectedParts.push(`reason containing "${ct.expectedRejectionReason.trim()}"`);
      if (!isAccepted) {
        const joined = res.rejectedRecords[0].reasons.join('; ').toLowerCase();
        if (!joined.includes(targetReason)) passed = false;
      }
    }

    const actual = isAccepted
      ? `Accepted (score = ${res.validRecords[0].ux_score}, country = "${res.validRecords[0].country}")`
      : `Rejected (${res.rejectedRecords[0].reasons.join('; ')})`;

    results.push({
      id: `CUSTOM-${String(i + 1).padStart(2, '0')}`,
      name: ct.name,
      description: 'User-defined custom test case',
      passed,
      expected: expectedParts.join(', '),
      actual,
      isCustom: true,
      durationMs,
    });
  }

  return results;
}
