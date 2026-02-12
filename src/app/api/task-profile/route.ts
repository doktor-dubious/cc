// app/api/task-profile/route.ts
import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { prisma }                       from '@/lib/prisma';
import { jwtVerify }                    from 'jose';
import { COOKIE_NAME }                  from '@/constants';

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

    await prisma.taskProfile.delete({
      where: {
        taskId_profileId: {
          taskId: Number(taskId),
          profileId: Number(profileId),
        },
      },
    });

    log.info({ taskId, profileId }, 'Task removed from profile');

    return NextResponse.json({ success: true, message: 'Task removed from profile' });
  } catch (error: any) {
    log.error({ error }, 'Error removing task from profile');
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, message: 'Task-profile association not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, message: 'Failed to remove task from profile' }, { status: 500 });
  }
}