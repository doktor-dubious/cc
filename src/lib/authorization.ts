import type { User }        from '@prisma/client';
import { userRepository }   from '@/lib/database/user';
import bcrypt               from 'bcryptjs';

export async function authenticateUser(
        email: string, 
        password: string)
: Promise<Pick<User, 'id' | 'email' | 'passwordHash' | 'role' | 'name'> & { profile?: { id: string } } | null>
{
    const user = await userRepository.findByEmailWithPassword(email);
    if (!user) return null;

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;

    return user;
}
