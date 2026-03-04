// app/api/organization/route.ts
import { log }                                      from '@/lib/log';
import { NextRequest, NextResponse }                from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { organizationRepository }                   from '@/lib/database/organization';
import { settingsRepository }                       from '@/lib/database/settings';
import { canFetchOrganizations,
        canCreateOrganizations }                    from '@/lib/auth/permissions';
import type { ApiResponse }                         from '@/lib/types/api';
import type { OrganizationWithAll,
              organizationData }                    from '@/lib/database/organization';
import { mkdir }                                    from 'fs/promises';
import path                                         from 'path';

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

        // ── Auto-generate organization directories ───────────────────────────────────────
        try
        {
            const settings = await settingsRepository.getActive();
            if (settings?.homeDirectory)
            {
                const homeDir = settings.homeDirectory;
                const orgDirName = `org-${newOrganization.id}`;
                const orgBasePath = path.join(homeDir, orgDirName);

                const uploadDir = path.join(orgBasePath, 'upload');
                const downloadDir = path.join(orgBasePath, 'download');
                const artifactDir = path.join(orgBasePath, 'artifact');

                // Create directories recursively
                await mkdir(uploadDir, { recursive: true });
                await mkdir(downloadDir, { recursive: true });
                await mkdir(artifactDir, { recursive: true });

                // Create OrganisationSettings record with directory paths
                await organizationRepository.updateSettings(newOrganization.id, {
                    uploadDirectory   : uploadDir,
                    downloadDirectory : downloadDir,
                    artifactDirectory : artifactDir,
                });

                log.info({ organizationId: newOrganization.id, uploadDir, downloadDir, artifactDir }, 'Organization directories created');
            }
            else
            {
                log.warn({ organizationId: newOrganization.id }, 'No home directory configured in settings, skipping directory creation');
            }
        }
        catch (dirError)
        {
            // Log but don't fail organization creation if directory creation fails
            log.error({ error: dirError, organizationId: newOrganization.id }, 'Failed to create organization directories');
        }

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
