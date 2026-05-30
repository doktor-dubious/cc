// lib/tasks/task-generation.ts
//
// Step 1 of the Roadmap → Tasks pipeline: the deterministic engine. Given the
// safeguards in one roadmap phase (each with a current→target CMMI jump), it
// expands them into canonical baseline tasks.
//
// Properties:
//   • No LLM, no DB, no I/O — pure function of its inputs. Reproducible, free,
//     unit-testable, and the guaranteed fallback when the LLM step is skipped.
//   • Coverage guarantee — every safeguard yields at least one task: a curated
//     template where one exists (task-templates.ts), otherwise a baseline
//     synthesized from the CIS control's own IG guidance.
//   • Consolidation — templates sharing a `mergeGroup` collapse into ONE task
//     spanning every contributing safeguard (the many-to-many relationship).
//   • IG depth is derived from the CMMI maturity being aimed for, via
//     cmmiToIg() in task-templates.ts. The ORG's Implementation Group is
//     intentionally NOT consulted — task depth follows the maturity goal.

import { getControlById, type Safeguard, type CISControl } from '@/lib/constants/cis-controls';
import { findTemplates, cmmiToIg, type TaskTemplate } from './task-templates';
import type { RoadmapOwner } from '@prisma/client';

export type PhaseSafeguardInput = {
  safeguardId: string;
  current:     number;                 // current CMMI level (0..5; 0 = Not Started)
  target:      number;                 // target CMMI level (> current)
  owner?:      RoadmapOwner | null;    // advisor-chosen owner from the roadmap, if any
};

export type PhaseInput = {
  safeguards: PhaseSafeguardInput[];
};

export type TaskCandidate = {
  key:              string;            // stable id for dedupe + UI selection
  title:            string;
  description:      string;
  expectedEvidence: string;
  safeguardIds:     string[];          // ≥1; >1 when consolidated via mergeGroup
  ownerRole:        RoadmapOwner | null;
  mergeGroup:       string | null;
  steps:            string[];          // human-readable, e.g. "1.1 (CMMI 1→2)"
  source:           'template' | 'derived';
};

const clampIg = (ig: number): number => Math.min(3, Math.max(1, Math.round(ig)));

// Resolve a safeguard and its parent control from the CIS constants.
function lookup(safeguardId: string): { sg: Safeguard; control: CISControl } | null {
  const controlId = Number(safeguardId.split('.')[0]);
  const control = getControlById(controlId);
  const sg = control?.safeguards.find(s => s.id === safeguardId);
  if (!control || !sg) return null;
  return { sg, control };
}

// IG-appropriate guidance block from a safeguard ("ig1" | "ig2" | "ig3").
function igBlock(sg: Safeguard, ig: number) {
  const key = (`ig${clampIg(ig)}` as 'ig1' | 'ig2' | 'ig3');
  return sg[key];
}

function fill(
  pattern: string,
  ctx: { id: string; safeguard: string; control: string; from: number; target: number },
): string {
  return pattern
    .replaceAll('{id}', ctx.id)
    .replaceAll('{safeguard}', ctx.safeguard)
    .replaceAll('{control}', ctx.control)
    .replaceAll('{from}', String(ctx.from))
    .replaceAll('{target}', String(ctx.target));
}

const stepLabel = (id: string, from: number, to: number) =>
  from <= 0 ? `${id} (Not Started → CMMI ${to})` : `${id} (CMMI ${from}→${to})`;

// A flat, pre-merge candidate produced from one template or one derived jump.
type Raw = TaskCandidate & { _mergeGroup: string | null };

function fromTemplate(
  t: TaskTemplate,
  sg: Safeguard,
  control: CISControl,
  owner: RoadmapOwner | null,
): Raw {
  const ctx = { id: sg.id, safeguard: sg.title, control: control.title, from: t.step.from, target: t.step.to };
  return {
    key:              `tpl:${sg.id}:${t.step.from}-${t.step.to}:${t.titlePattern.slice(0, 24)}`,
    title:            fill(t.titlePattern, ctx),
    description:      fill(t.descriptionSkeleton, ctx),
    expectedEvidence: fill(t.expectedEvidenceSkeleton, ctx),
    safeguardIds:     [sg.id],
    ownerRole:        owner ?? t.defaultOwnerRole,
    mergeGroup:       t.mergeGroup ?? null,
    steps:            [stepLabel(sg.id, t.step.from, t.step.to)],
    source:           'template',
    _mergeGroup:      t.mergeGroup ?? null,
  };
}

