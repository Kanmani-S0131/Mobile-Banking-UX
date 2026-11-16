import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import {
  APPROVED_AUTH_METHODS,
  APPROVED_CATEGORIES,
  APPROVED_COUNTRIES,
  APPROVED_FEATURES,
} from '../engine/constants';
import type { PipelineRulesConfig } from '../types/ux';

export function RulesSettingsPage() {
  const { rules, updateRules, resetRules, resetAllData, addToast, validRecords, rejectedRecords } =
    useDataset();

  const [draft, setDraft] = useState<PipelineRulesConfig>(rules);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    setDraft(rules);
  }, [rules]);

  const totalWeight =
    draft.weights.ratingWeight +
    draft.weights.featuresWeight +
    draft.weights.accessibilityWeight +
    draft.weights.languagesWeight;

  const thresholdsValid =
    draft.grades.excellent > draft.grades.good &&
    draft.grades.good > draft.grades.fair &&
    draft.grades.fair > 0;

  const handleApplyRules = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thresholdsValid) {
      addToast(
        'error',
        'Invalid grade thresholds',
        'Ensure Excellent > Good > Fair > 0.'
      );
      return;
    }
    updateRules(draft);
    addToast(
      'success',
      'Rules & weights updated',
      `Recalculated ${validRecords.length.toLocaleString()} valid records instantly.`
    );
  };

  const handleResetDefaults = () => {
    resetRules();
    addToast('info', 'Default rules restored', 'Weights reset to 60/20/10/10 and grades to 85/70/55.');
  };

  const handleConfirmResetData = () => {
    resetAllData();
    setConfirmResetOpen(false);
    addToast('info', 'All dataset records cleared', 'Local storage dataset has been reset.');
  };

  return (
    <div className="space-y-6">
      {/* Editable Scoring Weights & Grade Limits */}
      <form
        onSubmit={handleApplyRules}
        className="rounded-xl border border-slate-200 bg-white p-6 space-y-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Scoring Weights & Grade Thresholds
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Updating weights or thresholds immediately recalculates scores, grades, and all
              dashboard summaries across {validRecords.length.toLocaleString()} valid records.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore Default Weights
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Weights */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Score Component Weights
              </h3>
              <span
                className={`font-mono text-xs font-semibold tabular-nums ${
                  totalWeight === 100
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                Max Total: {totalWeight} pts
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'ratingWeight' as const, label: 'UX Rating (x/5)' },
                { key: 'featuresWeight' as const, label: 'Features (min(n,5)/5)' },
                { key: 'accessibilityWeight' as const, label: 'Accessibility (Yes)' },
                { key: 'languagesWeight' as const, label: 'Languages (min(n,5)/5)' },
              ].map((item) => (
                <div key={item.key}>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    {item.label}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.weights[item.key]}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        weights: {
                          ...prev.weights,
                          [item.key]: Math.max(0, Number(e.target.value) || 0),
                        },
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Grade Thresholds */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Grade Thresholds (Minimum Score)
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'excellent' as const, label: 'Excellent (>=)' },
                { key: 'good' as const, label: 'Good (>=)' },
                { key: 'fair' as const, label: 'Fair (>=)' },
              ].map((g) => (
                <div key={g.key}>
                  <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
                    {g.label}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={draft.grades[g.key]}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        grades: {
                          ...prev.grades,
                          [g.key]: Math.max(1, Number(e.target.value) || 1),
                        },
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scores below {draft.grades.fair} are classified as <strong className="font-semibold">Poor</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <CheckCircle2 className="h-4 w-4" />
            Apply & Recalculate All Scores
          </button>

          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/60"
          >
            <Trash2 className="h-4 w-4" />
            Reset data
          </button>
        </div>
      </form>

      {/* Pipeline Business Rules Reference */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Business Validation Rules (BR1–BR5)
          </h3>
          <dl className="space-y-2.5 text-xs">
            {[
              ['BR1 · Mandatory Fields', 'record_id, bank_name, country, app_name, screen_no, screen_name, screen_category, auth_method, accessibility_flag, ux_rating, collected_by, and collected_date must be non-empty.'],
              ['BR2 · Approved Lists', 'Country, screen_category, auth_method, and every item in features_present must match the approved domain lists. accessibility_flag must be Yes or No.'],
              ['BR3 · Numeric Bounds', 'ux_rating must be between 1 and 5. screen_no must be a positive whole number (>= 1).'],
              ['BR4 · Date Validity', 'collected_date must parse into a valid calendar date and cannot be in the future.'],
              ['BR5 · Uniqueness', 'Duplicate (bank_name, app_name, screen_no) combinations are rejected; the first occurrence is kept.'],
            ].map(([title, desc]) => (
              <div key={title} className="border-b border-slate-100 pb-2 last:border-none dark:border-slate-800">
                <dt className="font-semibold text-slate-800 dark:text-slate-200">{title}</dt>
                <dd className="mt-0.5 text-slate-600 dark:text-slate-400">{desc}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Approved Domain Lists (BR2)
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Countries ({APPROVED_COUNTRIES.length})
              </p>
              <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                {APPROVED_COUNTRIES.join(' · ')}
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Screen Categories ({APPROVED_CATEGORIES.length})
              </p>
              <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                {APPROVED_CATEGORIES.join(' · ')}
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Auth Methods ({APPROVED_AUTH_METHODS.length})
              </p>
              <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                {APPROVED_AUTH_METHODS.join(' · ')}
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Features ({APPROVED_FEATURES.length})
              </p>
              <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                {APPROVED_FEATURES.join(' · ')}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Modal for Reset Data */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setConfirmResetOpen(false)}
            aria-hidden="true"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-dialog-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <h3
                  id="reset-dialog-title"
                  className="text-base font-semibold text-slate-900 dark:text-white"
                >
                  Reset all dataset records?
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  This will permanently remove {validRecords.length.toLocaleString()} valid records
                  and {rejectedRecords.length.toLocaleString()} rejected records from browser
                  storage. Scoring rules and custom test cases will be preserved.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetData}
                className="h-9 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
