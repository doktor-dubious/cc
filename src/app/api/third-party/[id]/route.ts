import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { getServerSession }             from '@/lib/auth';
import { thirdPartyRepository }         from '@/lib/database/third-party';
import { canManageThirdParties }        from '@/lib/auth/permissions';
import type { ApiResponse }             from '@/lib/types/api';
import type { ThirdPartyCompanyObj }    from '@/lib/database/third-party';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
)
{
    const { id } = await params;
    log.debug({ id }, 'API: third-party - GET by id');

    try
    {
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { role } = session.user;

        if (!canManageThirdParties(role))
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const company = await thirdPartyRepository.findById(id);
        if (!company)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json<ApiResponse<ThirdPartyCompanyObj>>({ success: true, data: company }, { status: 200 });
    }
    catch (error)
    {
        log.error({ error, id }, 'Error fetching third-party company');
        return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to fetch company' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
)
{
    const { id } = await params;
    log.debug({ id }, 'API: third-party - PATCH');

    try
    {
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { role } = session.user;

        if (!canManageThirdParties(role))
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();

        // Remove non-update fields
        const { organizationId: _orgId, id: _id, seq: _seq, createdAt: _ca, updatedAt: _ua, active: _active, ...updateData } = body;

        const company = await thirdPartyRepository.update(id, updateData);

        return NextResponse.json<ApiResponse<ThirdPartyCompanyObj>>({ success: true, data: company }, { status: 200 });
    }
    catch (error)
    {
        log.error({ error, id }, 'Error updating third-party company');
        return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to update company' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
)
{
    const { id } = await params;
    log.debug({ id }, 'API: third-party - DELETE');

    try
    {
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { role } = session.user;

        if (!canManageThirdParties(role))
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        await thirdPartyRepository.delete(id);

        log.info({ id }, 'Third-party company deleted');

        return NextResponse.json<ApiResponse>({ success: true }, { status: 200 });
    }
    catch (error)
    {
        log.error({ error, id }, 'Error deleting third-party company');
        return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to delete company' }, { status: 500 });
    }
}
