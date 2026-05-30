// app/api/safeguard-cmmi/route.ts

import { log }                       from '@/lib/log';
import { NextResponse }              from 'next/server';
import { getServerSession }          from '@/lib/auth';
import { prisma }                    from '@/lib/prisma';
import type { ApiResponse }          from '@/lib/types/api';

// GET ?organizationId=...
// Returns { [safeguardId]: { currentCmmi, targetCmmi } }
export async function GET(request: Request)
{
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

        const rows = await prisma.organizationSafeguardCmmi.findMany({
            where: { organizationId },
        });

        const data: Record<string, { currentCmmi: number; targetCmmi: number }> = {};
        for (const row of rows)
        {
            data[row.safeguardId] = {
                currentCmmi: row.currentCmmi,
                targetCmmi:  row.targetCmmi,
            };
        }

        return NextResponse.json<ApiResponse>({ success: true, data });
    }
    catch (error: any)
    {
        log.error(error, '(API : safeguard-cmmi - GET) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT — upsert one safeguard's CMMI
// Body: { organizationId, safeguardId, currentCmmi, targetCmmi }
export async function PUT(request: Request)
{
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
        const { organizationId, safeguardId, currentCmmi, targetCmmi } = body;

        if (!organizationId || !safeguardId
            || typeof currentCmmi !== 'number' || typeof targetCmmi !== 'number')
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'organizationId, safeguardId, currentCmmi, targetCmmi are required' },
                { status: 400 }
            );
        }

        const record = await prisma.organizationSafeguardCmmi.upsert({
            where: {
                organizationId_safeguardId: { organizationId, safeguardId },
            },
            update: { currentCmmi, targetCmmi },
            create: { organizationId, safeguardId, currentCmmi, targetCmmi },
        });

        return NextResponse.json<ApiResponse>({ success: true, data: record });
    }
    catch (error: any)
    {
        log.error(error, '(API : safeguard-cmmi - PUT) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
