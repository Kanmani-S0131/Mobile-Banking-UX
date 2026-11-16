import type { PipelineRulesConfig } from '../types/ux';

/**
 * Mandatory and expected columns in raw CSV / Excel datasets.
 * Note: features_present and languages_supported are part of the 14-column schema
 * and may contain empty values on minimal valid records (e.g. TC12).
 */
export const REQUIRED_COLUMNS: readonly string[] = [
  'record_id',
  'bank_name',
  'country',
  'app_name',
  'screen_no',
  'screen_name',
  'screen_category',
  'features_present',
  'auth_method',
  'languages_supported',
  'accessibility_flag',
  'ux_rating',
  'collected_by',
  'collected_date',
];

/**
 * BR1: Mandatory fields that cannot be blank or missing after cleaning.
 */
export const MANDATORY_FIELDS: readonly string[] = [
  'record_id',
  'bank_name',
  'country',
  'app_name',
  'screen_no',
  'screen_name',
  'screen_category',
  'auth_method',
  'accessibility_flag',
  'ux_rating',
  'collected_by',
  'collected_date',
];

/**
 * BR2: Official list of 12 supported countries.
 */
export const APPROVED_COUNTRIES: readonly string[] = [
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'Japan',
  'South Korea',
  'Singapore',
  'India',
  'United Arab Emirates',
  'Australia',
  'South Africa',
  'Brazil',
];

/**
 * Country alias map used during Step 2 (Clean) to map common abbreviations and variants
 * to official country names (keys are lowercased and trimmed).
 */
export const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'United States',
  'u.s.a.': 'United States',
  'u.s.': 'United States',
  us: 'United States',
  'united states of america': 'United States',
  america: 'United States',
  ca: 'Canada',
  can: 'Canada',
  uk: 'United Kingdom',
  'u.k.': 'United Kingdom',
  'u.k': 'United Kingdom',
  britain: 'United Kingdom',
  'great britain': 'United Kingdom',
  england: 'United Kingdom',
  de: 'Germany',
  deutschland: 'Germany',
  jp: 'Japan',
  jpn: 'Japan',
  korea: 'South Korea',
  'republic of korea': 'South Korea',
  's. korea': 'South Korea',
  kr: 'South Korea',
  sg: 'Singapore',
  sgp: 'Singapore',
  in: 'India',
  ind: 'India',
  uae: 'United Arab Emirates',
  'u.a.e.': 'United Arab Emirates',
  'u.a.e': 'United Arab Emirates',
  emirates: 'United Arab Emirates',
  au: 'Australia',
  aus: 'Australia',
  za: 'South Africa',
  rsa: 'South Africa',
  br: 'Brazil',
  brasil: 'Brazil',
};

/**
 * Geographic region mapping for Step 5 (Region Summaries & Dashboard charts).
 */
export const COUNTRY_TO_REGION: Record<string, string> = {
  'United States': 'North America',
  Canada: 'North America',
  'United Kingdom': 'Europe',
  Germany: 'Europe',
  Japan: 'Asia-Pacific',
  'South Korea': 'Asia-Pacific',
  Singapore: 'Asia-Pacific',
  India: 'Asia-Pacific',
  Australia: 'Asia-Pacific',
  'United Arab Emirates': 'Middle East & Africa',
  'South Africa': 'Middle East & Africa',
  Brazil: 'Latin America',
};

/**
 * BR2: Official list of 13 mobile banking screen categories.
 */
export const APPROVED_CATEGORIES: readonly string[] = [
  'Onboarding',
  'Login',
  'Dashboard',
  'Accounts',
  'Transfers',
  'Payments',
  'Cards',
  'Statements',
  'Loans',
  'Investments',
  'Settings',
  'Notifications',
  'Support',
];

/**
 * BR2: Official list of 5 authentication methods.
 */
export const APPROVED_AUTH_METHODS: readonly string[] = [
  'PIN',
  'Password',
  'Biometric',
  'OTP',
  'Face ID',
];

/**
 * BR2: Official list of 10 mobile banking UX features.
 */
export const APPROVED_FEATURES: readonly string[] = [
  'Biometric Login',
  'QR Pay',
  'Bill Pay',
  'Card Controls',
  'Instant Transfer',
  'Spending Insights',
  'Chatbot Support',
  'Dark Mode',
  'Multi-Currency',
  'Savings Goals',
];

