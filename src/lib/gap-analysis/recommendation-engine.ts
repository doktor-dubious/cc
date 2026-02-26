// ── CIS Controls v8 Recommendation Engine ──────────────────────────────────────
// Maps organization taxonomy/classification to recommended Implementation Group,
// and suggests which controls and safeguards should be active or inactive.

import { CIS_CONTROLS, type Safeguard } from '@/lib/constants/cis-controls';
import type {
  OrgSize,
  NaceSection,
  RiskProfile,
  ItSecurityStaff,
  SecurityMaturity,
  DataSensitivity,
  RegulatoryObligation,
  ItEndpointRange,
  InfrastructureType,
  SoftwareDevelopment,
  PublicFacingServices,
  TargetedAttackLikelihood,
  DowntimeTolerance,
  SupplyChainPosition,
  SecurityBudgetRange,
  DigitalMaturity,
  GeographicScope,
} from '@prisma/client';

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────

export type OrganizationProfile = {
  size?: OrgSize | null;
  ig?: number | null;
  naceSection?: NaceSection | null;
  riskProfile?: RiskProfile | null;
  geographicScope?: GeographicScope | null;
  digitalMaturity?: DigitalMaturity | null;
  itSecurityStaff?: ItSecurityStaff | null;
  securityMaturity?: SecurityMaturity | null;
  dataSensitivity?: DataSensitivity[] | null;
  regulatoryObligations?: RegulatoryObligation[] | null;
  itEndpointRange?: ItEndpointRange | null;
  infrastructureTypes?: InfrastructureType[] | null;
  softwareDevelopment?: SoftwareDevelopment | null;
  publicFacingServices?: PublicFacingServices | null;
  targetedAttackLikelihood?: TargetedAttackLikelihood | null;
  downtimeTolerance?: DowntimeTolerance | null;
  supplyChainPosition?: SupplyChainPosition | null;
  securityBudgetRange?: SecurityBudgetRange | null;
};

export type SafeguardRecommendation = {
  safeguardId: string;
  controlId: number;
  title: string;
  recommendedIg: number;
  shouldBeInactive: boolean;
  reasons: string[];
  relevanceScore: number;
};

export type ControlRecommendation = {
  controlId: number;
  title: string;
  shouldBeInactive: boolean;
  reasons: string[];
  relevanceScore: number;
  safeguards: SafeguardRecommendation[];
};

export type GapRecommendation = {
  recommendedIg: number;
  igReasons: string[];
  controls: ControlRecommendation[];
  summary: {
    totalControls: number;
    activeControls: number;
    inactiveControls: number;
    totalSafeguards: number;
    activeSafeguards: number;
    inactiveSafeguards: number;
  };
};

// ────────────────────────────────────────────────────────────────────────────────
// IG Recommendation Logic
// ────────────────────────────────────────────────────────────────────────────────

