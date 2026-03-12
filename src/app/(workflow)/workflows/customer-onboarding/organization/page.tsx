'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, ArrowLeft, Check, Search, Building2, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { CompanySearchResult, AutoFilledFields } from '@/lib/company-lookup';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganization } from '@/context/OrganizationContext';

// Define the wizard steps
type WizardStep = {
  id: string;
  titleKey: string;
  fields: FieldConfig[];
};

type FieldConfig = {
  key: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'multiselect' | 'boolean';
  labelKey: string;
  placeholderKey?: string;
  helperKey?: string;
  options?: { value: string; labelKey: string }[];
  required?: boolean;
};

// Organization size options
const SIZE_OPTIONS = [
  { value: 'MICRO', labelKey: 'sizes.micro' },
  { value: 'SMALL', labelKey: 'sizes.small' },
  { value: 'MEDIUM', labelKey: 'sizes.medium' },
  { value: 'LARGE', labelKey: 'sizes.large' },
  { value: 'ENTERPRISE', labelKey: 'sizes.enterprise' },
];

// NACE Section options
const NACE_OPTIONS = [
  { value: 'A', labelKey: 'nace.A' },
  { value: 'B', labelKey: 'nace.B' },
  { value: 'C', labelKey: 'nace.C' },
  { value: 'D', labelKey: 'nace.D' },
  { value: 'E', labelKey: 'nace.E' },
  { value: 'F', labelKey: 'nace.F' },
  { value: 'G', labelKey: 'nace.G' },
  { value: 'H', labelKey: 'nace.H' },
  { value: 'I', labelKey: 'nace.I' },
  { value: 'J', labelKey: 'nace.J' },
  { value: 'K', labelKey: 'nace.K' },
  { value: 'L', labelKey: 'nace.L' },
  { value: 'M', labelKey: 'nace.M' },
  { value: 'N', labelKey: 'nace.N' },
  { value: 'O', labelKey: 'nace.O' },
  { value: 'P', labelKey: 'nace.P' },
  { value: 'Q', labelKey: 'nace.Q' },
  { value: 'R', labelKey: 'nace.R' },
  { value: 'S', labelKey: 'nace.S' },
  { value: 'OTHER', labelKey: 'nace.OTHER' },
];

// Legal form options
const LEGAL_FORM_OPTIONS = [
  { value: 'SOLE_PROPRIETOR', labelKey: 'legalForms.soleProprietor' },
  { value: 'PARTNERSHIP', labelKey: 'legalForms.partnership' },
  { value: 'PRIVATE_LIMITED', labelKey: 'legalForms.privateLimited' },
  { value: 'PUBLIC_LIMITED', labelKey: 'legalForms.publicLimited' },
  { value: 'COOPERATIVE', labelKey: 'legalForms.cooperative' },
  { value: 'FOUNDATION', labelKey: 'legalForms.foundation' },
  { value: 'BRANCH_FOREIGN', labelKey: 'legalForms.branchForeign' },
  { value: 'PUBLIC_BODY', labelKey: 'legalForms.publicBody' },
  { value: 'OTHER', labelKey: 'legalForms.other' },
];

// Revenue range options
const REVENUE_RANGE_OPTIONS = [
  { value: 'UNDER_2M', labelKey: 'revenueRanges.under2m' },
  { value: 'FROM_2M_TO_10M', labelKey: 'revenueRanges.from2mTo10m' },
  { value: 'FROM_10M_TO_50M', labelKey: 'revenueRanges.from10mTo50m' },
  { value: 'FROM_50M_TO_250M', labelKey: 'revenueRanges.from50mTo250m' },
  { value: 'FROM_250M_TO_1B', labelKey: 'revenueRanges.from250mTo1b' },
  { value: 'OVER_1B', labelKey: 'revenueRanges.over1b' },
];

// Maturity options
const MATURITY_OPTIONS = [
  { value: 'STARTUP', labelKey: 'maturities.startup' },
  { value: 'GROWTH', labelKey: 'maturities.growth' },
  { value: 'ESTABLISHED', labelKey: 'maturities.established' },
  { value: 'MATURE', labelKey: 'maturities.mature' },
];

// Ownership type options
const OWNERSHIP_TYPE_OPTIONS = [
  { value: 'PRIVATE', labelKey: 'ownershipTypes.private' },
  { value: 'PUBLIC_LISTED', labelKey: 'ownershipTypes.publicListed' },
  { value: 'STATE_OWNED', labelKey: 'ownershipTypes.stateOwned' },
  { value: 'FAMILY_OWNED', labelKey: 'ownershipTypes.familyOwned' },
  { value: 'PE_VC_BACKED', labelKey: 'ownershipTypes.peVcBacked' },
  { value: 'COOPERATIVE', labelKey: 'ownershipTypes.cooperative' },
  { value: 'NON_PROFIT', labelKey: 'ownershipTypes.nonProfit' },
];

// Geographic scope options
const GEOGRAPHIC_SCOPE_OPTIONS = [
  { value: 'LOCAL', labelKey: 'geographicScopes.local' },
  { value: 'REGIONAL', labelKey: 'geographicScopes.regional' },
  { value: 'NATIONAL', labelKey: 'geographicScopes.national' },
  { value: 'EUROPEAN', labelKey: 'geographicScopes.european' },
  { value: 'GLOBAL', labelKey: 'geographicScopes.global' },
];

// Business orientation options
const BUSINESS_ORIENTATION_OPTIONS = [
  { value: 'B2B', labelKey: 'businessOrientations.b2b' },
  { value: 'B2C', labelKey: 'businessOrientations.b2c' },
  { value: 'B2G', labelKey: 'businessOrientations.b2g' },
  { value: 'MIXED', labelKey: 'businessOrientations.mixed' },
];

