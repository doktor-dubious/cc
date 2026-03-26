// app/api/organization/[id]/settings/route.ts

import { log }                                      from '@/lib/log';
import { NextRequest, NextResponse }                from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { organizationRepository }                   from '@/lib/database/organization';
import { canUpdateOrganizationSettings,
         canUpdateOrganizations }                   from '@/lib/auth/permissions';
import type { ApiResponse }                         from '@/lib/types/api';
import type { OrganisationSettingsData }            from '@/lib/database/organization';
import { getSupportedCountries }                    from '@/lib/company-lookup';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) 
{
    const { id } = await params;
    const organizationId = id;

    if (!organizationId)
    {
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: 'Invalid organization ID'
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

        // SUPER ADMINs can modify organization settings.
        if (!canUpdateOrganizationSettings(role))
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
        const { uploadDirectory, downloadDirectory, artifactDirectory, enabledLookupSources } = body;

        // -- uploadDirectory
        if (!uploadDirectory || typeof uploadDirectory !== 'string' || uploadDirectory.trim() === '')
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Upload Directory is required' 
                },
                { status: 400 }
            );
        }

        // -- downloadDirectory
        if (!downloadDirectory || typeof downloadDirectory !== 'string' || downloadDirectory.trim() === '')
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Download Directory is required' 
                },
                { status: 400 }
            );
        }

        // -- artifactDirectory
        if (!artifactDirectory || typeof artifactDirectory !== 'string' || artifactDirectory.trim() === '')
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Artifact Directory is required' 
                },
                { status: 400 }
            );
        }

        // ── Check existence of Organization ────────────────────────────────────────────
        const org = await organizationRepository.findById(organizationId);
        if (!org) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Organization not found' 
                },
                { status: 404 }
            );
        }

        // ── Database/Prisma ───────────────────────────────────────
        const updateData: {
            uploadDirectory: string;
            downloadDirectory: string;
            artifactDirectory: string;
            enabledLookupSources?: string[];
        } = {
            uploadDirectory: uploadDirectory.trim(),
            downloadDirectory: downloadDirectory.trim(),
            artifactDirectory: artifactDirectory.trim(),
        };

        if (Array.isArray(enabledLookupSources)) {
            updateData.enabledLookupSources = enabledLookupSources;
        }

        const settings = await organizationRepository.updateSettings(organizationId, updateData);

        log.info({ organizationId, settingsId: settings.id }, 'Organization settings saved');

        return NextResponse.json<ApiResponse<OrganisationSettingsData>>(
        {
            success: true,
            message: 'Settings saved successfully',
            data   : settings,
        },
        { status: 200 });
    } 
    catch (error) 
    {
        log.error({ error, organizationId }, 'Error saving organization settings');

        return NextResponse.json<ApiResponse>(
            { 
                success: false, 
                error  : 'Failed to save settings' 
            },
            { status: 500 }
        );
    }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
)
{
    const { id } = await params;
    const organizationId = id;

    if (!organizationId)
    {
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Invalid organization ID' },
            { status: 400 }
        );
    }

    try
    {
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { role } = session.user;
        if (!role || !canUpdateOrganizations(role))
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { enabledLookupSources } = body;

        if (!Array.isArray(enabledLookupSources))
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'enabledLookupSources must be an array' },
                { status: 400 }
            );
        }

        // Validate that all sources are actually supported
        const supported = getSupportedCountries();
        const invalid = enabledLookupSources.filter((s: string) => !supported.includes(s));
        if (invalid.length > 0)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: `Unsupported lookup sources: ${invalid.join(', ')}` },
                { status: 400 }
            );
        }

        // Check org exists
        const org = await organizationRepository.findByIdWithSettings(organizationId);
        if (!org)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Organization not found' },
                { status: 404 }
            );
        }

        // Upsert settings with lookup sources
        const settings = await organizationRepository.updateSettings(organizationId,
        {
            uploadDirectory      : org.settings?.uploadDirectory ?? '',
            downloadDirectory    : org.settings?.downloadDirectory ?? '',
            artifactDirectory    : org.settings?.artifactDirectory ?? '',
            enabledLookupSources,
        });

        log.info({ organizationId, enabledLookupSources }, 'Lookup sources updated');

        return NextResponse.json<ApiResponse<OrganisationSettingsData>>(
        {
            success : true,
            message : 'Lookup sources updated',
            data    : settings,
        },
        { status: 200 });
    }
    catch (error)
    {
        log.error({ error, organizationId }, 'Error updating lookup sources');

        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Failed to update lookup sources' },
            { status: 500 }
        );
    }
}