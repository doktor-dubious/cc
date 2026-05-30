// ── Structural Risk Exposure Report Generator ──────────────────────────────────
// Generates comprehensive risk exposure reports based on organization profile
// and gap analysis recommendations

import type { OrganizationProfile, GapRecommendation } from '@/lib/gap-analysis/recommendation-engine';
import type {
  NaceSection,
  RegulatoryObligation,
  DowntimeTolerance,
  TargetedAttackLikelihood,
  PublicFacingServices,
  SupplyChainPosition,
  CustomerAccess,
  DigitalMaturity,
  InfrastructureType,
  ProductionDependency,
  DataSensitivity,
  SecurityMaturity,
} from '@prisma/client';

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────

export type RiskLevel = 'Low' | 'Moderate' | 'Elevated' | 'High' | 'Severe';

export type ExposureDriver = {
  name: string;
  assessment: RiskLevel;
  reasoning: string;
};

export type StructuralRiskReport = {
  organizationName: string;
  generatedDate: string;
  exposureIndicators: ExposureDriver[];
  structuralInterpretation: string;
  priorityControlDomains: string[];
  nextSteps: string;
  factorSnapshot: FactorSnapshot;
};

// Sanitized, human-readable view of the profile + scoring outputs.
// This is what gets sent to Claude as grounding for prose generation —
// no raw enum tokens, no NONE_NOT_SURE leakage.
export type FactorSnapshot = {
  organizationName: string;
  sector: string | null;
  digitalMaturity: string | null;
  securityMaturity: string | null;
  productionDependency: string | null;
  customerAccess: string | null;
  supplyChainPosition: string | null;
  downtimeTolerance: string | null;
  publicFacingServices: string | null;
  targetedAttackLikelihood: string | null;
  infrastructureTypes: string[];
  dataSensitivity: string[];
  regulatoryObligations: string[];
  exposureIndicators: ExposureDriver[];
  priorityControlDomains: string[];
};

// ────────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────────────────────────────────────────────

const NACE_SECTION_NAMES: Record<NaceSection, string> = {
  A: 'Agriculture, Forestry and Fishing',
  B: 'Mining and Quarrying',
  C: 'Manufacturing',
  D: 'Electricity, Gas, Steam and Air Conditioning Supply',
  E: 'Water Supply; Sewerage, Waste Management',
  F: 'Construction',
  G: 'Wholesale and Retail Trade',
  H: 'Transportation and Storage',
  I: 'Accommodation and Food Service',
  J: 'Information and Communication',
  K: 'Financial and Insurance Activities',
  L: 'Real Estate Activities',
  M: 'Professional, Scientific and Technical',
  N: 'Administrative and Support Service',
  O: 'Public Administration and Defense',
  P: 'Education',
  Q: 'Human Health and Social Work',
  R: 'Arts, Entertainment and Recreation',
  S: 'Other Service Activities',
  OTHER: 'Other / Not Classified',
};

// ── Human-readable enum label maps (used for the factor snapshot) ──────────────

const DIGITAL_MATURITY_LABELS: Record<string, string> = {
  TRADITIONAL:    'traditional infrastructure',
  DEVELOPING:     'actively digitizing',
  MATURE:         'digitally mature',
  DIGITAL_NATIVE: 'digital-native',
};

const SECURITY_MATURITY_LABELS: Record<string, string> = {
  INITIAL:    'initial / ad-hoc',
  MANAGED:    'managed',
  DEFINED:    'defined',
  OPTIMIZING: 'optimizing',
};

const PRODUCTION_DEPENDENCY_LABELS: Record<string, string> = {
  NONE:    'no IT dependency for production',
  PARTIAL: 'partial IT dependency for production',
  DIRECT:  'full IT dependency for production',
};

const CUSTOMER_ACCESS_LABELS: Record<string, string> = {
  NONE:      'no digital customer channels',
  PARTIAL:   'partly digital customer access',
  ESSENTIAL: 'digital-only customer access (no fallback)',
};

