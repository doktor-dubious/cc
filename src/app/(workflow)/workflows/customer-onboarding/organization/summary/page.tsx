'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Users, Globe, Shield, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/context/OrganizationContext';

const WORKFLOW_RETURN_URL = '/workflows/customer-onboarding';

export default function OrganizationSummaryPage() {
  const t = useTranslations('Organization');
  const tc = useTranslations('Common');
  const router = useRouter();
  const { activeOrganization } = useOrganization();

  if (!activeOrganization) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">{tc('loading.selectOrganization')}</p>
      </div>
    );
  }

  const org = activeOrganization;

  // Helper to get translated label for enum values
  const getLabel = (value: string | null | undefined, prefix: string): string => {
    if (!value) return '-';
    return t(`${prefix}.${value.toLowerCase()}`, { defaultValue: value });
  };

  // Helper to get translated labels for array values
  const getArrayLabels = (values: string[] | null | undefined, prefix: string): string => {
    if (!values || values.length === 0) return '-';
    return values.map(v => t(`${prefix}.${v.toLowerCase()}`, { defaultValue: v })).join(', ');
  };

  // Section component for grouping related fields
  const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );

  // Field component for displaying a single field
  const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium mt-0.5">{value || '-'}</dd>
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b bg-background px-6 py-3">
        <Button
          variant="secondary"
          size="sm"
          className="gap-2 cursor-pointer"
          onClick={() => router.push(WORKFLOW_RETURN_URL)}
        >
          <ArrowLeft className="h-4 w-4" />
          {tc('navigation.workflow')}
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold">{t('summary.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('summary.subtitle')}</p>
          </div>

          {/* Basic Information */}
          <Section title={t('summary.sections.basicInfo')} icon={<Building2 className="h-4 w-4" />}>
            <Field label={t('fields.name')} value={org.name} />
            <Field label={t('fields.description')} value={org.description} />
            <Field label={t('fields.size')} value={getLabel(org.size, 'sizes')} />
            <Field label={t('fields.naceSection')} value={getLabel(org.naceSection, 'nace')} />
            <Field label={t('fields.legalForm')} value={getLabel(org.legalForm, 'legalForms')} />
            <Field label={t('fields.revenueRange')} value={org.revenueRange !== null ? `€${org.revenueRange.toLocaleString()}` : null} />
            <Field label={t('fields.maturity')} value={getLabel(org.maturity, 'maturities')} />
            <Field label={t('fields.ownershipType')} value={getLabel(org.ownershipType, 'ownershipTypes')} />
          </Section>

          {/* Business Profile */}
          <Section title={t('summary.sections.businessProfile')} icon={<Globe className="h-4 w-4" />}>
            <Field label={t('fields.geographicScope')} value={getLabel(org.geographicScope, 'geographicScopes')} />
            <Field label={t('fields.businessOrientation')} value={getLabel(org.businessOrientation, 'businessOrientations')} />
            <Field label={t('fields.digitalMaturity')} value={getLabel(org.digitalMaturity, 'digitalMaturities')} />
            <Field label={t('fields.esgStatus')} value={getLabel(org.esgStatus, 'esgStatuses')} />
            <Field label={t('fields.supplyChainRole')} value={getLabel(org.supplyChainRole, 'supplyChainRoles')} />
            <Field label={t('fields.riskProfile')} value={getLabel(org.riskProfile, 'riskProfiles')} />
            <Field label={t('fields.euTaxonomyAligned')} value={org.euTaxonomyAligned === true ? tc('words.yes') : org.euTaxonomyAligned === false ? tc('words.no') : '-'} />
          </Section>

          {/* IT & Security */}
          <Section title={t('summary.sections.itSecurity')} icon={<Shield className="h-4 w-4" />}>
            <Field label={t('fields.itSecurityStaff')} value={getLabel(org.itSecurityStaff, 'itSecurityStaff')} />
            <Field label={t('fields.securityMaturity')} value={getLabel(org.securityMaturity, 'securityMaturity')} />
            <Field label={t('fields.securityBudgetRange')} value={getLabel(org.securityBudgetRange, 'securityBudgetRange')} />
            <Field label={t('fields.targetedAttackLikelihood')} value={getLabel(org.targetedAttackLikelihood, 'targetedAttackLikelihood')} />
            <Field label={t('fields.downtimeTolerance')} value={getLabel(org.downtimeTolerance, 'downtimeTolerance')} />
          </Section>

          {/* Infrastructure */}
          <Section title={t('summary.sections.infrastructure')} icon={<Server className="h-4 w-4" />}>
            <Field label={t('fields.itEndpointRange')} value={getLabel(org.itEndpointRange, 'itEndpointRange')} />
            <Field label={t('fields.infrastructureTypes')} value={getArrayLabels(org.infrastructureTypes, 'infrastructureTypes')} />
            <Field label={t('fields.softwareDevelopment')} value={getLabel(org.softwareDevelopment, 'softwareDevelopment')} />
            <Field label={t('fields.publicFacingServices')} value={getLabel(org.publicFacingServices, 'publicFacingServices')} />
            <Field label={t('fields.supplyChainPosition')} value={getLabel(org.supplyChainPosition, 'supplyChainPosition')} />
          </Section>

          {/* Compliance */}
          <Section title={t('summary.sections.compliance')} icon={<Users className="h-4 w-4" />}>
            <Field label={t('fields.dataSensitivity')} value={getArrayLabels(org.dataSensitivity, 'dataSensitivity')} />
            <Field label={t('fields.regulatoryObligations')} value={getArrayLabels(org.regulatoryObligations, 'regulatoryObligations')} />
            <Field label={t('fields.ig')} value={org.ig?.toString()} />
          </Section>

          {/* Return Button */}
          <div className="pt-6 flex justify-center">
            <Button
              variant="default"
              size="lg"
              className="gap-2 cursor-pointer"
              onClick={() => router.push(WORKFLOW_RETURN_URL)}
            >
              <ArrowLeft className="h-4 w-4" />
              {tc('navigation.workflow')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
