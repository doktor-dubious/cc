/*
model Event {
    id                  Int       @id(map: "event_pkey") @default(autoincrement())
    message             String    @db.Text
    userId              Int?                                                              @map("user_id")
    organizationId      Int?                                                              @map("organization_id")
    taskId              Int?                                                              @map("task_id")
    profileId           Int?                                                              @map("profile_id")
    artifactId          Int?                                                              @map("artifact_id")
    active              Boolean   @default(true)
    createdAt           DateTime  @default(now()) @db.Timestamptz(3)                      @map("created_at")
    updatedAt           DateTime  @updatedAt      @db.Timestamptz(3)                      @map("updated_at")

    user                User?         @relation(fields: [userId], references: [id], onDelete: SetNull)
    organization        Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
    task                Task?         @relation(fields: [taskId], references: [id], onDelete: Cascade)
    profile             Profile?      @relation(fields: [profileId], references: [id], onDelete: Cascade)
    artifact            Artifact?     @relation(fields: [artifactId], references: [id], onDelete: Cascade)

    @@index([userId])
    @@index([organizationId])
    @@index([taskId])
    @@index([profileId])
    @@index([artifactId])
    @@index([createdAt])
    @@map("event")
}
*/

import { log }     from '@/lib/log';
import { Prisma }  from '@prisma/client';
import { prisma }  from '@/lib/prisma';

const selectFields =
{
    id              : true,
    message         : true,
    importance      : true,
    userId          : true,
    organizationId  : true,
    taskId          : true,
    profileId       : true,
    artifactId      : true,
    active          : true,
    createdAt       : true,
    updatedAt       : true,
    user:
    {
        select:
        {
            id      : true,
            name    : true,
            email   : true,
        },
    },
} as const;

export type EventObj = Prisma.EventGetPayload<{
  select: typeof selectFields;
}>;

export const eventRepository =
{
    async findById(id: number): Promise<EventObj | null>
    {
        log.info('SQL - event: findById');

        return prisma.event.findUnique(
        {
            where: { id, active: true },
            select: selectFields
        });
    },

    async findAll(): Promise<EventObj[]>
    {
        log.info('SQL - event: findAll');

        return prisma.event.findMany(
        {
            where: { active: true },
            select: selectFields,
            orderBy: { createdAt: 'desc' }
        });
    },

    async findByTaskId(taskId: number): Promise<EventObj[]>
    {
        log.info({ taskId }, 'SQL - event: findByTaskId');

        return prisma.event.findMany(
        {
            where:
            {
                taskId,
                active: true,
            },
            select: selectFields,
            orderBy: { createdAt: 'desc' },
        });
    },

    async findByOrganizationId(organizationId: number): Promise<EventObj[]>
    {
        log.info({ organizationId }, 'SQL - event: findByOrganizationId');

        return prisma.event.findMany(
        {
            where:
            {
                organizationId,
                active: true,
            },
            select: selectFields,
            orderBy: { createdAt: 'desc' },
        });
    },

    async findByProfileId(profileId: number): Promise<EventObj[]>
    {
        log.info({ profileId }, 'SQL - event: findByProfileId');

        return prisma.event.findMany(
        {
            where:
            {
                profileId,
                active: true,
            },
            select: selectFields,
            orderBy: { createdAt: 'desc' },
        });
    },

    async findByArtifactId(artifactId: number): Promise<EventObj[]>
    {
        log.info({ artifactId }, 'SQL - event: findByArtifactId');

        return prisma.event.findMany(
        {
            where:
            {
                artifactId,
                active: true,
            },
            select: selectFields,
            orderBy: { createdAt: 'desc' },
        });
    },

    async create(data:
    {
        message         : string;
        importance?     : 'LOW' | 'MIDDLE' | 'HIGH';
        userId?         : number;
        organizationId? : number;
        taskId?         : number;
        profileId?      : number;
        artifactId?     : number;
    }): Promise<EventObj>
    {
        log.info({ message: data.message }, 'SQL - event: create');

        return prisma.event.create({
            data,
            select: selectFields
        });
    },

    async delete(id: number): Promise<EventObj>
    {
        log.info({ ID: id }, 'SQL - event: delete');

        return prisma.event.update(
        {
            where: { id },
            data: { active: false },
            select: selectFields
        });
    },
};
