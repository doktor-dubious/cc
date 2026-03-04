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
import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable }                                 from 'stream';
import { createWriteStream }                        from 'fs';
import { pipeline }                                 from 'stream/promises';

import { ArtifactType }                             from '@prisma/client';
import { canAssignArtifacts,
         validateUserOrganizationAccess}            from '@/lib/auth/permissions';

// Initialize S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-north-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'compliance-circle-artifacts';

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

        if (!userId || !role || (role !== 'SUPER_ADMIN' && !profileId))
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
            type,
            source,
            s3Key
        } = body;

        const isS3File = source === 's3';

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

        // ── artifactDirectory => destPath ───────────────────────────────────────
        const artifactDirectory = organizationSettings?.settings?.artifactDirectory;
        if (!artifactDirectory)
        {
            log.error({ artifactDirectory }, 'Organization has not been configured for file handling. Missing Asset Directory');
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'Asset Directory incorrectly configured'
                },
                { status: 400 }
            );
        }

        const resolvedArtifactDirectory = path.resolve(settings.homeDirectory, artifactDirectory);

        // Make sure artifact directory doesn't escape base directory.
        if (!resolvedArtifactDirectory.startsWith(path.resolve(settings.homeDirectory)))
        {
            log.error({ artifactDirectory, resolvedArtifactDirectory, homeDirectory: settings.homeDirectory }, 'Invalid file path. Artifact Directory resolves outside Home Directory');
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: 'Invalid Asset Directory path'
                },
                { status: 400 }
            );
        }

        let fileSize: number;

        if (isS3File) {
            // ── S3 File Handling ───────────────────────────────────────
            if (!s3Key) {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: 'S3 key is required for S3 files' },
                    { status: 400 }
                );
            }

            // Verify the S3 key belongs to this organization
            const expectedPrefix = `org-${organizationId}/`;
            if (!s3Key.startsWith(expectedPrefix)) {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: 'Invalid S3 file key' },
                    { status: 400 }
                );
            }

            // Get the file from S3
            try {
                const getCommand = new GetObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: s3Key,
                });

                const s3Response = await s3Client.send(getCommand);

                if (!s3Response.Body) {
                    return NextResponse.json<ApiResponse>(
                        { success: false, error: 'Failed to download file from S3' },
                        { status: 500 }
                    );
                }

                fileSize = s3Response.ContentLength || 0;

                // Create artifact record first to get the ID for the filename
                const newArtifact = await artifactRepository.createWithFileDetails({
                    organizationId,
                    name: name.trim(),
                    description: description?.trim() || undefined,
                    type: type as ArtifactType,
                    mimeType: s3Response.ContentType || mime.lookup(filename) || 'application/octet-stream',
                    extension: path.extname(filename).slice(1) || '',
                    size: fileSize.toString(),
                    originalName: filename,
                });

                log.info({ artifactId: newArtifact.id, name, source: 's3' }, 'Artifact created successfully');

                const newFilename = `${newArtifact.id}_${filename}`;
                const destPath = path.join(resolvedArtifactDirectory, newFilename);

                // Ensure artifact directory exists
                await fs.mkdir(resolvedArtifactDirectory, { recursive: true });

                // Stream S3 file to local filesystem
                const nodeStream = s3Response.Body as Readable;
                const writeStream = createWriteStream(destPath);
                await pipeline(nodeStream, writeStream);

                log.info({ s3Key, destPath }, 'S3 file downloaded to artifact directory');

                // Delete the original S3 file
                const deleteCommand = new DeleteObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: s3Key,
                });
                await s3Client.send(deleteCommand);

                log.info({ s3Key }, 'Original S3 file deleted');

                return NextResponse.json<ApiResponse<ArtifactData>>(
                    {
                        success: true,
                        message: 'Artifact created successfully',
                        data: newArtifact,
                    },
                    { status: 201 }
                );

            } catch (s3Error: any) {
                log.error({ error: s3Error.message, s3Key }, 'Failed to process S3 file');
                return NextResponse.json<ApiResponse>(
                    { success: false, error: 'Failed to process S3 file' },
                    { status: 500 }
                );
            }

        } else {
            // ── Local File Handling ───────────────────────────────────────
            const uploadDirectory = organizationSettings?.settings?.uploadDirectory;
            if (!uploadDirectory)
            {
                log.error({ uploadDirectory }, 'Organization has not been configured for file handling. Missing Upload Directory');
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
                log.error({ sourcePath, uploadDirectory, resolvedUploadDirectory, homeDirectory: settings.homeDirectory }, 'Invalid file path. Source Path resolves outside Home Directory');
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

            fileSize = stat.size;

            // ── Database/Prisma ───────────────────────────────────────
            const newArtifact = await artifactRepository.createWithFileDetails({
                organizationId,
                name: name.trim(),
                description: description?.trim() || undefined,
                type: type as ArtifactType,
                mimeType: mime.lookup(filename) || 'application/octet-stream',
                extension: path.extname(filename).slice(1) || '',
                size: fileSize.toString(),
                originalName: filename,
            });

            log.info({ artifactId: newArtifact.id, name, source: 'local' }, 'Artifact created successfully');

            const newFilename = `${newArtifact.id}_${filename}`;
            const destPath = path.join(resolvedArtifactDirectory, newFilename);

            // Make sure dest path doesn't escape base directory.
            if (!destPath.startsWith(path.resolve(settings.homeDirectory)))
            {
                log.error({ destPath, artifactDirectory, resolvedArtifactDirectory, homeDirectory: settings.homeDirectory }, 'Invalid file path. Destination Path resolves outside Home Directory');
                return NextResponse.json<ApiResponse>(
                    {
                        success: false,
                        error: 'Invalid Asset Directory path'
                    },
                    { status: 400 }
                );
            }

            log.info({ sourcePath, destPath }, 'Directories');

            // ── Move file ───────────────────────────────────────
            await fs.rename(sourcePath, destPath);

            return NextResponse.json<ApiResponse<ArtifactData>>(
                {
                    success: true,
                    message: 'Artifact created successfully',
                    data: newArtifact,
                },
                { status: 201 }
            );
        }
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