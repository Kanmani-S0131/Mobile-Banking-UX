import React, { useMemo, useState } from 'react';
import { Check, CheckCircle2, PlusCircle, RotateCcw, XCircle } from 'lucide-react';
import { useDataset } from '../context/DatasetContext';
import { cleanRawRow } from '../engine/cleaner';
import {
  APPROVED_AUTH_METHODS,
  APPROVED_CATEGORIES,
  APPROVED_COUNTRIES,
  APPROVED_FEATURES,
  OFFICIAL_LANGUAGES,
} from '../engine/constants';
import { scoreRecord } from '../engine/scorer';
import { buildDuplicateKey, getTodayIsoDate } from '../engine/validator';
import type { AccessibilityFlag, RawUxRow } from '../types/ux';

interface FormState {
  record_id: string;
  bank_name: string;
  country: string;
  app_name: string;
  screen_no: string;
  screen_name: string;
  screen_category: string;
  features_list: string[];
  auth_method: string;
  languages_list: string[];
  accessibility_flag: AccessibilityFlag;
  ux_rating: number;
  collected_by: string;
  collected_date: string;
}

type FieldErrors = Partial<Record<keyof FormState | 'duplicate', string>>;

export function AddRecordPage() {
  const { validRecords, rules, addSingleRecord, addToast } = useDataset();

  const suggestedId = useMemo(
    () => `REC-${String(validRecords.length + 1).padStart(5, '0')}`,
    [validRecords.length]
  );

  const existingBanks = useMemo(
    () => Array.from(new Set(validRecords.map((r) => r.bank_name))).sort(),
    [validRecords]
  );

  const [form, setForm] = useState<FormState>({
    record_id: suggestedId,
    bank_name: '',
    country: '',
    app_name: '',
    screen_no: '1',
    screen_name: '',
    screen_category: '',
    features_list: ['Biometric Login', 'Dark Mode'],
    auth_method: '',
    languages_list: ['English'],
    accessibility_flag: 'Yes',
    ux_rating: 4,
    collected_by: '',
    collected_date: getTodayIsoDate(),
  });

  const [customLang, setCustomLang] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const markTouched = (field: keyof FormState) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Live mirror of pipeline cleaning + BR1-BR5 validation per field
  const liveValidation = useMemo(() => {
    const raw: RawUxRow = {
      record_id: form.record_id,
      bank_name: form.bank_name,
      country: form.country,
      app_name: form.app_name,
      screen_no: form.screen_no,
      screen_name: form.screen_name,
      screen_category: form.screen_category,
      features_present: form.features_list.join('; '),
      auth_method: form.auth_method,
      languages_supported: form.languages_list.join('; '),
      accessibility_flag: form.accessibility_flag,
      ux_rating: form.ux_rating,
      collected_by: form.collected_by,
      collected_date: form.collected_date,
    };

    const cleaned = cleanRawRow(raw);
    const errors: FieldErrors = {};
    const todayIso = getTodayIsoDate();

    if (!cleaned.record_id) {
      errors.record_id = 'Record ID is required (BR1). Enter a unique identifier such as REC-00001.';
    }
    if (!cleaned.bank_name) {
      errors.bank_name = 'Bank name is required (BR1). Enter the bank name.';
    }
    if (!cleaned.country) {
      errors.country = 'Country is required (BR1). Choose one of the 12 supported countries.';
    } else if (!APPROVED_COUNTRIES.includes(cleaned.country)) {
      errors.country = `"${cleaned.country}" is not an approved country (BR2). Select from the dropdown.`;
    }
    if (!cleaned.app_name) {
      errors.app_name = 'App name is required (BR1). Enter the mobile banking app name.';
    }
    if (!cleaned.screen_no_raw) {
      errors.screen_no = 'Screen number is required (BR1). Enter a positive whole number (1 or greater).';
    } else if (
      cleaned.screen_no === null ||
      !Number.isInteger(cleaned.screen_no) ||
      cleaned.screen_no < 1
    ) {
      errors.screen_no = 'Screen number must be a positive whole number like 1, 2, or 12 (BR3).';
    }
    if (!cleaned.screen_name) {
      errors.screen_name = 'Screen name is required (BR1). Describe the screen (e.g., Biometric Sign-In).';
    }
    if (!cleaned.screen_category) {
      errors.screen_category = 'Screen category is required (BR1). Choose one of the 13 categories.';
    } else if (!APPROVED_CATEGORIES.includes(cleaned.screen_category)) {
      errors.screen_category = 'Select a valid screen category from the approved list (BR2).';
    }
    if (!cleaned.auth_method) {
      errors.auth_method = 'Authentication method is required (BR1). Select PIN, Password, Biometric, OTP, or Face ID.';
    } else if (!APPROVED_AUTH_METHODS.includes(cleaned.auth_method)) {
      errors.auth_method = 'Select a valid authentication method from the approved list (BR2).';
    }
    if (cleaned.ux_rating === null || cleaned.ux_rating < 1 || cleaned.ux_rating > 5) {
      errors.ux_rating = 'UX rating must be between 1 and 5 (BR3).';
    }
    if (!cleaned.collected_by) {
      errors.collected_by = 'Collector name is required (BR1). Enter the researcher or auditor name.';
    }
    if (!cleaned.collected_date_raw) {
      errors.collected_date = 'Collection date is required (BR1). Pick a valid date.';
    } else if (!cleaned.collected_date) {
      errors.collected_date = 'Enter a valid calendar date in YYYY-MM-DD format (BR4).';
    } else if (cleaned.collected_date > todayIso) {
      errors.collected_date = `Collection date (${cleaned.collected_date}) cannot be in the future (BR4). Select today (${todayIso}) or earlier.`;
    }

    // BR5 Duplicate check against current valid dataset
    if (
      cleaned.bank_name &&
      cleaned.app_name &&
      cleaned.screen_no !== null &&
      Number.isInteger(cleaned.screen_no) &&
      cleaned.screen_no >= 1
    ) {
      const targetKey = buildDuplicateKey(
        cleaned.bank_name,
        cleaned.app_name,
        cleaned.screen_no
      );
      const hasDup = validRecords.some(
        (r) => buildDuplicateKey(r.bank_name, r.app_name, r.screen_no) === targetKey
      );
      if (hasDup) {
        errors.duplicate = `Duplicate record (BR5): (${cleaned.bank_name}, ${cleaned.app_name}, Screen #${cleaned.screen_no}) already exists. Change the screen number, app name, or bank.`;
      }
    }

    const previewScore = scoreRecord(
      {
        ux_rating: cleaned.ux_rating ?? 1,
        featuresCount: cleaned.features_list.length,
        accessibility_flag:
          cleaned.accessibility_flag === 'No' ? 'No' : 'Yes',
        languagesCount: cleaned.languages_list.length,
      },
      rules
    );

    return {
      raw,
      cleaned,
      errors,
      isValid: Object.keys(errors).length === 0,
      previewScore,
    };
  }, [form, validRecords, rules]);

  const showError = (field: keyof FormState) =>
    (touched[field] || submitAttempted) && liveValidation.errors[field];

  const inputClass = (field: keyof FormState) =>
    `h-10 w-full rounded-lg border px-3 text-sm transition-colors bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 ${
      showError(field)
        ? 'border-red-500 focus:border-red-500 dark:border-red-500'
        : 'border-slate-200 dark:border-slate-700'
    }`;

  const toggleFeature = (feat: string) => {
    setForm((prev) => ({
      ...prev,
      features_list: prev.features_list.includes(feat)
        ? prev.features_list.filter((f) => f !== feat)
        : [...prev.features_list, feat],
    }));
  };

  const toggleLanguage = (lang: string) => {
    setForm((prev) => ({
      ...prev,
      languages_list: prev.languages_list.includes(lang)
        ? prev.languages_list.filter((l) => l !== lang)
        : [...prev.languages_list, lang],
    }));
  };

  const handleAddCustomLanguage = () => {
    const trimmed = customLang.trim();
    if (!trimmed) return;
    if (!form.languages_list.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      setForm((prev) => ({
        ...prev,
        languages_list: [...prev.languages_list, trimmed],
      }));
    }
    setCustomLang('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!liveValidation.isValid) {
      addToast(
        'error',
        'Cannot add record yet',
        'Please resolve the highlighted validation errors first.'
      );
      return;
    }

    const res = addSingleRecord(liveValidation.raw);
    if (res.passed) {
      addToast(
        'success',
        'Record added to dataset',
        `${res.record.bank_name} · Screen #${res.record.screen_no} scored ${res.record.ux_score}/100 (${res.record.grade}).`
      );
      // Increment screen_no & reset screen_name for convenient rapid entry
      const nextScreen = Number(form.screen_no) + 1;
      setForm((prev) => ({
        ...prev,
        record_id: `REC-${String(validRecords.length + 2).padStart(5, '0')}`,
        screen_no: String(Number.isFinite(nextScreen) ? nextScreen : 1),
        screen_name: '',
      }));
      setTouched({});
      setSubmitAttempted(false);
    } else {
      addToast('error', 'Validation failed', res.reasons[0]);
    }
  };

  const handleReset = () => {
    setForm({
      record_id: suggestedId,
      bank_name: '',
      country: '',
      app_name: '',
      screen_no: '1',
      screen_name: '',
      screen_category: '',
      features_list: [],
      auth_method: '',
      languages_list: ['English'],
      accessibility_flag: 'Yes',
      ux_rating: 4,
      collected_by: '',
      collected_date: getTodayIsoDate(),
    });
    setTouched({});
    setSubmitAttempted(false);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              New Mobile Banking Screen Entry
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All fields validate live against BR1–BR5 before insertion.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Form
          </button>
        </div>

        {/* BR5 Duplicate Warning */}
        {liveValidation.errors.duplicate && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
          >
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{liveValidation.errors.duplicate}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* record_id */}
          <div>
            <label htmlFor="add-record-id" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Record ID *
            </label>
            <input
              id="add-record-id"
              type="text"
              value={form.record_id}
              onChange={(e) => setForm({ ...form, record_id: e.target.value })}
              onBlur={() => markTouched('record_id')}
              className={inputClass('record_id')}
              placeholder="REC-00001"
            />
            {showError('record_id') && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {liveValidation.errors.record_id}
              </p>
            )}
          </div>

          {/* bank_name */}
          <div>
            <label htmlFor="add-bank-name" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Bank Name *
            </label>
            <input
              id="add-bank-name"
              type="text"
              list="existing-banks-datalist"
              value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
              onBlur={() => markTouched('bank_name')}
              className={inputClass('bank_name')}
              placeholder="e.g. Liberty Crest Bank"
            />
            <datalist id="existing-banks-datalist">
              {existingBanks.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
            {showError('bank_name') && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {liveValidation.errors.bank_name}
              </p>
            )}
          </div>

          {/* country */}
          <div>
            <label htmlFor="add-country" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Country *
            </label>
            <select
              id="add-country"
              value={form.country}
              onChange={(e) => {
                markTouched('country');
                setForm({ ...form, country: e.target.value });
              }}
              onBlur={() => markTouched('country')}
              className={inputClass('country')}
            >
              <option value="">Select country...</option>
              {APPROVED_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {showError('country') && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {liveValidation.errors.country}
              </p>
            )}
          </div>

          {/* app_name */}
          <div>
            <label htmlFor="add-app-name" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              App Name *
            </label>
            <input
              id="add-app-name"
              type="text"
              value={form.app_name}
              onChange={(e) => setForm({ ...form, app_name: e.target.value })}
              onBlur={() => markTouched('app_name')}
              className={inputClass('app_name')}
              placeholder="e.g. Liberty Mobile"
            />
            {showError('app_name') && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {liveValidation.errors.app_name}
              </p>
            )}
          </div>

          {/* screen_no */}
          <div>
            <label htmlFor="add-screen-no" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Screen No *
            </label>
            <input
              id="add-screen-no"
              type="number"
              min={1}
              step={1}
              value={form.screen_no}
              onChange={(e) => setForm({ ...form, screen_no: e.target.value })}
              onBlur={() => markTouched('screen_no')}
              className={inputClass('screen_no')}
            />
            {showError('screen_no') && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {liveValidation.errors.screen_no}
              </p>
            )}
          </div>

          {/* screen_name */}
          <div>
            <label htmlFor="add-screen-name" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Screen Name *
            </label>
            <input
              id="add-screen-name"
              type="text"
              value={form.screen_name}
              onChange={(e) => setForm({ ...form, screen_name: e.target.value })}
              onBlur={() => markTouched('screen_name')}
              className={inputClass('screen_name')}
              placeholder="e.g. Biometric Sign-In"
            />
            {showError('screen_name') && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {liveValidation.errors.screen_name}
              </p>
            )}
          </div>

          {/* screen_category */}
          <div>
            <label htmlFor="add-category" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Screen Category *
            </label>
            <select
              id="add-category"
              value={form.screen_category}
              onChange={(e) => {
                markTouched('screen_category');
                setForm({ ...form, screen_category: e.target.value });
              }}
              onBlur={() => markTouched('screen_category')}
              className={inputClass('screen_category')}
            >
              <option value="">Select category...</option>
              {APPROVED_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {showError('screen_category') && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {liveValidation.errors.screen_category}
              </p>
            )}
          </div>

          {/* auth_method */}
          <div>
            <label htmlFor="add-auth" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Auth Method *
            </label>
            <select
              id="add-auth"
              value={form.auth_method}
              onChange={(e) => {
                markTouched('auth_method');
                setForm({ ...form, auth_method: e.target.value });
              }}
              onBlur={() => markTouched('auth_method')}
              className={inputClass('auth_method')}
            >
              <option value="">Select auth method...</option>
              {APPROVED_AUTH_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {showError('auth_method') && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {liveValidation.errors.auth_method}
              </p>
            )}
          </div>
        </div>

        {/* Features Multi-Select */}
        <div>
          <span className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Features Present ({form.features_list.length} selected)
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {APPROVED_FEATURES.map((feat) => {
              const active = form.features_list.includes(feat);
              return (
                <button
                  key={feat}
                  type="button"
                  onClick={() => toggleFeature(feat)}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                    active
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  <Check className={`h-3.5 w-3.5 shrink-0 ${active ? 'opacity-100' : 'opacity-20'}`} />
                  <span className="truncate">{feat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Languages Multi-Select */}
        <div>
          <span className="mb-2 block text-xs font-medium text-slate-700 dark:text-slate-300">
            Languages Supported ({form.languages_list.length} selected)
          </span>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set([...OFFICIAL_LANGUAGES, ...form.languages_list])).map((lang) => {
              const active = form.languages_list.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <Check className={`h-3 w-3 ${active ? 'opacity-100' : 'opacity-20'}`} />
                  {lang}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex max-w-xs gap-2">
            <input
              type="text"
              value={customLang}
              onChange={(e) => setCustomLang(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomLanguage();
                }
              }}
              placeholder="Add another language..."
              className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={handleAddCustomLanguage}
              className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Add
            </button>
          </div>
        </div>

        {/* Accessibility, UX Rating, Collected By, Collected Date */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Accessibility Flag *
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(['Yes', 'No'] as AccessibilityFlag[]).map((flag) => (
                <button
                  key={flag}
                  type="button"
                  onClick={() => setForm({ ...form, accessibility_flag: flag })}
                  className={`h-10 rounded-lg border text-sm font-medium transition-colors ${
                    form.accessibility_flag === flag
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {flag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              UX Rating (1–5) *
            </span>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    markTouched('ux_rating');
                    setForm({ ...form, ux_rating: num });
                  }}
                  className={`h-10 rounded-lg border font-mono text-sm font-semibold transition-colors ${
                    form.ux_rating === num
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="add-collected-by" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Collected By *
            </label>
            <input
              id="add-collected-by"
              type="text"
              value={form.collected_by}
              onChange={(e) => setForm({ ...form, collected_by: e.target.value })}
              onBlur={() => markTouched('collected_by')}
              className={inputClass('collected_by')}
              placeholder="e.g. Maya Chen"
            />
            {showError('collected_by') && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {liveValidation.errors.collected_by}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="add-collected-date" className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              Collected Date *
            </label>
            <input
              id="add-collected-date"
              type="date"
              max={getTodayIsoDate()}
              value={form.collected_date}
              onChange={(e) => {
                markTouched('collected_date');
                setForm({ ...form, collected_date: e.target.value });
              }}
              onBlur={() => markTouched('collected_date')}
              className={inputClass('collected_date')}
            />
            {showError('collected_date') && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {liveValidation.errors.collected_date}
              </p>
            )}
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <PlusCircle className="h-4 w-4" />
            Validate & Add Record
          </button>
        </div>
      </form>

      {/* Live Validation & Score Preview Side Panel */}
      <aside className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Live Score Preview
          </h3>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {liveValidation.previewScore.ux_score}
              <span className="text-sm font-normal text-slate-400"> / 100</span>
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Grade: {liveValidation.previewScore.grade}
            </span>
          </div>

          <dl className="mt-4 space-y-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-800">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">UX Rating component</dt>
              <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {liveValidation.previewScore.score_breakdown.ratingScore} / {rules.weights.ratingWeight}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Features (up to 5)</dt>
              <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {liveValidation.previewScore.score_breakdown.featuresScore} / {rules.weights.featuresWeight}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Accessibility</dt>
              <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {liveValidation.previewScore.score_breakdown.accessibilityScore} / {rules.weights.accessibilityWeight}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Languages (up to 5)</dt>
              <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {liveValidation.previewScore.score_breakdown.languagesScore} / {rules.weights.languagesWeight}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            {liveValidation.isValid ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  Ready to pass all rules
                </h3>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">
                  {Object.keys(liveValidation.errors).length} rule check(s) remaining
                </h3>
              </>
            )}
          </div>
          {!liveValidation.isValid && (
            <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              {Object.values(liveValidation.errors).map((err, i) => (
                <li key={i} className="leading-snug">
                  · {err}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
