// app/api/per-safeguard-exposure-interpretation/route.ts
// Server-side endpoint that asks Claude Opus to write a prose
// "Exposure Summary" for the per-safeguard financial exposure page.
//
// Mirrors /api/structural-risk-interpretation: the client posts a sanitised
// snapshot of the spectrum, and the LLM is told to reason ONLY from those
// facts so it can't invent regulators, vendors, or metrics.

import Anthropic                     from '@anthropic-ai/sdk';
import { NextResponse }              from 'next/server';

import { getServerSession }          from '@/lib/auth';
import { log }                       from '@/lib/log';
import type { ApiResponse }          from '@/lib/types/api';

// ── Model + prompt config ─────────────────────────────────────────────────────

const MODEL = 'claude-opus-4-7';

// Stable across requests → cacheable. Any byte change here invalidates the
// prompt cache for every consumer, so keep edits intentional.
const SYSTEM_PROMPT = `You are a senior cyber-risk advisor (CISO-level) writing the "Exposure Summary" section of a per-safeguard financial exposure report.

Audience: the client's executive sponsor (CIO/CFO/CEO) and their board. They are not security specialists.

Your task: write a tight, operational summary of what the per-safeguard financial-exposure numbers mean. The reader should come away understanding:
- The magnitude and spread between best-case (L4, high maturity) and worst-case (L1, no maturity) exposure
- Which CIS controls drive the most financial risk for this organization
- Which cost categories dominate (downtime, incident response, regulatory, customer churn, etc.)
- What the spread implies for where investing in maturity moves the needle

Style guide:
- 4-6 short paragraphs, ~180-260 words total.
- Plain professional English. No buzzwords ("synergies", "leverage", "robust"). No marketing tone.
- Be concrete with the numbers provided. Prefer "moving from L1 to L4 maturity reduces annual expected loss from €X to €Y" over "improving maturity reduces risk".
- Reference the organization by name in the first sentence.
- Cite specific CIS control names and cost categories from the input — but only the ones present.
- Do NOT recommend specific products, vendors, or frameworks. Stay descriptive, not prescriptive.
- Do NOT fabricate facts. If a metric or driver is not in the input, do not assert it.
- Do NOT include headings, bullet lists, or markdown — just prose paragraphs separated by blank lines.
- Do NOT begin with filler like "In today's threat landscape" or "As cyber threats evolve".

Output: only the prose summary. No preamble, no closing remarks, no signature.`;

// ── Snapshot shape ────────────────────────────────────────────────────────────

type Money = { best: number | null; worst: number | null };

export type ExposureSnapshot = {
  organizationName : string;
  sector?          : string | null;
  size?            : string | null;
  // Top-line ranges. "best" = L4 (high maturity), "worst" = L1 (no maturity).
  totalBreachCost          : Money;
  totalAvoidableLoss       : Money;
  breachProbability        : Money;  // 0..1
  totalAnnualExpectedLoss  : Money;
  // Top controls by L1 (worst-case) avoidable loss.
  topControls : Array<{
    controlId       : number;
    controlTitle    : string;
    avoidableBest   : number;
    avoidableWorst  : number;
    topCategory     : string | null;
  }>;
  // Top cost categories (share of L1 total avoidable loss, 0..1).
  topCostCategories : Array<{ category: string; share: number }>;
};

function isMoney(v: unknown): v is Money {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (o.best === null || typeof o.best === 'number')
      && (o.worst === null || typeof o.worst === 'number');
}

function isSnapshot(v: unknown): v is ExposureSnapshot {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.organizationName === 'string'
    && isMoney(o.totalBreachCost)
    && isMoney(o.totalAvoidableLoss)
    && isMoney(o.breachProbability)
    && isMoney(o.totalAnnualExpectedLoss)
    && Array.isArray(o.topControls)
    && Array.isArray(o.topCostCategories);
}

// ── Snapshot → grounding text ─────────────────────────────────────────────────

function fmtEur(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 10_000)    return `€${Math.round(v / 1_000)}K`;
  if (v >= 1_000)     return `€${(v / 1_000).toFixed(1)}K`;
  return `€${Math.round(v)}`;
}

function fmtPct(p: number | null | undefined): string {
  if (p === null || p === undefined || !Number.isFinite(p)) return '—';
  return `${(p * 100).toFixed(1)}%`;
}