// Digital maturity options
const DIGITAL_MATURITY_OPTIONS = [
  { value: 'TRADITIONAL', labelKey: 'digitalMaturities.traditional' },
  { value: 'DEVELOPING', labelKey: 'digitalMaturities.developing' },
  { value: 'MATURE', labelKey: 'digitalMaturities.mature' },
  { value: 'DIGITAL_NATIVE', labelKey: 'digitalMaturities.digitalNative' },
];

// ESG status options
const ESG_STATUS_OPTIONS = [
  { value: 'REPORTING', labelKey: 'esgStatuses.reporting' },
  { value: 'NOT_REQUIRED', labelKey: 'esgStatuses.notRequired' },
  { value: 'EXEMPT', labelKey: 'esgStatuses.exempt' },
];

// Supply chain role options
const SUPPLY_CHAIN_ROLE_OPTIONS = [
  { value: 'MANUFACTURER', labelKey: 'supplyChainRoles.manufacturer' },
  { value: 'DISTRIBUTOR', labelKey: 'supplyChainRoles.distributor' },
  { value: 'SERVICE_PROVIDER', labelKey: 'supplyChainRoles.serviceProvider' },
  { value: 'RETAILER', labelKey: 'supplyChainRoles.retailer' },
  { value: 'END_USER', labelKey: 'supplyChainRoles.endUser' },
];

// Risk profile options
const RISK_PROFILE_OPTIONS = [
  { value: 'LOW', labelKey: 'riskProfiles.low' },
  { value: 'MEDIUM', labelKey: 'riskProfiles.medium' },
  { value: 'HIGH', labelKey: 'riskProfiles.high' },
];

// Revenue concentration options
const REVENUE_CONCENTRATION_OPTIONS = [
  { value: 'LOW', labelKey: 'revenueConcentration.low' },
  { value: 'MEDIUM', labelKey: 'revenueConcentration.medium' },
  { value: 'HIGH', labelKey: 'revenueConcentration.high' },
];

// Entity type options
const ENTITY_TYPE_OPTIONS = [
  { value: 'IMPORTANT', labelKey: 'entityType.important' },
  { value: 'ESSENTIAL', labelKey: 'entityType.essential' },
];

// EU Taxonomy options
const EU_TAXONOMY_OPTIONS = [
  { value: 'true', labelKey: 'euTaxonomy.yes' },
  { value: 'false', labelKey: 'euTaxonomy.no' },
];

// IT Security Staff options
const IT_SECURITY_STAFF_OPTIONS = [
  { value: 'NO_DEDICATED_IT', labelKey: 'itSecurityStaff.noDedicatedIt' },
  { value: 'IT_NO_SECURITY', labelKey: 'itSecurityStaff.itNoSecurity' },
  { value: 'DEDICATED_SECURITY', labelKey: 'itSecurityStaff.dedicatedSecurity' },
  { value: 'SPECIALIZED_SECURITY', labelKey: 'itSecurityStaff.specializedSecurity' },
];

// Security maturity options
const SECURITY_MATURITY_OPTIONS = [
  { value: 'NO_PROGRAM', labelKey: 'securityMaturity.noProgram' },
  { value: 'BASIC', labelKey: 'securityMaturity.basic' },
  { value: 'DEFINED', labelKey: 'securityMaturity.defined' },
  { value: 'MANAGED', labelKey: 'securityMaturity.managed' },
  { value: 'OPTIMIZING', labelKey: 'securityMaturity.optimizing' },
];

// IT Endpoint Range options
const IT_ENDPOINT_RANGE_OPTIONS = [
  { value: 'UNDER_25', labelKey: 'itEndpointRange.under25' },
  { value: 'FROM_25_100', labelKey: 'itEndpointRange.from25To100' },
  { value: 'FROM_100_500', labelKey: 'itEndpointRange.from100To500' },
  { value: 'FROM_500_5000', labelKey: 'itEndpointRange.from500To5000' },
  { value: 'OVER_5000', labelKey: 'itEndpointRange.over5000' },
];

// Infrastructure types options (multiselect)
const INFRASTRUCTURE_TYPES_OPTIONS = [
  { value: 'ON_PREMISES', labelKey: 'infrastructureTypes.onPremises' },
  { value: 'CLOUD_ONLY', labelKey: 'infrastructureTypes.cloudOnly' },
  { value: 'HYBRID', labelKey: 'infrastructureTypes.hybrid' },
  { value: 'MULTI_CLOUD', labelKey: 'infrastructureTypes.multiCloud' },
  { value: 'OPERATIONAL_TECHNOLOGY', labelKey: 'infrastructureTypes.operationalTechnology' },
];

// Software development options
const SOFTWARE_DEVELOPMENT_OPTIONS = [
  { value: 'NONE', labelKey: 'softwareDevelopment.none' },
  { value: 'SOME_INTERNAL', labelKey: 'softwareDevelopment.someInternal' },
  { value: 'CORE_BUSINESS', labelKey: 'softwareDevelopment.coreBusiness' },
  { value: 'SOFTWARE_IS_PRODUCT', labelKey: 'softwareDevelopment.softwareIsProduct' },
];

// Public facing services options
const PUBLIC_FACING_SERVICES_OPTIONS = [
  { value: 'NONE', labelKey: 'publicFacingServices.none' },
  { value: 'BASIC_WEB', labelKey: 'publicFacingServices.basicWeb' },
  { value: 'ECOMMERCE_PORTALS', labelKey: 'publicFacingServices.ecommercePortals' },
  { value: 'CRITICAL_SERVICES', labelKey: 'publicFacingServices.criticalServices' },
];

