// app/api/client-exposure-interpretation/route.ts
// Server-side endpoint that asks Claude Opus to write the prose
// "Exposure Narrative" for a Client Exposure (CES) report.
//
// Inputs are constrained to a sanitized CesFactorSnapshot — Claude is told to
// reason ONLY from the provided facts so it cannot invent regulators,
// frameworks, or metrics that aren't in the input.

import Anthropic                     from '@anthropic-ai/sdk';
import { NextResponse }              from 'next/server';

import { getServerSession }          from '@/lib/auth';
import { log }                       from '@/lib/log';
import type { ApiResponse }          from '@/lib/types/api';
import type { CesFactorSnapshot }    from '@/lib/ces/ces-report-generator';

const MODEL = 'claude-opus-4-7';

const SYSTEM_PROMPT = `You are a senior third-party risk advisor (CISO/Head of Procurement level) writing the "Exposure Narrative" section of a client-facing Client Exposure report.

Audience: the client's executive sponsor (CIO/CFO/CEO/Head of Risk) and their board. They are not security specialists.

Your task: write a tight, operational interpretation of the customer relationship's exposure profile — what the regulatory, contractual, operational, brand, and technical posture mean for how risk lands on this engagement. The reader should come away with a clear mental model of where the exposure concentrates and why, not a generic third-party-risk lecture.

Style guide:
- 4-6 short paragraphs, ~180-260 words total.
- Plain professional English. No buzzwords ("synergies", "leverage", "robust"). No marketing tone.
- Be concrete and operational. Prefer "a service interruption would block our customer's regulator filings" over "downtime poses risks".
- Name the structural drivers (regulatory framework, contractual posture, operational footprint, brand visibility, technical access, data sensitivity) — but only the ones present in the input.
- Reference the customer/company by name in the first sentence.
- Do NOT recommend specific products, vendors, frameworks, or contractual clauses — that belongs in the Recommendations section.
- Do NOT fabricate facts. If a regulator, contract clause, or sector detail is not in the input, do not assert it.
- Do NOT include headings, bullet lists, or markdown — just prose paragraphs separated by blank lines.
- Do NOT begin with filler like "In today's vendor landscape" or "As third-party risks evolve".

Output: only the prose narrative. No preamble, no closing remarks, no signature.`;

function validateInterpretation(text: string): { ok: true; text: string } | { ok: false; reason: string }
{
    const trimmed = text.trim();
    if (trimmed.length < 200)     return { ok: false, reason: 'too short' };
    if (trimmed.length > 4000)    return { ok: false, reason: 'too long'  };
    if (/^#|^\s*[-*]\s/m.test(trimmed)) return { ok: false, reason: 'contains markdown formatting' };
    return { ok: true, text: trimmed };
}

function snapshotToFacts(s: CesFactorSnapshot): string
{
    const lines: string[] = [];
    lines.push(`Customer/company: ${s.companyName}`);
    if (s.regulatoryFramework)        lines.push(`Regulatory framework: ${s.regulatoryFramework}`);
    if (s.customerSector)             lines.push(`Customer sector: ${s.customerSector}`);
    lines.push(`Overall exposure score: ${s.overallScore}/100 (${s.overallRiskLevel})`);

    if (s.contractualPosture.length)
    {
        lines.push('');
        lines.push('Contractual & procurement posture:');
        for (const item of s.contractualPosture) lines.push(`  - ${item}`);
    }

    if (s.operationalFootprint.length)
    {
        lines.push('');
        lines.push('Operational footprint:');
        for (const item of s.operationalFootprint) lines.push(`  - ${item}`);
    }

    if (s.technicalExposure.length)
    {
        lines.push('');
        lines.push('Technical exposure:');
        for (const item of s.technicalExposure) lines.push(`  - ${item}`);
    }

    if (s.categoryAssessments.length)
    {
        lines.push('');
        lines.push('Category assessments (rule-based scoring — treat as authoritative):');
        for (const c of s.categoryAssessments)
        {
            lines.push(`  - ${c.name}: ${c.assessment} (${c.score}/100)`);
        }
    }

    if (s.priorityCategories.length)
    {
        lines.push('');
        lines.push(`Priority categories (do not list these in your prose — they appear elsewhere): ${s.priorityCategories.join('; ')}`);
    }

    return lines.join('\n');
}

type RequestBody = { factorSnapshot: CesFactorSnapshot };

function isFactorSnapshot(v: unknown): v is CesFactorSnapshot
{
    if (!v || typeof v !== 'object') return false;
    const o = v as Record<string, unknown>;
    return typeof o.companyName === 'string'
        && Array.isArray(o.contractualPosture)
        && Array.isArray(o.operationalFootprint)
        && Array.isArray(o.technicalExposure)
        && Array.isArray(o.categoryAssessments)
        && Array.isArray(o.priorityCategories);
}

export async function POST(request: Request)
{
    log.debug('(API : client-exposure-interpretation - POST)');

    const session = await getServerSession();
    if (!session?.user)
    {
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Unauthorized' },
            { status: 401 },
        );
    }

    const apiKey = process.env.CLAUDE_API;
    if (!apiKey)
    {
        log.error('CLAUDE_API not configured');
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'LLM provider not configured' },
            { status: 503 },
        );
    }

    let body: RequestBody;
    try
    {
        const raw = await request.json();
        if (!isFactorSnapshot(raw?.factorSnapshot))
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Invalid factorSnapshot' },
                { status: 400 },
            );
        }
        body = { factorSnapshot: raw.factorSnapshot };
    }
    catch
    {
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Invalid JSON body' },
            { status: 400 },
        );
    }

    const facts = snapshotToFacts(body.factorSnapshot);

    try
    {
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
                                'Write the Exposure Narrative for the following customer relationship. ' +
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
        if (!textBlock || textBlock.type !== 'text')
        {
            log.error({ stopReason: final.stop_reason }, 'Claude response had no text block');
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'LLM returned no text' },
                { status: 502 },
            );
        }

        const validation = validateInterpretation(textBlock.text);
        if (!validation.ok)
        {
            log.warn({ reason: validation.reason }, 'Claude interpretation rejected by validator');
            return NextResponse.json<ApiResponse>(
                { success: false, error: `Generated text rejected: ${validation.reason}` },
                { status: 502 },
            );
        }

        log.info(
            {
                company:        body.factorSnapshot.companyName,
                inputTokens:    final.usage.input_tokens,
                outputTokens:   final.usage.output_tokens,
                cacheRead:      final.usage.cache_read_input_tokens,
                cacheCreate:    final.usage.cache_creation_input_tokens,
            },
            'Client exposure interpretation generated',
        );

        return NextResponse.json<ApiResponse<{ interpretation: string }>>({
            success: true,
            data:    { interpretation: validation.text },
        });
    }
    catch (error)
    {
        const e = error as Error;
        log.error({ name: e?.name, message: e?.message }, 'Claude call failed');
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Failed to generate interpretation' },
            { status: 502 },
        );
    }
}
