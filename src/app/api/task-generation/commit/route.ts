// app/api/task-generation/commit/route.ts
//
// Roadmap → Tasks, commit. Persists the advisor-approved drafts from the
// /preview step as real tasks: each becomes a Task (origin = GENERATED,
// tagged with its ownerRole and source phase) linked to every safeguard it
// covers via TaskSafeguard. A single summary Event is written for the audit
// trail. All writes run in one transaction.

import { NextResponse }     from 'next/server';

import { getServerSession } from '@/lib/auth';
import { canCreateTasks, validateAdminOrganizationAccess } from '@/lib/auth/permissions';
import { log }              from '@/lib/log';
import { prisma }           from '@/lib/prisma';
import { eventRepository }  from '@/lib/database/events';
import type { ApiResponse } from '@/lib/types/api';
import { RoadmapOwner, TaskOrigin, TaskStatus } from '@prisma/client';

const OWNERS = new Set<string>(Object.values(RoadmapOwner));

type DraftIn = {
  title?:            unknown;
  description?:      unknown;
  expectedEvidence?: unknown;
  safeguardIds?:     unknown;
  ownerRole?:        unknown;
};

type Body = { organizationId?: string; phase?: number; drafts?: DraftIn[] };

type CleanDraft = {
  name:             string;
  description:      string;
  expectedEvidence: string;
  safeguardIds:     string[];
  ownerRole:        RoadmapOwner | null;
};

export async function POST(request: Request) {
  log.debug('(API : task-generation/commit - POST)');

  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const { id: userId, profileId, role } = session.user;
  if (!role || !canCreateTasks(role)) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { organizationId, phase, drafts } = body;
  if (!organizationId || typeof phase !== 'number' || phase < 1 || phase > 4) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'organizationId and phase (1..4) are required' }, { status: 400 });
  }
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'At least one draft is required' }, { status: 400 });
  }

  if (!(await validateAdminOrganizationAccess(role, profileId, organizationId))) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Not authorized for this organization' }, { status: 403 });
  }

  // Normalise + validate each draft. A bad draft fails the whole request so the
  // advisor never silently loses one.
  const clean: CleanDraft[] = [];
  for (const d of drafts) {
    const name = typeof d.title === 'string' ? d.title.trim() : '';
    if (!name) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Each draft needs a non-empty title' }, { status: 400 });
    }
    const safeguardIds = Array.isArray(d.safeguardIds)
      ? d.safeguardIds.filter((s): s is string => typeof s === 'string')
      : [];
    const ownerRole = typeof d.ownerRole === 'string' && OWNERS.has(d.ownerRole)
      ? (d.ownerRole as RoadmapOwner)
      : null;
    clean.push({
      name,
      description:      typeof d.description === 'string' ? d.description.trim() : '',
      expectedEvidence: typeof d.expectedEvidence === 'string' ? d.expectedEvidence.trim() : '',
      safeguardIds,
      ownerRole,
    });
  }

  try {
    const createdIds = await prisma.$transaction(async (tx) => {
      const ids: string[] = [];
      for (const d of clean) {
        const task = await tx.task.create({
          data: {
            name:               d.name,
            description:        d.description || null,
            expectedEvidence:   d.expectedEvidence || null,
            organizationId,
            status:             TaskStatus.NOT_STARTED,
            origin:             TaskOrigin.GENERATED,
            ownerRole:          d.ownerRole,
            generatedFromPhase: phase,
          },
          select: { id: true },
        });
        ids.push(task.id);

        if (d.safeguardIds.length > 0) {
          await tx.taskSafeguard.createMany({
            data: d.safeguardIds.map(safeguardId => ({ taskId: task.id, safeguardId })),
            skipDuplicates: true,
          });
        }
      }
      return ids;
    });

    await eventRepository.create({
      message:        `Generated ${createdIds.length} task(s) from roadmap phase ${phase}`,
      importance:     'MIDDLE',
      userId:         userId ?? undefined,
      organizationId,
    });

    log.info({ organizationId, phase, created: createdIds.length }, 'Roadmap tasks committed');

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Created ${createdIds.length} task(s)`,
      data:    { created: createdIds.length, taskIds: createdIds },
    }, { status: 201 });
  } catch (error) {
    log.error({ error: error instanceof Error ? error.message : String(error) }, 'task-generation commit failed');
    return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to create tasks' }, { status: 500 });
  }
}
