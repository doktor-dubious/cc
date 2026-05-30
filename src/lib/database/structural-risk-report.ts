import { log }      from '@/lib/log';
import { Prisma }   from '@prisma/client';
import { prisma }   from '@/lib/prisma';

const selectFields = {
    id             : true,
    organizationId : true,
    report         : true,
    sectionConfigs : true,
    generatedById  : true,
    generatedAt    : true,
    lastEditedById : true,
    lastEditedAt   : true,
    createdAt      : true,
    updatedAt      : true,
} as const;

export type StructuralRiskReportObj = Prisma.StructuralRiskReportGetPayload<{
    select: typeof selectFields;
}>;

export type StructuralRiskReportUpsertData = {
    organizationId : string;
    report         : Prisma.InputJsonValue;
    sectionConfigs : Prisma.InputJsonValue;
    generatedById  : string;
};

export type StructuralRiskReportAdaptData = {
    report         : Prisma.InputJsonValue;
    sectionConfigs : Prisma.InputJsonValue;
    lastEditedById : string;
};

export const structuralRiskReportRepository = {

    async findByOrgId(organizationId: string): Promise<StructuralRiskReportObj | null>
    {
        log.info({ organizationId }, 'SQL - structural-risk-report: findByOrgId');

        return prisma.structuralRiskReport.findUnique({
            where  : { organizationId },
            select : selectFields,
        });
    },

    async upsert(data: StructuralRiskReportUpsertData): Promise<StructuralRiskReportObj>
    {
        log.info({ organizationId: data.organizationId }, 'SQL - structural-risk-report: upsert');

        const now = new Date();

        return prisma.structuralRiskReport.upsert({
            where  : { organizationId: data.organizationId },
            create : {
                organizationId : data.organizationId,
                report         : data.report,
                sectionConfigs : data.sectionConfigs,
                generatedById  : data.generatedById,
                generatedAt    : now,
                lastEditedById : null,
                lastEditedAt   : null,
            },
            update : {
                report         : data.report,
                sectionConfigs : data.sectionConfigs,
                generatedById  : data.generatedById,
                generatedAt    : now,
                lastEditedById : null,
                lastEditedAt   : null,
            },
            select : selectFields,
        });
    },

    async updateAdaptations(
        organizationId : string,
        data           : StructuralRiskReportAdaptData,
    ): Promise<StructuralRiskReportObj>
    {
        log.info({ organizationId }, 'SQL - structural-risk-report: updateAdaptations');

        return prisma.structuralRiskReport.update({
            where : { organizationId },
            data  : {
                report         : data.report,
                sectionConfigs : data.sectionConfigs,
                lastEditedById : data.lastEditedById,
                lastEditedAt   : new Date(),
            },
            select : selectFields,
        });
    },
};
