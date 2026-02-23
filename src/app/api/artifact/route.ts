// ============================================================================
// app/api/artifact/route.ts
// ============================================================================
import { log }                                      from '@/lib/log';
import { NextResponse }                             from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { artifactRepository,
         ArtifactData }                             from '@/lib/database/artifact';
import { canFetchArtifacts,
         canCreateArtifacts,
         validateUserOrganizationAccess}            from '@/lib/auth/permissions';
import type { ApiResponse }                         from '@/lib/types/api';
import { ArtifactType }                             from '@prisma/client';

// ── POST (fetch) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request)
{
    log.debug('(PRISMA API : artifact - GET (fetch)');

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
            log.error('Invalid token');
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Invalid token' 
                }, 
                { status: 401 });
        }

        // All roles can fetch Artifacts.
        if (!canFetchArtifacts(role))
        {
            log.error('Unauthorized');

            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Unauthorized' 
                },
                { status: 403 }
            );
        }

        // ── Parse & validate body ───────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const organizationIdStr = searchParams.get('organizationId');

        if (!organizationIdStr)
        {
            log.error('organizationId is required');

            return NextResponse.json<ApiResponse>(
                { 
                    success: false,
                    error: 'organizationId is required' 
                },
                { status: 400 }
            );
        }

        const organizationId = organizationIdStr;

        // ADMINs & USERs can fetch Artifacts for Organizations which they have access.
        if (!(await validateUserOrganizationAccess(role, profileId, organizationId))) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false,
                    error  : 'Not authorized for this organization' 
                }, 
                { status: 403 });
        }        

        // ── Database/Prisma ───────────────────────────────────────
        const artifacts = await artifactRepository.findByOrganizationId(organizationId);

        return NextResponse.json<ApiResponse<ArtifactData[]>>(
            {
                success : true,
                data    : artifacts,
            },
            { status: 200 }
        );
    }
    catch (error)
    {
        log.error({ error }, 'Error fetching artifacts');
        return NextResponse.json<ApiResponse>(
            { 
                success: false, 
                error  : 'Failed to fetch artifacts' 
            },
            { status: 500 }
        );
    }
}

// ── POST (create) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request)
{
    log.debug('(PRISMA API : artifact - POST (create)');

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

        // All roles can create Artifacts.
        if (!canCreateArtifacts(role))
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
            type
        } = body;

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

        // -- Organization Id
        if (!organizationId || typeof organizationId !== 'string')
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'organizationId is required' 
                },
                { status: 400 }
            );
        }

        // -- Type
        const validArtifactTypes = Object.values(ArtifactType);
        if (!type || !validArtifactTypes.includes(type)) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : `Invalid artifact type. Must be one of: ${validArtifactTypes.join(', ')}` 
                },
                { status: 400 }
            );
        }

        // ADMINs & USERs can update Artifacts for Organizations which they have access.
        if (!(await validateUserOrganizationAccess(role, profileId, organizationId))) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false,
                    error  : 'Not authorized for this organization' 
                }, 
                { status: 403 });
        }

        // ── Database/Prisma ───────────────────────────────────────
        const newArtifact = await artifactRepository.create({
            name        : name.trim(),
            description : description?.trim() || undefined,
            organizationId,
            type: type as ArtifactType,
        });

        log.info({ artifactId: newArtifact.id }, 'Artifact created successfully');

        return NextResponse.json<ApiResponse<ArtifactData>>(
            {
                success : true,
                message : 'Artifact created successfully',
                data    : newArtifact,
            },
            { status: 201 }
        );
    }
    catch (error)
    {
        log.error({ error }, 'Error creating artifact');
        
        return NextResponse.json<ApiResponse>(
            { 
                success: false, 
                error  : 'Failed to create artifact' 
            },
            { status: 500 }
        );
    }
}