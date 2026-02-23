// app/api/event/all/route.ts
import { log }                                      from '@/lib/log';
import { NextResponse }                             from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { prisma }                                   from '@/lib/prisma';
import type { ApiResponse }                         from '@/lib/types/api';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET - Fetch all events for an organization (including events on tasks, profiles, artifacts within that org)
export async function GET(request: Request)
{
    log.debug('(PRISMA API : event/all - GET (fetch)');

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

        // ── Fetch all events related to this organization ───────────────────────────────
        // Events directly on the org, or on tasks/profiles/artifacts belonging to the org
        const events = await prisma.event.findMany({
            where: {
                active: true,
                OR: [
                    { organizationId: organizationId },
                    { task: { organizationId: organizationId, active: true } },
                    { profile: { organizationId: organizationId, active: true } },
                    { artifact: { organizationId: organizationId, active: true } },
                ],
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                profile: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                artifact: {
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
                data: events,
            },
            { status: 200 }
        );
    }
    catch (error: any)
    {
        log.error(error, '(PRISMA API : event/all - GET) Error');
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: error.message || 'Internal server error',
            },
            { status: 500 }
        );
    }
}
