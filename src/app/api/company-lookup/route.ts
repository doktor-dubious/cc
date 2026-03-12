import { getServerSession }                    from '@/lib/auth';
import { searchCompanies, isCountrySupported } from '@/lib/company-lookup';
import { log }                                 from '@/lib/log';

export async function GET(request: Request) {
    const session = await getServerSession();
    if (!session) return new Response('Unauthorized', { status: 401 });

    const { searchParams } = new URL(request.url);
    const query   = searchParams.get('q')?.trim() ?? '';
    const country = searchParams.get('country')?.trim().toUpperCase() ?? 'ALL';

    if (!query || query.length < 2) {
        return Response.json({ data: [], configured: isCountrySupported(country) });
    }

    if (!isCountrySupported(country)) {
        return Response.json({ data: [], configured: false });
    }

    log.info({ query, country }, 'company-lookup: search');

    try {
        const results = await searchCompanies(query, country);
        return Response.json({ data: results, configured: true });
    } catch (err) {
        log.error({ err }, 'company-lookup: search failed');
        return Response.json({ data: [], configured: true });
    }
}
