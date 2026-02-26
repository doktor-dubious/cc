import { NextResponse }       from 'next/server';
import type { NextRequest }   from 'next/server';

export function middleware(request: NextRequest)
{
    const token = request.cookies.get('better-auth.session_token')?.value;

    if (!token)
    {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config =
{
    // Protect all routes EXCEPT login, public assets, and API routes
    matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|2fa|register|about).*)',
  ],

};
