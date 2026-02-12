import { NextResponse }       from 'next/server';
import type { NextRequest }   from 'next/server';
import jwt                    from 'jsonwebtoken';
import { COOKIE_NAME }        from '@/constants';

export function middleware(request: NextRequest) 
{
    const token = request.cookies.get(COOKIE_NAME)?.value;
    
    if (!token) 
    {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    
    try 
    {
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) throw new Error('JWT_SECRET not set');
        
        jwt.verify(token, JWT_SECRET);
        return NextResponse.next();
    } 
    catch 
    {
        return NextResponse.redirect(new URL('/login', request.url));
    }
}

export const config = 
{
    // Protect all routes EXCEPT login, public assets, and API routes
    matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register).*)',
  ],

};