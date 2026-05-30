// Per-safeguard exposure across the full CMMI spectrum (L1–L5).
//
// The per-safeguard-exposure page treats CMMI as a range rather than a fixed
// value: instead of asking "what's the financial impact at the org's current
// CMMI?", we ask "what's the impact at every maturity level?". This gives a
// best-/worst-case view that doesn't depend on whether the GAP report has been
// filled in.
//
// For each L ∈ {1..5}, we set every safeguard's CMMI to L, recompute the full
// CONC model (loss-given-event), recompute the breach-likelihood model (for
// ALE), and compute each safeguard's marginal avoidable loss.
//
// This is the single source of truth used by both:
//   • /risk-foundation/per-safeguard-exposure        (control-level table)
//   • /risk-foundation/per-safeguard-exposure-details (safeguard-level table)

import { CIS_CONTROLS } from '@/lib/constants/cis-controls';
import {
  calculateConcDowntimeCosts,
  type ConcAllCosts,
  type ConcInputs,
} from './conc-calculator';
import {
  calculateBreachLikelihood,
  type BreachLikelihoodInputs,
} from './breach-likelihood-calculator';
import {
  calculateAllSafeguardImpacts,
  type SafeguardImpact,
} from './safeguard-impact-calculator';
import type { CostCategory } from './safeguard-cost-map';

export const CMMI_LEVELS = [1, 2, 3, 4, 5] as const;
export type CmmiLevel = (typeof CMMI_LEVELS)[number];

// Range endpoints used by the UI. The spectrum still computes all 5 levels,
// but pages render values at LOWER_DISPLAY_LEVEL (= L1, worst case) and
// UPPER_DISPLAY_LEVEL (= L4, best realistic case). Flip these to L1/L5 to
// extend the range to "Optimizing".
export const LOWER_DISPLAY_LEVEL: CmmiLevel = 1;
export const UPPER_DISPLAY_LEVEL: CmmiLevel = 4;

// One level's worth of computed data (CONC, breach probability, per-safeguard impacts).
export type LevelData = {
  concCosts: ConcAllCosts;
  probability: number | null;
  impacts: SafeguardImpact[];
  // Pre-computed totals so the UI doesn't have to re-sum.
  totalAvoidable: number;
  totalAle: number | null;
  concTotalMid: number;
};

// Per-control aggregate across all levels.
export type ControlSpectrum = {
  controlId: number;
  controlTitle: string;
  safeguardCount: number;
  avoidableByLevel: Record<CmmiLevel, number>;
  aleByLevel: Record<CmmiLevel, number | null>;
  // The category contributing most to this control's exposure (from L1; weights
  // don't change with level so the ranking is invariant).
  topCategory: CostCategory | null;
  // Average financialRelevance of the control's safeguards (0–100).
  financialRelevance: number;
};

// Per-safeguard impacts across all levels.
export type SafeguardSpectrum = {
  safeguardId: string;
  safeguardTitle: string;
  controlId: number;
  role: SafeguardImpact['role'];
  avoidableByLevel: Record<CmmiLevel, number>;
  aleByLevel: Record<CmmiLevel, number | null>;
  topCategory: CostCategory | null;
  // 0–100 score for cross-safeguard comparison ("how much money does this
  // safeguard's failure cost relative to the worst one?"). Computed via
  // √-transform max-anchored normalisation on ale[L1] (or avoidable[L1]
  // if no breach probability is available). See computeFinancialRelevance.
  financialRelevance: number;
};

export type SafeguardExposureSpectrum = {
  byLevel: Record<CmmiLevel, LevelData>;
  bySafeguard: Map<string, SafeguardSpectrum>;
  byControl: ControlSpectrum[];
};

export type SpectrumResult =
  | { ok: true; spectrum: SafeguardExposureSpectrum }
  | { ok: false; missing: string[] };

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

function concTotalMidpoint(c: ConcAllCosts): number {
  return CATEGORIES.reduce((s, cat) => s + (c[cat]?.mid ?? 0), 0);
}

type ConcBaseInputs = Omit<ConcInputs, 'cmmiValues' | 'overrideDowntimeDays'>;
type BreachBaseInputs = Omit<BreachLikelihoodInputs, 'cmmiValues' | 'concTotalMid'>;

