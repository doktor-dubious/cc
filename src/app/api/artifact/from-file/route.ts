import { log }                                      from '@/lib/log';
import { NextResponse              }                from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import type { ApiResponse }                         from '@/lib/types/api';
import fs                                           from 'fs/promises';
import path                                         from 'path';
import mime                                         from 'mime-types';
import { artifactRepository,
         ArtifactData }                             from '@/lib/database/artifact';
import { organizationRepository }                   from '@/lib/database/organization';
import { settingsRepository }                       from '@/lib/database/settings';

import { ArtifactType }                             from '@prisma/client';
import { canAssignArtifacts,
         validateUserOrganizationAccess}            from '@/lib/auth/permissions';

export async function POST(request: Request) 
{
    log.debug('(PRISMA API : artifact/from-file - POST (create/assign)');

    try 
    {
        // Get active global settings
        const settings = await settingsRepository.getActive();

        if (!settings?.homeDirectory) 
        {
            log.error('No active settings or homeDirectory configured');
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Home Directory not configured' },
                { status: 500 }
            );
        }

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

        // Check permissions
        if (!canAssignArtifacts(role))
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
            organizationId,
            filename,
            name, 
            description, 
            type
        } = body;

        // Validate required fields.
        if (!organizationId || !name || !type)
        {
            log.error({ organizationId: organizationId, filename: filename, name: name, type: type }, 'Organization Id, Filename, Name, and Type are required');

            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Organization Id, Filename, Name, and Type are required' 
                },
                { status: 400 }
            );
        }

        // -- Organization ID
        if (typeof organizationId !== 'number' || organizationId <= 0)
        {
            log.error({ organizationId: organizationId }, 'Invalid Organization Id');

            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Invalid Organization Id' 
                },
                { status: 400 }
            );
        }

        // -- Name
        if (!name || typeof name !== 'string' || name.trim() === '')
        {
            log.error({ name: name }, 'Invalid Name');

            return NextResponse.json<ApiResponse>(
                {
                    success: false, 
                    error  : 'Invalid Name' 
                },
                { status: 400 }
            );
        }

        // -- Type
        const validArtifactTypes = Object.values(ArtifactType);
        if (!type || !validArtifactTypes.includes(type)) 
        {
            log.error({ type: type }, 'Invalid artifact type');

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

        // ── Fetch Organization Settings ───────────────────────────────────────
        const organizationSettings = await organizationRepository.findByIdWithSettings(organizationId);

        if (!organizationSettings)
        {
            log.error('Organization Settings not found');

            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error: 'Organization Settings not found' 
                },
                { status: 404 }
            );
        }

        // ── uploadDirectory => sourcePath ───────────────────────────────────────
        const uploadDirectory = organizationSettings?.settings?.uploadDirectory;
        if (!uploadDirectory) 
        {
            log.error({uploadDirectory: uploadDirectory}, 'Organization has not been configured for file handling. Missing Upload Directory');
            return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error: 'Upload Directory incorrectly configured' 
                    },
                    { status: 400 }
            );
        }

        const resolvedUploadDirectory = path.resolve(settings.homeDirectory, uploadDirectory);
        const sourcePath = path.join(resolvedUploadDirectory, filename);

        // Make sure we don't escape base directory.
        if (!sourcePath.startsWith(path.resolve(settings.homeDirectory))) 
        {
            log.error({sourcePath : sourcePath, uploadDirectory: uploadDirectory, resolvedUploadDirectory: resolvedUploadDirectory, homeDirectory: settings.homeDirectory}, 'Invalid file path. Source Path resolves outside Home Directory');
            return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error: 'Invalid Upload Directory path' 
                    },
                    { status: 400 }
            );
        }

        // ── Check file exists ───────────────────────────────────────
        const stat = await fs.stat(sourcePath).catch(() => null);
        if (!stat?.isFile()) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error: 'File not found' 
                }, 
                { status: 404 });
        }

        // ── Database/Prisma ───────────────────────────────────────
        const newArtifact = await artifactRepository.createWithFileDetails(
        {
            organizationId,
            name            : name.trim(),
            description     : description?.trim() || undefined,
            type            : type as ArtifactType,
            mimeType        : mime.lookup(filename) || 'application/octet-stream', // fallback
            extension       : path.extname(filename).slice(1) || '',
            size            : stat.size.toString(),
            originalName    : filename,
        });

        log.info({ artifactId: newArtifact.id, name: name }, 'Artifact created successfully');

        // ── artifactDirectory => destPath ───────────────────────────────────────
        const artifactDirectory = organizationSettings?.settings?.artifactDirectory;
        if (!artifactDirectory) 
        {
            log.error({uploadDirectory: uploadDirectory}, 'Organization has not been configured for file handling. Missing Asset Directory');
            return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error: 'Asset Directory incorrectly configured' 
                    },
                    { status: 400 }
            );
        }

        const resolvedArtifactDirectory = path.resolve(settings.homeDirectory, artifactDirectory);
        const newFilename = `${newArtifact.id}_${filename}`;
        const destPath = path.join(resolvedArtifactDirectory, newFilename);

        // Make sure we don't escape base directory.
        if (!destPath.startsWith(path.resolve(settings.homeDirectory))) 
        {
            log.error({destPath : destPath, artifactDirectory: artifactDirectory, resolvedArtifactDirectory: resolvedArtifactDirectory, homeDirectory: settings.homeDirectory}, 'Invalid file path. Destination Path resolves outside Home Directory');
            return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error: 'Invalid Asset Directory path' 
                    },
                    { status: 400 }
            );
        }

        log.info({ sourcePath: sourcePath, destPath: destPath }, "Directories");

        // ── Move file ───────────────────────────────────────
        await fs.rename(sourcePath, destPath);

        return NextResponse.json<ApiResponse<ArtifactData>>(
            {
                success : true,
                message : 'Artifact created successfully',
                data    : newArtifact,
            },
            { status: 201 }
        );
    } 
    catch (error: any) 
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