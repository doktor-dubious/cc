// app/api/cis-control/route.ts

import { log }                       from '@/lib/log';
import { NextResponse }              from 'next/server';
import { getServerSession }          from '@/lib/auth';
import { prisma }                    from '@/lib/prisma';
import type { ApiResponse }          from '@/lib/types/api';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET - Fetch CIS control active/inactive states for an organization
export async function GET(request: Request)
{
    log.debug('(API : cis-control - GET)');

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

        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get('organizationId');

        if (!organizationId)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'organizationId is required' },
                { status: 400 }
            );
        }

        const records = await prisma.organizationCisControl.findMany({
            where: { organizationId },
            orderBy: { controlId: 'asc' },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: records,
        });
    }
    catch (error: any)
    {
        log.error(error, '(API : cis-control - GET) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// PUT - Toggle a CIS control active/inactive for an organization
export async function PUT(request: Request)
{
    log.debug('(API : cis-control - PUT)');

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

        const body = await request.json();
        const { organizationId, controlId, active } = body;

        if (!organizationId || controlId == null || active == null)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'organizationId, controlId and active are required' },
                { status: 400 }
            );
        }

        if (controlId < 1 || controlId > 18)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'controlId must be between 1 and 18' },
                { status: 400 }
            );
        }

        const record = await prisma.organizationCisControl.upsert({
            where: {
                organizationId_controlId: { organizationId, controlId },
            },
            update: { active },
            create: { organizationId, controlId, active },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: record,
        });
    }
    catch (error: any)
    {
        log.error(error, '(API : cis-control - PUT) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
