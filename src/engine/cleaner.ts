import {
  APPROVED_AUTH_METHODS,
  APPROVED_CATEGORIES,
  APPROVED_COUNTRIES,
  APPROVED_FEATURES,
  COUNTRY_ALIASES,
  LANGUAGE_ALIASES,
  OFFICIAL_LANGUAGES,
  REQUIRED_COLUMNS,
} from './constants';
import type { CleanedUxRow, RawUxRow } from '../types/ux';

/**
 * Step 2 Helper: Safely converts any raw cell value to a trimmed string.
 * Blank or null/undefined values become an empty string (treated as missing).
 */
export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  return str.length === 0 ? '' : str;
}

/**
 * Preserves the exact original row values as strings before cleaning,
 * so Rejected Records can display unmodified user data alongside rejection reasons.
 */
export function captureOriginalRow(row: RawUxRow): Record<string, string> {
  const original: Record<string, string> = {};
  for (const col of REQUIRED_COLUMNS) {
    const val = row[col];
    original[col] = val === null || val === undefined ? '' : String(val);
  }
  return original;
}

/**
 * Converts a string to Title Case while collapsing extra internal spaces.
 * Example: "  liberty   crest BANK " -> "Liberty Crest Bank"
 */
export function toTitleCase(input: string): string {
  const trimmed = cleanText(input);
  if (!trimmed) return '';
  return trimmed
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => {
      if (!word) return '';
      // Preserve hyphenated parts like "Al-Bahr"
      return word
        .split('-')
        .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ''))
        .join('-');
    })
    .join(' ');
}

/**
 * Maps country aliases (e.g., "USA", "U.K.", "UAE", "Korea") and case-insensitive
 * country names to their official BR2 country names.
 */
export function normalizeCountry(input: string): string {
  const trimmed = cleanText(input).replace(/\s+/g, ' ');
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  const exactOfficial = APPROVED_COUNTRIES.find((c) => c.toLowerCase() === lower);
  if (exactOfficial) return exactOfficial;

  if (COUNTRY_ALIASES[lower]) {
    return COUNTRY_ALIASES[lower];
  }

  return trimmed;
}

/**
 * Maps boolean-like accessibility values ("Y", "N", "true", "false", "1", "0")
 * to canonical "Yes" or "No". Unrecognized non-empty strings are returned as-is
 * so validation can reject them with a clear error message.
 */
export function normalizeAccessibilityFlag(input: string): string {
  const trimmed = cleanText(input);
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  if (['y', 'yes', 'true', '1'].includes(lower)) return 'Yes';
  if (['n', 'no', 'false', '0'].includes(lower)) return 'No';
  return trimmed;
}

/**
 * Case-insensitive match for screen_category against the 13 official categories.
 */
export function normalizeCategory(input: string): string {
  const trimmed = cleanText(input).replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  const match = APPROVED_CATEGORIES.find((c) => c.toLowerCase() === lower);
  return match ?? trimmed;
}

/**
 * Case-insensitive match for auth_method against the 5 official auth methods.
 */
export function normalizeAuthMethod(input: string): string {
  const trimmed = cleanText(input).replace(/\s+/g, ' ');
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  const match = APPROVED_AUTH_METHODS.find((m) => m.toLowerCase() === lower);
  return match ?? trimmed;
}

/**
 * Normalizes semicolon-separated (or comma-separated) feature lists:
 * trims each entry, removes blanks, deduplicates case-insensitively,
 * and maps known features to official spelling. Unknown features remain
 * in the list so BR2 validation catches and rejects them.
 */
export function normalizeFeaturesList(input: string): string[] {
  const trimmed = cleanText(input);
  if (!trimmed) return [];

  const parts = trimmed
    .split(/[;|]/)
    .map((item) => item.trim().replace(/\s+/g, ' '))
    .filter((item) => item.length > 0);

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const part of parts) {
    const lower = part.toLowerCase();
    const official = APPROVED_FEATURES.find((f) => f.toLowerCase() === lower);
    const canonical = official ?? part;
    const dedupKey = canonical.toLowerCase();
    if (!seen.has(dedupKey)) {
      seen.add(dedupKey);
      normalized.push(canonical);
    }
  }

  return normalized;
}

/**
 * Normalizes semicolon-separated (or comma-separated) language lists:
 * trims entries, maps common codes/aliases to official names, removes duplicates.
 */
