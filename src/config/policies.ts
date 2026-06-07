import { CityPolicy, TaxBracket, MonthlyTaxBracket } from '../types';

export const TAX_THRESHOLD = 5000;

export const MONTHLY_TAX_BRACKETS: MonthlyTaxBracket[] = [
  { min: 0, max: 3000, rate: 0.03, deduction: 0 },
  { min: 3000, max: 12000, rate: 0.10, deduction: 210 },
  { min: 12000, max: 25000, rate: 0.20, deduction: 1410 },
  { min: 25000, max: 35000, rate: 0.25, deduction: 2660 },
  { min: 35000, max: 55000, rate: 0.30, deduction: 4410 },
  { min: 55000, max: 80000, rate: 0.35, deduction: 7160 },
  { min: 80000, max: Infinity, rate: 0.45, deduction: 15160 },
];

export const ANNUAL_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 36000, rate: 0.03, deduction: 0 },
  { min: 36000, max: 144000, rate: 0.10, deduction: 2520 },
  { min: 144000, max: 300000, rate: 0.20, deduction: 16920 },
  { min: 300000, max: 420000, rate: 0.25, deduction: 31920 },
  { min: 420000, max: 660000, rate: 0.30, deduction: 52920 },
  { min: 660000, max: 960000, rate: 0.35, deduction: 85920 },
  { min: 960000, max: Infinity, rate: 0.45, deduction: 181920 },
];

export const YEAR_END_BONUS_TAX_BRACKETS: MonthlyTaxBracket[] = [
  { min: 0, max: 3000, rate: 0.03, deduction: 0 },
  { min: 3000, max: 12000, rate: 0.10, deduction: 210 },
  { min: 12000, max: 25000, rate: 0.20, deduction: 1410 },
  { min: 25000, max: 35000, rate: 0.25, deduction: 2660 },
  { min: 35000, max: 55000, rate: 0.30, deduction: 4410 },
  { min: 55000, max: 80000, rate: 0.35, deduction: 7160 },
  { min: 80000, max: Infinity, rate: 0.45, deduction: 15160 },
];

export const CITY_POLICIES: Record<string, CityPolicy> = {
  beijing: {
    city: 'beijing',
    socialSecurity: {
      pension: { employee: 0.08, employer: 0.16 },
      medical: { employee: 0.02, employer: 0.10 },
      unemployment: { employee: 0.002, employer: 0.008 },
      workInjury: { employee: 0, employer: 0.004 },
      maternity: { employee: 0, employer: 0.008 },
      baseMin: 5360,
      baseMax: 33891,
    },
    housingFund: {
      minRatio: 0.05,
      maxRatio: 0.12,
      baseMin: 2420,
      baseMax: 33891,
    },
  },
  shanghai: {
    city: 'shanghai',
    socialSecurity: {
      pension: { employee: 0.08, employer: 0.16 },
      medical: { employee: 0.02, employer: 0.10 },
      unemployment: { employee: 0.005, employer: 0.005 },
      workInjury: { employee: 0, employer: 0.0026 },
      maternity: { employee: 0, employer: 0.01 },
      baseMin: 7310,
      baseMax: 36549,
    },
    housingFund: {
      minRatio: 0.05,
      maxRatio: 0.12,
      baseMin: 2690,
      baseMax: 36549,
    },
  },
  guangzhou: {
    city: 'guangzhou',
    socialSecurity: {
      pension: { employee: 0.08, employer: 0.14 },
      medical: { employee: 0.02, employer: 0.065 },
      unemployment: { employee: 0.002, employer: 0.008 },
      workInjury: { employee: 0, employer: 0.002 },
      maternity: { employee: 0, employer: 0.0085 },
      baseMin: 4588,
      baseMax: 27960,
    },
    housingFund: {
      minRatio: 0.05,
      maxRatio: 0.12,
      baseMin: 2300,
      baseMax: 27960,
    },
  },
  shenzhen: {
    city: 'shenzhen',
    socialSecurity: {
      pension: { employee: 0.08, employer: 0.14 },
      medical: { employee: 0.02, employer: 0.06 },
      unemployment: { employee: 0.003, employer: 0.007 },
      workInjury: { employee: 0, employer: 0.002 },
      maternity: { employee: 0, employer: 0.0045 },
      baseMin: 2360,
      baseMax: 27927,
    },
    housingFund: {
      minRatio: 0.05,
      maxRatio: 0.12,
      baseMin: 2360,
      baseMax: 27927,
    },
  },
  hangzhou: {
    city: 'hangzhou',
    socialSecurity: {
      pension: { employee: 0.08, employer: 0.14 },
      medical: { employee: 0.02, employer: 0.095 },
      unemployment: { employee: 0.005, employer: 0.005 },
      workInjury: { employee: 0, employer: 0.002 },
      maternity: { employee: 0, employer: 0.01 },
      baseMin: 3957,
      baseMax: 19783,
    },
    housingFund: {
      minRatio: 0.05,
      maxRatio: 0.12,
      baseMin: 2280,
      baseMax: 19783,
    },
  },
  chengdu: {
    city: 'chengdu',
    socialSecurity: {
      pension: { employee: 0.08, employer: 0.16 },
      medical: { employee: 0.02, employer: 0.075 },
      unemployment: { employee: 0.004, employer: 0.006 },
      workInjury: { employee: 0, employer: 0.002 },
      maternity: { employee: 0, employer: 0.008 },
      baseMin: 4071,
      baseMax: 20355,
    },
    housingFund: {
      minRatio: 0.05,
      maxRatio: 0.12,
      baseMin: 2100,
      baseMax: 20355,
    },
  },
};

export const DEFAULT_CITY = 'beijing';

export const SPECIAL_DEDUCTION_LIMITS = {
  childEducation: 2000,
  continuingEducation: 400,
  housingLoanInterest: 1000,
  housingRent: {
    tier1: 1500,
    tier2: 1100,
    tier3: 800,
  },
  elderlySupport: 3000,
  infantCare: 2000,
};

export const APPROVAL_THRESHOLDS = {
  LEVEL_1: 100000,
  LEVEL_2: 500000,
};

export const WARNING_THRESHOLD = 0.20;

export const WORKING_DAYS_PER_MONTH = 21.75;
export const WORKING_HOURS_PER_DAY = 8;

export const OVERTIME_RATES = {
  weekday: 1.5,
  weekend: 2.0,
  holiday: 3.0,
};

export const PERFORMANCE_BONUS_RATES: Record<string, number> = {
  S: 2.0,
  A: 1.5,
  B: 1.0,
  C: 0.5,
  D: 0,
};