const SUPPLY_CHAIN_LABELS: Record<string, string> = {
  END_CONSUMER:      'sells primarily to end consumers',
  B2B_PROVIDER:      'tier-1 B2B supplier',
  CRITICAL_SUPPLIER: 'critical supplier to essential services',
};

const DOWNTIME_LABELS: Record<string, string> = {
  NEAR_ZERO: 'less than 1 hour',
  HOURS:     'less than 24 hours',
  DAYS:      'a few days',
  WEEKS:     'one or more weeks',
};

const PUBLIC_FACING_LABELS: Record<string, string> = {
  NONE:              'no public-facing services',
  ECOMMERCE_PORTALS: 'public e-commerce or customer portals',
  CRITICAL_SERVICES: 'public-facing critical services',
};

const TARGETED_ATTACK_LABELS: Record<string, string> = {
  LOW:    'low targeted-attack likelihood',
  MEDIUM: 'moderate targeted-attack likelihood',
  HIGH:   'high targeted-attack likelihood',
};

const INFRASTRUCTURE_LABELS: Record<string, string> = {
  ON_PREMISE: 'on-premise',
  CLOUD:      'cloud',
  HYBRID:     'hybrid',
  OT_ICS:     'OT / ICS',
};

const DATA_SENSITIVITY_LABELS: Record<string, string> = {
  PUBLIC:           'public data',
  INTERNAL:         'internal-only data',
  PII:              'personally identifiable information',
  SPECIAL_CATEGORY: 'special-category personal data',
  FINANCIAL:        'financial records',
  HEALTH:           'health records',
  TRADE_SECRET:     'trade secrets',
};

const REGULATION_LABELS: Record<string, string> = {
  GDPR:               'GDPR',
  NIS2:               'NIS2',
  DORA:               'DORA',
  EU_AI_ACT:          'EU AI Act',
  PCI_DSS:            'PCI-DSS',
  INDUSTRY_SPECIFIC:  'industry-specific regulation',
  CYBER_INSURANCE:    'cyber-insurance requirements',
  // NONE_NOT_SURE is intentionally excluded — it represents absence, not an obligation.
};

function mapLabel(map: Record<string, string>, value: string | null | undefined): string | null {
  if (!value) return null;
  return map[value] ?? null;
}

function mapLabels(map: Record<string, string>, values: readonly string[] | null | undefined): string[] {
  if (!values) return [];
  return values.map(v => map[v]).filter((v): v is string => Boolean(v));
}

// ────────────────────────────────────────────────────────────────────────────────
// Assessment Functions
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Assess IT Dependency Level
 * Factors: digitalMaturity, infrastructureTypes, productionDependency
 */
function assessItDependency(profile: OrganizationProfile): { level: RiskLevel; reasoning: string } {
  let score = 0;
  const reasons: string[] = [];

  // Digital maturity
  if (profile.digitalMaturity === 'DIGITAL_NATIVE') {
    score += 3;
    reasons.push('digital-native operations');
  } else if (profile.digitalMaturity === 'MATURE') {
    score += 2;
    reasons.push('digitally advanced infrastructure');
  } else if (profile.digitalMaturity === 'DEVELOPING') {
    score += 1;
  }

  // Infrastructure types
  const cloudInfra = profile.infrastructureTypes?.includes('CLOUD' as InfrastructureType);
  const hybridInfra = profile.infrastructureTypes?.includes('HYBRID' as InfrastructureType);
  if (cloudInfra || hybridInfra) {
    score += 2;
    reasons.push('cloud/hybrid infrastructure dependency');
  }

  // Production dependency
  if (profile.productionDependency === 'DIRECT') {
    score += 3;
    reasons.push('full production dependency on IT systems');
  } else if (profile.productionDependency === 'PARTIAL') {
    score += 2;
    reasons.push('high production dependency');
  }

  // Customer access
  if (profile.customerAccess === 'ESSENTIAL') {
    score += 2;
    reasons.push('digital-only customer access');
  } else if (profile.customerAccess === 'PARTIAL') {
    score += 1;
  }

  // Determine level
  let level: RiskLevel;
  if (score >= 7) level = 'Severe';
  else if (score >= 5) level = 'High';
  else if (score >= 3) level = 'Elevated';
  else if (score >= 1) level = 'Moderate';
  else level = 'Low';

  const reasoning = reasons.length > 0
    ? `Core operations dependent on ${reasons.join(', ')}`
    : 'Limited IT dependency';

  return { level, reasoning };
}