// Data sensitivity options (multiselect)
const DATA_SENSITIVITY_OPTIONS = [
  { value: 'BASIC_BUSINESS', labelKey: 'dataSensitivity.basicBusiness' },
  { value: 'CUSTOMER_PII', labelKey: 'dataSensitivity.customerPii' },
  { value: 'SPECIAL_CATEGORY', labelKey: 'dataSensitivity.specialCategory' },
  { value: 'PAYMENT_CARD', labelKey: 'dataSensitivity.paymentCard' },
  { value: 'INTELLECTUAL_PROPERTY', labelKey: 'dataSensitivity.intellectualProperty' },
  { value: 'CLASSIFIED_GOVERNMENT', labelKey: 'dataSensitivity.classifiedGovernment' },
  { value: 'CRITICAL_INFRASTRUCTURE', labelKey: 'dataSensitivity.criticalInfrastructure' },
];

// Regulatory obligations options (multiselect)
const REGULATORY_OBLIGATIONS_OPTIONS = [
  { value: 'GDPR', labelKey: 'regulatoryObligations.gdpr' },
  { value: 'NIS2', labelKey: 'regulatoryObligations.nis2' },
  { value: 'DORA', labelKey: 'regulatoryObligations.dora' },
  { value: 'EU_AI_ACT', labelKey: 'regulatoryObligations.euAiAct' },
  { value: 'PCI_DSS', labelKey: 'regulatoryObligations.pciDss' },
  { value: 'INDUSTRY_SPECIFIC', labelKey: 'regulatoryObligations.industrySpecific' },
  { value: 'CYBER_INSURANCE', labelKey: 'regulatoryObligations.cyberInsurance' },
  { value: 'NONE_NOT_SURE', labelKey: 'regulatoryObligations.noneNotSure' },
];

// Targeted attack likelihood options
const TARGETED_ATTACK_LIKELIHOOD_OPTIONS = [
  { value: 'LOW', labelKey: 'targetedAttackLikelihood.low' },
  { value: 'MEDIUM', labelKey: 'targetedAttackLikelihood.medium' },
  { value: 'HIGH', labelKey: 'targetedAttackLikelihood.high' },
];

// Downtime tolerance options
const DOWNTIME_TOLERANCE_OPTIONS = [
  { value: 'DAYS', labelKey: 'downtimeTolerance.days' },
  { value: 'HOURS', labelKey: 'downtimeTolerance.hours' },
  { value: 'NEAR_ZERO', labelKey: 'downtimeTolerance.nearZero' },
];

// Supply chain position options
const SUPPLY_CHAIN_POSITION_OPTIONS = [
  { value: 'END_CONSUMER', labelKey: 'supplyChainPosition.endConsumer' },
  { value: 'B2B_PROVIDER', labelKey: 'supplyChainPosition.b2bProvider' },
  { value: 'CRITICAL_SUPPLIER', labelKey: 'supplyChainPosition.criticalSupplier' },
  { value: 'MSP_CLOUD_PROVIDER', labelKey: 'supplyChainPosition.mspCloudProvider' },
];

// Security budget range options
const SECURITY_BUDGET_RANGE_OPTIONS = [
  { value: 'MINIMAL', labelKey: 'securityBudgetRange.minimal' },
  { value: 'UNDER_50K', labelKey: 'securityBudgetRange.under50k' },
  { value: 'FROM_50K_250K', labelKey: 'securityBudgetRange.from50kTo250k' },
  { value: 'FROM_250K_1M', labelKey: 'securityBudgetRange.from250kTo1m' },
  { value: 'OVER_1M', labelKey: 'securityBudgetRange.over1m' },
];

// Manual operation options
const MANUAL_OPERATION_OPTIONS = [
  { value: 'YES', labelKey: 'manualOperation.yes' },
  { value: 'PARTIAL', labelKey: 'manualOperation.partial' },
  { value: 'NO', labelKey: 'manualOperation.no' },
];

// Production dependency options
const PRODUCTION_DEPENDENCY_OPTIONS = [
  { value: 'NO_DEPENDENCY', labelKey: 'productionDependency.noDependency' },
  { value: 'PARTIAL', labelKey: 'productionDependency.partial' },
  { value: 'DIRECT', labelKey: 'productionDependency.direct' },
];

// Customer access options
const CUSTOMER_ACCESS_OPTIONS = [
  { value: 'NOT_REQUIRED', labelKey: 'customerAccess.notRequired' },
  { value: 'PARTIAL', labelKey: 'customerAccess.partial' },
  { value: 'ESSENTIAL', labelKey: 'customerAccess.essential' },
];

