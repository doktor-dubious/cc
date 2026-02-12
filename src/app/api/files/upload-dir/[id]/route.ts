// app/api/files/upload-dir/[id]/route.ts

import { log }                              from '@/lib/log';
import { NextRequest, NextResponse }        from 'next/server';
import { getServerSession }                 from '@/lib/auth';
import type { ApiResponse }                 from '@/lib/types/api';
import { canUploadToArtifacts,
         validateAdminOrganizationAccess }  from '@/lib/auth/permissions';
import fs                                   from 'fs/promises';
import path                                 from 'path';
import { settingsRepository }               from '@/lib/database/settings';
import { organizationRepository }           from '@/lib/database/organization';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
)
{
    log.debug('API: GET - List files from organization upload directory');

    const { id } = await params;
    const organizationId = parseInt(id, 10);

    if (isNaN(organizationId) || organizationId <= 0) 
    {
        log.error({ id : id, organizationId : organizationId }, 'Invalid Organization ID');
        return NextResponse.json<ApiResponse>(
            { 
                success: false, 
                error: 'Invalid Organization ID' 
            }, 
            { status: 400 }
        );
    }

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

    try 
    {
        // ── Authentication & Authorization ──────────────────────────────
        const session = await getServerSession();
        if (!session?.user) 
        {
            return NextResponse.json<ApiResponse>(
              { success: false, error: 'Unauthorized' },
              { status: 401 }
            );
        }

        const { id: userId, profileId, role } = session.user;
        log.debug({ userId, profileId: profileId ?? 'missing', role: role ?? 'missing' }, 'Session');

        if (!userId || !role || !profileId) 
        {
            return NextResponse.json<ApiResponse>(
              { success: false, error: 'Invalid session' },
              { status: 401 }
            );
        }

        if (!canUploadToArtifacts(role)) 
        {
            return NextResponse.json<ApiResponse>(
              { success: false, error: 'Insufficient permissions' },
              { status: 403 }
            );
        }

        // For ADMINs: verify that the Profile can access the Organization.
        if (!(await validateAdminOrganizationAccess(role, profileId, organizationId))) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Not authorized for this organization' 
                }, 
                { status: 403 });
        }

        // Get organization settings.
        const organizationSettings = await organizationRepository.findByIdWithSettings(organizationId);

        if (!organizationSettings)
        {
            log.error('Organization Settings not found');

            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Organization Settings not found' },
                { status: 404 }
            );
        }

        // -- uploadDirectory.
        const uploadDirectory = organizationSettings?.settings?.uploadDirectory;
        if (!uploadDirectory) 
        {
            log.error({uploadDirectory: uploadDirectory}, 'Organization has not been configured for file handling. Missing Upload Directory');
            return NextResponse.json<ApiResponse>(
                    { success: false, error: 'Upload Directory incorrectly configured' },
                    { status: 400 }
            );
        }

        const resolvedUploadDirectory = path.resolve(settings.homeDirectory, uploadDirectory);

        // Make sure we don't escape base directory.
        if (!resolvedUploadDirectory.startsWith(path.resolve(settings.homeDirectory))) 
        {
            log.error({uploadDirectory: uploadDirectory, resolvedUploadDirectory: resolvedUploadDirectory, homeDirectory: settings.homeDirectory}, 'Invalid file path. Upload Directory resolves outside Home Directory');
            return NextResponse.json<ApiResponse>(
                    { success: false, error: 'Invalid Upload Directory path' },
                    { status: 400 }
            );
        }

        // -- artifactDirectory.
        const artifactDirectory = organizationSettings?.settings?.artifactDirectory;
        if (!artifactDirectory) 
        {
            log.error({uploadDirectory: uploadDirectory}, 'Organization has not been configured for file handling. Missing Asset Directory');
            return NextResponse.json<ApiResponse>(
                    { success: false, error: 'Asset Directory incorrectly configured' },
                    { status: 400 }
            );
        }

        const resolvedArtifactDirectory = path.resolve(settings.homeDirectory, artifactDirectory);

        // Make sure we don't escape base directory.
        if (!resolvedArtifactDirectory.startsWith(path.resolve(settings.homeDirectory))) 
        {
            log.error({artifactDirectory: artifactDirectory, resolvedArtifactDirectory: resolvedArtifactDirectory, homeDirectory: settings.homeDirectory}, 'Invalid file path. Artifact Directory resolves outside Home Directory');
            return NextResponse.json<ApiResponse>(
                    { success: false, error: 'Invalid Asset Directory path' },
                    { status: 400 }
            );
        }

        log.info({ resolvedUploadDirectory: resolvedUploadDirectory, resolvedArtifactDirectory: resolvedArtifactDirectory }, "Directories");

        // ── List files (only direct files, no recursion) ────────────────
        const entries = await fs.readdir(resolvedUploadDirectory, { withFileTypes: true });
        const files = await Promise.all(
          entries
            .filter((entry) => entry.isFile())
            .map(async (entry) => {
              const filePath = path.join(resolvedUploadDirectory, entry.name);
              const stat = await fs.stat(filePath);
              return {
                name: entry.name,
                relativePath: entry.name, // flat structure
                size: stat.size,
                modified: stat.mtime.toISOString(),
                mime: await getMimeType(filePath),
              };
            })
        );

        log.debug({files: files}, 'Files in Upload Directory');

        return NextResponse.json<ApiResponse<{ files: typeof files }>>(
        {
            success : true,
            data    : { files },
        });
    } 
    catch (error: any) 
    {
        log.error({ error }, 'Failed to list upload directory');
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Failed to read upload directory' },
          { status: 500 }
        );
    }
}

// ── Helper ────────────────────────────────────────────────────────────────
async function getMimeType(filePath: string): Promise<string> 
{
    try 
    {
        const { lookup } = await import('mime-types');
        return lookup(filePath) || 'application/octet-stream';
    } 
    catch 
    {
        return 'application/octet-stream';
    }
}

