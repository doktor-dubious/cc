// app/api/message-star/route.ts
import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { prisma }                       from '@/lib/prisma';
import { getServerSession }             from '@/lib/auth';

// GET: Fetch all starred messages for an organization
export async function GET(request: NextRequest) {
  log.debug('API: message-star GET');

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

    // Fetch all starred messages for the organization (via task)
    const starredMessages = await prisma.messageStar.findMany({
      where: {
        message: {
          task: {
            organizationId: organizationId,
          },
          active: true,
        },
      },
      select: {
        messageId: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: starredMessages.map(ms => ms.messageId),
    });
  } catch (error: unknown) {
    const err = error as Error;
    log.error({ error: err.message, stack: err.stack }, 'Error fetching starred messages');
    return NextResponse.json({ success: false, message: 'Failed to fetch starred messages' }, { status: 500 });
  }
}

// POST: Star a message (toggle - add if not exists, remove if exists)
export async function POST(request: NextRequest) {
  log.debug('API: message-star POST');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json(
        { success: false, message: 'messageId is required' },
        { status: 400 }
      );
    }

    // Check if already starred
    const existing = await prisma.messageStar.findUnique({
      where: { messageId: messageId },
    });

    if (existing) {
      // Remove star
      await prisma.messageStar.delete({
        where: { messageId: messageId },
      });

      log.info({ messageId }, 'Message unstarred');

      return NextResponse.json({
        success: true,
        message: 'Message unstarred',
        starred: false,
      });
    } else {
      // Add star
      await prisma.messageStar.create({
        data: { messageId: messageId },
      });

      log.info({ messageId }, 'Message starred');

      return NextResponse.json({
        success: true,
        message: 'Message starred',
        starred: true,
      });
    }
  } catch (error: unknown) {
    const err = error as Error;
    log.error({ error: err.message, stack: err.stack }, 'Error toggling message star');
    return NextResponse.json({ success: false, message: 'Failed to toggle message star' }, { status: 500 });
  }
}
