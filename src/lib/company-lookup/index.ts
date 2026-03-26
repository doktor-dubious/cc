import { CompanyAdapter, CompanySearchResult } from './types';
import { virkCvrAdapter }                      from './adapters/virk-cvr';
import { brregAdapter }                        from './adapters/brreg';

export type { CompanySearchResult, CompanyAdapter } from './types';
export type { AutoFilledField, AutoFilledFields }   from './types';

/**
 * Returns the Danish CVR adapter only when credentials are configured.
 * The unofficial cvrapi.dk wrapper is no longer usable (returns 403).
 * Register for free at: https://datacvr.virk.dk/artikel/system-til-system-adgang-til-cvr-data
 */
function getDkAdapter(): CompanyAdapter | null {
    if (process.env.VIRK_CVR_USER && process.env.VIRK_CVR_PASSWORD) {
        return virkCvrAdapter;
    }
    return null;
}

/** Registry of available adapters keyed by country code */
function getAdapters(): Record<string, CompanyAdapter> {
    const adapters: Record<string, CompanyAdapter> = { NO: brregAdapter };
    const dk = getDkAdapter();
    if (dk) adapters.DK = dk;
    return adapters;
}

/**
 * Returns true if the given country is supported (has credentials configured).
 */
export function isCountrySupported(country: string): boolean {
    return country.toUpperCase() in getAdapters();
}

/**
 * Search for companies across one or more registries.
 *
 * @param query   Company name or registration number
 * @param country ISO-3166-1 alpha-2 country code, or 'ALL' to query all adapters
 */
export async function searchCompanies(
    query   : string,
    country : string = 'ALL',
): Promise<CompanySearchResult[]> {
    if (!query.trim()) return [];

    const adapters = getAdapters();

    const targetAdapters = country === 'ALL'
        ? Object.values(adapters)
        : adapters[country.toUpperCase()]
            ? [adapters[country.toUpperCase()]]
            : [];

    if (targetAdapters.length === 0) return [];

    const results = await Promise.allSettled(
        targetAdapters.map(a => a.search(query))
    );

    return results
        .filter((r): r is PromiseFulfilledResult<CompanySearchResult[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);
}

/** List of countries supported by the lookup service, optionally filtered by org-enabled sources */
export function getSupportedCountries(enabledSources?: string[]): string[] {
    const all = Object.keys(getAdapters());
    if (!enabledSources || enabledSources.length === 0) return all;
    return all.filter(c => enabledSources.includes(c));
}
