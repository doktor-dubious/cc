// app/api/user/[id]/enable-2fa/route.ts
import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { prisma }                       from '@/lib/prisma';
import { getServerSession }             from '@/lib/auth';
import crypto                           from 'crypto';

// Generate a random base32 secret (20 bytes = 32 base32 chars)
function generateSecret(): string {
    const buffer = crypto.randomBytes(20);
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';

    for (let i = 0; i < buffer.length; i++) {
        secret += base32Chars[buffer[i] % 32];
    }

    return secret;
}

// Generate backup codes (10 codes, 8 chars each)
function generateBackupCodes(): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar chars (0, O, 1, I)

    for (let i = 0; i < 10; i++) {
        let code = '';
        for (let j = 0; j < 8; j++) {
            code += chars[crypto.randomInt(chars.length)];
        }
        // Format as XXXX-XXXX
        codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }

    return codes;
}

// Build TOTP URI for QR code
function buildTotpUri(secret: string, email: string, issuer: string): string {
    const encodedEmail = encodeURIComponent(email);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

// POST: Enable 2FA for a user (SUPER_ADMIN only)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: userId } = await params;
    log.debug({ userId }, 'API: user enable-2fa POST');

    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Only SUPER_ADMIN can enable 2FA for other users
        if (session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, twoFactorEnabled: true },
        });

        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        if (user.twoFactorEnabled) {
            return NextResponse.json({ success: false, error: '2FA is already enabled for this user' }, { status: 400 });
        }

        // Generate TOTP secret and backup codes
        const secret = generateSecret();
        const backupCodes = generateBackupCodes();
        const totpURI = buildTotpUri(secret, user.email, 'Compliance Circle');

        // Store in database (enable 2FA and create TwoFactor record)
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { twoFactorEnabled: true },
            }),
            prisma.twoFactor.create({
                data: {
                    userId: userId,
                    secret: secret,
                    backupCodes: JSON.stringify(backupCodes),
                },
            }),
        ]);

        log.info({ userId, adminId: session.user.id }, '2FA enabled for user by admin');

        return NextResponse.json({
            success: true,
            message: '2FA enabled successfully',
            data: {
                totpURI,
                backupCodes,
            },
        });
    } catch (error: unknown) {
        log.error({ error, userId }, 'Error enabling 2FA for user');
        return NextResponse.json({ success: false, error: 'Failed to enable 2FA' }, { status: 500 });
    }
}
