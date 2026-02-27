// app/api/file-star/route.ts
import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { prisma }                       from '@/lib/prisma';
import { getServerSession }             from '@/lib/auth';

// GET: Fetch all starred files for an organization
export async function GET(request: NextRequest) {
  log.debug('API: file-star GET');

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

    // Fetch all starred files for the organization
    const starredFiles = await prisma.fileStar.findMany({
      where: {
        organizationId: organizationId,
      },
      select: {
        filePath: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: starredFiles.map(fs => fs.filePath),
    });
  } catch (error: unknown) {
    log.error({ error }, 'Error fetching starred files');
    return NextResponse.json({ success: false, message: 'Failed to fetch starred files' }, { status: 500 });
  }
}

// POST: Star a file (toggle - add if not exists, remove if exists)
export async function POST(request: NextRequest) {
  log.debug('API: file-star POST');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, filePath } = body;

    if (!organizationId || !filePath) {
      return NextResponse.json(
        { success: false, message: 'organizationId and filePath are required' },
        { status: 400 }
      );
    }

    // Check if already starred
    const existing = await prisma.fileStar.findUnique({
      where: {
        organizationId_filePath: {
          organizationId,
          filePath,
        },
      },
    });

    if (existing) {
      // Remove star
      await prisma.fileStar.delete({
        where: {
          organizationId_filePath: {
            organizationId,
            filePath,
          },
        },
      });

      log.info({ organizationId, filePath }, 'File unstarred');

      return NextResponse.json({
        success: true,
        message: 'File unstarred',
        starred: false,
      });
    } else {
      // Add star
      await prisma.fileStar.create({
        data: { organizationId, filePath },
      });

      log.info({ organizationId, filePath }, 'File starred');

      return NextResponse.json({
        success: true,
        message: 'File starred',
        starred: true,
      });
    }
  } catch (error: unknown) {
    log.error({ error }, 'Error toggling file star');
    return NextResponse.json({ success: false, message: 'Failed to toggle file star' }, { status: 500 });
  }
}
