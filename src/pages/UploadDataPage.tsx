import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Image as ImageIcon,
  Loader2,
  Play,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { REQUIRED_COLUMNS } from '../engine/constants';
import type { PipelineStats, RawUxRow } from '../types/ux';
import { parseUxDataFile, type ParsedFileResult } from '../utils/fileParser';

export function UploadDataPage() {
  const { ingestRows, addToast } = useDataset();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<ParsedFileResult[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [ingestMode, setIngestMode] = useState<'replace' | 'append'>('replace');
  const [pipelineSummary, setPipelineSummary] = useState<PipelineStats | null>(null);

  const combinedRows: RawUxRow[] = parsedFiles.flatMap((f) => f.rows);
  const previewRows = combinedRows.slice(0, 10);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setParsing(true);
    setFileErrors([]);
    setPipelineSummary(null);

    const nextParsed: ParsedFileResult[] = [];
    const errors: string[] = [];

    for (const file of Array.from(fileList)) {
      try {
        const result = await parseUxDataFile(file);
        nextParsed.push(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : `Failed to read ${file.name}`;
        errors.push(msg);
      }
    }

    if (nextParsed.length > 0) {
      setParsedFiles((prev) => [...prev, ...nextParsed]);
      addToast(
        'success',
        `Loaded ${nextParsed.length} file${nextParsed.length > 1 ? 's' : ''}`,
        `${nextParsed.reduce((s, f) => s + f.rowCount, 0).toLocaleString()} raw rows ready for preview.`
      );
    }

    if (errors.length > 0) {
      setFileErrors(errors);
      addToast('error', 'Some files could not be loaded', errors[0]);
    }

    setParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    void handleFiles(e.dataTransfer.files);
  };

  const handleRunPipeline = () => {
    if (combinedRows.length === 0) return;
    setRunningPipeline(true);
    setTimeout(() => {
      const result = ingestRows(combinedRows, ingestMode);
      setPipelineSummary(result.stats);
      setRunningPipeline(false);
      addToast(
        'success',
        'Pipeline completed',
        `${result.stats.valid.toLocaleString()} valid · ${result.stats.rejected.toLocaleString()} rejected`
      );
    }, 50);
  };

  const clearQueue = () => {
    setParsedFiles([]);
    setFileErrors([]);
    setPipelineSummary(null);
  };

  const imageFiles = parsedFiles.filter((f) => f.sourceKind === 'image' && f.previewUrl);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Upload CSV, Excel (.xlsx / .xls), or JPG / PNG images (table screenshots or mobile
            banking screens). All 14 required columns are checked before running the cleaning,
            validation, and scoring pipeline.
          </p>
        </div>
        <a
          href="/sample_ux_dataset.csv"
          download="sample_ux_dataset.csv"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4" />
          Download Sample Test CSV
        </a>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50/70 dark:border-blue-400 dark:bg-blue-950/30'
            : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'
        }`}
      >
        <UploadCloud className="h-10 w-10 text-blue-600 dark:text-blue-400" />
        <p className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
          Drag and drop CSV, Excel, or JPG / PNG files here
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Supports multiple .csv, .xlsx, .xls, .jpg, .jpeg, and .png files
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.jpg,.jpeg,.png,image/jpeg,image/png"
          onChange={(e) => void handleFiles(e.target.files)}
          className="sr-only"
          id="ux-file-upload"
        />
        <label
          htmlFor="ux-file-upload"
          className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {parsing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Reading files & extracting rows...
            </>
          ) : (
            'Select Files'
          )}
        </label>
      </div>

      {/* Friendly File / Column Error Banner */}
      {fileErrors.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                File Validation Error
              </p>
              <ul className="list-disc space-y-1 pl-4 text-xs text-red-700 dark:text-red-300">
                {fileErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Loaded Files Queue & Controls */}
      {parsedFiles.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Queued Files ({parsedFiles.length}) · {combinedRows.length.toLocaleString()} total rows
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                {parsedFiles.map((f, i) => (
                  <span key={`${f.fileName}-${i}`} className="inline-flex items-center gap-1.5">
                    {f.sourceKind === 'image' ? (
                      <ImageIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {f.fileName} ({f.rowCount.toLocaleString()} rows)
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-lg border border-slate-200 p-1 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIngestMode('replace')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    ingestMode === 'replace'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  Replace data
                </button>
                <button
                  type="button"
                  onClick={() => setIngestMode('append')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    ingestMode === 'append'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  Append to data
                </button>
              </div>

              <button
                type="button"
                onClick={clearQueue}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </button>

              <button
                type="button"
                disabled={runningPipeline}
                onClick={handleRunPipeline}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {runningPipeline ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Cleaning & Validation Pipeline
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Image Thumbnails when JPG/PNG files are queued */}
          {imageFiles.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {imageFiles.map((img, idx) => (
                <div
                  key={`${img.fileName}-${idx}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <img
                    src={img.previewUrl}
                    alt={`Uploaded preview for ${img.fileName}`}
                    className="h-14 w-14 shrink-0 rounded-md border border-slate-200 object-cover dark:border-slate-700"
                  />
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                      {img.fileName}
                    </p>
                    <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                      Extracted {img.rowCount} row(s)
                      {img.notes ? ` · ${img.notes}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pipeline Result Summary */}
          {pipelineSummary && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                    Pipeline Execution Complete
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
                  <Link to="/" className="text-blue-700 hover:underline dark:text-blue-400">
                    View Dashboard
                  </Link>
                  <Link to="/explorer" className="text-blue-700 hover:underline dark:text-blue-400">
                    Dataset Explorer
                  </Link>
                  <Link to="/rejected" className="text-blue-700 hover:underline dark:text-blue-400">
                    Rejected Records ({pipelineSummary.rejected})
                  </Link>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Loaded', val: pipelineSummary.loaded },
                  { label: 'Cleaned', val: pipelineSummary.cleaned },
                  { label: 'Valid', val: pipelineSummary.valid },
                  { label: 'Rejected', val: pipelineSummary.rejected },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                    <p className="font-mono text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                      {stat.val.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* First 10 Rows Preview */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Preview: First {previewRows.length} Raw Rows (Pre-Cleaning)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800/70">
                  <tr>
                    {REQUIRED_COLUMNS.map((col) => (
                      <th
                        key={col}
                        className="whitespace-nowrap px-3 py-2.5 text-left font-mono font-semibold text-slate-600 dark:text-slate-300"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {previewRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {REQUIRED_COLUMNS.map((col) => (
                        <td
                          key={col}
                          className="max-w-[180px] truncate whitespace-nowrap px-3 py-2 font-mono text-slate-700 dark:text-slate-300"
                        >
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
