// app/api/organization/route.ts

import { log }                                      from '@/lib/log';
import { NextRequest, NextResponse }                from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { organizationRepository }                   from '@/lib/database/organization';
import { canUpdateOrganizations,
         canDeleteOrganizations}                    from '@/lib/auth/permissions';
import type { ApiResponse }                         from '@/lib/types/api';
import type { organizationData }                    from '@/lib/database/organization';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> })
{
    log.debug('(PRISMA API : organization/[id] - PATCH');

    const { id } = await params;
    const organizationId = id;

    if (!organizationId)
    {
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: 'Invalid organization ID'
            },
            { status: 400 }
        );
    }

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

        if (!userId || !role || !profileId)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Invalid token'
                },
                { status: 401 });
        }

        // SUPER ADMINs can fetch organizations.
        if (!canUpdateOrganizations(role))
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
        const { name, description } = body;

        // -- Name
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

        // ── Check existence ────────────────────────────────────────────
        const org = await organizationRepository.findById(organizationId);
        if (!org)
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false,
                    error  : 'Organization not found' 
                }, 
                { status: 404 });
        }

        // ── Database/Prisma ───────────────────────────────────────
        const updatedOrganization = await organizationRepository.updateOrganization(organizationId,
            {
                name        : name.trim(),
                description : description?.trim() ?? null
            }
        );

        return NextResponse.json<ApiResponse<organizationData>>(
        {
            success  : true,
            message  : 'Organization updated successfully',
            data     : updatedOrganization,
        },
        { status: 200 });
    }
    catch (error)
    {
        console.error('Error updating organization:', error);
        log.error({ error }, 'Error updating organization');

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
                error: 'Failed to update organization' 
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> })
{
    log.debug('(PRISMA API : organization/[id] - DELETE');

    const { id } = await params;
    const organizationId = id;
    if (!organizationId)
    {
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: 'Invalid organization ID'
            },
            { status: 400 }
        );
    }

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

        if (!userId || !role || !profileId)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Invalid token'
                },
                { status: 401 });
        }

        // SUPER ADMINs can delete Organizations.
        if (!canDeleteOrganizations(role))
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Unauthorized' 
                },
                { status: 403 }
            );
        }

        // ── Check existence ────────────────────────────────────────────
        const org = await organizationRepository.findById(organizationId);
        if (!org)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Organization not found' 
                }, 
                { status: 404 });
        }

        // ── Database/Prisma ───────────────────────────────────────
        await organizationRepository.delete(organizationId);

        return NextResponse.json<ApiResponse>(
        {
            success     : true,
            message     : 'Organization deleted successfully'
        },
        { status: 200 });
    }
    catch (error)
    {
        log.error({ error }, 'Error deleting organization');

        if (error instanceof Error && error.name === 'JWSSignatureVerificationFailed')
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Invalid or expired token' 
                }, 
                { status: 401 });
        }

        return NextResponse.json<ApiResponse>(
            { 
                success: false,
                error  : 'Failed to delete organization' 
            },
            { status: 500 }
        );
    }
}
