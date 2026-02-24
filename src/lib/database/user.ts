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
import type { User, UserRole, WorkFunction } from '@prisma/client';

type SafeUser =
{
    id              : string;
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
    async findById(id: string): Promise<SafeUser | null>
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

    async updateProfile(id: string, data: { name: string; nickname: string; workFunction?: WorkFunction }): Promise<SafeUser>
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
    },

    async findAll(): Promise<SafeUser[]>
    {
        log.info('SQL - user: findAll');

        return prisma.user.findMany({
            where   : { active: true },
            select  : selectFields,
            orderBy : { name: 'asc' }
        });
    },

    async update(id: string, data: {
        name         : string;
        nickname     : string;
        email        : string;
        role         : UserRole;
        passwordHash?: string;
    }): Promise<SafeUser>
    {
        log.info({ ID: id, name: data.name }, 'SQL - user: update');

        const updateData: Record<string, unknown> = {
            name     : data.name,
            nickname : data.nickname,
            email    : data.email,
            role     : data.role,
        };
        if (data.passwordHash) {
            updateData.passwordHash = data.passwordHash;
        }
        return prisma.user.update({
            where  : { id },
            data   : updateData,
            select : selectFields
        });
    },

    async softDelete(id: string): Promise<SafeUser>
    {
        log.info({ id }, 'SQL - user: softDelete');

        return prisma.user.update({
            where  : { id },
            data   : { active: false },
            select : selectFields
        });
    },

    async createWithRole(data: {
        email        : string;
        passwordHash : string;
        name         : string;
        nickname     : string;
        workFunction : WorkFunction;
        role         : UserRole;
    }): Promise<SafeUser>
    {
        log.info({ email: data.email, name: data.name, role: data.role }, 'SQL - user: createWithRole');

        return prisma.user.create({ data, select: selectFields });
    }
};
