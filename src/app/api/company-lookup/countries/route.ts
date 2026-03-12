import { getServerSession }     from '@/lib/auth';
import { getSupportedCountries } from '@/lib/company-lookup';

export async function GET() {
    const session = await getServerSession();
    if (!session) return new Response('Unauthorized', { status: 401 });

    return Response.json({ countries: getSupportedCountries() });
}
