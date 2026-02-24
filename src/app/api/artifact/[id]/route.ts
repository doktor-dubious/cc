// ============================================================================
// app/api/artifact/[id]/route.ts
// ============================================================================
import { log }                                      from '@/lib/log';
import { NextRequest, NextResponse }                from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { organizationRepository }                   from '@/lib/database/organization';
import { settingsRepository }                       from '@/lib/database/settings';
import { artifactRepository }                       from '@/lib/database/artifact';
import { canDeleteArtifacts,
         canUpdateArtifacts,
         validateUserOrganizationAccess}            from '@/lib/auth/permissions';
import type { ApiResponse }                         from '@/lib/types/api';
import { ArtifactType }                             from '@prisma/client';

// ── PATCH (update) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> })
{
    log.debug('(PRISMA API : artifact/[id] - PATCH (update)');

    const { id } = await params;
    const artifactId = id;

    if (!artifactId)
    {
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: 'Invalid artifact ID'
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
            log.error('Unauthorized');
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

        // All roles can update Artifacts.
        if (!canUpdateArtifacts(role))
        {
            log.error({ role: role }, 'Unauthorized for role');
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
        const { name, description, type, organizationIdStr } = body;

        // ── Check existence ────────────────────────────────────────────
        const artifact = await artifactRepository.findById(artifactId);
        if (!artifact)
        {
            log.error({ artifactId: artifactId }, 'Artifact does not exist');
            return NextResponse.json<ApiResponse>(
                {
                    success: false, 
                    error: 'Artifact not found' 
                }, 
                { status: 404 });
        }

        // ADMINs & USERs can only update Artifacts for Organizations they are connected to,
        if (!(await validateUserOrganizationAccess(role, profileId, artifact.organizationId))) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Not authorized for this organization' 
                }, 
                { status: 403 });
        }
        

        // Build update data object - only include defined values
        const updateData: any = {};

        if (name !== undefined) 
        {
            if (!name || typeof name !== 'string' || name.trim() === '') 
            {
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error: 'Name must be a non-empty string' 
                    },
                    { status: 400 }
                );
            }
            updateData.name = name.trim();
        }

        // Only add fields if they're provided (not undefined)
        if (description !== undefined) 
        {
            updateData.description = description?.trim() || null;
        }

        if (type !== undefined) 
        {
            const validArtifactTypes = Object.values(ArtifactType);
            if (!validArtifactTypes.includes(type)) 
            {
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error: `Invalid artifact type. Must be one of: ${validArtifactTypes.join(', ')}` 
                    },
                    { status: 400 }
                );
            }
            updateData.type = type as ArtifactType;
        }

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

        // ── Database/Prisma ───────────────────────────────────────
        const updatedArtifact = await artifactRepository.update(
            artifactId,
            updateData
        );

        return NextResponse.json<ApiResponse>(
        {
            success: true,
            message: 'Artifact updated successfully',
            data   : updatedArtifact,
        }, 
        { status: 200 });
    }
    catch (error)
    {
        log.error({ error }, 'Error updating artifact');

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
                error  : 'Failed to update artifact' 
            },
            { status: 500 }
        );
    }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Deletes both from database and from filesystem.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> })
{
    log.debug('(PRISMA API : artifact/[id] - DELETE');

    const { id } = await params;
    const artifactId = id;

    if (!artifactId)
    {
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error  : 'Invalid Artifact ID'
            },
            { status: 400 }
        );
    }

    // Get active global settings
    const settings = await settingsRepository.getActive();

    if (!settings?.homeDirectory) 
    {
        log.error('No active settings or homeDirectory configured');
        throw new Error('Home Directory not configured');
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

        if (!userId || !role || (role !== 'SUPER_ADMIN' && !profileId))
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Invalid token' 
                }, 
                { status: 401 });
        }

        // All roles can delete Artifacts.
        if (!canDeleteArtifacts(role))
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
        const { deleteFile } = body;
        
        // ── Check existence ────────────────────────────────────────────
        const artifact = await artifactRepository.findById(artifactId);
        if (!artifact)
        {
            log.error({ artifactId: artifactId }, 'Artifact does not exist');
            return NextResponse.json<ApiResponse>(
                {
                    success: false, 
                    error: 'Artifact not found' 
                }, 
                { status: 404 });
        }

        // ADMINs & USERs can only delete Artifacts for Organizations they are connected to,
        if (!(await validateUserOrganizationAccess(role, profileId, artifact.organizationId))) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false,
                    error  : 'Not authorized for this organization' 
                }, 
                { status: 403 });
        }

        // ── Delete from filesystem if requested ────────────────────────────────────────────
        if (deleteFile && artifact.originalName) 
        {
            try 
            {
                // Get organization settings to find artifact directory
                const organization = await organizationRepository.findByIdWithSettings(artifact.organizationId);

                if (!organization?.settings?.artifactDirectory) 
                {
                    log.warn({ 
                        artifactId, 
                        organizationId: artifact.organizationId 
                    }, 'No artifact directory configured for organization');
                    throw new Error('Artifact directory not configured');
                }

                const fs = require('fs').promises;
                const path = require('path');

                // Construct the full file path
                const artifactDirectory = organization.settings.artifactDirectory;

                const resolvedPath = path.resolve(
                    settings.homeDirectory,
                    path.relative('/', artifactDirectory),
                    artifact.originalName
                );

                if (!resolvedPath.startsWith(path.resolve(settings.homeDirectory))) 
                {
                    // Make sure we don't escape base directory.
                    throw new Error('Invalid file path');
                }

                log.info({ artifact: resolvedPath }, "Deleting Artifact");

                // Check if file exists before attempting to delete
                try 
                {
                    await fs.access(resolvedPath);
                    await fs.unlink(resolvedPath);
                    log.info({ ID: artifactId, file: resolvedPath }, 'File deleted from filesystem');
                } 
                catch (accessError) 
                {
                    log.warn({ ID: artifactId, file: resolvedPath }, 'File not found on filesystem');
                }
            }
            catch (fileError) 
            {
                log.error({ 
                    artifactId, 
                    error: fileError,
                    organizationId: artifact.organizationId 
                }, 'Failed to delete file from filesystem');

                return NextResponse.json<ApiResponse>(
                    {
                        success: false,
                        error  : 'Failed to delete file from filesystem'
                    },
                    { status: 500 }
                );
            }
        }

        // ── Database/Prisma ───────────────────────────────────────
        await artifactRepository.delete(artifactId);

        return NextResponse.json<ApiResponse>(
        {
            success: true,
            message: deleteFile ? 'Artifact and file deleted successfully' : 'Artifact deleted successfully'
        },
        { status: 200 });
    }
    catch (error)
    {
        log.error({ error }, 'Error deleting artifact');

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
                error  : 'Failed to delete artifact' 
            },
            { status: 500 }
        );
    }
}

