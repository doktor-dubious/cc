// app/api/user/route.ts
import { log }                                      from '@/lib/log';
import { NextRequest, NextResponse }                from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { userRepository }                           from '@/lib/database/user';
import { canFetchUsers, canCreateUsers }            from '@/lib/auth/permissions';
import type { ApiResponse }                         from '@/lib/types/api';
import bcrypt                                       from 'bcryptjs';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// GET — List all users (SUPER_ADMIN only)
export async function GET(request: NextRequest)
{
    log.debug('(PRISMA API : user - GET (list all)');

    try
    {
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Unauthorized' },
                { status: 401 });
        }

        const { id: userId, profileId, role } = session.user;

        if (!userId || !role || (role !== 'SUPER_ADMIN' && !profileId))
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Invalid token' },
                { status: 401 });
        }

        if (!canFetchUsers(role))
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Unauthorized' },
                { status: 403 });
        }

        const users = await userRepository.findAll();

        return NextResponse.json<ApiResponse>(
            { success: true, data: users },
            { status: 200 });
    }
    catch (error)
    {
        log.error({ error }, 'Error fetching users');

        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Error fetching users' },
            { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// POST — Create a new user (SUPER_ADMIN only)
export async function POST(request: Request)
{
    log.debug('(PRISMA API : user - POST (create)');

    try
    {
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Unauthorized' },
                { status: 401 });
        }

        const { id: userId, profileId, role } = session.user;

        if (!userId || !role || (role !== 'SUPER_ADMIN' && !profileId))
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Invalid token' },
                { status: 401 });
        }

        if (!canCreateUsers(role))
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Unauthorized' },
                { status: 403 });
        }

        // ── Parse & validate body ───────────────────────────────────────
        const body = await request.json();
        const { name, nickname, email, password, role: createRole, workFunction } = body;

        if (!name || typeof name !== 'string' || name.trim() === '')
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Name is required' },
                { status: 400 });
        }

        if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Valid email is required' },
                { status: 400 });
        }

        if (!password || typeof password !== 'string' || password.length < 4)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Password is required (min 4 characters)' },
                { status: 400 });
        }

        // ── Hash password & create ──────────────────────────────────────
        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await userRepository.createWithRole({
            email        : email.trim().toLowerCase(),
            passwordHash,
            name         : name.trim(),
            nickname     : (nickname || '').trim(),
            workFunction : workFunction || 'OTHER',
            role         : createRole || 'USER',
        });

        log.info({ userId: newUser.id }, 'User created successfully');

        return NextResponse.json<ApiResponse>(
            { success: true, message: 'User created successfully', data: newUser },
            { status: 201 });
    }
    catch (error: any)
    {
        log.error({ error }, 'Error creating user');

        if (error?.code === 'P2002')
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'A user with this email already exists' },
                { status: 409 });
        }

        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Failed to create user' },
            { status: 500 });
    }
}
