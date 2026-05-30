// app/api/roadmap/route.ts
//
// Per-safeguard advisor decisions for the Roadmap page. GET returns a map of
// all roadmap items for an organization; PUT upserts the advisor-decision
// fields for a single safeguard. AI insight fields are written by the separate
// /api/roadmap-insight route, so we never touch them here.

import { log }              from '@/lib/log';
import { NextResponse }     from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma }           from '@/lib/prisma';
import type { ApiResponse } from '@/lib/types/api';
import { RoadmapEffort, RoadmapOwner } from '@prisma/client';

// Shape returned to the client for one safeguard.
export type RoadmapItemDto = {
  safeguardId:             string;
  targetCmmi:              number | null;
  phase:                   number | null;
  effort:                  RoadmapEffort | null;
  owner:                   RoadmapOwner | null;
  clientExplanation:       string | null;
  internalNote:            string | null;
  aiBusinessRelevance:     string | null;
  aiCustomerExposure:      string | null;
  aiImplementationInsight: string | null;
  aiGeneratedAt:           string | null;
};

const EFFORTS = new Set<string>(Object.values(RoadmapEffort));
const OWNERS  = new Set<string>(Object.values(RoadmapOwner));

// ──────────────────────────────────────────────────────────────────────────
// GET - all roadmap items for an organization, keyed by safeguardId.
export async function GET(request: Request) {
  log.debug('(API : roadmap - GET)');

  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    if (!organizationId) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'organizationId is required' }, { status: 400 });
    }

    const rows = await prisma.organizationRoadmapItem.findMany({
      where: { organizationId },
    });

    const map: Record<string, RoadmapItemDto> = {};
    for (const r of rows) {
      map[r.safeguardId] = {
        safeguardId:             r.safeguardId,
        targetCmmi:              r.targetCmmi,
        phase:                   r.phase,
        effort:                  r.effort,
        owner:                   r.owner,
        clientExplanation:       r.clientExplanation,
        internalNote:            r.internalNote,
        aiBusinessRelevance:     r.aiBusinessRelevance,
        aiCustomerExposure:      r.aiCustomerExposure,
        aiImplementationInsight: r.aiImplementationInsight,
        aiGeneratedAt:           r.aiGeneratedAt?.toISOString() ?? null,
      };
    }

    return NextResponse.json<ApiResponse>({ success: true, data: map });
  } catch (error: unknown) {
    log.error(error, '(API : roadmap - GET) Error');
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// PUT - upsert advisor-decision fields for one safeguard.
export async function PUT(request: Request) {
  log.debug('(API : roadmap - PUT)');

  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, safeguardId } = body as { organizationId?: string; safeguardId?: string };
    if (!organizationId || !safeguardId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'organizationId and safeguardId are required' },
        { status: 400 },
      );
    }

    // Normalise + validate the advisor-decision fields. Each is optional; an
    // explicit null clears it. Unknown enum values are rejected.
    const targetCmmi = body.targetCmmi;
    if (targetCmmi !== undefined && targetCmmi !== null
        && (typeof targetCmmi !== 'number' || targetCmmi < 1 || targetCmmi > 5)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'targetCmmi must be 1..5' }, { status: 400 });
    }

    const phase = body.phase;
    if (phase !== undefined && phase !== null
        && (typeof phase !== 'number' || phase < 1 || phase > 4)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'phase must be 1..4' }, { status: 400 });
    }

    const effort = body.effort;
    if (effort !== undefined && effort !== null && !EFFORTS.has(effort)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'invalid effort' }, { status: 400 });
    }

    const owner = body.owner;
    if (owner !== undefined && owner !== null && !OWNERS.has(owner)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'invalid owner' }, { status: 400 });
    }

    // Build the patch only from fields the caller actually sent so a partial
    // update doesn't clobber the others.
    const patch: Record<string, unknown> = {};
    if ('targetCmmi'        in body) patch.targetCmmi        = targetCmmi ?? null;
    if ('phase'             in body) patch.phase             = phase ?? null;
    if ('effort'            in body) patch.effort            = effort ?? null;
    if ('owner'             in body) patch.owner             = owner ?? null;
    if ('clientExplanation' in body) patch.clientExplanation = (body.clientExplanation as string)?.trim() || null;
    if ('internalNote'      in body) patch.internalNote      = (body.internalNote as string)?.trim() || null;

    const row = await prisma.organizationRoadmapItem.upsert({
      where:  { organizationId_safeguardId: { organizationId, safeguardId } },
      create: { organizationId, safeguardId, ...patch },
      update: patch,
    });

    return NextResponse.json<ApiResponse>({ success: true, data: { safeguardId: row.safeguardId } });
  } catch (error: unknown) {
    log.error(error, '(API : roadmap - PUT) Error');
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