/**
 * Assess Regulatory Pressure
 * Factors: regulatoryObligations, naceSection, dataSensitivity
 */
function assessRegulatoryPressure(profile: OrganizationProfile): { level: RiskLevel; reasoning: string } {
  let score = 0;
  const reasons: string[] = [];

  // Regulatory obligations
  const regCount = profile.regulatoryObligations?.length || 0;
  if (regCount >= 3) {
    score += 3;
    reasons.push(`${regCount} regulatory frameworks`);
  } else if (regCount === 2) {
    score += 2;
    reasons.push('multiple regulatory obligations');
  } else if (regCount === 1) {
    score += 1;
    reasons.push(profile.regulatoryObligations?.[0] || 'regulatory compliance');
  }

  // Critical sectors with high regulatory pressure
  const criticalSectors: NaceSection[] = ['K', 'Q', 'D', 'E', 'O'];
  if (profile.naceSection && criticalSectors.includes(profile.naceSection)) {
    score += 2;
    reasons.push(`${NACE_SECTION_NAMES[profile.naceSection]} sector`);
  }

  // Data sensitivity
  const hasPII = profile.dataSensitivity?.includes('PII' as DataSensitivity);
  const hasSpecialCategory = profile.dataSensitivity?.includes('SPECIAL_CATEGORY' as DataSensitivity);
  if (hasSpecialCategory) {
    score += 2;
    reasons.push('special category data processing');
  } else if (hasPII) {
    score += 1;
  }

  // Determine level
  let level: RiskLevel;
  if (score >= 6) level = 'Severe';
  else if (score >= 4) level = 'High';
  else if (score >= 2) level = 'Elevated';
  else if (score >= 1) level = 'Moderate';
  else level = 'Low';

  const reasoning = reasons.length > 0
    ? `Subject to ${reasons.join(', ')}`
    : 'Limited regulatory requirements';

  return { level, reasoning };
}

/**
 * Assess Customer Criticality
 * Factors: supplyChainPosition, customerAccess, naceSection
 */
function assessCustomerCriticality(profile: OrganizationProfile): { level: RiskLevel; reasoning: string } {
  let score = 0;
  const reasons: string[] = [];

  // Supply chain position
  if (profile.supplyChainPosition === 'CRITICAL_SUPPLIER') {
    score += 3;
    reasons.push('critical supplier to essential services');
  } else if (profile.supplyChainPosition === 'B2B_PROVIDER') {
    score += 2;
    reasons.push('tier-1 supplier position');
  }

  // Customer access requirements
  if (profile.customerAccess === 'ESSENTIAL') {
    score += 2;
    reasons.push('no alternative access channels');
  } else if (profile.customerAccess === 'PARTIAL') {
    score += 1;
    reasons.push('primary digital customer interface');
  }

  // Critical service sectors
  const criticalServiceSectors: NaceSection[] = ['Q', 'D', 'E', 'H', 'K'];
  if (profile.naceSection && criticalServiceSectors.includes(profile.naceSection)) {
    score += 2;
    reasons.push('essential service delivery');
  }

  // Determine level
  let level: RiskLevel;
  if (score >= 6) level = 'Severe';
  else if (score >= 4) level = 'High';
  else if (score >= 2) level = 'Elevated';
  else if (score >= 1) level = 'Moderate';
  else level = 'Low';

  const reasoning = reasons.length > 0
    ? `Positioned as ${reasons.join(', ')}`
    : 'Standard customer relationship';

  return { level, reasoning };
}

