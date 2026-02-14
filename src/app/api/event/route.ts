// app/api/event/route.ts
import { log }                                      from '@/lib/log';
import { NextResponse }                             from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { eventRepository }                          from '@/lib/database/events';
import type { ApiResponse }                         from '@/lib/types/api';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET - Fetch events for a task, organization, profile, or artifact
export async function GET(request: Request)
{
    log.debug('(PRISMA API : event - GET (fetch)');

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

        // ── Get query params ──────────────────────────────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const taskIdParam = searchParams.get('taskId');
        const organizationIdParam = searchParams.get('organizationId');
        const profileIdParam = searchParams.get('profileId');
        const artifactIdParam = searchParams.get('artifactId');

        let events;

        // Fetch events based on which parameter is provided
        if (taskIdParam)
        {
            const taskId = parseInt(taskIdParam, 10);
            if (isNaN(taskId))
            {
                return NextResponse.json<ApiResponse>(
                    {
                        success: false,
                        error: 'Invalid taskId'
                    },
                    { status: 400 }
                );
            }
            events = await eventRepository.findByTaskId(taskId);
        }
        else if (organizationIdParam)
        {
            const organizationId = parseInt(organizationIdParam, 10);
            if (isNaN(organizationId))
            {
                return NextResponse.json<ApiResponse>(
                    {
                        success: false,
                        error: 'Invalid organizationId'
                    },
                    { status: 400 }
                );
            }
            events = await eventRepository.findByOrganizationId(organizationId);
        }
        else if (profileIdParam)
        {
            const profileId = parseInt(profileIdParam, 10);
            if (isNaN(profileId))
            {
                return NextResponse.json<ApiResponse>(
                    {
                        success: false,
                        error: 'Invalid profileId'
                    },
                    { status: 400 }
                );
            }
            events = await eventRepository.findByProfileId(profileId);
        }
        else if (artifactIdParam)
        {
            const artifactId = parseInt(artifactIdParam, 10);
            if (isNaN(artifactId))
            {
                return NextResponse.json<ApiResponse>(
                    {
                        success: false,
                        error: 'Invalid artifactId'
                    },
                    { status: 400 }
                );
            }
            events = await eventRepository.findByArtifactId(artifactId);
        }
        else
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'One of taskId, organizationId, profileId, or artifactId is required'
                },
                { status: 400 }
            );
        }

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
        log.error(error, '(PRISMA API : event - GET) Error');
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
// POST - Create a new event
export async function POST(request: Request)
{
    log.debug('(PRISMA API : event - POST (create)');

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
        const { message, importance, taskId, organizationId, profileId, artifactId } = body;

        if (!message)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'message is required'
                },
                { status: 400 }
            );
        }

        // ── Create event ──────────────────────────────────────────────────────────────────
        const event = await eventRepository.create({
            message: message.trim(),
            importance: importance as 'LOW' | 'MIDDLE' | 'HIGH' | undefined,
            userId: userId,
            taskId: taskId ? parseInt(taskId, 10) : undefined,
            organizationId: organizationId ? parseInt(organizationId, 10) : undefined,
            profileId: profileId ? parseInt(profileId, 10) : undefined,
            artifactId: artifactId ? parseInt(artifactId, 10) : undefined,
        });

        return NextResponse.json<ApiResponse>(
            {
                success: true,
                data: event,
            },
            { status: 201 }
        );
    }
    catch (error: any)
    {
        log.error(error, '(PRISMA API : event - POST) Error');
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: error.message || 'Internal server error',
            },
            { status: 500 }
        );
    }
}
