// lib/constants/task-status.ts
import { TaskStatus } from '@prisma/client';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = 
{
    [TaskStatus.NOT_STARTED]      : 'Not Started',
    [TaskStatus.OPEN]             : 'Open',
    [TaskStatus.COMPLETED]        : 'Completed',
    [TaskStatus.CLOSED]           : 'Closed',
} as const;

export const TASK_STATUSES = Object.keys(TASK_STATUS_LABELS) as TaskStatus[];
