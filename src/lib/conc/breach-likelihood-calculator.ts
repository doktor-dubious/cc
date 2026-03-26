// Annual Breach Likelihood Calculator
// Logistic base-rate model: logit(P) = logit(P_base) + Σ(βᵢ)
// Calibrated from: Cyentia IRIS (2020–2024), Verizon DBIR (2024), IBM/Ponemon (2024),
// Hiscox Cyber Readiness (2024), ENISA SME reports.

import { NACE_TO_IBM } from './conc-calculator';

// ─── Math helpers ────────────────────────────────────────────────────────────

function logit(p: number): number {
  return Math.log(p / (1 - p));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// ─── Base rates by organisation size ─────────────────────────────────────────
// Sources: Cyentia IRIS (log-linear size relationship), Hiscox 2024 (SME rates),
// IBM/Ponemon 2024 (~27% over 24 months for sampled orgs).
// These represent "material breach" probabilities (significant data/operational impact).

const BASE_RATE: Record<string, number> = {
  MICRO:      0.06,  // 0–9 employees
  SMALL:      0.10,  // 10–49 employees
  MEDIUM:     0.18,  // 50–249 employees
  LARGE:      0.25,  // 250–999 employees
  ENTERPRISE: 0.33,  // 1000+ employees
};

// ─── Industry beta ───────────────────────────────────────────────────────────
// Derived from Verizon DBIR 2024 industry-specific breach frequency
// and IBM sector cost differentials.

const INDUSTRY_BETA: Record<string, number> = {
  Healthcare:      0.40,   // Highest targeted (DBIR), high-value data
  Financial:       0.30,   // High-value target, regulated = more detection
  Technology:      0.15,   // Large attack surface, IP-rich
  Energy:          0.10,   // OT exposure, nation-state interest
  Pharmaceuticals: 0.10,   // IP-rich, regulated
  Education:       0.05,   // Under-resourced, large user bases
  Retail:          0.00,   // Payment card data, but better PCI controls
  Services:        0.00,   // Baseline
  Entertainment:  -0.05,
  Media:          -0.05,
  Hospitality:    -0.05,
  Transportation: -0.05,
  Communications:  0.05,
  Consumer:       -0.05,
  Research:        0.05,
  Industrial:     -0.05,   // Less data-rich, but OT risk emerging
  Public:         -0.10,   // Lower target value for financial criminals
};

// ─── CIS Controls sub-groups for breach likelihood ───────────────────────────
// Decomposed into Preventive (45%), Detective (35%), Data Protection (20%).
// Safeguard IDs match CONTROL_META in cea-priority-controls.ts.

const PREVENTIVE_SAFEGUARD_IDS = [
  '4.1',         // Secure Configuration Process
  '5.1', '5.3', '5.4',  // Account Management
  '6.1', '6.2', '6.3', '6.5',  // Access Control Management
  '7.1', '7.3', '7.7',  // Vulnerability Management
  '10.1', '10.2',       // Malware Defenses
  '14.1', '14.2',       // Security Awareness Training
] as const;

const DETECTIVE_SAFEGUARD_IDS = [
  '8.1', '8.2', '8.11', // Audit Log Management
  '9.1', '9.2',         // Email and Web Browser Protections
  '13.1', '13.6',       // Network Monitoring and Defense
] as const;

const DATA_PROT_SAFEGUARD_IDS = [
  '3.1', '3.3', '3.10', '3.11', '3.12', // Data Protection
  '11.1', '11.2', '11.4',               // Data Recovery
] as const;

// Maximum beta reduction for each sub-group (at CMMI 5)
const PREVENTIVE_MAX_BETA = -0.36;  // 45% weight × total -0.80
const DETECTIVE_MAX_BETA  = -0.28;  // 35% weight × total -0.80
const DATA_PROT_MAX_BETA  = -0.16;  // 20% weight × total -0.80

// ─── Data attractiveness beta (max across types) ─────────────────────────────

const DATA_ATTRACT_BETA: Record<string, number> = {
  BASIC_BUSINESS:          -0.15,  // Low attacker motivation
  INTELLECTUAL_PROPERTY:    0.00,  // Targeted but niche
  CRITICAL_INFRASTRUCTURE:  0.10,  // Nation-state interest
  CUSTOMER_PII:             0.10,  // Mass monetizable
  PAYMENT_CARD:             0.20,  // Directly monetizable, proven attack chains
  SPECIAL_CATEGORY:         0.15,  // High extortion value (health, biometric)
  CLASSIFIED_GOVERNMENT:    0.25,  // Nation-state targeting
};

// ─── Infrastructure exposure beta (max across types) ─────────────────────────

const INFRA_BETA: Record<string, number> = {
  CLOUD_ONLY:             -0.10,  // Smaller perimeter, provider-managed patching
  MULTI_CLOUD:             0.00,  // Baseline — wider but managed
  HYBRID:                  0.05,  // Integration seams create exposure
  ON_PREMISES:             0.10,  // Larger self-managed attack surface
  OPERATIONAL_TECHNOLOGY:  0.20,  // Legacy protocols, difficult to patch
};

// ─── Geographic scope beta ───────────────────────────────────────────────────

const GEO_BETA: Record<string, number> = {
  LOCAL:    -0.10,  // Smaller threat actor pool
  REGIONAL: -0.05,
  NATIONAL:  0.00,  // Baseline
  EUROPEAN:  0.05,  // More exposure points
  GLOBAL:    0.10,  // Widest threat actor exposure
};

// ─── Organisation-specific factor betas ──────────────────────────────────────

const SECURITY_STAFF_BETA: Record<string, number> = {
  NO_DEDICATED_IT:     0.20,   // No IT = no security
  IT_NO_SECURITY:      0.10,   // IT exists but security is not a focus
  DEDICATED_SECURITY: -0.05,   // Security function exists
  SPECIALIZED_SECURITY:-0.15,  // SOC / dedicated security team
};

const SECURITY_MATURITY_BETA: Record<string, number> = {
  NO_PROGRAM:  0.25,   // No formal security program
  BASIC:       0.10,   // Ad-hoc / reactive
  DEFINED:     0.00,   // Baseline — documented processes
  MANAGED:    -0.10,   // Measured and controlled
  OPTIMIZING: -0.20,   // Continuous improvement
};

const PUBLIC_SERVICES_BETA: Record<string, number> = {
  NONE:              -0.10,  // No internet-facing services
  BASIC_WEB:          0.00,  // Baseline — standard web presence
  ECOMMERCE_PORTALS:  0.10,  // Transactional, data-rich
  CRITICAL_SERVICES:  0.20,  // High-value targets, always-on requirement
};

const TARGETED_ATTACK_BETA: Record<string, number> = {
  LOW:   -0.10,
  MEDIUM: 0.00,
  HIGH:   0.15,
};

const SUPPLY_CHAIN_BETA: Record<string, number> = {
  END_CONSUMER:      -0.05,  // End of chain, less targeted
  B2B_PROVIDER:       0.00,  // Baseline
  CRITICAL_SUPPLIER:  0.10,  // Supply-chain attacks target critical suppliers
  MSP_CLOUD_PROVIDER: 0.15,  // MSPs are high-value pivot targets (Kaseya, SolarWinds)
};

// Remote workforce beta.
// Remote workers expand the network perimeter — VPN/RDP are top initial access
// vectors (Verizon DBIR 2024). IBM 2024: remote work was a cost amplifier.
const REMOTE_WORKFORCE_BETA: Record<string, number> = {
  NONE:       -0.10,  // Fully on-site — smaller perimeter
  UNDER_25:    0.00,  // Baseline — limited remote exposure
  FROM_25_50:  0.05,  // Moderate remote footprint
  FROM_50_75:  0.10,  // Majority remote — significant VPN/RDP exposure
  OVER_75:     0.15,  // Fully distributed — largest perimeter, hardest to monitor
};

// Previous breach history beta.
// Strongest actuarial predictor of future breach (Cyentia IRIS: ~2× odds).
// Also indicates potential unresolved vulnerabilities.
const PREVIOUS_BREACH_BETA: Record<string, number> = {
  NONE:      0.00,   // No history — baseline
  ONE:       0.30,   // One prior breach — ~1.35× odds increase
  MULTIPLE:  0.55,   // Multiple breaches — ~1.73× odds increase
};

// ─── Risk level thresholds ───────────────────────────────────────────────────

export function probabilityToRiskLevel(p: number): string {
  if (p < 0.05)  return 'VERY_LOW';
  if (p < 0.10)  return 'LOW';
  if (p < 0.20)  return 'MODERATE';
  if (p < 0.35)  return 'ELEVATED';
  if (p < 0.50)  return 'HIGH';
  return 'VERY_HIGH';
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type BreachLikelihoodInputs = {
  orgSize: string | null;
  naceSection: string | null;
  dataSensitivity: string[];
  infrastructureTypes: string[];
  geographicScope: string | null;
  itSecurityStaff: string | null;
  securityMaturity: string | null;
  publicFacingServices: string | null;
  targetedAttackLikelihood: string | null;
  supplyChainPosition: string | null;
  remoteWorkforce: string | null;
  previousBreachHistory: string | null;
  // safeguardId → currentCmmi (1–5)
  cmmiValues: Record<string, number>;
  // Optional: CoNC total (sum of all cost category mid-points, excl. fine ceiling)
  // When provided, ALE (Annual Loss Expectancy) = P(breach) × concTotalMid
  concTotalMid?: number;
};

export type BreachLikelihoodSteps = {
  orgSize: string;
  baseRate: number;
  logitBase: number;
  ibmIndustry: string;
  industryBeta: number;
  cisPreventiveAvgCmmi: number;
  cisPreventiveBeta: number;
  cisDetectiveAvgCmmi: number;
  cisDetectiveBeta: number;
  cisDataProtAvgCmmi: number;
  cisDataProtBeta: number;
  cisCompositeBeta: number;
  dataAttractBeta: number;
  infraExposureBeta: number;
  geoBeta: number;
  securityStaffBeta: number;
  securityMaturityBeta: number;
  publicServicesBeta: number;
  targetedAttackBeta: number;
  supplyChainBeta: number;
  remoteWorkforceBeta: number;
  previousBreachBeta: number;
  logitSum: number;
  probability: number;
};

export type BreachLikelihoodBand = {
  mid: number;
  low: number;
  high: number;
};

export type FactorContribution = {
  name: string;
  beta: number;
  direction: 'increases' | 'decreases' | 'neutral';
};

export type AleBand = {
  mid: number;
  low: number;
  high: number;
};

export type BreachLikelihoodResult =
  | {
      ok: true;
      band: BreachLikelihoodBand;
      ale: AleBand | null;       // Annual Loss Expectancy (null if concTotalMid not provided)
      concTotalMid: number | null;
      riskLevel: string;
      steps: BreachLikelihoodSteps;
      factors: FactorContribution[];
    }
  | { ok: false; missing: string[] };

// ─── Calculator ──────────────────────────────────────────────────────────────

function avgCmmi(ids: readonly string[], cmmiValues: Record<string, number>): number {
  const scores = ids.map((id) => cmmiValues[id] ?? 1);
  return scores.reduce((s, v) => s + v, 0) / scores.length;
}

function cmmiToBeta(avg: number, maxBeta: number): number {
  // At CMMI 1: beta = 0 (no protective effect)
  // At CMMI 5: beta = maxBeta (full protective effect, negative)
  return maxBeta * ((avg - 1) / 4);
}

function maxBeta(values: string[], lookup: Record<string, number>): number {
  if (values.length === 0) return 0;
  return Math.max(...values.map((v) => lookup[v] ?? 0));
}

function lookupBeta(value: string | null, lookup: Record<string, number>): number {
  if (!value) return 0;
  return lookup[value.toUpperCase()] ?? 0;
}

function betaDirection(beta: number): 'increases' | 'decreases' | 'neutral' {
  if (beta > 0.001) return 'increases';
  if (beta < -0.001) return 'decreases';
  return 'neutral';
}

export function calculateBreachLikelihood(inputs: BreachLikelihoodInputs): BreachLikelihoodResult {
  const missing: string[] = [];

  // ── Required: org size ──────────────────────────────────────────────────
  const rawOrgSize = (inputs.orgSize ?? '').toUpperCase();
  const baseRate = BASE_RATE[rawOrgSize] ?? null;
  if (baseRate === null) missing.push('Organisation size (organization profile)');

  // ── Required: NACE section → industry ───────────────────────────────────
  const ibmIndustry = inputs.naceSection ? NACE_TO_IBM[inputs.naceSection] ?? null : null;
  if (!ibmIndustry) missing.push('NACE sector (organization profile)');

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  const br = baseRate!;
  const logitBase = logit(br);
  const industryBeta = INDUSTRY_BETA[ibmIndustry!] ?? 0;

  // ── CIS Controls maturity ───────────────────────────────────────────────
  const cisPreventiveAvgCmmi = avgCmmi(PREVENTIVE_SAFEGUARD_IDS, inputs.cmmiValues);
  const cisPreventiveBeta = cmmiToBeta(cisPreventiveAvgCmmi, PREVENTIVE_MAX_BETA);

  const cisDetectiveAvgCmmi = avgCmmi(DETECTIVE_SAFEGUARD_IDS, inputs.cmmiValues);
  const cisDetectiveBeta = cmmiToBeta(cisDetectiveAvgCmmi, DETECTIVE_MAX_BETA);

  const cisDataProtAvgCmmi = avgCmmi(DATA_PROT_SAFEGUARD_IDS, inputs.cmmiValues);
  const cisDataProtBeta = cmmiToBeta(cisDataProtAvgCmmi, DATA_PROT_MAX_BETA);

  const cisCompositeBeta = cisPreventiveBeta + cisDetectiveBeta + cisDataProtBeta;

  // ── Remaining factors ───────────────────────────────────────────────────
  const dataAttractBeta = maxBeta(inputs.dataSensitivity, DATA_ATTRACT_BETA);
  const infraExposureBeta = maxBeta(inputs.infrastructureTypes, INFRA_BETA);
  const geoBeta = lookupBeta(inputs.geographicScope, GEO_BETA);
  const securityStaffBeta = lookupBeta(inputs.itSecurityStaff, SECURITY_STAFF_BETA);
  const securityMaturityBeta = lookupBeta(inputs.securityMaturity, SECURITY_MATURITY_BETA);
  const publicServicesBeta = lookupBeta(inputs.publicFacingServices, PUBLIC_SERVICES_BETA);
  const targetedAttackBeta = lookupBeta(inputs.targetedAttackLikelihood, TARGETED_ATTACK_BETA);
  const supplyChainBeta = lookupBeta(inputs.supplyChainPosition, SUPPLY_CHAIN_BETA);
  const remoteWorkforceBeta = lookupBeta(inputs.remoteWorkforce, REMOTE_WORKFORCE_BETA);
  const previousBreachBeta = lookupBeta(inputs.previousBreachHistory, PREVIOUS_BREACH_BETA);

  // ── Sum and transform ──────────────────────────────────────────────────
  const logitSum =
    logitBase +
    industryBeta +
    cisCompositeBeta +
    dataAttractBeta +
    infraExposureBeta +
    geoBeta +
    securityStaffBeta +
    securityMaturityBeta +
    publicServicesBeta +
    targetedAttackBeta +
    supplyChainBeta +
    remoteWorkforceBeta +
    previousBreachBeta;

  const probability = sigmoid(logitSum);
  const riskLevel = probabilityToRiskLevel(probability);

  // ── Factor contributions for UI waterfall ──────────────────────────────
  const factors: FactorContribution[] = [
    { name: 'blFactorBase',            beta: logitBase,           direction: betaDirection(logitBase) },
    { name: 'blFactorIndustry',        beta: industryBeta,        direction: betaDirection(industryBeta) },
    { name: 'blFactorCisPreventive',   beta: cisPreventiveBeta,   direction: betaDirection(cisPreventiveBeta) },
    { name: 'blFactorCisDetective',    beta: cisDetectiveBeta,    direction: betaDirection(cisDetectiveBeta) },
    { name: 'blFactorCisDataProt',     beta: cisDataProtBeta,     direction: betaDirection(cisDataProtBeta) },
    { name: 'blFactorDataAttract',     beta: dataAttractBeta,     direction: betaDirection(dataAttractBeta) },
    { name: 'blFactorInfra',           beta: infraExposureBeta,   direction: betaDirection(infraExposureBeta) },
    { name: 'blFactorGeo',             beta: geoBeta,             direction: betaDirection(geoBeta) },
    { name: 'blFactorSecStaff',        beta: securityStaffBeta,   direction: betaDirection(securityStaffBeta) },
    { name: 'blFactorSecMaturity',     beta: securityMaturityBeta,direction: betaDirection(securityMaturityBeta) },
    { name: 'blFactorPublicServices',  beta: publicServicesBeta,  direction: betaDirection(publicServicesBeta) },
    { name: 'blFactorTargetedAttack',  beta: targetedAttackBeta,  direction: betaDirection(targetedAttackBeta) },
    { name: 'blFactorSupplyChain',     beta: supplyChainBeta,     direction: betaDirection(supplyChainBeta) },
    { name: 'blFactorRemoteWorkforce', beta: remoteWorkforceBeta, direction: betaDirection(remoteWorkforceBeta) },
    { name: 'blFactorPreviousBreach',  beta: previousBreachBeta,  direction: betaDirection(previousBreachBeta) },
  ];

  // ── ALE (Annual Loss Expectancy) = P(breach) × CoNC total ────────────────
  const concTotal = inputs.concTotalMid ?? null;
  const ale: AleBand | null = concTotal !== null
    ? {
        mid:  probability * concTotal,
        low:  Math.max(0, probability * 0.7) * concTotal * 0.7,
        high: Math.min(1, probability * 1.3) * concTotal * 1.3,
      }
    : null;

  return {
    ok: true,
    band: {
      mid:  probability,
      low:  Math.max(0, probability * 0.7),
      high: Math.min(1, probability * 1.3),
    },
    ale,
    concTotalMid: concTotal,
    riskLevel,
    steps: {
      orgSize: rawOrgSize,
      baseRate: br,
      logitBase,
      ibmIndustry: ibmIndustry!,
      industryBeta,
      cisPreventiveAvgCmmi,
      cisPreventiveBeta,
      cisDetectiveAvgCmmi,
      cisDetectiveBeta,
      cisDataProtAvgCmmi,
      cisDataProtBeta,
      cisCompositeBeta,
      dataAttractBeta,
      infraExposureBeta,
      geoBeta,
      securityStaffBeta,
      securityMaturityBeta,
      publicServicesBeta,
      targetedAttackBeta,
      supplyChainBeta,
      remoteWorkforceBeta,
      previousBreachBeta,
      logitSum,
      probability,
    },
    factors,
  };
}
