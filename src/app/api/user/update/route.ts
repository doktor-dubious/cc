import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { getServerSession }             from '@/lib/auth';
import { userRepository }               from '@/lib/database/user';

export async function PATCH(request: NextRequest)
{
    try
    {
        // Verify session
        const session = await getServerSession();

        if (!session)
        {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user ID from session.
        const userId = session.user.id;

        // Parse request body.
        const body = await request.json();
        const { fullName, nickname, workFunction } = body;

        // Validate input.
        if (!fullName || !nickname)
        {
            return NextResponse.json(
                { success: false, message: 'Name and nickname are required' },
                { status: 400 }
            );
        }

        // Update user/login in database.
        const updatedUser = await userRepository.updateProfile(userId as string,
            {
                name: fullName,
                nickname,
                workFunction,
            }
        );

        return NextResponse.json(
        {
            success: false, message: 'User updated successfully',
            user: updatedUser,
        });
    }
    catch (error)
    {
        console.error('Error updating profile:', error);
        log.error({ error }, 'Error updating profile');
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}
