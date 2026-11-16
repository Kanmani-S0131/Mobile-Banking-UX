# International Mobile Banking UX Dataset Automation

A browser-based data engineering, validation, scoring, and UX analytics workbench for international mobile banking app screens. All processing runs locally in the browser with `localStorage` persistence—no backend server required.

## Setup & Run Steps

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Start development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.
3. **Production build & type-check**:
   ```bash
   npm run lint
   npm run build
   ```

## Architecture & Module Guide

- **`src/types/ux.ts`**: TypeScript interfaces for raw rows, cleaned rows, scored valid records, rejected rows, rule settings, summaries, and test cases.
- **`src/engine/constants.ts`**: Official domain lists (`APPROVED_COUNTRIES`, `APPROVED_CATEGORIES`, `APPROVED_AUTH_METHODS`, `APPROVED_FEATURES`), country/language aliases, region mappings, default scoring weights, and the 60-bank fictional catalog.
- **`src/engine/cleaner.ts`**: **Pipeline Step 2 (Clean)**. Trims strings, converts blanks to missing, title-cases bank names, maps country aliases (`USA`, `U.K.`, `UAE`, `Korea`), normalizes `accessibility_flag` (`y`/`N`/`true`/`0` -> `Yes`/`No`), deduplicates and standardizes features & languages, performs case-insensitive matching for categories/auth methods, parses mixed date formats (`YYYY-MM-DD`, `DD/MM/YYYY`, Excel serials) to ISO dates, and parses numbers strictly.
- **`src/engine/validator.ts`**: **Pipeline Step 3 (Validate)**. Enforces Business Rules `BR1` (mandatory fields), `BR2` (approved lists & features), `BR3` (rating 1–5 & positive integer `screen_no`), `BR4` (non-future valid calendar dates), and `BR5` (uniqueness on `(bank_name, app_name, screen_no)` keeping the first row), plus CSV/Excel schema column checks.
- **`src/engine/scorer.ts`**: **Pipeline Step 4 (Score & Grade)**. Computes `rating/5 * 60 + min(features,5)/5 * 20 + (accessibility === 'Yes' ? 10 : 0) + min(languages,5)/5 * 10` using configurable weights and assigns `Excellent` / `Good` / `Fair` / `Poor` grades.
- **`src/engine/pipeline.ts`**: **Pipeline Orchestrator (Steps 1–5)**. Combines input rows, executes cleaning -> validation -> scoring, partitions valid vs. rejected rows, builds Bank/Category/Region/Rejection summaries, and supports instant recalculation & single-row re-validation.
- **`src/engine/generator.ts`**: Deterministic seeded PRNG (Mulberry32) synthetic generator producing 1,000–5,000+ realistic records across 60 fictional banks and 12 countries with configurable messy and invalid ratios.
- **`src/engine/testRunner.ts`**: Automated suite executing `TC01`–`TC14` and user-created custom test cases directly against the pipeline.
- **`src/utils/fileParser.ts` & `src/utils/exporter.ts`**: PapaParse (CSV) and SheetJS (`xlsx`) browser import/export including the 5-sheet Excel Full Report (`Master Data`, `Bank Summary`, `Category Summary`, `Region Summary`, `Rejected Records`).
- **`src/context/DatasetContext.tsx`**: Global state, `localStorage` persistence, dark/light mode, and toast notifications.

## Verification Guide

1. **Empty State & Sample Generation**: Open Dashboard (`/`) and click **Generate sample data** to populate 1,200 records across 60 banks and 12 countries.
2. **Dashboard Filters**: Filter by Country, Bank, or Grade and verify all 6 KPIs and 5 charts update dynamically.
3. **Upload CSV/Excel**: Open **Upload Data**, download `/sample_ux_dataset.csv` (or drop your own files), preview the first 10 rows, and click **Run Cleaning & Validation Pipeline** (`13` valid cleaned rows, `7` rejected rows).
4. **Live Field Validation**: Open **Add Record**, leave fields blank or pick a future date / duplicate `(bank, app, screen_no)` to see live red borders and rule-specific guidance.
5. **Concurrent Multi-Select Filtering**: Open **Dataset Explorer**, select multiple Countries and Categories concurrently, sort columns, switch page size (`25`/`50`/`100`), and click any row to inspect the score breakdown drawer.
6. **Test Cases & Custom Tests**: Open **Validation and Test Cases**, click **Run all test cases** to verify `TC01`–`TC14` pass, and add a custom test case to see it run alongside them.
7. **Fix Rejected Rows**: Open **Rejected Records**, filter by reason, click **Edit & Fix**, correct the invalid value, and re-validate to move it into the Valid Dataset.
8. **Dynamic Recalculation & Export**: Adjust weights/grade limits in **Rules and Settings**, verify scores update immediately, then download the 5-sheet `.xlsx` Full Report in **Export**.
