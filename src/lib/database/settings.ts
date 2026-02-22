// ============================================================================
// lib/database/settings.ts
// ============================================================================

import { log }      from '@/lib/log';
import { prisma }   from '@/lib/prisma';

export type SettingsData =
{
    id                  : string;
    applicationName     : string;
    homeDirectory       : string;
    pollingInterval     : number;
};

const selectFields =
{
    id                  : true,
    applicationName     : true,
    homeDirectory       : true,
    pollingInterval     : true,
} as const;

export const settingsRepository = 
{
    /**
     * Get the currently active settings (there should only be one)
     */
    async getActive(): Promise<SettingsData | null> 
    {
        return prisma.settings.findFirst(
        {
            where   : { active: true },
            select  : selectFields,
        });
    },

    /**
     * Get settings by ID
     */
    async findById(id: string): Promise<SettingsData | null> 
    {
        return prisma.settings.findUnique(
        {
            where   : { id },
            select  : selectFields,
        });
    },

    /**
     * Get all settings (including inactive)
     */
    async findAll(): Promise<SettingsData[]> 
    {
        return prisma.settings.findMany(
        {
            select  : selectFields,
            orderBy : { createdAt: 'desc' },
        });
    },

    /**
     * Create new settings and deactivate all others
     */
    async create(data:
    {
        applicationName     : string;
        homeDirectory       : string;
        pollingInterval?    : number;
    }): Promise<SettingsData> 
    {
        log.info({ data }, 'Creating new settings');

        return prisma.$transaction(async (tx) => 
        {
            // Deactivate all existing settings
            await tx.settings.updateMany(
            {
                where   : { active: true },
                data    : { active: false },
            });

            // Create new active settings
            return tx.settings.create(
            {
                data: 
                {
                    ...data,
                    active: true,
                },
                select: selectFields,
            });
        });
    },

    /**
     * Update settings by ID and make it active (deactivating others)
     */
    async update(
        id: string,
        data:
        {
            applicationName?    : string;
            homeDirectory?      : string;
            pollingInterval?    : number;
        }
    ): Promise<SettingsData> 
    {
        log.info({ id, data }, 'Updating settings');

        return prisma.$transaction(async (tx) => 
        {
            // Check if settings exist
            const existing = await tx.settings.findUnique(
            {
                where: { id },
            });

            if (!existing) 
            {
                throw new Error('Settings not found');
            }

            // Deactivate all other settings
            await tx.settings.updateMany(
            {
                where: 
                { 
                    active: true,
                    id: { not: id }
                },
                data: { active: false },
            });

            // Update and activate this settings
            return tx.settings.update(
            {
                where   : { id },
                data    : {
                    ...data,
                    active: true,
                },
                select  : selectFields,
            });
        });
    },

    /**
     * Activate a specific settings record (deactivating all others)
     */
    async activate(id: string): Promise<SettingsData> 
    {
        log.info({ id }, 'Activating settings');

        return prisma.$transaction(async (tx) => 
        {
            // Check if settings exist
            const existing = await tx.settings.findUnique(
            {
                where: { id },
            });

            if (!existing) 
            {
                throw new Error('Settings not found');
            }

            // Deactivate all settings
            await tx.settings.updateMany(
            {
                where   : { active: true },
                data    : { active: false },
            });

            // Activate this settings
            return tx.settings.update(
            {
                where   : { id },
                data    : { active: true },
                select  : selectFields,
            });
        });
    },

    /**
     * Delete settings (soft delete by deactivating)
     */
    async delete(id: string): Promise<SettingsData> 
    {
        log.info({ id }, 'Deleting settings');

        return prisma.settings.update(
        {
            where   : { id },
            data    : { active: false },
            select  : selectFields,
        });
    },
};
