import { log }                              from '@/lib/log';
import { NextResponse, NextRequest }        from 'next/server';
import { getServerSession }                 from '@/lib/auth';
import { userRepository }                   from '@/lib/database/user';
import { validateUserOrganizationAccess }   from '@/lib/auth/permissions';
import type { ApiResponse }                 from '@/lib/types/api';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// PATCH — set the caller's current (selected) organization on their User row.
export async function PATCH(request: NextRequest)
{
    log.debug('(PRISMA API : profile/active-organization - PATCH');

    try
    {
        // ── Authentication ────────────────────────────────────────────────────────────────
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success : false,
                    error   : 'Unauthorized'
                },
                { status: 401 });
        }

        const { id: userId, profileId, role } = session.user;

        if (!userId || !role)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success : false,
                    error   : 'Invalid token'
                },
                { status: 401 });
        }

        // ── Parse & validate body ─────────────────────────────────────────────────────────
        const body = await request.json();
        const { organizationId } = body as { organizationId?: string | null };

        // Allow clearing the selection by passing null.
        if (organizationId !== null && (typeof organizationId !== 'string' || !organizationId))
        {
            return NextResponse.json<ApiResponse>(
                {
                    success : false,
                    error   : 'organizationId is required (string or null)'
                },
                { status: 400 });
        }

        // ── Authorization ─────────────────────────────────────────────────────────────────
        // SUPER_ADMIN: any org. ADMIN/USER: must have a profile linked to the target org.
        if (organizationId)
        {
            const allowed = await validateUserOrganizationAccess(role, profileId, organizationId);
            if (!allowed)
            {
                return NextResponse.json<ApiResponse>(
                    {
                        success : false,
                        error   : 'Not authorized for this organization'
                    },
                    { status: 403 });
            }
        }

        // ── Database/Prisma ───────────────────────────────────────────────────────────────
        await userRepository.setCurrentOrganization(userId, organizationId);

        return NextResponse.json<ApiResponse>(
            {
                success : true,
                message : 'Current organization updated',
            },
            { status: 200 });
    }
    catch (error)
    {
        log.error({ error }, 'Error in profile/active-organization PATCH handler');
        return NextResponse.json<ApiResponse>(
            {
                success : false,
                error   : 'Failed to update current organization'
            },
            { status: 500 });
    }
}
