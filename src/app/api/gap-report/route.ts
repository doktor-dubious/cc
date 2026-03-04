// app/api/gap-report/route.ts

import { log } from '@/lib/log';
import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
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

    // Get the next version number
    const latestReport = await prisma.gapReport.findFirst({
      where: { organizationId },
      orderBy: { version: 'desc' },
      select: { version: true },
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