/**
 * Assess Downtime Sensitivity
 * Factors: downtimeTolerance, productionDependency, customerAccess
 */
function assessDowntimeSensitivity(profile: OrganizationProfile): { level: RiskLevel; reasoning: string } {
  let score = 0;
  const reasons: string[] = [];

  // Downtime tolerance (primary factor)
  if (profile.downtimeTolerance === 'NEAR_ZERO') {
    score += 4;
    reasons.push('<1 hour disruption tolerance');
  } else if (profile.downtimeTolerance === 'HOURS') {
    score += 2;
    reasons.push('<24 hours disruption tolerance');
  } else if (profile.downtimeTolerance === 'DAYS') {
    score += 1;
  }

  // Production dependency amplifies sensitivity
  if (profile.productionDependency === 'DIRECT') {
    score += 2;
    reasons.push('full operational dependency');
  } else if (profile.productionDependency === 'PARTIAL') {
    score += 1;
  }

  // Customer access
  if (profile.customerAccess === 'ESSENTIAL') {
    score += 1;
    reasons.push('no fallback channels');
  }

  // Determine level
  let level: RiskLevel;
  if (score >= 6) level = 'Severe';
  else if (score >= 4) level = 'High';
  else if (score >= 2) level = 'Elevated';
  else if (score >= 1) level = 'Moderate';
  else level = 'Low';

  const reasoning = reasons.length > 0
    ? `Operational tolerance: ${reasons.join(', ')}`
    : 'Flexible downtime tolerance';

  return { level, reasoning };
}

/**
 * Assess Threat Targeting Likelihood
 * Factors: targetedAttackLikelihood, publicFacingServices, naceSection
 */
function assessThreatTargeting(profile: OrganizationProfile): { level: RiskLevel; reasoning: string } {
  let score = 0;
  const reasons: string[] = [];

  // Targeted attack likelihood
  if (profile.targetedAttackLikelihood === 'HIGH') {
    score += 4;
    reasons.push('known targeted threat profile');
  } else if (profile.targetedAttackLikelihood === 'MEDIUM') {
    score += 2;
    reasons.push('moderate threat exposure');
  } else if (profile.targetedAttackLikelihood === 'LOW') {
    score += 1;
  }

  // Public-facing services
  if (profile.publicFacingServices === 'CRITICAL_SERVICES') {
    score += 2;
    reasons.push('extensive public attack surface');
  } else if (profile.publicFacingServices === 'ECOMMERCE_PORTALS') {
    score += 1;
    reasons.push('public-facing services');
  }

  // High-value target sectors
  const highValueSectors: NaceSection[] = ['K', 'Q', 'D', 'E', 'O', 'J'];
  if (profile.naceSection && highValueSectors.includes(profile.naceSection)) {
    score += 1;
    reasons.push('high-value target sector');
  }

  // Determine level
  let level: RiskLevel;
  if (score >= 6) level = 'Severe';
  else if (score >= 4) level = 'High';
  else if (score >= 2) level = 'Elevated';
  else if (score >= 1) level = 'Moderate';
  else level = 'Low';

  const reasoning = reasons.length > 0
    ? `Threat profile: ${reasons.join(', ')}`
    : 'Limited threat targeting';

  return { level, reasoning };
}

/**
 * Generate structural risk interpretation narrative
 */
