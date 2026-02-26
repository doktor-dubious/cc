// app/api/safeguard-ig/route.ts
import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { prisma }                       from '@/lib/prisma';
import { getServerSession }             from '@/lib/auth';

// GET: Fetch all safeguard IG overrides for an organization
export async function GET(request: NextRequest) {
  log.debug('API: safeguard-ig GET');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Fetch all safeguard IG overrides for the organization
    const overrides = await prisma.organizationSafeguardIg.findMany({
      where: {
        organizationId: organizationId,
      },
      select: {
        safeguardId: true,
        ig: true,
      },
    });

    // Convert to a map for easy lookup
    const overridesMap: Record<string, number> = {};
    for (const override of overrides) {
      overridesMap[override.safeguardId] = override.ig;
    }

    return NextResponse.json({
      success: true,
      data: overridesMap,
    });
  } catch (error: unknown) {
    log.error({ error }, 'Error fetching safeguard IG overrides');
    return NextResponse.json({ success: false, message: 'Failed to fetch safeguard IG overrides' }, { status: 500 });
  }
}

// POST: Set or update safeguard IG override for an organization
export async function POST(request: NextRequest) {
  log.debug('API: safeguard-ig POST');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, safeguardId, ig } = body;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!safeguardId) {
      return NextResponse.json(
        { success: false, message: 'safeguardId is required' },
        { status: 400 }
      );
    }

    if (ig === undefined || ig === null || ![1, 2, 3].includes(ig)) {
      return NextResponse.json(
        { success: false, message: 'ig must be 1, 2, or 3' },
        { status: 400 }
      );
    }

    // Upsert the override
    const override = await prisma.organizationSafeguardIg.upsert({
      where: {
        organizationId_safeguardId: {
          organizationId,
          safeguardId,
        },
      },
      update: {
        ig,
      },
      create: {
        organizationId,
        safeguardId,
        ig,
      },
    });

    log.info({ organizationId, safeguardId, ig }, 'Safeguard IG override set');

    return NextResponse.json({
      success: true,
      message: 'Safeguard IG override saved',
      data: override,
    });
  } catch (error: unknown) {
    log.error({ error }, 'Error setting safeguard IG override');
    return NextResponse.json({ success: false, message: 'Failed to set safeguard IG override' }, { status: 500 });
  }
}

// DELETE: Remove safeguard IG override (revert to organization default)
export async function DELETE(request: NextRequest) {
  log.debug('API: safeguard-ig DELETE');

  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, safeguardId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, message: 'organizationId is required' },
        { status: 400 }
      );
    }

    if (!safeguardId) {
      return NextResponse.json(
        { success: false, message: 'safeguardId is required' },
        { status: 400 }
      );
    }

    await prisma.organizationSafeguardIg.delete({
      where: {
        organizationId_safeguardId: {
          organizationId,
          safeguardId,
        },
      },
    });

    log.info({ organizationId, safeguardId }, 'Safeguard IG override removed');

    return NextResponse.json({ success: true, message: 'Safeguard IG override removed' });
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    log.error({ error }, 'Error removing safeguard IG override');
    if (prismaError.code === 'P2025') {
      return NextResponse.json({ success: false, message: 'Override not found' }, { status: 404 });
    }
    return NextResponse.json({ success: false, message: 'Failed to remove safeguard IG override' }, { status: 500 });
  }
}
