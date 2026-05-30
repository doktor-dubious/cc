// app/api/roadmap-insight/route.ts
//
// Generates the three AI insights shown on the Roadmap page for a single
// safeguard (business relevance, customer exposure, implementation insight),
// persists them on the OrganizationRoadmapItem row as a cache, and returns
// them. Mirrors /api/per-safeguard-exposure-interpretation: the model is told
// to reason ONLY from the facts we pass so it can't invent specifics.
//
// The safeguard's authoritative text (title/definition/why) is looked up from
// the CIS constants server-side; the client only sends light context.

import Anthropic            from '@anthropic-ai/sdk';
import { NextResponse }     from 'next/server';

import { getServerSession } from '@/lib/auth';
import { log }              from '@/lib/log';
import { prisma }           from '@/lib/prisma';
import type { ApiResponse } from '@/lib/types/api';
import { getControlById, CIS_CONTROLS, type Safeguard } from '@/lib/constants/cis-controls';

const MODEL = 'claude-opus-4-7';

// Stable → cacheable. Any edit invalidates the prompt cache for all consumers.
const SYSTEM_PROMPT = `You are a senior cyber-risk advisor writing decision-support notes for a security improvement roadmap.

For a single CIS Critical Security Control safeguard, you write three short, distinct insights that help an advisor decide how to prioritise raising its maturity. The audience is the advisor and, ultimately, the client's executives.

You will be given the safeguard's official text, the maturity gap (current CMMI level → target CMMI level), and light organisational context (sector, size band).

Write exactly three insights:
1. "businessRelevance" — why closing this gap matters to THIS organisation's business continuity, operations, or obligations. Tie it to the sector/size when given.
2. "customerExposure" — how a weakness here could affect the organisation's customers, contracts, or external trust.
3. "implementationInsight" — what raising maturity to the target level practically involves (process, tooling categories, effort drivers). Describe categories, never name specific vendors or products.

Rules:
- Each insight is 1-3 lines (roughly 12-40 words). Plain professional English. No markdown, no bullet characters, no headings.
- Be concrete and specific to the safeguard's intent. Do NOT restate the safeguard definition verbatim.
- Do NOT invent regulators, metrics, vendors, or facts not implied by the inputs.
- No buzzwords ("synergy", "leverage", "robust", "best-in-class").
- No preamble or closing remarks.

Output: a single JSON object with exactly these keys: "businessRelevance", "customerExposure", "implementationInsight". Values are plain strings. Output ONLY the JSON object, nothing else.`;

type InsightPayload = {
  organizationId: string;
  safeguardId:    string;
  currentCmmi?:   number;
  targetCmmi?:    number;
  sector?:        string | null;
  size?:          string | null;
};

function findSafeguard(safeguardId: string): { sg: Safeguard; controlTitle: string } | null {
  const controlId = Number(safeguardId.split('.')[0]);
  const control = getControlById(controlId) ?? CIS_CONTROLS.find(c => c.safeguards.some(s => s.id === safeguardId));
  if (!control) return null;
  const sg = control.safeguards.find(s => s.id === safeguardId);
  if (!sg) return null;
  return { sg, controlTitle: control.title };
}

function buildFacts(p: InsightPayload, sg: Safeguard, controlTitle: string): string {
  const lines: string[] = [];
  lines.push(`Safeguard ${sg.id}: ${sg.title}`);
  lines.push(`Parent control: ${controlTitle}`);
  lines.push(`Definition: ${sg.definition}`);
  lines.push(`Purpose: ${sg.purpose}`);
  lines.push(`Why it matters: ${sg.why}`);
  if (typeof p.currentCmmi === 'number' && typeof p.targetCmmi === 'number') {
    lines.push(`Maturity gap: raising from CMMI level ${p.currentCmmi} to level ${p.targetCmmi}.`);
  }
  if (p.sector) lines.push(`Organisation sector (NACE): ${p.sector}`);
  if (p.size)   lines.push(`Organisation size band: ${p.size}`);
  return lines.join('\n');
}

// One line clamp so a runaway model response can't poison the cache.
function clampLine(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const t = s.trim().replace(/\s+/g, ' ');
  if (t.length < 8 || t.length > 400) return null;
  return t;
}

export async function POST(request: Request) {
  log.debug('(API : roadmap-insight - POST)');

  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.CLAUDE_API;
  if (!apiKey) {
    log.error('CLAUDE_API not configured');
    return NextResponse.json<ApiResponse>({ success: false, error: 'LLM provider not configured' }, { status: 503 });
  }

  let payload: InsightPayload;
  try {
    const raw = await request.json();
    if (!raw || typeof raw.organizationId !== 'string' || typeof raw.safeguardId !== 'string') {
      return NextResponse.json<ApiResponse>({ success: false, error: 'organizationId and safeguardId required' }, { status: 400 });
    }
    payload = raw as InsightPayload;
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const found = findSafeguard(payload.safeguardId);
  if (!found) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unknown safeguard' }, { status: 400 });
  }

  const facts = buildFacts(payload, found.sg, found.controlTitle);

  try {
    const client = new Anthropic({ apiKey });

    const stream = client.messages.stream({
      model:      MODEL,
      max_tokens: 800,
      thinking:   { type: 'adaptive' },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Write the three roadmap insights for the following safeguard. ' +
                'Use ONLY these facts.\n\n--- FACTS ---\n' + facts + '\n--- END FACTS ---',
            },
          ],
        },
      ],
    });

    const final = await stream.finalMessage();
    const textBlock = final.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      log.error({ stopReason: final.stop_reason }, 'Claude roadmap-insight had no text block');
      return NextResponse.json<ApiResponse>({ success: false, error: 'LLM returned no text' }, { status: 502 });
    }

    // Parse the JSON object. Strip any stray code fences defensively.
    const cleaned = textBlock.text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    let parsed: { businessRelevance?: unknown; customerExposure?: unknown; implementationInsight?: unknown };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      log.warn({ raw: cleaned.slice(0, 200) }, 'roadmap-insight: response was not valid JSON');
      return NextResponse.json<ApiResponse>({ success: false, error: 'LLM returned malformed output' }, { status: 502 });
    }

    const business = clampLine(parsed.businessRelevance);
    const customer = clampLine(parsed.customerExposure);
    const impl     = clampLine(parsed.implementationInsight);
    if (!business || !customer || !impl) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'LLM output failed validation' }, { status: 502 });
    }

    const generatedAt = new Date();
    await prisma.organizationRoadmapItem.upsert({
      where:  { organizationId_safeguardId: { organizationId: payload.organizationId, safeguardId: payload.safeguardId } },
      create: {
        organizationId:          payload.organizationId,
        safeguardId:             payload.safeguardId,
        aiBusinessRelevance:     business,
        aiCustomerExposure:      customer,
        aiImplementationInsight: impl,
        aiGeneratedAt:           generatedAt,
      },
      update: {
        aiBusinessRelevance:     business,
        aiCustomerExposure:      customer,
        aiImplementationInsight: impl,
        aiGeneratedAt:           generatedAt,
      },
    });

    log.info(
      {
        safeguardId:  payload.safeguardId,
        inputTokens:  final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
        cacheRead:    final.usage.cache_read_input_tokens,
      },
      'Roadmap insight generated',
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        aiBusinessRelevance:     business,
        aiCustomerExposure:      customer,
        aiImplementationInsight: impl,
        aiGeneratedAt:           generatedAt.toISOString(),
      },
    });
  } catch (error) {
    log.error({ error: error instanceof Error ? error.message : String(error) }, 'roadmap-insight Claude call failed');
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to generate insights' }, { status: 502 });
  }
}
