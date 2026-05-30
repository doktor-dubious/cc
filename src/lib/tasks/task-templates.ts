// lib/tasks/task-templates.ts
//
// Curated, versioned task templates — the deterministic content layer of the
// Roadmap → Tasks pipeline (Phase 1 of the design). A template maps a single
// (safeguardId, applicable IGs, single-level CMMI step) to a canonical baseline
// task. The runtime NEVER calls an LLM to build these; they are pure lookup.
//
// Coverage guarantee: the deterministic engine (task-generation.ts) falls back
// to synthesizing a baseline task from the CIS control's own IG guidance for
// any safeguard/step not covered here, so this file does NOT need an entry for
// every safeguard. Curate entries where the generic fallback is too vague, or
// where several safeguards should consolidate into one task via `mergeGroup`.
//
// Authoring rule: title/description/evidence are shown to the END USER who
// performs the task, so write plain, concrete English about what to DO. Do NOT
// reference the safeguard id/number, CMMI levels, or Implementation Group —
// that framing is too technical for the recipient.
//
// Token substitution (via fill()) remains available in titlePattern / *Skeleton
// for naming only — {control} (parent control title), {safeguard} (safeguard
// title). Avoid {id}/{from}/{target} in user-facing text.

import type { RoadmapOwner } from '@prisma/client';

export type TaskTemplate = {
  safeguardId:              string;
  /** Implementation Groups this template applies to (subset of 1,2,3). */
  appliesToIG:              number[];
  /** A single-level CMMI step. `to` is always `from + 1`. */
  step:                     { from: number; to: number };
  /**
   * Cross-safeguard consolidation key. Templates that share a mergeGroup (and
   * fall in the same generation phase) collapse into ONE task spanning every
   * contributing safeguard. Leave undefined for a standalone task.
   */
  mergeGroup?:              string;
  titlePattern:             string;
  descriptionSkeleton:      string;
  expectedEvidenceSkeleton: string;
  defaultOwnerRole:         RoadmapOwner;
};

