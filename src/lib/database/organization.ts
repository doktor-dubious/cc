/*
model Organization {
    id                  Int       @id(map: "organization_pkey") @default(autoincrement())
    name                String
    description         String?
    settings            OrganisationSettings?

    active              Boolean   @default(true)
    createdAt           DateTime  @default(now()) @db.Timestamptz(3)                      @map("created_at")
    updatedAt           DateTime  @updatedAt      @db.Timestamptz(3)                      @map("updated_at")

    profiles            Profile[]
    tasks               Task[]
    artifacts           Artifact[]

    @@map("organization")
}

model OrganisationSettings {
    id                  Int       @id(map: "organization_settings_pkey") @default(autoincrement())
    organizationId      Int       @unique                                                 @map("organization_id")

    uploadDirectory     String                                                            @map("upload_directory")
    downloadDirectory   String                                                            @map("download_directory")
    artifactDirectory   String                                                            @map("artifact_directory")

    active              Boolean   @default(true)
    createdAt           DateTime  @default(now()) @db.Timestamptz(3)                      @map("created_at")
    updatedAt           DateTime  @updatedAt      @db.Timestamptz(3)                      @map("updated_at")

    organization        Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)

    @@index([organizationId])
    @@map("organization_settings")
}
*/

import { log }               from '@/lib/log';
import { prisma }            from '@/lib/prisma';

type ProfileData =
{
    id              : string;
    name            : string;
    description     : string | null;
    organizationId  : string | null;
};

type TaskData =
{
    id               : string;
    name             : string;
    description      : string | null;
    expectedEvidence : string | null;
    startAt          : Date | null;
    endAt            : Date | null;
    status           : string;
    organizationId   : string | null;
};

type OrganizationWithProfiles =
{
    id                       : string;
    name                     : string;
    description              : string | null;
    ig                       : number;
    size                     : string;
    naceSection              : string | null;
    legalForm                : string | null;
    revenueRange             : string | null;
    maturity                 : string | null;
    ownershipType            : string | null;
    geographicScope          : string | null;
    businessOrientation      : string | null;
    digitalMaturity          : string | null;
    esgStatus                : string | null;
    supplyChainRole          : string | null;
    riskProfile              : string | null;
    euTaxonomyAligned        : boolean | null;
    itSecurityStaff          : string | null;
    securityMaturity         : string | null;
    dataSensitivity          : string[];
    regulatoryObligations    : string[];
    itEndpointRange          : string | null;
    infrastructureTypes      : string[];
    softwareDevelopment      : string | null;
    publicFacingServices     : string | null;
    targetedAttackLikelihood : string | null;
    downtimeTolerance        : string | null;
    supplyChainPosition      : string | null;
    securityBudgetRange      : string | null;
    profiles                 : ProfileData[];
};

type OrganizationWithTasks =
{
    id                       : string;
    name                     : string;
    description              : string | null;
    ig                       : number;
    size                     : string;
    naceSection              : string | null;
    legalForm                : string | null;
    revenueRange             : string | null;
    maturity                 : string | null;
    ownershipType            : string | null;
    geographicScope          : string | null;
    businessOrientation      : string | null;
    digitalMaturity          : string | null;
    esgStatus                : string | null;
    supplyChainRole          : string | null;
    riskProfile              : string | null;
    euTaxonomyAligned        : boolean | null;
    itSecurityStaff          : string | null;
    securityMaturity         : string | null;
    dataSensitivity          : string[];
    regulatoryObligations    : string[];
    itEndpointRange          : string | null;
    infrastructureTypes      : string[];
    softwareDevelopment      : string | null;
    publicFacingServices     : string | null;
    targetedAttackLikelihood : string | null;
    downtimeTolerance        : string | null;
    supplyChainPosition      : string | null;
    securityBudgetRange      : string | null;
    tasks                    : TaskData[];
};