// Define all wizard steps
const WIZARD_STEPS: WizardStep[] = [
  // ── Group 1: Organization & Business Profile ──────────────────────────
  {
    id: 'basics',
    titleKey: 'onboard.steps.basics',
    fields: [
      {
        key: 'name',
        type: 'text',
        labelKey: 'labels.organisationName',
        placeholderKey: 'placeholders.enterOrganizationName',
        required: true,
      },
      {
        key: 'description',
        type: 'textarea',
        labelKey: 'labels.description',
        placeholderKey: 'placeholders.enterDescription',
      },
    ],
  },
  {
    id: 'size-maturity',
    titleKey: 'onboard.steps.sizeMaturity',
    fields: [
      {
        key: 'size',
        type: 'select',
        labelKey: 'labels.organizationSize',
        placeholderKey: 'placeholders.selectSize',
        helperKey: 'helpers.organizationSizeHelp',
        options: SIZE_OPTIONS,
      },
      {
        key: 'maturity',
        type: 'select',
        labelKey: 'labels.maturity',
        placeholderKey: 'placeholders.selectMaturity',
        options: MATURITY_OPTIONS,
      },
    ],
  },
  {
    id: 'legal-ownership',
    titleKey: 'onboard.steps.legalOwnership',
    fields: [
      {
        key: 'legalForm',
        type: 'select',
        labelKey: 'labels.legalForm',
        placeholderKey: 'placeholders.selectLegalForm',
        options: LEGAL_FORM_OPTIONS,
      },
      {
        key: 'ownershipType',
        type: 'select',
        labelKey: 'labels.ownershipType',
        placeholderKey: 'placeholders.selectOwnershipType',
        options: OWNERSHIP_TYPE_OPTIONS,
      },
    ],
  },
  {
    id: 'geography-revenue',
    titleKey: 'onboard.steps.geographyRevenue',
    fields: [
      {
        key: 'geographicScope',
        type: 'select',
        labelKey: 'labels.geographicScope',
        placeholderKey: 'placeholders.selectGeographicScope',
        options: GEOGRAPHIC_SCOPE_OPTIONS,
      },
      {
        key: 'revenueRange',
        type: 'select',
        labelKey: 'labels.revenueRange',
        placeholderKey: 'placeholders.selectRevenueRange',
        options: REVENUE_RANGE_OPTIONS,
      },
      {
        key: 'businessDaysPerYear',
        type: 'number',
        labelKey: 'labels.businessDaysPerYear',
        placeholderKey: 'placeholders.enterBusinessDaysPerYear',
      },
      {
        key: 'revenueConcentration',
        type: 'select',
        labelKey: 'labels.revenueConcentration',
        placeholderKey: 'placeholders.selectRevenueConcentration',
        options: REVENUE_CONCENTRATION_OPTIONS,
      },
    ],
  },
  {
    id: 'business-exposure',
    titleKey: 'onboard.steps.businessExposure',
    fields: [
      {
        key: 'businessOrientation',
        type: 'select',
        labelKey: 'labels.businessOrientation',
        placeholderKey: 'placeholders.selectBusinessOrientation',
        options: BUSINESS_ORIENTATION_OPTIONS,
      },
      {
        key: 'riskProfile',
        type: 'select',
        labelKey: 'labels.riskProfile',
        placeholderKey: 'placeholders.selectRiskProfile',
        options: RISK_PROFILE_OPTIONS,
      },
    ],
  },
  {
    id: 'market-services',
    titleKey: 'onboard.steps.marketServices',
    fields: [
      {
        key: 'publicFacingServices',
        type: 'select',
        labelKey: 'labels.publicFacingServices',
        placeholderKey: 'placeholders.selectPublicFacingServices',
        helperKey: 'helpers.publicFacingServicesHelp',
        options: PUBLIC_FACING_SERVICES_OPTIONS,
      },
      {
        key: 'targetedAttackLikelihood',
        type: 'select',
        labelKey: 'labels.targetedAttackLikelihood',
        placeholderKey: 'placeholders.selectTargetedAttackLikelihood',
        helperKey: 'helpers.targetedAttackLikelihoodHelp',
        options: TARGETED_ATTACK_LIKELIHOOD_OPTIONS,
      },
    ],
  },
  // ── Group 2: Sector, Regulatory & Taxonomy ────────────────────────────
  {
    id: 'sector-regulatory',
    titleKey: 'onboard.steps.sectorRegulatory',
    fields: [
      {
        key: 'naceSection',
        type: 'select',
        labelKey: 'labels.naceSection',
        placeholderKey: 'placeholders.selectNaceSection',
        helperKey: 'helpers.naceSectionHelp',
        options: NACE_OPTIONS,
      },
      {
        key: 'regulatoryObligations',
        type: 'multiselect',
        labelKey: 'labels.regulatoryObligations',
        helperKey: 'helpers.regulatoryObligationsHelp',
        options: REGULATORY_OBLIGATIONS_OPTIONS,
      },
      {
        key: 'entityType',
        type: 'select',
        labelKey: 'labels.entityType',
        placeholderKey: 'placeholders.selectEntityType',
        options: ENTITY_TYPE_OPTIONS,
      },
    ],
  },
  {
    id: 'eu-taxonomy',
    titleKey: 'onboard.steps.euTaxonomy',
    fields: [
      {
        key: 'euTaxonomyAligned',
        type: 'select',
        labelKey: 'labels.euTaxonomyAligned',
        placeholderKey: 'placeholders.selectEuTaxonomyAligned',
        helperKey: 'helpers.euTaxonomyHelp',
        options: EU_TAXONOMY_OPTIONS,
      },
    ],
  },
  // ── Group 3: Operations, Security & Resilience ────────────────────────
  {
    id: 'digital-esg',
    titleKey: 'onboard.steps.digitalEsg',
    fields: [
      {
        key: 'digitalMaturity',
        type: 'select',
        labelKey: 'labels.digitalMaturity',
        placeholderKey: 'placeholders.selectDigitalMaturity',
        options: DIGITAL_MATURITY_OPTIONS,
      },
      {
        key: 'esgStatus',
        type: 'select',
        labelKey: 'labels.esgStatus',
        placeholderKey: 'placeholders.selectEsgStatus',
        options: ESG_STATUS_OPTIONS,
      },
    ],
  },
  {
    id: 'it-security-staff',
    titleKey: 'onboard.steps.itSecurityStaff',
    fields: [
      {
        key: 'itSecurityStaff',
        type: 'select',
        labelKey: 'labels.itSecurityStaff',
        placeholderKey: 'placeholders.selectItSecurityStaff',
        helperKey: 'helpers.itSecurityStaffHelp',
        options: IT_SECURITY_STAFF_OPTIONS,
      },
      {
        key: 'securityMaturity',
        type: 'select',
        labelKey: 'labels.securityMaturity',
        placeholderKey: 'placeholders.selectSecurityMaturity',
        helperKey: 'helpers.securityMaturityHelp',
        options: SECURITY_MATURITY_OPTIONS,
      },
    ],
  },
  {
    id: 'data-sensitivity',
    titleKey: 'onboard.steps.dataSensitivity',
    fields: [
      {
        key: 'dataSensitivity',
        type: 'multiselect',
        labelKey: 'labels.dataSensitivity',
        helperKey: 'helpers.dataSensitivityHelp',
        options: DATA_SENSITIVITY_OPTIONS,
      },
    ],
  },
  {
    id: 'it-infrastructure',
    titleKey: 'onboard.steps.itInfrastructure',
    fields: [
      {
        key: 'itEndpointRange',
        type: 'select',
        labelKey: 'labels.itEndpointRange',
        placeholderKey: 'placeholders.selectItEndpointRange',
        helperKey: 'helpers.itEndpointRangeHelp',
        options: IT_ENDPOINT_RANGE_OPTIONS,
      },
      {
        key: 'infrastructureTypes',
        type: 'multiselect',
        labelKey: 'labels.infrastructureTypes',
        helperKey: 'helpers.infrastructureTypesHelp',
        options: INFRASTRUCTURE_TYPES_OPTIONS,
      },
    ],
  },
  {
    id: 'software-budget',
    titleKey: 'onboard.steps.softwareBudget',
    fields: [
      {
        key: 'softwareDevelopment',
        type: 'select',
        labelKey: 'labels.softwareDevelopment',
        placeholderKey: 'placeholders.selectSoftwareDevelopment',
        helperKey: 'helpers.softwareDevelopmentHelp',
        options: SOFTWARE_DEVELOPMENT_OPTIONS,
      },
      {
        key: 'securityBudgetRange',
        type: 'select',
        labelKey: 'labels.securityBudgetRange',
        placeholderKey: 'placeholders.selectSecurityBudgetRange',
        helperKey: 'helpers.securityBudgetRangeHelp',
        options: SECURITY_BUDGET_RANGE_OPTIONS,
      },
    ],
  },
  {
    id: 'supply-chain-downtime',
    titleKey: 'onboard.steps.supplyChainDowntime',
    fields: [
      {
        key: 'downtimeTolerance',
        type: 'select',
        labelKey: 'labels.downtimeTolerance',
        placeholderKey: 'placeholders.selectDowntimeTolerance',
        helperKey: 'helpers.downtimeToleranceHelp',
        options: DOWNTIME_TOLERANCE_OPTIONS,
      },
      {
        key: 'supplyChainRole',
        type: 'select',
        labelKey: 'labels.supplyChainRole',
        placeholderKey: 'placeholders.selectSupplyChainRole',
        options: SUPPLY_CHAIN_ROLE_OPTIONS,
      },
      {
        key: 'supplyChainPosition',
        type: 'select',
        labelKey: 'labels.supplyChainPosition',
        placeholderKey: 'placeholders.selectSupplyChainPosition',
        helperKey: 'helpers.supplyChainPositionHelp',
        options: SUPPLY_CHAIN_POSITION_OPTIONS,
      },
    ],
  },
  {
    id: 'business-continuity',
    titleKey: 'onboard.steps.businessContinuity',
    fields: [
      {
        key: 'manualOperation',
        type: 'select',
        labelKey: 'labels.manualOperation',
        placeholderKey: 'placeholders.selectManualOperation',
        helperKey: 'helpers.manualOperationHelp',
        options: MANUAL_OPERATION_OPTIONS,
      },
      {
        key: 'productionDependency',
        type: 'select',
        labelKey: 'labels.productionDependency',
        placeholderKey: 'placeholders.selectProductionDependency',
        helperKey: 'helpers.productionDependencyHelp',
        options: PRODUCTION_DEPENDENCY_OPTIONS,
      },
      {
        key: 'customerAccess',
        type: 'select',
        labelKey: 'labels.customerAccess',
        placeholderKey: 'placeholders.selectCustomerAccess',
        helperKey: 'helpers.customerAccessHelp',
        options: CUSTOMER_ACCESS_OPTIONS,
      },
    ],
  },
];

