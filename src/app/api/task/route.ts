// app/api/task/route.ts
import { log }                                      from '@/lib/log';
import { NextResponse }                             from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { taskRepository }                           from '@/lib/database/task';
import { canFetchTasks,
        canFetchAllTasks,
        canCreateTasks,
        validateAdminOrganizationAccess }           from '@/lib/auth/permissions';
import type { ApiResponse }                         from '@/lib/types/api';
import type { TaskObj, TaskWithRelations }          from '@/lib/database/task';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET
export async function GET(request: Request)
{
    log.debug('(PRISMA API : task - GET (fetch)');

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

        const { id: userId, profileId, role } = session.user;
        log.debug({ userId: userId, profileId: profileId ?? 'missing profileId', role: role ?? 'missing role' }, 'Payload');

        if (!userId || !role || (role !== 'SUPER_ADMIN' && !profileId))
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'Invalid token' 
                }, 
                { status: 401 });
        }

        // ADMIN and SUPER ADMINs can fetch tasks.
        if (!canFetchTasks(role))
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Unauthorized' 
                },
                { status: 403 }
            );
        }

        // ── Parse & validate url/body ───────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const organizationIdStr = searchParams.get('organizationId');

        if (!organizationIdStr)
        {
            // Fetch ALL Tasks → ONLY allowed for SUPER_ADMIN            
            if (!canFetchAllTasks(role))
            {
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error  : 'Unauthorized' 
                    },
                    { status: 403 }
                );
            }

            // Fetch.
            const tasks = await taskRepository.findAll();

            return NextResponse.json<ApiResponse<TaskObj[]>>(
                {
                    success : true,
                    data    : tasks,
                },
                { status: 200 }
            );
        }
        else
        {
            const organizationId = organizationIdStr;
            if (!organizationId)
            {
                return NextResponse.json<ApiResponse>(
                    {
                        success: false,
                        error  : 'Invalid organizationId'
                    },
                    { status: 400 }
                );
            }

            // ADMINs can only fetch Tasks for organizations for which they have access.
            if (!(await validateAdminOrganizationAccess(role, profileId, organizationId))) 
            {
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error  : 'Not authorized for this organization' 
                    }, 
                    { status: 403 });
            }

            // Fetch tasks for the organization
            const tasks = await taskRepository.findByOrganizationId(organizationId);

            return NextResponse.json<ApiResponse<TaskWithRelations[]>>(
                {
                    success: true,
                    data: tasks,
                },
                { status: 200 }
            );
        }
    }
    catch (error)
    {
        log.error({ error }, 'Error fetching tasks');
        return NextResponse.json<ApiResponse>(
            { 
                success: false, 
                error  : 'Failed to fetch tasks' 
            },
            { status: 500 }
        );
    }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// POST
export async function POST(request: Request)
{
    log.debug('(PRISMA API : task - POST (create)');
    
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

        const { id: userId, profileId, role } = session.user;
        log.debug({ userId: userId, profileId: profileId ?? 'missing profileId', role: role ?? 'missing role' }, 'Payload');

        if (!userId || !role || (role !== 'SUPER_ADMIN' && !profileId))
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Invalid token' 
                }, 
                { status: 401 });
        }

        // ADMIN and SUPER ADMINs can create tasks.
        if (!canCreateTasks(role))
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Unauthorized' 
                },
                { status: 403 }
            );
        }

        // ── Parse & validate body ───────────────────────────────────────
        const body = await request.json();
        const { 
            name, 
            description, 
            organizationId,
            expectedEvidence,
            startAt,
            endAt,
            status 
        } = body;

        // Validate required fields
        if (!name || typeof name !== 'string' || name.trim() === '')
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Name is required' 
                },
                { status: 400 }
            );
        }

        // Validate dates if provided
        if (startAt)
        {
            const startDate = new Date(startAt);
            if (isNaN(startDate.getTime()))
            {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: 'Invalid startAt date' },
                    { status: 400 }
                );
            }
        }

        if (endAt) 
        {
            const endDate = new Date(endAt);
            if (isNaN(endDate.getTime()))
            {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: 'Invalid endAt date' },
                    { status: 400 }
                );
            }
            
            // Check that endAt is after startAt
            if (startAt && endDate <= new Date(startAt)) 
            {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: 'endAt must be after startAt' },
                    { status: 400 }
                );
            }
        }

        // Validate status if provided
        const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']; // Adjust based on your TaskStatus enum
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error: 'Invalid status value' 
                },
                { status: 400 }
            );
        }        

        if (!organizationId || typeof organizationId !== 'string')
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'Valid organizationId is required'
                },
                { status: 400 }
            );
        }

        // ADMINs can only create Tasks for organizations for which they have access.
        if (!(await validateAdminOrganizationAccess(role, profileId, organizationId))) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false,
                    error  : 'Not authorized for this organization' 
                }, 
                { status: 403 });
        }

        // ── Database/Prisma ───────────────────────────────────────
        const newTask = await taskRepository.create(
        {
            name                : name.trim(),
            description         : description?.trim() || undefined,
            organizationId,
            expectedEvidence    : expectedEvidence?.trim() || undefined,
            startAt             : startAt ? new Date(startAt) : undefined,
            endAt               : endAt ? new Date(endAt) : undefined,
            status              : status || 'NOT_STARTED',
        });

        log.info({ taskId: newTask.id }, 'Task created successfully');

        return NextResponse.json<ApiResponse<TaskObj>>(
            {
                success: true,
                message: 'Task created successfully',
                data   : newTask,
            },
            { status: 201 }
        );
    }
    catch (error)
    {
        log.error({ error }, 'Error creating task');
        
        return NextResponse.json<ApiResponse>(
            { 
                success: false,
                error  : 'Failed to create task' 
            },
            { status: 500 }
        );
    }
}