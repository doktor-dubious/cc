// ============================================================================
// app/api/files/s3/route.ts - List and delete S3 files for an organization
// ============================================================================
import { NextResponse }                             from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { log }                                      from '@/lib/log';
import { canFetchArtifacts, validateUserOrganizationAccess } from '@/lib/auth/permissions';
import type { ApiResponse }                         from '@/lib/types/api';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-north-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'compliance-circle-artifacts';

type S3FileItem = {
    name: string;
    key: string;
    size: number;
    modified: string;
    mime: string;
};

// ── GET - List S3 files for an organization ─────────────────────────────────
export async function GET(request: Request) {
    log.debug('(API) files/s3 - GET (list)');

    try {
        // Authentication
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id: userId, profileId, role } = session.user;

        if (!role || (role !== 'SUPER_ADMIN' && !profileId)) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Invalid token' },
                { status: 401 }
            );
        }

        // Permission check
        if (!canFetchArtifacts(role)) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Forbidden' },
                { status: 403 }
            );
        }

        // Get organization ID from query params
        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get('organizationId');

        if (!organizationId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Organization ID required' },
                { status: 400 }
            );
        }

        // Validate organization access
        if (!validateUserOrganizationAccess(role, profileId, organizationId)) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'No access to organization' },
                { status: 403 }
            );
        }

        // List objects in S3 with organization prefix
        const prefix = `org-${organizationId}/uploads/`;

        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
        });

        const response = await s3Client.send(command);

        const files: S3FileItem[] = (response.Contents || [])
            .filter(obj => obj.Key && obj.Key !== prefix) // Exclude the folder itself
            .map(obj => {
                const key = obj.Key || '';
                const rawName = key.split('/').pop() || key;
                // Remove timestamp prefix (e.g., "1772443013907-filename.png" -> "filename.png")
                const name = rawName.replace(/^\d+-/, '');

                // Try to determine MIME type from extension
                const ext = name.split('.').pop()?.toLowerCase() || '';
                const mimeTypes: Record<string, string> = {
                    'pdf': 'application/pdf',
                    'png': 'image/png',
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'gif': 'image/gif',
                    'doc': 'application/msword',
                    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'xls': 'application/vnd.ms-excel',
                    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'txt': 'text/plain',
                    'csv': 'text/csv',
                    'json': 'application/json',
                    'zip': 'application/zip',
                };

                return {
                    name,
                    key,
                    size: obj.Size || 0,
                    modified: obj.LastModified?.toISOString() || new Date().toISOString(),
                    mime: mimeTypes[ext] || 'application/octet-stream',
                };
            });

        log.info({ organizationId, fileCount: files.length }, 'Listed S3 files');

        return NextResponse.json<ApiResponse<{ files: S3FileItem[] }>>(
            { success: true, data: { files } },
            { status: 200 }
        );

    } catch (error: any) {
        log.error({ error: error.message }, 'Failed to list S3 files');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Failed to list S3 files' },
            { status: 500 }
        );
    }
}

// ── DELETE - Delete an S3 file ──────────────────────────────────────────────
export async function DELETE(request: Request) {
    log.debug('(API) files/s3 - DELETE');

    try {
        // Authentication
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { role, profileId } = session.user;

        // Only ADMIN and SUPER_ADMIN can delete
        if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Forbidden' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { organizationId, key } = body;

        if (!organizationId || !key) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Organization ID and key are required' },
                { status: 400 }
            );
        }

        // Validate organization access
        if (!validateUserOrganizationAccess(role, profileId, organizationId)) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'No access to organization' },
                { status: 403 }
            );
        }

        // Verify the key belongs to this organization
        const expectedPrefix = `org-${organizationId}/`;
        if (!key.startsWith(expectedPrefix)) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Invalid file key' },
                { status: 400 }
            );
        }

        // Delete the object
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);

        log.info({ organizationId, key }, 'Deleted S3 file');

        return NextResponse.json<ApiResponse>(
            { success: true },
            { status: 200 }
        );

    } catch (error: any) {
        log.error({ error: error.message }, 'Failed to delete S3 file');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Failed to delete S3 file' },
            { status: 500 }
        );
    }
}
