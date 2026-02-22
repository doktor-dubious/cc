import { log }                                      from '@/lib/log';
import { NextResponse, NextRequest }                from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { taskRepository }                           from '@/lib/database/task';
import { TaskStatus }                               from '@prisma/client';

import { canUpdateTasks,
        canDeleteTasks,
        validateAdminOrganizationAccess }           from '@/lib/auth/permissions';
import type { ApiResponse }                         from '@/lib/types/api';
import type { TaskObj }                             from '@/lib/database/task';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// PATCH
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> })
{
    log.debug('(PRISMA API : task/[id] - PATCH (update)');

    const { id } = await params;
    const taskId = id;
    if (!taskId)
    {
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error  : 'Invalid task ID'
            },
            { status: 400 });
    }

    try
    {
        // ── Authentication & Authorization ──────────────────────────────
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

        if (!userId || !role || !profileId)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Invalid token'
                },
                { status: 401 });
        }

        // ADMIN and SUPER ADMINs can update tasks.
        if (!canUpdateTasks(role))
        {
            log.error({ role: role }, 'Missing authorization to update task');
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Insufficient permissions' 
                },
                { status: 403 }
            );
        }

        // ── Parse & validate body ───────────────────────────────────────
        const body = await request.json();
        const updateData: any = {};

        // -- Name
        if ('name' in body) 
        {
            if (!body.name || typeof body.name !== 'string' || body.name.trim() === '')
            {
                log.error('Invalid Name');
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error: 'Name must be a non-empty string' 
                    },
                    { status: 400 }
                );
            }
            updateData.name = body.name.trim();
        }

        // -- Description
        if ('description' in body) 
        {
            updateData.description = body.description?.trim() ?? null;
        }

        // -- Expected Evidence
        if ('expectedEvidence' in body) 
        {
            updateData.expectedEvidence = body.expectedEvidence?.trim() ?? null;
        }

        // -- Start Date
        if ('startAt' in body)
        {
            if (body.startAt !== null) 
            {
                const startDate = new Date(body.startAt);
                if (isNaN(startDate.getTime()))
                {
                    log.error({ Date: body.startAt }, 'Invalid Start Date');
                    return NextResponse.json<ApiResponse>(
                        { success: false, error: 'Invalid startAt date' },
                        { status: 400 }
                    );
                }
                updateData.startAt = startDate;
            } 
            else 
            {
                updateData.startAt = null;
            }
        }

        // -- End Date
        if ('endAt' in body) 
        {
            if (body.endAt !== null) 
            {
                const endDate = new Date(body.endAt);
                if (isNaN(endDate.getTime()))
                {
                    log.error({ Date: body.endAt }, 'Invalid End Date (1)');
                    return NextResponse.json<ApiResponse>(
                        { success: false, error: 'Invalid endAt date' },
                        { status: 400 }
                    );
                }
                
                // Check that endAt is after startAt (if both are being set)
                const startAt = updateData.startAt || (await taskRepository.findById(taskId))?.startAt;
                if (startAt && endDate <= new Date(startAt)) 
                {
                    log.error({ Date: body.endAt }, 'Invalid End Date (2)');
                    return NextResponse.json<ApiResponse>(
                        { success: false, error: 'endAt must be after startAt' },
                        { status: 400 }
                    );
                }
                
                updateData.endAt = endDate;
            } 
            else 
            {
                updateData.endAt = null;
            }
        }

        // -- Status
        if ('status' in body) 
        {
            const validStatuses = Object.values(TaskStatus) as string[];
            if (body.status && !validStatuses.includes(body.status)) 
            {
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error  : 'Invalid status value' 
                    },
                    { status: 400 }
                );
            }
            updateData.status = body.status as TaskStatus;
        }

        // -- Organization ID (nested relation syntax)
        if ('organization' in body) 
        {
            if (body.organization?.disconnect === true) 
            {
                updateData.organization = { disconnect: true };
            } 
            else if (body.organization?.connect?.id) 
            {
                const orgId = body.organization.connect.id;
                if (!orgId)
                {
                    return NextResponse.json<ApiResponse>(
                        {
                            success: false,
                            error: 'Invalid organization ID in connect'
                        },
                        { status: 400 }
                    );
                }
                updateData.organization = { connect: { id: orgId } };
            } 
            else 
            {
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error: 'Invalid organization update format' 
                    },
                    { status: 400 }
                );
            }
        }
        else if ('organizationId' in body) 
        {
            log.warn('Using deprecated organizationId format — prefer { organization: { disconnect: true } }');
            
            if (body.organizationId === null) 
            {
                updateData.organization = { disconnect: true };
            } 
            else 
            {
                const orgId = body.organizationId;
                if (!orgId)
                {
                    return NextResponse.json<ApiResponse>(
                        {
                            success: false,
                            error: 'Invalid organizationId'
                        },
                        { status: 400 }
                    );
                }
                updateData.organization = { connect: { id: orgId } };
            }
        }

        // Check if there are any fields to update
        if (Object.keys(updateData).length === 0) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error: 'No fields to update' 
                }, 
                { status: 400 }
            );
        }

        // ── Check existence ────────────────────────────────────────────
        const existingTask = await taskRepository.findById(taskId);
        if (!existingTask)
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false,
                    error: 'Task not found' 
                }, 
                { status: 404 }
            );
        }

        // For ADMINs, verify they can access this task's organization
        if (role === 'ADMIN' && existingTask.organizationId) 
        {
            if (!(await validateAdminOrganizationAccess(role, profileId, existingTask.organizationId))) 
            {
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error: 'Not authorized for this organization' 
                    }, 
                    { status: 403 }
                );
            }
        }

        // ── Perform update ─────────────────────────────────────────────
        const updatedTask = await taskRepository.update(taskId, updateData);

        log.info({ taskId: updatedTask?.id }, 'Task updated successfully');

        return NextResponse.json<ApiResponse<TaskObj>>(
            {
                success: true,
                message: 'Task updated',
                data   : updatedTask,
            },
            { status: 200 }
        );
    }
    catch (error: unknown)
    {
        log.error({ error }, 'Error updating task');
        log.error({ 
            taskId, 
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, 'Task update failed');

        if (error instanceof Error && error.name === 'JWSSignatureVerificationFailed')
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false,
                    error: 'Invalid or expired token' 
                }, 
                { status: 401 });
        }

        if (error instanceof Error && 'code' in error && error.code === 'P2025')
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Task not found' 
                }, 
                { status: 404 });
        }

        return NextResponse.json<ApiResponse>(
            { 
                success: false,
                error  : 'Failed to update task' 
            },
            { status: 500 }
        );
    }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// DELETE
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> })
{
    log.debug('(PRISMA API : task/[id] - DELETE');

    const { id } = await params;
    const taskId = id;
    if (!taskId)
    {
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: 'Invalid task ID'
            },
            { status: 400 }
        );
    }

    try
    {
        // ── Authentication & Authorization ──────────────────────────────
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

        if (!userId || !role || !profileId)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Invalid token'
                },
                { status: 401 });
        }

        // ADMIN and SUPER ADMINs can update Tasks.
        if (!canDeleteTasks(role))
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Insufficient permissions' 
                },
                { status: 403 }
            );
        }

        // ── Check existence ────────────────────────────────────────────
        const existingTask = await taskRepository.findById(taskId);
        if (!existingTask)
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false,
                    error: 'Task not found' 
                }, 
                { status: 404 }
            );
        }

        // For ADMINs, verify they can access this task's organization
        if (role === 'ADMIN' && existingTask.organizationId) 
        {
            if (!(await validateAdminOrganizationAccess(role, profileId, existingTask.organizationId))) 
            {
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error: 'Not authorized for this organization' 
                    }, 
                    { status: 403 }
                );
            }
        }

        // ── Database/Prisma (Perform delete) ───────────────────────────────────────
        const prismaResult = await taskRepository.delete(taskId);

        if (!prismaResult)
        {
            log.warn({ taskId }, 'Task delete returned null/undefined');
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Task delete failed or not found' 
                },
                { status: 404 }
            );
        }

        log.info({ taskId: prismaResult.id }, 'Task deleted successfully');

        return NextResponse.json<ApiResponse>(
        {
            success     : true,
            message     : 'Task deleted successfully'
        },
        { status: 200 });
    }
    catch (error)
    {
        log.error({ error }, 'Error deleting task');

        if (error instanceof Error && error.name === 'JWSSignatureVerificationFailed')
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false,
                    error: 'Invalid or expired token' 
                }, 
                { status: 401 });
        }

        return NextResponse.json<ApiResponse>(
            { 
                success: false,
                error: 'Failed to delete Task' 
            },
            { status: 500 }
        );
    }
}
