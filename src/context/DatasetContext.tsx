import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { DEFAULT_RULES_CONFIG } from '../engine/constants';
import {
  buildSummaries,
  recalculateValidRecords,
  runPipeline,
  validateAndScoreSingleRow,
} from '../engine/pipeline';
import type {
  CustomTestCase,
  DatasetSummaries,
  PipelineResult,
  PipelineRulesConfig,
  RawUxRow,
  RejectedUxRecord,
  ToastMessage,
  ValidUxRecord,
} from '../types/ux';
import {
  clearStoredDataset,
  loadCustomTests,
  loadStoredDataset,
  loadStoredRules,
  loadStoredTheme,
  saveCustomTests,
  saveStoredDataset,
  saveStoredRules,
  saveStoredTheme,
} from '../utils/storage';

interface DatasetContextValue {
  validRecords: ValidUxRecord[];
  rejectedRecords: RejectedUxRecord[];
  summaries: DatasetSummaries;
  rules: PipelineRulesConfig;
  customTests: CustomTestCase[];
  theme: 'light' | 'dark';
  toasts: ToastMessage[];
  toggleTheme: () => void;
  addToast: (type: ToastMessage['type'], title: string, description?: string) => void;
  dismissToast: (id: string) => void;
  ingestRows: (rawRows: RawUxRow[], mode: 'replace' | 'append') => PipelineResult;
  addSingleRecord: (
    rawRow: RawUxRow
  ) => { passed: true; record: ValidUxRecord } | { passed: false; reasons: string[] };
  revalidateRejectedRow: (
    rejectedId: string,
    editedRaw: RawUxRow
  ) => { passed: true; record: ValidUxRecord } | { passed: false; reasons: string[] };
  updateRules: (nextRules: PipelineRulesConfig) => void;
  resetRules: () => void;
  resetAllData: () => void;
  addCustomTest: (test: Omit<CustomTestCase, 'id'>) => void;
  deleteCustomTest: (id: string) => void;
}

const DatasetContext = createContext<DatasetContextValue | null>(null);

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const initialData = useMemo(() => loadStoredDataset(), []);
  const [validRecords, setValidRecords] = useState<ValidUxRecord[]>(initialData.validRecords);
  const [rejectedRecords, setRejectedRecords] = useState<RejectedUxRecord[]>(
    initialData.rejectedRecords
  );
  const [rules, setRules] = useState<PipelineRulesConfig>(() => loadStoredRules());
  const [customTests, setCustomTests] = useState<CustomTestCase[]>(() => loadCustomTests());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadStoredTheme());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Keep <html class="dark"> synchronized with theme state
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveStoredTheme(theme);
  }, [theme]);

  // Persist dataset changes to localStorage
  useEffect(() => {
    saveStoredDataset(validRecords, rejectedRecords);
  }, [validRecords, rejectedRecords]);

  // Memoize aggregated summaries across Bank, Category, Region, and Rejection Reasons
  const summaries = useMemo(
    () => buildSummaries(validRecords, rejectedRecords),
    [validRecords, rejectedRecords]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastMessage['type'], title: string, description?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, description }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const ingestRows = useCallback(
    (rawRows: RawUxRow[], mode: 'replace' | 'append'): PipelineResult => {
      const existingValid = mode === 'append' ? validRecords : [];
      const existingRejected = mode === 'append' ? rejectedRecords : [];
      const result = runPipeline(rawRows, rules, existingValid, existingRejected);
      setValidRecords(result.validRecords);
      setRejectedRecords(result.rejectedRecords);
      return result;
    },
    [validRecords, rejectedRecords, rules]
  );

  const addSingleRecord = useCallback(
    (rawRow: RawUxRow) => {
      const check = validateAndScoreSingleRow(rawRow, validRecords, rules);
      if (check.passed) {
        setValidRecords((prev) => [check.record, ...prev]);
        return { passed: true as const, record: check.record };
      }
      return { passed: false as const, reasons: check.reasons };
    },
    [validRecords, rules]
  );

  const revalidateRejectedRow = useCallback(
    (rejectedId: string, editedRaw: RawUxRow) => {
      const check = validateAndScoreSingleRow(editedRaw, validRecords, rules);
      if (check.passed) {
        setValidRecords((prev) => [check.record, ...prev]);
        setRejectedRecords((prev) => prev.filter((r) => r.id !== rejectedId));
        return { passed: true as const, record: check.record };
      }

      // Update rejection reasons & edited raw snapshot on failure
      const updatedOriginal: Record<string, string> = {};
      for (const [k, v] of Object.entries(editedRaw)) {
        updatedOriginal[k] = v === null || v === undefined ? '' : String(v);
      }

      setRejectedRecords((prev) =>
        prev.map((r) =>
          r.id === rejectedId
            ? {
                ...r,
                original: updatedOriginal,
                reasons: check.reasons,
                primary_reason: check.reasons[0],
              }
            : r
        )
      );
      return { passed: false as const, reasons: check.reasons };
    },
    [validRecords, rules]
  );

  const updateRules = useCallback(
    (nextRules: PipelineRulesConfig) => {
      setRules(nextRules);
      saveStoredRules(nextRules);
      setValidRecords((prev) => {
        const recalculated = recalculateValidRecords(prev, rejectedRecords, nextRules);
        return recalculated.validRecords;
      });
    },
    [rejectedRecords]
  );

  const resetRules = useCallback(() => {
    setRules(DEFAULT_RULES_CONFIG);
    saveStoredRules(DEFAULT_RULES_CONFIG);
    setValidRecords((prev) => {
      const recalculated = recalculateValidRecords(
        prev,
        rejectedRecords,
        DEFAULT_RULES_CONFIG
      );
      return recalculated.validRecords;
    });
  }, [rejectedRecords]);

  const resetAllData = useCallback(() => {
    setValidRecords([]);
    setRejectedRecords([]);
    clearStoredDataset();
  }, []);

  const addCustomTest = useCallback((test: Omit<CustomTestCase, 'id'>) => {
    const newTest: CustomTestCase = {
      ...test,
      id: `ct-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setCustomTests((prev) => {
      const updated = [...prev, newTest];
      saveCustomTests(updated);
      return updated;
    });
  }, []);

  const deleteCustomTest = useCallback((id: string) => {
    setCustomTests((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveCustomTests(updated);
      return updated;
    });
  }, []);

  const value: DatasetContextValue = {
    validRecords,
    rejectedRecords,
    summaries,
    rules,
    customTests,
    theme,
    toasts,
    toggleTheme,
    addToast,
    dismissToast,
    ingestRows,
    addSingleRecord,
    revalidateRejectedRow,
    updateRules,
    resetRules,
    resetAllData,
    addCustomTest,
    deleteCustomTest,
  };

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset(): DatasetContextValue {
  const ctx = useContext(DatasetContext);
  if (!ctx) {
    throw new Error('useDataset must be used inside a DatasetProvider');
  }
  return ctx;
}
