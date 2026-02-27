// app/api/user/[id]/disable-2fa/route.ts
import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { prisma }                       from '@/lib/prisma';
import { getServerSession }             from '@/lib/auth';

// POST: Disable 2FA for a user (SUPER_ADMIN only)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: userId } = await params;
    log.debug({ userId }, 'API: user disable-2fa POST');

    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Only SUPER_ADMIN can disable 2FA for other users
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

        if (!user.twoFactorEnabled) {
            return NextResponse.json({ success: false, error: '2FA is not enabled for this user' }, { status: 400 });
        }

        // Disable 2FA: update user flag and delete TwoFactor records
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { twoFactorEnabled: false },
            }),
            prisma.twoFactor.deleteMany({
                where: { userId: userId },
            }),
        ]);

        log.info({ userId, adminId: session.user.id }, '2FA disabled for user by admin');

        return NextResponse.json({
            success: true,
            message: '2FA disabled successfully',
        });
    } catch (error: unknown) {
        log.error({ error, userId }, 'Error disabling 2FA for user');
        return NextResponse.json({ success: false, error: 'Failed to disable 2FA' }, { status: 500 });
    }
}
