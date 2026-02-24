// app/api/organization/route.ts
import { log }                                      from '@/lib/log';
import { NextRequest, NextResponse }                from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { organizationRepository }                   from '@/lib/database/organization';
import { canFetchOrganizations,
        canCreateOrganizations }                    from '@/lib/auth/permissions';
import type { ApiResponse }                         from '@/lib/types/api';
import type { OrganizationWithAll, 
              organizationData }                    from '@/lib/database/organization';

export async function GET(request: NextRequest)
{
    log.debug('(PRISMA API : organization - GET');

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

        // SUPER ADMINs can fetch organizations.
        if (!canFetchOrganizations(role))
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Unauthorized' 
                },
                { status: 403 }
            );
        }

        // ── Database/Prisma ───────────────────────────────────────
        const organizations = await organizationRepository.findAllWithProfilesTasksAndSettings();

        return NextResponse.json<ApiResponse<OrganizationWithAll[]>>(
            {
                success : true,
                data    : organizations,
            },
            { status: 200 }
        );
    }
    catch (error)
    {
        log.error({ error }, 'Error fetching organizations');

        if (error instanceof Error && error.name === 'JWSSignatureVerificationFailed')
        {
            return NextResponse.json<ApiResponse>(
                {
                    success : false,
                    error   : 'Invalid or expired token' 
                }, 
                { status: 401 });
        }

        return NextResponse.json<ApiResponse>(
            {
                success : false,
                error   : 'Error fetching organizations'
            },
            { status: 500 }
        );
    }
}

export async function POST(request: Request)
{
    log.debug('(PRISMA API : organization - POST (create)');

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

        // SUPER ADMINs can create organizations.
        if (!canCreateOrganizations(role))
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

        // Validate input
        if (!name || typeof name !== 'string' || name.trim() === '')
        {
            return NextResponse.json<ApiResponse>(
                {
                    success : false,
                    error   : 'Name is required' },
                { status: 400 }
            );
        }

        // ── Database/Prisma ───────────────────────────────────────
        const newOrganization = await organizationRepository.create(
        {
            name        : name.trim(),
            description : description?.trim() ?? null
        });

        log.info({ organizationId: newOrganization.id }, 'Organization created successfully');

        return NextResponse.json<ApiResponse<organizationData>>(
            {
                success         : true,
                message         : 'Organization created successfully',
                data            : newOrganization,
            },
            { status: 201 } // 201 = Created status
        );
    }
    catch (error)
    {
        console.error('Error creating organization:', error);
        log.error({ error }, 'Error creating organization');

        return NextResponse.json<ApiResponse>(
            {
                success : false,
                error   : 'Failed to create organization' },
            { status: 500 }
        );
    }
}
