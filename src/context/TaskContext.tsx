'use client';
import { createContext, useContext, ReactNode } from 'react';
import type { TaskStatus } from '@prisma/client';

interface Task 
{
    id                    : number;
    name                  : string;
    description           : string | null;
    expectedEvidence      : string | null;
    startAt               : Date | null;
    endAt                 : Date | null;
    status                : TaskStatus;
    active                : boolean;
    createdAt             : Date;
    updatedAt             : Date;
}

const TaskContext = createContext<Task[] | null>(null);

export const TaskProvider = ({ children, tasks }: { children: ReactNode; tasks: Task[] }) => 
{
    return <TaskContext.Provider value={tasks}>{children}</TaskContext.Provider>;
};

export const useTasks = () =>
{
  const context = useContext(TaskContext);
  if (!context)
  {
      throw new Error('useTasks must be used within TaskProvider');
  }
  return context;
};