// app/api/message/[id]/route.ts
import { log }                                      from '@/lib/log';
import { NextResponse }                             from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { prisma }                                   from '@/lib/prisma';
import type { ApiResponse }                         from '@/lib/types/api';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// PATCH - Update message (mark as read, edit content)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
)
{
    log.debug('(PRISMA API : message - PATCH (update)');

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

        const { id: userId } = session.user;

        // Await params in Next.js 15+
        const resolvedParams = await params;
        const messageId = resolvedParams.id;

        if (!messageId)
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
        const { isRead, content } = body;

        const data: any = {};

        if (typeof isRead === 'boolean')
        {
            data.isRead = isRead;
        }

        if (typeof content === 'string')
        {
            // Only allow editing own messages
            const existing = await prisma.message.findUnique({ where: { id: messageId } });
            if (!existing || existing.senderId !== userId)
            {
                return NextResponse.json<ApiResponse>(
                    {
                        success: false,
                        error: 'You can only edit your own messages'
                    },
                    { status: 403 }
                );
            }
            data.content = content.trim();
        }

        if (Object.keys(data).length === 0)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'No valid fields to update'
                },
                { status: 400 }
            );
        }

        // ── Update message ────────────────────────────────────────────────────────────────
        const message = await prisma.message.update({
            where: { id: messageId },
            data,
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

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// DELETE - Soft delete a message
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
)
{
    log.debug('(PRISMA API : message - DELETE (soft delete)');

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
        const messageId = resolvedParams.id;

        if (!messageId)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'Invalid message ID'
                },
                { status: 400 }
            );
        }

        // ── Soft delete message ─────────────────────────────────────────────────────────
        const message = await prisma.message.update({
            where: { id: messageId },
            data: { active: false },
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
        log.error(error, '(PRISMA API : message - DELETE) Error');
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: error.message || 'Internal server error',
            },
            { status: 500 }
        );
    }
}
