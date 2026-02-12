// app/api/user/check-email/route.ts

import { log } from '@/lib/log';
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest)
{
    try
    {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email)
        {
            return NextResponse.json(
                { success: false, message: 'Email is required' },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: email.trim() }
        });

        return NextResponse.json({
            success: true,
            available: !existingUser,
        });
    }
    catch (error)
    {
        log.error({ error }, 'Error checking email availability');
        return NextResponse.json(
            { success: false, message: 'Failed to check email' },
            { status: 500 }
        );
    }
}