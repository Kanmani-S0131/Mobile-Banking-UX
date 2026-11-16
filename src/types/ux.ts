/**
 * Core TypeScript definitions for the International Mobile Banking UX Dataset Automation pipeline.
 * Separates raw input rows, cleaned intermediate rows, scored valid records, and rejected rows.
 */

export type UxGrade = 'Excellent' | 'Good' | 'Fair' | 'Poor';

export type AccessibilityFlag = 'Yes' | 'No';

/**
 * Exact 14-column schema expected from CSV/Excel imports, forms, and generators.
 * Values may initially be strings, numbers, or missing/null before cleaning.
 */
export interface RawUxRow {
  record_id?: string | number | null;
  bank_name?: string | number | null;
  country?: string | number | null;
  app_name?: string | number | null;
  screen_no?: string | number | null;
  screen_name?: string | number | null;
  screen_category?: string | number | null;
  features_present?: string | number | null;
  auth_method?: string | number | null;
  languages_supported?: string | number | null;
  accessibility_flag?: string | number | null;
  ux_rating?: string | number | null;
  collected_by?: string | number | null;
  collected_date?: string | number | null;
  [key: string]: unknown;
}

/**
 * Intermediate structure produced by Step 2 (Clean).
 * Preserves parsed lists and normalized strings/numbers for Step 3 (Validate).
 */
export interface CleanedUxRow {
  record_id: string;
  bank_name: string;
  country: string;
  app_name: string;
  screen_no: number | null;
  screen_no_raw: string;
  screen_name: string;
  screen_category: string;
  features_present: string; // semicolon-separated normalized string
  features_list: string[];
  auth_method: string;
  languages_supported: string; // semicolon-separated normalized string
  languages_list: string[];
  accessibility_flag: string; // 'Yes', 'No', or invalid string if unmappable
  ux_rating: number | null;
  ux_rating_raw: string;
  collected_by: string;
  collected_date: string; // ISO YYYY-MM-DD or '' if unparseable
  collected_date_raw: string;
}

export interface ScoreBreakdown {
  ratingScore: number;
  featuresScore: number;
  accessibilityScore: number;
  languagesScore: number;
  totalScore: number;
}

/**
 * Validated and scored record stored in the master dataset.
 */
export interface ValidUxRecord {
  record_id: string;
  bank_name: string;
  country: string;
  region: string;
  app_name: string;
  screen_no: number;
  screen_name: string;
  screen_category: string;
  features_present: string;
  features_list: string[];
  auth_method: string;
  languages_supported: string;
  languages_list: string[];
  accessibility_flag: AccessibilityFlag;
  ux_rating: number;
  collected_by: string;
  collected_date: string; // ISO YYYY-MM-DD
  ux_score: number;
  score_breakdown: ScoreBreakdown;
  grade: UxGrade;
}

/**
 * Rejected record preserving the original pre-cleaned values and exact rejection reasons.
 */
export interface RejectedUxRecord {
  id: string; // Internal unique row identifier for React keys and editing
  original: Record<string, string>;
  reasons: string[];
  primary_reason: string;
  rejected_at: string;
}

export interface ScoringWeights {
  ratingWeight: number;        // Default: 60
  featuresWeight: number;      // Default: 20
  accessibilityWeight: number; // Default: 10
  languagesWeight: number;     // Default: 10
}

export interface GradeThresholds {
  excellent: number; // Default: 85
  good: number;      // Default: 70
  fair: number;      // Default: 55
}

export interface PipelineRulesConfig {
  weights: ScoringWeights;
  grades: GradeThresholds;
}

export interface BankSummary {
  bank_name: string;
  country: string;
  region: string;
  app_name: string;
  screen_count: number;
  avg_ux_rating: number;
  avg_score: number;
  accessibility_pct: number;
  dominant_grade: UxGrade;
}

export interface CategorySummary {
  screen_category: string;
  record_count: number;
  avg_ux_rating: number;
  avg_score: number;
  top_auth_method: string;
}

export interface RegionSummary {
  region: string;
  countries_count: number;
  banks_count: number;
  record_count: number;
  avg_ux_rating: number;
  avg_score: number;
  excellent_pct: number;
}

export interface RejectionReasonSummary {
  reason: string;
  count: number;
  percentage: number;
}

export interface DatasetSummaries {
  byBank: BankSummary[];
  byCategory: CategorySummary[];
  byRegion: RegionSummary[];
  byRejectionReason: RejectionReasonSummary[];
}

export interface PipelineStats {
  loaded: number;
  cleaned: number;
  valid: number;
  rejected: number;
}

export interface PipelineResult {
  validRecords: ValidUxRecord[];
  rejectedRecords: RejectedUxRecord[];
  summaries: DatasetSummaries;
  stats: PipelineStats;
}

export interface TestCaseResult {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
  isCustom?: boolean;
  durationMs: number;
}

export interface CustomTestCase {
  id: string;
  name: string;
  expectedOutcome: 'accepted' | 'rejected';
  expectedRejectionReason?: string;
  expectedScore?: number;
  expectedCountry?: string;
  sampleRow: RawUxRow;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}
