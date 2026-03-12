// CONC (Conclusion) downtime cost calculator

// ─── Mappings ────────────────────────────────────────────────────────────────

const NACE_TO_IBM: Record<string, string> = {
  A: 'Industrial',
  B: 'Industrial',
  C: 'Industrial',
  D: 'Energy',
  E: 'Energy',
  F: 'Industrial',
  G: 'Retail',
  H: 'Transportation',
  I: 'Hospitality',
  J: 'Technology',
  K: 'Financial',
  L: 'Services',
  M: 'Services',
  N: 'Services',
  O: 'Public',
  P: 'Education',
  Q: 'Healthcare',
  R: 'Entertainment',
  S: 'Services',
};

const SECTOR_FACTOR: Record<string, number> = {
  Healthcare:     1.1,
  Financial:      1.01842105263158,
  Industrial:     0.993859649122807,
  Energy:         0.98640350877193,
  Technology:     0.984649122807018,
  Pharmaceuticals:0.976754385964912,
  Services:       0.974561403508772,
  Entertainment:  0.968859649122807,
  Media:          0.959649122807018,
  Hospitality:    0.951315789473684,
  Transportation: 0.949122807017544,
  Education:      0.941228070175439,
  Research:       0.940789473684211,
  Communications: 0.939035087719298,
  Consumer:       0.937719298245614,
  Retail:         0.929824561403509,
  Public:         0.9,
};

// Revenue midpoints in EUR
const REVENUE_MIDPOINT: Record<string, number> = {
  UNDER_2M:      1_000_000,
  FROM_2M_10M:   6_000_000,
  FROM_10M_50M:  30_000_000,
  FROM_50M_250M: 150_000_000,
  FROM_250M_1B:  625_000_000,
  OVER_1B:       1_000_000_000,
};

const MANUAL_OP_VALUE: Record<string, number> = {
  YES: 0, PARTIAL: 1, NO: 2,
};

const PROD_DEP_VALUE: Record<string, number> = {
  NO_DEPENDENCY: 0, PARTIAL: 1, DIRECT: 2,
};

const CUST_ACCESS_VALUE: Record<string, number> = {
  NOT_REQUIRED: 0, PARTIAL: 1, ESSENTIAL: 2,
};

// The 8 safeguards used for Downtime GAP score
export const DOWNTIME_SAFEGUARD_IDS = [
  '11.2', // Daily Backups
  '11.4', // Offsite / Immutable Backups
  '11.5', // Restore Testing
  '17.2', // Incident Response Plan
  '17.1', // Defined Roles
  '17.5', // Incident Exercises
  '11.1', // Infrastructure Resilience
  '8.11', // Monitoring
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConcInputs = {
  naceSection: string | null;
  revenueRange: string | null;
  businessDaysPerYear: number | null;
  manualOperation: string | null;
  productionDependency: string | null;
  customerAccess: string | null;
  // safeguardId → currentCmmi (1–5)
  cmmiValues: Record<string, number>;
};

export type ConcResult =
  | { ok: true; mid: number; low: number; high: number }
  | { ok: false; missing: string[] };

// ─── Calculator ───────────────────────────────────────────────────────────────

export function calculateConcDowntimeCosts(inputs: ConcInputs): ConcResult {
  const missing: string[] = [];

  // Step 1 – IBM industry
  const ibmIndustry = inputs.naceSection ? NACE_TO_IBM[inputs.naceSection] ?? null : null;
  if (!ibmIndustry) missing.push('NACE sector (organization profile)');
  const sectorFactor = ibmIndustry ? (SECTOR_FACTOR[ibmIndustry] ?? null) : null;

  // Step 2 – Daily revenue
  const annualRevenue = inputs.revenueRange ? (REVENUE_MIDPOINT[inputs.revenueRange] ?? null) : null;
  if (annualRevenue === null) missing.push('Revenue range (organization profile)');
  const businessDays = inputs.businessDaysPerYear ?? null;
  if (businessDays === null) missing.push('Business days per year (organization profile)');
  const dailyRevenue =
    annualRevenue !== null && businessDays !== null ? annualRevenue / businessDays : null;

  // Step 3 – IT dependency level
  const mo = inputs.manualOperation !== null ? (MANUAL_OP_VALUE[inputs.manualOperation] ?? null) : null;
  if (mo === null) missing.push('Manual operation capability (organization profile)');
  const pd = inputs.productionDependency !== null ? (PROD_DEP_VALUE[inputs.productionDependency] ?? null) : null;
  if (pd === null) missing.push('Production dependency on IT (organization profile)');
  const ca = inputs.customerAccess !== null ? (CUST_ACCESS_VALUE[inputs.customerAccess] ?? null) : null;
  if (ca === null) missing.push('Customer access dependency (organization profile)');
  const itDependencyLevel = mo !== null && pd !== null && ca !== null ? mo + pd + ca : null;

  // Step 4 – IT factor
  let itFactor: number | null = null;
  if (itDependencyLevel !== null) {
    if (itDependencyLevel <= 1) itFactor = 0.30;
    else if (itDependencyLevel <= 3) itFactor = 0.60;
    else itFactor = 0.90;
  }

  // Step 6 – Adjusted daily loss (requires steps 2, 4, 5)
  const adjustedDailyLoss =
    dailyRevenue !== null && itFactor !== null && sectorFactor !== null
      ? dailyRevenue * itFactor * sectorFactor
      : null;

  // Step 7 – Downtime GAP score
  // Default missing safeguard scores to 1 (lowest CMMI level) rather than failing
  const cmmiScores = DOWNTIME_SAFEGUARD_IDS.map((id) => inputs.cmmiValues[id] ?? 1);

  const avg = cmmiScores.reduce((s, v) => s + v, 0) / cmmiScores.length;
  const gapScore = ((avg - 1) / 4) * 100;

  // Step 8 – Downtime days
  let downtimeDays: number;
  if (gapScore >= 80) downtimeDays = 0.5;
  else if (gapScore >= 65) downtimeDays = 1.0;
  else if (gapScore >= 45) downtimeDays = 2.0;
  else downtimeDays = 3.0;

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  const mid = adjustedDailyLoss! * downtimeDays;
  return {
    ok: true,
    mid,
    low: mid * 0.7,
    high: mid * 1.3,
  };
}