type OrganizationWithProfilesAndTasks =
{
    id                       : string;
    name                     : string;
    description              : string | null;
    ig                       : number;
    size                     : string;
    naceSection              : string | null;
    legalForm                : string | null;
    revenueRange             : string | null;
    maturity                 : string | null;
    ownershipType            : string | null;
    geographicScope          : string | null;
    businessOrientation      : string | null;
    digitalMaturity          : string | null;
    esgStatus                : string | null;
    supplyChainRole          : string | null;
    riskProfile              : string | null;
    euTaxonomyAligned        : boolean | null;
    itSecurityStaff          : string | null;
    securityMaturity         : string | null;
    dataSensitivity          : string[];
    regulatoryObligations    : string[];
    itEndpointRange          : string | null;
    infrastructureTypes      : string[];
    softwareDevelopment      : string | null;
    publicFacingServices     : string | null;
    targetedAttackLikelihood : string | null;
    downtimeTolerance        : string | null;
    supplyChainPosition      : string | null;
    securityBudgetRange      : string | null;
    profiles                 : ProfileData[];
    tasks                    : TaskData[];
};

export type organizationData =
{
    id                       : string;
    name                     : string;
    description              : string | null;
    ig                       : number;
    size                     : string;
    naceSection              : string | null;
    legalForm                : string | null;
    revenueRange             : string | null;
    maturity                 : string | null;
    ownershipType            : string | null;
    geographicScope          : string | null;
    businessOrientation      : string | null;
    digitalMaturity          : string | null;
    esgStatus                : string | null;
    supplyChainRole          : string | null;
    riskProfile              : string | null;
    euTaxonomyAligned        : boolean | null;
    itSecurityStaff          : string | null;
    securityMaturity         : string | null;
    dataSensitivity          : string[];
    regulatoryObligations    : string[];
    itEndpointRange          : string | null;
    infrastructureTypes      : string[];
    softwareDevelopment      : string | null;
    publicFacingServices     : string | null;
    targetedAttackLikelihood : string | null;
    downtimeTolerance        : string | null;
    supplyChainPosition      : string | null;
    securityBudgetRange      : string | null;
};

export type OrganisationSettingsData =
{
    id                : string;
    organizationId    : string;
    uploadDirectory   : string;
    downloadDirectory : string;
    artifactDirectory : string;
};

type OrganizationWithSettings =
{
    id                       : string;
    name                     : string;
    description              : string | null;
    ig                       : number;
    size                     : string;
    naceSection              : string | null;
    legalForm                : string | null;
    revenueRange             : string | null;
    maturity                 : string | null;
    ownershipType            : string | null;
    geographicScope          : string | null;
    businessOrientation      : string | null;
    digitalMaturity          : string | null;
    esgStatus                : string | null;
    supplyChainRole          : string | null;
    riskProfile              : string | null;
    euTaxonomyAligned        : boolean | null;
    itSecurityStaff          : string | null;
    securityMaturity         : string | null;
    dataSensitivity          : string[];
    regulatoryObligations    : string[];
    itEndpointRange          : string | null;
    infrastructureTypes      : string[];
    softwareDevelopment      : string | null;
    publicFacingServices     : string | null;
    targetedAttackLikelihood : string | null;
    downtimeTolerance        : string | null;
    supplyChainPosition      : string | null;
    securityBudgetRange      : string | null;
    settings                 : OrganisationSettingsData | null;
};

export type OrganizationWithAll =
{
    id                       : string;
    name                     : string;
    description              : string | null;
    ig                       : number;
    size                     : string;
    naceSection              : string | null;
    legalForm                : string | null;
    revenueRange             : string | null;
    maturity                 : string | null;
    ownershipType            : string | null;
    geographicScope          : string | null;
    businessOrientation      : string | null;
    digitalMaturity          : string | null;
    esgStatus                : string | null;
    supplyChainRole          : string | null;
    riskProfile              : string | null;
    euTaxonomyAligned        : boolean | null;
    itSecurityStaff          : string | null;
    securityMaturity         : string | null;
    dataSensitivity          : string[];
    regulatoryObligations    : string[];
    itEndpointRange          : string | null;
    infrastructureTypes      : string[];
    softwareDevelopment      : string | null;
    publicFacingServices     : string | null;
    targetedAttackLikelihood : string | null;
    downtimeTolerance        : string | null;
    supplyChainPosition      : string | null;
    securityBudgetRange      : string | null;
    profiles                 : ProfileData[];
    tasks                    : TaskData[];
    settings                 : OrganisationSettingsData | null;
};

