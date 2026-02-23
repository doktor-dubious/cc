// app/api/message/route.ts
import { log }                                      from '@/lib/log';
import { NextResponse }                             from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { prisma }                                   from '@/lib/prisma';
import type { ApiResponse }                         from '@/lib/types/api';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET - Fetch messages for a task
export async function GET(request: Request)
{
    log.debug('(PRISMA API : message - GET (fetch)');

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

        const { id: userId, role } = session.user;

        if (!userId || !role)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'Invalid token'
                },
                { status: 401 });
        }

        // ── Get taskId from query params ──────────────────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const taskIdParam = searchParams.get('taskId');

        if (!taskIdParam)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'taskId is required'
                },
                { status: 400 }
            );
        }

        const taskId = taskIdParam;

        // ── Fetch messages ────────────────────────────────────────────────────────────────
        const messages = await prisma.message.findMany({
            where: {
                taskId: taskId,
                active: true,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc', // Most recent first
            },
        });

        return NextResponse.json<ApiResponse>(
            {
                success: true,
                data: messages,
            },
            { status: 200 }
        );
    }
    catch (error: any)
    {
        log.error(error, '(PRISMA API : message - GET) Error');
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
// POST - Create a new message
export async function POST(request: Request)
{
    log.debug('(PRISMA API : message - POST (create)');

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

        if (!userId)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'Invalid token'
                },
                { status: 401 }
            );
        }

        // ── Parse body ────────────────────────────────────────────────────────────────────
        const body = await request.json();
        const { taskId, content, type = 'USER' } = body;

        if (!taskId || !content)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'taskId and content are required'
                },
                { status: 400 }
            );
        }

        // ── Create message ────────────────────────────────────────────────────────────────
        const message = await prisma.message.create({
            data: {
                taskId: taskId,
                content: content.trim(),
                type: type,
                senderId: type === 'USER' ? userId : null,
            },
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
            { status: 201 }
        );
    }
    catch (error: any)
    {
        log.error(error, '(PRISMA API : message - POST) Error');
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: error.message || 'Internal server error',
            },
            { status: 500 }
        );
    }
}
