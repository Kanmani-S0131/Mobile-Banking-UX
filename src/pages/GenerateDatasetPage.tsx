import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { generateSyntheticDataset } from '../engine/generator';
import type { PipelineStats } from '../types/ux';

export function GenerateDatasetPage() {
  const { ingestRows, addToast, validRecords, rejectedRecords } = useDataset();

  const [recordCount, setRecordCount] = useState(1200);
  const [bankCount, setBankCount] = useState(60);
  const [seed, setSeed] = useState(2026);
  const [messyPercent, setMessyPercent] = useState(15);
  const [invalidPercent, setInvalidPercent] = useState(8);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('');
  const [lastStats, setLastStats] = useState<PipelineStats | null>(null);

  const handleGenerate = async (mode: 'replace' | 'append') => {
    const safeRecords = Math.max(1000, Math.min(5000, Number(recordCount) || 1200));
    const safeBanks = Math.max(12, Math.min(120, Number(bankCount) || 60));

    setRunning(true);
    setProgress(5);
    setStageText('Initializing deterministic generator...');

    try {
      const rawRows = await generateSyntheticDataset(
        {
          recordCount: safeRecords,
          bankCount: safeBanks,
          seed: Number(seed) || 2026,
          messyPercent: Math.max(0, Math.min(50, Number(messyPercent) || 0)),
          invalidPercent: Math.max(0, Math.min(40, Number(invalidPercent) || 0)),
        },
        (pct, stage) => {
          setProgress(pct);
          setStageText(stage);
        }
      );

      setProgress(90);
      setStageText('Validating & scoring dataset...');

      // Yield a tick so UI renders 90% progress state cleanly
      await new Promise((r) => setTimeout(r, 20));
      const res = ingestRows(rawRows, mode);

      setProgress(100);
      setStageText('Completed');
      setLastStats(res.stats);
      addToast(
        'success',
        mode === 'replace' ? 'Dataset replaced' : 'Dataset appended',
        `${res.stats.valid.toLocaleString()} valid and ${res.stats.rejected.toLocaleString()} rejected records processed.`
      );
    } catch (err) {
      addToast(
        'error',
        'Generation failed',
        err instanceof Error ? err.message : 'Unexpected error'
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Synthetic International Banking Dataset Generator
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Synthesizes fictional banks across all 12 supported countries with 16–20 screens per bank,
          deliberately injecting cleanable messy formatting and rule-violating rows to exercise the
          complete automation pipeline.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label
              htmlFor="gen-count"
              className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Number of Records (min 1,000)
            </label>
            <input
              id="gen-count"
              type="number"
              min={1000}
              max={5000}
              step={100}
              value={recordCount}
              onChange={(e) => setRecordCount(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="gen-banks"
              className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Number of Banks
            </label>
            <input
              id="gen-banks"
              type="number"
              min={12}
              max={120}
              value={bankCount}
              onChange={(e) => setBankCount(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="gen-seed"
              className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Random Seed
            </label>
            <input
              id="gen-seed"
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="gen-messy"
              className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Messy Records (%)
            </label>
            <input
              id="gen-messy"
              type="number"
              min={0}
              max={50}
              value={messyPercent}
              onChange={(e) => setMessyPercent(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="gen-invalid"
              className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Invalid Records (%)
            </label>
            <input
              id="gen-invalid"
              type="number"
              min={0}
              max={40}
              value={invalidPercent}
              onChange={(e) => setInvalidPercent(Number(e.target.value))}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm tabular-nums text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={running}
            onClick={() => void handleGenerate('replace')}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Replace current data
          </button>

          <button
            type="button"
            disabled={running}
            onClick={() => void handleGenerate('append')}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Append to current data
          </button>

          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Current store: {validRecords.length.toLocaleString()} valid · {rejectedRecords.length.toLocaleString()} rejected
          </span>
        </div>

        {/* Progress Indicator */}
        {(running || progress > 0) && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>{stageText}</span>
              <span className="font-mono tabular-nums">{progress}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full bg-blue-600 transition-[width] duration-150 dark:bg-blue-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Post-Generation Summary */}
      {lastStats && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Pipeline Processed Synthetic Batch
              </h3>
            </div>
            <div className="flex flex-wrap gap-4 text-xs font-medium">
              <Link to="/" className="text-blue-700 hover:underline dark:text-blue-400">
                Open Dashboard
              </Link>
              <Link to="/explorer" className="text-blue-700 hover:underline dark:text-blue-400">
                Explore Records
              </Link>
              <Link to="/rejected" className="text-blue-700 hover:underline dark:text-blue-400">
                Review Rejected
              </Link>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Generated & Loaded', val: lastStats.loaded },
              { label: 'Cleaned', val: lastStats.cleaned },
              { label: 'Accepted (Valid)', val: lastStats.valid },
              { label: 'Rejected (Rules)', val: lastStats.rejected },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
                  {item.val.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
