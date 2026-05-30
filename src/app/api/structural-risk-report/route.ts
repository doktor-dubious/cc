// app/api/structural-risk-report/route.ts
// Persisted Structural Risk Profile report — one per organization.
// GET   loads the saved report for an org (null if never generated).
// POST  upserts a freshly generated report (overwrites any prior).
// PATCH saves Adapt-mode edits to an existing report.

import { log }                              from '@/lib/log';
import { NextRequest, NextResponse }        from 'next/server';
import { getServerSession }                 from '@/lib/auth';
import { structuralRiskReportRepository }   from '@/lib/database/structural-risk-report';
import type { StructuralRiskReportObj }     from '@/lib/database/structural-risk-report';
import type { ApiResponse }                 from '@/lib/types/api';

export async function GET(request: NextRequest)
{
    log.debug('API: structural-risk-report - GET');

    try
    {
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const organizationId = request.nextUrl.searchParams.get('organizationId');
        if (!organizationId)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'organizationId is required' }, { status: 400 });
        }

        const report = await structuralRiskReportRepository.findByOrgId(organizationId);

        return NextResponse.json<ApiResponse<StructuralRiskReportObj | null>>(
            { success: true, data: report },
            { status: 200 },
        );
    }
    catch (error)
    {
        const e = error as Error;
        log.error({ name: e?.name, message: e?.message, stack: e?.stack }, 'Error fetching structural risk report');
        return NextResponse.json<ApiResponse>({ success: false, error: e?.message || 'Failed to fetch report' }, { status: 500 });
    }
}

export async function POST(request: Request)
{
    log.debug('API: structural-risk-report - POST');

    try
    {
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { organizationId, report, sectionConfigs } = body;

        if (!organizationId || typeof organizationId !== 'string')
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'organizationId is required' }, { status: 400 });
        }

        if (!report || typeof report !== 'object')
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'report payload is required' }, { status: 400 });
        }

        if (!sectionConfigs || typeof sectionConfigs !== 'object')
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'sectionConfigs payload is required' }, { status: 400 });
        }

        const saved = await structuralRiskReportRepository.upsert({
            organizationId,
            report,
            sectionConfigs,
            generatedById : session.user.id,
        });

        log.info({ organizationId, id: saved.id }, 'Structural risk report upserted');

        return NextResponse.json<ApiResponse<StructuralRiskReportObj>>(
            { success: true, data: saved },
            { status: 200 },
        );
    }
    catch (error)
    {
        const e = error as Error;
        log.error({ name: e?.name, message: e?.message, stack: e?.stack }, 'Error saving structural risk report');
        return NextResponse.json<ApiResponse>({ success: false, error: e?.message || 'Failed to save report' }, { status: 500 });
    }
}

export async function PATCH(request: Request)
{
    log.debug('API: structural-risk-report - PATCH');

    try
    {
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { organizationId, report, sectionConfigs } = body;

        if (!organizationId || typeof organizationId !== 'string')
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'organizationId is required' }, { status: 400 });
        }

        if (!report || typeof report !== 'object')
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'report payload is required' }, { status: 400 });
        }

        if (!sectionConfigs || typeof sectionConfigs !== 'object')
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'sectionConfigs payload is required' }, { status: 400 });
        }

        const existing = await structuralRiskReportRepository.findByOrgId(organizationId);
        if (!existing)
        {
            return NextResponse.json<ApiResponse>({ success: false, error: 'Report not found' }, { status: 404 });
        }

        const saved = await structuralRiskReportRepository.updateAdaptations(organizationId, {
            report,
            sectionConfigs,
            lastEditedById : session.user.id,
        });

        log.info({ organizationId, id: saved.id }, 'Structural risk report adaptations saved');

        return NextResponse.json<ApiResponse<StructuralRiskReportObj>>(
            { success: true, data: saved },
            { status: 200 },
        );
    }
    catch (error)
    {
        const e = error as Error;
        log.error({ name: e?.name, message: e?.message, stack: e?.stack }, 'Error updating structural risk report');
        return NextResponse.json<ApiResponse>({ success: false, error: e?.message || 'Failed to update report' }, { status: 500 });
    }
}
