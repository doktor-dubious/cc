import { CompanyAdapter, CompanySearchResult } from '../types';
import { naceCodeToSection, employeesToSize }  from '../nace-mapper';

/**
 * Maps Danish CVR company type strings to our LegalForm enum.
 */
function mapLegalForm(companyType: string | null | undefined): string | null {
    if (!companyType) return null;
    const t = companyType.toLowerCase();
    if (t.includes('enkeltmand') || t.includes('enkeltperson')) return 'SOLE_PROPRIETOR';
    if (t.includes('interessentskab') || t === 'i/s')            return 'PARTNERSHIP';
    if (t.includes('anpartsselskab') || t === 'aps')             return 'PRIVATE_LIMITED';
    if (t.includes('aktieselskab') || t === 'a/s')               return 'PUBLIC_LIMITED';
    if (t.includes('andelsselskab') || t.includes('andel'))      return 'COOPERATIVE';
    if (t.includes('fond') || t.includes('foundation'))          return 'FOUNDATION';
    if (t.includes('filial') || t.includes('udenlandsk'))        return 'BRANCH_FOREIGN';
    if (t.includes('kommunal') || t.includes('region') || t.includes('statslig')) return 'PUBLIC_BODY';
    return 'OTHER';
}

interface CvrApiResult {
    vat?          : number | string;
    name?         : string;
    address?      : string;
    zipcode?      : string;
    city?         : string;
    country?      : string;
    employees?    : string | number;
    industry?     : string;
    industricode? : string | number;
    company_type? : string;
}

export const cvrAdapter: CompanyAdapter = {
    async search(query: string): Promise<CompanySearchResult[]> {
        const url = `https://cvrapi.dk/api?search=${encodeURIComponent(query)}&country=dk`;

        const res = await fetch(url, {
            headers: { 'User-Agent': 'ComplianceCircle/1.0 (compliance platform)' },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) return [];

        const data: CvrApiResult | CvrApiResult[] = await res.json();

        // The API returns a single object or an array
        const items = Array.isArray(data) ? data : [data];

        return items.map((item): CompanySearchResult => {
            const employees = item.employees !== undefined && item.employees !== null
                ? parseInt(String(item.employees).replace(/\D/g, ''), 10) || null
                : null;

            const address = [item.address, item.zipcode, item.city]
                .filter(Boolean).join(', ') || undefined;

            return {
                id               : String(item.vat ?? ''),
                name             : item.name ?? '',
                registrationNumber: item.vat !== undefined ? String(item.vat) : undefined,
                country          : 'DK',
                source           : 'CVR (Denmark)',
                address,
                employees        : item.employees !== undefined ? String(item.employees) : undefined,
                industryDescription: item.industry ?? undefined,
                legalForm        : mapLegalForm(item.company_type),
                naceSection      : naceCodeToSection(item.industricode),
                size             : employees !== null ? employeesToSize(employees) : null,
                geographicScope  : null,
                ownershipType    : null,
            };
        });
    }
};
