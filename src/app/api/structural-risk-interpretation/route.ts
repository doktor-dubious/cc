// app/api/structural-risk-interpretation/route.ts
// Server-side endpoint that asks Claude Opus to write the prose
// "Structural Risk Interpretation" paragraph for a structural risk report.
//
// Inputs are constrained to a sanitized FactorSnapshot — Claude is told to
// reason ONLY from the provided facts so it cannot invent regulators, control
// frameworks, or metrics that aren't in the input.

import Anthropic                     from '@anthropic-ai/sdk';
import { NextResponse }              from 'next/server';

import { getServerSession }          from '@/lib/auth';
import { log }                       from '@/lib/log';
import type { ApiResponse }          from '@/lib/types/api';
import type { FactorSnapshot }       from '@/lib/risk-report/report-generator';

// ── Model + prompt config ─────────────────────────────────────────────────────

const MODEL = 'claude-opus-4-7';

// Stable across requests → cacheable. Any byte change here invalidates the
// prompt cache for every consumer, so keep edits intentional.
const SYSTEM_PROMPT = `You are a senior cyber-risk advisor (CISO-level) writing the "Structural Risk Interpretation" section of a client-facing structural risk report.

Audience: the client's executive sponsor (CIO/CFO/CEO) and their board. They are not security specialists.

Your task: write a tight, operational interpretation of the client's structural risk exposure — what their business model and posture mean for the way cyber risk lands on them. The reader should come away with a clear mental model of what is structurally exposed and why, not a generic security lecture.

Style guide:
- 4-6 short paragraphs, ~180-260 words total.
- Plain professional English. No buzzwords ("synergies", "leverage", "robust"). No marketing tone.
- Be concrete and operational. Prefer "an outage longer than 24 hours would interrupt customer onboarding" over "downtime poses risks".
- Name the structural drivers (sector position, IT dependency, regulatory pressure, customer access model, downtime tolerance, threat profile) — but only the ones present in the input.
- Reference the organization by name in the first sentence.
- Do NOT recommend specific products, vendors, frameworks, or CIS controls — that belongs in the Priority Focus Areas section.
- Do NOT fabricate facts. If a regulator, customer-channel detail, or maturity level is not in the input, do not assert it.
- Do NOT include headings, bullet lists, or markdown — just prose paragraphs separated by blank lines.
- Do NOT begin with filler like "In today's threat landscape" or "As cyber threats evolve".

Output: only the prose interpretation. No preamble, no closing remarks, no signature.`;

// ── Output validation ─────────────────────────────────────────────────────────

function validateInterpretation(text: string): { ok: true; text: string } | { ok: false; reason: string } {
  const trimmed = text.trim();
  if (trimmed.length < 200)     return { ok: false, reason: 'too short' };
  if (trimmed.length > 4000)    return { ok: false, reason: 'too long'  };
  // Refuse markdown headers / bullets — the renderer expects plain paragraphs.
  if (/^#|^\s*[-*]\s/m.test(trimmed)) return { ok: false, reason: 'contains markdown formatting' };
  return { ok: true, text: trimmed };
}

// ── Snapshot → grounding text ─────────────────────────────────────────────────

function snapshotToFacts(s: FactorSnapshot): string {
  const lines: string[] = [];
  lines.push(`Organization: ${s.organizationName}`);
  if (s.sector)                        lines.push(`Sector: ${s.sector}`);
  if (s.digitalMaturity)               lines.push(`Digital maturity: ${s.digitalMaturity}`);
  if (s.securityMaturity)              lines.push(`Security maturity: ${s.securityMaturity}`);
  if (s.productionDependency)          lines.push(`Production dependency on IT: ${s.productionDependency}`);
  if (s.customerAccess)                lines.push(`Customer access model: ${s.customerAccess}`);
  if (s.supplyChainPosition)           lines.push(`Supply-chain position: ${s.supplyChainPosition}`);
  if (s.downtimeTolerance)             lines.push(`Downtime tolerance: ${s.downtimeTolerance}`);
  if (s.publicFacingServices)          lines.push(`Public-facing services: ${s.publicFacingServices}`);
  if (s.targetedAttackLikelihood)      lines.push(`Threat profile: ${s.targetedAttackLikelihood}`);
  if (s.infrastructureTypes.length)    lines.push(`Infrastructure: ${s.infrastructureTypes.join(', ')}`);
  if (s.dataSensitivity.length)        lines.push(`Data handled: ${s.dataSensitivity.join(', ')}`);
  if (s.regulatoryObligations.length)  lines.push(`Regulatory obligations: ${s.regulatoryObligations.join(', ')}`);

  if (s.exposureIndicators.length) {
    lines.push('');
    lines.push('Exposure indicators (rule-based scoring — treat as authoritative):');
    for (const i of s.exposureIndicators) {
      lines.push(`  - ${i.name}: ${i.assessment} (${i.reasoning})`);
    }
  }

  if (s.priorityControlDomains.length) {
    lines.push('');
    lines.push(`Priority control domains (do not list these in your prose — they appear elsewhere): ${s.priorityControlDomains.join('; ')}`);
  }

  return lines.join('\n');
}

// ── Payload type ──────────────────────────────────────────────────────────────

type RequestBody = { factorSnapshot: FactorSnapshot };

function isFactorSnapshot(v: unknown): v is FactorSnapshot {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.organizationName === 'string'
    && Array.isArray(o.exposureIndicators)
    && Array.isArray(o.priorityControlDomains);
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  log.debug('(API : structural-risk-interpretation - POST)');

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

  let body: RequestBody;
  try {
    const raw = await request.json();
    if (!isFactorSnapshot(raw?.factorSnapshot)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Invalid factorSnapshot' },
        { status: 400 },
      );
    }
    body = { factorSnapshot: raw.factorSnapshot };
  } catch {
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const facts = snapshotToFacts(body.factorSnapshot);

  try {
    const client = new Anthropic({ apiKey });

    // Stream + .finalMessage() — adaptive thinking on Opus 4.7 can take a
    // while; streaming avoids request timeouts.
    const stream = client.messages.stream({
      model:      MODEL,
      max_tokens: 1500,
      thinking:   { type: 'adaptive' },
      system: [
        // The persona/style block is stable → cache it across requests.
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Write the Structural Risk Interpretation for the following client. ' +
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
      log.warn({ reason: validation.reason }, 'Claude interpretation rejected by validator');
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Generated text rejected: ${validation.reason}` },
        { status: 502 },
      );
    }

    log.info(
      {
        organization:   body.factorSnapshot.organizationName,
        inputTokens:    final.usage.input_tokens,
        outputTokens:   final.usage.output_tokens,
        cacheRead:      final.usage.cache_read_input_tokens,
        cacheCreate:    final.usage.cache_creation_input_tokens,
      },
      'Structural risk interpretation generated',
    );

    return NextResponse.json<ApiResponse<{ interpretation: string }>>({
      success: true,
      data:    { interpretation: validation.text },
    });
  } catch (error) {
    log.error({ error: error instanceof Error ? error.message : String(error) }, 'Claude call failed');
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to generate interpretation' },
      { status: 502 },
    );
  }
}