// Synthesize a baseline task from the CIS IG guidance when nothing is curated.
// The IG depth is taken from the TARGET maturity level (cmmiToIg), not the
// organisation's IG — the org IG is intentionally not consulted by the engine.
function derived(
  sg: Safeguard,
  control: CISControl,
  current: number,
  target: number,
  owner: RoadmapOwner | null,
): Raw {
  const block = igBlock(sg, cmmiToIg(target));
  // Plain, end-user-facing instruction: just what to do. No safeguard id, no
  // CMMI level, no IG jargon. Lead with the scope ("what"), then the approach
  // ("how"). The task title is the safeguard's own (already imperative) name.
  const scope    = block.scope && block.scope !== 'N/A' ? block.scope.trim() : '';
  const approach = block.approach?.trim() ?? '';
  const description = [scope, approach].filter(Boolean).join(' ') || sg.definition;
  return {
    key:              `sg:${sg.id}`,
    title:            sg.title,
    description,
    expectedEvidence: 'Records or documentation that demonstrate this is implemented and maintained.',
    safeguardIds:     [sg.id],
    ownerRole:        owner ?? null,
    mergeGroup:       null,
    steps:            [stepLabel(sg.id, current, target)],
    source:           'derived',
    _mergeGroup:      null,
  };
}

/**
 * Expand one roadmap phase into deterministic baseline task candidates.
 * Order of the returned list is stable: merged/consolidated tasks first
 * (in first-seen order), then standalone tasks in safeguard order.
 */
export function expandPhase(input: PhaseInput): TaskCandidate[] {
  const raws: Raw[] = [];
  for (const s of input.safeguards) {
    if (!(s.target > s.current)) continue;        // nothing to improve
    const found = lookup(s.safeguardId);
    if (!found) continue;                         // unknown safeguard id — skip silently
    const { sg, control } = found;
    const owner = s.owner ?? null;

    // Template + derived IG depth come from the CMMI maturity being aimed for,
    // not the organisation's IG — see cmmiToIg() in task-templates.ts.
    const templates = findTemplates(s.safeguardId, s.current, s.target);
    if (templates.length > 0) {
      for (const t of templates) raws.push(fromTemplate(t, sg, control, owner));
    } else {
      raws.push(derived(sg, control, s.current, s.target, owner));
    }
  }

  // Consolidate by mergeGroup: collapse every contributing raw into one task.
  const mergedByGroup = new Map<string, TaskCandidate>();
  const standalone: TaskCandidate[] = [];

  for (const r of raws) {
    const { _mergeGroup, ...candidate } = r;
    if (!_mergeGroup) { standalone.push(candidate); continue; }

    const existing = mergedByGroup.get(_mergeGroup);
    if (!existing) {
      mergedByGroup.set(_mergeGroup, { ...candidate, key: `merge:${_mergeGroup}` });
      continue;
    }
    // Fold this raw into the group's task.
    existing.safeguardIds = Array.from(new Set([...existing.safeguardIds, ...candidate.safeguardIds]));
    existing.steps        = Array.from(new Set([...existing.steps, ...candidate.steps]));
    existing.ownerRole    = existing.ownerRole ?? candidate.ownerRole;
    if (!existing.description.includes(candidate.description)) {
      existing.description = `${existing.description}\n\n${candidate.description}`;
    }
    if (!existing.expectedEvidence.includes(candidate.expectedEvidence)) {
      existing.expectedEvidence = `${existing.expectedEvidence}\n${candidate.expectedEvidence}`;
    }
  }

  return [...mergedByGroup.values(), ...standalone];
}
