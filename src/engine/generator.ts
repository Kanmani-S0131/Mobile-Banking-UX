import {
  APPROVED_AUTH_METHODS,
  APPROVED_CATEGORIES,
  APPROVED_COUNTRIES,
  APPROVED_FEATURES,
  FICTIONAL_BANKS_CATALOG,
  SCREEN_TEMPLATES,
  type FictionalBankSpec,
} from './constants';
import type { RawUxRow } from '../types/ux';

export interface GeneratorOptions {
  recordCount: number; // default 1200, min 1000
  bankCount: number; // default 60
  seed: number; // deterministic PRNG seed
  messyPercent: number; // 0-100, records with cleanable formatting issues
  invalidPercent: number; // 0-100, records that intentionally fail BR1-BR5
}

/**
 * Mulberry32 deterministic pseudo-random number generator.
 * Guarantees reproducible synthetic datasets for any given integer seed.
 */
function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickSubset<T>(arr: readonly T[], min: number, max: number, rng: () => number): T[] {
  const count = min + Math.floor(rng() * (max - min + 1));
  const pool = [...arr];
  const selected: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected;
}

const COLLECTORS = [
  'Maya Chen',
  'Lucas Meyer',
  'Priya Nair',
  'Tariq Al-Mansoor',
  'Sofia Silva',
  'Daniel Okafor',
  'Hana Sato',
  'Liam Gallagher',
  'Min-Jae Park',
  'Chloe Tremblay',
];

const MESSY_COUNTRY_ALIASES: Record<string, string[]> = {
  'United States': ['USA', 'usa', 'U.S.A.', 'united states'],
  'United Kingdom': ['U.K.', 'uk', 'Britain', 'united kingdom'],
  'United Arab Emirates': ['UAE', 'uae', 'U.A.E.'],
  'South Korea': ['Korea', 'korea', 'south korea'],
  Germany: ['germany', 'DE'],
  Japan: ['japan', 'JP'],
  India: ['india', 'IN'],
  Singapore: ['singapore', 'SG'],
  Canada: ['canada', 'CA'],
  Australia: ['australia', 'AU'],
  'South Africa': ['south africa', 'ZA'],
  Brazil: ['brazil', 'Brasil'],
};

/**
 * Builds the requested number of fictional banks across the 12 approved countries.
 * If bankCount > 60, synthesizes additional deterministic bank names.
 */
function buildBankPool(bankCount: number): FictionalBankSpec[] {
  const clampedCount = Math.max(1, Math.min(200, bankCount));
  if (clampedCount <= FICTIONAL_BANKS_CATALOG.length) {
    return FICTIONAL_BANKS_CATALOG.slice(0, clampedCount);
  }

  const pool = [...FICTIONAL_BANKS_CATALOG];
  let extraIdx = 1;
  while (pool.length < clampedCount) {
    const country = APPROVED_COUNTRIES[pool.length % APPROVED_COUNTRIES.length];
    pool.push({
      bank_name: `Global Meridian Bank ${extraIdx}`,
      country,
      app_name: `MeridianPay ${extraIdx}`,
      languages: ['English'],
    });
    extraIdx += 1;
  }
  return pool;
}

/**
 * Generates a realistic past ISO date within the last 365 days.
 */
