// app/api/dashboard/route.ts

import { log }                       from '@/lib/log';
import { NextResponse }              from 'next/server';
import { getServerSession }          from '@/lib/auth';
import { prisma }                    from '@/lib/prisma';
import { organizationRepository }   from '@/lib/database/organization';
import { settingsRepository }        from '@/lib/database/settings';
import type { ApiResponse }          from '@/lib/types/api';
import fs                            from 'fs/promises';
import path                          from 'path';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET - Aggregated dashboard data across all user-accessible organizations
export async function GET()
{
    log.debug('(API : dashboard - GET)');

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

        // ── Fetch messages (unread first, then by date, limit 20) ───────────────────────
        const messages = await prisma.message.findMany({
            where: {
                active: true,
                task: {
                    active: true,
                    organizationId: { in: orgIds },
                },
            },
            orderBy: [
                { isRead: 'asc' },
                { createdAt: 'desc' },
            ],
            take: 50,
            select: {
                id: true,
                content: true,
                isRead: true,
                type: true,
                createdAt: true,
                sender: {
                    select: { name: true },
                },
                task: {
                    select: {
                        id: true,
                        name: true,
                        organization: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
        });

        // ── Fetch active tasks (not COMPLETED, not CLOSED) ──────────────────────────────
        const tasks = await prisma.task.findMany({
            where: {
                active: true,
                organizationId: { in: orgIds },
                status: { notIn: ['COMPLETED', 'CLOSED'] },
            },
            orderBy: { endAt: 'asc' },
            select: {
                id: true,
                name: true,
                description: true,
                status: true,
                startAt: true,
                endAt: true,
                organization: {
                    select: { id: true, name: true },
                },
            },
        });

        // ── Fetch incoming files per organization ───────────────────────────────────────
        const incomingFiles: { organizationId: string; organizationName: string; files: { name: string; size: number; modifiedAt: string }[] }[] = [];

        const globalSettings = await settingsRepository.getActive();

        if (globalSettings?.homeDirectory)
        {
            for (const org of organizations)
            {
                try
                {
                    const orgWithSettings = await organizationRepository.findByIdWithSettings(org.id);
                    const uploadDir = orgWithSettings?.settings?.uploadDirectory;

                    if (!uploadDir) continue;

                    const resolved = path.resolve(globalSettings.homeDirectory, uploadDir);

                    if (!resolved.startsWith(path.resolve(globalSettings.homeDirectory))) continue;

                    const exists = await fs.stat(resolved).catch(() => null);
                    if (!exists?.isDirectory()) continue;

                    const entries = await fs.readdir(resolved, { withFileTypes: true });
                    const files = await Promise.all(
                        entries
                            .filter(e => e.isFile())
                            .map(async (e) => {
                                const stat = await fs.stat(path.join(resolved, e.name));
                                return {
                                    name: e.name,
                                    size: stat.size,
                                    modifiedAt: stat.mtime.toISOString(),
                                };
                            })
                    );

                    if (files.length > 0)
                    {
                        incomingFiles.push({
                            organizationId: org.id,
                            organizationName: org.name,
                            files: files.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()),
                        });
                    }
                }
                catch (err)
                {
                    log.warn({ orgId: org.id, error: err }, 'Failed to list files for org');
                }
            }
        }

        // ── Fetch recent audit trail events across all orgs ─────────────────────────
        const events = await prisma.event.findMany({
            where: {
                active: true,
                OR: [
                    { organizationId: { in: orgIds } },
                    { task: { organizationId: { in: orgIds }, active: true } },
                    { profile: { organizationId: { in: orgIds }, active: true } },
                    { artifact: { organizationId: { in: orgIds }, active: true } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                message: true,
                importance: true,
                createdAt: true,
                user: { select: { name: true } },
                organization: { select: { id: true, name: true } },
                task: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json<ApiResponse>({
            success: true,
            data: { messages, tasks, incomingFiles, events },
        });
    }
    catch (error: any)
    {
        log.error(error, '(API : dashboard - GET) Error');
        return NextResponse.json<ApiResponse>(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
