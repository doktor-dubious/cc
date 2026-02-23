import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { jwtVerify }                    from 'jose';
import { userRepository }               from '@/lib/database/user';
import { COOKIE_NAME }                  from '@/constants';
import { redirect }                     from 'next/navigation';

export async function GET(request: NextRequest)
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

        // Verify JWT
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        
        // Fetch user from database using the user ID from JWT
        const userId = payload.sub; // or payload.userId depending on your JWT structure
        log.debug({ userId }, 'User ID');

        const user = await userRepository.findById(userId as string);
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