export function normalizeLanguagesList(input: string): string[] {
  const trimmed = cleanText(input);
  if (!trimmed) return [];

  const parts = trimmed
    .split(/[;|,]/)
    .map((item) => item.trim().replace(/\s+/g, ' '))
    .filter((item) => item.length > 0);

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const part of parts) {
    const lower = part.toLowerCase();
    const official = OFFICIAL_LANGUAGES.find((l) => l.toLowerCase() === lower);
    const alias = LANGUAGE_ALIASES[lower];
    const canonical = official ?? alias ?? toTitleCase(part);
    const dedupKey = canonical.toLowerCase();
    if (canonical && !seen.has(dedupKey)) {
      seen.add(dedupKey);
      normalized.push(canonical);
    }
  }

  return normalized;
}

/**
 * Strictly parses numeric fields without allowing trailing garbage like "5stars" or "abc".
 */
export function parseNumberStrict(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const str = cleanText(value);
  if (!str) return null;
  if (!/^-?\d+(\.\d+)?$/.test(str)) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

/**
 * Validates that (year, month, day) represents an actual calendar date.
 */
function formatIsoIfValidDate(year: number, month: number, day: number): string {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return '';
  }
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return '';
  }
  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parses mixed date formats into ISO YYYY-MM-DD:
 * - Excel serial numbers (e.g. 45678)
 * - YYYY-MM-DD or YYYY/MM/DD (and ISO timestamps)
 * - DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY
 * - Natural text dates (e.g. "12 Jan 2025", "Jan 12, 2025")
 */
export function parseMixedDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatIsoIfValidDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  // Handle Excel serial date numbers (days since 1899-12-30)
  if (typeof value === 'number' && Number.isFinite(value) && value > 20000 && value < 90000) {
    const excelEpochMs = Date.UTC(1899, 11, 30);
    const dt = new Date(excelEpochMs + Math.round(value) * 86400000);
    return formatIsoIfValidDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  const raw = cleanText(value);
  if (!raw) return '';

  // Pure numeric string representing Excel serial date
  if (/^\d{5}(\.\d+)?$/.test(raw)) {
    const serial = Number(raw);
    if (serial > 20000 && serial < 90000) {
      const excelEpochMs = Date.UTC(1899, 11, 30);
      const dt = new Date(excelEpochMs + Math.round(serial) * 86400000);
      return formatIsoIfValidDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    }
  }

  // ISO YYYY-MM-DD or YYYY/MM/DD (optionally with time component)
  const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (isoMatch) {
    return formatIsoIfValidDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  // Slash or dash day/month/year vs month/day/year
  const dmyMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const p1 = Number(dmyMatch[1]);
    const p2 = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    // If first part > 12, definitely DD/MM/YYYY
    if (p1 > 12) {
      return formatIsoIfValidDate(year, p2, p1);
    }
    // If second part > 12, definitely MM/DD/YYYY
    if (p2 > 12) {
      return formatIsoIfValidDate(year, p1, p2);
    }
    // Both <= 12: default to international DD/MM/YYYY
    return formatIsoIfValidDate(year, p2, p1);
  }

  // Named months (e.g. "15 Jan 2025" or "Jan 15, 2025")
  if (/[a-zA-Z]{3,}/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return formatIsoIfValidDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
    }
  }

  return '';
}

/**
 * Executes Step 2 (Clean) on a single raw row, producing a normalized CleanedUxRow.
 */
export function cleanRawRow(row: RawUxRow): CleanedUxRow {
  const record_id = cleanText(row.record_id);
  const bank_name = toTitleCase(cleanText(row.bank_name));
  const country = normalizeCountry(cleanText(row.country));
  const app_name = cleanText(row.app_name).replace(/\s+/g, ' ');
  const screen_no_raw = cleanText(row.screen_no);
  const screen_no = parseNumberStrict(row.screen_no);
  const screen_name = cleanText(row.screen_name).replace(/\s+/g, ' ');
  const screen_category = normalizeCategory(cleanText(row.screen_category));
  const features_list = normalizeFeaturesList(cleanText(row.features_present));
  const features_present = features_list.join('; ');
  const auth_method = normalizeAuthMethod(cleanText(row.auth_method));
  const languages_list = normalizeLanguagesList(cleanText(row.languages_supported));
  const languages_supported = languages_list.join('; ');
  const accessibility_flag = normalizeAccessibilityFlag(cleanText(row.accessibility_flag));
  const ux_rating_raw = cleanText(row.ux_rating);
  const ux_rating = parseNumberStrict(row.ux_rating);
  const collected_by = cleanText(row.collected_by).replace(/\s+/g, ' ');
  const collected_date_raw = cleanText(row.collected_date);
  const collected_date = parseMixedDate(row.collected_date);

  return {
    record_id,
    bank_name,
    country,
    app_name,
    screen_no,
    screen_no_raw,
    screen_name,
    screen_category,
    features_present,
    features_list,
    auth_method,
    languages_supported,
    languages_list,
    accessibility_flag,
    ux_rating,
    ux_rating_raw,
    collected_by,
    collected_date,
    collected_date_raw,
  };
}
