// Per-safeguard financial impact calculator.
//
// Builds on `conc-calculator.ts` (loss-given-event by cost category) and
// `breach-likelihood-calculator.ts` (annual P(breach)) to attribute a $ value
// to each individual CIS safeguard:
//
//   avoidableLoss(s, cmmi) = Σ_cat normalisedWeight[s][cat]
//                          × concCosts[cat].mid
//                          × exposure(cmmi)
//
// Where `exposure(cmmi)` is a non-linear maturity curve (L1 = full exposure,
// L5 = none). Joint normalisation is applied to the static fingerprint table
// so per-category weights sum to 1.0 across all safeguards — meaning
//   Σ_safeguards avoidableLoss(s, cmmi=1) = total CONC cost
// and the per-safeguard numbers form a defensible partition of breach cost.
//
// When the org's breach probability is supplied, an annualised version of the
// loss (ALE per safeguard) is also returned.

import {
  SAFEGUARD_COST_FINGERPRINT,
  type CostCategory,
  type SafeguardFingerprint,
} from './safeguard-cost-map';
import type { ConcAllCosts } from './conc-calculator';

const CATEGORIES: CostCategory[] = [
  'downtime',
  'ir',
  'restore',
  'ebi',
  'ccl',
  'reg',
  'reputation',
  'governance',
  'notification',
];

// ─── Joint normalisation ─────────────────────────────────────────────────────
// For each cost category, the static fingerprint claims add up to some
// per-category total (>= 1.0 in practice). Dividing each claim by that total
// produces weights that sum to 1.0 across all safeguards — i.e. each safeguard
// gets a defensible fraction of that category's cost.

type Weights = Partial<Record<CostCategory, number>>;

function computeNormalizedWeights(): Record<string, Weights> {
  const categorySums: Partial<Record<CostCategory, number>> = {};
  for (const fp of Object.values(SAFEGUARD_COST_FINGERPRINT)) {
    for (const [cat, w] of Object.entries(fp.weights) as [CostCategory, number][]) {
      categorySums[cat] = (categorySums[cat] ?? 0) + w;
    }
  }
  const out: Record<string, Weights> = {};
  for (const [sid, fp] of Object.entries(SAFEGUARD_COST_FINGERPRINT)) {
    const norm: Weights = {};
    for (const [cat, w] of Object.entries(fp.weights) as [CostCategory, number][]) {
      const sum = categorySums[cat] ?? 1;
      norm[cat] = sum > 0 ? w / sum : 0;
    }
    out[sid] = norm;
  }
  return out;
}

let _normalized: Record<string, Weights> | null = null;
function normalized(): Record<string, Weights> {
  if (!_normalized) _normalized = computeNormalizedWeights();
  return _normalized;
}

// ─── Maturity exposure curve ─────────────────────────────────────────────────
// Non-linear: L1→L2 buys a lot, L4→L5 buys diminishing returns. Calibrated so
// that mid-maturity (L3 = "Defined") still carries about 45% of full exposure
// — documented processes alone don't prevent breaches.

const EXPOSURE_BY_CMMI: Record<number, number> = {
  1: 1.00,
  2: 0.75,
  3: 0.45,
  4: 0.20,
  5: 0.00,
};

