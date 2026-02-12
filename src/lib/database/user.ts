/*
model User {
    id                  Int       @id(map: "user_pkey") @default(autoincrement())
    email               String    @unique(map: "user_email_key") @db.VarChar(255)
    role                UserRole  @default(USER)
    name                String    @db.VarChar(100)
    nickname            String?   @db.VarChar(50)
    workFunction        WorkFunction?                                                     @map("work_function")
    passwordHash        String    @db.VarChar(255)                                        @map("password_hash")
    active              Boolean   @default(true)
    createdAt           DateTime  @default(now()) @db.Timestamptz(3)                      @map("created_at")
    updatedAt           DateTime  @updatedAt      @db.Timestamptz(3)                      @map("updated_at")

    @@map("login")
}
*/

import { log } from '@/lib/log';
import { prisma } from '@/lib/prisma';
import type { /* User???,*/ UserRole, WorkFunction } from '@prisma/client';

type SafeUser =
{
    id              : number;
    email           : string;
    name            : string;
    nickname        : string;
    role            : UserRole;
    workFunction    : WorkFunction;
};

const selectFields =
{
    id              : true,
    email           : true,
    name            : true,
    nickname        : true,
    role            : true,
    workFunction    : true,
} as const;

export const userRepository =
{
    async findById(id: number): Promise<SafeUser | null>
    {
        log.info('SQL - user: findById');

        return prisma.user.findUnique(
        {
            where: { id, active : true },
            select: selectFields
        });
    },

    async findByEmail(email: string): Promise<SafeUser | null>
    {
        log.info('SQL - user: findByEmail');

        return prisma.user.findUnique(
        {
            where: { email, active : true },
            select: selectFields
        });
    },

    async findByEmailWithPassword(email: string): Promise<Pick<User, 'id' | 'email' | 'passwordHash' | 'role' | 'name'> | null>
    {
        log.info('SQL - user: findByEmailWithPassword');

        log.info({ email: email }, 'Fetching user for login');

        return prisma.user.findUnique(
        {
            where   : { email, active : true },
            select  : {
                id           : true,
                email        : true,
                passwordHash : true,
                role         : true,
                name         : true,
                profile: {
                    select: { id: true },  // ← at minimum
                },
            }
        });
    },

    async updateProfile(id: number, data: { name: string; nickname: string; workFunction?: WorkFunction }): Promise<SafeUser>
    {
        log.info({ ID: id, name: data.name }, 'SQL - user: updateProfile');

        return prisma.user.update(
        {
            where: { id },
            data,
            select: selectFields
        });
    },

    async create(data: { email: string; passwordHash: string; name: string; nickname: string; workFunction: WorkFunction }): Promise<SafeUser>
    {
        log.info({ email: data.email, name: data.name }, 'SQL - user: create');

        return prisma.user.create({ data, select: selectFields });
    }
};
