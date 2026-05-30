// app/api/task-generation/preview/route.ts
//
// Roadmap → Tasks, preview (no writes). For one roadmap phase it:
//   1. Loads the org's IG, the latest finalized GAP report (current/target CMMI
//      per safeguard), the phase's roadmap decisions, and the advisor's GAP notes.
//   2. Runs the deterministic engine (Step 1) → guaranteed baseline tasks.
//   3. If an LLM is configured, specializes each baseline task to THIS org using
//      the notes/context (Step 2). Any failure degrades, per-task, to baseline.
//
// Nothing is persisted here — the advisor reviews/edits the returned drafts and
// the /commit route writes the approved ones.

import Anthropic            from '@anthropic-ai/sdk';
import { NextResponse }     from 'next/server';

import { getServerSession } from '@/lib/auth';
import { canCreateTasks, validateAdminOrganizationAccess } from '@/lib/auth/permissions';
import { log }              from '@/lib/log';
import { prisma }           from '@/lib/prisma';
import type { ApiResponse } from '@/lib/types/api';
import { getControlById }   from '@/lib/constants/cis-controls';
import { expandPhase, type PhaseSafeguardInput, type TaskCandidate } from '@/lib/tasks/task-generation';

const MODEL = 'claude-opus-4-7';

// Step 2 LLM specialization is enabled by the global application setting
// `Settings.enableLlmTaskSpecialization` (toggled on /settings/application).
// The deterministic Step-1 baseline always runs; when this is off, or the LLM
// call fails, the advisor still gets the baseline tasks with an explanatory
// banner in the dialog. Default for the setting is `false`.

// Stable → cacheable. Editing this invalidates the prompt cache for all callers.
const SYSTEM_PROMPT = `You are a senior cyber-security advisor turning roadmap maturity steps into concrete implementation tasks for a specific client organisation.

You are given a set of BASELINE tasks (each already correct and deliverable) plus grounding facts: the safeguards each task covers, the maturity step, light organisational context (sector, size, Implementation Group), and the advisor's private notes.

For each task, rewrite its title, description and expectedEvidence so they are specific and actionable for THIS organisation. Use the advisor notes and context to make the task concrete; keep the engineering intent of the baseline.

Rules:
- Keep the same scope as the baseline task. Do NOT split, merge, drop or invent tasks.
- title: a short imperative phrase (max ~90 chars).
- description: 2-5 sentences, plain professional English, what to actually do.
- expectedEvidence: 1-3 sentences naming the artefacts that prove completion.
- Describe tool/process CATEGORIES; never name specific vendors or products.
- Do NOT leak the advisor's internal notes verbatim and do NOT invent regulators, metrics or facts not implied by the inputs.
- No markdown, no bullet characters, no headings.

Output: a single JSON object whose keys are the task "key" values you were given. Each value is an object with exactly "title", "description", "expectedEvidence" (plain strings). Output ONLY that JSON object.`;

type Body = { organizationId?: string; phase?: number };

type Draft = {
  key:              string;
  title:            string;
  description:      string;
  expectedEvidence: string;
  safeguardIds:     string[];
  ownerRole:        string | null;
  steps:            string[];
  source:           string;
  aiApplied:        boolean;
  baseline:         { title: string; description: string; expectedEvidence: string };
};

function clamp(s: unknown, min: number, max: number): string | null {
  if (typeof s !== 'string') return null;
  const t = s.trim().replace(/\s*\n\s*/g, '\n').replace(/[ \t]+/g, ' ');
  if (t.length < min || t.length > max) return null;
  return t;
}

// Map an LLM call failure to a short, user-actionable sentence. Falls back to
// the raw message so a novel error class still tells the advisor what broke.
function formatLlmError(err: unknown): string {
  const e   = err as { status?: number; message?: string };
  const sts = typeof e.status === 'number' ? e.status : undefined;
  const msg = (typeof e.message === 'string' ? e.message : String(err)).slice(0, 280);
  if (sts === 401) return 'Anthropic rejected the API key (401). Check CLAUDE_API in your environment.';
  if (sts === 402 || /credit|billing|quota|insufficient/i.test(msg))
    return 'Anthropic credits exhausted or billing issue. Top up at console.anthropic.com.';
  if (sts === 429) return 'Anthropic rate-limited the request (429). Try again in a moment.';
  if (sts === 400) return `Bad request to Anthropic (400): ${msg}`;
  if (sts === 403) return 'Anthropic returned 403 (permission denied). Check the API key has access to the requested model.';
  if (sts && sts >= 500) return `Anthropic API server error (${sts}). Try again later.`;
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|fetch failed|network/i.test(msg))
    return 'Could not reach the Anthropic API. Check network connectivity.';
  return `LLM call failed: ${msg}`;
}