// Form data type
type FormData = {
  name: string;
  description: string;
  size: string;
  naceSection: string | null;
  legalForm: string | null;
  revenueRange: string | null;
  maturity: string | null;
  ownershipType: string | null;
  geographicScope: string | null;
  businessOrientation: string | null;
  digitalMaturity: string | null;
  esgStatus: string | null;
  supplyChainRole: string | null;
  riskProfile: string | null;
  euTaxonomyAligned: boolean | null;
  itSecurityStaff: string | null;
  securityMaturity: string | null;
  dataSensitivity: string[];
  regulatoryObligations: string[];
  itEndpointRange: string | null;
  infrastructureTypes: string[];
  softwareDevelopment: string | null;
  publicFacingServices: string | null;
  targetedAttackLikelihood: string | null;
  downtimeTolerance: string | null;
  supplyChainPosition: string | null;
  securityBudgetRange: string | null;
  manualOperation: string | null;
  productionDependency: string | null;
  customerAccess: string | null;
  businessDaysPerYear: string | null;
  revenueConcentration: string | null;
  entityType: string | null;
};

const initialFormData: FormData = {
  name: '',
  description: '',
  size: 'MICRO',
  naceSection: null,
  legalForm: null,
  revenueRange: null,
  maturity: null,
  ownershipType: null,
  geographicScope: null,
  businessOrientation: null,
  digitalMaturity: null,
  esgStatus: null,
  supplyChainRole: null,
  riskProfile: null,
  euTaxonomyAligned: null,
  itSecurityStaff: null,
  securityMaturity: null,
  dataSensitivity: [],
  regulatoryObligations: [],
  itEndpointRange: null,
  infrastructureTypes: [],
  softwareDevelopment: null,
  publicFacingServices: null,
  targetedAttackLikelihood: null,
  downtimeTolerance: null,
  supplyChainPosition: null,
  securityBudgetRange: null,
  manualOperation: null,
  productionDependency: null,
  customerAccess: null,
  businessDaysPerYear: null,
  revenueConcentration: null,
  entityType: null,
};