function snapshotToFacts(s: ExposureSnapshot): string {
  const lines: string[] = [];
  lines.push(`Organization: ${s.organizationName}`);
  if (s.sector) lines.push(`Sector: ${s.sector}`);
  if (s.size)   lines.push(`Size band: ${s.size}`);
  lines.push('');
  lines.push('Top-line exposure ranges (L4 = best case / high maturity → L1 = worst case / no maturity):');
  lines.push(`  - Total breach cost (loss-given-event):       ${fmtEur(s.totalBreachCost.best)} → ${fmtEur(s.totalBreachCost.worst)}`);
  lines.push(`  - Total avoidable loss:                       ${fmtEur(s.totalAvoidableLoss.best)} → ${fmtEur(s.totalAvoidableLoss.worst)}`);
  lines.push(`  - Annual breach probability:                  ${fmtPct(s.breachProbability.best)} → ${fmtPct(s.breachProbability.worst)}`);
  lines.push(`  - Annual expected loss (probability × loss):  ${fmtEur(s.totalAnnualExpectedLoss.best)} → ${fmtEur(s.totalAnnualExpectedLoss.worst)}`);

  if (s.topControls.length) {
    lines.push('');
    lines.push('Top CIS controls by worst-case (L1) avoidable loss:');
    for (const c of s.topControls) {
      const driver = c.topCategory ? ` — driver: ${c.topCategory}` : '';
      lines.push(`  - Control ${c.controlId} (${c.controlTitle}): ${fmtEur(c.avoidableBest)} → ${fmtEur(c.avoidableWorst)}${driver}`);
    }
  }

  if (s.topCostCategories.length) {
    lines.push('');
    lines.push('Dominant cost categories (share of worst-case avoidable loss):');
    for (const c of s.topCostCategories) {
      lines.push(`  - ${c.category}: ${(c.share * 100).toFixed(0)}%`);
    }
  }

  return lines.join('\n');
}

// ── Output validation ─────────────────────────────────────────────────────────

function validateInterpretation(text: string): { ok: true; text: string } | { ok: false; reason: string } {
  const trimmed = text.trim();
  if (trimmed.length < 200)  return { ok: false, reason: 'too short' };
  if (trimmed.length > 4000) return { ok: false, reason: 'too long'  };
  if (/^#|^\s*[-*]\s/m.test(trimmed)) return { ok: false, reason: 'contains markdown formatting' };
  return { ok: true, text: trimmed };
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  log.debug('(API : per-safeguard-exposure-interpretation - POST)');

  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const apiKey = process.env.CLAUDE_API;
  if (!apiKey) {
    log.error('CLAUDE_API not configured');
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'LLM provider not configured' },
      { status: 503 },
    );
  }

  let snapshot: ExposureSnapshot;
  try {
    const raw = await request.json();
    if (!isSnapshot(raw?.snapshot)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid snapshot' },
        { status: 400 },
      );
    }
    snapshot = raw.snapshot as ExposureSnapshot;
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const facts = snapshotToFacts(snapshot);

  try {
    const client = new Anthropic({ apiKey });

    const stream = client.messages.stream({
      model:      MODEL,
      max_tokens: 1500,
      thinking:   { type: 'adaptive' },
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Write the Exposure Summary for the following client. ' +
                'Use ONLY the facts below — do not invent regulators, controls, vendors, or metrics that are not stated.\n\n' +
                '--- FACTS ---\n' +
                facts +
                '\n--- END FACTS ---',
            },
          ],
        },
      ],
    });

    const final = await stream.finalMessage();

    const textBlock = final.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      log.error({ stopReason: final.stop_reason }, 'Claude response had no text block');
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'LLM returned no text' },
        { status: 502 },
      );
    }

    const validation = validateInterpretation(textBlock.text);
    if (!validation.ok) {
      log.warn({ reason: validation.reason }, 'Claude exposure summary rejected by validator');
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Generated text rejected: ${validation.reason}` },
        { status: 502 },
      );
    }

    log.info(
      {
        organization: snapshot.organizationName,
        inputTokens:  final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
        cacheRead:    final.usage.cache_read_input_tokens,
        cacheCreate:  final.usage.cache_creation_input_tokens,
      },
      'Per-safeguard exposure summary generated',
    );

    return NextResponse.json<ApiResponse<{ interpretation: string }>>({
      success: true,
      data:    { interpretation: validation.text },
    });
  } catch (error) {
    log.error({ error: error instanceof Error ? error.message : String(error) }, 'Claude call failed');
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to generate exposure summary' },
      { status: 502 },
    );
  }
}
