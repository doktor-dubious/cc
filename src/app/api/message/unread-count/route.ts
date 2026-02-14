// app/api/message/unread-count/route.ts
import { log }                                      from '@/lib/log';
import { NextResponse }                             from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { prisma }                                   from '@/lib/prisma';
import type { ApiResponse }                         from '@/lib/types/api';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET - Fetch total unread message count for the current user
export async function GET(request: Request)
{
    log.debug('(PRISMA API : message/unread-count - GET)');

    try
    {
        // ── Authentication ────────────────────────────────────────────────────────────────
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Unauthorized'
                },
                { status: 401 });
        }

        const { id: userId } = session.user;

        if (!userId)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'Invalid token'
                },
                { status: 401 });
        }

        // ── Count unread messages across all active tasks ─────────────────────────────────
        const unreadCount = await prisma.message.count({
            where: {
                active: true,
                isRead: false,
            },
        });

        return NextResponse.json<ApiResponse>(
            {
                success: true,
                data: { count: unreadCount },
            },
            { status: 200 }
        );
    }
    catch (error: any)
    {
        log.error(error, '(PRISMA API : message/unread-count - GET) Error');
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: error.message || 'Internal server error',
            },
            { status: 500 }
        );
    }
}
