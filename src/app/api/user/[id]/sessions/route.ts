// app/api/user/[id]/sessions/route.ts
import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { prisma }                       from '@/lib/prisma';
import { getServerSession }             from '@/lib/auth';

// GET: Fetch all sessions for a user (SUPER_ADMIN only)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: userId } = await params;
    log.debug({ userId }, 'API: user sessions GET');

    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Only SUPER_ADMIN can view other users' sessions
        if (session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // Fetch login history for the user, ordered by most recent
        const loginHistory = await prisma.loginHistory.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                createdAt: true,
                ipAddress: true,
                userAgent: true,
                city: true,
                region: true,
                country: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: loginHistory,
        });
    } catch (error: unknown) {
        log.error({ error, userId }, 'Error fetching user sessions');
        return NextResponse.json({ success: false, error: 'Failed to fetch sessions' }, { status: 500 });
    }
}
