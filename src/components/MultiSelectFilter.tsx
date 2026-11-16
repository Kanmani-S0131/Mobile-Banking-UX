import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
}

/**
 * Accessible multi-select dropdown filter supporting concurrent filtering
 * across Country, Bank, Category, and Grade in Dataset Explorer.
 */
export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  searchable = false,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const toggleValue = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const buttonSummary =
    selected.length === 0
      ? `All ${label}`
      : selected.length === 1
      ? selected[0]
      : `${selected.length} ${label} selected`;

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
      </label>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-lg border px-3 text-left text-sm transition-colors ${
          selected.length > 0
            ? 'border-blue-500 bg-blue-50/60 text-slate-900 dark:border-blue-500 dark:bg-blue-950/30 dark:text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600'
        }`}
      >
        <span className="truncate">{buttonSummary}</span>
        <div className="flex items-center gap-1 shrink-0">
          {selected.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              aria-label={`Clear ${label} filter`}
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  e.preventDefault();
                  onChange([]);
                }
              }}
              className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={`${label} options`}
          className="absolute left-0 z-40 mt-1.5 w-64 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {searchable && (
            <div className="border-b border-slate-200 p-2 dark:border-slate-800">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Filter ${label.toLowerCase()}...`}
                  className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5 text-xs dark:border-slate-800">
            <button
              type="button"
              onClick={() => onChange(options)}
              className="font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Select all ({options.length})
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Clear
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                No matches found.
              </p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selected.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggleValue(opt)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500'
                          : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{opt}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
