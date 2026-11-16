import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FlaskConical,
  Menu,
  Moon,
  PlusCircle,
  Sliders,
  Sparkles,
  Sun,
  Upload,
  X,
  XCircle,
  Info,
} from 'lucide-react';
import { useDataset } from '../context/DatasetContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/upload', label: 'Upload Data', icon: Upload },
  { to: '/add', label: 'Add Record', icon: PlusCircle },
  { to: '/generate', label: 'Generate Dataset', icon: Sparkles },
  { to: '/explorer', label: 'Dataset Explorer', icon: Database },
  { to: '/tests', label: 'Validation and Test Cases', icon: FlaskConical },
  { to: '/rejected', label: 'Rejected Records', icon: AlertTriangle },
  { to: '/settings', label: 'Rules and Settings', icon: Sliders },
  { to: '/export', label: 'Export', icon: Download },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme, toasts, dismissToast, validRecords, rejectedRecords } =
    useDataset();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const currentNav =
    NAV_ITEMS.find((item) => item.to === location.pathname) ?? NAV_ITEMS[0];

  const renderNavLinks = (isMobile: boolean) => (
    <nav aria-label="Primary Navigation" className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const showCount =
          (item.to === '/explorer' && validRecords.length > 0) ||
          (item.to === '/rejected' && rejectedRecords.length > 0);
        const count =
          item.to === '/explorer' ? validRecords.length : rejectedRecords.length;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => isMobile && setMobileOpen(false)}
            title={collapsed && !isMobile ? item.label : undefined}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'
              } ${collapsed && !isMobile ? 'justify-center px-2' : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white'
                  }`}
                />
                {(!collapsed || isMobile) && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
                {(!collapsed || isMobile) && showCount && (
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      isActive
                        ? 'text-blue-100'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {count.toLocaleString()}
                  </span>
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop collapsible sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-[width] duration-200 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white truncate">
              BankUX Automation
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
        {renderNavLinks(false)}
      </aside>

      {/* Mobile slide-in drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                BankUX Automation
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNavLinks(true)}
          </aside>
        </div>
      )}

      {/* Main viewport */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              {currentNav.label}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4 text-amber-400" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 text-slate-600" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              )}
            </button>

            <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-slate-700">
              <img
                src="/dit-logo.svg"
                alt="DefineInfoTech — We Define Intellect"
                className="h-8 w-auto object-contain"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1360px]">{children}</div>
        </main>
      </div>

      {/* Accessible Toast Notification Stack */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            {toast.type === 'success' && (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            {toast.type === 'error' && (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            )}
            {toast.type === 'info' && (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
