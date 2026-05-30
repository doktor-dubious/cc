// app/api/safeguard-classification/route.ts

import { log }                       from '@/lib/log';
import { NextResponse }              from 'next/server';
import { getServerSession }          from '@/lib/auth';
import { prisma }                    from '@/lib/prisma';
import { SafeguardClassification }   from '@prisma/client';
import type { ApiResponse }          from '@/lib/types/api';

// GET ?organizationId=...
// Returns { [safeguardId]: 'include' | 'maybe' | 'exclude' }
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

        const rows = await prisma.organizationSafeguardClassification.findMany({
            where: { organizationId },
        });

        const data: Record<string, 'include' | 'maybe' | 'exclude'> = {};
        for (const row of rows)
        {
            data[row.safeguardId] = row.classification.toLowerCase() as 'include' | 'maybe' | 'exclude';
        }

        return NextResponse.json<ApiResponse>({ success: true, data });
    }
    catch (error: any)
    {
        log.error(error, '(API : safeguard-classification - GET) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT — upsert one classification
// Body: { organizationId, safeguardId, classification: 'include' | 'maybe' | 'exclude' }
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
        const { organizationId, safeguardId, classification } = body;

        if (!organizationId || !safeguardId || !classification)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'organizationId, safeguardId, and classification are required' },
                { status: 400 }
            );
        }

        const upper = String(classification).toUpperCase();
        if (upper !== 'INCLUDE' && upper !== 'MAYBE' && upper !== 'EXCLUDE')
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'classification must be include, maybe, or exclude' },
                { status: 400 }
            );
        }
        const enumValue = upper as SafeguardClassification;

        const record = await prisma.organizationSafeguardClassification.upsert({
            where: {
                organizationId_safeguardId: { organizationId, safeguardId },
            },
            update: { classification: enumValue },
            create: { organizationId, safeguardId, classification: enumValue },
        });

        return NextResponse.json<ApiResponse>({ success: true, data: record });
    }
    catch (error: any)
    {
        log.error(error, '(API : safeguard-classification - PUT) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
