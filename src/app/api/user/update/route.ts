import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { jwtVerify }                    from 'jose';
import { userRepository }               from '@/lib/database/user';
import { COOKIE_NAME }                  from '@/constants';
import { redirect }                     from 'next/navigation';

export async function PATCH(request: NextRequest)
{
    try
    {
        // Get JWT from cookie
        const token = request.cookies.get(COOKIE_NAME)?.value;

        if (!token)
        {
            log.info('No token found - redirecting to login');
            redirect('/login');
        }

        // Verify JWT.
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        // Get user ID from JWT.
        const userId = payload.userId;

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
        const updatedUser = await userRepository.updateProfile(parseInt(userId as string),
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
