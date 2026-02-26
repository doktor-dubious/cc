// app/api/organization/route.ts

import { log }                                      from '@/lib/log';
import { NextRequest, NextResponse }                from 'next/server';
import { getServerSession }                         from '@/lib/auth';
import { organizationRepository }                   from '@/lib/database/organization';
import { canUpdateOrganizations,
         canDeleteOrganizations}                    from '@/lib/auth/permissions';
import type { ApiResponse }                         from '@/lib/types/api';
import type { organizationData }                    from '@/lib/database/organization';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> })
{
    log.debug('(PRISMA API : organization/[id] - PATCH');

    const { id } = await params;
    const organizationId = id;

    if (!organizationId)
    {
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: 'Invalid organization ID'
            },
            { status: 400 }
        );
    }

    try
    {
        // ── Authentication ────────────────────────────────────────────────────────────────
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Unauthorized'
                },
                { status: 401 });
        }

        const { id: userId, profileId, role } = session.user;
        log.debug({ userId: userId, profileId: profileId ?? 'missing profileId', role: role ?? 'missing role' }, 'Payload');

        if (!userId || !role || (role !== 'SUPER_ADMIN' && !profileId))
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Invalid token'
                },
                { status: 401 });
        }

        // SUPER ADMINs can fetch organizations.
        if (!canUpdateOrganizations(role))
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Unauthorized' 
                },
                { status: 403 }
            );
        }

        // ── Parse & validate body ───────────────────────────────────────
        const body = await request.json();
        const {
            name, description, ig, size,
            naceSection, legalForm, revenueRange, maturity,
            ownershipType, geographicScope, businessOrientation, digitalMaturity,
            esgStatus, supplyChainRole, riskProfile, euTaxonomyAligned,
            itSecurityStaff, securityMaturity, dataSensitivity, regulatoryObligations,
            itEndpointRange, infrastructureTypes, softwareDevelopment, publicFacingServices,
            targetedAttackLikelihood, downtimeTolerance, supplyChainPosition, securityBudgetRange
        } = body;

        // -- Name
        if (!name || typeof name !== 'string' || name.trim() === '')
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Name is required'
                },
                { status: 400 }
            );
        }

        // ── Check existence ────────────────────────────────────────────
        const org = await organizationRepository.findById(organizationId);
        if (!org)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Organization not found'
                },
                { status: 404 });
        }

        // ── Database/Prisma ───────────────────────────────────────
        const updatedOrganization = await organizationRepository.updateOrganization(organizationId,
            {
                name                     : name.trim(),
                description              : description?.trim() ?? null,
                ig                       : ig !== undefined ? ig : org.ig,
                size                     : size !== undefined ? size : org.size,
                naceSection              : naceSection !== undefined ? naceSection : org.naceSection,
                legalForm                : legalForm !== undefined ? legalForm : org.legalForm,
                revenueRange             : revenueRange !== undefined ? revenueRange : org.revenueRange,
                maturity                 : maturity !== undefined ? maturity : org.maturity,
                ownershipType            : ownershipType !== undefined ? ownershipType : org.ownershipType,
                geographicScope          : geographicScope !== undefined ? geographicScope : org.geographicScope,
                businessOrientation      : businessOrientation !== undefined ? businessOrientation : org.businessOrientation,
                digitalMaturity          : digitalMaturity !== undefined ? digitalMaturity : org.digitalMaturity,
                esgStatus                : esgStatus !== undefined ? esgStatus : org.esgStatus,
                supplyChainRole          : supplyChainRole !== undefined ? supplyChainRole : org.supplyChainRole,
                riskProfile              : riskProfile !== undefined ? riskProfile : org.riskProfile,
                euTaxonomyAligned        : euTaxonomyAligned !== undefined ? euTaxonomyAligned : org.euTaxonomyAligned,
                itSecurityStaff          : itSecurityStaff !== undefined ? itSecurityStaff : org.itSecurityStaff,
                securityMaturity         : securityMaturity !== undefined ? securityMaturity : org.securityMaturity,
                dataSensitivity          : dataSensitivity !== undefined ? dataSensitivity : org.dataSensitivity,
                regulatoryObligations    : regulatoryObligations !== undefined ? regulatoryObligations : org.regulatoryObligations,
                itEndpointRange          : itEndpointRange !== undefined ? itEndpointRange : org.itEndpointRange,
                infrastructureTypes      : infrastructureTypes !== undefined ? infrastructureTypes : org.infrastructureTypes,
                softwareDevelopment      : softwareDevelopment !== undefined ? softwareDevelopment : org.softwareDevelopment,
                publicFacingServices     : publicFacingServices !== undefined ? publicFacingServices : org.publicFacingServices,
                targetedAttackLikelihood : targetedAttackLikelihood !== undefined ? targetedAttackLikelihood : org.targetedAttackLikelihood,
                downtimeTolerance        : downtimeTolerance !== undefined ? downtimeTolerance : org.downtimeTolerance,
                supplyChainPosition      : supplyChainPosition !== undefined ? supplyChainPosition : org.supplyChainPosition,
                securityBudgetRange      : securityBudgetRange !== undefined ? securityBudgetRange : org.securityBudgetRange,
            }
        );

        return NextResponse.json<ApiResponse<organizationData>>(
        {
            success  : true,
            message  : 'Organization updated successfully',
            data     : updatedOrganization,
        },
        { status: 200 });
    }
    catch (error)
    {
        console.error('Error updating organization:', error);
        log.error({ error }, 'Error updating organization');

        if (error instanceof Error && error.name === 'JWSSignatureVerificationFailed')
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false,
                    error: 'Invalid or expired token' 
                }, 
                { status: 401 });
        }

        return NextResponse.json<ApiResponse>(
            { 
                success: false,
                error: 'Failed to update organization' 
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> })
{
    log.debug('(PRISMA API : organization/[id] - DELETE');

    const { id } = await params;
    const organizationId = id;
    if (!organizationId)
    {
        return NextResponse.json<ApiResponse>(
            {
                success: false,
                error: 'Invalid organization ID'
            },
            { status: 400 }
        );
    }

    try
    {
        // ── Authentication ────────────────────────────────────────────────────────────────
        const session = await getServerSession();
        if (!session?.user)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Unauthorized'
                },
                { status: 401 });
        }

        const { id: userId, profileId, role } = session.user;
        log.debug({ userId: userId, profileId: profileId ?? 'missing profileId', role: role ?? 'missing role' }, 'Payload');

        if (!userId || !role || (role !== 'SUPER_ADMIN' && !profileId))
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Invalid token'
                },
                { status: 401 });
        }

        // SUPER ADMINs can delete Organizations.
        if (!canDeleteOrganizations(role))
        {
            return NextResponse.json<ApiResponse>(
                { 
                    success: false, 
                    error  : 'Unauthorized' 
                },
                { status: 403 }
            );
        }

        // ── Check existence ────────────────────────────────────────────
        const org = await organizationRepository.findById(organizationId);
        if (!org)
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Organization not found' 
                }, 
                { status: 404 });
        }

        // ── Database/Prisma ───────────────────────────────────────
        await organizationRepository.delete(organizationId);

        return NextResponse.json<ApiResponse>(
        {
            success     : true,
            message     : 'Organization deleted successfully'
        },
        { status: 200 });
    }
    catch (error)
    {
        log.error({ error }, 'Error deleting organization');

        if (error instanceof Error && error.name === 'JWSSignatureVerificationFailed')
        {
            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error  : 'Invalid or expired token' 
                }, 
                { status: 401 });
        }

        return NextResponse.json<ApiResponse>(
            { 
                success: false,
                error  : 'Failed to delete organization' 
            },
            { status: 500 }
        );
    }
}
