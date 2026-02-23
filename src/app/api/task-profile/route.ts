// app/api/task-profile/route.ts
import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { prisma }                       from '@/lib/prisma';
import { jwtVerify }                    from 'jose';
import { COOKIE_NAME }                  from '@/constants';
import { eventRepository }              from '@/lib/database/events';

export async function POST(request: NextRequest) {
  log.debug('API: task-profile POST');

  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { taskId, profileId } = body;

    if (!taskId || !profileId) {
      return NextResponse.json(
        { success: false, message: 'taskId and profileId are required' },
        { status: 400 }
      );
    }

    // Check if association already exists
    const existing = await prisma.taskProfile.findUnique({
      where: {
        taskId_profileId: {
          taskId: taskId,
          profileId: profileId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Profile is already assigned to this task' },
        { status: 400 }
      );
    }

    // Create the association
    const taskProfile = await prisma.taskProfile.create({
      data: {
        taskId: taskId,
        profileId: profileId,
      },
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    log.info({ taskId, profileId }, 'Profile added to task');

    // Get the task to access organizationId
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { organizationId: true },
    });

    // Create event
    await eventRepository.create({
      message: 'Profile added to task',
      importance: 'HIGH',
      userId: payload.sub as string,
      taskId: taskId,
      organizationId: task?.organizationId || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Profile added to task',
      data: taskProfile
    });
  } catch (error: any) {
    log.error({ error }, 'Error adding profile to task');
    return NextResponse.json({ success: false, message: 'Failed to add profile to task' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  log.debug('API: task-profile DELETE');

  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { taskId, profileId } = body;

    if (!taskId || !profileId) {
      return NextResponse.json(
        { success: false, message: 'taskId and profileId are required' },
        { status: 400 }
      );
    }

    // Get the task to access organizationId before deleting
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { organizationId: true },
    });

    await prisma.taskProfile.delete({
      where: {
        taskId_profileId: {
          taskId: taskId,
          profileId: profileId,
        },
      },
    });

    log.info({ taskId, profileId }, 'Task removed from profile');

    // Create event
    await eventRepository.create({
      message: 'Profile removed from task',
      importance: 'HIGH',
      userId: payload.sub as string,
      taskId: taskId,
      organizationId: task?.organizationId || undefined,
    });

    return NextResponse.json({ success: true, message: 'Task removed from profile' });
  } catch (error: any) {
    log.error({ error }, 'Error removing task from profile');
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, message: 'Task-profile association not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, message: 'Failed to remove task from profile' }, { status: 500 });
  }
}