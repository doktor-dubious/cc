// app/api/client-exposure-report/route.ts
// Persisted Client Exposure (CES) report — one per ThirdPartyCompany.
// GET   loads the saved report for a third-party (null if never generated).
// POST  upserts a freshly generated report (overwrites any prior).
// PATCH saves Adapt-mode edits to an existing report.

import { log }                              from '@/lib/log';
import { NextRequest, NextResponse }        from 'next/server';
import { getServerSession }                 from '@/lib/auth';
import { clientExposureReportRepository }   from '@/lib/database/client-exposure-report';
import type { ClientExposureReportObj }     from '@/lib/database/client-exposure-report';
import type { ApiResponse }                 from '@/lib/types/api';

export async function GET(request: NextRequest)
{
    log.debug('API: client-exposure-report - GET');

    try
    {
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const thirdPartyCompanyId = request.nextUrl.searchParams.get('thirdPartyCompanyId');
        if (!thirdPartyCompanyId)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'thirdPartyCompanyId is required' }, { status: 400 });
        }

        const report = await clientExposureReportRepository.findByThirdPartyId(thirdPartyCompanyId);

        return NextResponse.json<ApiResponse<ClientExposureReportObj | null>>(
            { success: true, data: report },
            { status: 200 },
        );
    }
    catch (error)
    {
        const e = error as Error;
        log.error({ name: e?.name, message: e?.message, stack: e?.stack }, 'Error fetching client exposure report');
        return NextResponse.json<ApiResponse>({ success: false, error: e?.message || 'Failed to fetch report' }, { status: 500 });
    }
}

export async function POST(request: Request)
{
    log.debug('API: client-exposure-report - POST');

    try
    {
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { thirdPartyCompanyId, report, sectionConfigs } = body;

        if (!thirdPartyCompanyId || typeof thirdPartyCompanyId !== 'string')
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'thirdPartyCompanyId is required' }, { status: 400 });
        }

        if (!report || typeof report !== 'object')
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'report payload is required' }, { status: 400 });
        }

        if (!sectionConfigs || typeof sectionConfigs !== 'object')
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'sectionConfigs payload is required' }, { status: 400 });
        }

        const saved = await clientExposureReportRepository.upsert({
            thirdPartyCompanyId,
            report,
            sectionConfigs,
            generatedById : session.user.id,
        });

        log.info({ thirdPartyCompanyId, id: saved.id }, 'Client exposure report upserted');

        return NextResponse.json<ApiResponse<ClientExposureReportObj>>(
            { success: true, data: saved },
            { status: 200 },
        );
    }
    catch (error)
    {
        const e = error as Error;
        log.error({ name: e?.name, message: e?.message, stack: e?.stack }, 'Error saving client exposure report');
        return NextResponse.json<ApiResponse>({ success: false, error: e?.message || 'Failed to save report' }, { status: 500 });
    }
}

export async function PATCH(request: Request)
{
    log.debug('API: client-exposure-report - PATCH');

    try
    {
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { thirdPartyCompanyId, report, sectionConfigs } = body;

        if (!thirdPartyCompanyId || typeof thirdPartyCompanyId !== 'string')
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'thirdPartyCompanyId is required' }, { status: 400 });
        }

        if (!report || typeof report !== 'object')
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'report payload is required' }, { status: 400 });
        }

        if (!sectionConfigs || typeof sectionConfigs !== 'object')
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'sectionConfigs payload is required' }, { status: 400 });
        }

        const existing = await clientExposureReportRepository.findByThirdPartyId(thirdPartyCompanyId);
        if (!existing)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Report not found' }, { status: 404 });
        }

        const saved = await clientExposureReportRepository.updateAdaptations(thirdPartyCompanyId, {
            report,
            sectionConfigs,
            lastEditedById : session.user.id,
        });

        log.info({ thirdPartyCompanyId, id: saved.id }, 'Client exposure report adaptations saved');

        return NextResponse.json<ApiResponse<ClientExposureReportObj>>(
            { success: true, data: saved },
            { status: 200 },
        );
    }
    catch (error)
    {
        const e = error as Error;
        log.error({ name: e?.name, message: e?.message, stack: e?.stack }, 'Error updating client exposure report');
        return NextResponse.json<ApiResponse>({ success: false, error: e?.message || 'Failed to update report' }, { status: 500 });
    }
}