export function calculateSafeguardExposureSpectrum(
  concBase: ConcBaseInputs,
  breachBase: BreachBaseInputs,
): SpectrumResult {
  // Build a single list of every safeguard id in the catalog.
  const allSafeguardIds: string[] = [];
  const safeguardTitleById: Record<string, string> = {};
  const safeguardControlById: Record<string, number> = {};
  for (const ctrl of CIS_CONTROLS) {
    for (const sg of ctrl.safeguards) {
      allSafeguardIds.push(sg.id);
      safeguardTitleById[sg.id] = sg.title;
      safeguardControlById[sg.id] = ctrl.id;
    }
  }

  const byLevel: Partial<Record<CmmiLevel, LevelData>> = {};
  let firstMissing: string[] | null = null;

  for (const L of CMMI_LEVELS) {
    const cmmiAll: Record<string, number> = {};
    for (const sid of allSafeguardIds) cmmiAll[sid] = L;

    const conc = calculateConcDowntimeCosts({ ...concBase, cmmiValues: cmmiAll });
    if (!conc.ok) {
      if (!firstMissing) firstMissing = conc.missing;
      continue;
    }

    const bl = calculateBreachLikelihood({ ...breachBase, cmmiValues: cmmiAll });
    const probability = bl.ok ? bl.band.mid : null;

    const impacts = calculateAllSafeguardImpacts({
      cmmiValues: cmmiAll,
      concCosts: conc.costs,
      breachProbability: probability ?? undefined,
    });

    let totalAvoidable = 0;
    let totalAle = 0;
    let hasAle = false;
    for (const imp of impacts) {
      totalAvoidable += imp.avoidableLoss;
      if (imp.annualizedExpectedLoss !== undefined) {
        totalAle += imp.annualizedExpectedLoss;
        hasAle = true;
      }
    }

    byLevel[L] = {
      concCosts: conc.costs,
      probability,
      impacts,
      totalAvoidable,
      totalAle: hasAle ? totalAle : null,
      concTotalMid: concTotalMidpoint(conc.costs),
    };
  }

  if (Object.keys(byLevel).length === 0) {
    return { ok: false, missing: firstMissing ?? ['Organization profile data'] };
  }

  // Re-index impacts by safeguardId for fast lookup.
  // Each impact across levels keeps the same weights and topCategory (only
  // exposure changes), so we capture topCategory from level 1 (full exposure).
  const bySafeguard = new Map<string, SafeguardSpectrum>();
  // First pass: build entries with relevance = 0 (filled in below).
  for (const sid of allSafeguardIds) {
    const avoidableByLevel: Partial<Record<CmmiLevel, number>> = {};
    const aleByLevel: Partial<Record<CmmiLevel, number | null>> = {};
    let topCategory: CostCategory | null = null;
    let role: SafeguardImpact['role'] = null;

    for (const L of CMMI_LEVELS) {
      const data = byLevel[L];
      if (!data) continue;
      const imp = data.impacts.find((i) => i.safeguardId === sid);
      if (!imp) continue;
      avoidableByLevel[L] = imp.avoidableLoss;
      aleByLevel[L] = imp.annualizedExpectedLoss ?? null;
      if (L === 1) {
        topCategory = imp.topCategory;
        role = imp.role;
      }
    }

    bySafeguard.set(sid, {
      safeguardId: sid,
      safeguardTitle: safeguardTitleById[sid] ?? sid,
      controlId: safeguardControlById[sid] ?? 0,
      role,
      avoidableByLevel: avoidableByLevel as Record<CmmiLevel, number>,
      aleByLevel: aleByLevel as Record<CmmiLevel, number | null>,
      topCategory,
      financialRelevance: 0,
    });
  }

  // Second pass: compute 0–100 Financial Relevance Score across all safeguards.
  // Signal = ale[L1] when breach probability is available, else avoidable[L1].
  // Normalised with a √-transform against the max signal so the heavy-tailed
  // distribution doesn't collapse most safeguards to single digits.
  //   score = round(100 × √(signal) / √(maxSignal))
  // The top safeguard scores 100; rank order is preserved.
  let maxSignal = 0;
  const signals = new Map<string, number>();
  for (const spec of bySafeguard.values()) {
    const ale = spec.aleByLevel[1];
    const sig = ale !== null && ale !== undefined && ale > 0
      ? ale
      : (spec.avoidableByLevel[1] ?? 0);
    signals.set(spec.safeguardId, sig);
    if (sig > maxSignal) maxSignal = sig;
  }
  if (maxSignal > 0) {
    const sqrtMax = Math.sqrt(maxSignal);
    for (const spec of bySafeguard.values()) {
      const sig = signals.get(spec.safeguardId) ?? 0;
      spec.financialRelevance = sig > 0
        ? Math.round(100 * Math.sqrt(sig) / sqrtMax)
        : 0;
    }
  }

  // Aggregate per control.
  const byControl: ControlSpectrum[] = CIS_CONTROLS.map((ctrl) => {
    const avoidableByLevel: Partial<Record<CmmiLevel, number>> = {};
    const aleByLevel: Partial<Record<CmmiLevel, number | null>> = {};
    const catTotals: Partial<Record<CostCategory, number>> = {};

    for (const L of CMMI_LEVELS) {
      let avoidableSum = 0;
      let aleSum = 0;
      let aleAvailable = false;
      for (const sg of ctrl.safeguards) {
        const spec = bySafeguard.get(sg.id);
        if (!spec) continue;
        avoidableSum += spec.avoidableByLevel[L] ?? 0;
        const ale = spec.aleByLevel[L];
        if (ale !== null && ale !== undefined) {
          aleSum += ale;
          aleAvailable = true;
        }
      }
      avoidableByLevel[L] = avoidableSum;
      aleByLevel[L] = aleAvailable ? aleSum : null;
    }

    // Top category from L1 impacts (weights are invariant; only scale changes).
    for (const sg of ctrl.safeguards) {
      const imp = byLevel[1]?.impacts.find((i) => i.safeguardId === sg.id);
      if (!imp) continue;
      for (const [cat, v] of Object.entries(imp.categoryBreakdown) as [CostCategory, number][]) {
        catTotals[cat] = (catTotals[cat] ?? 0) + v;
      }
    }
    let topCat: CostCategory | null = null;
    let topVal = 0;
    for (const [cat, v] of Object.entries(catTotals) as [CostCategory, number][]) {
      if (v > topVal) {
        topVal = v;
        topCat = cat;
      }
    }

    // Average safeguard relevance for the control (0–100). Skip safeguards
    // with no spectrum entry (shouldn't happen post-extension to 153 but be
    // defensive).
    let relSum = 0;
    let relCount = 0;
    for (const sg of ctrl.safeguards) {
      const spec = bySafeguard.get(sg.id);
      if (!spec) continue;
      relSum += spec.financialRelevance;
      relCount++;
    }
    const financialRelevance = relCount > 0 ? Math.round(relSum / relCount) : 0;

    return {
      controlId: ctrl.id,
      controlTitle: ctrl.title,
      safeguardCount: ctrl.safeguards.length,
      avoidableByLevel: avoidableByLevel as Record<CmmiLevel, number>,
      aleByLevel: aleByLevel as Record<CmmiLevel, number | null>,
      topCategory: topCat,
      financialRelevance,
    };
  });

  return {
    ok: true,
    spectrum: {
      byLevel: byLevel as Record<CmmiLevel, LevelData>,
      bySafeguard,
      byControl,
    },
  };
}

