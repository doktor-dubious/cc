// app/api/task-star/route.ts
import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { prisma }                       from '@/lib/prisma';
import { getServerSession }             from '@/lib/auth';

// GET: Fetch all starred tasks for an organization
export async function GET(request: NextRequest) {
  log.debug('API: task-star GET');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Fetch all starred tasks for the organization
    const starredTasks = await prisma.taskStar.findMany({
      where: {
        task: {
          organizationId: organizationId,
          active: true,
        },
      },
      select: {
        taskId: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: starredTasks.map(ts => ts.taskId),
    });
  } catch (error: unknown) {
    log.error({ error }, 'Error fetching starred tasks');
    return NextResponse.json({ success: false, message: 'Failed to fetch starred tasks' }, { status: 500 });
  }
}

// POST: Star a task (toggle - add if not exists, remove if exists)
export async function POST(request: NextRequest) {
  log.debug('API: task-star POST');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { success: false, message: 'taskId is required' },
        { status: 400 }
      );
    }

    // Check if already starred
    const existing = await prisma.taskStar.findUnique({
      where: { taskId: taskId },
    });

    if (existing) {
      // Remove star
      await prisma.taskStar.delete({
        where: { taskId: taskId },
      });

      log.info({ taskId }, 'Task unstarred');

      return NextResponse.json({
        success: true,
        message: 'Task unstarred',
        starred: false,
      });
    } else {
      // Add star
      await prisma.taskStar.create({
        data: { taskId: taskId },
      });

      log.info({ taskId }, 'Task starred');

      return NextResponse.json({
        success: true,
        message: 'Task starred',
        starred: true,
      });
    }
  } catch (error: unknown) {
    log.error({ error }, 'Error toggling task star');
    return NextResponse.json({ success: false, message: 'Failed to toggle task star' }, { status: 500 });
  }
}

// DELETE: Unstar a specific task
export async function DELETE(request: NextRequest) {
  log.debug('API: task-star DELETE');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { success: false, message: 'taskId is required' },
        { status: 400 }
      );
    }

    await prisma.taskStar.delete({
      where: { taskId: taskId },
    });

    log.info({ taskId }, 'Task unstarred');

    return NextResponse.json({ success: true, message: 'Task unstarred' });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    log.error({ error }, 'Error unstarring task');
    if (prismaError.code === 'P2025') {
      return NextResponse.json({ success: false, message: 'Task is not starred' }, { status: 404 });
    }
    return NextResponse.json({ success: false, message: 'Failed to unstar task' }, { status: 500 });
  }
}
