import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { REQUIRED_COLUMNS } from '../engine/constants';
import { checkRequiredColumns } from '../engine/validator';
import type { RawUxRow } from '../types/ux';

export interface ParsedFileResult {
  fileName: string;
  sourceKind: 'csv' | 'excel' | 'image';
  headers: string[];
  rows: RawUxRow[];
  rowCount: number;
  previewUrl?: string;
  notes?: string;
}

/**
 * Normalizes raw header keys on parsed objects so minor casing or spacing
 * differences in uploaded spreadsheets map cleanly to the 14 schema keys.
 */
function normalizeRowKeys(rawObj: Record<string, unknown>): RawUxRow {
  const normalized: RawUxRow = {};
  for (const [key, val] of Object.entries(rawObj)) {
    const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
    normalized[cleanKey] = val;
  }
  return normalized;
}

function fileToBase64(file: File): Promise<{ base64Data: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx === -1) {
        reject(new Error(`Could not read binary data from "${file.name}".`));
        return;
      }
      resolve({
        base64Data: dataUrl.slice(commaIdx + 1),
        dataUrl,
      });
    };
    reader.onerror = () => {
      reject(new Error(`Failed to read image file "${file.name}".`));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Parses a CSV, Excel (.xlsx/.xls), or Image (.jpg/.jpeg/.png) file.
 * - CSV/Excel are parsed locally in the browser and validated for all 14 required columns.
 * - JPG/PNG images are sent to /api/extract-image-rows to extract tabular/UX rows,
 *   verified against the 14-column schema, and returned for pipeline cleaning & validation.
 */
export async function parseUxDataFile(file: File): Promise<ParsedFileResult> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            reject(
              new Error(
                `Unable to parse CSV file "${file.name}": ${results.errors[0].message}`
              )
            );
            return;
          }

          const headers = (results.meta.fields ?? []).map((f) =>
            f.trim().toLowerCase().replace(/\s+/g, '_')
          );

          if (headers.length === 0) {
            reject(new Error(`File "${file.name}" appears to be empty or has no header row.`));
            return;
          }

          const colCheck = checkRequiredColumns(headers);
          if (!colCheck.valid) {
            reject(new Error(`File "${file.name}" rejected — ${colCheck.message}`));
            return;
          }

          const rows = results.data.map(normalizeRowKeys);
          resolve({
            fileName: file.name,
            sourceKind: 'csv',
            headers,
            rows,
            rowCount: rows.length,
          });
        },
        error: (err) => {
          reject(new Error(`Could not read "${file.name}": ${err.message}`));
        },
      });
    });
  }

  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error(`Excel file "${file.name}" contains no worksheets.`);
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: '',
        raw: true,
      });

      const headerMatrix = XLSX.utils.sheet_to_json<string[]>(worksheet, {
        header: 1,
        range: 0,
      });
      const rawHeaders = Array.isArray(headerMatrix[0])
        ? headerMatrix[0].map((h) => String(h ?? '').trim().toLowerCase().replace(/\s+/g, '_'))
        : [];

      if (rawHeaders.length === 0) {
        throw new Error(`Worksheet "${firstSheetName}" in "${file.name}" has no header row.`);
      }

      const colCheck = checkRequiredColumns(rawHeaders);
      if (!colCheck.valid) {
        throw new Error(`File "${file.name}" rejected — ${colCheck.message}`);
      }

      const rows = jsonRows.map(normalizeRowKeys);
      return {
        fileName: file.name,
        sourceKind: 'excel',
        headers: rawHeaders,
        rows,
        rowCount: rows.length,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown Excel parsing error';
      throw new Error(msg);
    }
  }

  if (
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png')
  ) {
    const mimeType = lowerName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const { base64Data, dataUrl } = await fileToBase64(file);

    const response = await fetch('/api/extract-image-rows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        mimeType,
        base64Data,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      source_type?: string;
      detected_columns?: string[];
      notes?: string;
      rows?: Record<string, unknown>[];
    };

    if (!response.ok) {
      throw new Error(
        payload.error || `Failed to process image "${file.name}" (HTTP ${response.status}).`
      );
    }

    if (payload.source_type === 'unreadable' || !payload.rows || payload.rows.length === 0) {
      throw new Error(
        `Image "${file.name}" does not contain readable UX dataset rows or banking screen details.`
      );
    }

    const detectedHeaders = (payload.detected_columns ?? []).map((h) =>
      h.trim().toLowerCase().replace(/\s+/g, '_')
    );

    if (payload.source_type === 'table' && detectedHeaders.length > 0) {
      const colCheck = checkRequiredColumns(detectedHeaders);
      if (!colCheck.valid) {
        throw new Error(`Image "${file.name}" rejected — ${colCheck.message}`);
      }
    }

    const normalizedRows = payload.rows.map(normalizeRowKeys);
    return {
      fileName: file.name,
      sourceKind: 'image',
      headers: detectedHeaders.length > 0 ? detectedHeaders : [...REQUIRED_COLUMNS],
      rows: normalizedRows,
      rowCount: normalizedRows.length,
      previewUrl: dataUrl,
      notes: payload.notes,
    };
  }

  throw new Error(
    `Unsupported file format for "${file.name}". Please upload .csv, .xlsx, .xls, .jpg, .jpeg, or .png files.`
  );
}
