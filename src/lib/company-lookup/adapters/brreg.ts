import { CompanyAdapter, CompanySearchResult } from '../types';
import { naceCodeToSection, employeesToSize }  from '../nace-mapper';

/**
 * Maps Norwegian Brreg org form codes to our LegalForm enum.
 */
function mapLegalForm(kode: string | null | undefined): string | null {
    if (!kode) return null;
    switch (kode.toUpperCase()) {
        case 'ENK':                    return 'SOLE_PROPRIETOR';
        case 'ANS':
        case 'DA':
        case 'KS':
        case 'PRE':
        case 'ESEK':                   return 'PARTNERSHIP';
        case 'AS':                     return 'PRIVATE_LIMITED';
        case 'ASA':                    return 'PUBLIC_LIMITED';
        case 'SA':
        case 'AL':
        case 'BA':
        case 'BBL':                    return 'COOPERATIVE';
        case 'STI':                    return 'FOUNDATION';
        case 'NUF':                    return 'BRANCH_FOREIGN';
        case 'KOMM':
        case 'FKF':
        case 'SF':
        case 'STAT':
        case 'FYLK':                   return 'PUBLIC_BODY';
        default:                       return 'OTHER';
    }
}

interface BrregEnhet {
    organisasjonsnummer?: string;
    navn?               : string;
    antallAnsatte?      : number;
    organisasjonsform?  : { kode?: string; beskrivelse?: string };
    naeringskode1?      : { kode?: string; beskrivelse?: string };
    forretningsadresse? : {
        adresse?     : string[];
        postnummer?  : string;
        poststed?    : string;
        land?        : string;
    };
}

interface BrregResponse {
    _embedded?: { enheter?: BrregEnhet[] };
}

export const brregAdapter: CompanyAdapter = {
    async search(query: string): Promise<CompanySearchResult[]> {
        const url = `https://data.brreg.no/enhetsregisteret/api/enheter?navn=${encodeURIComponent(query)}&size=5`;

        const res = await fetch(url, {
            headers: {
                'Accept'     : 'application/json',
                'User-Agent' : 'ComplianceCircle/1.0 (compliance platform)',
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) return [];

        const data: BrregResponse = await res.json();
        const items = data._embedded?.enheter ?? [];

        return items.map((item): CompanySearchResult => {
            const addr = item.forretningsadresse;
            const addressParts = [
                ...(addr?.adresse ?? []),
                addr?.postnummer,
                addr?.poststed,
            ].filter(Boolean);

            return {
                id               : item.organisasjonsnummer ?? '',
                name             : item.navn ?? '',
                registrationNumber: item.organisasjonsnummer,
                country          : 'NO',
                source           : 'Brreg (Norway)',
                address          : addressParts.length > 0 ? addressParts.join(', ') : undefined,
                employees        : item.antallAnsatte !== undefined ? String(item.antallAnsatte) : undefined,
                industryDescription: item.naeringskode1?.beskrivelse,
                legalForm        : mapLegalForm(item.organisasjonsform?.kode),
                naceSection      : naceCodeToSection(item.naeringskode1?.kode),
                size             : employeesToSize(item.antallAnsatte ?? null),
                geographicScope  : null,
                ownershipType    : null,
            };
        });
    }
};
