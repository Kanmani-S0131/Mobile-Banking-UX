import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type {
  BankSummary,
  DatasetSummaries,
  PipelineRulesConfig,
  RejectedUxRecord,
  ValidUxRecord,
} from '../types/ux';

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCsv(rows: Record<string, unknown>[], filename: string): void {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  triggerDownload(blob, filename);
}

function flattenValidForExport(records: ValidUxRecord[]): Record<string, unknown>[] {
  return records.map((r) => ({
    record_id: r.record_id,
    bank_name: r.bank_name,
    country: r.country,
    region: r.region,
    app_name: r.app_name,
    screen_no: r.screen_no,
    screen_name: r.screen_name,
    screen_category: r.screen_category,
    features_present: r.features_present,
    auth_method: r.auth_method,
    languages_supported: r.languages_supported,
    accessibility_flag: r.accessibility_flag,
    ux_rating: r.ux_rating,
    ux_score: r.ux_score,
    grade: r.grade,
    collected_by: r.collected_by,
    collected_date: r.collected_date,
  }));
}

function flattenRejectedForExport(records: RejectedUxRecord[]): Record<string, unknown>[] {
  return records.map((r) => ({
    ...r.original,
    rejection_reasons: r.reasons.join(' | '),
    rejected_at: r.rejected_at,
  }));
}

export function exportValidDataset(
  records: ValidUxRecord[],
  format: 'csv' | 'xlsx' | 'json'
): void {
  const flat = flattenValidForExport(records);
  if (format === 'csv') {
    downloadCsv(flat, 'ux_valid_dataset.csv');
  } else if (format === 'json') {
    downloadJson(flat, 'ux_valid_dataset.json');
  } else {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(flat);
    XLSX.utils.book_append_sheet(wb, ws, 'Master Data');
    XLSX.writeFile(wb, 'ux_valid_dataset.xlsx');
  }
}

export function exportRejectedRecords(
  records: RejectedUxRecord[],
  format: 'csv' | 'xlsx' | 'json'
): void {
  const flat = flattenRejectedForExport(records);
  if (format === 'csv') {
    downloadCsv(flat, 'ux_rejected_records.csv');
  } else if (format === 'json') {
    downloadJson(flat, 'ux_rejected_records.json');
  } else {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(flat);
    XLSX.utils.book_append_sheet(wb, ws, 'Rejected Records');
    XLSX.writeFile(wb, 'ux_rejected_records.xlsx');
  }
}

export function exportBankSummary(
  byBank: BankSummary[],
  format: 'csv' | 'xlsx' | 'json'
): void {
  if (format === 'csv') {
    downloadCsv(byBank as unknown as Record<string, unknown>[], 'ux_bank_summary.csv');
  } else if (format === 'json') {
    downloadJson(byBank, 'ux_bank_summary.json');
  } else {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(byBank);
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Summary');
    XLSX.writeFile(wb, 'ux_bank_summary.xlsx');
  }
}

/**
 * Exports the complete UX analytics report:
 * - XLSX: 5 separate worksheets (Master Data, Bank Summary, Category Summary, Region Summary, Rejected Records)
 * - JSON: Structured bundle with metadata, summaries, valid records, and rejected records
 * - CSV: Combined summary + master rows report
 */
export function exportFullReport(
  validRecords: ValidUxRecord[],
  rejectedRecords: RejectedUxRecord[],
  summaries: DatasetSummaries,
  rules: PipelineRulesConfig,
  format: 'csv' | 'xlsx' | 'json'
): void {
  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const masterSheet = XLSX.utils.json_to_sheet(flattenValidForExport(validRecords));
    const bankSheet = XLSX.utils.json_to_sheet(summaries.byBank);
    const categorySheet = XLSX.utils.json_to_sheet(summaries.byCategory);
    const regionSheet = XLSX.utils.json_to_sheet(summaries.byRegion);
    const rejectedSheet = XLSX.utils.json_to_sheet(flattenRejectedForExport(rejectedRecords));

    XLSX.utils.book_append_sheet(wb, masterSheet, 'Master Data');
    XLSX.utils.book_append_sheet(wb, bankSheet, 'Bank Summary');
    XLSX.utils.book_append_sheet(wb, categorySheet, 'Category Summary');
    XLSX.utils.book_append_sheet(wb, regionSheet, 'Region Summary');
    XLSX.utils.book_append_sheet(wb, rejectedSheet, 'Rejected Records');
    XLSX.writeFile(wb, 'international_banking_ux_full_report.xlsx');
    return;
  }

  if (format === 'json') {
    downloadJson(
      {
        exported_at: new Date().toISOString(),
        rules,
        counts: {
          valid: validRecords.length,
          rejected: rejectedRecords.length,
          banks: summaries.byBank.length,
          categories: summaries.byCategory.length,
          regions: summaries.byRegion.length,
        },
        summaries,
        master_data: flattenValidForExport(validRecords),
        rejected_records: flattenRejectedForExport(rejectedRecords),
      },
      'international_banking_ux_full_report.json'
    );
    return;
  }

  // CSV format for full report combines bank, category, and region summaries cleanly
  const summaryRows: Record<string, unknown>[] = [
    ...summaries.byRegion.map((r) => ({ section: 'Region Summary', name: r.region, count: r.record_count, avg_ux_rating: r.avg_ux_rating, avg_score: r.avg_score, details: `${r.banks_count} banks, ${r.excellent_pct}% Excellent` })),
    ...summaries.byCategory.map((c) => ({ section: 'Category Summary', name: c.screen_category, count: c.record_count, avg_ux_rating: c.avg_ux_rating, avg_score: c.avg_score, details: `Top auth: ${c.top_auth_method}` })),
    ...summaries.byBank.map((b) => ({ section: 'Bank Summary', name: b.bank_name, count: b.screen_count, avg_ux_rating: b.avg_ux_rating, avg_score: b.avg_score, details: `${b.country} (${b.dominant_grade})` })),
  ];
  downloadCsv(summaryRows, 'international_banking_ux_full_report.csv');
}
