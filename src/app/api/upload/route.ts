// ============================================================================
// app/api/upload/route.ts - Better Upload API route for S3 uploads
// ============================================================================
import { route, RejectUpload, type Router } from '@better-upload/server';
import { toRouteHandler }                   from '@better-upload/server/adapters/next';
import { aws }                              from '@better-upload/server/clients';
import { getServerSession }                 from '@/lib/auth';
import { log }                              from '@/lib/log';
import { prisma }                           from '@/lib/prisma';

// ── Router Configuration ────────────────────────────────────────────────────
// AWS credentials are read from environment variables:
// - AWS_ACCESS_KEY_ID
// - AWS_SECRET_ACCESS_KEY
// - AWS_REGION
const router: Router = {
    client: aws(),
    bucketName: process.env.AWS_S3_BUCKET || 'compliance-circle-artifacts',
    routes: {
        // General file uploads for artifacts
        artifacts: route({
            fileTypes: [
                'image/*',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/plain',
                'text/csv',
                'application/json',
                'application/zip',
                'application/x-rar-compressed',
                'application/x-7z-compressed',
            ],
            maxFileSize: 50 * 1024 * 1024, // 50MB
            multipleFiles: true,
            maxFiles: 10,

            // Authentication and path customization
            onBeforeUpload: async ({ req, files, clientMetadata }) => {
                log.debug({ fileCount: files.length, metadata: clientMetadata }, 'Upload request received');

                // Get session from headers
                const session = await getServerSession();
                if (!session?.user) {
                    log.warn('Upload rejected: No session');
                    throw new RejectUpload('Unauthorized');
                }

                const { id: userId, role } = session.user;

                // Only ADMIN and SUPER_ADMIN can upload
                if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
                    log.warn({ userId, role }, 'Upload rejected: Insufficient permissions');
                    throw new RejectUpload('Forbidden');
                }

                // Get organization from metadata
                const organizationId = (clientMetadata as { organizationId?: string })?.organizationId;
                if (!organizationId) {
                    log.warn({ userId }, 'Upload rejected: No organization specified');
                    throw new RejectUpload('Organization required');
                }

                // Verify user has access to this organization
                const profile = await prisma.profile.findFirst({
                    where: {
                        userId,
                        organizationId,
                        active: true,
                    },
                });

                if (!profile && role !== 'SUPER_ADMIN') {
                    log.warn({ userId, organizationId }, 'Upload rejected: No access to organization');
                    throw new RejectUpload('No access to organization');
                }

                log.info({ userId, organizationId, fileCount: files.length }, 'Upload authorized');

                // Generate unique file key with organization isolation for each file
                return {
                    generateObjectInfo: ({ file }) => {
                        const timestamp = Date.now();
                        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                        const key = `org-${organizationId}/uploads/${timestamp}-${sanitizedName}`;

                        return {
                            key,
                            metadata: {
                                userid: userId,
                                organizationid: organizationId,
                                originalname: file.name,
                                uploadedat: new Date().toISOString(),
                            },
                        };
                    },
                };
            },

            // After signed URL is generated - can be used for logging
            onAfterSignedUrl: async ({ files, clientMetadata }) => {
                const organizationId = (clientMetadata as { organizationId?: string })?.organizationId;
                log.debug({
                    fileCount: files.length,
                    organizationId,
                }, 'Signed URLs generated');

                return {
                    metadata: {
                        uploadedCount: files.length,
                    },
                };
            },
        }),
    },
};

export const { POST } = toRouteHandler(router);
