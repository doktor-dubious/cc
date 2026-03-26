import { getServerSession }          from '@/lib/auth';
import { getSupportedCountries }     from '@/lib/company-lookup';
import { organizationRepository }    from '@/lib/database/organization';

export async function GET(request: Request) {
    const session = await getServerSession();
    if (!session) return new Response('Unauthorized', { status: 401 });

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId')?.trim() ?? null;

    let enabledSources: string[] = [];

    if (orgId) {
        enabledSources = await organizationRepository.getEnabledLookupSources(orgId);
    }

    return Response.json({ countries: getSupportedCountries(enabledSources.length > 0 ? enabledSources : undefined) });
}
