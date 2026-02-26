// app/api/organization-star/route.ts
import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { prisma }                       from '@/lib/prisma';
import { getServerSession }             from '@/lib/auth';

// GET: Fetch all starred organizations
export async function GET(request: NextRequest) {
  log.debug('API: organization-star GET');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all starred organizations
    const starredOrganizations = await prisma.organizationStar.findMany({
      where: {
        organization: {
          active: true,
        },
      },
      select: {
        organizationId: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: starredOrganizations.map(os => os.organizationId),
    });
  } catch (error: unknown) {
    log.error({ error }, 'Error fetching starred organizations');
    return NextResponse.json({ success: false, message: 'Failed to fetch starred organizations' }, { status: 500 });
  }
}

// POST: Star an organization (toggle - add if not exists, remove if exists)
export async function POST(request: NextRequest) {
  log.debug('API: organization-star POST');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Check if already starred
    const existing = await prisma.organizationStar.findUnique({
      where: { organizationId: organizationId },
    });

    if (existing) {
      // Remove star
      await prisma.organizationStar.delete({
        where: { organizationId: organizationId },
      });

      log.info({ organizationId }, 'Organization unstarred');

      return NextResponse.json({
        success: true,
        message: 'Organization unstarred',
        starred: false,
      });
    } else {
      // Add star
      await prisma.organizationStar.create({
        data: { organizationId: organizationId },
      });

      log.info({ organizationId }, 'Organization starred');

      return NextResponse.json({
        success: true,
        message: 'Organization starred',
        starred: true,
      });
    }
  } catch (error: unknown) {
    log.error({ error }, 'Error toggling organization star');
    return NextResponse.json({ success: false, message: 'Failed to toggle organization star' }, { status: 500 });
  }
}

// DELETE: Unstar a specific organization
export async function DELETE(request: NextRequest) {
  log.debug('API: organization-star DELETE');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: 'organizationId is required' },
        { status: 400 }
      );
    }

    await prisma.organizationStar.delete({
      where: { organizationId: organizationId },
    });

    log.info({ organizationId }, 'Organization unstarred');

    return NextResponse.json({ success: true, message: 'Organization unstarred' });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    log.error({ error }, 'Error unstarring organization');
    if (prismaError.code === 'P2025') {
      return NextResponse.json({ success: false, message: 'Organization is not starred' }, { status: 404 });
    }
    return NextResponse.json({ success: false, message: 'Failed to unstar organization' }, { status: 500 });
  }
}
