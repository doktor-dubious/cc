// app/api/files/upload-dir/route.ts

import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { getServerSession }             from '@/lib/auth';
import type { ApiResponse }             from '@/lib/types/api';
import fs                               from 'fs/promises';
import path                             from 'path';
import { canDeleteFiles,
         validateUserOrganizationAccess
       }                                from '@/lib/auth/permissions';
import { settingsRepository }           from '@/lib/database/settings';
import { organizationRepository } from '@/lib/database/organization';

export async function DELETE(request: NextRequest) 
{    
    try 
    {
        log.debug('API: files/upload-dir - DELETE (delete file)');

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
        if (!canDeleteFiles(role))
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
        const { organizationId, filename } = body;

        // Validate required fields.
        if (!organizationId || !filename)
        {
            log.error({ organizationId: organizationId, filename: filename }, 'Organization Id and Filename are required');

            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Organization Id and Filename are required' 
                },
                { status: 400 }
            );
        }

        // -- Organization ID
        if (typeof organizationId !== 'string' || !organizationId)
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

        // -- Filename
        if (!filename || typeof filename !== 'string' || filename.trim() === '')
        {
            log.error({ filename: filename }, 'Invalid Filename');

            return NextResponse.json<ApiResponse>(
                {
                    success: false, 
                    error  : 'Invalid Filename' 
                },
                { status: 400 }
            );
        }

        // ── Authorize Profile / Organization ───────────────────────────────────────
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

        // ── Delete File ───────────────────────────────────────
        await fs.unlink(sourcePath);

        log.info(
            { 
                organizationId, 
                filename, 
                filePath: sourcePath,
                deletedBy: userId 
            }, 
            'File deleted from upload directory'
        );

        return NextResponse.json<ApiResponse>(
            {
                success: true,
                message: 'File deleted successfully',
            });

    } 
    catch (error: any) 
    {
        log.error({ error: error.message, stack: error.stack }, 'Error deleting file');

        return NextResponse.json<ApiResponse>(
            { 
                success: false, 
                error: 'Failed to delete file' 
            },
            { status: 500 }
        );
    }
}