function OrganizationOnboardContent() {
  const t = useTranslations('Organization');
  const tc = useTranslations('Common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrganization } = useOrganization();

  // Get organizationId from URL or active organization
  const organizationId = searchParams.get('id') || activeOrganization?.id;
  const isEditing = !!organizationId;

  // Current step index
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = WIZARD_STEPS[currentStepIndex];

  // Form data
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Auto-filled fields tracking
  const [autoFilledFields, setAutoFilledFields] = useState<AutoFilledFields>({});

  // Company lookup state
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupCountry, setLookupCountry] = useState('');
  const [lookupResults, setLookupResults] = useState<CompanySearchResult[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [supportedCountries, setSupportedCountries] = useState<string[]>([]);
  const lookupDebounce = useRef<NodeJS.Timeout | null>(null);

  // Track which fields have been filled (for sidebar progress)
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!!organizationId);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load existing organization data if editing
  useEffect(() => {
    if (organizationId) {
      setIsLoading(true);
      fetch(`/api/organization/${organizationId}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (data.success && data.data) {
            const org = data.data;
            setFormData({
              name: org.name || '',
              description: org.description || '',
              size: org.size || 'MICRO',
              naceSection: org.naceSection || null,
              legalForm: org.legalForm || null,
              revenueRange: org.revenueRange || null,
              maturity: org.maturity || null,
              ownershipType: org.ownershipType || null,
              geographicScope: org.geographicScope || null,
              businessOrientation: org.businessOrientation || null,
              digitalMaturity: org.digitalMaturity || null,
              esgStatus: org.esgStatus || null,
              supplyChainRole: org.supplyChainRole || null,
              riskProfile: org.riskProfile || null,
              euTaxonomyAligned: org.euTaxonomyAligned ?? null,
              itSecurityStaff: org.itSecurityStaff || null,
              securityMaturity: org.securityMaturity || null,
              dataSensitivity: org.dataSensitivity || [],
              regulatoryObligations: org.regulatoryObligations || [],
              itEndpointRange: org.itEndpointRange || null,
              infrastructureTypes: org.infrastructureTypes || [],
              softwareDevelopment: org.softwareDevelopment || null,
              publicFacingServices: org.publicFacingServices || null,
              targetedAttackLikelihood: org.targetedAttackLikelihood || null,
              downtimeTolerance: org.downtimeTolerance || null,
              supplyChainPosition: org.supplyChainPosition || null,
              securityBudgetRange: org.securityBudgetRange || null,
              manualOperation: org.manualOperation || null,
              productionDependency: org.productionDependency || null,
              customerAccess: org.customerAccess || null,
              businessDaysPerYear: org.businessDaysPerYear !== null && org.businessDaysPerYear !== undefined ? String(org.businessDaysPerYear) : null,
              revenueConcentration: org.revenueConcentration || null,
              entityType: org.entityType || null,
            });
            if (org.autoFilledFields && typeof org.autoFilledFields === 'object') {
              setAutoFilledFields(org.autoFilledFields as AutoFilledFields);
            }
          } else {
            console.error('API returned error:', data.error);
            toast.error(data.error || t('toast.loadError'));
          }
        })
        .catch((err) => {
          console.error('Failed to load organization:', err);
          toast.error(t('toast.loadError'));
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [organizationId, t]);

  // Company lookup search
  // Fetch supported countries on mount
  useEffect(() => {
    fetch('/api/company-lookup/countries')
      .then(res => res.json())
      .then(json => {
        const countries: string[] = json.countries ?? [];
        setSupportedCountries(countries);
        if (countries.length > 0) setLookupCountry(countries[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!lookupQuery.trim() || lookupQuery.length < 2) {
      setLookupResults([]);
      setLookupOpen(false);
      return;
    }
    if (lookupDebounce.current) clearTimeout(lookupDebounce.current);
    lookupDebounce.current = setTimeout(async () => {
      setLookupLoading(true);
      try {
        const res = await fetch(`/api/company-lookup?q=${encodeURIComponent(lookupQuery)}&country=${lookupCountry}`);
        const json = await res.json();
        setLookupResults(json.data ?? []);
        setLookupOpen(true);
      } catch {
        setLookupResults([]);
      } finally {
        setLookupLoading(false);
      }
    }, 400);
    return () => { if (lookupDebounce.current) clearTimeout(lookupDebounce.current); };
  }, [lookupQuery, lookupCountry]);

  // Handle company selection from lookup
  const handleCompanySelect = useCallback((company: CompanySearchResult) => {
    const newAutoFilled: AutoFilledFields = {};
    const applyIfPresent = (key: keyof FormData, value: string | null) => {
      if (value !== null) newAutoFilled[key] = { source: company.source, confirmedAt: null };
    };
    applyIfPresent('name', company.name || null);
    applyIfPresent('size', company.size);
    applyIfPresent('naceSection', company.naceSection);
    applyIfPresent('legalForm', company.legalForm);
    applyIfPresent('geographicScope', company.geographicScope);
    applyIfPresent('ownershipType', company.ownershipType);
    setFormData(prev => ({
      ...prev,
      name: company.name || prev.name,
      size: company.size ?? prev.size,
      naceSection: company.naceSection ?? prev.naceSection,
      legalForm: company.legalForm ?? prev.legalForm,
      geographicScope: company.geographicScope ?? prev.geographicScope,
      ownershipType: company.ownershipType ?? prev.ownershipType,
    }));
    setAutoFilledFields(prev => ({ ...prev, ...newAutoFilled }));
    setLookupQuery('');
    setLookupOpen(false);
    setLookupResults([]);
  }, []);

  // Confirm a single auto-filled field
  const confirmAutoFilledField = useCallback((key: string) => {
    setAutoFilledFields(prev => {
      if (!prev[key]) return prev;
      return { ...prev, [key]: { ...prev[key], confirmedAt: new Date().toISOString() } };
    });
  }, []);

  // Auto-save with debounce
  const saveData = useCallback(
    async (data: FormData) => {
      if (!data.name.trim()) return;

      setIsSaving(true);

      try {
        const method = isEditing ? 'PATCH' : 'POST';
        const url = isEditing ? `/api/organization/${organizationId}` : '/api/organization';

        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            description: data.description || null,
            size: data.size,
            naceSection: data.naceSection,
            legalForm: data.legalForm,
            revenueRange: data.revenueRange,
            maturity: data.maturity,
            ownershipType: data.ownershipType,
            geographicScope: data.geographicScope,
            businessOrientation: data.businessOrientation,
            digitalMaturity: data.digitalMaturity,
            esgStatus: data.esgStatus,
            supplyChainRole: data.supplyChainRole,
            riskProfile: data.riskProfile,
            euTaxonomyAligned: data.euTaxonomyAligned,
            itSecurityStaff: data.itSecurityStaff,
            securityMaturity: data.securityMaturity,
            dataSensitivity: data.dataSensitivity,
            regulatoryObligations: data.regulatoryObligations,
            itEndpointRange: data.itEndpointRange,
            infrastructureTypes: data.infrastructureTypes,
            softwareDevelopment: data.softwareDevelopment,
            publicFacingServices: data.publicFacingServices,
            targetedAttackLikelihood: data.targetedAttackLikelihood,
            downtimeTolerance: data.downtimeTolerance,
            supplyChainPosition: data.supplyChainPosition,
            securityBudgetRange: data.securityBudgetRange,
            manualOperation: data.manualOperation,
            productionDependency: data.productionDependency,
            customerAccess: data.customerAccess,
            businessDaysPerYear: data.businessDaysPerYear !== null ? parseInt(data.businessDaysPerYear, 10) : null,
            revenueConcentration: data.revenueConcentration,
            entityType: data.entityType,
            autoFilledFields,
          }),
        });
      } catch (error) {
        console.error('Failed to save organization:', error);
        toast.error(t('toast.saveError'));
      } finally {
        setIsSaving(false);
      }
    },
    [isEditing, organizationId, t, autoFilledFields]
  );

  // Debounced save effect
  useEffect(() => {
    if (isLoading) return;

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(() => {
      saveData(formData);
    }, 800);

    setSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, isLoading]);

  // Handle field change — auto-confirm auto-filled field on manual edit
  const handleFieldChange = (key: string, value: string | string[] | boolean | null) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setAutoFilledFields((prev) => {
      if (!prev[key] || prev[key].confirmedAt !== null) return prev;
      return { ...prev, [key]: { ...prev[key], confirmedAt: new Date().toISOString() } };
    });
  };

  // Handle multiselect toggle
  const handleMultiselectToggle = (key: string, value: string) => {
    setFormData((prev) => {
      const currentValues = prev[key as keyof FormData] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      return { ...prev, [key]: newValues };
    });
  };

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex]);

  const goToNext = useCallback(() => {
    if (currentStepIndex < WIZARD_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }, [currentStepIndex]);

  const handleFinish = useCallback(() => {
    router.push('/workflows/customer-onboarding/organization/summary');
  }, [router]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  // Calculate step completion status
  const getStepStatus = (stepIndex: number): 'complete' | 'current' | 'upcoming' => {
    if (stepIndex < currentStepIndex) {
      const step = WIZARD_STEPS[stepIndex];
      const allFilled = step.fields.every((field) => {
        if (!field.required) return true;
        const value = formData[field.key as keyof FormData];
        if (Array.isArray(value)) return value.length > 0;
        return value !== null && value !== '';
      });
      return allFilled ? 'complete' : 'current';
    }
    if (stepIndex === currentStepIndex) return 'current';
    return 'upcoming';
  };

  // Handle exit - go back to workflow
  const handleExit = () => {
    router.push('/workflows/customer-onboarding');
  };

  // Render field
  const renderField = (field: FieldConfig) => {
    const value = formData[field.key as keyof FormData];
    const autoFilled = autoFilledFields[field.key];
    const isUnconfirmed = !!autoFilled && autoFilled.confirmedAt === null;

    let fieldContent: React.ReactNode = null;

    switch (field.type) {
      case 'number':
        fieldContent = (
          <div className="space-y-2">
            <Label htmlFor={field.key}>
              {t(field.labelKey)}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.key}
              type="number"
              value={value !== null && value !== undefined ? String(value) : ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value || null)}
              placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
              className="w-full dark:!bg-transparent"
            />
            {field.helperKey && (
              <p className="text-xs text-muted-foreground">{t(field.helperKey)}</p>
            )}
          </div>
        );
        break;

      case 'text':
        fieldContent = (
          <div className="space-y-2">
            <Label htmlFor={field.key}>
              {t(field.labelKey)}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.key}
              value={value as string}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
              className="w-full dark:!bg-transparent"
            />
            {field.helperKey && (
              <p className="text-xs text-muted-foreground">{t(field.helperKey)}</p>
            )}
          </div>
        );
        break;

      case 'textarea':
        fieldContent = (
          <div className="space-y-2">
            <Label htmlFor={field.key}>{t(field.labelKey)}</Label>
            <Textarea
              id={field.key}
              value={value as string}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
              className="w-full min-h-[100px] dark:!bg-transparent"
            />
            {field.helperKey && (
              <p className="text-xs text-muted-foreground">{t(field.helperKey)}</p>
            )}
          </div>
        );
        break;

      case 'select':
        fieldContent = (
          <div className="space-y-2">
            <Label htmlFor={field.key}>{t(field.labelKey)}</Label>
            <Select
              value={value === true ? 'true' : value === false ? 'false' : (value as string) || ''}
              onValueChange={(v) => {
                if (field.key === 'euTaxonomyAligned') {
                  handleFieldChange(field.key, v === 'true' ? true : v === 'false' ? false : null);
                } else {
                  handleFieldChange(field.key, v || null);
                }
              }}
            >
              <SelectTrigger className="w-full dark:!bg-transparent">
                <SelectValue
                  placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
                />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.helperKey && (
              <p className="text-xs text-muted-foreground">{t(field.helperKey)}</p>
            )}
          </div>
        );
        break;

      case 'multiselect':
        fieldContent = (
          <div className="space-y-2">
            <Label>{t(field.labelKey)}</Label>
            <div className="w-full space-y-2 p-3 border border-input rounded-md">
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.key}-${option.value}`}
                    checked={(value as string[]).includes(option.value)}
                    onCheckedChange={() => handleMultiselectToggle(field.key, option.value)}
                  />
                  <Label
                    htmlFor={`${field.key}-${option.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {t(option.labelKey)}
                  </Label>
                </div>
              ))}
            </div>
            {field.helperKey && (
              <p className="text-xs text-muted-foreground">{t(field.helperKey)}</p>
            )}
          </div>
        );
        break;
    }

    if (!fieldContent) return null;

    if (isUnconfirmed) {
      return (
        <div key={field.key} className="rounded-md ring-2 ring-amber-400/60 ring-offset-2 ring-offset-background p-3 -m-3 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {t('companyLookup.autoFilledFrom', { source: autoFilled!.source })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
              onClick={() => confirmAutoFilledField(field.key)}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {t('companyLookup.confirm')}
            </Button>
          </div>
          {fieldContent}
        </div>
      );
    }

    return <div key={field.key}>{fieldContent}</div>;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <p className="text-muted-foreground">{t('onboard.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Workflow Header */}
      <header className="shrink-0 border-b bg-background px-6 py-3">
        <Button
          variant="secondary"
          size="sm"
          className="gap-2 cursor-pointer"
          onClick={handleExit}
        >
          <ArrowLeft className="h-4 w-4" />
          {tc('navigation.workflow')}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-foreground">
                {isEditing ? t('onboard.titleEdit') : t('onboard.title')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{t('onboard.subtitle')}</p>
            </div>

            {/* Step Content */}
            <div className="border rounded-lg p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-foreground">{t(currentStep.titleKey)}</h2>
                {isSaving && (
                  <span className="text-xs text-muted-foreground">{t('onboard.saving')}</span>
                )}
              </div>

              {/* Company lookup — shown only on basics step */}
              {currentStep.id === 'basics' && supportedCountries.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('companyLookup.searchLabel')}</Label>
                  <div className="flex gap-2">
                    {supportedCountries.length > 1 && (
                    <Select value={lookupCountry} onValueChange={setLookupCountry}>
                      <SelectTrigger className="w-24 shrink-0 dark:!bg-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {supportedCountries.includes('DK') && <SelectItem value="DK">🇩🇰 DK</SelectItem>}
                        {supportedCountries.includes('NO') && <SelectItem value="NO">🇳🇴 NO</SelectItem>}
                      </SelectContent>
                    </Select>
                    )}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={lookupQuery}
                        onChange={(e) => setLookupQuery(e.target.value)}
                        placeholder={t('companyLookup.searchPlaceholder')}
                        className="pl-9 dark:!bg-transparent"
                      />
                      {lookupLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('companyLookup.searchHelper')}</p>

                  {lookupOpen && lookupResults.length > 0 && (
                    <div className="border border-input rounded-md bg-background shadow-md max-h-56 overflow-y-auto">
                      {lookupResults.map((company) => (
                        <button
                          key={`${company.source}-${company.id}`}
                          type="button"
                          className="w-full flex flex-col px-4 py-3 text-left hover:bg-muted/60 transition-colors border-b border-muted last:border-b-0"
                          onClick={() => handleCompanySelect(company)}
                        >
                          <span className="font-medium text-sm">{company.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {[company.registrationNumber, company.address, company.industryDescription]
                              .filter(Boolean).join(' · ')}
                          </span>
                          <span className="text-xs text-muted-foreground/60 mt-0.5">{company.source}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {lookupOpen && !lookupLoading && lookupResults.length === 0 && (
                    <p className="text-xs text-muted-foreground px-1">
                      {t('companyLookup.noResults')}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-6">{currentStep.fields.map((field) => renderField(field))}</div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between border-t border-muted pt-4 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPrevious}
                disabled={currentStepIndex === 0}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                {tc('navigation.previous')}
              </Button>

              <span className="text-sm text-muted-foreground">
                {currentStepIndex + 1} / {WIZARD_STEPS.length}
              </span>

              {currentStepIndex === WIZARD_STEPS.length - 1 ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleFinish}
                  className="gap-2 cursor-pointer"
                >
                  {tc('navigation.finish')}
                  <Check className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNext}
                  className="gap-2 cursor-pointer"
                >
                  {tc('navigation.next')}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Step Index */}
        <div className="w-72 shrink-0 h-full overflow-y-auto border-l border-muted-foreground">
          <div className="p-4 border-b bg-muted/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {t('onboard.steps.title')}
            </p>
          </div>

          <div className="py-2 pr-2">
            {WIZARD_STEPS.map((step, index) => {
              const status = getStepStatus(index);
              const isSelected = index === currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={`
                    relative flex items-center gap-3 pl-4 pr-2 py-2 cursor-pointer text-sm
                    border-l-2 transition-colors
                    ${
                      isSelected
                        ? 'border-l-primary text-foreground font-medium'
                        : 'border-l-transparent hover:border-l-muted-foreground/30 text-muted-foreground hover:text-foreground'
                    }
                  `}
                  onClick={() => setCurrentStepIndex(index)}
                >
                  <div
                    className={`
                    w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0
                    ${
                      status === 'complete'
                        ? 'bg-primary text-primary-foreground'
                        : status === 'current'
                          ? 'border-2 border-primary text-primary'
                          : 'border border-muted-foreground/30 text-muted-foreground'
                    }
                  `}
                  >
                    {status === 'complete' ? <Check className="w-3 h-3" /> : index + 1}
                  </div>
                  <span className="truncate">{t(step.titleKey)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowOrganizationOnboardPage() {
  const t = useTranslations('Organization');

  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-background items-center justify-center">
          <p className="text-muted-foreground">{t('onboard.loading')}</p>
        </div>
      }
    >
      <OrganizationOnboardContent />
    </Suspense>
  );
}
