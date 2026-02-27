// app/api/user-star/route.ts
import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { prisma }                       from '@/lib/prisma';
import { getServerSession }             from '@/lib/auth';

// GET: Fetch all starred users
export async function GET() {
  log.debug('API: user-star GET');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN can access user stars
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all starred users
    const starredUsers = await prisma.userStar.findMany({
      where: {
        user: {
          active: true,
        },
      },
      select: {
        userId: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: starredUsers.map(us => us.userId),
    });
  } catch (error: unknown) {
    log.error({ error }, 'Error fetching starred users');
    return NextResponse.json({ success: false, message: 'Failed to fetch starred users' }, { status: 500 });
  }
}

// POST: Star a user (toggle - add if not exists, remove if exists)
export async function POST(request: NextRequest) {
  log.debug('API: user-star POST');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN can star users
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if already starred
    const existing = await prisma.userStar.findUnique({
      where: { userId: userId },
    });

    if (existing) {
      // Remove star
      await prisma.userStar.delete({
        where: { userId: userId },
      });

      log.info({ userId }, 'User unstarred');

      return NextResponse.json({
        success: true,
        message: 'User unstarred',
        starred: false,
      });
    } else {
      // Add star
      await prisma.userStar.create({
        data: { userId: userId },
      });

      log.info({ userId }, 'User starred');

      return NextResponse.json({
        success: true,
        message: 'User starred',
        starred: true,
      });
    }
  } catch (error: unknown) {
    log.error({ error }, 'Error toggling user star');
    return NextResponse.json({ success: false, message: 'Failed to toggle user star' }, { status: 500 });
  }
}
