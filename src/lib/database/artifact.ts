// lib/database/artifact.ts

import { log }                  from '@/lib/log';
import { prisma }               from '@/lib/prisma';
import type { ArtifactType }    from '@prisma/client';

export type ArtifactData =
{
    id              : string;
    name            : string;
    description     : string | null;
    type            : ArtifactType;
    mimeType        : string | null;
    extension       : string | null;
    size            : string | null;
    originalName    : string | null;
    organizationId  : string;
};

type ArtifactWithRelations = ArtifactData &
{
    taskArtifacts: Array<
    {
        task:
        {
            id          : string;
            name        : string;
            description : string | null;
            status      : string;
        };
    }>;
};

const selectFields = 
{
    id              : true,
    name            : true,
    description     : true,
    type            : true,
    mimeType        : true,
    extension       : true,
    size            : true,
    originalName    : true,
    organizationId  : true,
} as const;

const selectFieldsWithRelations = 
{
    id              : true,
    name            : true,
    description     : true,
    type            : true,
    mimeType        : true,
    extension       : true,
    size            : true,
    originalName    : true,
    organizationId  : true,
    taskArtifacts   : 
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

export const artifactRepository = 
{
    async findById(id: string): Promise<ArtifactData | null>
    {
        log.info('SQL - artifact: findById');

        return prisma.artifact.findUnique(
        {
            where   : { id, active: true },
            select  : selectFields
        });
    },

    async findAll(): Promise<ArtifactData[]>
    {
        log.info('SQL - artifact: findAll');

        return prisma.artifact.findMany(
        {
            where   : { active: true },
            select  : selectFields,
            orderBy : { id: 'asc' }
        });
    },

    async findByOrganizationId(organizationId: string): Promise<ArtifactWithRelations[]>
    {
        log.info('SQL - artifact: findByOrganizationId');

        try
        {
            return prisma.artifact.findMany(
            {
                where:
                {
                    organizationId,
                    active: true,
                },
                select: selectFieldsWithRelations,
                orderBy: { id: 'asc' },
            });
        }
        catch (error)
        {
            log.error({ error, organizationId }, 'Failed to fetch artifacts by organization');
            throw new Error('Database error while fetching artifacts');
        }
    },

    async create(data:
    {
        name            : string;
        description?    : string;
        organizationId  : string;
        type            : ArtifactType;
    }): Promise<ArtifactWithRelations> 
    {
        log.info({ organizationId: data.organizationId, name: data.name }, 'SQL - artifact: create');

        // Create with placeholder values for required fields
        const created = await prisma.artifact.create(
        {
            data: 
            {
                name            : data.name,
                description     : data.description,
                organizationId  : data.organizationId,
                type            : data.type,
                mimeType        : 'application/octet-stream',
                extension       : '.bin',
                size            : '0',
            }
        });

        // Fetch with relations
        const artifact = await prisma.artifact.findUnique(
        {
            where   : { id: created.id },
            select  : selectFieldsWithRelations
        });

        if (!artifact) {
            throw new Error('Failed to fetch created artifact');
        }

        return artifact as ArtifactWithRelations;
    },

    async createWithFileDetails(data:
    {
        organizationId  : string;
        name            : string;
        description?    : string;
        type            : ArtifactType;
        mimeType        : string;
        extension       : string;
        size            : string | null;
        originalName    : string;
    }): Promise<ArtifactWithRelations> 
    {
        log.info({ organizationId: data.organizationId, name: data.name }, 'SQL - artifact: createWithFileDetails');

        const created = await prisma.artifact.create(
        {
            data: 
            {
                organizationId  : data.organizationId,
                name            : data.name,
                description     : data.description,
                type            : data.type,
                mimeType        : data.mimeType,
                extension       : data.extension,
                size            : data.size,
                originalName    : data.originalName
            }
        });

        // Fetch with relations
        const artifact = await prisma.artifact.findUnique(
        {
            where   : { id: created.id },
            select  : selectFieldsWithRelations
        });

        if (!artifact) {
            throw new Error('Failed to fetch created artifact');
        }

        return artifact as ArtifactWithRelations;
    },

    async update(
        id      : string,
        data    : 
        {
            name?           : string;
            description?    : string;
            type?           : ArtifactType;
            mimeType?       : string;
        }
    ): Promise<ArtifactWithRelations | null> 
    {
        log.info({ id: id, name: data.name }, 'SQL - artifact: update');

        const existing = await this.findById(id);

        if (!existing) 
        {
            return null;
        }

        await prisma.artifact.update(
        {
            where: { id },
            data,
        });

        // Fetch updated artifact with relations
        const artifact = await prisma.artifact.findUnique(
        {
            where   : { id },
            select  : selectFieldsWithRelations
        });

        return artifact as ArtifactWithRelations;
    },

    async delete(id: string): Promise<ArtifactData> 
    {
        log.info({ id: id }, 'SQL - artifact: delete');

        return prisma.artifact.update(
        {
            where   : { id },
            data    : { active: false },
            select  : selectFields
        });
    },
};