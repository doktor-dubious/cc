// app/api/action-center/route.ts

import { log }                      from '@/lib/log';
import { NextResponse }             from 'next/server';
import { getServerSession }         from '@/lib/auth';
import { prisma }                   from '@/lib/prisma';
import { organizationRepository }   from '@/lib/database/organization';
import type { ApiResponse }         from '@/lib/types/api';

// Shared task select used across all three queries
const taskSelect = {
    id: true,
    name: true,
    description: true,
    expectedEvidence: true,
    status: true,
    endAt: true,
    organization: {
        select: { id: true, name: true },
    },
    taskProfiles: {
        select: {
            profile: {
                select: { id: true, name: true },
            },
        },
    },
    taskArtifacts: {
        select: {
            artifact: {
                select: {
                    id: true,
                    name: true,
                    originalName: true,
                    mimeType: true,
                    size: true,
                    createdAt: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' as const },
        take: 5,
    },
    messages: {
        where: { active: true },
        orderBy: { createdAt: 'asc' as const },
        take: 50,
        select: {
            id: true,
            content: true,
            type: true,
            origin: true,
            assetName: true,
            requestType: true,
            isRead: true,
            createdAt: true,
            sender: {
                select: { id: true, name: true },
            },
        },
    },
} as const;

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET - Action center data: needs attention, overdue tasks, due-soon tasks
export async function GET()
{
    log.debug('(API : action-center - GET)');

    try
    {
        // ── Authentication ────────────────────────────────────────────────────────────────
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id: userId, role } = session.user;

        if (!userId || !role)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Invalid token' },
                { status: 401 }
            );
        }

        // ── Get all organizations the user has access to ────────────────────────────────
        const organizations = role === 'SUPER_ADMIN'
            ? await organizationRepository.findAll()
            : await organizationRepository.findAllByUserId(userId);

        const orgIds = organizations.map(o => o.id);

        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // ── Needs Attention: unread messages (type NOTE, REPLY, REQUEST) ─────────────
        const attentionMessages = await prisma.message.findMany({
            where: {
                active: true,
                isRead: false,
                type: { in: ['NOTE', 'REPLY', 'REQUEST'] },
                task: {
                    active: true,
                    organizationId: { in: orgIds },
                    status: { notIn: ['COMPLETED', 'CLOSED'] },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                content: true,
                type: true,
                origin: true,
                assetName: true,
                requestType: true,
                replyId: true,
                replyTo: true,
                createdAt: true,
                sender: {
                    select: { id: true, name: true, email: true },
                },
                replyToProfile: {
                    select: { id: true, name: true },
                },
                task: {
                    select: taskSelect,
                },
            },
        });

        // ── Needs Attention: unapproved evidence ────────────────────────────────────
        const pendingEvidence = await prisma.evidence.findMany({
            where: {
                active: true,
                approved: false,
                resubmit: false,
                organizationId: { in: orgIds },
                task: {
                    active: true,
                    status: { notIn: ['COMPLETED', 'CLOSED'] },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                taskId: true,
                artifactId: true,
                approved: true,
                createdAt: true,
                artifact: {
                    select: {
                        id: true,
                        name: true,
                        originalName: true,
                        mimeType: true,
                        size: true,
                        createdAt: true,
                    },
                },
                createdBy: {
                    select: { id: true, name: true },
                },
                messages: {
                    where: { active: true, type: 'EVIDENCE' },
                    orderBy: { createdAt: 'desc' as const },
                    take: 1,
                    select: {
                        id: true,
                        content: true,
                        createdAt: true,
                        sender: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
                task: {
                    select: taskSelect,
                },
            },
        });

        // ── Overdue tasks: endAt < now, still active and not completed ─────────────────
        const overdueTasks = await prisma.task.findMany({
            where: {
                active: true,
                organizationId: { in: orgIds },
                status: { notIn: ['COMPLETED', 'CLOSED'] },
                endAt: { lt: now },
            },
            orderBy: { endAt: 'asc' },
            select: taskSelect,
        });

        // ── Due soon tasks: endAt between now and 7 days from now ─────────────────────
        const dueSoonTasks = await prisma.task.findMany({
            where: {
                active: true,
                organizationId: { in: orgIds },
                status: { notIn: ['COMPLETED', 'CLOSED'] },
                endAt: { gte: now, lte: sevenDaysFromNow },
            },
            orderBy: { endAt: 'asc' },
            select: taskSelect,
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: { attentionMessages, pendingEvidence, overdueTasks, dueSoonTasks },
        });
    }
    catch (error: any)
    {
        log.error(error, '(API : action-center - GET) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
