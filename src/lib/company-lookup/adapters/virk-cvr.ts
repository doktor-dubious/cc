/**
 * Official Danish CVR adapter using the Virk Elasticsearch API.
 * Requires VIRK_CVR_USER and VIRK_CVR_PASSWORD environment variables.
 *
 * Registration: https://datacvr.virk.dk/artikel/system-til-system-adgang-til-cvr-data
 * API docs:     https://datacvr.virk.dk/artikel/api-til-cvr-data
 *
 * Falls back gracefully (returns []) if credentials are not configured.
 */

import { CompanyAdapter, CompanySearchResult } from '../types';
import { naceCodeToSection, employeesToSize }  from '../nace-mapper';

const API_URL = 'https://api.virk.dk/cvr-permanent/virksomhed/_search';

/**
 * Maps the CVR virksomhedsform kortBeskrivelse (e.g. "ApS", "A/S", "ENK") to our LegalForm enum.
 */
function mapLegalForm(kortBeskrivelse: string | null | undefined): string | null {
    if (!kortBeskrivelse) return null;
    const k = kortBeskrivelse.toUpperCase().trim();
    if (k === 'ENK' || k === 'PMV')         return 'SOLE_PROPRIETOR';
    if (k === 'I/S' || k === 'ANS')         return 'PARTNERSHIP';
    if (k === 'K/S' || k === 'P/S')         return 'PARTNERSHIP';
    if (k === 'APS' || k === 'ApS')         return 'PRIVATE_LIMITED';
    if (k === 'A/S' || k === 'ASA')         return 'PUBLIC_LIMITED';
    if (k === 'AMBA' || k === 'A.M.B.A.')   return 'COOPERATIVE';
    if (k === 'FOND')                        return 'FOUNDATION';
    if (k === 'FONDEN')                      return 'FOUNDATION';
    if (k === 'UDL')                         return 'BRANCH_FOREIGN';
    if (k === 'STAT' || k === 'KOMP' || k === 'KOM') return 'PUBLIC_BODY';
    return 'OTHER';
}

/**
 * Maps the CVR employee interval code to a representative midpoint count.
 * Codes follow the pattern ANTAL_<from>_<to> or ANTAL_<from>_MORE.
 */
function employeeIntervalToCount(code: string | null | undefined): number | null {
    if (!code) return null;
    const midpoints: Record<string, number> = {
        ANTAL_0_0       :    0,
        ANTAL_1_1       :    1,
        ANTAL_2_4       :    3,
        ANTAL_5_9       :    7,
        ANTAL_10_19     :   15,
        ANTAL_20_49     :   35,
        ANTAL_50_99     :   75,
        ANTAL_100_199   :  150,
        ANTAL_200_499   :  350,
        ANTAL_500_999   :  750,
        ANTAL_1000_1999 : 1500,
        ANTAL_2000_MORE : 2000,
    };
    return midpoints[code] ?? null;
}

// ── Virk API response types ────────────────────────────────────────────────

interface VirkAdresse {
    vejnavn?      : string;
    husnummerFra? : number;
    postnummer?   : number;
    postdistrikt? : string;
}

interface VirkNavn {
    navn?: string;
}

interface VirkBranche {
    brancheKode?  : string;
    branchetekst? : string;
}

interface VirkVirksomhedsform {
    kortBeskrivelse? : string;
    langBeskrivelse? : string;
}

interface VirkAarsvaerk {
    intervalKodeAntalAnsatteInterval?: string;
    aar?: number;
}

interface VirkMetadata {
    nyesteNavn?            : VirkNavn;
    nyesteHovedbranche?    : VirkBranche;
    nyesteAdresse?         : VirkAdresse;
    nyesteVirksomhedsform? : VirkVirksomhedsform;
    sammensatStatus?       : string;
    sammenlagtAarligeAnsatte? : VirkAarsvaerk[];
}

