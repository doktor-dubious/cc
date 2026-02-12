'use server';

import { log }                from '@/lib/log';
import { authenticateUser }   from '@/lib/authorization';
import { cookies }            from 'next/headers';
import jwt                    from 'jsonwebtoken';
import { COOKIE_NAME, COOKIE_EXPIRATION, JWT_EXPIRATION } from '@/constants';

// _JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) { throw new Error('JWT_SECRET environment variable is not set!');}

export async function loginUser(formData: FormData)
{
    const email     = formData.get('email')?.toString().trim().toLowerCase() || '';
    const password  = formData.get('password')?.toString() || '';

    log.debug({ email, password }, 'User Logging in');

    if (!email || !password)
    {
        log.warn({ hasEmail: !!email, hasPassword: !!password }, 'Login validation failed');
        return { success: false, code: 1, msg: 'Email and password are required', user: null };
    }

    try
    {
        const user = await authenticateUser(email, password);

        log.debug({ 
            user: user ? { id: user.id, email: user.email } : null,
            found: !!user 
        }, 'User login lookup result');

        if (!user)
        {
            log.warn('Invalid email or password');
            return { success: false, code: 2, msg: 'Invalid email or password', user: null };
        }

        // Generate JWT
        const token = jwt.sign(
            { 
                userId      : user.id, 
                email       : user.email,
                role        : user.role,
                name        : user.name,
                profileId   : user.profile?.id,
            },
            JWT_SECRET!,
            { expiresIn : JWT_EXPIRATION }
        );

        // Set cookie.
        const cookieStore = await cookies();
        cookieStore.set(COOKIE_NAME, token,
        {
            httpOnly    : true,                                         // Prevents Javascript from reading cookie.
            secure      : process.env.NODE_ENV === 'production',        // Only send over https (if in production).
            sameSite    : 'strict',                                     // Blocks CSRF.
            maxAge      : COOKIE_EXPIRATION,
            path        : '/',
        });

        return { 
            success : true, 
            code    : 0, 
            msg     : "", 
            user    : { 
                id      : user.id, 
                email   : user.email,
                role    : user.role,
                name    : user.name
             } };
    }
    catch (error)
    {
        console.error('Login error:', error);
        return { success: false, code : 3, msg: 'Something went wrong. Please try again.', user: null };
    }
}