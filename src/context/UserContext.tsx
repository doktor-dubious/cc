'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { UserRole } from '@prisma/client';

interface User {
  id                : string;
  name              : string;
  email             : string;
  role              : UserRole;
  nickname          : string;
  workFunction?     : string;
  twoFactorEnabled? : boolean;
}

const UserContext = createContext<User | null>(null);

export const UserProvider = ({ children, user }: { children: ReactNode; user: User }) => 
{
    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};

export const useUser = () =>
{
  const context = useContext(UserContext);
  if (!context)
  {
      throw new Error('useUser must be used within UserProvider');
  }

  return context;
};