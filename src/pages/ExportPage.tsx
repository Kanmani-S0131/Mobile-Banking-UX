import React from 'react';
import { Download, FileJson, FileSpreadsheet, FileText } from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import {
  exportBankSummary,
  exportFullReport,
  exportRejectedRecords,
  exportValidDataset,
} from '../utils/exporter';

export function ExportPage() {
  const { validRecords, rejectedRecords, summaries, rules, addToast } = useDataset();

  const handleDownload = (label: string, fn: () => void, emptyCheck: number) => {
    if (emptyCheck === 0) {
      addToast('error', `Nothing to export for ${label}`, 'Load or generate dataset records first.');
      return;
    }
    fn();
    addToast('success', `Downloaded ${label}`);
  };

  const cards = [
    {
      title: 'Valid Master Dataset',
      description: 'Cleaned, validated, and scored UX records with breakdowns and grades.',
      count: `${validRecords.length.toLocaleString()} records`,
      onExport: (fmt: 'csv' | 'xlsx' | 'json') =>
        handleDownload(
          `Valid Dataset (${fmt.toUpperCase()})`,
          () => exportValidDataset(validRecords, fmt),
          validRecords.length
        ),
    },
    {
      title: 'Rejected Records',
      description: 'Original pre-cleaned values paired with exact BR1–BR5 rejection reasons.',
      count: `${rejectedRecords.length.toLocaleString()} records`,
      onExport: (fmt: 'csv' | 'xlsx' | 'json') =>
        handleDownload(
          `Rejected Records (${fmt.toUpperCase()})`,
          () => exportRejectedRecords(rejectedRecords, fmt),
          rejectedRecords.length
        ),
    },
    {
      title: 'Bank Summary',
      description: 'Aggregated per-bank screen counts, average rating, score, accessibility %, and dominant grade.',
      count: `${summaries.byBank.length.toLocaleString()} banks`,
      onExport: (fmt: 'csv' | 'xlsx' | 'json') =>
        handleDownload(
          `Bank Summary (${fmt.toUpperCase()})`,
          () => exportBankSummary(summaries.byBank, fmt),
          summaries.byBank.length
        ),
    },
    {
      title: 'Full Multi-Sheet Report',
      description:
        'Excel workbook includes 5 sheets: Master Data, Bank Summary, Category Summary, Region Summary, and Rejected Records.',
      count: `${(validRecords.length + rejectedRecords.length).toLocaleString()} total rows`,
      onExport: (fmt: 'csv' | 'xlsx' | 'json') =>
        handleDownload(
          `Full Report (${fmt.toUpperCase()})`,
          () => exportFullReport(validRecords, rejectedRecords, summaries, rules, fmt),
          validRecords.length + rejectedRecords.length
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Export Datasets & Analytical Reports
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Download cleaned datasets, rejected audit logs, and aggregated summaries in CSV, Excel
          (.xlsx), or JSON formats directly from the browser.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {cards.map((card) => (
          <section
            key={card.title}
            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {card.title}
                </h3>
                <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {card.count}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {card.description}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => card.onExport('csv')}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <FileText className="h-3.5 w-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => card.onExport('xlsx')}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => card.onExport('json')}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <FileJson className="h-3.5 w-3.5" />
                JSON
              </button>
            </div>
          </section>
        ))}
      </div>

      {/* Multi-Sheet Workbook Breakdown */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Full Report Excel Workbook Sheets
          </h3>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ['1. Master Data', `${validRecords.length.toLocaleString()} rows`],
            ['2. Bank Summary', `${summaries.byBank.length.toLocaleString()} rows`],
            ['3. Category Summary', `${summaries.byCategory.length.toLocaleString()} rows`],
            ['4. Region Summary', `${summaries.byRegion.length.toLocaleString()} rows`],
            ['5. Rejected Records', `${rejectedRecords.length.toLocaleString()} rows`],
          ].map(([sheet, count]) => (
            <div
              key={sheet}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50"
            >
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{sheet}</p>
              <p className="mt-0.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                {count}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