function generatePastIsoDate(rng: () => number): string {
  const now = new Date();
  const daysBack = 1 + Math.floor(rng() * 360);
  const dt = new Date(now.getTime() - daysBack * 86400000);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Generates a realistic synthetic mobile banking UX dataset asynchronously in micro-batches
 * so the UI progress indicator updates smoothly for 1,000-5,000+ records.
 */
export async function generateSyntheticDataset(
  options: GeneratorOptions,
  onProgress?: (percent: number, stage: string) => void
): Promise<RawUxRow[]> {
  const totalRecords = Math.max(1000, Math.min(5000, Math.round(options.recordCount)));
  const rng = createSeededRng(options.seed || 2026);
  const banks = buildBankPool(options.bankCount);

  // Pre-build unique (bank, app, screen_no) slots: 16-20 screens per bank
  interface ScreenSlot {
    bank: FictionalBankSpec;
    screen_no: number;
    screen_name: string;
    screen_category: string;
  }

  const slots: ScreenSlot[] = [];
  for (const bank of banks) {
    const screensForBank = 16 + Math.floor(rng() * 5); // 16 to 20 screens
    for (let s = 1; s <= screensForBank; s++) {
      const tpl = SCREEN_TEMPLATES[(s - 1) % SCREEN_TEMPLATES.length];
      slots.push({
        bank,
        screen_no: s,
        screen_name: tpl.screen_name,
        screen_category: tpl.screen_category,
      });
    }
  }

  // If requested recordCount exceeds available 16-20 screens/bank, add higher screen numbers
  let cycle = 1;
  while (slots.length < totalRecords + 50) {
    for (const bank of banks) {
      const screenNo = 20 + cycle;
      const tpl = SCREEN_TEMPLATES[(screenNo - 1) % SCREEN_TEMPLATES.length];
      slots.push({
        bank,
        screen_no: screenNo,
        screen_name: `${tpl.screen_name} View ${cycle}`,
        screen_category: tpl.screen_category,
      });
      if (slots.length >= totalRecords + 50) break;
    }
    cycle += 1;
  }

  const rows: RawUxRow[] = [];
  const messyProb = Math.max(0, Math.min(100, options.messyPercent)) / 100;
  const invalidProb = Math.max(0, Math.min(100, options.invalidPercent)) / 100;

  const CHUNK_SIZE = 200;
  for (let i = 0; i < totalRecords; i++) {
    if (i % CHUNK_SIZE === 0) {
      const pct = Math.round((i / totalRecords) * 70);
      onProgress?.(pct, `Generating synthetic records (${i.toLocaleString()} / ${totalRecords.toLocaleString()})`);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const slot = slots[i];
    const roll = rng();
    const isInvalid = roll < invalidProb;
    const isMessy = !isInvalid && roll < invalidProb + messyProb;

    const features = pickSubset(APPROVED_FEATURES, 2, 6, rng);
    const auth = pick(APPROVED_AUTH_METHODS, rng);
    const accessible = rng() > 0.28 ? 'Yes' : 'No';
    const rating = 2 + Math.floor(rng() * 4); // 2-5 typical distribution
    const collector = pick(COLLECTORS, rng);
    const isoDate = generatePastIsoDate(rng);

    const row: RawUxRow = {
      record_id: `REC-${String(i + 1).padStart(5, '0')}`,
      bank_name: slot.bank.bank_name,
      country: slot.bank.country,
      app_name: slot.bank.app_name,
      screen_no: slot.screen_no,
      screen_name: slot.screen_name,
      screen_category: slot.screen_category,
      features_present: features.join('; '),
      auth_method: auth,
      languages_supported: slot.bank.languages.join('; '),
      accessibility_flag: accessible,
      ux_rating: rating,
      collected_by: collector,
      collected_date: isoDate,
    };

    if (isMessy) {
      // Inject realistic formatting messiness that Step 2 (Clean) should resolve cleanly
      const messyType = Math.floor(rng() * 5);
      if (messyType === 0) {
        row.bank_name = `  ${slot.bank.bank_name.toLowerCase()}  `;
        const aliases = MESSY_COUNTRY_ALIASES[slot.bank.country];
        if (aliases) row.country = pick(aliases, rng);
      } else if (messyType === 1) {
        row.accessibility_flag = accessible === 'Yes' ? pick(['y', 'Y', 'true', '1'], rng) : pick(['n', 'N', 'false', '0'], rng);
        row.screen_category = slot.screen_category.toLowerCase();
        row.auth_method = auth.toLowerCase();
      } else if (messyType === 2) {
        // Mixed date format DD/MM/YYYY or YYYY/MM/DD
        const [y, m, d] = isoDate.split('-');
        row.collected_date = rng() > 0.5 ? `${d}/${m}/${y}` : `${y}/${m}/${d}`;
      } else if (messyType === 3) {
        // Duplicate/lowercase features and languages
        const extraFeat = features[0] ?? 'QR Pay';
        row.features_present = `${features.map((f) => f.toLowerCase()).join('; ')}; ${extraFeat.toUpperCase()}`;
        row.languages_supported = `${slot.bank.languages.join('; ')}; ${slot.bank.languages[0].toLowerCase()}`;
      } else {
        row.ux_rating = `  ${rating} `;
        row.screen_no = ` ${slot.screen_no} `;
      }
    } else if (isInvalid) {
      // Inject deliberate rule violations across BR1-BR5
      const errType = Math.floor(rng() * 8);
      if (errType === 0) {
        row.bank_name = '   '; // BR1 blank bank
      } else if (errType === 1) {
        row.ux_rating = 7; // BR3 out-of-range rating
      } else if (errType === 2) {
        row.ux_rating = 'abc'; // BR3 non-numeric rating
      } else if (errType === 3) {
        row.screen_category = 'CryptoTrading'; // BR2 invalid category
      } else if (errType === 4) {
        row.collected_date = '2099-12-31'; // BR4 future date
      } else if (errType === 5) {
        row.features_present = `${features[0] ?? 'QR Pay'}; Quantum Hologram`; // BR2 unknown feature
      } else if (errType === 6) {
        row.screen_no = 0; // BR3 non-positive screen_no
      } else {
        // BR5 duplicate of previous valid slot if i > 0
        const prev = rows[Math.max(0, i - 1)];
        row.bank_name = prev.bank_name;
        row.app_name = prev.app_name;
        row.screen_no = prev.screen_no;
      }
    }

    rows.push(row);
  }

  onProgress?.(85, 'Running cleaning, validation, and scoring pipeline');
  return rows;
}