function exposureFactor(cmmi: number): number {
  const c = Math.max(1, Math.min(5, Math.round(cmmi || 1)));
  return EXPOSURE_BY_CMMI[c] ?? 1.0;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export type SafeguardImpact = {
  safeguardId: string;
  // The CMMI level the impact was computed at (clamped to [1,5]; unset → 1)
  currentCmmi: number;
  // € of breach cost attributable to this safeguard at its current maturity
  avoidableLoss: number;
  // Same, partitioned by cost category
  categoryBreakdown: Partial<Record<CostCategory, number>>;
  // The category contributing most to avoidableLoss (null if all zero)
  topCategory: CostCategory | null;
  // Annualised expected loss = P(breach) × avoidableLoss (when probability given)
  annualizedExpectedLoss?: number;
  // The fingerprint role (prevent/detect/recover/mitigate/govern) — useful for UI grouping
  role: SafeguardFingerprint['role'] | null;
};

export type SafeguardImpactInputs = {
  cmmiValues: Record<string, number>;
  concCosts: ConcAllCosts;
  breachProbability?: number;
};

export function calculateSafeguardImpact(
  safeguardId: string,
  currentCmmi: number,
  concCosts: ConcAllCosts,
  breachProbability?: number,
): SafeguardImpact {
  const fp = SAFEGUARD_COST_FINGERPRINT[safeguardId];
  const w = normalized()[safeguardId];
  if (!fp || !w) {
    return {
      safeguardId,
      currentCmmi: Math.max(1, Math.min(5, Math.round(currentCmmi || 1))),
      avoidableLoss: 0,
      categoryBreakdown: {},
      topCategory: null,
      role: null,
    };
  }

  const cmmi = Math.max(1, Math.min(5, Math.round(currentCmmi || 1)));
  const ex = exposureFactor(cmmi);
  const breakdown: Partial<Record<CostCategory, number>> = {};
  let total = 0;
  let topCat: CostCategory | null = null;
  let topVal = 0;

  for (const cat of CATEGORIES) {
    const wc = w[cat] ?? 0;
    if (wc === 0) continue;
    const v = (concCosts[cat]?.mid ?? 0) * wc * ex;
    breakdown[cat] = v;
    total += v;
    if (v > topVal) {
      topVal = v;
      topCat = cat;
    }
  }

  const out: SafeguardImpact = {
    safeguardId,
    currentCmmi: cmmi,
    avoidableLoss: total,
    categoryBreakdown: breakdown,
    topCategory: topCat,
    role: fp.role,
  };

  if (breachProbability !== undefined) {
    out.annualizedExpectedLoss = breachProbability * total;
  }
  return out;
}

export function calculateAllSafeguardImpacts(
  inputs: SafeguardImpactInputs,
): SafeguardImpact[] {
  const ids = Object.keys(SAFEGUARD_COST_FINGERPRINT);
  return ids.map((id) =>
    calculateSafeguardImpact(
      id,
      inputs.cmmiValues[id] ?? 1,
      inputs.concCosts,
      inputs.breachProbability,
    ),
  );
}

// ─── Aggregates ──────────────────────────────────────────────────────────────

export type SafeguardImpactAggregate = {
  totalAvoidableLoss: number;
  totalAnnualizedExpectedLoss: number | null;
  // Sum across all safeguards, broken down per category
  categoryTotals: Partial<Record<CostCategory, number>>;
  // Total CONC loss-given-event (Σ cost categories, excl. fine ceiling)
  concTotalMid: number;
  // The fraction of CONC total currently "at risk" — i.e. ratio of avoidable
  // loss to total breach cost. Useful as a "GAP intensity" signal.
  exposureRatio: number;
};

export function aggregateSafeguardImpacts(
  impacts: SafeguardImpact[],
  concCosts: ConcAllCosts,
): SafeguardImpactAggregate {
  let total = 0;
  let totalAle = 0;
  let hasAle = false;
  const categoryTotals: Partial<Record<CostCategory, number>> = {};

  for (const imp of impacts) {
    total += imp.avoidableLoss;
    if (imp.annualizedExpectedLoss !== undefined) {
      totalAle += imp.annualizedExpectedLoss;
      hasAle = true;
    }
    for (const [cat, v] of Object.entries(imp.categoryBreakdown) as [CostCategory, number][]) {
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + v;
    }
  }

  const concTotalMid = CATEGORIES.reduce((s, c) => s + (concCosts[c]?.mid ?? 0), 0);
  const exposureRatio = concTotalMid > 0 ? total / concTotalMid : 0;

  return {
    totalAvoidableLoss: total,
    totalAnnualizedExpectedLoss: hasAle ? totalAle : null,
    categoryTotals,
    concTotalMid,
    exposureRatio,
  };
}

// ─── Helpers exposed for tests / introspection ───────────────────────────────

export function _debugGetNormalizedWeights(): Record<string, Weights> {
  return normalized();
}

export function _debugGetCategorySums(): Record<CostCategory, number> {
  const sums: Partial<Record<CostCategory, number>> = {};
  for (const fp of Object.values(SAFEGUARD_COST_FINGERPRINT)) {
    for (const [cat, w] of Object.entries(fp.weights) as [CostCategory, number][]) {
      sums[cat] = (sums[cat] ?? 0) + w;
    }
  }
  return sums as Record<CostCategory, number>;
}