type insertData =
{
    name            : string;
    description     : string | null;
};

const selectSettings =
{
    where   : { active: true },
    select  :
    {
        id                : true,
        organizationId    : true,
        uploadDirectory   : true,
        downloadDirectory : true,
        artifactDirectory : true,
    }
} as const;

const selectFields =
{
    id                       : true,
    name                     : true,
    description              : true,
    ig                       : true,
    size                     : true,
    naceSection              : true,
    legalForm                : true,
    revenueRange             : true,
    maturity                 : true,
    ownershipType            : true,
    geographicScope          : true,
    businessOrientation      : true,
    digitalMaturity          : true,
    esgStatus                : true,
    supplyChainRole          : true,
    riskProfile              : true,
    euTaxonomyAligned        : true,
    itSecurityStaff          : true,
    securityMaturity         : true,
    dataSensitivity          : true,
    regulatoryObligations    : true,
    itEndpointRange          : true,
    infrastructureTypes      : true,
    softwareDevelopment      : true,
    publicFacingServices     : true,
    targetedAttackLikelihood : true,
    downtimeTolerance        : true,
    supplyChainPosition      : true,
    securityBudgetRange      : true,
} as const;

const selectFieldsWithProfiles =
{
    id                       : true,
    name                     : true,
    description              : true,
    ig                       : true,
    size                     : true,
    naceSection              : true,
    legalForm                : true,
    revenueRange             : true,
    maturity                 : true,
    ownershipType            : true,
    geographicScope          : true,
    businessOrientation      : true,
    digitalMaturity          : true,
    esgStatus                : true,
    supplyChainRole          : true,
    riskProfile              : true,
    euTaxonomyAligned        : true,
    itSecurityStaff          : true,
    securityMaturity         : true,
    dataSensitivity          : true,
    regulatoryObligations    : true,
    itEndpointRange          : true,
    infrastructureTypes      : true,
    softwareDevelopment      : true,
    publicFacingServices     : true,
    targetedAttackLikelihood : true,
    downtimeTolerance        : true,
    supplyChainPosition      : true,
    securityBudgetRange      : true,
    profiles        : {
        where: { active: true },
        select: {
            id              : true,
            name            : true,
            description     : true,
            organizationId  : true,
        }
    }
} as const;

const selectFieldsWithTasks =
{
    id                       : true,
    name                     : true,
    description              : true,
    ig                       : true,
    size                     : true,
    naceSection              : true,
    legalForm                : true,
    revenueRange             : true,
    maturity                 : true,
    ownershipType            : true,
    geographicScope          : true,
    businessOrientation      : true,
    digitalMaturity          : true,
    esgStatus                : true,
    supplyChainRole          : true,
    riskProfile              : true,
    euTaxonomyAligned        : true,
    itSecurityStaff          : true,
    securityMaturity         : true,
    dataSensitivity          : true,
    regulatoryObligations    : true,
    itEndpointRange          : true,
    infrastructureTypes      : true,
    softwareDevelopment      : true,
    publicFacingServices     : true,
    targetedAttackLikelihood : true,
    downtimeTolerance        : true,
    supplyChainPosition      : true,
    securityBudgetRange      : true,
    tasks           : {
        where: { active: true },
        select: {
            id               : true,
            name             : true,
            description      : true,
            expectedEvidence : true,
            startAt          : true,
            endAt            : true,
            status           : true,
            organizationId   : true,
        }
    }
} as const;

