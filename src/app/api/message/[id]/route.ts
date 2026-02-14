// app/api/message/[id]/route.ts
import { log }                                      from '@/lib/log';
import { NextResponse }                             from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { prisma }                                   from '@/lib/prisma';
import type { ApiResponse }                         from '@/lib/types/api';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// PATCH - Mark message as read
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
)
{
    log.debug('(PRISMA API : message - PATCH (mark as read)');

    try
    {
        // ── Authentication ────────────────────────────────────────────────────────────────
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'Unauthorized'
                },
                { status: 401 }
            );
        }

        // Await params in Next.js 15+
        const resolvedParams = await params;
        const messageId = parseInt(resolvedParams.id, 10);

        if (isNaN(messageId))
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'Invalid message ID'
                },
                { status: 400 }
            );
        }

        // ── Parse body ────────────────────────────────────────────────────────────────────
        const body = await request.json();
        const { isRead } = body;

        if (typeof isRead !== 'boolean')
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'isRead must be a boolean'
                },
                { status: 400 }
            );
        }

        // ── Update message ────────────────────────────────────────────────────────────────
        const message = await prisma.message.update({
            where: { id: messageId },
            data: { isRead },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json<ApiResponse>(
            {
                success: true,
                data: message,
            },
            { status: 200 }
        );
    }
    catch (error: any)
    {
        log.error(error, '(PRISMA API : message - PATCH) Error');
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: error.message || 'Internal server error',
            },
            { status: 500 }
        );
    }
}
