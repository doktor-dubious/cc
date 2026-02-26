// app/api/artifact-star/route.ts
import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { prisma }                       from '@/lib/prisma';
import { getServerSession }             from '@/lib/auth';

// GET: Fetch all starred artifacts for an organization
export async function GET(request: NextRequest) {
  log.debug('API: artifact-star GET');

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

    // Fetch all starred artifacts for the organization
    const starredArtifacts = await prisma.artifactStar.findMany({
      where: {
        artifact: {
          organizationId: organizationId,
          active: true,
        },
      },
      select: {
        artifactId: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: starredArtifacts.map(as => as.artifactId),
    });
  } catch (error: unknown) {
    log.error({ error }, 'Error fetching starred artifacts');
    return NextResponse.json({ success: false, message: 'Failed to fetch starred artifacts' }, { status: 500 });
  }
}

// POST: Star an artifact (toggle - add if not exists, remove if exists)
export async function POST(request: NextRequest) {
  log.debug('API: artifact-star POST');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { artifactId } = body;

    if (!artifactId) {
      return NextResponse.json(
        { success: false, message: 'artifactId is required' },
        { status: 400 }
      );
    }

    // Check if already starred
    const existing = await prisma.artifactStar.findUnique({
      where: { artifactId: artifactId },
    });

    if (existing) {
      // Remove star
      await prisma.artifactStar.delete({
        where: { artifactId: artifactId },
      });

      log.info({ artifactId }, 'Artifact unstarred');

      return NextResponse.json({
        success: true,
        message: 'Artifact unstarred',
        starred: false,
      });
    } else {
      // Add star
      await prisma.artifactStar.create({
        data: { artifactId: artifactId },
      });

      log.info({ artifactId }, 'Artifact starred');

      return NextResponse.json({
        success: true,
        message: 'Artifact starred',
        starred: true,
      });
    }
  } catch (error: unknown) {
    log.error({ error }, 'Error toggling artifact star');
    return NextResponse.json({ success: false, message: 'Failed to toggle artifact star' }, { status: 500 });
  }
}

// DELETE: Unstar a specific artifact
export async function DELETE(request: NextRequest) {
  log.debug('API: artifact-star DELETE');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { artifactId } = body;

    if (!artifactId) {
      return NextResponse.json(
        { success: false, message: 'artifactId is required' },
        { status: 400 }
      );
    }

    await prisma.artifactStar.delete({
      where: { artifactId: artifactId },
    });

    log.info({ artifactId }, 'Artifact unstarred');

    return NextResponse.json({ success: true, message: 'Artifact unstarred' });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    log.error({ error }, 'Error unstarring artifact');
    if (prismaError.code === 'P2025') {
      return NextResponse.json({ success: false, message: 'Artifact is not starred' }, { status: 404 });
    }
    return NextResponse.json({ success: false, message: 'Failed to unstar artifact' }, { status: 500 });
  }
}
