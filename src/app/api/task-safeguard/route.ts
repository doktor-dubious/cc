// app/api/task-safeguard/route.ts
import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { prisma }                       from '@/lib/prisma';
import { getServerSession }             from '@/lib/auth';
import { eventRepository }              from '@/lib/database/events';

export async function GET(request: NextRequest) {
  log.debug('API: task-safeguard GET');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const safeguardId = searchParams.get('safeguardId');

    if (!taskId && !safeguardId) {
      return NextResponse.json(
        { success: false, message: 'Either taskId or safeguardId is required' },
        { status: 400 }
      );
    }

    let associations;

    if (taskId) {
      // Fetch all safeguards for a specific task
      associations = await prisma.taskSafeguard.findMany({
        where: { taskId: taskId },
        orderBy: { safeguardId: 'asc' },
      });
    } else if (safeguardId) {
      // Fetch all tasks for a specific safeguard
      associations = await prisma.taskSafeguard.findMany({
        where: { safeguardId: safeguardId },
        include: {
          task: {
            select: {
              id: true,
              name: true,
              description: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({
      success: true,
      data: associations,
    });
  } catch (error: any) {
    log.error({ error }, 'Error fetching task-safeguard associations');
    return NextResponse.json({ success: false, message: 'Failed to fetch task-safeguard associations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  log.debug('API: task-safeguard POST');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { taskId, safeguardId } = body;

    if (!taskId || !safeguardId) {
      return NextResponse.json(
        { success: false, message: 'taskId and safeguardId are required' },
        { status: 400 }
      );
    }

    // Check if association already exists
    const existing = await prisma.taskSafeguard.findUnique({
      where: {
        taskId_safeguardId: {
          taskId: taskId,
          safeguardId: safeguardId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Safeguard is already assigned to this task' },
        { status: 400 }
      );
    }

    // Create the association
    const taskSafeguard = await prisma.taskSafeguard.create({
      data: {
        taskId: taskId,
        safeguardId: safeguardId,
      },
    });

    log.info({ taskId, safeguardId }, 'Safeguard added to task');

    // Get the task to access organizationId
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { organizationId: true },
    });

    // Create event
    await eventRepository.create({
      message: 'Safeguard added to task',
      importance: 'HIGH',
      userId: session.user.id,
      taskId: taskId,
      organizationId: task?.organizationId || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Safeguard added to task',
      data: taskSafeguard
    });
  } catch (error: any) {
    log.error({ error }, 'Error adding safeguard to task');
    return NextResponse.json({ success: false, message: 'Failed to add safeguard to task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  log.debug('API: task-safeguard DELETE');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { taskId, safeguardId } = body;

    if (!taskId || !safeguardId) {
      return NextResponse.json(
        { success: false, message: 'taskId and safeguardId are required' },
        { status: 400 }
      );
    }

    // Get the task to access organizationId before deleting
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { organizationId: true },
    });

    await prisma.taskSafeguard.delete({
      where: {
        taskId_safeguardId: {
          taskId: taskId,
          safeguardId: safeguardId,
        },
      },
    });

    log.info({ taskId, safeguardId }, 'Safeguard removed from task');

    // Create event
    await eventRepository.create({
      message: 'Safeguard removed from task',
      importance: 'HIGH',
      userId: session.user.id,
      taskId: taskId,
      organizationId: task?.organizationId || undefined,
    });

    return NextResponse.json({ success: true, message: 'Safeguard removed from task' });
  } catch (error: any) {
    log.error({ error }, 'Error removing safeguard from task');
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, message: 'Task-safeguard association not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, message: 'Failed to remove safeguard from task' }, { status: 500 });
  }
}
