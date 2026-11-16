import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Loader2, RotateCcw, Sparkles, Upload } from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { buildSummaries } from '../engine/pipeline';
import { generateSyntheticDataset } from '../engine/generator';
import type { UxGrade } from '../types/ux';

const GRADE_COLORS: Record<UxGrade, string> = {
  Excellent: '#16a34a',
  Good: '#2563eb',
  Fair: '#d97706',
  Poor: '#dc2626',
};

export function DashboardPage() {
  const { validRecords, rejectedRecords, ingestRows, addToast, theme } = useDataset();
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const [bankFilter, setBankFilter] = useState<string>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const [generating, setGenerating] = useState(false);

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisTickColor = isDark ? '#94a3b8' : '#475569';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderColor: isDark ? '#334155' : '#e2e8f0',
    borderRadius: '8px',
    color: isDark ? '#f1f5f9' : '#0f172a',
    fontSize: '12px',
  };

  // Available filter options derived from valid records
  const countryOptions = useMemo(
    () => Array.from(new Set(validRecords.map((r) => r.country))).sort(),
    [validRecords]
  );

  const bankOptions = useMemo(() => {
    const source =
      countryFilter === 'ALL'
        ? validRecords
        : validRecords.filter((r) => r.country === countryFilter);
    return Array.from(new Set(source.map((r) => r.bank_name))).sort();
  }, [validRecords, countryFilter]);

  // Filtered valid records
  const filteredValid = useMemo(() => {
    return validRecords.filter((r) => {
      if (countryFilter !== 'ALL' && r.country !== countryFilter) return false;
      if (bankFilter !== 'ALL' && r.bank_name !== bankFilter) return false;
      if (gradeFilter !== 'ALL' && r.grade !== gradeFilter) return false;
      return true;
    });
  }, [validRecords, countryFilter, bankFilter, gradeFilter]);

  // Also filter rejected records by country/bank when those filters are active
  const filteredRejected = useMemo(() => {
    if (countryFilter === 'ALL' && bankFilter === 'ALL') return rejectedRecords;
    return rejectedRecords.filter((rej) => {
      const origCountry = (rej.original.country ?? '').toLowerCase();
      const origBank = (rej.original.bank_name ?? '').toLowerCase();
      if (
        countryFilter !== 'ALL' &&
        !origCountry.includes(countryFilter.toLowerCase())
      ) {
        return false;
      }
      if (bankFilter !== 'ALL' && !origBank.includes(bankFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [rejectedRecords, countryFilter, bankFilter]);

  const filteredSummaries = useMemo(
    () => buildSummaries(filteredValid, filteredRejected),
    [filteredValid, filteredRejected]
  );

  // KPIs
  const kpis = useMemo(() => {
    const validCount = filteredValid.length;
    const rejectedCount = filteredRejected.length;
    const totalCount = validCount + rejectedCount;
    const bankCount = new Set(filteredValid.map((r) => r.bank_name)).size;
    const countryCount = new Set(filteredValid.map((r) => r.country)).size;
    const avgScore =
      validCount > 0
        ? Math.round(
            (filteredValid.reduce((acc, r) => acc + r.ux_score, 0) / validCount) * 10
          ) / 10
        : 0;

    return { totalCount, validCount, rejectedCount, bankCount, countryCount, avgScore };
  }, [filteredValid, filteredRejected]);

  // Grade Donut data
  const gradeData = useMemo(() => {
    const counts: Record<UxGrade, number> = {
      Excellent: 0,
      Good: 0,
      Fair: 0,
      Poor: 0,
    };
    for (const r of filteredValid) {
      counts[r.grade] += 1;
    }
    return (['Excellent', 'Good', 'Fair', 'Poor'] as UxGrade[])
      .map((name) => ({
        name,
        value: counts[name],
        color: GRADE_COLORS[name],
      }))
      .filter((d) => d.value > 0);
  }, [filteredValid]);

  const topBanksData = useMemo(
    () => filteredSummaries.byBank.slice(0, 12),
    [filteredSummaries.byBank]
  );

  const handleGenerateSample = async () => {
    setGenerating(true);
    try {
      const raw = await generateSyntheticDataset({
        recordCount: 1200,
        bankCount: 60,
        seed: 2026,
        messyPercent: 15,
        invalidPercent: 8,
      });
      const res = ingestRows(raw, 'replace');
      addToast(
        'success',
        'Sample dataset ready',
        `Loaded ${res.stats.loaded.toLocaleString()} records (${res.stats.valid.toLocaleString()} valid, ${res.stats.rejected.toLocaleString()} rejected).`
      );
    } catch (err) {
      addToast(
        'error',
        'Failed to generate sample data',
        err instanceof Error ? err.message : 'Unexpected error'
      );
    } finally {
      setGenerating(false);
    }
  };

  // Empty state when no data has been loaded yet
  if (validRecords.length === 0 && rejectedRecords.length === 0) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            No UX dataset loaded yet
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Generate a realistic 1,200-record international mobile banking dataset across 60
            fictional banks and 12 countries, or upload your own CSV and Excel files to run the
            automated cleaning, validation, and scoring pipeline.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateSample}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating sample data...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate sample data
                </>
              )}
            </button>
            <Link
              to="/upload"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Upload className="h-4 w-4" />
              Upload CSV / Excel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasActiveFilters =
    countryFilter !== 'ALL' || bankFilter !== 'ALL' || gradeFilter !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <section
        aria-label="Dashboard Filters"
        className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="min-w-[180px] flex-1">
          <label
            htmlFor="dash-country"
            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Country
          </label>
          <select
            id="dash-country"
            value={countryFilter}
            onChange={(e) => {
              setCountryFilter(e.target.value);
              setBankFilter('ALL');
            }}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="ALL">All Countries ({countryOptions.length})</option>
            {countryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[200px] flex-1">
          <label
            htmlFor="dash-bank"
            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Bank
          </label>
          <select
            id="dash-bank"
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="ALL">All Banks ({bankOptions.length})</option>
            {bankOptions.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[160px] flex-1">
          <label
            htmlFor="dash-grade"
            className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Grade
          </label>
          <select
            id="dash-grade"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="ALL">All Grades</option>
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setCountryFilter('ALL');
              setBankFilter('ALL');
              setGradeFilter('ALL');
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </button>
        )}
      </section>

      {/* 6 KPI Cards */}
      <section
        aria-label="Key Metrics"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
      >
        {[
          { label: 'Total Records', value: kpis.totalCount.toLocaleString(), tone: 'text-slate-900 dark:text-white' },
          { label: 'Valid Records', value: kpis.validCount.toLocaleString(), tone: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Rejected Records', value: kpis.rejectedCount.toLocaleString(), tone: 'text-red-600 dark:text-red-400' },
          { label: 'Banks Covered', value: kpis.bankCount.toLocaleString(), tone: 'text-slate-900 dark:text-white' },
          { label: 'Countries', value: kpis.countryCount.toLocaleString(), tone: 'text-slate-900 dark:text-white' },
          { label: 'Average UX Score', value: `${kpis.avgScore} / 100`, tone: 'text-blue-600 dark:text-blue-400' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {kpi.label}
            </p>
            <p className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${kpi.tone}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </section>

      {/* Charts Grid Row 1: Ranked Banks + Grade Donut */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Average UX Score by Bank (Top Ranked)
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Showing {topBanksData.length} of {filteredSummaries.byBank.length} banks
            </span>
          </div>
          {topBanksData.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              No valid records match the selected filters.
            </p>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topBanksData}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: axisTickColor, fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="bank_name"
                    width={150}
                    tick={{ fill: axisTickColor, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: unknown) => [`${val} / 100`, 'Avg UX Score']}
                  />
                  <Bar dataKey="avg_score" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Grade Distribution
          </h2>
          {gradeData.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              No scored records in current filter.
            </p>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gradeData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="46%"
                    innerRadius={62}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {gradeData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: unknown, name: unknown) => [
                      `${Number(val).toLocaleString()} screens`,
                      String(name),
                    ]}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Charts Grid Row 2: Screen Category + Region */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Average UX Score by Screen Category
          </h2>
          {filteredSummaries.byCategory.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              No category data available.
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredSummaries.byCategory}
                  margin={{ top: 8, right: 16, left: 0, bottom: 28 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="screen_category"
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    height={55}
                    tick={{ fill: axisTickColor, fontSize: 11 }}
                  />
                  <YAxis domain={[0, 100]} tick={{ fill: axisTickColor, fontSize: 12 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: unknown) => [`${val} / 100`, 'Avg UX Score']}
                  />
                  <Bar dataKey="avg_score" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
            Average UX Score by Region
          </h2>
          {filteredSummaries.byRegion.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
              No regional data available.
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredSummaries.byRegion}
                  margin={{ top: 8, right: 16, left: 0, bottom: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="region"
                    tick={{ fill: axisTickColor, fontSize: 11 }}
                  />
                  <YAxis domain={[0, 100]} tick={{ fill: axisTickColor, fontSize: 12 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: unknown) => [`${val} / 100`, 'Avg UX Score']}
                  />
                  <Bar dataKey="avg_score" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Charts Row 3: Rejection Reasons */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Rejection Reasons Breakdown
          </h2>
          <Link
            to="/rejected"
            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Inspect & fix rejected rows
          </Link>
        </div>
        {filteredSummaries.byRejectionReason.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Zero rejected records in the current dataset.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredSummaries.byRejectionReason}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 10, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: axisTickColor, fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="reason"
                  width={220}
                  tick={{ fill: axisTickColor, fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(val: unknown) => [`${val} rows`, 'Rejected']}
                />
                <Bar dataKey="count" fill="#dc2626" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