const selectFieldsWithProfilesAndTasks =
{
    id                       : true,
    name                     : true,
    description              : true,
    ig                       : true,
    size                     : true,
    naceSection              : true,
    legalForm                : true,
    revenueRange             : true,
    maturity                 : true,
    ownershipType            : true,
    geographicScope          : true,
    businessOrientation      : true,
    digitalMaturity          : true,
    esgStatus                : true,
    supplyChainRole          : true,
    riskProfile              : true,
    euTaxonomyAligned        : true,
    itSecurityStaff          : true,
    securityMaturity         : true,
    dataSensitivity          : true,
    regulatoryObligations    : true,
    itEndpointRange          : true,
    infrastructureTypes      : true,
    softwareDevelopment      : true,
    publicFacingServices     : true,
    targetedAttackLikelihood : true,
    downtimeTolerance        : true,
    supplyChainPosition      : true,
    securityBudgetRange      : true,
    profiles        : {
        where: { active: true },
        select: {
            id              : true,
            name            : true,
            description     : true,
            organizationId  : true,
        }
    },
    tasks           : {
        where: { active: true },
        select: {
            id               : true,
            name             : true,
            description      : true,
            expectedEvidence : true,
            startAt          : true,
            endAt            : true,
            status           : true,
            organizationId   : true,
        }
    }
} as const;

const selectFieldsWithSettings =
{
    id                       : true,
    name                     : true,
    description              : true,
    ig                       : true,
    size                     : true,
    naceSection              : true,
    legalForm                : true,
    revenueRange             : true,
    maturity                 : true,
    ownershipType            : true,
    geographicScope          : true,
    businessOrientation      : true,
    digitalMaturity          : true,
    esgStatus                : true,
    supplyChainRole          : true,
    riskProfile              : true,
    euTaxonomyAligned        : true,
    itSecurityStaff          : true,
    securityMaturity         : true,
    dataSensitivity          : true,
    regulatoryObligations    : true,
    itEndpointRange          : true,
    infrastructureTypes      : true,
    softwareDevelopment      : true,
    publicFacingServices     : true,
    targetedAttackLikelihood : true,
    downtimeTolerance        : true,
    supplyChainPosition      : true,
    securityBudgetRange      : true,
    settings                 : selectSettings,
} as const;

const selectFieldsWithProfilesTasksAndSettings =
{
    id                       : true,
    name                     : true,
    description              : true,
    ig                       : true,
    size                     : true,
    naceSection              : true,
    legalForm                : true,
    revenueRange             : true,
    maturity                 : true,
    ownershipType            : true,
    geographicScope          : true,
    businessOrientation      : true,
    digitalMaturity          : true,
    esgStatus                : true,
    supplyChainRole          : true,
    riskProfile              : true,
    euTaxonomyAligned        : true,
    itSecurityStaff          : true,
    securityMaturity         : true,
    dataSensitivity          : true,
    regulatoryObligations    : true,
    itEndpointRange          : true,
    infrastructureTypes      : true,
    softwareDevelopment      : true,
    publicFacingServices     : true,
    targetedAttackLikelihood : true,
    downtimeTolerance        : true,
    supplyChainPosition      : true,
    securityBudgetRange      : true,
    settings                 : selectSettings,
    profiles    :
    {
        where: { active: true },
        select:
        {
            id              : true,
            name            : true,
            description     : true,
            organizationId  : true,
        }
    },
    tasks       :
    {
        where: { active: true },
        select:
        {
            id               : true,
            name             : true,
            description      : true,
            expectedEvidence : true,
            startAt          : true,
            endAt            : true,
            status           : true,
            organizationId   : true,
        }
    }
} as const;


