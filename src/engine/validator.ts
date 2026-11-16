import {
  APPROVED_AUTH_METHODS,
  APPROVED_CATEGORIES,
  APPROVED_COUNTRIES,
  APPROVED_FEATURES,
  MANDATORY_FIELDS,
  REQUIRED_COLUMNS,
} from './constants';
import type { CleanedUxRow } from '../types/ux';

export interface ColumnCheckResult {
  valid: boolean;
  missingColumns: string[];
  message: string;
}

/**
 * Checks whether an uploaded file's header row contains all required columns.
 * Used on Upload Data and tested by TC13.
 */
export function checkRequiredColumns(headers: string[]): ColumnCheckResult {
  const normalizedHeaders = new Set(
    headers.map((h) => h.trim().toLowerCase()).filter(Boolean)
  );
  const missingColumns = REQUIRED_COLUMNS.filter(
    (col) => !normalizedHeaders.has(col.toLowerCase())
  );

  if (missingColumns.length === 0) {
    return {
      valid: true,
      missingColumns: [],
      message: 'All 14 required columns are present.',
    };
  }

  return {
    valid: false,
    missingColumns,
    message: `Missing required column(s): ${missingColumns.join(', ')}`,
  };
}

/**
 * Returns today's local calendar date formatted as ISO YYYY-MM-DD
 * for BR4 future-date comparison.
 */
export function getTodayIsoDate(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear()).padStart(4, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Computes the BR5 uniqueness key for (bank_name, app_name, screen_no).
 */
export function buildDuplicateKey(
  bankName: string,
  appName: string,
  screenNo: number
): string {
  return `${bankName.trim().toLowerCase()}||${appName.trim().toLowerCase()}||${screenNo}`;
}

/**
 * Step 3: Validates a cleaned row against Business Rules BR1 through BR5.
 * Collects every violated rule with a clear, human-readable reason.
 */
export function validateCleanedRow(
  row: CleanedUxRow,
  seenKeys: Set<string>,
  todayIso: string = getTodayIsoDate()
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // BR1: Mandatory fields must be present (non-empty)
  for (const field of MANDATORY_FIELDS) {
    if (field === 'screen_no') {
      if (!row.screen_no_raw) {
        reasons.push('BR1: Missing mandatory field screen_no');
      }
    } else if (field === 'ux_rating') {
      if (!row.ux_rating_raw) {
        reasons.push('BR1: Missing mandatory field ux_rating');
      }
    } else if (field === 'collected_date') {
      if (!row.collected_date_raw) {
        reasons.push('BR1: Missing mandatory field collected_date');
      }
    } else {
      const value = row[field as keyof CleanedUxRow];
      if (typeof value === 'string' && value.trim().length === 0) {
        reasons.push(`BR1: Missing mandatory field ${field}`);
      }
    }
  }

  // BR2: Approved lists
  if (row.country && !APPROVED_COUNTRIES.includes(row.country)) {
    reasons.push(`BR2: Unsupported country "${row.country}"`);
  }

  if (row.screen_category && !APPROVED_CATEGORIES.includes(row.screen_category)) {
    reasons.push(`BR2: Invalid screen_category "${row.screen_category}"`);
  }

  if (row.auth_method && !APPROVED_AUTH_METHODS.includes(row.auth_method)) {
    reasons.push(`BR2: Invalid auth_method "${row.auth_method}"`);
  }

  if (
    row.accessibility_flag &&
    row.accessibility_flag !== 'Yes' &&
    row.accessibility_flag !== 'No'
  ) {
    reasons.push(
      `BR2: Invalid accessibility_flag "${row.accessibility_flag}" (must be Yes or No)`
    );
  }

  for (const feature of row.features_list) {
    if (!APPROVED_FEATURES.includes(feature)) {
      reasons.push(`BR2: Unknown feature "${feature}"`);
    }
  }

  // BR3: Numeric constraints
  if (row.ux_rating_raw) {
    if (row.ux_rating === null) {
      reasons.push(`BR3: ux_rating "${row.ux_rating_raw}" is not a valid number`);
    } else if (row.ux_rating < 1 || row.ux_rating > 5) {
      reasons.push(`BR3: ux_rating ${row.ux_rating} must be between 1 and 5`);
    }
  }

  if (row.screen_no_raw) {
    if (row.screen_no === null || !Number.isInteger(row.screen_no) || row.screen_no < 1) {
      reasons.push(
        `BR3: screen_no "${row.screen_no_raw}" must be a positive whole number`
      );
    }
  }

  // BR4: collected_date must parse validly and cannot be in the future
  if (row.collected_date_raw) {
    if (!row.collected_date) {
      reasons.push(`BR4: Unparseable collected_date "${row.collected_date_raw}"`);
    } else if (row.collected_date > todayIso) {
      reasons.push(
        `BR4: collected_date ${row.collected_date} cannot be in the future`
      );
    }
  }

  // BR5: No duplicate (bank_name, app_name, screen_no); keep first occurrence
  if (row.bank_name && row.app_name && row.screen_no !== null && Number.isInteger(row.screen_no)) {
    const key = buildDuplicateKey(row.bank_name, row.app_name, row.screen_no);
    if (seenKeys.has(key)) {
      reasons.push(
        `BR5: Duplicate (bank_name, app_name, screen_no) = (${row.bank_name}, ${row.app_name}, ${row.screen_no})`
      );
    }
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}