interface VirkVirksomhed {
    cvrNummer?         : number;
    virksomhedMetadata?: VirkMetadata;
}

interface VirkHit {
    _source?: {
        Vrvirksomhed?: VirkVirksomhed;
    };
}

interface VirkResponse {
    hits?: {
        hits?: VirkHit[];
    };
}

// ── Adapter ────────────────────────────────────────────────────────────────

export const virkCvrAdapter: CompanyAdapter = {
    async search(query: string): Promise<CompanySearchResult[]> {
        const user     = process.env.VIRK_CVR_USER;
        const password = process.env.VIRK_CVR_PASSWORD;

        if (!user || !password) return [];

        const credentials = Buffer.from(`${user}:${password}`).toString('base64');

        const body = {
            _source: [
                'Vrvirksomhed.cvrNummer',
                'Vrvirksomhed.virksomhedMetadata.nyesteNavn',
                'Vrvirksomhed.virksomhedMetadata.nyesteHovedbranche',
                'Vrvirksomhed.virksomhedMetadata.nyesteVirksomhedsform',
                'Vrvirksomhed.virksomhedMetadata.nyesteAdresse',
                'Vrvirksomhed.virksomhedMetadata.sammensatStatus',
                'Vrvirksomhed.virksomhedMetadata.sammenlagtAarligeAnsatte',
            ],
            query: {
                bool: {
                    must: {
                        match_phrase_prefix: {
                            'Vrvirksomhed.virksomhedMetadata.nyesteNavn.navn': {
                                query          : query,
                                max_expansions : 15,
                            },
                        },
                    },
                    filter: {
                        term: {
                            'Vrvirksomhed.virksomhedMetadata.sammensatStatus': 'NORMAL',
                        },
                    },
                },
            },
            size: 8,
        };

        const res = await fetch(API_URL, {
            method  : 'POST',
            headers : {
                'Content-Type'  : 'application/json',
                'Authorization' : `Basic ${credentials}`,
            },
            body   : JSON.stringify(body),
            signal : AbortSignal.timeout(8000),
        });

        if (!res.ok) return [];

        const data: VirkResponse = await res.json();
        const hits = data.hits?.hits ?? [];

        return hits.map((hit): CompanySearchResult => {
            const vr       = hit._source?.Vrvirksomhed;
            const meta     = vr?.virksomhedMetadata;
            const adresse  = meta?.nyesteAdresse;
            const branche  = meta?.nyesteHovedbranche;
            const form     = meta?.nyesteVirksomhedsform;

            // Pick most recent annual employee count (highest aar value)
            const ansatte = (meta?.sammenlagtAarligeAnsatte ?? [])
                .sort((a, b) => (b.aar ?? 0) - (a.aar ?? 0))[0];

            const employeeCount = employeeIntervalToCount(ansatte?.intervalKodeAntalAnsatteInterval ?? null);

            const addressParts = [
                adresse?.vejnavn && adresse.husnummerFra
                    ? `${adresse.vejnavn} ${adresse.husnummerFra}`
                    : adresse?.vejnavn,
                adresse?.postnummer,
                adresse?.postdistrikt,
            ].filter(Boolean);

            const cvrNr = vr?.cvrNummer !== undefined ? String(vr.cvrNummer) : '';

            return {
                id                 : cvrNr,
                name               : meta?.nyesteNavn?.navn ?? '',
                registrationNumber : cvrNr || undefined,
                country            : 'DK',
                source             : 'CVR (Denmark)',
                address            : addressParts.length > 0 ? addressParts.join(', ') : undefined,
                employees          : employeeCount !== null ? String(employeeCount) : undefined,
                industryDescription: branche?.branchetekst,
                legalForm          : mapLegalForm(form?.kortBeskrivelse),
                naceSection        : naceCodeToSection(branche?.brancheKode),
                size               : employeesToSize(employeeCount),
                geographicScope    : null,
                ownershipType      : null,
            };
        });
    },
};
