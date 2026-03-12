import { log } from '@/lib/log';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { userRepository } from '@/lib/database/user';
import { organizationRepository } from '@/lib/database/organization';

import { UserProvider } from '@/context/UserContext';
import { OrganizationProvider } from '@/context/OrganizationContext';

async function getUserData() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
      log.info('No session found - redirecting to login');
      redirect('/login');
    }

    const user = await userRepository.findById(session.user.id);

    if (!user) {
      redirect('/login');
    }

    return user;
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    log.error(err, 'Session verification failed');
    redirect('/login');
  }
}

async function getOrganizationData(user: { id: string; role: string }) {
  try {
    if (user.role === 'SUPER_ADMIN') {
      return await organizationRepository.findAll();
    }
    return await organizationRepository.findAllByUserId(user.id);
  } catch (err) {
    log.error(err, 'Error loading organizations');
    return [];
  }
}

export default async function WorkflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserData();
  const organizationsDb = await getOrganizationData(user);

  const organizations = organizationsDb.map((org) => ({
    id: org.id,
    name: org.name,
    description: org.description,
    ig: org.ig,
    size: org.size,
    naceSection: org.naceSection,
    legalForm: org.legalForm,
    revenueRange: org.revenueRange,
    maturity: org.maturity,
    ownershipType: org.ownershipType,
    geographicScope: org.geographicScope,
    businessOrientation: org.businessOrientation,
    digitalMaturity: org.digitalMaturity,
    esgStatus: org.esgStatus,
    supplyChainRole: org.supplyChainRole,
    riskProfile: org.riskProfile,
    euTaxonomyAligned: org.euTaxonomyAligned,
    itSecurityStaff: org.itSecurityStaff,
    securityMaturity: org.securityMaturity,
    dataSensitivity: org.dataSensitivity,
    regulatoryObligations: org.regulatoryObligations,
    itEndpointRange: org.itEndpointRange,
    infrastructureTypes: org.infrastructureTypes,
    softwareDevelopment: org.softwareDevelopment,
    publicFacingServices: org.publicFacingServices,
    targetedAttackLikelihood: org.targetedAttackLikelihood,
    downtimeTolerance: org.downtimeTolerance,
    supplyChainPosition: org.supplyChainPosition,
    securityBudgetRange: org.securityBudgetRange,
    manualOperation: org.manualOperation,
    productionDependency: org.productionDependency,
    customerAccess: org.customerAccess,
    businessDaysPerYear: org.businessDaysPerYear,
  }));

  return (
    <UserProvider user={user}>
      <OrganizationProvider organizations={organizations}>
        <div className="min-h-screen bg-background">{children}</div>
      </OrganizationProvider>
    </UserProvider>
  );
}
