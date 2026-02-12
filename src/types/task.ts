import { TaskStatus } from '@prisma/client';

export interface Task
{
    id                  : number;
    organizationId      : number;
    organizationName?   : string;
    name                : string;
    description         : string | null;
    expectedEvidence    : string | null;
    startAt             : string | null;
    endAt               : string | null;
    status              : TaskStatus;
}
