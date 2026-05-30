// ── Targeted Attack Likelihood — derivation ────────────────────────────────
// Estimates how likely an organization is to be specifically targeted by a
// sophisticated attacker (vs. swept up in commodity ransomware) from the
// signals collected in the wizard. Customers can't reliably self-rate this,
// so we compute it from factual inputs:
//   - sector (NACE), regulatory regime, NIS2 entity type
//   - data sensitivity (what's worth stealing)
//   - supply-chain leverage (MSPs/critical suppliers are pivot targets)
//   - visibility (public-facing services, brand exposure, societal role)
//   - ransom attractiveness (size, revenue, geographic reach)
//   - ownership (state-owned = political target)
//   - previous-breach history (strongest actuarial predictor)
//
// The function is deterministic and explainable — the score breakdown is
// returned alongside the level so the UI can show "why HIGH?" if asked.

import type { OrganizationProfile } from '@/lib/gap-analysis/recommendation-engine';
import type { TargetedAttackLikelihood } from '@prisma/client';

type DerivationFactor = {
    label  : string;
    weight : number;
};

export type DerivationResult = {
    level   : TargetedAttackLikelihood;
    score   : number;
    factors : DerivationFactor[];
};

const HIGH_THRESHOLD   = 7;
const MEDIUM_THRESHOLD = 3;

export function deriveTargetedAttackLikelihood(p: OrganizationProfile): TargetedAttackLikelihood
{
    return deriveTargetedAttackLikelihoodWithBreakdown(p).level;
}

export function deriveTargetedAttackLikelihoodWithBreakdown(p: OrganizationProfile): DerivationResult
{
    const factors: DerivationFactor[] = [];
    const add = (label: string, weight: number) => factors.push({ label, weight });

    // ── Critical infrastructure / regulated regime ────────────────────────
    if (p.entityType === 'ESSENTIAL')                          add('NIS2 Essential entity', 4);
    if (p.entityType === 'IMPORTANT')                          add('NIS2 Important entity', 2);
    if (p.regulatoryObligations?.includes('DORA'))             add('Subject to DORA', 3);
    if (p.regulatoryObligations?.includes('NIS2'))             add('Subject to NIS2', 2);

    // ── Asset attractiveness — what's worth stealing ─────────────────────
    if (p.dataSensitivity?.includes('CLASSIFIED_GOVERNMENT'))  add('Handles classified government data', 4);
    if (p.dataSensitivity?.includes('CRITICAL_INFRASTRUCTURE')) add('Operates critical-infrastructure data', 4);
    if (p.dataSensitivity?.includes('PAYMENT_CARD'))           add('Handles payment-card data', 2);
    if (p.dataSensitivity?.includes('INTELLECTUAL_PROPERTY'))  add('Sensitive IP exposure', 1);
    if (p.dataSensitivity?.includes('SPECIAL_CATEGORY'))       add('Special-category personal data', 1);

    // ── Sector targeting (NACE) ──────────────────────────────────────────
    const sector = p.naceSection ?? '';
    if (sector === 'D' || sector === 'O')                      add('High-targeting sector (utilities/government)', 3);
    if (sector === 'K' || sector === 'Q' || sector === 'J')    add('Elevated-targeting sector (finance/health/ICT)', 2);
    if (sector === 'C' || sector === 'H')                      add('Moderate-targeting sector (manufacturing/transport)', 1);

    // ── Supply-chain leverage ────────────────────────────────────────────
    if (p.supplyChainPosition === 'MSP_CLOUD_PROVIDER')        add('MSP/cloud provider — supply-chain pivot', 3);
    if (p.supplyChainPosition === 'CRITICAL_SUPPLIER')         add('Critical supplier to others', 2);

    // ── Ownership / visibility / public role ─────────────────────────────
    if (p.ownershipType === 'STATE_OWNED')                     add('State-owned (political target)', 2);
    if (p.publicFacingServices === 'CRITICAL_SERVICES')        add('Critical public-facing services', 2);
    if (p.publicFacingServices === 'ECOMMERCE_PORTALS')        add('E-commerce / customer portals', 1);
    if (p.mediaExposure === true)                              add('Elevated media exposure', 1);
    if (p.criticalSocietalRole === true)                       add('Critical societal role', 2);

    // ── Ransom attractiveness ────────────────────────────────────────────
    if (p.size === 'LARGE' || p.size === 'ENTERPRISE')         add('Large organization (ransom-attractive)', 1);
    if (p.geographicScope === 'GLOBAL')                        add('Global operations (geopolitical exposure)', 1);

    // ── Strongest actuarial predictor ────────────────────────────────────
    if (p.previousBreachHistory === 'MULTIPLE')                add('Multiple prior material breaches', 4);
    else if (p.previousBreachHistory === 'ONE')                add('One prior material breach', 2);

    const score = factors.reduce((sum, f) => sum + f.weight, 0);
    const level: TargetedAttackLikelihood =
        score >= HIGH_THRESHOLD   ? 'HIGH'
      : score >= MEDIUM_THRESHOLD ? 'MEDIUM'
      :                             'LOW';

    return { level, score, factors };
}
