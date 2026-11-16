import React, { useState } from 'react';
import { CheckCircle2, Loader2, Play, Plus, Trash2, XCircle } from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { runAllTestCases } from '../engine/testRunner';
import type { RawUxRow, TestCaseResult } from '../types/ux';

const DEFAULT_CUSTOM_ROW: RawUxRow = {
  record_id: 'CUST-001',
  bank_name: 'Horizon Digital Bank',
  country: 'USA',
  app_name: 'Horizon Pay',
  screen_no: 1,
  screen_name: 'Login Home',
  screen_category: 'Login',
  features_present: 'Biometric Login; QR Pay',
  auth_method: 'Face ID',
  languages_supported: 'English; Spanish',
  accessibility_flag: 'y',
  ux_rating: 5,
  collected_by: 'QA Reviewer',
  collected_date: '2025-10-12',
};

export function ValidationTestCasesPage() {
  const { customTests, addCustomTest, deleteCustomTest, addToast } = useDataset();

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestCaseResult[] | null>(null);

  // Custom Test Case builder state
  const [testName, setTestName] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState<'accepted' | 'rejected'>('accepted');
  const [expectedRejectionReason, setExpectedRejectionReason] = useState('');
  const [expectedScore, setExpectedScore] = useState('');
  const [expectedCountry, setExpectedCountry] = useState('');
  const [sampleRow, setSampleRow] = useState<RawUxRow>(DEFAULT_CUSTOM_ROW);

  const handleRunAll = async () => {
    setRunning(true);
    try {
      const res = await runAllTestCases(customTests);
      setResults(res);
      const passedCount = res.filter((r) => r.passed).length;
      addToast(
        passedCount === res.length ? 'success' : 'error',
        `Test Suite: ${passedCount} / ${res.length} Passed`,
        passedCount === res.length
          ? 'All automated and custom test cases passed.'
          : `${res.length - passedCount} test case(s) failed.`
      );
    } finally {
      setRunning(false);
    }
  };

  const handleSaveCustomTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName.trim()) {
      addToast('error', 'Test name required', 'Enter a descriptive name for the custom test case.');
      return;
    }

    addCustomTest({
      name: testName.trim(),
      expectedOutcome,
      expectedRejectionReason:
        expectedOutcome === 'rejected' && expectedRejectionReason.trim()
          ? expectedRejectionReason.trim()
          : undefined,
      expectedScore:
        expectedOutcome === 'accepted' && expectedScore.trim() !== ''
          ? Number(expectedScore)
          : undefined,
      expectedCountry:
        expectedOutcome === 'accepted' && expectedCountry.trim()
          ? expectedCountry.trim()
          : undefined,
      sampleRow: { ...sampleRow },
    });

    addToast('success', 'Custom test case saved', `"${testName.trim()}" will run in "Run all test cases".`);
    setTestName('');
    setExpectedRejectionReason('');
    setExpectedScore('');
    setExpectedCountry('');
  };

  const updateRowField = (field: keyof RawUxRow, value: string) => {
    setSampleRow((prev) => ({ ...prev, [field]: value }));
  };

  const passedCount = results ? results.filter((r) => r.passed).length : 0;

  return (
    <div className="space-y-6">
      {/* Header & Run All Bar */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Automated Verification Suite (TC01–TC14 + {customTests.length} Custom)
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Executes all 14 built-in pipeline specifications and any saved custom test cases directly
            against the cleaning, validation, scoring, and column-checking engine.
          </p>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={() => void handleRunAll()}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600 whitespace-nowrap shrink-0"
        >
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running test cases...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run all test cases
            </>
          )}
        </button>
      </section>

      {/* Results Table */}
      {results && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              Execution Results
            </span>
            <span
              className={`font-mono text-sm font-semibold tabular-nums ${
                passedCount === results.length
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {passedCount} / {results.length} PASSED
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/70">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Test Case
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Expected
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Actual
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-slate-900 dark:text-white">
                      {r.id}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">{r.name}</p>
                      <p className="text-slate-500 dark:text-slate-400">{r.description}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {r.passed ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" />
                          PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-red-700 dark:text-red-400">
                          <XCircle className="h-4 w-4" />
                          FAIL
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-700 dark:text-slate-300">
                      {r.expected}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-700 dark:text-slate-300">
                      {r.actual}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {r.durationMs} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Custom Test Case Builder */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          onSubmit={handleSaveCustomTest}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Add Custom Test Case
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define a sample raw record and expected validation result. Saved test cases run with
                &ldquo;Run all test cases&rdquo;.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSampleRow({ ...DEFAULT_CUSTOM_ROW })}
              className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Reset sample fields
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="ct-name"
                className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Test Case Name *
              </label>
              <input
                id="ct-name"
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g. Reject unsupported country Mars"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="ct-outcome"
                className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Expected Validation Outcome *
              </label>
              <select
                id="ct-outcome"
                value={expectedOutcome}
                onChange={(e) =>
                  setExpectedOutcome(e.target.value as 'accepted' | 'rejected')
                }
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="accepted">Valid / Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {expectedOutcome === 'rejected' ? (
              <div className="sm:col-span-2">
                <label
                  htmlFor="ct-rej-reason"
                  className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Expected Rejection Reason (optional keyword or rule code, e.g. BR2, future, ux_rating)
                </label>
                <input
                  id="ct-rej-reason"
                  type="text"
                  value={expectedRejectionReason}
                  onChange={(e) => setExpectedRejectionReason(e.target.value)}
                  placeholder="Leave blank to match any rejection reason, or enter substring like 'Unsupported country'"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="ct-score"
                    className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Expected Score (optional, 0–100)
                  </label>
                  <input
                    id="ct-score"
                    type="number"
                    value={expectedScore}
                    onChange={(e) => setExpectedScore(e.target.value)}
                    placeholder="e.g. 90"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ct-country-exp"
                    className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Expected Cleaned Country (optional)
                  </label>
                  <input
                    id="ct-country-exp"
                    type="text"
                    value={expectedCountry}
                    onChange={(e) => setExpectedCountry(e.target.value)}
                    placeholder="e.g. United States"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </>
            )}
          </div>

          {/* Sample Record Fields */}
          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sample Record Input Values
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {(
                [
                  ['record_id', 'record_id'],
                  ['bank_name', 'bank_name'],
                  ['country', 'country'],
                  ['app_name', 'app_name'],
                  ['screen_no', 'screen_no'],
                  ['screen_name', 'screen_name'],
                  ['screen_category', 'screen_category'],
                  ['features_present', 'features_present'],
                  ['auth_method', 'auth_method'],
                  ['languages_supported', 'languages_supported'],
                  ['accessibility_flag', 'accessibility_flag'],
                  ['ux_rating', 'ux_rating'],
                  ['collected_by', 'collected_by'],
                  ['collected_date', 'collected_date'],
                ] as [keyof RawUxRow, string][]
              ).map(([key, label]) => (
                <div key={key}>
                  <label className="mb-1 block font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={String(sampleRow[key] ?? '')}
                    onChange={(e) => updateRowField(key, e.target.value)}
                    className="h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            Save Custom Test Case
          </button>
        </form>

        {/* Saved Custom Test Cases List */}
        <aside className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Saved Custom Tests ({customTests.length})
          </h3>
          {customTests.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              No custom test cases added yet. Create one using the builder to include it in &ldquo;Run
              all test cases&rdquo;.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {customTests.map((ct) => (
                <li
                  key={ct.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {ct.name}
                    </p>
                    <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                      Expect:{' '}
                      <span
                        className={
                          ct.expectedOutcome === 'accepted'
                            ? 'font-medium text-emerald-600 dark:text-emerald-400'
                            : 'font-medium text-red-600 dark:text-red-400'
                        }
                      >
                        {ct.expectedOutcome === 'accepted' ? 'Valid' : 'Rejected'}
                      </span>
                      {ct.expectedRejectionReason && ` · "${ct.expectedRejectionReason}"`}
                      {ct.expectedScore !== undefined && ` · Score ${ct.expectedScore}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteCustomTest(ct.id)}
                    aria-label={`Delete custom test ${ct.name}`}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
