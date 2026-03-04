// app/api/cis-note/route.ts

import { log }                       from '@/lib/log';
import { NextResponse }              from 'next/server';
import { getServerSession }          from '@/lib/auth';
import { prisma }                    from '@/lib/prisma';
import type { ApiResponse }          from '@/lib/types/api';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET - Fetch all CIS notes for an organization
export async function GET(request: Request)
{
    log.debug('(API : cis-note - GET)');

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

        const records = await prisma.organizationCisNote.findMany({
            where: { organizationId },
            orderBy: { itemId: 'asc' },
        });

        // Convert to a map keyed by "itemType:itemId" for easy lookup
        const notesMap: Record<string, string> = {};
        for (const record of records) {
            notesMap[`${record.itemType}:${record.itemId}`] = record.content;
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: notesMap,
        });
    }
    catch (error: unknown)
    {
        log.error(error, '(API : cis-note - GET) Error');
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json<ApiResponse>(
            { success: false, error: message },
            { status: 500 }
        );
    }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// PUT - Upsert a CIS note for an organization
export async function PUT(request: Request)
{
    log.debug('(API : cis-note - PUT)');

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
        const { organizationId, itemId, itemType, content } = body;

        if (!organizationId || !itemId || !itemType)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'organizationId, itemId, and itemType are required' },
                { status: 400 }
            );
        }

        if (!['control', 'safeguard'].includes(itemType))
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'itemType must be "control" or "safeguard"' },
                { status: 400 }
            );
        }

        // If content is empty, delete the note
        if (!content || content.trim() === '')
        {
            try {
                await prisma.organizationCisNote.delete({
                    where: {
                        organizationId_itemId_itemType: { organizationId, itemId, itemType },
                    },
                });
            } catch (error: unknown) {
                // P2025 = record not found, which is fine
                const prismaError = error as { code?: string };
                if (prismaError.code !== 'P2025') throw error;
            }

            return NextResponse.json<ApiResponse>({
                success: true,
                message: 'Note removed',
            });
        }

        // Upsert the note
        const record = await prisma.organizationCisNote.upsert({
            where: {
                organizationId_itemId_itemType: { organizationId, itemId, itemType },
            },
            update: { content: content.trim() },
            create: { organizationId, itemId, itemType, content: content.trim() },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: record,
            message: 'Note saved',
        });
    }
    catch (error: unknown)
    {
        log.error(error, '(API : cis-note - PUT) Error');
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json<ApiResponse>(
            { success: false, error: message },
            { status: 500 }
        );
    }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// DELETE - Remove a CIS note
export async function DELETE(request: Request)
{
    log.debug('(API : cis-note - DELETE)');

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
        const { organizationId, itemId, itemType } = body;

        if (!organizationId || !itemId || !itemType)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'organizationId, itemId, and itemType are required' },
                { status: 400 }
            );
        }

        await prisma.organizationCisNote.delete({
            where: {
                organizationId_itemId_itemType: { organizationId, itemId, itemType },
            },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            message: 'Note deleted',
        });
    }
    catch (error: unknown)
    {
        // If record doesn't exist, that's fine
        const prismaError = error as { code?: string };
        if (prismaError.code === 'P2025')
        {
            return NextResponse.json<ApiResponse>({
                success: true,
                message: 'Note already deleted',
            });
        }

        log.error(error, '(API : cis-note - DELETE) Error');
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json<ApiResponse>(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
