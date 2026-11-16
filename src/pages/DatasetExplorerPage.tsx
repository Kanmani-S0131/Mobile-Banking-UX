import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { MultiSelectFilter } from '../components/MultiSelectFilter';
import { useDataset } from '../context/DatasetContext';
import { APPROVED_CATEGORIES, APPROVED_COUNTRIES } from '../engine/constants';
import type { ValidUxRecord } from '../types/ux';

type SortField =
  | 'record_id'
  | 'bank_name'
  | 'country'
  | 'screen_no'
  | 'screen_category'
  | 'ux_rating'
  | 'ux_score'
  | 'grade'
  | 'collected_date';

const GRADE_OPTIONS = ['Excellent', 'Good', 'Fair', 'Poor'];

const GRADE_TEXT_CLASS: Record<string, string> = {
  Excellent: 'text-emerald-700 dark:text-emerald-400',
  Good: 'text-blue-700 dark:text-blue-400',
  Fair: 'text-amber-700 dark:text-amber-400',
  Poor: 'text-red-700 dark:text-red-400',
};

export function DatasetExplorerPage() {
  const { validRecords } = useDataset();

  const [search, setSearch] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);

  const [sortField, setSortField] = useState<SortField>('record_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState<25 | 50 | 100>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<ValidUxRecord | null>(null);

  const countryOptions = useMemo(() => {
    const present = new Set(validRecords.map((r) => r.country));
    return APPROVED_COUNTRIES.filter((c) => present.has(c)).length > 0
      ? Array.from(present).sort()
      : [...APPROVED_COUNTRIES];
  }, [validRecords]);

  const bankOptions = useMemo(
    () => Array.from(new Set(validRecords.map((r) => r.bank_name))).sort(),
    [validRecords]
  );

  const categoryOptions = useMemo(() => {
    const present = new Set(validRecords.map((r) => r.screen_category));
    return present.size > 0 ? Array.from(present).sort() : [...APPROVED_CATEGORIES];
  }, [validRecords]);

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = validRecords.filter((rec) => {
      if (selectedCountries.length > 0 && !selectedCountries.includes(rec.country)) {
        return false;
      }
      if (selectedBanks.length > 0 && !selectedBanks.includes(rec.bank_name)) {
        return false;
      }
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(rec.screen_category)
      ) {
        return false;
      }
      if (selectedGrades.length > 0 && !selectedGrades.includes(rec.grade)) {
        return false;
      }
      if (q) {
        const match =
          rec.record_id.toLowerCase().includes(q) ||
          rec.bank_name.toLowerCase().includes(q) ||
          rec.app_name.toLowerCase().includes(q) ||
          rec.screen_name.toLowerCase().includes(q) ||
          rec.collected_by.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [
    validRecords,
    search,
    selectedCountries,
    selectedBanks,
    selectedCategories,
    selectedGrades,
    sortField,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, safePage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const resetAllFilters = () => {
    setSearch('');
    setSelectedCountries([]);
    setSelectedBanks([]);
    setSelectedCategories([]);
    setSelectedGrades([]);
    setCurrentPage(1);
  };

  const hasFilters =
    search.trim().length > 0 ||
    selectedCountries.length > 0 ||
    selectedBanks.length > 0 ||
    selectedCategories.length > 0 ||
    selectedGrades.length > 0;

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Search + Concurrent Multi-Select Filters */}
      <section
        aria-label="Dataset Search and Multi-Select Filters"
        className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <label
              htmlFor="explorer-search"
              className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
            >
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                id="explorer-search"
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ID, bank, app, screen..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <MultiSelectFilter
            label="Country"
            options={countryOptions}
            selected={selectedCountries}
            onChange={(next) => {
              setSelectedCountries(next);
              setCurrentPage(1);
            }}
          />

          <MultiSelectFilter
            label="Bank"
            options={bankOptions}
            selected={selectedBanks}
            searchable
            onChange={(next) => {
              setSelectedBanks(next);
              setCurrentPage(1);
            }}
          />

          <MultiSelectFilter
            label="Category"
            options={categoryOptions}
            selected={selectedCategories}
            onChange={(next) => {
              setSelectedCategories(next);
              setCurrentPage(1);
            }}
          />

          <MultiSelectFilter
            label="Grade"
            options={GRADE_OPTIONS}
            selected={selectedGrades}
            onChange={(next) => {
              setSelectedGrades(next);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <span className="tabular-nums">
            Showing{' '}
            <strong className="font-semibold text-slate-900 dark:text-white">
              {filteredAndSorted.length.toLocaleString()}
            </strong>{' '}
            of {validRecords.length.toLocaleString()} valid records
          </span>

          <div className="flex items-center gap-3">
            {hasFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear all filters
              </button>
            )}
            <label className="inline-flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) as 25 | 50 | 100);
                  setCurrentPage(1);
                }}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      {/* Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {pageRows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {validRecords.length === 0
                ? 'No valid records in dataset yet. Upload a file or generate sample data.'
                : 'No records match your current search and filter selection.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/70">
                <tr>
                  {[
                    { key: 'record_id' as SortField, label: 'Record ID', align: 'left' },
                    { key: 'bank_name' as SortField, label: 'Bank', align: 'left' },
                    { key: 'country' as SortField, label: 'Country', align: 'left' },
                    { key: 'screen_no' as SortField, label: 'Screen #', align: 'right' },
                    { key: 'screen_category' as SortField, label: 'Category', align: 'left' },
                    { key: 'ux_rating' as SortField, label: 'Rating', align: 'right' },
                    { key: 'ux_score' as SortField, label: 'UX Score', align: 'right' },
                    { key: 'grade' as SortField, label: 'Grade', align: 'left' },
                    { key: 'collected_date' as SortField, label: 'Date', align: 'left' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      className={`whitespace-nowrap px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className={`inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white ${
                          col.align === 'right' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <span>{col.label}</span>
                        {renderSortIcon(col.key)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {pageRows.map((rec) => (
                  <tr
                    key={rec.record_id + rec.bank_name + rec.screen_no}
                    onClick={() => setSelectedRecord(rec)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedRecord(rec);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-blue-50/50 dark:hover:bg-slate-800/60"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-900 dark:text-slate-100">
                      {rec.record_id}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-900 dark:text-white">
                      {rec.bank_name}
                      <span className="ml-1.5 text-slate-400 font-normal">· {rec.app_name}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {rec.country}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {rec.screen_no}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-700 dark:text-slate-300">
                      {rec.screen_category}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {rec.ux_rating} / 5
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                      {rec.ux_score}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2.5 font-semibold ${
                        GRADE_TEXT_CLASS[rec.grade] ?? ''
                      }`}
                    >
                      {rec.grade}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {rec.collected_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredAndSorted.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <span className="tabular-nums">
              Page {safePage} of {totalPages} · Records{' '}
              {((safePage - 1) * pageSize + 1).toLocaleString()}–
              {Math.min(safePage * pageSize, filteredAndSorted.length).toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Detail Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setSelectedRecord(null)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-label="Record Details"
            className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {selectedRecord.record_id}
                </p>
                <h2 className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">
                  {selectedRecord.bank_name}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {selectedRecord.app_name} · {selectedRecord.country} ({selectedRecord.region})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                aria-label="Close record drawer"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5 text-sm">
              <div className="flex items-baseline justify-between rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">UX Score</p>
                  <p className="font-mono text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    {selectedRecord.ux_score} / 100
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Grade</p>
                  <p className={`text-base font-semibold ${GRADE_TEXT_CLASS[selectedRecord.grade]}`}>
                    {selectedRecord.grade}
                  </p>
                </div>
              </div>

              <dl className="space-y-2.5 text-xs">
                {[
                  ['Screen Number', `#${selectedRecord.screen_no}`],
                  ['Screen Name', selectedRecord.screen_name],
                  ['Screen Category', selectedRecord.screen_category],
                  ['Auth Method', selectedRecord.auth_method],
                  ['Accessibility Flag', selectedRecord.accessibility_flag],
                  ['UX Rating', `${selectedRecord.ux_rating} / 5`],
                  ['Features Present', selectedRecord.features_present || 'None'],
                  ['Languages Supported', selectedRecord.languages_supported || 'None'],
                  ['Collected By', selectedRecord.collected_by],
                  ['Collected Date', selectedRecord.collected_date],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 border-b border-slate-100 pb-2 dark:border-slate-800"
                  >
                    <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                    <dd className="text-right font-medium text-slate-900 dark:text-slate-100">
                      {val}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Score Breakdown
                </h3>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-600 dark:text-slate-400">Rating Component</dt>
                    <dd className="font-mono tabular-nums">
                      +{selectedRecord.score_breakdown.ratingScore}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600 dark:text-slate-400">Features Component</dt>
                    <dd className="font-mono tabular-nums">
                      +{selectedRecord.score_breakdown.featuresScore}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600 dark:text-slate-400">Accessibility Component</dt>
                    <dd className="font-mono tabular-nums">
                      +{selectedRecord.score_breakdown.accessibilityScore}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600 dark:text-slate-400">Languages Component</dt>
                    <dd className="font-mono tabular-nums">
                      +{selectedRecord.score_breakdown.languagesScore}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
