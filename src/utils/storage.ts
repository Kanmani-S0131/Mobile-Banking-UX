import { DEFAULT_RULES_CONFIG } from '../engine/constants';
import type {
  CustomTestCase,
  PipelineRulesConfig,
  RejectedUxRecord,
  ValidUxRecord,
} from '../types/ux';

const KEYS = {
  VALID: 'ux_auto_valid_records_v1',
  REJECTED: 'ux_auto_rejected_records_v1',
  RULES: 'ux_auto_rules_config_v1',
  CUSTOM_TESTS: 'ux_auto_custom_tests_v1',
  THEME: 'ux_auto_theme_v1',
} as const;

export function loadStoredDataset(): {
  validRecords: ValidUxRecord[];
  rejectedRecords: RejectedUxRecord[];
} {
  try {
    const validRaw = localStorage.getItem(KEYS.VALID);
    const rejectedRaw = localStorage.getItem(KEYS.REJECTED);
    return {
      validRecords: validRaw ? (JSON.parse(validRaw) as ValidUxRecord[]) : [],
      rejectedRecords: rejectedRaw ? (JSON.parse(rejectedRaw) as RejectedUxRecord[]) : [],
    };
  } catch {
    return { validRecords: [], rejectedRecords: [] };
  }
}

export function saveStoredDataset(
  validRecords: ValidUxRecord[],
  rejectedRecords: RejectedUxRecord[]
): void {
  try {
    localStorage.setItem(KEYS.VALID, JSON.stringify(validRecords));
    localStorage.setItem(KEYS.REJECTED, JSON.stringify(rejectedRecords));
  } catch (err) {
    console.warn('Could not persist dataset to localStorage:', err);
  }
}

export function clearStoredDataset(): void {
  try {
    localStorage.removeItem(KEYS.VALID);
    localStorage.removeItem(KEYS.REJECTED);
  } catch {
    // ignore
  }
}

export function loadStoredRules(): PipelineRulesConfig {
  try {
    const raw = localStorage.getItem(KEYS.RULES);
    if (!raw) return DEFAULT_RULES_CONFIG;
    const parsed = JSON.parse(raw) as PipelineRulesConfig;
    if (parsed?.weights && parsed?.grades) return parsed;
    return DEFAULT_RULES_CONFIG;
  } catch {
    return DEFAULT_RULES_CONFIG;
  }
}

export function saveStoredRules(rules: PipelineRulesConfig): void {
  try {
    localStorage.setItem(KEYS.RULES, JSON.stringify(rules));
  } catch {
    // ignore
  }
}

export function loadCustomTests(): CustomTestCase[] {
  try {
    const raw = localStorage.getItem(KEYS.CUSTOM_TESTS);
    return raw ? (JSON.parse(raw) as CustomTestCase[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomTests(tests: CustomTestCase[]): void {
  try {
    localStorage.setItem(KEYS.CUSTOM_TESTS, JSON.stringify(tests));
  } catch {
    // ignore
  }
}

export function loadStoredTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(KEYS.THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  } catch {
    return 'light';
  }
}

export function saveStoredTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(KEYS.THEME, theme);
  } catch {
    // ignore
  }
}
