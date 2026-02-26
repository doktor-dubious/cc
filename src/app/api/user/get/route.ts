import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { getServerSession }             from '@/lib/auth';
import { userRepository }               from '@/lib/database/user';

export async function GET(request: NextRequest)
{
    try
    {
        // Verify session
        const session = await getServerSession();

        if (!session)
        {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch user from database using the user ID from session
        const userId = session.user.id;
        log.debug({ userId }, 'User ID');

        const user = await userRepository.findById(userId);
        if (!user)
        {
            return (NextResponse.json({ error: 'User not found' }, { status: 404 }));
        }


        return (NextResponse.json(user));
    }
    catch (error)
    {
        console.error('Auth error:', error);
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
}