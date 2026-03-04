import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/log';

// GET /api/workflow-config?organizationId=xxx&workflowId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const workflowId = searchParams.get('workflowId');

    if (!organizationId || !workflowId) {
      return NextResponse.json(
        { error: 'organizationId and workflowId are required' },
        { status: 400 }
      );
    }

    const configs = await prisma.workflowConfig.findMany({
      where: {
        organizationId,
        workflowId,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return NextResponse.json({ data: configs });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Failed to fetch workflow config');
    return NextResponse.json(
      { error: 'Failed to fetch workflow config', details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/workflow-config
// Body: { organizationId, workflowId, steps: [{ stepId, active, sortOrder }] }
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, workflowId, steps } = body;

    if (!organizationId || !workflowId || !Array.isArray(steps)) {
      return NextResponse.json(
        { error: 'organizationId, workflowId, and steps array are required' },
        { status: 400 }
      );
    }

    // Use a transaction: delete existing and recreate
    await prisma.$transaction(async (tx) => {
      // Delete existing configs for this workflow
      await tx.workflowConfig.deleteMany({
        where: {
          organizationId,
          workflowId,
        },
      });

      // Create new configs
      await tx.workflowConfig.createMany({
        data: steps.map((step: { stepId: string; active: boolean; sortOrder: number }) => ({
          organizationId,
          workflowId,
          stepId: step.stepId,
          active: step.active,
          sortOrder: step.sortOrder,
        })),
      });
    });

    // Fetch the updated configs
    const updatedConfigs = await prisma.workflowConfig.findMany({
      where: {
        organizationId,
        workflowId,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    return NextResponse.json({ data: updatedConfigs });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Failed to update workflow config');
    return NextResponse.json(
      { error: 'Failed to update workflow config', details: errorMessage },
      { status: 500 }
    );
  }
}