// ── Curated templates ─────────────────────────────────────────────────────────
// A deliberately small, hand-authored starter set. Two merge groups demonstrate
// cross-safeguard consolidation: hardware + software inventory ("asset-inventory")
// and the account/access baseline ("identity-baseline").
export const TASK_TEMPLATES: TaskTemplate[] = [
  // Control 1 — Inventory and Control of Enterprise Assets
  {
    safeguardId: '1.1', appliesToIG: [1, 2, 3], step: { from: 1, to: 2 },
    mergeGroup: 'asset-inventory',
    titlePattern: 'Establish and maintain enterprise asset inventories',
    descriptionSkeleton:
      'Stand up a documented inventory process covering all hardware and software assets. ' +
      'Define the required attributes (owner, location, type), assign someone to maintain it, and set a regular review cadence so the inventory stays current.',
    expectedEvidenceSkeleton:
      'A maintained asset inventory (spreadsheet or tool export) plus the written process describing how and how often it is updated.',
    defaultOwnerRole: 'IT',
  },
  {
    safeguardId: '1.1', appliesToIG: [2, 3], step: { from: 2, to: 3 },
    titlePattern: 'Automate the enterprise asset inventory',
    descriptionSkeleton:
      'Move from a manually maintained asset list to automated discovery. Deploy a discovery or asset-management tool that records IP/MAC address, operating system and owner, and reconciles its findings against the authoritative inventory on a defined schedule.',
    expectedEvidenceSkeleton:
      'Tool configuration showing scheduled discovery, plus a recent automated inventory export and an exception/reconciliation log.',
    defaultOwnerRole: 'IT',
  },

  // Control 2 — Inventory and Control of Software Assets
  {
    safeguardId: '2.1', appliesToIG: [1, 2, 3], step: { from: 1, to: 2 },
    mergeGroup: 'asset-inventory',
    titlePattern: 'Establish and maintain a software inventory',
    descriptionSkeleton:
      'Catalogue all installed software with its title, publisher, version and install date. Tie the catalogue to the same maintenance cadence as the hardware inventory so both are reviewed together.',
    expectedEvidenceSkeleton:
      'A software inventory export and the documented review schedule, cross-referenced with the asset inventory process.',
    defaultOwnerRole: 'IT',
  },

  // Control 4 — Secure Configuration of Enterprise Assets and Software
  {
    safeguardId: '4.1', appliesToIG: [1, 2, 3], step: { from: 1, to: 2 },
    titlePattern: 'Establish and maintain a secure configuration process',
    descriptionSkeleton:
      'Document a secure configuration baseline for enterprise assets and software. Capture the hardening settings, an exception process, and a periodic review so the baseline is enforced and kept current.',
    expectedEvidenceSkeleton:
      'A written secure-configuration standard/baseline, the exception register, and evidence of the most recent review.',
    defaultOwnerRole: 'SECURITY_COMPLIANCE',
  },

  // Control 5 — Account Management
  {
    safeguardId: '5.1', appliesToIG: [1, 2, 3], step: { from: 1, to: 2 },
    mergeGroup: 'identity-baseline',
    titlePattern: 'Establish and maintain an account inventory',
    descriptionSkeleton:
      'Build a single inventory of all accounts — user, administrator and service — recording the owner, purpose and last-review date. Define a cadence for validating that every account is still required.',
    expectedEvidenceSkeleton:
      'An account inventory export plus the documented periodic-review procedure (including how dormant accounts are flagged).',
    defaultOwnerRole: 'SECURITY_COMPLIANCE',
  },

  // Control 6 — Access Control Management
  {
    safeguardId: '6.1', appliesToIG: [1, 2, 3], step: { from: 1, to: 2 },
    mergeGroup: 'identity-baseline',
    titlePattern: 'Establish a documented access granting & revoking process',
    descriptionSkeleton:
      'Document how access is granted when someone joins and revoked when they leave or change role. Align the process with the account inventory so every grant and revocation is traceable to an approval.',
    expectedEvidenceSkeleton:
      'The written joiner/mover/leaver access process and a sample of recent grant/revoke approvals.',
    defaultOwnerRole: 'OPERATIONS',
  },
  {
    safeguardId: '6.3', appliesToIG: [1, 2, 3], step: { from: 1, to: 2 },
    titlePattern: 'Require MFA for externally-exposed applications',
    descriptionSkeleton:
      'Enable multi-factor authentication on all externally accessible applications, prioritising email, VPN and admin portals. Record any application that cannot support MFA as a tracked exception.',
    expectedEvidenceSkeleton:
      'MFA configuration/screenshots per externally-exposed application and the exception list for any that cannot enforce it.',
    defaultOwnerRole: 'IT',
  },
];

/**
 * Map a CMMI maturity level to an Implementation Group tier. The depth of a
 * task is decided by the maturity it AIMS FOR, not by the organisation's own
 * IG tier — the org IG is intentionally not used by the engine:
 *
 *   L1, L2 (Initial / Managed)        → IG1 (basic, manual / ad-hoc)
 *   L3     (Defined / Documented)     → IG2 (formalised, automated)
 *   L4, L5 (Measured / Optimised)     → IG3 (advanced, continuous)
 *
 * One-liner so the boundary is easy to retune.
 */
export function cmmiToIg(cmmi: number): number {
  if (cmmi <= 2) return 1;
  if (cmmi === 3) return 2;
  return 3;
}

/**
 * Curated templates whose single-level step falls inside the [current, target]
 * maturity jump. Each template's content depth is matched against the IG
 * implied by its OWN step.to (via cmmiToIg) — not by any organisation IG.
 * Returns [] when nothing is curated; the engine then synthesises a baseline
 * from the CIS IG guidance.
 */
export function findTemplates(
  safeguardId: string,
  current: number,
  target: number,
): TaskTemplate[] {
  return TASK_TEMPLATES.filter(
    t =>
      t.safeguardId === safeguardId &&
      t.appliesToIG.includes(cmmiToIg(t.step.to)) &&
      t.step.from >= current &&
      t.step.to <= target,
  );
}