function calculateRecommendedIg(profile: OrganizationProfile): { ig: number; reasons: string[] } {
  let igScore = 1;
  const reasons: string[] = [];

  // Organization Size
  if (profile.size) {
    switch (profile.size) {
      case 'MICRO':
      case 'SMALL':
        reasons.push('Organization size (small/micro) suggests IG1 as baseline');
        break;
      case 'MEDIUM':
        igScore = Math.max(igScore, 2);
        reasons.push('Medium-sized organization typically requires IG2 controls');
        break;
      case 'LARGE':
      case 'ENTERPRISE':
        igScore = Math.max(igScore, 3);
        reasons.push('Large/Enterprise organization requires comprehensive IG3 controls');
        break;
    }
  }

  // IT Security Staff
  if (profile.itSecurityStaff) {
    switch (profile.itSecurityStaff) {
      case 'NO_DEDICATED_IT':
        reasons.push('No dedicated IT staff - IG1 essential cyber hygiene is appropriate');
        break;
      case 'IT_NO_SECURITY':
        reasons.push('IT staff without security specialization - IG1/IG2 depending on other factors');
        break;
      case 'DEDICATED_SECURITY':
        igScore = Math.max(igScore, 2);
        reasons.push('Dedicated security personnel enables IG2 implementation');
        break;
      case 'SPECIALIZED_SECURITY':
        igScore = Math.max(igScore, 3);
        reasons.push('Specialized security team (SOC, red team) can implement advanced IG3 controls');
        break;
    }
  }

  // Security Maturity
  if (profile.securityMaturity) {
    switch (profile.securityMaturity) {
      case 'NO_PROGRAM':
      case 'BASIC':
        reasons.push('Current security maturity suggests starting with IG1 foundations');
        break;
      case 'DEFINED':
        igScore = Math.max(igScore, 2);
        reasons.push('Defined security program can support IG2 controls');
        break;
      case 'MANAGED':
      case 'OPTIMIZING':
        igScore = Math.max(igScore, 3);
        reasons.push('Mature security program ready for comprehensive IG3 controls');
        break;
    }
  }

  // Regulatory Obligations
  if (profile.regulatoryObligations && profile.regulatoryObligations.length > 0) {
    const highIgRegulations = ['NIS2', 'DORA', 'PCI_DSS'];
    const hasHighIgRegulation = profile.regulatoryObligations.some(r => highIgRegulations.includes(r));

    if (hasHighIgRegulation) {
      igScore = Math.max(igScore, 2);
      reasons.push('Regulatory obligations (NIS2/DORA/PCI-DSS) require at least IG2 controls');
    }

    if (profile.regulatoryObligations.includes('DORA')) {
      igScore = Math.max(igScore, 3);
      reasons.push('DORA compliance typically requires IG3-level controls');
    }
  }

  // Data Sensitivity
  if (profile.dataSensitivity && profile.dataSensitivity.length > 0) {
    const highSensitivity = ['SPECIAL_CATEGORY', 'PAYMENT_CARD', 'CLASSIFIED_GOVERNMENT', 'CRITICAL_INFRASTRUCTURE'];
    const hasHighSensitivity = profile.dataSensitivity.some(d => highSensitivity.includes(d));

    if (hasHighSensitivity) {
      igScore = Math.max(igScore, 2);
      reasons.push('Handling sensitive data (special category/payment/classified) requires enhanced controls');
    }

    if (profile.dataSensitivity.includes('CRITICAL_INFRASTRUCTURE')) {
      igScore = Math.max(igScore, 3);
      reasons.push('Critical infrastructure data requires comprehensive IG3 security');
    }
  }

  // Targeted Attack Likelihood
  if (profile.targetedAttackLikelihood) {
    switch (profile.targetedAttackLikelihood) {
      case 'HIGH':
        igScore = Math.max(igScore, 3);
        reasons.push('High targeted attack likelihood requires advanced IG3 defenses');
        break;
      case 'MEDIUM':
        igScore = Math.max(igScore, 2);
        reasons.push('Medium targeted attack risk suggests IG2 controls');
        break;
    }
  }

  // Downtime Tolerance
  if (profile.downtimeTolerance === 'NEAR_ZERO') {
    igScore = Math.max(igScore, 2);
    reasons.push('Near-zero downtime tolerance requires robust IG2+ controls');
  }

  // Supply Chain Position
  if (profile.supplyChainPosition) {
    if (profile.supplyChainPosition === 'MSP_CLOUD_PROVIDER') {
      igScore = Math.max(igScore, 3);
      reasons.push('MSP/Cloud provider role requires IG3-level security to protect client data');
    } else if (profile.supplyChainPosition === 'CRITICAL_SUPPLIER') {
      igScore = Math.max(igScore, 2);
      reasons.push('Critical supplier status requires enhanced IG2+ controls');
    }
  }

  // IT Endpoints
  if (profile.itEndpointRange) {
    switch (profile.itEndpointRange) {
      case 'FROM_500_5000':
        igScore = Math.max(igScore, 2);
        reasons.push('Large endpoint count (500-5000) requires automated IG2 controls');
        break;
      case 'OVER_5000':
        igScore = Math.max(igScore, 3);
        reasons.push('Very large endpoint count (5000+) requires enterprise IG3 tools');
        break;
    }
  }

  // Public-facing services
  if (profile.publicFacingServices === 'CRITICAL_SERVICES') {
    igScore = Math.max(igScore, 2);
    reasons.push('Critical public-facing services require enhanced protection');
  }

  // Software Development
  if (profile.softwareDevelopment === 'SOFTWARE_IS_PRODUCT') {
    igScore = Math.max(igScore, 2);
    reasons.push('Software product company needs robust application security controls');
  }

  // Budget constraint note
  if (profile.securityBudgetRange === 'MINIMAL' || profile.securityBudgetRange === 'UNDER_50K') {
    if (igScore > 1) {
      reasons.push('Note: Budget constraints may require phased implementation approach');
    }
  }

  return { ig: Math.min(3, Math.max(1, igScore)), reasons };
}

