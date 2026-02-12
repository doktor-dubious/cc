// app/api/task-artifact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { COOKIE_NAME } from '@/constants';
import { log } from '@/lib/log';

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

    await prisma.taskArtifact.delete({
      where: {
        taskId_artifactId: {
          taskId: Number(taskId),
          artifactId: Number(artifactId),
        },
      },
    });

    log.info({ taskId, artifactId }, 'Task removed from artifact');

    return NextResponse.json({ success: true, message: 'Task removed from artifact' });
  } catch (error: any) {
    log.error({ error }, 'Error removing task from artifact');
    if (error.code === 'P2025') {
      return NextResponse.json({ success: false, message: 'Task-artifact association not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, message: 'Failed to remove task from artifact' }, { status: 500 });
  }
}