function generateStructuralInterpretation(
  profile: OrganizationProfile,
  organizationName: string
): string {
  const paragraphs: string[] = [];

  // Business model paragraph
  const sectorName = profile.naceSection ? NACE_SECTION_NAMES[profile.naceSection] : 'business';
  const digitalContext =
    profile.digitalMaturity === 'DIGITAL_NATIVE' ? 'operates as a digital-native organization' :
    profile.digitalMaturity === 'MATURE' ? 'maintains digitally advanced operations' :
    profile.digitalMaturity === 'DEVELOPING' ? 'is actively digitizing operations' :
    'operates with traditional infrastructure';

  let businessModel = `${organizationName} ${digitalContext}`;
  if (profile.naceSection) {
    businessModel += ` within the ${sectorName.toLowerCase()} sector`;
  }
  businessModel += '.';

  paragraphs.push(businessModel);

  // Revenue and criticality
  const criticalityFactors: string[] = [];

  if (profile.productionDependency === 'DIRECT') {
    criticalityFactors.push('Core revenue generation is fully dependent on digital service availability');
  } else if (profile.productionDependency === 'PARTIAL') {
    criticalityFactors.push('Revenue generation has high dependency on operational IT systems');
  }

  if (profile.supplyChainPosition === 'CRITICAL_SUPPLIER') {
    criticalityFactors.push('The company is positioned as a critical supplier within essential service value chains');
  } else if (profile.supplyChainPosition === 'B2B_PROVIDER') {
    criticalityFactors.push('The organization holds a tier-1 supplier position');
  }

  if (criticalityFactors.length > 0) {
    paragraphs.push(criticalityFactors.join('. ') + '.');
  }

  // Regulatory and operational requirements
  const regulatoryFactors: string[] = [];

  const regLabels = mapLabels(REGULATION_LABELS, profile.regulatoryObligations);
  if (regLabels.length > 0) {
    regulatoryFactors.push(`The company is subject to ${regLabels.join(', ')} compliance requirements`);
  }

  if (profile.downtimeTolerance === 'NEAR_ZERO' || profile.downtimeTolerance === 'HOURS') {
    const hours = profile.downtimeTolerance === 'NEAR_ZERO' ? '<1' : '<24';
    regulatoryFactors.push(`Operational tolerance for disruption is low (${hours} hours), increasing structural exposure to service interruption risk`);
  }

  if (regulatoryFactors.length > 0) {
    paragraphs.push(regulatoryFactors.join('. ') + '.');
  }

  // Security maturity assessment
  let maturityAssessment = '';
  if (profile.securityMaturity === 'OPTIMIZING') {
    maturityAssessment = 'A mature security program is in place with established controls and processes.';
  } else if (profile.securityMaturity === 'DEFINED' || profile.securityMaturity === 'MANAGED') {
    maturityAssessment = 'While a defined security program is in place, current organizational setup indicates limited operational buffer in the event of prolonged disruption.';
  } else {
    maturityAssessment = 'Security program maturity is limited, indicating vulnerability to operational disruptions.';
  }
  paragraphs.push(maturityAssessment);

  // Summary conclusion
  const exposureFactors: string[] = [];

  // IT dependency
  if (profile.digitalMaturity === 'DIGITAL_NATIVE' || profile.digitalMaturity === 'MATURE') {
    exposureFactors.push('high IT dependency');
  }

  // Regulatory
  if (regLabels.length >= 2) {
    exposureFactors.push('regulated environment');
  }

  // Supply chain
  if (profile.supplyChainPosition === 'CRITICAL_SUPPLIER' || profile.supplyChainPosition === 'B2B_PROVIDER') {
    exposureFactors.push('critical supply chain position');
  }

  // Downtime
  if (profile.downtimeTolerance === 'NEAR_ZERO' || profile.downtimeTolerance === 'HOURS') {
    exposureFactors.push('low downtime tolerance');
  }

  // Public services
  if (profile.publicFacingServices === 'CRITICAL_SERVICES' || profile.publicFacingServices === 'ECOMMERCE_PORTALS') {
    exposureFactors.push('public-facing digital services');
  }

  if (exposureFactors.length > 0) {
    const exposureLevel = exposureFactors.length >= 4 ? 'elevated' : 'moderate';
    paragraphs.push(
      `Overall, ${organizationName} demonstrates structurally ${exposureLevel} operational exposure driven by ${exposureFactors.join(', ')}.`
    );
  }

  return paragraphs.join('\n\n');
}