// ────────────────────────────────────────────────────────────────────────────────
// Control Relevance Scoring
// ────────────────────────────────────────────────────────────────────────────────

function calculateControlRelevance(
  controlId: number,
  profile: OrganizationProfile
): { relevanceScore: number; shouldBeInactive: boolean; reasons: string[] } {
  let score = 80;
  const reasons: string[] = [];
  let shouldBeInactive = false;

  switch (controlId) {
    case 1: // Asset Inventory
      score = 100;
      reasons.push('Asset inventory is foundational for all security programs');
      break;

    case 2: // Software Inventory
      score = 100;
      reasons.push('Software inventory is critical for vulnerability management');
      break;

    case 3: // Data Protection
      score = 90;
      if (profile.dataSensitivity && profile.dataSensitivity.length > 0) {
        score = 100;
        reasons.push('Organization handles sensitive data - data protection is critical');
      }
      if (profile.regulatoryObligations?.includes('GDPR')) {
        score = 100;
        reasons.push('GDPR compliance requires robust data protection controls');
      }
      break;

    case 4: // Secure Configuration
      score = 95;
      reasons.push('Secure configuration is essential for reducing attack surface');
      break;

    case 5: // Account Management
      score = 100;
      reasons.push('Account management is fundamental to access control');
      break;

    case 6: // Access Control
      score = 100;
      reasons.push('Access control is essential for protecting resources');
      break;

    case 7: // Vulnerability Management
      score = 90;
      if (profile.publicFacingServices && profile.publicFacingServices !== 'NONE') {
        score = 100;
        reasons.push('Public-facing services require active vulnerability management');
      }
      break;

    case 8: // Audit Log Management
      score = 85;
      if (profile.regulatoryObligations && profile.regulatoryObligations.length > 0) {
        score = 95;
        reasons.push('Regulatory compliance requires comprehensive audit logging');
      }
      break;

    case 9: // Email and Web Protection
      score = 90;
      reasons.push('Email and web are primary attack vectors');
      break;

    case 10: // Malware Defenses
      score = 100;
      reasons.push('Malware defense is essential for all organizations');
      break;

    case 11: // Data Recovery
      score = 95;
      if (profile.downtimeTolerance === 'NEAR_ZERO') {
        score = 100;
        reasons.push('Low downtime tolerance requires robust data recovery');
      }
      break;

    case 12: // Network Infrastructure
      score = 85;
      if (profile.infrastructureTypes?.includes('ON_PREMISES') || profile.infrastructureTypes?.includes('HYBRID')) {
        score = 95;
        reasons.push('On-premises/hybrid infrastructure requires network management');
      }
      if (profile.infrastructureTypes?.length === 1 && profile.infrastructureTypes?.includes('CLOUD_ONLY')) {
        score = 65;
        reasons.push('Cloud-only infrastructure has reduced network management needs');
      }
      break;

    case 13: // Network Monitoring
      score = 80;
      if (profile.targetedAttackLikelihood === 'HIGH') {
        score = 100;
        reasons.push('High threat environment requires advanced network monitoring');
      }
      if ((profile.size === 'MICRO' || profile.size === 'SMALL') && !profile.regulatoryObligations?.length) {
        score = 55;
        reasons.push('Small organizations may have limited network monitoring needs');
      }
      break;

    case 14: // Security Training
      score = 95;
      reasons.push('Human factor is critical - training is always relevant');
      break;

    case 15: // Service Provider Management
      score = 75;
      if (profile.infrastructureTypes?.includes('CLOUD_ONLY') || profile.infrastructureTypes?.includes('MULTI_CLOUD')) {
        score = 95;
        reasons.push('Heavy cloud usage requires vendor/service provider management');
      }
      if (profile.supplyChainPosition === 'MSP_CLOUD_PROVIDER') {
        score = 100;
        reasons.push('As a service provider, you must demonstrate strong controls');
      }
      break;

    case 16: // Application Security
      score = 70;
      if (profile.softwareDevelopment === 'SOFTWARE_IS_PRODUCT') {
        score = 100;
        reasons.push('Software product company - application security is critical');
      } else if (profile.softwareDevelopment === 'CORE_BUSINESS') {
        score = 95;
        reasons.push('Custom software development requires application security');
      } else if (profile.softwareDevelopment === 'NONE') {
        score = 35;
        shouldBeInactive = true;
        reasons.push('No in-house software development - application security controls less applicable');
      }
      break;

    case 17: // Incident Response
      score = 85;
      if (profile.regulatoryObligations?.includes('NIS2') || profile.regulatoryObligations?.includes('DORA')) {
        score = 100;
        reasons.push('NIS2/DORA requires formal incident response capabilities');
      }
      break;

    case 18: // Penetration Testing
      score = 60;
      if (profile.size === 'MICRO' || profile.size === 'SMALL') {
        score = 40;
        reasons.push('Small organizations may defer penetration testing initially');
      }
      if (profile.regulatoryObligations?.includes('PCI_DSS')) {
        score = 100;
        reasons.push('PCI-DSS requires regular penetration testing');
      }
      if (profile.publicFacingServices === 'CRITICAL_SERVICES') {
        score = 95;
        reasons.push('Critical public services should undergo penetration testing');
      }
      if (profile.securityBudgetRange === 'MINIMAL' || profile.securityBudgetRange === 'UNDER_50K') {
        score = Math.min(score, 45);
        reasons.push('Budget constraints may limit penetration testing scope');
      }
      break;
  }

  return { relevanceScore: score, shouldBeInactive, reasons };
}

