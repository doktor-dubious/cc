/*
model Task {
    id                  Int       @id(map: "task_pkey") @default(autoincrement())
    organizationId      Int?                                                              @map("organization_id")
    name                String
    description         String?
    expectedEvidence    String?                                                           @map("expected_evidence")

    startAt             DateTime? @db.Timestamptz(3)                                      @map("start_at")
    endAt               DateTime? @db.Timestamptz(3)                                      @map("end_at")
    status              TaskStatus @default(NOT_STARTED)

    active              Boolean   @default(true)
    createdAt           DateTime  @default(now()) @db.Timestamptz(3)                      @map("created_at")
    updatedAt           DateTime  @updatedAt      @db.Timestamptz(3)                      @map("updated_at")

    organization        Organization?  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
    taskProfiles        TaskProfile[]                                                                                         // Zero or more Profiles
    taskArtifacts       TaskArtifact[]                                                                                        // Zero or more Artifacts

    @@index([organizationId])
    @@index([startAt])
    @@index([endAt])
    @@map("task")
}
*/

import { log }                          from '@/lib/log';
import { Prisma }                       from '@prisma/client';
import { prisma }                       from '@/lib/prisma';
import type { Task, TaskStatus }        from '@prisma/client';

const selectFields =
{
    id                  : true,
    name                : true,
    description         : true,
    expectedEvidence    : true,
    startAt             : true,
    endAt               : true,
    status              : true,
    organizationId      : true,
    active              : true,
    createdAt           : true,
    updatedAt           : true,
    organization: 
    {
        select: 
        {
            id: true,
            name: true,
        },
    },
} as const;

export type TaskObj = Prisma.TaskGetPayload<{
  select: typeof selectFields;
}>;

const selectFieldsWithRelations = {
    id                  : true,
    name                : true,
    description         : true,
    expectedEvidence    : true,
    startAt             : true,
    endAt               : true,
    status              : true,
    organizationId      : true,
    active              : true,
    createdAt           : true,
    updatedAt           : true,
    taskProfiles: 
    {
        select: 
        {
            profile: 
            {
                select: 
                {
                    id: true,
                    name: true,
                    description: true,
                }
            }
        }
    },
    taskArtifacts: 
    {
        select: 
        {
            artifact: 
            {
                select: 
                {
                    id: true,
                    name: true,
                    description: true,
                }
            }
        }
    }
} as const;

export type TaskWithRelations = Prisma.TaskGetPayload<{
  select: typeof selectFieldsWithRelations;
}>;

export const taskRepository =
{
    async findById(id: string): Promise<TaskObj | null>
    {
        log.info('SQL - task: findById');

        return prisma.task.findUnique(
        {
            where: { id, active: true },
            select: selectFields
        });
    },

    async findAll(): Promise<TaskObj[]>
    {
        log.info('SQL - task: findAll');

        return prisma.task.findMany(
        {
            where: { active: true },
            select: selectFields,
            orderBy: { id: 'asc' }
        });
    },

    async findByOrganizationId(organizationId: string): Promise<TaskWithRelations[]>
    {
        log.info({ organizationId: organizationId}, 'SQL - task: findByOrganizationId');

        return prisma.task.findMany(
        {
            where:
            {
                organizationId,
                active: true,
            },
            select: selectFieldsWithRelations,
            orderBy: { id: 'asc' },
        });
    },

    async findByStatus(status: TaskStatus): Promise<TaskObj[]>
    {
        log.info({ status: status}, 'SQL - task: findByStatus');

        return prisma.task.findMany(
        {
            where: { active: true, status },
            select: selectFields,
            orderBy: { id: 'asc' }
        });
    },

    async findByDateRange(startDate: Date, endDate: Date): Promise<TaskObj[]>
    {
        log.info({ startDate: startDate, endDate: endDate }, 'SQL - task: findByDateRange');

        return prisma.task.findMany(
        {
            where: {
                active: true,
                OR: [
                    { startAt: { gte: startDate, lte: endDate } },
                    { endAt: { gte: startDate, lte: endDate } }
                ]
            },
            select: selectFields,
            orderBy: { id: 'asc' }
        });
    },

    async create(data:
    {
        name                : string;
        organizationId      : string;
        description?        : string;
        expectedEvidence?   : string;
        startAt?            : Date;
        endAt?              : Date;
        status?             : TaskStatus;
    }): Promise<TaskObj>
    {
        log.info({ name: data.name }, 'SQL - task: create');

        return prisma.task.create({
            data,
            select: selectFields
        });
    },

    async update(
        id: string,
        data:
        {
            name?               : string;
            description?        : string;
            expectedEvidence?   : string;
            startAt?            : Date;
            endAt?              : Date;
            status?             : TaskStatus
        }
    ): Promise<TaskObj>
    {
        log.info({ ID: id, name: data.name }, 'SQL - task: update');

        const existing = await this.findById(id);
        if (!existing)
        {
            throw new Error('Task not found or inactive');
        }

        return prisma.task.update({
            where: { id },
            data,
            select: selectFields
        });
    },

    async delete(id: string): Promise<TaskObj>
    {
        log.info({ ID: id }, 'SQL - task: delete');

        return prisma.task.update(
        {
            where: { id },
            data: { active: false },
            select: selectFields
        });
    },

    async restore(id: string): Promise<TaskObj>
    {
        log.info({ ID: id }, 'SQL - task: restore');

        return prisma.task.update(
        {
            where: { id },
            data: { active: true },
            select: selectFields
        });
    },

    /* Check if Task belongs to same Organization as Profile  */
    async validateAdminTaskAccess(taskId: string, profileId: string): Promise<boolean>
    {
        log.info({ TaskId: taskId, ProfileId: profileId }, 'SQL - task: belongs-to-same-organization');

        const result = await prisma.task.findFirst({
            where: {
            id: taskId,
            active: true,
            organization: {
                profiles: {
                    some: {
                        id: profileId,
                        active: true,
                    },
                },
            },
            },
            select: {
            id: true,
            },
        });

        return !!result;  // true if found, false if not
    }
};
