// ============================================================================
// src/app/api/settings/route.ts
// ============================================================================

import { log }                       from '@/lib/log';
import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify }                 from 'jose';
import { COOKIE_NAME }               from '@/constants';
import { settingsRepository }        from '@/lib/database/settings';

/**
 * GET /api/settings - Get active settings or all settings
 */
export async function GET(request: NextRequest) 
{
    log.debug('(::src/app/api/settings/route.ts::GET) (fetch)');

    try 
    {
        // Get JWT from cookie
        const token = request.cookies.get(COOKIE_NAME)?.value;
        if (!token) 
        {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify JWT
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);

        if (!process.env.JWT_SECRET) 
        {
            log.error('JWT_SECRET is not set');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const { payload } = await jwtVerify(token, secret);

        if (!payload.userId) 
        {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Check if requesting all settings (SUPER_ADMIN only)
        const { searchParams } = new URL(request.url);
        const all = searchParams.get('all') === 'true';

        if (all) 
        {
            // Only SUPER_ADMIN can view all settings
            if (payload.role !== 'SUPER_ADMIN') 
            {
                return NextResponse.json(
                    { error: 'You do not have permission to view all settings' },
                    { status: 403 }
                );
            }

            const settings = await settingsRepository.findAll();

            return NextResponse.json(
            {
                success: true,
                data: settings,
            });
        }

        // Get active settings (available to all authenticated users)
        const activeSettings = await settingsRepository.getActive();

        if (!activeSettings) 
        {
            return NextResponse.json(
                { success: false, message: 'No active settings found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
        {
            success: true,
            data: activeSettings,
        });
    } 
    catch (error) 
    {
        log.error({ error }, 'Error fetching settings');

        return NextResponse.json(
            { success: false, message: 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/settings - Create new settings (SUPER_ADMIN only)
 */
export async function POST(request: NextRequest) 
{
    log.debug('(::src/app/api/settings/route.ts::POST) (create)');

    try 
    {
        // Get JWT from cookie
        const token = request.cookies.get(COOKIE_NAME)?.value;
        if (!token) 
        {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify JWT
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        if (!process.env.JWT_SECRET) 
        {
            log.error('JWT_SECRET is not set');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const { payload } = await jwtVerify(token, secret);
        if (!payload.userId) 
        {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Only SUPER_ADMIN can create settings
        if (payload.role !== 'SUPER_ADMIN') 
        {
            return NextResponse.json(
                { error: 'You do not have permission to create settings' },
                { status: 403 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { uploadDirectory, downloadDirectory, artifactDirectory } = body;

        // Validate required fields
        if (!uploadDirectory || typeof uploadDirectory !== 'string') {
            return NextResponse.json(
                { success: false, message: 'uploadDirectory is required' },
                { status: 400 }
            );
        }

        if (!downloadDirectory || typeof downloadDirectory !== 'string') 
        {
            return NextResponse.json(
                { success: false, message: 'downloadDirectory is required' },
                { status: 400 }
            );
        }

        if (!artifactDirectory || typeof artifactDirectory !== 'string') 
        {
            return NextResponse.json(
                { success: false, message: 'artifactDirectory is required' },
                { status: 400 }
            );
        }

        // Create new settings (this will deactivate all others)
        const newSettings = await settingsRepository.create(
        {
            applicationName : uploadDirectory.trim(),
            homeDirectory   : downloadDirectory.trim(),
        });

        log.info({ settingsId: newSettings.id }, 'Settings created successfully');

        return NextResponse.json(
            {
                success: true,
                message: 'Settings created successfully',
                data: newSettings,
            },
            { status: 201 }
        );
    } 
    catch (error) 
    {
        console.error('Error creating settings:', error);
        log.error({ error }, 'Error creating settings');

        return NextResponse.json(
            { success: false, message: 'Failed to create settings' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/settings - Update active settings (SUPER_ADMIN only)
 */
export async function PATCH(request: NextRequest) 
{
    log.debug('(::src/app/api/settings/route.ts::PATCH) (update)');

    try 
    {
        // Get JWT from cookie
        const token = request.cookies.get(COOKIE_NAME)?.value;

        if (!token) 
        {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify JWT
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);

        if (!process.env.JWT_SECRET) 
        {
            log.error('JWT_SECRET is not set');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const { payload } = await jwtVerify(token, secret);

        if (!payload.userId) 
        {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Only SUPER_ADMIN can update settings
        if (payload.role !== 'SUPER_ADMIN') 
        {
            return NextResponse.json(
                { error: 'You do not have permission to update settings' },
                { status: 403 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { id, applicationName, homeDirectory } = body;

        // Validate ID
        if (!id || typeof id !== 'number') 
        {
            return NextResponse.json(
                { success: false, message: 'Settings ID is required' },
                { status: 400 }
            );
        }

        // Build update data
        const updateData: any = {};
        if (applicationName !== undefined) 
        {
            updateData.applicationName = applicationName.trim();
        }

        if (homeDirectory !== undefined) 
        {
            updateData.homeDirectory = homeDirectory.trim();
            updateData.homeDirectory = homeDirectory.replace(/\/+$/, '');
        }

        // Update settings
        const updatedSettings = await settingsRepository.update(id, updateData);

        log.info({ settingsId: updatedSettings.id }, 'Settings updated successfully');

        return NextResponse.json({
            success: true,
            message: 'Settings updated successfully',
            data: updatedSettings,
        });
    }
    catch (error: any) 
    {
        console.error('Error updating settings:', error);
        log.error({ error }, 'Error updating settings');

        if (error.message === 'Settings not found') 
        {
            return NextResponse.json(
                { success: false, message: 'Settings not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: false, message: 'Failed to update settings' },
            { status: 500 }
        );
    }
}