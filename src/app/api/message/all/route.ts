// app/api/message/all/route.ts
import { log }                                      from '@/lib/log';
import { NextResponse }                             from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { prisma }                                   from '@/lib/prisma';
import type { ApiResponse }                         from '@/lib/types/api';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET - Fetch all messages for an organization
export async function GET(request: Request)
{
    log.debug('(PRISMA API : message/all - GET (fetch)');

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

        // ── Get organizationId from query params ────────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const orgIdParam = searchParams.get('organizationId');

        if (!orgIdParam)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'organizationId is required'
                },
                { status: 400 }
            );
        }

        const organizationId = orgIdParam;

        // ── Fetch all messages for tasks in this organization ───────────────────────────
        const messages = await prisma.message.findMany({
            where: {
                active: true,
                task: {
                    organizationId: organizationId,
                    active: true,
                },
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
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
        log.error(error, '(PRISMA API : message/all - GET) Error');
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: error.message || 'Internal server error',
            },
            { status: 500 }
        );
    }
}
