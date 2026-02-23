import { log } from '@/lib/log';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { redirect } from 'next/navigation';

import { userRepository } from '@/lib/database/user';
import { taskRepository } from '@/lib/database/task';
import { organizationRepository } from '@/lib/database/organization';

import AuthorizedLayoutClient from '@/app/components/AuthorizedLayoutClient';
import { COOKIE_NAME } from '@/constants';

async function getUserData() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    log.info('No token found - redirecting to login');
    redirect('/login');
  }

  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };

    const user = await userRepository.findById(decoded.userId);

    if (!user) {
      redirect('/login');
    }

    return user;
  } catch (err) {
    log.error(err, 'JWT verification failed');
    redirect('/login');
  }
}

async function getOrganizationData(user: { id: string; role: string }) 
{
    try 
    {
        if (user.role === 'SUPER_ADMIN') 
        {
            return await organizationRepository.findAll();
        }

        return await organizationRepository.findAllByUserId(user.id);
    } 
    catch (err) 
    {
        log.error(err, 'Error loading organizations');
        return [];
    }
}

async function getTasksData()
{
    try
    {
        return await taskRepository.findAll();
    } 
    catch (err) 
    {
        log.error(err, 'Error loading tasks');
        return [];
    }
}

export default async function AuthorizedLayout({children,}:
{
    children: React.ReactNode;
})
{
    const user          = await getUserData();
    const organizationsDb = await getOrganizationData(user);
    const tasks         = await getTasksData();

    const organizations = organizationsDb.map(org => (
    {
        id          : org.id,
        name        : org.name,
        description : org.description,
    }));

    return (
        <AuthorizedLayoutClient
            user={user}
            organizations={organizations}
            tasks={tasks}
        >
            {children}
        </AuthorizedLayoutClient>
    );
}
