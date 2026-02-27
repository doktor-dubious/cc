// src/lib/auth.ts — Better Auth server configuration + session wrapper

import { betterAuth }      from 'better-auth';
import { prismaAdapter }   from 'better-auth/adapters/prisma';
import { nextCookies }     from 'better-auth/next-js';
import { twoFactor }       from 'better-auth/plugins';
import { prisma }          from '@/lib/prisma';
import { headers }         from 'next/headers';
import bcrypt              from 'bcryptjs';
import { log }             from '@/lib/log';

// ────────────────────────────────────────────────────────────────────────────
// IP Geolocation using ip-api.com (free, no API key required)
interface GeoLocation {
    city?:    string;
    region?:  string;
    country?: string;
}

function isLocalOrPrivateIP(ip: string): boolean {
    if (!ip) return true;

    // IPv4 localhost and private ranges
    if (ip === '127.0.0.1' || ip.startsWith('127.')) return true;
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.')) return true;

    // IPv6 localhost and unspecified
    if (ip === '::1' || ip === '::') return true;
    // Full form of IPv6 unspecified (::) and localhost (::1)
    if (ip === '0000:0000:0000:0000:0000:0000:0000:0000') return true;
    if (ip === '0000:0000:0000:0000:0000:0000:0000:0001') return true;
    // Compressed forms with leading zeros
    if (/^(0+:){7}0+$/.test(ip) || /^(0+:){7}0*1$/.test(ip)) return true;
    // IPv6 link-local
    if (ip.toLowerCase().startsWith('fe80:')) return true;

    return false;
}

async function getGeoLocation(ip: string): Promise<GeoLocation> {
    // Skip for localhost/private IPs
    if (isLocalOrPrivateIP(ip)) {
        return { city: 'Local', region: 'Local', country: 'Local' };
    }

    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country`, {
            signal: AbortSignal.timeout(3000), // 3 second timeout
        });

        if (!response.ok) {
            log.warn({ ip, status: response.status }, 'IP geolocation request failed');
            return {};
        }

        const data = await response.json();
        return {
            city:    data.city    || undefined,
            region:  data.regionName || undefined,
            country: data.country || undefined,
        };
    } catch (error) {
        log.warn({ ip, error }, 'IP geolocation lookup failed');
        return {};
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Better Auth instance
export const auth = betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    trustedOrigins: [process.env.BETTER_AUTH_URL ?? 'http://localhost:3001'],

    emailAndPassword: {
        enabled: true,
        password: {
            hash:   async (password) => bcrypt.hash(password, 10),
            verify: async ({ hash, password }) => bcrypt.compare(password, hash),
        },
    },

    socialProviders: {
        google: {
            clientId:     process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
        microsoft: {
            clientId:     process.env.MICROSOFT_CLIENT_ID!,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
            tenantId:     'common',
        },
    },

    session: {
        expiresIn:  60 * 60 * 24 * 7,   // 7 days
        updateAge:  60 * 60 * 24,        // refresh daily
    },

    user: {
        additionalFields: {
            role:         { type: 'string',  required: false, defaultValue: 'USER',  input: false },
            nickname:     { type: 'string',  required: false, defaultValue: '',      input: false },
            workFunction: { type: 'string',  required: false, defaultValue: 'OTHER', input: false },
            active:       { type: 'boolean', required: false, defaultValue: true,    input: false },
        },
    },

    plugins: [
        nextCookies(),
        twoFactor({ issuer: 'Compliance Circle' }),
    ],

    databaseHooks: {
        session: {
            create: {
                after: async (session) => {
                    const ip = session.ipAddress;
                    const geo = ip ? await getGeoLocation(ip) : {};

                    // Update session with geolocation
                    if (geo.city || geo.region || geo.country) {
                        await prisma.session.update({
                            where: { id: session.id },
                            data: {
                                city:    geo.city,
                                region:  geo.region,
                                country: geo.country,
                            },
                        });
                    }

                    // Create login history entry (always, for audit trail)
                    await prisma.loginHistory.create({
                        data: {
                            userId:    session.userId,
                            ipAddress: ip,
                            userAgent: session.userAgent,
                            city:      geo.city,
                            region:    geo.region,
                            country:   geo.country,
                        },
                    });

                    log.debug({ userId: session.userId, ip, geo }, 'Login history recorded');
                },
            },
        },
    },
});

// ────────────────────────────────────────────────────────────────────────────
// Session wrapper — drop-in replacement so existing API routes need zero changes
type SessionUser = {
    id             : string;
    profileId?     : string;
    email          : string;
    role           : string;
    name           : string;
    organizationId : string;
};

export async function getServerSession(): Promise<{ user: SessionUser } | null>
{
    try
    {
        const session = await auth.api.getSession({ headers: await headers() });

        if (!session) return null;

        // Resolve profileId and organizationId from the DB
        const profile = await prisma.profile.findUnique({
            where:  { userId: session.user.id },
            select: { id: true, currentOrganizationId: true, organizationId: true },
        });

        return {
            user: {
                id             : session.user.id,
                profileId      : profile?.id,
                email          : session.user.email,
                role           : (session.user as any).role ?? 'USER',
                name           : session.user.name,
                organizationId : profile?.currentOrganizationId ?? profile?.organizationId ?? '',
            },
        };
    }
    catch
    {
        return null;
    }
}
