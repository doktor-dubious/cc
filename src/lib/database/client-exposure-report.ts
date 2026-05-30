import { log }      from '@/lib/log';
import { Prisma }   from '@prisma/client';
import { prisma }   from '@/lib/prisma';

const selectFields = {
    id                  : true,
    thirdPartyCompanyId : true,
    report              : true,
    sectionConfigs      : true,
    generatedById       : true,
    generatedAt         : true,
    lastEditedById      : true,
    lastEditedAt        : true,
    createdAt           : true,
    updatedAt           : true,
} as const;

export type ClientExposureReportObj = Prisma.ClientExposureReportGetPayload<{
    select: typeof selectFields;
}>;

export type ClientExposureReportUpsertData = {
    thirdPartyCompanyId : string;
    report              : Prisma.InputJsonValue;
    sectionConfigs      : Prisma.InputJsonValue;
    generatedById       : string;
};

export type ClientExposureReportAdaptData = {
    report         : Prisma.InputJsonValue;
    sectionConfigs : Prisma.InputJsonValue;
    lastEditedById : string;
};

export const clientExposureReportRepository = {

    async findByThirdPartyId(thirdPartyCompanyId: string): Promise<ClientExposureReportObj | null>
    {
        log.info({ thirdPartyCompanyId }, 'SQL - client-exposure-report: findByThirdPartyId');

        return prisma.clientExposureReport.findUnique({
            where  : { thirdPartyCompanyId },
            select : selectFields,
        });
    },

    async upsert(data: ClientExposureReportUpsertData): Promise<ClientExposureReportObj>
    {
        log.info({ thirdPartyCompanyId: data.thirdPartyCompanyId }, 'SQL - client-exposure-report: upsert');

        const now = new Date();

        return prisma.clientExposureReport.upsert({
            where  : { thirdPartyCompanyId: data.thirdPartyCompanyId },
            create : {
                thirdPartyCompanyId : data.thirdPartyCompanyId,
                report              : data.report,
                sectionConfigs      : data.sectionConfigs,
                generatedById       : data.generatedById,
                generatedAt         : now,
                lastEditedById      : null,
                lastEditedAt        : null,
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
        thirdPartyCompanyId : string,
        data                : ClientExposureReportAdaptData,
    ): Promise<ClientExposureReportObj>
    {
        log.info({ thirdPartyCompanyId }, 'SQL - client-exposure-report: updateAdaptations');

        return prisma.clientExposureReport.update({
            where : { thirdPartyCompanyId },
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
