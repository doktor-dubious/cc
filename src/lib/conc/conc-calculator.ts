// CONC (Conclusion) downtime cost calculator

// ─── Mappings ────────────────────────────────────────────────────────────────

export const NACE_TO_IBM: Record<string, string> = {
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

const MANUAL_OP_VALUE: Record<string, number> = {
  YES: 0, PARTIAL: 1, NO: 2,
};

const PROD_DEP_VALUE: Record<string, number> = {
  NO_DEPENDENCY: 0, PARTIAL: 1, DIRECT: 2,
};

const CUST_ACCESS_VALUE: Record<string, number> = {
  NOT_REQUIRED: 0, PARTIAL: 1, ESSENTIAL: 2,
};

// Organisation size complexity multiplier (applied to adjusted daily loss)
// Larger organisations have more systems to coordinate, more people idled,
// and greater operational overhead during an incident.
const ORG_SIZE_MULT: Record<string, number> = {
  MICRO:      0.90,  // 0–9 employees: fewer systems, less coordination overhead
  SMALL:      0.95,  // 10–49 employees
  MEDIUM:     1.00,  // 50–249 employees (baseline)
  LARGE:      1.10,  // 250–999 employees: more complexity, more people affected
  ENTERPRISE: 1.15,  // 1000+ employees: complex, dedicated teams offset by scope
};

// The 8 safeguards used for Downtime GAP score
export const DOWNTIME_SAFEGUARD_IDS = [
  '11.2', // Daily Backups          (DT_Q1) → also Restore score
  '11.4', // Offsite/Immutable      (DT_Q2) → also Restore score
  '11.5', // Restore Testing        (DT_Q3) → also Restore score
  '17.2', // Incident Response Plan (DT_Q4) → also IR score
  '17.1', // Defined Roles          (DT_Q5) → also IR score
  '17.5', // Incident Exercises     (DT_Q6) → also IR score
  '11.1', // Infrastructure Resilience (DT_Q7)
  '8.11', // Monitoring             (DT_Q8)
] as const;

// Safeguard sub-groups for secondary cost models
// 8.11 (Monitoring/Detection) included in IR because detection capability
// directly affects incident response cost and duration (IBM 2024: orgs with
// security AI/automation saved $2.22M per breach, largely via faster detection).
const IR_SAFEGUARD_IDS      = ['17.2', '17.1', '17.5', '8.11'] as const;
const RESTORE_SAFEGUARD_IDS = ['11.2', '11.4', '11.5'] as const;

// ─── Lookups ─────────────────────────────────────────────────────────────────

// Piecewise linear interpolation between revenue anchor points.
// Eliminates cliff-edge discontinuities at tier boundaries (e.g., at €50M the
// IR base previously jumped from €500K to €1.2M — a 2.4× increase for a
// negligible revenue change). Anchors are [revenue, value] pairs sorted by
// revenue. Below the first anchor, clamps to the first value; above the last,
// clamps to the last value.
type Anchor = [revenue: number, value: number];

function interpolateByRevenue(revenue: number, anchors: Anchor[]): number {
  if (revenue <= anchors[0][0]) return anchors[0][1];
  for (let i = 1; i < anchors.length; i++) {
    if (revenue <= anchors[i][0]) {
      const [r0, v0] = anchors[i - 1];
      const [r1, v1] = anchors[i];
      const t = (revenue - r0) / (r1 - r0);
      return v0 + (v1 - v0) * t;
    }
  }
  return anchors[anchors.length - 1][1];
}

// Anchor points: [revenue, base cost]
// Values match the former tier midpoint costs; interpolation now provides
// a smooth transition instead of discrete jumps.
const IR_ANCHORS: Anchor[] = [
  [0,           500_000],
  [50_000_000,  1_200_000],
  [250_000_000, 3_000_000],
];

const RESTORE_ANCHORS: Anchor[] = [
  [0,           400_000],
  [50_000_000,  1_000_000],
  [250_000_000, 2_500_000],
];

const REG_ANCHORS: Anchor[] = [
  [0,           250_000],
  [50_000_000,  700_000],
  [250_000_000, 1_800_000],
];

const GOV_ANCHORS: Anchor[] = [
  [0,           150_000],
  [50_000_000,  400_000],
  [250_000_000, 900_000],
];

const IT_DEP_MULT_IR: Record<string, number>      = { Low: 0.85, Medium: 1.0, High: 1.15 };
const IT_DEP_MULT_RESTORE: Record<string, number>  = { Low: 0.85, Medium: 1.0, High: 1.15 };
const IT_DEP_MULT_EBI: Record<string, number>      = { Low: 0.9,  Medium: 1.0, High: 1.1  };

// Infrastructure type restore multiplier.
// Cloud-native organisations restore faster (immutable infra, IaC, auto-scaling).
// On-prem and OT require physical intervention, hardware procurement, longer rebuild.
// When multiple types are present, the highest (most expensive) multiplier wins —
// restore cost is driven by the slowest-to-recover infrastructure layer.
const INFRA_RESTORE_MULT: Record<string, number> = {
  CLOUD_ONLY:             0.75,  // IaC, immutable infra, fast re-provisioning
  MULTI_CLOUD:            0.85,  // Fast restore but cross-cloud coordination overhead
  HYBRID:                 1.00,  // Baseline — mixed complexity
  ON_PREMISES:            1.20,  // Physical hardware, manual rebuild, procurement delays
  OPERATIONAL_TECHNOLOGY: 1.35,  // OT/ICS/SCADA: specialised equipment, safety validation, vendor dependencies
};

const CCL_BASE_PCT: Record<string, Record<string, number>> = {
  B2B: { LOW: 0.002, MEDIUM: 0.004, HIGH: 0.008 },
  B2C: { LOW: 0.003, MEDIUM: 0.006, HIGH: 0.012 },
};

const REPUTATION_BASE_PCT: Record<string, number> = {
  B2B: 0.0015,
  B2C: 0.004,
};

// Data sensitivity multiplier for reputational impact.
// The type of data compromised dramatically affects public/media reaction.
// When multiple types are present, the highest multiplier wins — reputation
// damage is driven by the most sensitive data exposed.
const DATA_SENSITIVITY_REP_MULT: Record<string, number> = {
  BASIC_BUSINESS:          0.80,  // Internal financial records, employee info — low public interest
  INTELLECTUAL_PROPERTY:   0.90,  // Trade secrets — industry concern but limited public outrage
  CRITICAL_INFRASTRUCTURE: 1.00,  // OT/SCADA data — serious but narrow audience
  CUSTOMER_PII:            1.00,  // Personal data (baseline) — standard GDPR breach
  PAYMENT_CARD:            1.30,  // Financial credentials — high media coverage, direct consumer harm
  SPECIAL_CATEGORY:        1.50,  // Health, biometric, children's data — maximum public outrage
  CLASSIFIED_GOVERNMENT:   1.50,  // Government/classified — national media, political fallout
};

// Multi-framework regulatory multiplier.
// Each supervisory framework beyond the first adds compounding cost (separate
// notifications, audits, documentation) but with diminishing returns since
// compliance processes partially overlap.
// Frameworks that don't create supervisory obligations are excluded.
const REG_FRAMEWORK_EXCLUDED = new Set(['NONE_NOT_SURE', 'CYBER_INSURANCE']);

// Previous breach history multiplier for regulatory and reputational costs.
// GDPR Art 83(2)(e) explicitly lists "relevant previous infringements" as a
// factor in administrative fine severity. NIS2 similarly considers recidivism.
// Reputational damage is disproportionately worse for a second breach.
const PREV_BREACH_REG_MULT: Record<string, number> = {
  NONE:     1.00,  // No history — baseline
  ONE:      1.25,  // Regulators apply heightened scrutiny
  MULTIPLE: 1.50,  // Recidivist — significantly higher regulatory burden
};

const PREV_BREACH_REP_MULT: Record<string, number> = {
  NONE:     1.00,  // No history — baseline
  ONE:      1.20,  // "Again?" — media narrative is harsher
  MULTIPLE: 1.40,  // Repeated breaches = severe trust erosion
};

// Geographic scope multiplier for regulatory cost.
// More jurisdictions = more supervisory authorities to notify and coordinate with.
const GEO_SCOPE_REG_MULT: Record<string, number> = {
  LOCAL:    1.00,  // Single jurisdiction
  REGIONAL: 1.00,  // Still typically one supervisory authority
  NATIONAL: 1.00,  // One national authority (baseline)
  EUROPEAN: 1.20,  // Multiple EU member state authorities, cross-border notifications
  GLOBAL:   1.35,  // EU + non-EU regulators (e.g., UK ICO, US state AGs)
};

// Notification cost base anchors (interpolated by revenue).
// Covers: contact database management, communications (letters, email, call centres),
// credit/identity monitoring services, legal review of notification content.
// Calibrated so a ~€75M company gets ~€350K, consistent with IBM's $430K average
// (adjusted down slightly for EUR and European mid-market focus).
const NOTIFICATION_ANCHORS: Anchor[] = [
  [0,           100_000],   // Small org — limited affected population
  [50_000_000,  300_000],   // Mid-market
  [250_000_000, 800_000],   // Large org — extensive notification scope
];

// Data sensitivity multiplier for notification costs.
// Higher-sensitivity data triggers broader notification obligations (GDPR Art 34
// requires individual notification for high-risk breaches) and more expensive
// remediation services (credit monitoring, identity protection).
const DATA_SENSITIVITY_NOTIFY_MULT: Record<string, number> = {
  BASIC_BUSINESS:          0.60,  // Internal data — may not trigger individual notification
  INTELLECTUAL_PROPERTY:   0.50,  // Trade secrets — no individual notification required
  CRITICAL_INFRASTRUCTURE: 0.70,  // OT data — authority notification but limited individual scope
  CUSTOMER_PII:            1.00,  // Personal data (baseline) — standard GDPR Art 33/34
  PAYMENT_CARD:            1.40,  // PCI notification + credit monitoring services for cardholders
  SPECIAL_CATEGORY:        1.60,  // Health/biometric — mandatory individual notification + identity protection
  CLASSIFIED_GOVERNMENT:   1.30,  // Government notification procedures, security clearance reviews
};

const FINE_CONFIG: Record<string, { pct: number; fixed: number }> = {
  IMPORTANT: { pct: 0.014, fixed: 52_500_000 },   // NIS2 Art. 34: 1.4% or €7M (×7.5 DKK/EUR)
  ESSENTIAL:  { pct: 0.02,  fixed: 75_000_000 },   // NIS2 Art. 34: 2% or €10M (×7.5 DKK/EUR)
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConcInputs = {
  naceSection: string | null;
  revenueRange: number | null;
  businessDaysPerYear: number | null;
  manualOperation: string | null;
  productionDependency: string | null;
  customerAccess: string | null;
  orgSize: string | null;               // MICRO, SMALL, MEDIUM, LARGE, ENTERPRISE
  infrastructureTypes: string[];        // CLOUD_ONLY, MULTI_CLOUD, HYBRID, ON_PREMISES, OPERATIONAL_TECHNOLOGY
  dataSensitivity: string[];             // BASIC_BUSINESS, CUSTOMER_PII, SPECIAL_CATEGORY, PAYMENT_CARD, ...
  regulatoryObligations: string[];      // GDPR, NIS2, DORA, EU_AI_ACT, PCI_DSS, INDUSTRY_SPECIFIC, ...
  geographicScope: string | null;       // LOCAL, REGIONAL, NATIONAL, EUROPEAN, GLOBAL
  businessOrientation: string | null;   // B2B, B2C, B2G, MIXED → mapped to B2B/B2C
  revenueConcentration: string | null;  // LOW, MEDIUM, HIGH
  entityType: string | null;            // IMPORTANT, ESSENTIAL
  previousBreachHistory: string | null; // NONE, ONE, MULTIPLE
  // safeguardId → currentCmmi (1–5)
  cmmiValues: Record<string, number>;
  // Optional: override the derived downtime days (bypasses CMMI → GAP → days derivation)
  overrideDowntimeDays?: number;
};

export type ConcSteps = {
  ibmIndustry: string;
  sectorFactor: number;
  dailyRevenue: number;
  itDependencyLevel: number;
  itFactor: number;
  orgSize: string;
  orgSizeMult: number;
  adjustedDailyLoss: number;
  cmmiScores: number[];
  cmmiSum: number;
  gapScore: number;
  downtimeDays: number;
};

export type IrSteps = {
  irBase: number;
  irScore: number;
  irMaturityMult: number;
  irDepMult: number;
};

export type RestoreSteps = {
  restoreBase: number;
  restoreScore: number;
  restoreMaturityMult: number;
  restoreDepMult: number;
  infraMult: number;
};

export type EbiSteps = {
  ebiRecoveryFriction: number;
  ebiSectorAdj: number;
  ebiDepMult: number;
  ebiRestoreAdj: number;
};

export type CclSteps = {
  customerModel: string;
  revenueConcentration: string;
  basePct: number;
  cclSectorAdj: number;
  cclSeverityAdj: number;
  cclIrAdj: number;
};

export type RegSteps = {
  regBase: number;
  regSectorAdj: number;
  regSeverityAdj: number;
  regIrAdj: number;
  regFrameworkMult: number;
  regFrameworkCount: number;
  regGeoMult: number;
  regPrevBreachMult: number;
};

export type ReputationSteps = {
  customerModel: string;
  basePct: number;
  severityAdj: number;
  sectorAdj: number;
  irAdj: number;
  visibilityMult: number;
  dataSensitivityMult: number;
  prevBreachMult: number;
};

export type GovSteps = {
  govBase: number;
  severityAdj: number;
  sectorAdj: number;
};

export type NotificationSteps = {
  notifyBase: number;
  dataSensitivityMult: number;
  orgSizeMult: number;
  geoMult: number;
  frameworkMult: number;
};

export type FineSteps = {
  entityType: string;
  pctCap: number;
  fixedCap: number;
  pctAmount: number;
};

export type CostBand = { mid: number; low: number; high: number };

export type ConcAllCosts = {
  downtime: CostBand;
  ir: CostBand;
  restore: CostBand;
  ebi: CostBand;
  ccl: CostBand;
  reg: CostBand;
  reputation: CostBand;
  governance: CostBand;
  notification: CostBand;
  adminFineCeiling: number; // not included in total — legal ceiling only
};

export type ConcResult =
  | {
      ok: true;
      costs: ConcAllCosts;
      steps: ConcSteps;
      irSteps: IrSteps;
      restoreSteps: RestoreSteps;
      ebiSteps: EbiSteps;
      cclSteps: CclSteps;
      regSteps: RegSteps;
      reputationSteps: ReputationSteps;
      govSteps: GovSteps;
      notificationSteps: NotificationSteps;
      fineSteps: FineSteps;
    }
  | { ok: false; missing: string[] };

// ─── Calculator ───────────────────────────────────────────────────────────────

export function calculateConcDowntimeCosts(inputs: ConcInputs): ConcResult {
  const missing: string[] = [];

  // Step 1 – IBM industry
  const ibmIndustry = inputs.naceSection ? NACE_TO_IBM[inputs.naceSection] ?? null : null;
  if (!ibmIndustry) missing.push('NACE sector (organization profile)');
  const sectorFactor = ibmIndustry ? (SECTOR_FACTOR[ibmIndustry] ?? null) : null;

  // Step 2 – Daily revenue
  const annualRevenue = inputs.revenueRange ?? null;
  if (annualRevenue === null) missing.push('Revenue (organization profile)');
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

  // Step 4 – IT factor & level label
  let itFactor: number | null = null;
  let itDepLabel: 'Low' | 'Medium' | 'High' = 'Medium';
  if (itDependencyLevel !== null) {
    if (itDependencyLevel <= 1) { itFactor = 0.30; itDepLabel = 'Low'; }
    else if (itDependencyLevel <= 3) { itFactor = 0.60; itDepLabel = 'Medium'; }
    else { itFactor = 0.90; itDepLabel = 'High'; }
  }

  // Step 5 – Organisation size multiplier
  const rawOrgSize = (inputs.orgSize ?? 'MEDIUM').toUpperCase();
  const orgSizeMult = ORG_SIZE_MULT[rawOrgSize] ?? 1.0;

  // Step 6 – Adjusted daily loss (revenue × IT factor × sector factor × org size)
  const adjustedDailyLoss =
    dailyRevenue !== null && itFactor !== null && sectorFactor !== null
      ? dailyRevenue * itFactor * sectorFactor * orgSizeMult
      : null;

  // Step 7 – Downtime GAP score (all 8 safeguards, default CMMI=1)
  const cmmiScores = DOWNTIME_SAFEGUARD_IDS.map((id) => inputs.cmmiValues[id] ?? 1);
  const avg = cmmiScores.reduce((s, v) => s + v, 0) / cmmiScores.length;
  const gapScore = ((avg - 1) / 4) * 100;

  // Step 8 – Downtime days (1.0–5.0 range)
  // At GAP=0 (CMMI 1 across all safeguards): 5.0 days — realistic for ransomware at an unprepared SME
  // At GAP=100 (CMMI 5 across all safeguards): 1.0 day — minimum for a significant incident
  // With ±30% band: effective range is 0.7–6.5 days
  const downtimeDays = inputs.overrideDowntimeDays ?? Math.max(1.0, 5.0 - (gapScore / 100) * 4.0);

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  const sf = sectorFactor!;
  const dr = dailyRevenue!;
  const ar = annualRevenue!;

  // ── Operational Downtime ─────────────────────────────────────────────────
  const dtMid = adjustedDailyLoss! * downtimeDays;

  // ── IR Score & multipliers ────────────────────────────────────────────────
  const irScores = IR_SAFEGUARD_IDS.map((id) => inputs.cmmiValues[id] ?? 1);
  const irScore = irScores.reduce((s, v) => s + v, 0) / irScores.length;
  const irMaturityMult = 1.3 - ((irScore - 1) / 4) * 0.5;
  const irDepMult = IT_DEP_MULT_IR[itDepLabel];
  const irBase = interpolateByRevenue(ar, IR_ANCHORS);
  const irMid = irBase * irMaturityMult * irDepMult;

  // ── Restore Score & multipliers ───────────────────────────────────────────
  const restoreScores = RESTORE_SAFEGUARD_IDS.map((id) => inputs.cmmiValues[id] ?? 1);
  const restoreScore = restoreScores.reduce((s, v) => s + v, 0) / restoreScores.length;
  // Steeper slope than IR: backup maturity has a stronger cost-reduction effect
  // on restoration than IR maturity has on forensics.
  // Range: 1.4× at CMMI 1 → 0.7× at CMMI 5 (vs IR's 1.3× → 0.8×)
  const restoreMaturityMult = 1.4 - ((restoreScore - 1) / 4) * 0.7;
  const restoreDepMult = IT_DEP_MULT_RESTORE[itDepLabel];
  const restoreBase = interpolateByRevenue(ar, RESTORE_ANCHORS);

  // Infrastructure type multiplier: highest-cost type wins (restore is bottlenecked
  // by the slowest-to-recover layer)
  const infraMult = inputs.infrastructureTypes.length > 0
    ? Math.max(...inputs.infrastructureTypes.map((t) => INFRA_RESTORE_MULT[t] ?? 1.0))
    : 1.0; // default to HYBRID baseline if no types specified

  const restoreMid = restoreBase * restoreMaturityMult * restoreDepMult * infraMult;

  // ── EBI ───────────────────────────────────────────────────────────────────
  // Non-linear recovery friction: 0.15 × downtimeDays²
  // Short outages (<1 day): near-zero EBI — staff absorb the backlog
  // Medium outages (~3 days): ~1.35 friction days (similar to old linear model)
  // Long outages (5+ days): ~3.75 friction days — cascading backlogs, lost context
  const ebiRecoveryFriction = 0.15 * downtimeDays * downtimeDays;
  const ebiSectorAdj = 1 + (sf - 1) * 0.5;
  const ebiDepMult = IT_DEP_MULT_EBI[itDepLabel];
  const ebiRestoreAdj = 1 + (restoreMaturityMult - 1) * 0.5;
  const ebiMid = dr * ebiRecoveryFriction * ebiSectorAdj * ebiDepMult * ebiRestoreAdj;

  // ── CCL ───────────────────────────────────────────────────────────────────
  // Map businessOrientation → B2B/B2C (B2G and MIXED treated as B2B)
  const rawOrientation = inputs.businessOrientation?.toUpperCase() ?? 'B2B';
  const customerModel = rawOrientation === 'B2C' ? 'B2C' : 'B2B';
  const rawConcentration = (inputs.revenueConcentration ?? 'MEDIUM').toUpperCase();
  const cclBasePct = CCL_BASE_PCT[customerModel]?.[rawConcentration] ?? CCL_BASE_PCT.B2B.MEDIUM;
  const cclSectorAdj = 1 + (sf - 1) * 0.5;
  const cclSeverityAdj = Math.max(0.8, Math.min(1.2, 0.8 + (downtimeDays - 0.5) * (0.4 / 2.5)));
  const cclIrAdj = 1 + (irMaturityMult - 1) * 0.4;
  const cclMid = ar * cclBasePct * cclSectorAdj * cclSeverityAdj * cclIrAdj;

  // ── Regulatory ────────────────────────────────────────────────────────────
  const regBase = interpolateByRevenue(ar, REG_ANCHORS);
  const regSectorAdj = 1 + (sf - 1) * 0.6;
  const regSeverityAdj = 1 + ((downtimeDays - 0.5) / 2.5) * 0.5;
  const regIrAdj = 1 + (irMaturityMult - 1) * 0.5;

  // Multi-framework multiplier: each additional framework adds 0.25× (diminishing
  // overlap — separate notification, audit, and documentation obligations)
  const regFrameworkCount = inputs.regulatoryObligations
    .filter((f) => !REG_FRAMEWORK_EXCLUDED.has(f)).length;
  const regFrameworkMult = regFrameworkCount <= 1
    ? 1.0
    : 1.0 + (regFrameworkCount - 1) * 0.25;

  // Geographic scope multiplier
  const regGeoMult = GEO_SCOPE_REG_MULT[(inputs.geographicScope ?? 'NATIONAL').toUpperCase()] ?? 1.0;

  // Previous breach history multiplier for regulatory costs
  const regPrevBreachMult = PREV_BREACH_REG_MULT[(inputs.previousBreachHistory ?? 'NONE').toUpperCase()] ?? 1.0;

  const regMid = regBase * regSectorAdj * regSeverityAdj * regIrAdj * regFrameworkMult * regGeoMult * regPrevBreachMult;

  // ── Reputational Impact ───────────────────────────────────────────────────
  const reputationBasePct = REPUTATION_BASE_PCT[customerModel];
  const repSeverityAdj = 1 + ((downtimeDays - 0.5) / 2.5) * 0.5;
  const repSectorAdj = 1 + (sf - 1) * 0.5;
  const repIrAdj = 1 + (irMaturityMult - 1) * 0.5;
  const repVisibilityMult = customerModel === 'B2C' ? 1.5 : 1;

  // Data sensitivity: highest-sensitivity type wins (reputation damage is
  // driven by the most sensitive data exposed in the breach)
  const dataSensitivityMult = inputs.dataSensitivity.length > 0
    ? Math.max(...inputs.dataSensitivity.map((t) => DATA_SENSITIVITY_REP_MULT[t] ?? 1.0))
    : 1.0;

  // Previous breach history multiplier for reputational impact
  const repPrevBreachMult = PREV_BREACH_REP_MULT[(inputs.previousBreachHistory ?? 'NONE').toUpperCase()] ?? 1.0;

  const repMid = ar * reputationBasePct * repSeverityAdj * repSectorAdj * repIrAdj * repVisibilityMult * dataSensitivityMult * repPrevBreachMult;

  // ── Management & Governance ───────────────────────────────────────────────
  const govBase = interpolateByRevenue(ar, GOV_ANCHORS);
  const govSeverityAdj = 1 + ((downtimeDays - 0.5) / 2.5) * 0.4;
  const govSectorAdj = 1 + (sf - 1) * 0.5;
  const govMid = govBase * govSeverityAdj * govSectorAdj;

  // ── Notification Costs ───────────────────────────────────────────────────
  // GDPR Art 33/34 + NIS2 Art 23: authority + individual notification,
  // contact database management, credit/identity monitoring, legal review.
  const notifyBase = interpolateByRevenue(ar, NOTIFICATION_ANCHORS);
  const notifyDataSensMult = inputs.dataSensitivity.length > 0
    ? Math.max(...inputs.dataSensitivity.map((t) => DATA_SENSITIVITY_NOTIFY_MULT[t] ?? 1.0))
    : 1.0;
  const notifyMid = notifyBase * notifyDataSensMult * orgSizeMult * regGeoMult * regFrameworkMult;

  // ── Administrative Fine Ceiling ───────────────────────────────────────────
  const rawEntityType = (inputs.entityType ?? 'IMPORTANT').toUpperCase();
  const fineConfig = FINE_CONFIG[rawEntityType] ?? FINE_CONFIG.IMPORTANT;
  const pctAmount = ar * fineConfig.pct;
  const adminFineCeiling = Math.max(fineConfig.fixed, pctAmount);

  return {
    ok: true,
    costs: {
      downtime:  { mid: dtMid,       low: dtMid * 0.7,       high: dtMid * 1.3 },
      ir:        { mid: irMid,       low: irMid * 0.7,       high: irMid * 1.3 },
      restore:   { mid: restoreMid,  low: restoreMid * 0.7,  high: restoreMid * 1.3 },
      ebi:       { mid: ebiMid,      low: ebiMid * 0.7,      high: ebiMid * 1.3 },
      ccl:       { mid: cclMid,      low: cclMid * 0.7,      high: cclMid * 1.3 },
      reg:       { mid: regMid,      low: regMid * 0.7,      high: regMid * 1.3 },
      reputation:{ mid: repMid,      low: repMid * 0.7,      high: repMid * 1.3 },
      governance:{ mid: govMid,      low: govMid * 0.7,      high: govMid * 1.3 },
      notification:{ mid: notifyMid, low: notifyMid * 0.7,  high: notifyMid * 1.3 },
      adminFineCeiling,
    },
    steps: {
      ibmIndustry: ibmIndustry!,
      sectorFactor: sf,
      dailyRevenue: dr,
      itDependencyLevel: itDependencyLevel!,
      itFactor: itFactor!,
      orgSize: rawOrgSize,
      orgSizeMult,
      adjustedDailyLoss: adjustedDailyLoss!,
      cmmiScores,
      cmmiSum: cmmiScores.reduce((s, v) => s + v, 0),
      gapScore,
      downtimeDays,
    },
    irSteps:        { irBase, irScore, irMaturityMult, irDepMult },
    restoreSteps:   { restoreBase, restoreScore, restoreMaturityMult, restoreDepMult, infraMult },
    ebiSteps:       { ebiRecoveryFriction, ebiSectorAdj, ebiDepMult, ebiRestoreAdj },
    cclSteps:       { customerModel, revenueConcentration: rawConcentration, basePct: cclBasePct, cclSectorAdj, cclSeverityAdj, cclIrAdj },
    regSteps:       { regBase, regSectorAdj, regSeverityAdj, regIrAdj, regFrameworkMult, regFrameworkCount, regGeoMult, regPrevBreachMult },
    reputationSteps:{ customerModel, basePct: reputationBasePct, severityAdj: repSeverityAdj, sectorAdj: repSectorAdj, irAdj: repIrAdj, visibilityMult: repVisibilityMult, dataSensitivityMult, prevBreachMult: repPrevBreachMult },
    govSteps:       { govBase, severityAdj: govSeverityAdj, sectorAdj: govSectorAdj },
    notificationSteps: { notifyBase, dataSensitivityMult: notifyDataSensMult, orgSizeMult, geoMult: regGeoMult, frameworkMult: regFrameworkMult },
    fineSteps:      { entityType: rawEntityType, pctCap: fineConfig.pct, fixedCap: fineConfig.fixed, pctAmount },
  };
}
