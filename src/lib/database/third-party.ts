import { log }      from '@/lib/log';
import { Prisma }   from '@prisma/client';
import { prisma }   from '@/lib/prisma';
import type {
    CesRegulatoryFramework,
    CesTriState,
    CesDependencyLevel,
    CesDeliveryRole,
    CesAccessLevel,
    CesDataHandled,
    CesDisruptionImpact,
    CesSupplyChainRole,
} from '@prisma/client';

const selectFields = {
    id                    : true,
    seq                   : true,
    organizationId        : true,
    name                  : true,
    description           : true,
    regulatoryFramework   : true,
    customerSector        : true,
    dedicatedCompliance   : true,
    partOfGroup           : true,
    listedOrPeOwned       : true,
    standardContract      : true,
    slaIncluded           : true,
    professionalProcurement : true,
    deliversToRegulated   : true,
    deliversToPublicInfra : true,
    internationalOps      : true,
    coreDigital           : true,
    itDependency          : true,
    publicBrand           : true,
    criticalSocietalRole  : true,
    mediaExposure         : true,
    deliveryRole          : true,
    accessLevel           : true,
    dataHandled           : true,
    disruptionImpact      : true,
    supplyChainRole       : true,
    active                : true,
    createdAt             : true,
    updatedAt             : true,
} as const;

export type ThirdPartyCompanyObj = Prisma.ThirdPartyCompanyGetPayload<{
    select: typeof selectFields;
}>;

export type ThirdPartyCreateData = {
    organizationId        : string;
    name                  : string;
    description?          : string | null;
    regulatoryFramework?  : CesRegulatoryFramework | null;
    customerSector?       : string | null;
    dedicatedCompliance?  : boolean | null;
    partOfGroup?          : boolean | null;
    listedOrPeOwned?      : boolean | null;
    standardContract?     : boolean | null;
    slaIncluded?          : boolean | null;
    professionalProcurement? : boolean | null;
    deliversToRegulated?  : CesTriState | null;
    deliversToPublicInfra? : boolean | null;
    internationalOps?     : boolean | null;
    coreDigital?          : CesTriState | null;
    itDependency?         : CesDependencyLevel | null;
    publicBrand?          : boolean | null;
    criticalSocietalRole? : boolean | null;
    mediaExposure?        : boolean | null;
    deliveryRole?         : CesDeliveryRole | null;
    accessLevel?          : CesAccessLevel | null;
    dataHandled?          : CesDataHandled | null;
    disruptionImpact?     : CesDisruptionImpact | null;
    supplyChainRole?      : CesSupplyChainRole | null;
};

export type ThirdPartyUpdateData = Partial<Omit<ThirdPartyCreateData, 'organizationId'>>;

export const thirdPartyRepository = {

    async findAllByOrgId(organizationId: string): Promise<ThirdPartyCompanyObj[]>
    {
        log.info({ organizationId }, 'SQL - third-party: findAllByOrgId');

        return prisma.thirdPartyCompany.findMany({
            where   : { organizationId, active: true },
            select  : selectFields,
            orderBy : { seq: 'asc' },
        });
    },

    async findById(id: string): Promise<ThirdPartyCompanyObj | null>
    {
        log.info({ id }, 'SQL - third-party: findById');

        return prisma.thirdPartyCompany.findUnique({
            where  : { id, active: true },
            select : selectFields,
        });
    },

    async create(data: ThirdPartyCreateData): Promise<ThirdPartyCompanyObj>
    {
        log.info({ name: data.name, organizationId: data.organizationId }, 'SQL - third-party: create');

        return prisma.thirdPartyCompany.create({
            data,
            select : selectFields,
        });
    },

    async update(id: string, data: ThirdPartyUpdateData): Promise<ThirdPartyCompanyObj>
    {
        log.info({ id }, 'SQL - third-party: update');

        return prisma.thirdPartyCompany.update({
            where  : { id },
            data,
            select : selectFields,
        });
    },

    async delete(id: string): Promise<ThirdPartyCompanyObj>
    {
        log.info({ id }, 'SQL - third-party: delete');

        return prisma.thirdPartyCompany.update({
            where  : { id },
            data   : { active: false },
            select : selectFields,
        });
    },
};
