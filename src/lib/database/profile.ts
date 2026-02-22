/*
model Profile {
    id                  Int       @id(map: "profile_pkey") @default(autoincrement())
    organizationId      Int?                                                               @map("organization_id")
    userId              Int       @unique                                                 @map("user_id")
    name                String
    description         String?
    active              Boolean   @default(true)
    createdAt           DateTime  @default(now()) @db.Timestamptz(3)                      @map("created_at")
    updatedAt           DateTime  @updatedAt      @db.Timestamptz(3)                      @map("updated_at")

    user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
    organization        Organization?  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
    taskProfiles        TaskProfile[]

    @@index([organizationId])
    @@index([userId])

    @@map("profile")
}
*/

import { log }                          from '@/lib/log';
import { Prisma }                       from '@prisma/client';
import { prisma }                       from '@/lib/prisma';
import type { WorkFunction, UserRole }  from '@prisma/client';

const selectFields =
{
    id              : true,
    name            : true,
    description     : true,
    organizationId  : true,
    userId          : true,
} as const;

const selectFieldsWithRelations = 
{
    id              : true,
    name            : true,
    description     : true,
    organizationId  : true,
    userId          : true,
    active          : true,
    createdAt       : true,
    updatedAt       : true,
    user: 
    {
        select: 
        {
            id              : true,
            email           : true,
            name            : true,
            nickname        : true,
            workFunction    : true,
            role            : true,
        }
    },

    organization: 
    {
        select: 
        {
            id              : true,
            name            : true,
            description     : true,
        }
    },

    taskProfiles: 
    {
        select: 
        {
            task: 
            {
                select: 
                {
                    id          : true,
                    name        : true,
                    description : true,
                    status      : true,
                }
            }
        }
    }
} as const;

export type ProfileData = Prisma.ProfileGetPayload<{
  select: typeof selectFields;
}>;

export type ProfileWithRelations = Prisma.ProfileGetPayload<{
  select: typeof selectFieldsWithRelations;
}>;

export const profileRepository =
{
    async findById(id: string): Promise<ProfileData | null>
    {
        log.info('SQL - profile: findById');

        return prisma.profile.findUnique(
        {
            where: { id, active : true },
            select: selectFields
        });
    },

    async findAll(): Promise<ProfileData[]>
    {
        log.info('SQL - profile: findAll');

        return prisma.profile.findMany(
        {
            where   : { active: true },
            select  : selectFields,
            orderBy : { id: 'asc' }
        });
    },

    async findByOrganizationId(organizationId: string): Promise<ProfileWithRelations[]>
    {
        log.info('SQL - profile: findByOrganizationId');

        if (!organizationId)
        {
            log.warn({ organizationId }, 'Invalid organizationId provided');
            return [];
        }

        return prisma.profile.findMany(
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

    async create(data:
    {
        name            : string;
        description?    : string;
        organizationId  : string;
        user            :
            {
                email           : string;
                name            : string;
                nickname        : string;
                passwordHash    : string;
                workFunction    : WorkFunction;
                role            : UserRole;
            };
    }): Promise<ProfileWithRelations> 
    {
        log.info({ name: data.name, organizationId: data.organizationId }, 'SQL - profile: create');
        
        const existingUser = await prisma.user.findUnique(
        {
            where: { email: data.user.email }
        });

        if (existingUser) 
        {
            throw new Error('A user with this email already exists');
        }

        const profile = await prisma.$transaction(async (tx) => 
        {
            // First create the user
            const createdUser = await tx.user.create(
            {
                data: 
                {
                    email           : data.user.email,
                    name            : data.user.name,
                    nickname        : data.user.nickname,
                    passwordHash    : data.user.passwordHash,
                    workFunction    : data.user.workFunction,
                    role            : data.user.role,
                }
            });

            // Then create the profile with the user's ID
            const createdProfile = await tx.profile.create(
            {
                data: 
                {
                    name            : data.name,
                    description     : data.description,
                    organizationId  : data.organizationId,
                    userId          : createdUser.id,
                }
            });

            // Fetch the full profile with relations
            const fullProfile = await tx.profile.findUnique(
            {
                where               : { id: createdProfile.id },
                select              : selectFieldsWithRelations
            });

            return fullProfile;
        });

        if (!profile) 
        {
            throw new Error('Failed to fetch created profile');
        }

        return profile as ProfileWithRelations;
    },

    async update(
        id              : string,
        profileData     : Prisma.ProfileUpdateInput,
        userData?       : Prisma.UserUpdateInput
    ): Promise<ProfileWithRelations | null> 
    {
        log.info({ ID: id }, 'SQL - profile: update');

        const existing = await this.findById(id);
        if (!existing)
        {
            return null;
        }

        const updateData: Prisma.ProfileUpdateInput = { ...profileData };

        // Nest user update if provided
        if (userData && Object.keys(userData).length > 0)
        {
            updateData.user = { update: userData };
        }

        // Optional safety: prevent empty update
        if (Object.keys(updateData).length === 0)
        {
            log.warn({ ID: id }, 'No fields to update in profile');
            return existing as ProfileWithRelations;
        }

        return prisma.profile.update(
        {
            where: { id },
            data: updateData,
            select: selectFieldsWithRelations
        });
    },

    async delete(id: string): Promise<ProfileData>
    {
        log.info({ ID: id }, 'SQL - profile: delete');
        
        return prisma.profile.update(
        {
            where: { id },
            data: { active: false },
            select: selectFields
        });
    },

    /* Check if Profile with Organization ID exists */
    async existsWithOrganizationId(profileId: string, organizationId: string): Promise<boolean>
    {
        log.info({ ProfileID: profileId, OrganizationId: organizationId }, 'SQL - profile: exists-organisation');
        
        const exists = await prisma.profile.findFirst({
                    where: {
                    id: profileId,
                    organizationId: organizationId,
                    active: true,
                    },
                    select: { id: true }, // minimal select — we only need to know if it exists
                });

        return !!exists; // true if found, false if not
    }    
};
