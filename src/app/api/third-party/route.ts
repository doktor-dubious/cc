import { log }                          from '@/lib/log';
import { NextRequest, NextResponse }    from 'next/server';
import { getServerSession }             from '@/lib/auth';
import { thirdPartyRepository }         from '@/lib/database/third-party';
import { canManageThirdParties }        from '@/lib/auth/permissions';
import type { ApiResponse }             from '@/lib/types/api';
import type { ThirdPartyCompanyObj }    from '@/lib/database/third-party';

export async function GET(request: NextRequest)
{
    log.debug('API: third-party - GET');

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

        const organizationId = request.nextUrl.searchParams.get('organizationId');
        if (!organizationId)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'organizationId is required' }, { status: 400 });
        }

        const companies = await thirdPartyRepository.findAllByOrgId(organizationId);

        return NextResponse.json<ApiResponse<ThirdPartyCompanyObj[]>>({ success: true, data: companies }, { status: 200 });
    }
    catch (error)
    {
        log.error({ error }, 'Error fetching third-party companies');
        return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to fetch companies' }, { status: 500 });
    }
}

export async function POST(request: Request)
{
    log.debug('API: third-party - POST');

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
        const { organizationId, name } = body;

        if (!organizationId || typeof organizationId !== 'string')
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'organizationId is required' }, { status: 400 });
        }

        if (!name || typeof name !== 'string' || name.trim() === '')
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'name is required' }, { status: 400 });
        }

        const company = await thirdPartyRepository.create({ ...body, name: name.trim() });

        log.info({ id: company.id }, 'Third-party company created');

        return NextResponse.json<ApiResponse<ThirdPartyCompanyObj>>({ success: true, data: company }, { status: 201 });
    }
    catch (error)
    {
        log.error({ error }, 'Error creating third-party company');
        return NextResponse.json<ApiResponse>({ success: false, error: 'Failed to create company' }, { status: 500 });
    }
}