/**
 * Determine priority control domains based on risk profile and gap analysis
 */
function determinePriorityControlDomains(
  profile: OrganizationProfile,
  recommendation: GapRecommendation
): string[] {
  const priorities: { domain: string; score: number }[] = [];

  // Map CIS Controls to domain names
  const controlDomainMap: Record<number, string> = {
    1: 'Asset Management',
    2: 'Software & Hardware Asset Management',
    3: 'Data Protection',
    4: 'Configuration Management',
    5: 'Account Management',
    6: 'Access Control Management',
    7: 'Continuous Vulnerability Management',
    8: 'Audit Log Management',
    9: 'Email & Web Browser Protection',
    10: 'Malware Defense',
    11: 'Data Recovery',
    12: 'Network Infrastructure Management',
    13: 'Network Monitoring & Defense',
    14: 'Security Awareness Training',
    15: 'Service Provider Management',
    16: 'Application Software Security',
    17: 'Incident Response',
    18: 'Penetration Testing',
  };

  // Score based on relevance from gap analysis
  for (const control of recommendation.controls) {
    const domain = controlDomainMap[control.controlId];
    if (domain) {
      priorities.push({ domain, score: control.relevanceScore });
    }
  }

  // Additional scoring based on risk profile
  const riskAdjustments: Record<string, number> = {};

  // High downtime sensitivity → prioritize backup & incident response
  if (profile.downtimeTolerance === 'NEAR_ZERO' || profile.downtimeTolerance === 'HOURS') {
    riskAdjustments['Data Recovery'] = 20;
    riskAdjustments['Incident Response'] = 20;
    riskAdjustments['Network Infrastructure Management'] = 15;
  }

  // High regulatory pressure → prioritize audit & data protection
  const regCount = profile.regulatoryObligations?.length || 0;
  if (regCount >= 2) {
    riskAdjustments['Audit Log Management'] = 15;
    riskAdjustments['Data Protection'] = 15;
    riskAdjustments['Access Control Management'] = 10;
  }

  // Critical supplier → prioritize supplier management
  if (profile.supplyChainPosition === 'CRITICAL_SUPPLIER') {
    riskAdjustments['Service Provider Management'] = 20;
  }

  // High threat targeting → prioritize monitoring & defense
  if (profile.targetedAttackLikelihood === 'HIGH') {
    riskAdjustments['Network Monitoring & Defense'] = 20;
    riskAdjustments['Malware Defense'] = 15;
    riskAdjustments['Incident Response'] = 15;
  }

  // Public-facing services → prioritize web/email protection
  if (profile.publicFacingServices === 'CRITICAL_SERVICES') {
    riskAdjustments['Email & Web Browser Protection'] = 15;
    riskAdjustments['Application Software Security'] = 15;
  }

  // Apply risk adjustments
  priorities.forEach(p => {
    if (riskAdjustments[p.domain]) {
      p.score += riskAdjustments[p.domain];
    }
  });

  // Sort by score and return top 5-7 domains
  priorities.sort((a, b) => b.score - a.score);
  const topDomains = priorities.slice(0, 7).map(p => p.domain);

  // Ensure we always include certain critical domains if conditions are met
  const mustInclude: string[] = [];
  if (profile.downtimeTolerance === 'NEAR_ZERO' || profile.downtimeTolerance === 'HOURS') {
    if (!topDomains.includes('Data Recovery')) mustInclude.push('Data Recovery');
    if (!topDomains.includes('Incident Response')) mustInclude.push('Incident Response');
  }

  return [...new Set([...topDomains, ...mustInclude])].slice(0, 7);
}

