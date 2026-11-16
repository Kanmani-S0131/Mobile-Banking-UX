import React, { useMemo, useState } from 'react';
import { CheckCircle2, Edit3, Search, X } from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { REQUIRED_COLUMNS } from '../engine/constants';
import { categorizeRejectionReason } from '../engine/pipeline';
import type { RawUxRow, RejectedUxRecord } from '../types/ux';

export function RejectedRecordsPage() {
  const { rejectedRecords, revalidateRejectedRow, addToast } = useDataset();

  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Editing drawer state
  const [editingRow, setEditingRow] = useState<RejectedUxRecord | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<string[]>([]);

  const reasonCategories = useMemo(() => {
    const set = new Set<string>();
    for (const r of rejectedRecords) {
      for (const reason of r.reasons) {
        set.add(categorizeRejectionReason(reason));
      }
    }
    return Array.from(set).sort();
  }, [rejectedRecords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rejectedRecords.filter((rec) => {
      if (reasonFilter !== 'ALL') {
        const cats = rec.reasons.map(categorizeRejectionReason);
        if (!cats.includes(reasonFilter)) return false;
      }
      if (q) {
        const joined = [
          ...Object.values(rec.original),
          ...rec.reasons,
        ]
          .join(' ')
          .toLowerCase();
        if (!joined.includes(q)) return false;
      }
      return true;
    });
  }, [rejectedRecords, reasonFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage]);

  const openEditor = (row: RejectedUxRecord) => {
    setEditingRow(row);
    setDraftValues({ ...row.original });
    setEditErrors(row.reasons);
  };

  const handleRevalidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;

    const rawRow: RawUxRow = { ...draftValues };
    const result = revalidateRejectedRow(editingRow.id, rawRow);

    if (result.passed) {
      addToast(
        'success',
        'Row moved to Valid Dataset',
        `${result.record.bank_name} · Screen #${result.record.screen_no} passed validation (Score: ${result.record.ux_score}).`
      );
      setEditingRow(null);
      setEditErrors([]);
    } else {
      setEditErrors(result.reasons);
      addToast(
        'error',
        'Validation still failing',
        result.reasons[0]
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <section className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor="rej-search"
            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Search original values or reasons
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              id="rej-search"
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search bank, record_id, reason..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="min-w-[240px] flex-1">
          <label
            htmlFor="rej-reason-filter"
            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Filter by Rejection Reason
          </label>
          <select
            id="rej-reason-filter"
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="ALL">All Reasons ({rejectedRecords.length})</option>
            {reasonCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {filtered.length.toLocaleString()} rejected row(s) shown
        </div>
      </section>

      {/* Rejected Records Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {pageRows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {rejectedRecords.length === 0
                ? 'No rejected records! All loaded rows passed validation.'
                : 'No rejected rows match your filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/70">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Action
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                    Rejection Reason(s)
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                    record_id
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                    bank_name (raw)
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                    country (raw)
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                    screen_no
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                    category (raw)
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                    ux_rating
                  </th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600 dark:text-slate-300">
                    collected_date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {pageRows.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => openEditor(rec)}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/60"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit & Fix
                      </button>
                    </td>
                    <td className="min-w-[240px] max-w-sm px-3 py-2.5 text-red-700 dark:text-red-400">
                      {rec.reasons.join(' · ')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-700 dark:text-slate-300">
                      {rec.original.record_id || '(blank)'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-700 dark:text-slate-300">
                      {rec.original.bank_name?.trim() ? rec.original.bank_name : '(blank)'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-700 dark:text-slate-300">
                      {rec.original.country || '(blank)'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-700 dark:text-slate-300">
                      {rec.original.screen_no || '(blank)'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-700 dark:text-slate-300">
                      {rec.original.screen_category || '(blank)'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-700 dark:text-slate-300">
                      {rec.original.ux_rating || '(blank)'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-700 dark:text-slate-300">
                      {rec.original.collected_date || '(blank)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > pageSize && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <span className="tabular-nums">
              Page {safePage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-40 dark:border-slate-700"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-40 dark:border-slate-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit & Re-validate Slide-Over Drawer */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setEditingRow(null)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-label="Edit and Re-validate Rejected Row"
            className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Edit & Re-validate Row
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fix the invalid field(s) below. If all rules pass, the row moves to Valid Dataset.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                aria-label="Close editor"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editErrors.length > 0 && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
              >
                <p className="font-semibold">Current Validation Failures:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {editErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleRevalidate} className="mt-4 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {REQUIRED_COLUMNS.map((col) => (
                  <div
                    key={col}
                    className={
                      col === 'features_present' || col === 'languages_supported'
                        ? 'sm:col-span-2'
                        : ''
                    }
                  >
                    <label
                      htmlFor={`edit-${col}`}
                      className="mb-1 block font-mono text-[11px] font-medium text-slate-600 dark:text-slate-400"
                    >
                      {col}
                    </label>
                    <input
                      id={`edit-${col}`}
                      type="text"
                      value={draftValues[col] ?? ''}
                      onChange={(e) =>
                        setDraftValues((prev) => ({ ...prev, [col]: e.target.value }))
                      }
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Re-validate & Save
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
