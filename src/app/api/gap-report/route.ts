// app/api/gap-report/route.ts

import { log } from '@/lib/log';
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { validateAdminOrganizationAccess } from '@/lib/auth/permissions';
import { prisma } from '@/lib/prisma';
import type { ApiResponse } from '@/lib/types/api';

type CmmiEntry = {
  safeguardId: string;
  currentCmmi: number;
  targetCmmi: number;
};

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET - Fetch GAP reports for an organization
export async function GET(request: Request) {
  log.debug('(API : gap-report - GET)');

  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'organizationId is required' },
        { status: 400 }
      );
    }

    const reports = await prisma.gapReport.findMany({
      where: { organizationId },
      include: {
        cmmiValues: true,
      },
      orderBy: { version: 'desc' },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: reports,
    });
  } catch (error: unknown) {
    log.error(error, '(API : gap-report - GET) Error');
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// POST - Finalize a GAP report
export async function POST(request: Request) {
  log.debug('(API : gap-report - POST)');

  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { organizationId, cmmiData, remarks } = body as {
      organizationId: string;
      cmmiData: CmmiEntry[];
      remarks?: string;
    };

    if (!organizationId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!cmmiData || !Array.isArray(cmmiData) || cmmiData.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'cmmiData is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get the latest report — for the next version number, and to detect which
    // safeguards' targets changed vs the previous finalize (req: the Roadmap
    // target follows the GAP target).
    const latestReport = await prisma.gapReport.findFirst({
      where: { organizationId },
      orderBy: { version: 'desc' },
      include: { cmmiValues: { select: { safeguardId: true, targetCmmi: true } } },
    });

    const nextVersion = (latestReport?.version ?? 0) + 1;

    // Calculate average GAP
    const totalGap = cmmiData.reduce(
      (sum, entry) => sum + (entry.targetCmmi - entry.currentCmmi),
      0
    );
    const averageGap = totalGap / cmmiData.length;

    // Create the report with CMMI values in a transaction
    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.gapReport.create({
        data: {
          organizationId,
          version: nextVersion,
          averageGap,
          remarks: remarks?.trim() || null,
        },
      });

      // Create CMMI entries
      await tx.gapReportCmmi.createMany({
        data: cmmiData.map((entry) => ({
          reportId: newReport.id,
          safeguardId: entry.safeguardId,
          currentCmmi: entry.currentCmmi,
          targetCmmi: entry.targetCmmi,
          gap: entry.targetCmmi - entry.currentCmmi,
        })),
      });

      // Fetch the complete report with CMMI values
      return tx.gapReport.findUnique({
        where: { id: newReport.id },
        include: { cmmiValues: true },
      });
    });

    // Clear roadmap target overrides for safeguards whose GAP target changed,
    // so the Roadmap re-derives from the new target. No-op when there's no
    // previous report or no matching roadmap item.
    if (latestReport) {
      const prevTarget = new Map(latestReport.cmmiValues.map((v) => [v.safeguardId, v.targetCmmi]));
      const changed = cmmiData
        .filter((e) => prevTarget.has(e.safeguardId) && prevTarget.get(e.safeguardId) !== e.targetCmmi)
        .map((e) => e.safeguardId);
      if (changed.length > 0) {
        await prisma.organizationRoadmapItem.updateMany({
          where: { organizationId, safeguardId: { in: changed } },
          data: { targetCmmi: null },
        });
      }
    }

    log.info(
      { organizationId, reportId: report?.id, version: nextVersion },
      'GAP report finalized'
    );

    return NextResponse.json<ApiResponse>({
      success: true,
      data: report,
      message: `GAP report v${nextVersion} finalized`,
    });
  } catch (error: unknown) {
    log.error(error, '(API : gap-report - POST) Error');
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json<ApiResponse>(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE - Reset history: delete every finalized GAP report version for an
// organization. Cascades to each report's cmmiValues (onDelete: Cascade).
// Restricted to users with admin access to the organization.
export async function DELETE(request: Request) {
  log.debug('(API : gap-report - DELETE)');

  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { profileId, role } = session.user;

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    if (!organizationId) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'organizationId is required' }, { status: 400 });
    }

    if (!role || !(await validateAdminOrganizationAccess(role, profileId, organizationId))) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Not authorized for this organization' }, { status: 403 });
    }

    const { count } = await prisma.gapReport.deleteMany({ where: { organizationId } });

    log.info({ organizationId, deleted: count }, 'GAP report history reset');

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Deleted ${count} GAP report version(s)`,
      data: { deleted: count },
    });
  } catch (error: unknown) {
    log.error(error, '(API : gap-report - DELETE) Error');
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
