// app/api/task-artifact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { log } from '@/lib/log';
import { eventRepository } from '@/lib/database/events';

export async function POST(request: NextRequest) {
  log.debug('API: task-artifact POST');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { taskId, artifactId } = body;

    if (!taskId || !artifactId) {
      return NextResponse.json(
        { success: false, message: 'taskId and artifactId are required' },
        { status: 400 }
      );
    }

    // Check if association already exists
    const existing = await prisma.taskArtifact.findUnique({
      where: {
        taskId_artifactId: {
          taskId: String(taskId),
          artifactId: String(artifactId),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Artifact is already assigned to this task' },
        { status: 400 }
      );
    }

    // Get the task to access organizationId
    const task = await prisma.task.findUnique({
      where: { id: String(taskId) },
      select: { organizationId: true },
    });

    // Create the association
    const taskArtifact = await prisma.taskArtifact.create({
      data: {
        taskId: String(taskId),
        artifactId: String(artifactId),
      },
      include: {
        artifact: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    log.info({ taskId, artifactId }, 'Artifact added to task');

    // Create event
    await eventRepository.create({
      message: 'Artifact added to task',
      importance: 'MIDDLE',
      userId: session.user.id,
      taskId: String(taskId),
      organizationId: task?.organizationId || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Artifact added to task',
      data: taskArtifact
    });
  } catch (error: any) {
    log.error({ error }, 'Error adding artifact to task');
    return NextResponse.json({ success: false, message: 'Failed to add artifact to task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  log.debug('API: task-artifact DELETE');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { taskId, artifactId } = body;

    if (!taskId || !artifactId) {
      return NextResponse.json(
        { success: false, message: 'taskId and artifactId are required' },
        { status: 400 }
      );
    }

    // Get the task to access organizationId before deleting
    const task = await prisma.task.findUnique({
      where: { id: String(taskId) },
      select: { organizationId: true },
    });

    await prisma.taskArtifact.delete({
      where: {
        taskId_artifactId: {
          taskId: String(taskId),
          artifactId: String(artifactId),
        },
      },
    });

    log.info({ taskId, artifactId }, 'Task removed from artifact');

    // Create event
    await eventRepository.create({
      message: 'Artifact removed from task',
      importance: 'MIDDLE',
      userId: session.user.id,
      taskId: String(taskId),
      organizationId: task?.organizationId || undefined,
    });

    return NextResponse.json({ success: true, message: 'Task removed from artifact' });
  } catch (error: any) {
    log.error({ error }, 'Error removing task from artifact');
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, message: 'Task-artifact association not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, message: 'Failed to remove task from artifact' }, { status: 500 });
  }
}