/**
 * Get next steps text
 */
function getNextSteps(): string {
  return 'A subsequent GAP assessment would validate control maturity within prioritized domains and provide a quantified view of operational resilience.';
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Report Generator
// ────────────────────────────────────────────────────────────────────────────────

export function generateStructuralRiskReport(
  profile: OrganizationProfile,
  recommendation: GapRecommendation,
  organizationName: string
): StructuralRiskReport {
  // 1. Structural Exposure Indicators
  const itDep = assessItDependency(profile);
  const regPressure = assessRegulatoryPressure(profile);
  const customerCrit = assessCustomerCriticality(profile);
  const downtimeSens = assessDowntimeSensitivity(profile);
  const threatTarget = assessThreatTargeting(profile);

  const exposureIndicators: ExposureDriver[] = [
    { name: 'IT Dependency', assessment: itDep.level, reasoning: itDep.reasoning },
    { name: 'Regulatory Pressure', assessment: regPressure.level, reasoning: regPressure.reasoning },
    { name: 'Customer Criticality', assessment: customerCrit.level, reasoning: customerCrit.reasoning },
    { name: 'Downtime Sensitivity', assessment: downtimeSens.level, reasoning: downtimeSens.reasoning },
    { name: 'Threat Targeting', assessment: threatTarget.level, reasoning: threatTarget.reasoning },
  ];

  // 2. Structural Risk Interpretation
  const structuralInterpretation = generateStructuralInterpretation(profile, organizationName);

  // 3. Expected Priority Control Domains
  const priorityControlDomains = determinePriorityControlDomains(profile, recommendation);

  // 4. Next Steps
  const nextSteps = getNextSteps();

  // 5. Sanitized factor snapshot — used by the LLM interpreter as grounding
  const factorSnapshot = buildFactorSnapshot(
    profile,
    organizationName,
    exposureIndicators,
    priorityControlDomains,
  );

  return {
    organizationName,
    generatedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    exposureIndicators,
    structuralInterpretation,
    priorityControlDomains,
    nextSteps,
    factorSnapshot,
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// Factor Snapshot — sanitized grounding payload for the LLM interpreter
// ────────────────────────────────────────────────────────────────────────────────

export function buildFactorSnapshot(
  profile: OrganizationProfile,
  organizationName: string,
  exposureIndicators: ExposureDriver[],
  priorityControlDomains: string[],
): FactorSnapshot {
  return {
    organizationName,
    sector:                   profile.naceSection ? NACE_SECTION_NAMES[profile.naceSection] : null,
    digitalMaturity:          mapLabel(DIGITAL_MATURITY_LABELS,    profile.digitalMaturity),
    securityMaturity:         mapLabel(SECURITY_MATURITY_LABELS,   profile.securityMaturity),
    productionDependency:     mapLabel(PRODUCTION_DEPENDENCY_LABELS, profile.productionDependency),
    customerAccess:           mapLabel(CUSTOMER_ACCESS_LABELS,     profile.customerAccess),
    supplyChainPosition:      mapLabel(SUPPLY_CHAIN_LABELS,        profile.supplyChainPosition),
    downtimeTolerance:        mapLabel(DOWNTIME_LABELS,            profile.downtimeTolerance),
    publicFacingServices:     mapLabel(PUBLIC_FACING_LABELS,       profile.publicFacingServices),
    targetedAttackLikelihood: mapLabel(TARGETED_ATTACK_LABELS,     profile.targetedAttackLikelihood),
    infrastructureTypes:      mapLabels(INFRASTRUCTURE_LABELS, profile.infrastructureTypes),
    dataSensitivity:          mapLabels(DATA_SENSITIVITY_LABELS, profile.dataSensitivity),
    regulatoryObligations:    mapLabels(REGULATION_LABELS,      profile.regulatoryObligations),
    exposureIndicators,
    priorityControlDomains,
  };
}
