// app/api/gap-recommendation/route.ts
// API for generating and implementing CIS Controls gap recommendations

import { log }                       from '@/lib/log';
import { NextResponse }              from 'next/server';
import { getServerSession }          from '@/lib/auth';
import { prisma }                    from '@/lib/prisma';
import type { ApiResponse }          from '@/lib/types/api';
import { generateGapRecommendation, type OrganizationProfile } from '@/lib/gap-analysis/recommendation-engine';

// ────────────────────────────────────────────────────────────────────────────────
// GET - Generate gap recommendation for an organization
// ────────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  log.debug('(API : gap-recommendation - GET)');

  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Fetch organization with all taxonomy/classification fields
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        ig: true,
        size: true,
        naceSection: true,
        riskProfile: true,
        geographicScope: true,
        digitalMaturity: true,
        itSecurityStaff: true,
        securityMaturity: true,
        dataSensitivity: true,
        regulatoryObligations: true,
        itEndpointRange: true,
        infrastructureTypes: true,
        softwareDevelopment: true,
        publicFacingServices: true,
        targetedAttackLikelihood: true,
        downtimeTolerance: true,
        supplyChainPosition: true,
        securityBudgetRange: true,
      },
    });

    if (!organization) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Build organization profile for recommendation engine
    const profile: OrganizationProfile = {
      size: organization.size,
      ig: organization.ig,
      naceSection: organization.naceSection,
      riskProfile: organization.riskProfile,
      geographicScope: organization.geographicScope,
      digitalMaturity: organization.digitalMaturity,
      itSecurityStaff: organization.itSecurityStaff,
      securityMaturity: organization.securityMaturity,
      dataSensitivity: organization.dataSensitivity,
      regulatoryObligations: organization.regulatoryObligations,
      itEndpointRange: organization.itEndpointRange,
      infrastructureTypes: organization.infrastructureTypes,
      softwareDevelopment: organization.softwareDevelopment,
      publicFacingServices: organization.publicFacingServices,
      targetedAttackLikelihood: organization.targetedAttackLikelihood,
      downtimeTolerance: organization.downtimeTolerance,
      supplyChainPosition: organization.supplyChainPosition,
      securityBudgetRange: organization.securityBudgetRange,
    };

    // Generate recommendations
    const recommendation = generateGapRecommendation(profile);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        organizationId,
        organizationName: organization.name,
        recommendation,
      },
    });
  } catch (error: any) {
    log.error(error, '(API : gap-recommendation - GET) Error');
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────────
// POST - Implement gap recommendations (apply to organization)
// ────────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  log.debug('(API : gap-recommendation - POST)');

  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      organizationId,
      recommendedIg,
      inactiveControlIds,
      inactiveSafeguardIds,
    } = body;

    if (!organizationId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Start transaction to apply all changes
    await prisma.$transaction(async (tx) => {
      // 1. Update organization's target IG if provided
      if (recommendedIg !== undefined && recommendedIg !== organization.ig) {
        await tx.organization.update({
          where: { id: organizationId },
          data: { ig: recommendedIg },
        });
      }

      // 2. Update inactive controls
      if (Array.isArray(inactiveControlIds)) {
        // First, delete all existing control records for this org
        await tx.organizationCisControl.deleteMany({
          where: { organizationId },
        });

        // Create records for inactive controls (active=false)
        // We only need to store inactive ones; active is the default
        for (const controlId of inactiveControlIds) {
          await tx.organizationCisControl.create({
            data: {
              organizationId,
              controlId: parseInt(controlId, 10),
              active: false,
            },
          });
        }
      }

      // 3. Update inactive safeguards
      if (Array.isArray(inactiveSafeguardIds)) {
        // First, delete all existing inactive safeguard records for this org
        await tx.organizationInactiveSafeguard.deleteMany({
          where: { organizationId },
        });

        // Create records for inactive safeguards
        for (const safeguardId of inactiveSafeguardIds) {
          await tx.organizationInactiveSafeguard.create({
            data: {
              organizationId,
              safeguardId,
            },
          });
        }
      }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Gap recommendations implemented successfully',
      data: {
        organizationId,
        updatedIg: recommendedIg,
        inactiveControlsCount: inactiveControlIds?.length || 0,
        inactiveSafeguardsCount: inactiveSafeguardIds?.length || 0,
      },
    });
  } catch (error: any) {
    log.error(error, '(API : gap-recommendation - POST) Error');
    return NextResponse.json<ApiResponse>(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