/**
 * Common language aliases & official spelling lookup.
 */
export const OFFICIAL_LANGUAGES: readonly string[] = [
  'English',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Korean',
  'Mandarin',
  'Malay',
  'Tamil',
  'Hindi',
  'Arabic',
  'Portuguese',
  'Afrikaans',
  'Zulu',
  'Cantonese',
];

export const LANGUAGE_ALIASES: Record<string, string> = {
  en: 'English',
  eng: 'English',
  es: 'Spanish',
  esp: 'Spanish',
  fr: 'French',
  fra: 'French',
  de: 'German',
  deu: 'German',
  ja: 'Japanese',
  jpn: 'Japanese',
  ko: 'Korean',
  kor: 'Korean',
  zh: 'Mandarin',
  chinese: 'Mandarin',
  mandarin: 'Mandarin',
  ms: 'Malay',
  ta: 'Tamil',
  hi: 'Hindi',
  ar: 'Arabic',
  pt: 'Portuguese',
  af: 'Afrikaans',
  zu: 'Zulu',
  yue: 'Cantonese',
};

/**
 * Default configurable scoring weights and grade thresholds.
 */
export const DEFAULT_RULES_CONFIG: PipelineRulesConfig = {
  weights: {
    ratingWeight: 60,
    featuresWeight: 20,
    accessibilityWeight: 10,
    languagesWeight: 10,
  },
  grades: {
    excellent: 85,
    good: 70,
    fair: 55,
  },
};

/**
 * Fictional bank catalog across the 12 supported countries (60 banks total, 5 per country)
 * for realistic synthetic dataset generation. All names are completely fictional.
 */
export interface FictionalBankSpec {
  bank_name: string;
  country: string;
  app_name: string;
  languages: string[];
}

