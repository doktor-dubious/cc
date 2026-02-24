// app/api/user/[id]/route.ts
import { log }                                      from '@/lib/log';
import { NextRequest, NextResponse }                from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { userRepository }                           from '@/lib/database/user';
import { canUpdateUsers, canDeleteUsers }           from '@/lib/auth/permissions';
import type { ApiResponse }                         from '@/lib/types/api';
import bcrypt                                       from 'bcryptjs';

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// PATCH — Update a user (SUPER_ADMIN only)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> })
{
    log.debug('(PRISMA API : user/[id] - PATCH');

    const { id: targetUserId } = await params;

    if (!targetUserId)
    {
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Invalid user ID' },
            { status: 400 });
    }

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

        if (!canUpdateUsers(role))
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Unauthorized' },
                { status: 403 });
        }

        // ── Prevent self-role-downgrade ─────────────────────────────────
        const body = await request.json();
        const { name, nickname, email, role: newRole, password } = body;

        if (targetUserId === userId && newRole && newRole !== 'SUPER_ADMIN')
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Cannot downgrade your own role' },
                { status: 400 });
        }

        // ── Validate ────────────────────────────────────────────────────
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

        // ── Check existence ─────────────────────────────────────────────
        const existing = await userRepository.findById(targetUserId);
        if (!existing)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'User not found' },
                { status: 404 });
        }

        // ── Build update data ───────────────────────────────────────────
        const updateData: {
            name         : string;
            nickname     : string;
            email        : string;
            role         : any;
            passwordHash?: string;
        } = {
            name     : name.trim(),
            nickname : (nickname || '').trim(),
            email    : email.trim().toLowerCase(),
            role     : newRole || existing.role,
        };

        if (password && typeof password === 'string' && password.length >= 4)
        {
            updateData.passwordHash = await bcrypt.hash(password, 10);
        }

        const updatedUser = await userRepository.update(targetUserId, updateData);

        return NextResponse.json<ApiResponse>(
            { success: true, message: 'User updated successfully', data: updatedUser },
            { status: 200 });
    }
    catch (error: any)
    {
        log.error({ error }, 'Error updating user');

        if (error?.code === 'P2002')
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'A user with this email already exists' },
                { status: 409 });
        }

        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Failed to update user' },
            { status: 500 });
    }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// DELETE — Soft-delete a user (SUPER_ADMIN only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> })
{
    log.debug('(PRISMA API : user/[id] - DELETE');

    const { id: targetUserId } = await params;

    if (!targetUserId)
    {
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Invalid user ID' },
            { status: 400 });
    }

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

        if (!canDeleteUsers(role))
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Unauthorized' },
                { status: 403 });
        }

        // ── Prevent self-deletion ───────────────────────────────────────
        if (targetUserId === userId)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Cannot delete your own account' },
                { status: 400 });
        }

        // ── Check existence ─────────────────────────────────────────────
        const existing = await userRepository.findById(targetUserId);
        if (!existing)
        {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'User not found' },
                { status: 404 });
        }

        // ── Soft delete ─────────────────────────────────────────────────
        await userRepository.softDelete(targetUserId);

        return NextResponse.json<ApiResponse>(
            { success: true, message: 'User deleted successfully' },
            { status: 200 });
    }
    catch (error)
    {
        log.error({ error }, 'Error deleting user');

        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Failed to delete user' },
            { status: 500 });
    }
}
