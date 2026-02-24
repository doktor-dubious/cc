// app/api/cis-control-group/route.ts

import { log }                       from '@/lib/log';
import { NextResponse }              from 'next/server';
import { getServerSession }          from '@/lib/auth';
import { prisma }                    from '@/lib/prisma';
import type { ApiResponse }          from '@/lib/types/api';

// ────────────────────────────────────────────────────────────────────────────
// GET — Fetch all combined groups for an organization
export async function GET(request: Request)
{
    log.debug('(API : cis-control-group - GET)');

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

        const groups = await prisma.cisControlGroup.findMany({
            where: { organizationId },
            orderBy: { sortOrder: 'asc' },
            include: { members: { orderBy: { controlId: 'asc' } } },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: groups.map(g => ({
                id:    g.id,
                name:  g.name,
                color: g.color,
                ids:   g.members.map(m => m.controlId),
            })),
        });
    }
    catch (error: any)
    {
        log.error(error, '(API : cis-control-group - GET) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// ────────────────────────────────────────────────────────────────────────────
// POST — Create a new combined group
export async function POST(request: Request)
{
    log.debug('(API : cis-control-group - POST)');

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
        const { organizationId, name, color, controlIds } = body;

        if (!organizationId || !name || !color || !Array.isArray(controlIds) || controlIds.length < 2)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'organizationId, name, color, and controlIds (min 2) are required' },
                { status: 400 }
            );
        }

        // Remove these controlIds from any existing groups in this org
        await prisma.cisControlGroupMember.deleteMany({
            where: {
                controlId: { in: controlIds },
                group: { organizationId },
            },
        });

        // Clean up any groups that now have fewer than 2 members
        const allGroups = await prisma.cisControlGroup.findMany({
            where: { organizationId },
            include: { members: true },
        });
        const emptyGroupIds = allGroups
            .filter(g => g.members.length < 2)
            .map(g => g.id);
        if (emptyGroupIds.length > 0)
        {
            await prisma.cisControlGroup.deleteMany({
                where: { id: { in: emptyGroupIds } },
            });
        }

        // Count remaining groups for sort order
        const count = await prisma.cisControlGroup.count({ where: { organizationId } });

        const group = await prisma.cisControlGroup.create({
            data: {
                organizationId,
                name,
                color,
                sortOrder: count,
                members: {
                    create: controlIds.map((id: number) => ({ controlId: id })),
                },
            },
            include: { members: { orderBy: { controlId: 'asc' } } },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: {
                id:    group.id,
                name:  group.name,
                color: group.color,
                ids:   group.members.map(m => m.controlId),
            },
        }, { status: 201 });
    }
    catch (error: any)
    {
        log.error(error, '(API : cis-control-group - POST) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// ────────────────────────────────────────────────────────────────────────────
// PATCH — Rename a group
export async function PATCH(request: Request)
{
    log.debug('(API : cis-control-group - PATCH)');

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
        const { id, name } = body;

        if (!id || !name)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'id and name are required' },
                { status: 400 }
            );
        }

        const group = await prisma.cisControlGroup.update({
            where: { id },
            data: { name: name.trim() },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: { id: group.id, name: group.name },
        });
    }
    catch (error: any)
    {
        log.error(error, '(API : cis-control-group - PATCH) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE — Remove a combined group
export async function DELETE(request: Request)
{
    log.debug('(API : cis-control-group - DELETE)');

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
        const id = searchParams.get('id');

        if (!id)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'id is required' },
                { status: 400 }
            );
        }

        await prisma.cisControlGroup.delete({ where: { id } });

        return NextResponse.json<ApiResponse>({ success: true });
    }
    catch (error: any)
    {
        log.error(error, '(API : cis-control-group - DELETE) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