export const organizationRepository =
{
    async findById(id: string): Promise<organizationData | null>
    {
        log.info('SQL - organization: findById');

        return prisma.organization.findUnique(
        {
            where: { id, active : true },
            select: selectFields
        });
    },

    async findAll(): Promise<organizationData[]>
    {
        log.info('SQL - organization: findAll');

        return prisma.organization.findMany(
        {
            where   : { active: true },
            select  : selectFields,
            orderBy : { id: 'asc' }
        });
    },

    async findAllWithProfiles(): Promise<OrganizationWithProfiles[]>
    {
        log.info('SQL - organization: findAllWithProfiles');

        return prisma.organization.findMany(
        {
            where   : { active: true },
            select  : selectFieldsWithProfiles,
            orderBy : { id: 'asc' }
        });
    },

    async findAllWithTasks(): Promise<OrganizationWithTasks[]>
    {
        log.info('SQL - organization: findAllWithTasks');

        return prisma.organization.findMany(
        {
            where   : { active: true },
            select  : selectFieldsWithTasks,
            orderBy : { id: 'asc' }
        });
    },

    async findAllWithProfilesAndTasks(): Promise<OrganizationWithProfilesAndTasks[]>
    {
        log.info('SQL - organization: findAllWithProfilesAndTasks');

        return prisma.organization.findMany(
        {
            where   : { active: true },
            select  : selectFieldsWithProfilesAndTasks,
            orderBy : { id: 'asc' }
        });
    },

    async findAllByUserId(userId: string): Promise<organizationData[]>
    {
        log.info('SQL - organization: findAllByUserId');

        return prisma.organization.findMany(
        {
            where:
            {
                active: true,
                profiles:
                {
                    some:
                    {
                        userId,
                        active: true,
                    },
                },
            },
            select: selectFields,
            orderBy: { id: 'asc' },
        });
    },

    async findByIdWithSettings(id: string): Promise<OrganizationWithSettings | null>
    {
        log.info('SQL - organization: findByIdWithSettings');

        return prisma.organization.findUnique(
        {
            where   : { id, active: true },
            select  : selectFieldsWithSettings
        });
    },

    async findAllWithSettings(): Promise<OrganizationWithSettings[]>
    {
        log.info('SQL - organization: findAllWithSettings');

        return prisma.organization.findMany(
        {
            where   : { active: true },
            select  : selectFieldsWithSettings,
            orderBy : { id: 'asc' }
        });
    },

    async findAllWithProfilesTasksAndSettings(): Promise<OrganizationWithAll[]>
    {
        log.info('SQL - organization: findAllWithProfilesTasksAndSettings');

        return prisma.organization.findMany(
        {
            where   : { active: true },
            select  : selectFieldsWithProfilesTasksAndSettings,
            orderBy : { id: 'asc' }
        });
    },

    async updateOrganization(id: string, data: {
        name: string;
        description: string | null;
        ig?: number;
        size?: string;
        naceSection?: string | null;
        legalForm?: string | null;
        revenueRange?: string | null;
        maturity?: string | null;
        ownershipType?: string | null;
        geographicScope?: string | null;
        businessOrientation?: string | null;
        digitalMaturity?: string | null;
        esgStatus?: string | null;
        supplyChainRole?: string | null;
        riskProfile?: string | null;
        euTaxonomyAligned?: boolean | null;
        itSecurityStaff?: string | null;
        securityMaturity?: string | null;
        dataSensitivity?: string[];
        regulatoryObligations?: string[];
        itEndpointRange?: string | null;
        infrastructureTypes?: string[];
        softwareDevelopment?: string | null;
        publicFacingServices?: string | null;
        targetedAttackLikelihood?: string | null;
        downtimeTolerance?: string | null;
        supplyChainPosition?: string | null;
        securityBudgetRange?: string | null;
    }): Promise<organizationData>
    {
        log.info({ ID: id, name: data.name }, 'SQL - organization: update');

        // Cast to any to handle enum type conversion from string values
        return prisma.organization.update(
        {
            where: { id },
            data: data as any,
            select: selectFieldsWithProfilesTasksAndSettings
        });
    },

    async updateSettings(organizationId: string,
        data:
        {
            uploadDirectory   : string;
            downloadDirectory : string;
            artifactDirectory : string;
        }
    ): Promise<OrganisationSettingsData>
    {
        log.info({ ID: organizationId }, 'SQL - organization: update settings');

        return prisma.organisationSettings.upsert(
        {
            where   : { organizationId },
            update  : data,
            create  :
            {
                organizationId,
                ...data,
            },
            select  :
            {
                id                : true,
                organizationId    : true,
                uploadDirectory   : true,
                downloadDirectory : true,
                artifactDirectory : true,
            }
        });
    },

    async create(data: { name: string; description: string | null }): Promise<organizationData>
    {
        log.info({ name: data.name, description: data.description }, 'SQL - organization: create');

        return prisma.organization.create({ data, select: selectFieldsWithProfilesAndTasks });
    },

    async delete(id: string): Promise<organizationData>
    {
        log.info({ id }, 'SQL - organization: delete');
        
        return prisma.organization.update(
        {
            where: { id },
            data: { active: false },
            select: selectFieldsWithProfilesAndTasks
        });
    }    
};
