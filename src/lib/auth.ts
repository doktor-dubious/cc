// src/lib/auth.ts — Better Auth server configuration + session wrapper

import { betterAuth }      from 'better-auth';
import { prismaAdapter }   from 'better-auth/adapters/prisma';
import { nextCookies }     from 'better-auth/next-js';
import { twoFactor }       from 'better-auth/plugins';
import { prisma }          from '@/lib/prisma';
import { headers }         from 'next/headers';
import bcrypt              from 'bcryptjs';

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
