// app/api/task-artifact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { COOKIE_NAME } from '@/constants';
import { log } from '@/lib/log';
import { eventRepository } from '@/lib/database/events';

export async function POST(request: NextRequest) {
  log.debug('API: task-artifact POST');

  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    if (!['SUPER_ADMIN', 'ADMIN'].includes(payload.role as string)) {
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
          taskId: Number(taskId),
          artifactId: Number(artifactId),
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
      where: { id: Number(taskId) },
      select: { organizationId: true },
    });

    // Create the association
    const taskArtifact = await prisma.taskArtifact.create({
      data: {
        taskId: Number(taskId),
        artifactId: Number(artifactId),
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
      userId: Number(payload.sub),
      taskId: Number(taskId),
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
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    if (!['SUPER_ADMIN', 'ADMIN'].includes(payload.role as string)) {
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
      where: { id: Number(taskId) },
      select: { organizationId: true },
    });

    await prisma.taskArtifact.delete({
      where: {
        taskId_artifactId: {
          taskId: Number(taskId),
          artifactId: Number(artifactId),
        },
      },
    });

    log.info({ taskId, artifactId }, 'Task removed from artifact');

    // Create event
    await eventRepository.create({
      message: 'Artifact removed from task',
      importance: 'MIDDLE',
      userId: Number(payload.sub),
      taskId: Number(taskId),
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