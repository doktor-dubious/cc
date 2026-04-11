import { log }              from '@/lib/log';
import { NextResponse }     from 'next/server';
import { auth }             from '@/lib/auth';
import { prisma }           from '@/lib/prisma';
import type { ApiResponse } from '@/lib/types/api';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
)
{
    log.debug('(PRISMA API : evidence - PATCH)');

    try
    {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const body = await request.json();
        const { approved, resubmit } = body;

        if (typeof approved !== 'boolean' && typeof resubmit !== 'boolean')
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'approved or resubmit (boolean) is required' },
                { status: 400 }
            );
        }

        // Get the profile for the current user
        const profile = await prisma.profile.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
        });

        if (!profile)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Profile not found' },
                { status: 404 }
            );
        }

        const data: Record<string, unknown> = {};

        if (typeof approved === 'boolean')
        {
            data.approved = approved;
            data.approvedById = approved ? profile.id : null;
            data.approvedAt = approved ? new Date() : null;
        }

        if (typeof resubmit === 'boolean')
        {
            data.resubmit = resubmit;
        }

        const evidence = await prisma.evidence.update({
            where: { id },
            data,
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: evidence,
        });
    }
    catch (error: any)
    {
        log.error(error, '(PRISMA API : evidence - PATCH) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
