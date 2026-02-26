// app/api/safeguard-inactive/route.ts

import { log }                       from '@/lib/log';
import { NextResponse }              from 'next/server';
import { getServerSession }          from '@/lib/auth';
import { prisma }                    from '@/lib/prisma';
import type { ApiResponse }          from '@/lib/types/api';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET - Fetch inactive safeguards for an organization
export async function GET(request: Request)
{
    log.debug('(API : safeguard-inactive - GET)');

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

        const records = await prisma.organizationInactiveSafeguard.findMany({
            where: { organizationId },
            orderBy: { safeguardId: 'asc' },
        });

        // Return as an array of safeguard IDs for easy consumption
        const inactiveSafeguardIds = records.map(r => r.safeguardId);

        return NextResponse.json<ApiResponse>({
            success: true,
            data: inactiveSafeguardIds,
        });
    }
    catch (error: any)
    {
        log.error(error, '(API : safeguard-inactive - GET) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// POST - Mark a safeguard as inactive for an organization
export async function POST(request: Request)
{
    log.debug('(API : safeguard-inactive - POST)');

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
        const { organizationId, safeguardId } = body;

        if (!organizationId || !safeguardId)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'organizationId and safeguardId are required' },
                { status: 400 }
            );
        }

        // Use upsert to avoid duplicates
        const record = await prisma.organizationInactiveSafeguard.upsert({
            where: {
                organizationId_safeguardId: { organizationId, safeguardId },
            },
            update: {}, // No update needed, just ensure it exists
            create: { organizationId, safeguardId },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: record,
            message: 'Safeguard marked as inactive',
        });
    }
    catch (error: any)
    {
        log.error(error, '(API : safeguard-inactive - POST) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// DELETE - Mark a safeguard as active (remove from inactive list)
export async function DELETE(request: Request)
{
    log.debug('(API : safeguard-inactive - DELETE)');

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
        const { organizationId, safeguardId } = body;

        if (!organizationId || !safeguardId)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'organizationId and safeguardId are required' },
                { status: 400 }
            );
        }

        await prisma.organizationInactiveSafeguard.delete({
            where: {
                organizationId_safeguardId: { organizationId, safeguardId },
            },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Safeguard marked as active',
        });
    }
    catch (error: any)
    {
        // If record doesn't exist, that's fine - safeguard is already active
        if (error.code === 'P2025')
        {
            return NextResponse.json<ApiResponse>({
                success: true,
                message: 'Safeguard is already active',
            });
        }

        log.error(error, '(API : safeguard-inactive - DELETE) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
