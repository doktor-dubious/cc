// app/api/profile-star/route.ts
import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { prisma }                       from '@/lib/prisma';
import { getServerSession }             from '@/lib/auth';

// GET: Fetch all starred profiles for an organization
export async function GET(request: NextRequest) {
  log.debug('API: profile-star GET');

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

    // Fetch all starred profiles for the organization
    const starredProfiles = await prisma.profileStar.findMany({
      where: {
        profile: {
          organizationId: organizationId,
          active: true,
        },
      },
      select: {
        profileId: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: starredProfiles.map(ps => ps.profileId),
    });
  } catch (error: unknown) {
    log.error({ error }, 'Error fetching starred profiles');
    return NextResponse.json({ success: false, message: 'Failed to fetch starred profiles' }, { status: 500 });
  }
}

// POST: Star a profile (toggle - add if not exists, remove if exists)
export async function POST(request: NextRequest) {
  log.debug('API: profile-star POST');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { profileId } = body;

    if (!profileId) {
      return NextResponse.json(
        { success: false, message: 'profileId is required' },
        { status: 400 }
      );
    }

    // Check if already starred
    const existing = await prisma.profileStar.findUnique({
      where: { profileId: profileId },
    });

    if (existing) {
      // Remove star
      await prisma.profileStar.delete({
        where: { profileId: profileId },
      });

      log.info({ profileId }, 'Profile unstarred');

      return NextResponse.json({
        success: true,
        message: 'Profile unstarred',
        starred: false,
      });
    } else {
      // Add star
      await prisma.profileStar.create({
        data: { profileId: profileId },
      });

      log.info({ profileId }, 'Profile starred');

      return NextResponse.json({
        success: true,
        message: 'Profile starred',
        starred: true,
      });
    }
  } catch (error: unknown) {
    log.error({ error }, 'Error toggling profile star');
    return NextResponse.json({ success: false, message: 'Failed to toggle profile star' }, { status: 500 });
  }
}

// DELETE: Unstar a specific profile
export async function DELETE(request: NextRequest) {
  log.debug('API: profile-star DELETE');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { profileId } = body;

    if (!profileId) {
      return NextResponse.json(
        { success: false, message: 'profileId is required' },
        { status: 400 }
      );
    }

    await prisma.profileStar.delete({
      where: { profileId: profileId },
    });

    log.info({ profileId }, 'Profile unstarred');

    return NextResponse.json({ success: true, message: 'Profile unstarred' });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    log.error({ error }, 'Error unstarring profile');
    if (prismaError.code === 'P2025') {
      return NextResponse.json({ success: false, message: 'Profile is not starred' }, { status: 404 });
    }
    return NextResponse.json({ success: false, message: 'Failed to unstar profile' }, { status: 500 });
  }
}
