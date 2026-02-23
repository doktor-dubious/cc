// src/lib/auth.ts
import { cookies }      from 'next/headers';
import jwt              from 'jsonwebtoken';
import { COOKIE_NAME }  from '@/constants';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) { throw new Error('JWT_SECRET environment variable is not set!'); }

type SessionUser = {
    id              : string;
    profileId       : string | undefined;
    email           : string;
    role            : string;
    name            : string;
    organizationId  : string
};

// Rename to avoid conflict with jwt.JwtPayload
interface CustomJwtPayload {
    userId          : string;
    profileId?      : string;
    email           : string;
    role            : string;
    name            : string;
    organizationId  : string;
}

export async function getServerSession(): Promise<{ user: SessionUser } | null>
{
    try
    {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAME)?.value;
        
        if (!token)
        {
            return null;
        }

        // Cast through 'unknown' to avoid type conflict
        const decoded = jwt.verify(token, JWT_SECRET!) as unknown as CustomJwtPayload;

        return {
            user: {
                id              : decoded.userId,
                profileId       : decoded.profileId,
                email           : decoded.email,
                role            : decoded.role,
                name            : decoded.name,
                organizationId  : decoded.organizationId
            }
        };
    }
    catch (error)
    {
        return null;
    }
}