// ─── Helpers also shared by both pages ───────────────────────────────────────

export function buildSpectrumInputs(org: {
  naceSection: string | null;
  revenueRange: number | null;
  businessDaysPerYear: number | null;
  manualOperation: string | null;
  productionDependency: string | null;
  customerAccess: string | null;
  size: string | null;
  infrastructureTypes: string[];
  dataSensitivity: string[];
  regulatoryObligations: string[];
  geographicScope: string | null;
  businessOrientation: string | null;
  revenueConcentration: string | null;
  entityType: string | null;
  itSecurityStaff: string | null;
  securityMaturity: string | null;
  publicFacingServices: string | null;
  targetedAttackLikelihood: string | null;
  supplyChainPosition: string | null;
  remoteWorkforce: string | null;
  previousBreachHistory: string | null;
}): { concBase: ConcBaseInputs; breachBase: BreachBaseInputs } {
  return {
    concBase: {
      naceSection:           org.naceSection,
      revenueRange:          org.revenueRange,
      businessDaysPerYear:   org.businessDaysPerYear,
      manualOperation:       org.manualOperation,
      productionDependency:  org.productionDependency,
      customerAccess:        org.customerAccess,
      orgSize:               org.size,
      infrastructureTypes:   org.infrastructureTypes ?? [],
      dataSensitivity:       org.dataSensitivity ?? [],
      regulatoryObligations: org.regulatoryObligations ?? [],
      geographicScope:       org.geographicScope,
      businessOrientation:   org.businessOrientation,
      revenueConcentration:  org.revenueConcentration,
      entityType:            org.entityType,
      previousBreachHistory: org.previousBreachHistory,
    },
    breachBase: {
      orgSize:                  org.size,
      naceSection:              org.naceSection,
      dataSensitivity:          org.dataSensitivity ?? [],
      infrastructureTypes:      org.infrastructureTypes ?? [],
      geographicScope:          org.geographicScope,
      itSecurityStaff:          org.itSecurityStaff,
      securityMaturity:         org.securityMaturity,
      publicFacingServices:     org.publicFacingServices,
      targetedAttackLikelihood: org.targetedAttackLikelihood,
      supplyChainPosition:      org.supplyChainPosition,
      remoteWorkforce:          org.remoteWorkforce,
      previousBreachHistory:    org.previousBreachHistory,
    },
  };
}
