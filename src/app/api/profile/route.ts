import { log }                                      from '@/lib/log';
import { NextResponse, NextRequest }                from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { profileRepository }                        from '@/lib/database/profile';
import bcrypt                                       from 'bcryptjs';
import { canManageProfiles,
        canFetchAllProfiles,
        canCreateProfiles,
        validateAdminOrganizationAccess }           from '@/lib/auth/permissions';
import type { ApiResponse }                         from '@/lib/types/api';
import type { ProfileData, ProfileWithRelations }   from '@/lib/database/profile';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET
export async function GET(request: NextRequest)
{
    log.debug('(PRISMA API : profile - GET (fetch)');

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
                }, { status: 401 });
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

        // ADMIN and SUPER ADMINs can fetch profiles.
        if (!canManageProfiles(role))
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Unauthorized' 
                },
                { status: 403 }
            );
        }

        // ── Parse query params ────────────────────────────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const organizationIdStr = searchParams.get('organizationId');

        if (!organizationIdStr)
        {
            // Fetch ALL profiles → ONLY allowed for SUPER_ADMIN
            if (!canFetchAllProfiles(role))
            {
                return NextResponse.json<ApiResponse>(
                    {
                        success: false, 
                        error  : 'Unauthorized' 
                    },
                    { status: 403 }
                );
            }

            // ── Database/Prisma ───────────────────────────────────────
            const profiles = await profileRepository.findAll();

            return NextResponse.json<ApiResponse<ProfileData[]>>(
                {
                    success : true,
                    data    : profiles,
                },
                { status: 200 }
            );
        }
        else
        {
            const organizationId = organizationIdStr;
            if (!organizationId)
            {
                return NextResponse.json<ApiResponse>(
                    {
                        success: false,
                        error  : 'Invalid organizationId'
                    },
                    { status: 400 }
                );
            }

            if (!(await validateAdminOrganizationAccess(role, profileId, organizationId))) 
            {
                return NextResponse.json<ApiResponse>(
                    { 
                        success: false, 
                        error  : 'Not authorized for this organization' 
                    }, 
                    { status: 403 });
            }

            // ── Database/Prisma ───────────────────────────────────────
            const profiles = await profileRepository.findByOrganizationId(organizationId);

            return NextResponse.json<ApiResponse<ProfileWithRelations[]>>(
                {
                    success : true,
                    data    : profiles,
                },
                { status: 200 }
            );
        }
    }
    catch (error)
    {
        log.error({ error }, 'Error in profile GET handler');
        return NextResponse.json<ApiResponse>(
            { 
                success: false, 
                error  : 'Failed to fetch profiles' 
            },
            { status: 500 }
        );
    }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// POST
export async function POST(request: NextRequest)
{
    log.debug('(PRISMA API : profile - POST (create)');

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
        if (!canCreateProfiles(role))
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
            name, 
            description, 
            organizationId,
            email,
            password,
            loginName,
            nickname,
            workFunction,
            createRole
        } = body;

        // Validate required fields.
        if (!name || !email || !password || !loginName || !nickname || !organizationId)
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Name, email, password, login name, nickname, and organizationId are required' 
                },
                { status: 400 }
            );
        }

        // -- Organization ID
        if (typeof organizationId !== 'string' || !organizationId)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Invalid Organization Id'
                },
                { status: 400 }
            );
        }

        // -- Role (createRole)
        const validRoles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
        if (createRole && !validRoles.includes(createRole)) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Invalid role specified' 
                },
                { status: 400 }
            );
        }

        // Prevent non-SUPER_ADMIN from creating SUPER_ADMIN or ADMIN users
        if (role !== 'SUPER_ADMIN' && createRole && ['ADMIN', 'SUPER_ADMIN'].includes(createRole)) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Insufficient permissions to assign this role' 
                },
                { status: 403 }
            );
        }

        // -- EMail
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Invalid email format' 
                },
                { status: 400 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // ADMINs can only create profiles for Organizations which they belong to.
        if (!(await validateAdminOrganizationAccess(role, profileId, organizationId))) 
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Unauthorized' 
                }, 
                { status: 403 });
        }


        // ── Database/Prisma ───────────────────────────────────────
        const newProfile = await profileRepository.create(
        {
            // Profile fields
            name        : name.trim(),
            description : description?.trim() || undefined,
            organizationId,
            // User fields
            user: 
            {
                email           : email.trim(),
                name            : loginName.trim(),
                nickname        : nickname.trim(),
                passwordHash,
                workFunction    : workFunction || 'OTHER',
                role            : createRole || 'USER',
            }
        });

        log.info({ profileId: newProfile.id }, 'Profile created successfully');

        return NextResponse.json<ApiResponse<ProfileWithRelations>>(
            {
                success : true,
                message : 'Profile created successfully',
                data    : newProfile,
            },
            { status: 201 }
        );
    }
    catch (error: any)
    {
        log.error({ error }, 'Error creating profile');
        
        // Handle unique constraint violation (duplicate email)
        if (error.code === 'P2002')
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'A user with this email already exists' 
                },
                { status: 400 }
            );
        }
        
        return NextResponse.json<ApiResponse>(
            { 
                success: false, 
                error  : 'Failed to create profile' 
            },
            { status: 500 }
        );
    }
}