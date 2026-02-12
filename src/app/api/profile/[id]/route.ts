import { log }                                      from '@/lib/log';
import { NextResponse, NextRequest }                from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { profileRepository }                        from '@/lib/database/profile';
import bcrypt                                       from 'bcryptjs';

import { canDeleteProfiles,
         canUpdateProfiles,
         validateAdminOrganizationAccess
       }                                            from '@/lib/auth/permissions';
import type { ApiResponse }                         from '@/lib/types/api';
import type { ProfileData, ProfileWithRelations }   from '@/lib/database/profile';


// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// PATCH
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) 
{
    log.debug('(PRISMA API : profile/[id] - PATCH (update)');

    const { id } = await params;
    const targetProfileId = parseInt(id, 10);
    if (isNaN(targetProfileId) || targetProfileId <= 0)
    {
        return NextResponse.json<ApiResponse>(
            { 
                success: false, 
                error  : 'Invalid profile ID' 
            }, 
            { status: 400 });
    }

    try 
    {
        // ── Authentication & Authorization ──────────────────────────────
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
                    error: 'Invalid token' 
                }, 
                { status: 401 });
        }

        // ADMIN and SUPER ADMINs can update profiles. -- ToDo. For now only Super Admins
        if (!canUpdateProfiles(role))
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Insufficient permissions' 
                },
                { status: 403 }
            );
        }

        // ── Parse & validate body ───────────────────────────────────────
        const body = await request.json();

        const profileData: any = {};
        const userData: any = {};

        // -- Name.
        if ('name' in body) 
        {
            if (typeof body.name !== 'string' || body.name.trim() === '') 
            {
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error  : 'Name must be a non-empty string' 
                    },
                    { status: 400 }
                );
            }
            profileData.name = body.name.trim();
        }

        // -- Description.
        if ('description' in body) 
        {
            profileData.description = body.description?.trim() ?? null;
        }

        // ── Organization handling (nested relation syntax) ────────────────────────────────
        if ('organization' in body) 
        {
            if (body.organization?.disconnect === true) 
            {
                profileData.organization = { disconnect: true };
            } 
            else if (body.organization?.connect?.id) 
            {
                const orgId = Number(body.organization.connect.id);
                if (!Number.isInteger(orgId) || orgId <= 0) 
                {
                    return NextResponse.json<ApiResponse>(
                        { 
                            success: false, 
                            error  : 'Invalid organization ID in connect' 
                        },
                        { status: 400 }
                    );
                }
                profileData.organization = { connect: { id: orgId } };
            } 
            else 
            {
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error  : 'Invalid organization update format' 
                    },
                    { status: 400 }
                );
            }
        }
        else if ('organizationId' in body) 
        {
            log.warn('Using deprecated organizationId format — prefer { organization: { disconnect: true } }');
            if (body.organizationId === null) 
            {
                profileData.organization = { disconnect: true };
            } 
            else 
            {
                const orgId = Number(body.organizationId);
                if (!Number.isInteger(orgId) || orgId <= 0) {
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error  : 'Invalid organizationId' 
                    }, 
                    { status: 400 });
                }
                profileData.organization = { connect: { id: orgId } };
            }
        }

        // User fields (only if present)
        if ('loginName' in body)      userData.name = body.loginName?.trim();           // loginName
        if ('nickname' in body)       userData.nickname = body.nickname?.trim();
        if ('workFunction' in body)   userData.workFunction = body.workFunction;
        if ('role' in body)           userData.role = body.role;

        if ('password' in body && body.password?.trim()) 
        {
            userData.passwordHash = await bcrypt.hash(body.password.trim(), 10);
        }

        // -- Email
        if ('email' in body) 
        {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (body.email && !emailRegex.test(body.email)) 
            {
                return NextResponse.json<ApiResponse>(
                    { success: false, error: 'Invalid email format' },
                    { status: 400 }
                );
            }
            userData.email = body.email?.trim() ?? null;
        }

        // If nothing to update
        if (Object.keys(profileData).length === 0 && Object.keys(userData).length === 0) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'No valid fields to update' 
                },
                { status: 400 }
            );
        }

        // ── Exists Profile? ───────────────────────────────────────
        const existingProfile = await profileRepository.findById(targetProfileId);

        if (!existingProfile)
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error: 'Profile not found' 
                },
                { status: 404 }
            );
        }

        // For ADMINs, verify they can access this profile's organization
        if (role === 'ADMIN' && existingProfile.organizationId)
        {
            if (!(await validateAdminOrganizationAccess(role, profileId, existingProfile.organizationId!))) 
            {
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error  : 'Not authorized for this organization' 
                    }, 
                    { status: 403 });
            }
        }

        // ── Database/Prisma ───────────────────────────────────────
        log.info({ profileData, userData }, 'Updating Profile');

        const updatedProfile = await profileRepository.update(targetProfileId, profileData, userData);

        if (!updatedProfile) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Profile not found' 
                }, 
                { status: 404 });
        }

        log.info({ profileId: updatedProfile.id }, 'Profile updated successfully');

        return NextResponse.json<ApiResponse<ProfileWithRelations>>(
        {
            success: true,
            message: 'Profile updated',
            data   : updatedProfile,
        });
    } 
    catch (error: any) 
    {
        log.error({ error }, 'Profile update failed (PATCH)');

        if (error.code === 'P2002') 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Unique constraint violation (likely duplicate email)' 
                },
                { status: 409 }
            );
        }

        if (error.name === 'JWSSignatureVerificationFailed') 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Invalid/expired token' 
                }, 
                { status: 401 });
        }

        return NextResponse.json<ApiResponse>(
            { 
                success: false, 
                error  : 'Failed to update profile' 
            },
            { status: 500 }
        );
    }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// DELETE
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
)
{
    log.debug('(PRISMA API : profile/[id] - DELETE');

    const { id } = await params;
    const targetProfileId = parseInt(id, 10);

    if (isNaN(targetProfileId) || targetProfileId <= 0) 
    {
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Invalid profile ID' },
            { status: 400 }
        );
    }

    try
    {
        // ── Authentication & Authorization ──────────────────────────────
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
                    error: 'Invalid token' 
                }, 
                { status: 401 });
        }

        // Check permissions
        
        if (!canDeleteProfiles(role))
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false,
                    error  : 'You do not have permission to delete profiles' 
                },
                { status: 403 }
            );
        }

        // ── Exists Profile? ───────────────────────────────────────
        const existingProfile = await profileRepository.findById(targetProfileId);

        if (!existingProfile)
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error: 'Profile not found' 
                },
                { status: 404 }
            );
        }

        // For ADMINs, verify they can access this profile's organization
        if (role === 'ADMIN' && existingProfile.organizationId)
        {
            if (!(await validateAdminOrganizationAccess(role, profileId, existingProfile.organizationId!))) 
            {
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error  : 'Not authorized for this organization' 
                    }, 
                    { status: 403 });
            }
        }

        // Delete profile (soft delete - sets active to false)
        await profileRepository.delete(targetProfileId);

        log.info({ targetProfileId }, 'Profile deleted successfully');

        return NextResponse.json<ApiResponse>(
            {
                success: true,
                message: 'Profile deleted successfully',
            },
            { status: 200 });
    }
    catch (error)
    {
        log.error({ error }, 'Error deleting profile');
        
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
                error  : 'Failed to delete profile' 
            },
            { status: 500 }
        );
    }
}