// Build the grounding facts block fed to the model alongside the baseline tasks.
function buildFacts(
  candidates: TaskCandidate[],
  notesBySafeguard: Map<string, string>,
  ctx: { sector: string | null; size: string | null },
): string {
  const lines: string[] = [];
  lines.push(`Organisation context: sector ${ctx.sector ?? 'unknown'}, size ${ctx.size ?? 'unknown'}.`);
  lines.push('');
  lines.push('BASELINE TASKS:');
  for (const c of candidates) {
    lines.push(`- key: ${c.key}`);
    lines.push(`  baseline title: ${c.title}`);
    lines.push(`  baseline description: ${c.description}`);
    lines.push(`  maturity steps: ${c.steps.join(', ')}`);
    for (const sid of c.safeguardIds) {
      const sg = getControlById(Number(sid.split('.')[0]))?.safeguards.find(s => s.id === sid);
      if (sg) lines.push(`  safeguard ${sid}: ${sg.title} — ${sg.definition}`);
      const note = notesBySafeguard.get(sid)?.trim();
      if (note) lines.push(`  advisor note for ${sid}: ${note}`);
    }
  }
  return lines.join('\n');
}

export async function POST(request: Request) {
  log.debug('(API : task-generation/preview - POST)');

  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { profileId, role } = session.user;
  if (!role || !canCreateTasks(role)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const organizationId = body.organizationId;
  const phase = body.phase;
  if (!organizationId || typeof phase !== 'number' || phase < 1 || phase > 4) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'organizationId and phase (1..4) are required' }, { status: 400 });
  }

  if (!(await validateAdminOrganizationAccess(role, profileId, organizationId))) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Not authorized for this organization' }, { status: 403 });
  }

  try {
    // ── Load inputs ──────────────────────────────────────────────────────────
    const [org, report, roadmapItems, noteRows, appSettings] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { naceSection: true, size: true },
      }),
      prisma.gapReport.findFirst({
        where: { organizationId },
        orderBy: { version: 'desc' },
        include: { cmmiValues: true },
      }),
      prisma.organizationRoadmapItem.findMany({ where: { organizationId, phase } }),
      prisma.organizationCisNote.findMany({ where: { organizationId, itemType: 'safeguard' } }),
      prisma.settings.findFirst({
        where: { active: true },
        select: { enableLlmTaskSpecialization: true },
      }),
    ]);
    const llmEnabled = appSettings?.enableLlmTaskSpecialization === true;

    if (!org) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Organization not found' }, { status: 404 });
    }
    if (!report) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'No finalized GAP report for this organization' }, { status: 400 });
    }

    const reportCmmi = new Map<string, { current: number; target: number }>();
    for (const r of report.cmmiValues) reportCmmi.set(r.safeguardId, { current: r.currentCmmi, target: r.targetCmmi });

    const notesBySafeguard = new Map<string, string>();
    for (const n of noteRows) notesBySafeguard.set(n.itemId, n.content);

    // Build the phase input from the roadmap decisions assigned to this phase.
    // A safeguard only belongs on the roadmap if the finalized report has it
    // with a real gap (target > current) — exactly the set the Roadmap page
    // shows. Roadmap rows can linger for safeguards later excluded or closed,
    // so we skip any whose safeguard isn't a current report gap (otherwise a
    // stale row would fabricate a task for a safeguard not on the roadmap).
    const safeguards: PhaseSafeguardInput[] = [];
    for (const item of roadmapItems) {
      const rc = reportCmmi.get(item.safeguardId);
      if (!rc || rc.target <= rc.current) continue;
      const current = rc.current;
      const target = item.targetCmmi ?? rc.target;
      if (target > current) {
        safeguards.push({ safeguardId: item.safeguardId, current, target, owner: item.owner });
      }
    }

    if (safeguards.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { phase, aiApplied: false, drafts: [] as Draft[] },
        message: 'No safeguards are assigned to this phase yet. Assign phases on the Roadmap first.',
      });
    }

    // ── Step 1: deterministic baseline (always runs) ──────────────────────────
    const candidates = expandPhase({ safeguards });

    // ── Step 2: LLM specialization (optional, degradable per-task) ────────────
    // We always ship the deterministic baseline; aiError reports WHY the LLM
    // step didn't refine the tasks so the advisor isn't left guessing.
    const apiKey = process.env.CLAUDE_API;
    const refinements = new Map<string, { title: string; description: string; expectedEvidence: string }>();
    let aiError: string | null = null;

    if (llmEnabled && candidates.length > 0) {
      if (!apiKey) {
        aiError = 'AI specialisation is enabled but CLAUDE_API is not set in the server environment.';
        log.warn('task-generation preview: enableLlmTaskSpecialization is on but CLAUDE_API is missing');
      } else {
        try {
          const facts = buildFacts(candidates, notesBySafeguard, {
            sector: org.naceSection ?? null, size: org.size ?? null,
          });
          const client = new Anthropic({ apiKey });
          const stream = client.messages.stream({
            model:      MODEL,
            max_tokens: 3000,
            thinking:   { type: 'adaptive' },
            system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
            messages: [{
              role: 'user',
              content: [{
                type: 'text',
                text: 'Specialize these baseline tasks for the organisation. Use ONLY these facts.\n\n--- FACTS ---\n' + facts + '\n--- END FACTS ---',
              }],
            }],
          });
          const final = await stream.finalMessage();
          const textBlock = final.content.find(b => b.type === 'text');
          if (!textBlock || textBlock.type !== 'text') {
            aiError = 'Anthropic returned a response with no text content.';
          } else {
            const cleaned = textBlock.text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
            let parsed: Record<string, { title?: unknown; description?: unknown; expectedEvidence?: unknown }> | null = null;
            try {
              parsed = JSON.parse(cleaned);
            } catch {
              aiError = 'Anthropic response was not valid JSON.';
            }
            if (parsed) {
              for (const c of candidates) {
                const r = parsed[c.key];
                if (!r) continue;
                const title = clamp(r.title, 6, 140);
                const description = clamp(r.description, 20, 1500);
                const expectedEvidence = clamp(r.expectedEvidence, 10, 800);
                if (title && description && expectedEvidence) {
                  refinements.set(c.key, { title, description, expectedEvidence });
                }
              }
              if (refinements.size === 0) {
                aiError = 'Anthropic responded but no task was successfully refined (output failed length/shape validation).';
              }
            }
            log.info(
              { phase, candidates: candidates.length, refined: refinements.size,
                inputTokens: final.usage.input_tokens, outputTokens: final.usage.output_tokens,
                cacheRead: final.usage.cache_read_input_tokens },
              'task-generation preview: LLM specialization applied',
            );
          }
        } catch (err) {
          aiError = formatLlmError(err);
          log.warn(
            { err: err instanceof Error ? err.message : String(err), aiError },
            'task-generation preview: LLM step failed, using baseline',
          );
        }
      }
    }

    const drafts: Draft[] = candidates.map(c => {
      const r = refinements.get(c.key);
      return {
        key:              c.key,
        title:            r?.title ?? c.title,
        description:      r?.description ?? c.description,
        expectedEvidence: r?.expectedEvidence ?? c.expectedEvidence,
        safeguardIds:     c.safeguardIds,
        ownerRole:        c.ownerRole,
        steps:            c.steps,
        source:           c.source,
        aiApplied:        !!r,
        baseline:         { title: c.title, description: c.description, expectedEvidence: c.expectedEvidence },
      };
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { phase, aiApplied: refinements.size > 0, aiError, drafts },
    });
  } catch (error) {
    log.error({ error: error instanceof Error ? error.message : String(error) }, 'task-generation preview failed');
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to generate task preview' }, { status: 500 });
  }
}