// ────────────────────────────────────────────────────────────────────────────────
// Safeguard Relevance Scoring
// ────────────────────────────────────────────────────────────────────────────────

function calculateSafeguardRelevance(
  safeguard: Safeguard,
  controlId: number,
  recommendedIg: number,
  profile: OrganizationProfile
): SafeguardRecommendation {
  const reasons: string[] = [];
  let relevanceScore = 80;
  let shouldBeInactive = false;

  // Check if safeguard applies at recommended IG level
  const igKey = `ig${recommendedIg}` as 'ig1' | 'ig2' | 'ig3';
  const igContent = safeguard[igKey];

  if (!igContent.scope || igContent.scope === 'N/A') {
    shouldBeInactive = true;
    relevanceScore = 0;
    reasons.push(`Safeguard not applicable at IG${recommendedIg} level`);

    return {
      safeguardId: safeguard.id,
      controlId,
      title: safeguard.title,
      recommendedIg,
      shouldBeInactive,
      reasons,
      relevanceScore,
    };
  }

  // Safeguard-specific adjustments
  const sfId = safeguard.id;

  // IG3-only advanced safeguards
  if (['1.5', '2.6', '2.7'].includes(sfId) && recommendedIg < 3) {
    shouldBeInactive = true;
    relevanceScore = 20;
    reasons.push('Advanced safeguard typically reserved for IG3 implementations');
  }

  // Data protection relevance
  if (controlId === 3 && profile.dataSensitivity && profile.dataSensitivity.length > 0) {
    relevanceScore = Math.min(100, relevanceScore + 15);
    reasons.push('Organization handles sensitive data');
  }

  // Network safeguards for cloud-only orgs
  if (controlId === 12 && profile.infrastructureTypes?.length === 1 && profile.infrastructureTypes?.includes('CLOUD_ONLY')) {
    relevanceScore = Math.max(40, relevanceScore - 30);
    reasons.push('Cloud-only environment has reduced on-prem network needs');
  }

  // Network monitoring for small orgs
  if (controlId === 13 && (profile.size === 'MICRO' || profile.size === 'SMALL') && !profile.regulatoryObligations?.length) {
    relevanceScore = Math.max(30, relevanceScore - 40);
    reasons.push('Advanced network monitoring may be excessive for small organization');
  }

  // Application security for non-developers
  if (controlId === 16) {
    if (profile.softwareDevelopment === 'NONE') {
      shouldBeInactive = true;
      relevanceScore = 10;
      reasons.push('No software development - application security safeguards not applicable');
    } else if (profile.softwareDevelopment === 'SOFTWARE_IS_PRODUCT') {
      relevanceScore = 100;
      reasons.push('Software product company - all AppSec safeguards are critical');
    }
  }

  // Penetration testing constraints
  if (controlId === 18) {
    if (profile.securityBudgetRange === 'MINIMAL') {
      relevanceScore = Math.max(30, relevanceScore - 40);
      reasons.push('Limited budget may constrain penetration testing');
    }
    if (profile.size === 'MICRO') {
      relevanceScore = Math.max(20, relevanceScore - 50);
      reasons.push('Micro organization may defer penetration testing');
    }
  }

  if (reasons.length === 0) {
    reasons.push(`Standard safeguard for IG${recommendedIg} compliance`);
  }

  return {
    safeguardId: safeguard.id,
    controlId,
    title: safeguard.title,
    recommendedIg,
    shouldBeInactive,
    reasons,
    relevanceScore,
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Recommendation Generator
// ────────────────────────────────────────────────────────────────────────────────

export function generateGapRecommendation(profile: OrganizationProfile): GapRecommendation {
  const { ig: recommendedIg, reasons: igReasons } = calculateRecommendedIg(profile);

  const controls: ControlRecommendation[] = [];
  let totalSafeguards = 0;
  let activeSafeguards = 0;
  let inactiveSafeguards = 0;

  for (const control of CIS_CONTROLS) {
    const controlRelevance = calculateControlRelevance(control.id, profile);
    const safeguardRecs: SafeguardRecommendation[] = [];

    for (const safeguard of control.safeguards) {
      const safeguardRec = calculateSafeguardRelevance(safeguard, control.id, recommendedIg, profile);

      if (controlRelevance.shouldBeInactive) {
        safeguardRec.shouldBeInactive = true;
        if (!safeguardRec.reasons.includes('Parent control is inactive')) {
          safeguardRec.reasons.push('Parent control is inactive');
        }
      }

      safeguardRecs.push(safeguardRec);
      totalSafeguards++;

      if (safeguardRec.shouldBeInactive) {
        inactiveSafeguards++;
      } else {
        activeSafeguards++;
      }
    }

    controls.push({
      controlId: control.id,
      title: control.title,
      shouldBeInactive: controlRelevance.shouldBeInactive,
      reasons: controlRelevance.reasons,
      relevanceScore: controlRelevance.relevanceScore,
      safeguards: safeguardRecs,
    });
  }

  return {
    recommendedIg,
    igReasons,
    controls,
    summary: {
      totalControls: 18,
      activeControls: controls.filter(c => !c.shouldBeInactive).length,
      inactiveControls: controls.filter(c => c.shouldBeInactive).length,
      totalSafeguards,
      activeSafeguards,
      inactiveSafeguards,
    },
  };
}

// ────────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────────

export function getSafeguardIdsForIg(ig: number): string[] {
  const ids: string[] = [];
  const igKey = `ig${ig}` as 'ig1' | 'ig2' | 'ig3';

  for (const control of CIS_CONTROLS) {
    for (const safeguard of control.safeguards) {
      const igContent = safeguard[igKey];
      if (igContent.scope && igContent.scope !== 'N/A') {
        ids.push(safeguard.id);
      }
    }
  }

  return ids;
}

export function countSafeguardsPerIg(): { ig1: number; ig2: number; ig3: number } {
  let ig1 = 0, ig2 = 0, ig3 = 0;

  for (const control of CIS_CONTROLS) {
    for (const safeguard of control.safeguards) {
      if (safeguard.ig1.scope && safeguard.ig1.scope !== 'N/A') ig1++;
      if (safeguard.ig2.scope && safeguard.ig2.scope !== 'N/A') ig2++;
      if (safeguard.ig3.scope && safeguard.ig3.scope !== 'N/A') ig3++;
    }
  }

  return { ig1, ig2, ig3 };
}