export const FICTIONAL_BANKS_CATALOG: FictionalBankSpec[] = [
  // United States
  { bank_name: 'Liberty Crest Bank', country: 'United States', app_name: 'Liberty Mobile', languages: ['English', 'Spanish'] },
  { bank_name: 'Pacific Harbor Financial', country: 'United States', app_name: 'HarborPay', languages: ['English', 'Spanish'] },
  { bank_name: 'Summit Trust National', country: 'United States', app_name: 'SummitGo', languages: ['English', 'Spanish', 'Mandarin'] },
  { bank_name: 'Heartland Federal Bank', country: 'United States', app_name: 'Heartland Mobile', languages: ['English'] },
  { bank_name: 'Beacon Horizon Bank', country: 'United States', app_name: 'Beacon Banking', languages: ['English', 'Spanish', 'French'] },
  // Canada
  { bank_name: 'Maple Ridge Bank', country: 'Canada', app_name: 'MaplePay', languages: ['English', 'French'] },
  { bank_name: 'Northstar Dominion Bank', country: 'Canada', app_name: 'Northstar Mobile', languages: ['English', 'French', 'Mandarin'] },
  { bank_name: 'Laurentian Shield Trust', country: 'Canada', app_name: 'ShieldPocket', languages: ['English', 'French'] },
  { bank_name: 'Cascadia Mutual Bank', country: 'Canada', app_name: 'Cascadia App', languages: ['English', 'French', 'Spanish'] },
  { bank_name: 'Boreal Savings Group', country: 'Canada', app_name: 'Boreal Bank', languages: ['English', 'French'] },
  // United Kingdom
  { bank_name: 'Thames Sterling Bank', country: 'United Kingdom', app_name: 'SterlingOne', languages: ['English'] },
  { bank_name: 'Albion Crown Financial', country: 'United Kingdom', app_name: 'Albion Mobile', languages: ['English', 'French'] },
  { bank_name: 'Caledonia Mercantile', country: 'United Kingdom', app_name: 'Caledonia Pay', languages: ['English'] },
  { bank_name: 'Windsor Gate Bank', country: 'United Kingdom', app_name: 'Windsor Mobile', languages: ['English', 'Spanish', 'German'] },
  { bank_name: 'Meridian Square Bank', country: 'United Kingdom', app_name: 'Meridian UK', languages: ['English'] },
  // Germany
  { bank_name: 'Rheinland Handelsbank', country: 'Germany', app_name: 'RheinMobil', languages: ['German', 'English'] },
  { bank_name: 'Bavaria Direkt Bank', country: 'Germany', app_name: 'BavariaPay', languages: ['German', 'English', 'French'] },
  { bank_name: 'Nordsee Sparkasse', country: 'Germany', app_name: 'Nordsee App', languages: ['German', 'English'] },
  { bank_name: 'Alpenblick Kreditbank', country: 'Germany', app_name: 'AlpenMobile', languages: ['German', 'English'] },
  { bank_name: 'Elbe Union Bank', country: 'Germany', app_name: 'ElbePay', languages: ['German', 'English', 'Spanish'] },
  // Japan
  { bank_name: 'Sakura Shinkin Bank', country: 'Japan', app_name: 'SakuraWallet', languages: ['Japanese', 'English'] },
  { bank_name: 'Fuji Horizon Trust', country: 'Japan', app_name: 'FujiBank Mobile', languages: ['Japanese', 'English'] },
  { bank_name: 'Kyoto Daiwa Digital', country: 'Japan', app_name: 'KyotoPay', languages: ['Japanese', 'English', 'Mandarin'] },
  { bank_name: 'Setouchi Metro Bank', country: 'Japan', app_name: 'SetoMobile', languages: ['Japanese'] },
  { bank_name: 'Hokkaido Polar Bank', country: 'Japan', app_name: 'Polar Banking', languages: ['Japanese', 'English'] },
  // South Korea
  { bank_name: 'Hangang Digital Bank', country: 'South Korea', app_name: 'Hangang One', languages: ['Korean', 'English'] },
  { bank_name: 'Namsan Star Financial', country: 'South Korea', app_name: 'NamsanPay', languages: ['Korean', 'English', 'Japanese'] },
  { bank_name: 'Busan Harbor Bank', country: 'South Korea', app_name: 'BusanTap', languages: ['Korean', 'English'] },
  { bank_name: 'Taebaek Trust Bank', country: 'South Korea', app_name: 'Taebaek Mobile', languages: ['Korean', 'English', 'Mandarin'] },
  { bank_name: 'Goryeo Neo Bank', country: 'South Korea', app_name: 'Goryeo App', languages: ['Korean'] },
  // Singapore
  { bank_name: 'Merlion Straits Bank', country: 'Singapore', app_name: 'StraitsPay', languages: ['English', 'Mandarin', 'Malay', 'Tamil'] },
  { bank_name: 'Marina Bay Trust', country: 'Singapore', app_name: 'MarinaOne', languages: ['English', 'Mandarin', 'Malay'] },
  { bank_name: 'Sentosa Capital Bank', country: 'Singapore', app_name: 'Sentosa Mobile', languages: ['English', 'Mandarin'] },
  { bank_name: 'Orchard Crown Bank', country: 'Singapore', app_name: 'OrchardGo', languages: ['English', 'Mandarin', 'Malay', 'Tamil', 'Hindi'] },
  { bank_name: 'Equator Vault Bank', country: 'Singapore', app_name: 'VaultSG', languages: ['English', 'Mandarin'] },
  // India
  { bank_name: 'Deccan Bharati Bank', country: 'India', app_name: 'BharatiPay', languages: ['English', 'Hindi', 'Tamil'] },
  { bank_name: 'Indus Lotus Financial', country: 'India', app_name: 'LotusMobile', languages: ['English', 'Hindi'] },
  { bank_name: 'Malabar Coast Bank', country: 'India', app_name: 'MalabarUPI', languages: ['English', 'Hindi', 'Tamil'] },
  { bank_name: 'Vindhya National Bank', country: 'India', app_name: 'Vindhya Go', languages: ['English', 'Hindi'] },
  { bank_name: 'Ganga Crest Bank', country: 'India', app_name: 'CrestPay India', languages: ['English', 'Hindi', 'Tamil', 'Mandarin'] },
  // United Arab Emirates
  { bank_name: 'Desert Falcon Bank', country: 'United Arab Emirates', app_name: 'FalconPay', languages: ['Arabic', 'English'] },
  { bank_name: 'Gulf Pearl Islamic', country: 'United Arab Emirates', app_name: 'Pearl Mobile', languages: ['Arabic', 'English', 'Hindi'] },
  { bank_name: 'Oasis Crescent Bank', country: 'United Arab Emirates', app_name: 'OasisOne', languages: ['Arabic', 'English'] },
  { bank_name: 'Dunes Sovereign Bank', country: 'United Arab Emirates', app_name: 'DunesWallet', languages: ['Arabic', 'English', 'French'] },
  { bank_name: 'Al-Bahr Commercial', country: 'United Arab Emirates', app_name: 'AlBahr App', languages: ['Arabic', 'English', 'Hindi', 'Tamil'] },
  // Australia
  { bank_name: 'Southern Cross Bank', country: 'Australia', app_name: 'CrossPay', languages: ['English'] },
  { bank_name: 'Coral Reef Mutual', country: 'Australia', app_name: 'ReefBank', languages: ['English', 'Mandarin'] },
  { bank_name: 'Outback Heritage Bank', country: 'Australia', app_name: 'HeritageAU', languages: ['English'] },
  { bank_name: 'Tasman Bay Financial', country: 'Australia', app_name: 'Tasman Go', languages: ['English', 'Mandarin', 'Japanese'] },
  { bank_name: 'Yarra Valley Bank', country: 'Australia', app_name: 'Yarra Mobile', languages: ['English'] },
  // South Africa
  { bank_name: 'Table Mountain Bank', country: 'South Africa', app_name: 'MountainPay', languages: ['English', 'Afrikaans', 'Zulu'] },
  { bank_name: 'Savanna First Trust', country: 'South Africa', app_name: 'SavannaApp', languages: ['English', 'Zulu'] },
  { bank_name: 'Cape Agulhas Bank', country: 'South Africa', app_name: 'Agulhas Mobile', languages: ['English', 'Afrikaans'] },
  { bank_name: 'Limpopo Reserve Bank', country: 'South Africa', app_name: 'LimpopoPay', languages: ['English', 'Zulu', 'Afrikaans'] },
  { bank_name: 'Highveld Digital Bank', country: 'South Africa', app_name: 'Highveld Go', languages: ['English'] },
  // Brazil
  { bank_name: 'Atlantica Sul Bank', country: 'Brazil', app_name: 'AtlanticaPay', languages: ['Portuguese', 'English'] },
  { bank_name: 'Ipanema Verde Bank', country: 'Brazil', app_name: 'VerdeConta', languages: ['Portuguese', 'Spanish'] },
  { bank_name: 'Amazonas Digital', country: 'Brazil', app_name: 'AmazPay', languages: ['Portuguese', 'English', 'Spanish'] },
  { bank_name: 'Planalto Credito', country: 'Brazil', app_name: 'Planalto App', languages: ['Portuguese'] },
  { bank_name: 'Bandeira Pix Bank', country: 'Brazil', app_name: 'Bandeira Mobile', languages: ['Portuguese', 'English'] },
];

