// app/api/artifact/[id]/preview/route.ts
import { log }                                      from '@/lib/log';
import { NextRequest, NextResponse }                from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { organizationRepository }                   from '@/lib/database/organization';
import { settingsRepository }                       from '@/lib/database/settings';
import { artifactRepository }                       from '@/lib/database/artifact';
import { canFetchArtifacts,
         validateUserOrganizationAccess }            from '@/lib/auth/permissions';

// ── GET (serve file inline for preview) ─────────────────────────────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> })
{
    log.debug('(PRISMA API : artifact/[id]/preview - GET');

    try
    {
        const { id: artifactId } = await params;
        if (!artifactId)
        {
            return NextResponse.json(
                { success: false, error: 'Invalid artifact ID' },
                { status: 400 }
            );
        }

        // ── Authentication ────────────────────────────────────────────────────────────────
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id: userId, profileId, role } = session.user;

        if (!userId || !role || !profileId)
        {
            return NextResponse.json(
                { success: false, error: 'Invalid token' },
                { status: 401 }
            );
        }

        if (!canFetchArtifacts(role))
        {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // ── Find artifact ────────────────────────────────────────────────────────────────
        const artifact = await artifactRepository.findById(artifactId);

        if (!artifact)
        {
            return NextResponse.json(
                { success: false, error: 'Artifact not found' },
                { status: 404 }
            );
        }

        if (!(await validateUserOrganizationAccess(role, profileId, artifact.organizationId)))
        {
            return NextResponse.json(
                { success: false, error: 'Not authorized for this organization' },
                { status: 403 }
            );
        }

        if (!artifact.originalName)
        {
            return NextResponse.json(
                { success: false, error: 'No file associated with this artifact' },
                { status: 404 }
            );
        }

        // ── Resolve file path ────────────────────────────────────────────────────────────
        const settings = await settingsRepository.getActive();

        if (!settings?.homeDirectory)
        {
            return NextResponse.json(
                { success: false, error: 'Home Directory not configured' },
                { status: 500 }
            );
        }

        const organization = await organizationRepository.findByIdWithSettings(artifact.organizationId);

        if (!organization?.settings?.artifactDirectory)
        {
            return NextResponse.json(
                { success: false, error: 'Artifact directory not configured' },
                { status: 500 }
            );
        }

        const fs = require('fs').promises;
        const path = require('path');

        const artifactDirectory = organization.settings.artifactDirectory;
        const diskFilename = `${artifactId}_${artifact.originalName}`;
        const resolvedPath = path.resolve(
            settings.homeDirectory,
            artifactDirectory,
            diskFilename
        );

        log.info({ resolvedPath, diskFilename, artifactDirectory, homeDirectory: settings.homeDirectory, originalName: artifact.originalName }, 'Preview: resolved file path');

        if (!resolvedPath.startsWith(path.resolve(settings.homeDirectory)))
        {
            log.error({ resolvedPath }, 'Preview: path escapes home directory');
            return NextResponse.json(
                { success: false, error: 'Invalid file path' },
                { status: 400 }
            );
        }

        // ── Read and return file inline ──────────────────────────────────────────────────
        try
        {
            await fs.access(resolvedPath);
        }
        catch
        {
            log.error({ resolvedPath }, 'Preview: file not found on disk');
            return NextResponse.json(
                { success: false, error: 'File not found on disk' },
                { status: 404 }
            );
        }

        const fileBuffer = await fs.readFile(resolvedPath);
        const mimeType = artifact.mimeType || 'application/octet-stream';

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Disposition': `inline; filename="${encodeURIComponent(artifact.originalName)}"`,
                'Content-Length': fileBuffer.length.toString(),
            },
        });
    }
    catch (error: any)
    {
        log.error({ error }, '(PRISMA API : artifact/[id]/preview - GET) Error');
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