export const SCREEN_TEMPLATES: { screen_name: string; screen_category: string }[] = [
  { screen_name: 'Welcome & KYC Intro', screen_category: 'Onboarding' },
  { screen_name: 'ID Document Capture', screen_category: 'Onboarding' },
  { screen_name: 'Biometric Sign-In', screen_category: 'Login' },
  { screen_name: 'PIN & Passcode Entry', screen_category: 'Login' },
  { screen_name: 'Home Account Overview', screen_category: 'Dashboard' },
  { screen_name: 'Spending Snapshot Widget', screen_category: 'Dashboard' },
  { screen_name: 'Checking & Savings List', screen_category: 'Accounts' },
  { screen_name: 'Account Details & IBAN', screen_category: 'Accounts' },
  { screen_name: 'Domestic Instant Transfer', screen_category: 'Transfers' },
  { screen_name: 'International FX Wire', screen_category: 'Transfers' },
  { screen_name: 'QR Merchant Checkout', screen_category: 'Payments' },
  { screen_name: 'Utility Bill Pay', screen_category: 'Payments' },
  { screen_name: 'Virtual & Physical Cards', screen_category: 'Cards' },
  { screen_name: 'Card Freeze & Limits', screen_category: 'Cards' },
  { screen_name: 'Monthly PDF Statements', screen_category: 'Statements' },
  { screen_name: 'Personal Loan Estimator', screen_category: 'Loans' },
  { screen_name: 'Portfolio & ETF Watch', screen_category: 'Investments' },
  { screen_name: 'Security & Privacy Hub', screen_category: 'Settings' },
  { screen_name: 'Real-Time Alerts Inbox', screen_category: 'Notifications' },
  { screen_name: 'In-App Support Chat', screen_category: 'Support' },
];
