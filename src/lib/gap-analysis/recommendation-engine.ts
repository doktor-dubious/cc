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

export type FactorImpact = {
  parameter: string;       // e.g., "Organization Size", "Software Development"
  value: string | null;    // e.g., "MEDIUM", "NONE"
  impact: string;          // e.g., "+15", "-30", "inactive"
  explanation: string;     // Human-readable explanation
};

export type SafeguardRecommendation = {
  safeguardId: string;
  controlId: number;
  title: string;
  recommendedIg: number;
  shouldBeInactive: boolean;
  reasons: string[];
  relevanceScore: number;
  factors: FactorImpact[];  // Detailed factor breakdown
};

export type ControlRecommendation = {
  controlId: number;
  title: string;
  shouldBeInactive: boolean;
  reasons: string[];
  relevanceScore: number;
  safeguards: SafeguardRecommendation[];
  factors: FactorImpact[];  // Detailed factor breakdown
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

  // Industry Sector (NACE)
  if (profile.naceSection) {
    // Critical infrastructure and highly regulated sectors
    const criticalSectors: string[] = ['D', 'E', 'H', 'K', 'O', 'Q']; // Utilities, Transport, Finance, Public Admin, Healthcare
    const highRiskSectors: string[] = ['J']; // Information & Communication

    if (criticalSectors.includes(profile.naceSection)) {
      igScore = Math.max(igScore, 2);
      const sectorNames: Record<string, string> = {
        'D': 'Electricity/Energy',
        'E': 'Water/Waste Management',
        'H': 'Transportation',
        'K': 'Financial Services',
        'O': 'Public Administration',
        'Q': 'Healthcare'
      };
      reasons.push(`${sectorNames[profile.naceSection] || 'Critical'} sector typically requires IG2+ controls`);
    }

    if (highRiskSectors.includes(profile.naceSection)) {
      igScore = Math.max(igScore, 2);
      reasons.push('Information & Communication sector is high-value target requiring IG2+ controls');
    }
  }

  // Digital Maturity
  if (profile.digitalMaturity) {
    switch (profile.digitalMaturity) {
      case 'TRADITIONAL':
        if (igScore > 2) {
          reasons.push('Note: Traditional digital maturity may require gradual implementation of advanced controls');
        }
        break;
      case 'DIGITAL_NATIVE':
        // Digital native orgs can handle more sophisticated controls
        if (igScore >= 2) {
          reasons.push('Digital-native organization can effectively implement advanced security controls');
        }
        break;
    }
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
): { relevanceScore: number; shouldBeInactive: boolean; reasons: string[]; factors: FactorImpact[] } {
  let score = 80;
  const reasons: string[] = [];
  const factors: FactorImpact[] = [];
  let shouldBeInactive = false;

  switch (controlId) {
    case 1: // Asset Inventory
      score = 100;
      reasons.push('Asset inventory is foundational for all security programs');
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '100',
        explanation: 'Foundational control - maximum relevance for all organizations'
      });
      break;

    case 2: // Software Inventory
      score = 100;
      reasons.push('Software inventory is critical for vulnerability management');
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '100',
        explanation: 'Critical control - required for effective vulnerability management'
      });
      break;

    case 3: // Data Protection
      score = 90;
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '90',
        explanation: 'High baseline relevance for data protection'
      });
      if (profile.dataSensitivity && profile.dataSensitivity.length > 0) {
        score = 100;
        reasons.push('Organization handles sensitive data - data protection is critical');
        factors.push({
          parameter: 'Data Sensitivity',
          value: profile.dataSensitivity.join(', '),
          impact: '+10 → 100',
          explanation: 'Sensitive data handling requires maximum data protection'
        });
      }
      if (profile.regulatoryObligations?.includes('GDPR')) {
        score = 100;
        reasons.push('GDPR compliance requires robust data protection controls');
        factors.push({
          parameter: 'Regulatory Obligations',
          value: 'GDPR',
          impact: '→ 100',
          explanation: 'GDPR mandates comprehensive data protection'
        });
      }
      break;

    case 4: // Secure Configuration
      score = 95;
      reasons.push('Secure configuration is essential for reducing attack surface');
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '95',
        explanation: 'Essential control for attack surface reduction'
      });
      break;

    case 5: // Account Management
      score = 100;
      reasons.push('Account management is fundamental to access control');
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '100',
        explanation: 'Fundamental security control - accounts are primary attack target'
      });
      break;

    case 6: // Access Control
      score = 100;
      reasons.push('Access control is essential for protecting resources');
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '100',
        explanation: 'Essential control - access control protects all resources'
      });
      break;

    case 7: // Vulnerability Management
      score = 90;
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '90',
        explanation: 'High baseline for vulnerability management'
      });
      if (profile.publicFacingServices && profile.publicFacingServices !== 'NONE') {
        score = 100;
        reasons.push('Public-facing services require active vulnerability management');
        factors.push({
          parameter: 'Public-Facing Services',
          value: profile.publicFacingServices,
          impact: '+10 → 100',
          explanation: 'External exposure increases vulnerability risk'
        });
      }
      break;

    case 8: // Audit Log Management
      score = 85;
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '85',
        explanation: 'Standard baseline for audit logging'
      });
      if (profile.regulatoryObligations && profile.regulatoryObligations.length > 0) {
        score = 95;
        reasons.push('Regulatory compliance requires comprehensive audit logging');
        factors.push({
          parameter: 'Regulatory Obligations',
          value: profile.regulatoryObligations.join(', '),
          impact: '+10 → 95',
          explanation: 'Regulations require audit trail capabilities'
        });
      }
      break;

    case 9: // Email and Web Protection
      score = 90;
      reasons.push('Email and web are primary attack vectors');
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '90',
        explanation: 'Primary attack vectors - high relevance for all organizations'
      });
      break;

    case 10: // Malware Defenses
      score = 100;
      reasons.push('Malware defense is essential for all organizations');
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '100',
        explanation: 'Essential defense against prevalent threats'
      });
      break;

    case 11: // Data Recovery
      score = 95;
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '95',
        explanation: 'Critical for business continuity'
      });
      if (profile.downtimeTolerance === 'NEAR_ZERO') {
        score = 100;
        reasons.push('Low downtime tolerance requires robust data recovery');
        factors.push({
          parameter: 'Downtime Tolerance',
          value: 'NEAR_ZERO',
          impact: '+5 → 100',
          explanation: 'Zero downtime tolerance demands robust recovery'
        });
      }
      break;

    case 12: // Network Infrastructure
      score = 85;
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '85',
        explanation: 'Standard baseline for network management'
      });
      if (profile.infrastructureTypes?.includes('ON_PREMISES') || profile.infrastructureTypes?.includes('HYBRID')) {
        score = 95;
        reasons.push('On-premises/hybrid infrastructure requires network management');
        factors.push({
          parameter: 'Infrastructure Types',
          value: profile.infrastructureTypes?.join(', ') || null,
          impact: '+10 → 95',
          explanation: 'On-prem/hybrid infrastructure needs direct network management'
        });
      }
      if (profile.infrastructureTypes?.length === 1 && profile.infrastructureTypes?.includes('CLOUD_ONLY')) {
        score = 65;
        reasons.push('Cloud-only infrastructure has reduced network management needs');
        factors.push({
          parameter: 'Infrastructure Types',
          value: 'CLOUD_ONLY',
          impact: '-20 → 65',
          explanation: 'Cloud provider manages network infrastructure'
        });
      }
      break;

    case 13: // Network Monitoring
      score = 80;
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '80',
        explanation: 'Standard baseline for network monitoring'
      });
      if (profile.targetedAttackLikelihood === 'HIGH') {
        score = 100;
        reasons.push('High threat environment requires advanced network monitoring');
        factors.push({
          parameter: 'Targeted Attack Likelihood',
          value: 'HIGH',
          impact: '+20 → 100',
          explanation: 'High threat level requires advanced detection'
        });
      }
      if ((profile.size === 'MICRO' || profile.size === 'SMALL') && !profile.regulatoryObligations?.length) {
        score = 55;
        reasons.push('Small organizations may have limited network monitoring needs');
        factors.push({
          parameter: 'Organization Size',
          value: profile.size || null,
          impact: '-25 → 55',
          explanation: 'Small organizations have simpler network environments'
        });
      }
      break;

    case 14: // Security Training
      score = 95;
      reasons.push('Human factor is critical - training is always relevant');
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '95',
        explanation: 'Human factor is critical in all security programs'
      });
      break;

    case 15: // Service Provider Management
      score = 75;
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '75',
        explanation: 'Standard baseline for vendor management'
      });
      if (profile.infrastructureTypes?.includes('CLOUD_ONLY') || profile.infrastructureTypes?.includes('MULTI_CLOUD')) {
        score = 95;
        reasons.push('Heavy cloud usage requires vendor/service provider management');
        factors.push({
          parameter: 'Infrastructure Types',
          value: profile.infrastructureTypes?.join(', ') || null,
          impact: '+20 → 95',
          explanation: 'Cloud reliance increases third-party risk'
        });
      }
      if (profile.supplyChainPosition === 'MSP_CLOUD_PROVIDER') {
        score = 100;
        reasons.push('As a service provider, you must demonstrate strong controls');
        factors.push({
          parameter: 'Supply Chain Position',
          value: 'MSP_CLOUD_PROVIDER',
          impact: '→ 100',
          explanation: 'Service providers must demonstrate security to clients'
        });
      }
      break;

    case 16: // Application Security
      score = 70;
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '70',
        explanation: 'Moderate baseline - depends on development activities'
      });
      if (profile.softwareDevelopment === 'SOFTWARE_IS_PRODUCT') {
        score = 100;
        reasons.push('Software product company - application security is critical');
        factors.push({
          parameter: 'Software Development',
          value: 'SOFTWARE_IS_PRODUCT',
          impact: '+30 → 100',
          explanation: 'Software products require comprehensive AppSec'
        });
      } else if (profile.softwareDevelopment === 'CORE_BUSINESS') {
        score = 95;
        reasons.push('Custom software development requires application security');
        factors.push({
          parameter: 'Software Development',
          value: 'CORE_BUSINESS',
          impact: '+25 → 95',
          explanation: 'Business-critical software needs security controls'
        });
      } else if (profile.softwareDevelopment === 'NONE') {
        score = 35;
        shouldBeInactive = true;
        reasons.push('No in-house software development - application security controls less applicable');
        factors.push({
          parameter: 'Software Development',
          value: 'NONE',
          impact: '-35 → INACTIVE',
          explanation: 'No development means AppSec controls have minimal applicability'
        });
      }
      break;

    case 17: // Incident Response
      score = 85;
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '85',
        explanation: 'Standard baseline for incident response'
      });
      if (profile.regulatoryObligations?.includes('NIS2') || profile.regulatoryObligations?.includes('DORA')) {
        score = 100;
        reasons.push('NIS2/DORA requires formal incident response capabilities');
        factors.push({
          parameter: 'Regulatory Obligations',
          value: profile.regulatoryObligations?.filter(r => ['NIS2', 'DORA'].includes(r)).join(', ') || null,
          impact: '+15 → 100',
          explanation: 'NIS2/DORA mandate formal incident response'
        });
      }
      break;

    case 18: // Penetration Testing
      score = 60;
      factors.push({
        parameter: 'Base Score',
        value: null,
        impact: '60',
        explanation: 'Lower baseline - advanced testing often deferred'
      });
      if (profile.size === 'MICRO' || profile.size === 'SMALL') {
        score = 40;
        reasons.push('Small organizations may defer penetration testing initially');
        factors.push({
          parameter: 'Organization Size',
          value: profile.size || null,
          impact: '-20 → 40',
          explanation: 'Small orgs may lack resources for regular pentesting'
        });
      }
      if (profile.regulatoryObligations?.includes('PCI_DSS')) {
        score = 100;
        reasons.push('PCI-DSS requires regular penetration testing');
        factors.push({
          parameter: 'Regulatory Obligations',
          value: 'PCI_DSS',
          impact: '→ 100',
          explanation: 'PCI-DSS mandates annual penetration testing'
        });
      }
      if (profile.publicFacingServices === 'CRITICAL_SERVICES') {
        score = 95;
        reasons.push('Critical public services should undergo penetration testing');
        factors.push({
          parameter: 'Public-Facing Services',
          value: 'CRITICAL_SERVICES',
          impact: '→ 95',
          explanation: 'Critical services need regular security validation'
        });
      }
      if (profile.securityBudgetRange === 'MINIMAL' || profile.securityBudgetRange === 'UNDER_50K') {
        score = Math.min(score, 45);
        reasons.push('Budget constraints may limit penetration testing scope');
        factors.push({
          parameter: 'Security Budget',
          value: profile.securityBudgetRange || null,
          impact: 'cap → 45',
          explanation: 'Budget limits testing frequency and scope'
        });
      }
      break;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Industry Sector (NACE) adjustments - applies across controls
  // ══════════════════════════════════════════════════════════════════════════════
  if (profile.naceSection) {
    const sectorNames: Record<string, string> = {
      'A': 'Agriculture',
      'B': 'Mining',
      'C': 'Manufacturing',
      'D': 'Energy/Utilities',
      'E': 'Water/Waste Management',
      'F': 'Construction',
      'G': 'Wholesale/Retail',
      'H': 'Transportation',
      'I': 'Hospitality',
      'J': 'IT/Telecom',
      'K': 'Financial Services',
      'L': 'Real Estate',
      'M': 'Professional Services',
      'N': 'Administrative Services',
      'O': 'Public Administration',
      'P': 'Education',
      'Q': 'Healthcare',
      'R': 'Entertainment',
      'S': 'Other Services'
    };
    const sectorName = sectorNames[profile.naceSection] || profile.naceSection;

    // Data Protection (Control 3) - Healthcare and Financial have stricter requirements
    if (controlId === 3 && ['K', 'Q'].includes(profile.naceSection)) {
      score = Math.min(100, score + 5);
      factors.push({
        parameter: 'Industry Sector',
        value: sectorName,
        impact: '+5',
        explanation: `${sectorName} sector has heightened data protection requirements`
      });
    }

    // Audit Logging (Control 8) - Regulated industries need stronger audit trails
    if (controlId === 8 && ['K', 'Q', 'O', 'D', 'E'].includes(profile.naceSection)) {
      score = Math.min(100, score + 10);
      reasons.push(`${sectorName} sector requires comprehensive audit trails`);
      factors.push({
        parameter: 'Industry Sector',
        value: sectorName,
        impact: '+10',
        explanation: `${sectorName} has regulatory audit requirements`
      });
    }

    // Data Recovery (Control 11) - Critical infrastructure sectors
    if (controlId === 11 && ['D', 'E', 'H', 'Q'].includes(profile.naceSection)) {
      score = Math.min(100, score + 5);
      factors.push({
        parameter: 'Industry Sector',
        value: sectorName,
        impact: '+5',
        explanation: `${sectorName} requires robust recovery capabilities`
      });
    }

    // Network Monitoring (Control 13) - High-value target sectors
    if (controlId === 13 && ['K', 'J', 'D', 'O'].includes(profile.naceSection)) {
      score = Math.min(100, score + 10);
      factors.push({
        parameter: 'Industry Sector',
        value: sectorName,
        impact: '+10',
        explanation: `${sectorName} sector is frequently targeted by attackers`
      });
    }

    // Incident Response (Control 17) - Critical sectors need rapid response
    if (controlId === 17 && ['K', 'Q', 'D', 'E', 'H', 'O'].includes(profile.naceSection)) {
      score = Math.min(100, score + 10);
      factors.push({
        parameter: 'Industry Sector',
        value: sectorName,
        impact: '+10',
        explanation: `${sectorName} sector incidents have high impact`
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // Digital Maturity adjustments - affects automation-heavy controls
  // ══════════════════════════════════════════════════════════════════════════════
  if (profile.digitalMaturity) {
    // Traditional organizations may struggle with highly automated controls
    if (profile.digitalMaturity === 'TRADITIONAL') {
      // Asset/Software Inventory (Controls 1, 2) - automation is harder
      if ([1, 2].includes(controlId)) {
        factors.push({
          parameter: 'Digital Maturity',
          value: 'TRADITIONAL',
          impact: 'note',
          explanation: 'Traditional maturity may require manual inventory processes initially'
        });
      }
      // Vulnerability Management (Control 7) - automated scanning needs infrastructure
      if (controlId === 7) {
        factors.push({
          parameter: 'Digital Maturity',
          value: 'TRADITIONAL',
          impact: 'note',
          explanation: 'May need to build automation capabilities for vulnerability scanning'
        });
      }
      // Network Monitoring (Control 13) - requires digital sophistication
      if (controlId === 13 && score > 60) {
        score = Math.max(60, score - 10);
        factors.push({
          parameter: 'Digital Maturity',
          value: 'TRADITIONAL',
          impact: '-10 (floor: 60)',
          explanation: 'Advanced network monitoring requires digital infrastructure'
        });
      }
    }

    // Digital-native organizations can leverage advanced capabilities
    if (profile.digitalMaturity === 'DIGITAL_NATIVE') {
      // Vulnerability Management (Control 7) - can do continuous scanning
      if (controlId === 7) {
        score = Math.min(100, score + 5);
        factors.push({
          parameter: 'Digital Maturity',
          value: 'DIGITAL_NATIVE',
          impact: '+5',
          explanation: 'Digital-native can implement continuous vulnerability management'
        });
      }
      // Network Monitoring (Control 13) - can leverage advanced tools
      if (controlId === 13) {
        score = Math.min(100, score + 5);
        factors.push({
          parameter: 'Digital Maturity',
          value: 'DIGITAL_NATIVE',
          impact: '+5',
          explanation: 'Digital-native can deploy sophisticated monitoring'
        });
      }
      // Application Security (Control 16) - likely already has DevSecOps
      if (controlId === 16 && profile.softwareDevelopment !== 'NONE') {
        score = Math.min(100, score + 5);
        factors.push({
          parameter: 'Digital Maturity',
          value: 'DIGITAL_NATIVE',
          impact: '+5',
          explanation: 'Digital-native organizations can integrate security into CI/CD'
        });
      }
    }
  }

  return { relevanceScore: score, shouldBeInactive, reasons, factors };
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
  const factors: FactorImpact[] = [];
  let relevanceScore = 80;
  let shouldBeInactive = false;

  factors.push({
    parameter: 'Base Score',
    value: null,
    impact: '80',
    explanation: 'Default safeguard relevance baseline'
  });

  // Check if safeguard applies at recommended IG level
  const igKey = `ig${recommendedIg}` as 'ig1' | 'ig2' | 'ig3';
  const igContent = safeguard[igKey];

  if (!igContent.scope || igContent.scope === 'N/A') {
    shouldBeInactive = true;
    relevanceScore = 0;
    reasons.push(`Safeguard not applicable at IG${recommendedIg} level`);
    factors.push({
      parameter: 'IG Level Scope',
      value: `IG${recommendedIg}`,
      impact: '→ INACTIVE (0)',
      explanation: `This safeguard has no defined scope at IG${recommendedIg}`
    });

    return {
      safeguardId: safeguard.id,
      controlId,
      title: safeguard.title,
      recommendedIg,
      shouldBeInactive,
      reasons,
      relevanceScore,
      factors,
    };
  }

  const sfId = safeguard.id;

  // ════════════════════════════════════════════════════════════════════════════
  // Control 1: Inventory and Control of Enterprise Assets
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 1) {
    // 1.1 Establish and Maintain Detailed Enterprise Asset Inventory
    if (sfId === '1.1') {
      // IT Endpoint Range - more endpoints = more critical
      if (profile.itEndpointRange) {
        if (profile.itEndpointRange === 'OVER_5000') {
          relevanceScore = Math.min(100, relevanceScore + 15);
          reasons.push('Large endpoint count makes asset inventory critical');
          factors.push({
            parameter: 'IT Endpoints',
            value: 'OVER_5000',
            impact: '+15',
            explanation: '5000+ endpoints require comprehensive inventory management'
          });
        } else if (profile.itEndpointRange === 'FROM_500_5000') {
          relevanceScore = Math.min(100, relevanceScore + 10);
          reasons.push('Significant endpoint count increases inventory importance');
          factors.push({
            parameter: 'IT Endpoints',
            value: 'FROM_500_5000',
            impact: '+10',
            explanation: '500-5000 endpoints benefit from formal inventory'
          });
        }
      }

      // Geographic Scope - distributed = harder to inventory
      if (profile.geographicScope === 'GLOBAL') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        reasons.push('Global operations increase asset tracking complexity');
        factors.push({
          parameter: 'Geographic Scope',
          value: 'GLOBAL',
          impact: '+10',
          explanation: 'Distributed assets across countries need systematic tracking'
        });
      } else if (profile.geographicScope === 'EUROPEAN') {
        relevanceScore = Math.min(100, relevanceScore + 5);
        factors.push({
          parameter: 'Geographic Scope',
          value: 'EUROPEAN',
          impact: '+5',
          explanation: 'European presence adds asset management complexity'
        });
      }

      // Infrastructure Types - multiple types = more complex inventory
      if (profile.infrastructureTypes && profile.infrastructureTypes.length > 1) {
        relevanceScore = Math.min(100, relevanceScore + 10);
        reasons.push('Hybrid infrastructure requires comprehensive asset tracking');
        factors.push({
          parameter: 'Infrastructure Types',
          value: profile.infrastructureTypes.join(', '),
          impact: '+10',
          explanation: 'Mixed infrastructure needs unified asset inventory'
        });
      }
    }

    // 1.2 Address Unauthorized Assets
    if (sfId === '1.2') {
      if (profile.targetedAttackLikelihood === 'HIGH') {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('High threat environment requires strict unauthorized asset control');
        factors.push({
          parameter: 'Targeted Attack Likelihood',
          value: 'HIGH',
          impact: '+15',
          explanation: 'Unauthorized devices are attack vectors in high-threat environments'
        });
      }
      if (profile.publicFacingServices && profile.publicFacingServices !== 'NONE') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Public-Facing Services',
          value: profile.publicFacingServices,
          impact: '+10',
          explanation: 'External exposure increases risk from unauthorized assets'
        });
      }
    }

    // 1.3 Utilize an Active Discovery Tool
    if (sfId === '1.3') {
      if (profile.itEndpointRange === 'OVER_5000' || profile.itEndpointRange === 'FROM_500_5000') {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('Large environment benefits from automated asset discovery');
        factors.push({
          parameter: 'IT Endpoints',
          value: profile.itEndpointRange,
          impact: '+15',
          explanation: 'Automation essential for managing hundreds of assets'
        });
      }
      if (profile.securityBudgetRange === 'MINIMAL' || profile.securityBudgetRange === 'UNDER_50K') {
        relevanceScore = Math.max(50, relevanceScore - 20);
        factors.push({
          parameter: 'Security Budget',
          value: profile.securityBudgetRange,
          impact: '-20 (floor: 50)',
          explanation: 'Budget may limit automated tooling options'
        });
      }
    }

    // 1.4 Use Dynamic Host Configuration Protocol (DHCP) Logging
    if (sfId === '1.4') {
      if (profile.infrastructureTypes?.includes('CLOUD_ONLY') && profile.infrastructureTypes.length === 1) {
        relevanceScore = Math.max(40, relevanceScore - 30);
        reasons.push('Cloud-only environment has limited DHCP logging needs');
        factors.push({
          parameter: 'Infrastructure Types',
          value: 'CLOUD_ONLY',
          impact: '-30 (floor: 40)',
          explanation: 'Cloud providers manage DHCP; less relevant for cloud-only'
        });
      }
      if (profile.infrastructureTypes?.includes('ON_PREMISES') || profile.infrastructureTypes?.includes('HYBRID')) {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Infrastructure Types',
          value: profile.infrastructureTypes.join(', '),
          impact: '+10',
          explanation: 'On-premises infrastructure benefits from DHCP logging'
        });
      }
    }

    // 1.5 Use a Passive Asset Discovery Tool (IG3)
    if (sfId === '1.5') {
      if (recommendedIg < 3) {
        shouldBeInactive = true;
        relevanceScore = 20;
        reasons.push('Passive discovery is an advanced IG3 capability');
        factors.push({
          parameter: 'IG Level',
          value: `IG${recommendedIg}`,
          impact: '→ INACTIVE (20)',
          explanation: 'Passive discovery tools require IG3 maturity'
        });
      } else if (profile.targetedAttackLikelihood === 'HIGH') {
        relevanceScore = 100;
        reasons.push('High-threat environment benefits from passive detection');
        factors.push({
          parameter: 'Targeted Attack Likelihood',
          value: 'HIGH',
          impact: '→ 100',
          explanation: 'Passive discovery detects stealthy unauthorized devices'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 2: Inventory and Control of Software Assets
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 2) {
    // 2.1 Establish and Maintain a Software Inventory
    if (sfId === '2.1') {
      if (profile.itEndpointRange === 'OVER_5000' || profile.itEndpointRange === 'FROM_500_5000') {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('Large endpoint count requires comprehensive software inventory');
        factors.push({
          parameter: 'IT Endpoints',
          value: profile.itEndpointRange,
          impact: '+15',
          explanation: 'More endpoints mean more software to track and manage'
        });
      }
      if (profile.regulatoryObligations && profile.regulatoryObligations.length > 0) {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Regulatory Obligations',
          value: profile.regulatoryObligations.join(', '),
          impact: '+10',
          explanation: 'Compliance requires knowing what software is deployed'
        });
      }
    }

    // 2.2 Ensure Authorized Software is Currently Supported
    if (sfId === '2.2') {
      if (profile.regulatoryObligations?.includes('NIS2') || profile.regulatoryObligations?.includes('DORA')) {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('NIS2/DORA requires supported software for vulnerability management');
        factors.push({
          parameter: 'Regulatory Obligations',
          value: profile.regulatoryObligations.filter(r => ['NIS2', 'DORA'].includes(r)).join(', '),
          impact: '+15',
          explanation: 'Regulations require up-to-date, supported software'
        });
      }
      if (profile.dataSensitivity && profile.dataSensitivity.length > 0) {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Data Sensitivity',
          value: profile.dataSensitivity.join(', '),
          impact: '+10',
          explanation: 'Sensitive data requires software with security patches'
        });
      }
    }

    // 2.3 Address Unauthorized Software
    if (sfId === '2.3') {
      if (profile.targetedAttackLikelihood === 'HIGH') {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('High-threat environment must control unauthorized software');
        factors.push({
          parameter: 'Targeted Attack Likelihood',
          value: 'HIGH',
          impact: '+15',
          explanation: 'Unauthorized software is a common attack vector'
        });
      }
      if (profile.size === 'LARGE' || profile.size === 'ENTERPRISE') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Organization Size',
          value: profile.size,
          impact: '+10',
          explanation: 'Larger organizations face more shadow IT challenges'
        });
      }
    }

    // 2.4 Utilize Automated Software Inventory Tools
    if (sfId === '2.4') {
      if (profile.itEndpointRange === 'OVER_5000') {
        relevanceScore = Math.min(100, relevanceScore + 20);
        reasons.push('Large environment requires automated software inventory');
        factors.push({
          parameter: 'IT Endpoints',
          value: 'OVER_5000',
          impact: '+20',
          explanation: 'Manual inventory impractical at this scale'
        });
      } else if (profile.itEndpointRange === 'FROM_500_5000') {
        relevanceScore = Math.min(100, relevanceScore + 15);
        factors.push({
          parameter: 'IT Endpoints',
          value: 'FROM_500_5000',
          impact: '+15',
          explanation: 'Automation significantly improves inventory accuracy'
        });
      }
      if (profile.securityBudgetRange === 'MINIMAL') {
        relevanceScore = Math.max(50, relevanceScore - 20);
        factors.push({
          parameter: 'Security Budget',
          value: 'MINIMAL',
          impact: '-20 (floor: 50)',
          explanation: 'Budget constraints may limit tooling options'
        });
      }
    }

    // 2.5 Allowlist Authorized Software
    if (sfId === '2.5') {
      if (profile.targetedAttackLikelihood === 'HIGH') {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('High-threat environment benefits from application allowlisting');
        factors.push({
          parameter: 'Targeted Attack Likelihood',
          value: 'HIGH',
          impact: '+15',
          explanation: 'Allowlisting prevents unauthorized execution'
        });
      }
      if (profile.securityMaturity === 'BASIC' || profile.securityMaturity === 'NO_PROGRAM') {
        relevanceScore = Math.max(50, relevanceScore - 20);
        factors.push({
          parameter: 'Security Maturity',
          value: profile.securityMaturity,
          impact: '-20 (floor: 50)',
          explanation: 'Allowlisting requires mature process to manage exceptions'
        });
      }
    }

    // 2.6 Allowlist Authorized Libraries (IG3)
    if (sfId === '2.6') {
      if (recommendedIg < 3) {
        shouldBeInactive = true;
        relevanceScore = 20;
        reasons.push('Library allowlisting is an advanced IG3 control');
        factors.push({
          parameter: 'IG Level',
          value: `IG${recommendedIg}`,
          impact: '→ INACTIVE (20)',
          explanation: 'Library-level control requires IG3 capabilities'
        });
      } else if (profile.softwareDevelopment === 'SOFTWARE_IS_PRODUCT') {
        relevanceScore = 100;
        factors.push({
          parameter: 'Software Development',
          value: 'SOFTWARE_IS_PRODUCT',
          impact: '→ 100',
          explanation: 'Software companies must control library dependencies'
        });
      }
    }

    // 2.7 Allowlist Authorized Scripts (IG3)
    if (sfId === '2.7') {
      if (recommendedIg < 3) {
        shouldBeInactive = true;
        relevanceScore = 20;
        reasons.push('Script allowlisting is an advanced IG3 control');
        factors.push({
          parameter: 'IG Level',
          value: `IG${recommendedIg}`,
          impact: '→ INACTIVE (20)',
          explanation: 'Script control requires IG3 maturity'
        });
      } else if (profile.targetedAttackLikelihood === 'HIGH') {
        relevanceScore = 100;
        factors.push({
          parameter: 'Targeted Attack Likelihood',
          value: 'HIGH',
          impact: '→ 100',
          explanation: 'Malicious scripts are common attack technique'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 3: Data Protection
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 3) {
    // Universal data sensitivity check for all Control 3 safeguards
    if (profile.dataSensitivity && profile.dataSensitivity.length > 0) {
      const highSensitivity = ['SPECIAL_CATEGORY', 'PAYMENT_CARD', 'CLASSIFIED_GOVERNMENT', 'CRITICAL_INFRASTRUCTURE'];
      const hasHighSensitivity = profile.dataSensitivity.some(d => highSensitivity.includes(d));

      if (hasHighSensitivity) {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('Handling highly sensitive data');
        factors.push({
          parameter: 'Data Sensitivity',
          value: profile.dataSensitivity.join(', '),
          impact: '+15',
          explanation: 'High-sensitivity data requires strong protection'
        });
      } else {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Data Sensitivity',
          value: profile.dataSensitivity.join(', '),
          impact: '+10',
          explanation: 'Sensitive data handling increases protection priority'
        });
      }
    }

    // GDPR adds importance to all data protection safeguards
    if (profile.regulatoryObligations?.includes('GDPR')) {
      relevanceScore = Math.min(100, relevanceScore + 10);
      factors.push({
        parameter: 'Regulatory Obligations',
        value: 'GDPR',
        impact: '+10',
        explanation: 'GDPR mandates comprehensive data protection'
      });
    }

    // 3.4 Enforce Data Retention
    if (sfId === '3.4') {
      if (profile.regulatoryObligations && profile.regulatoryObligations.length > 0) {
        relevanceScore = Math.min(100, relevanceScore + 10);
        reasons.push('Regulatory compliance requires data retention policies');
        factors.push({
          parameter: 'Regulatory Obligations',
          value: profile.regulatoryObligations.join(', '),
          impact: '+10',
          explanation: 'Regulations often specify retention requirements'
        });
      }
    }

    // 3.10 Encrypt Sensitive Data in Transit
    if (sfId === '3.10') {
      if (profile.publicFacingServices && profile.publicFacingServices !== 'NONE') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Public-Facing Services',
          value: profile.publicFacingServices,
          impact: '+10',
          explanation: 'External services must encrypt data in transit'
        });
      }
    }

    // 3.11 Encrypt Sensitive Data at Rest
    if (sfId === '3.11') {
      if (profile.dataSensitivity?.includes('PAYMENT_CARD')) {
        relevanceScore = 100;
        reasons.push('PCI data must be encrypted at rest');
        factors.push({
          parameter: 'Data Sensitivity',
          value: 'PAYMENT_CARD',
          impact: '→ 100',
          explanation: 'PCI-DSS requires encryption of cardholder data'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 4: Secure Configuration of Enterprise Assets and Software
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 4) {
    // 4.1 Establish and Maintain a Secure Configuration Process
    if (sfId === '4.1') {
      if (profile.itEndpointRange === 'OVER_5000' || profile.itEndpointRange === 'FROM_500_5000') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'IT Endpoints',
          value: profile.itEndpointRange,
          impact: '+10',
          explanation: 'More endpoints require standardized configurations'
        });
      }
      if (profile.regulatoryObligations?.includes('NIS2')) {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Regulatory Obligations',
          value: 'NIS2',
          impact: '+10',
          explanation: 'NIS2 requires secure configuration management'
        });
      }
    }

    // 4.2 Establish and Maintain a Secure Configuration Process for Network Infrastructure
    if (sfId === '4.2') {
      if (profile.infrastructureTypes?.includes('ON_PREMISES') || profile.infrastructureTypes?.includes('HYBRID')) {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('On-premises infrastructure requires network configuration management');
        factors.push({
          parameter: 'Infrastructure Types',
          value: profile.infrastructureTypes.join(', '),
          impact: '+15',
          explanation: 'Direct network infrastructure needs secure configuration'
        });
      }
      if (profile.infrastructureTypes?.includes('CLOUD_ONLY') && profile.infrastructureTypes.length === 1) {
        relevanceScore = Math.max(50, relevanceScore - 20);
        factors.push({
          parameter: 'Infrastructure Types',
          value: 'CLOUD_ONLY',
          impact: '-20 (floor: 50)',
          explanation: 'Cloud provider manages core network infrastructure'
        });
      }
    }

    // 4.7 Manage Default Accounts on Enterprise Assets and Software
    if (sfId === '4.7') {
      if (profile.publicFacingServices && profile.publicFacingServices !== 'NONE') {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('Public-facing systems must not have default credentials');
        factors.push({
          parameter: 'Public-Facing Services',
          value: profile.publicFacingServices,
          impact: '+15',
          explanation: 'Default accounts are common attack vector on exposed systems'
        });
      }
    }

    // 4.8 Uninstall or Disable Unnecessary Services
    if (sfId === '4.8') {
      if (profile.targetedAttackLikelihood === 'HIGH') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Targeted Attack Likelihood',
          value: 'HIGH',
          impact: '+10',
          explanation: 'Minimizing services reduces attack surface'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 5: Account Management
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 5) {
    // Organization size affects account management complexity
    if (profile.size === 'LARGE' || profile.size === 'ENTERPRISE') {
      relevanceScore = Math.min(100, relevanceScore + 10);
      factors.push({
        parameter: 'Organization Size',
        value: profile.size,
        impact: '+10',
        explanation: 'More employees mean more accounts to manage'
      });
    }

    // 5.1 Establish and Maintain an Inventory of Accounts
    if (sfId === '5.1') {
      if (profile.itEndpointRange === 'OVER_5000' || profile.itEndpointRange === 'FROM_500_5000') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'IT Endpoints',
          value: profile.itEndpointRange,
          impact: '+10',
          explanation: 'Large environments have many service and user accounts'
        });
      }
    }

    // 5.3 Disable Dormant Accounts
    if (sfId === '5.3') {
      if (profile.targetedAttackLikelihood === 'HIGH') {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('Dormant accounts are targets for attackers');
        factors.push({
          parameter: 'Targeted Attack Likelihood',
          value: 'HIGH',
          impact: '+15',
          explanation: 'Attackers target unused accounts for persistence'
        });
      }
    }

    // 5.4 Restrict Administrator Privileges to Dedicated Administrator Accounts
    if (sfId === '5.4') {
      if (profile.regulatoryObligations?.includes('NIS2') || profile.regulatoryObligations?.includes('DORA')) {
        relevanceScore = Math.min(100, relevanceScore + 15);
        factors.push({
          parameter: 'Regulatory Obligations',
          value: profile.regulatoryObligations.filter(r => ['NIS2', 'DORA'].includes(r)).join(', '),
          impact: '+15',
          explanation: 'NIS2/DORA require privileged access controls'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 6: Access Control Management
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 6) {
    // Data sensitivity drives access control importance
    if (profile.dataSensitivity && profile.dataSensitivity.length > 0) {
      relevanceScore = Math.min(100, relevanceScore + 10);
      factors.push({
        parameter: 'Data Sensitivity',
        value: profile.dataSensitivity.join(', '),
        impact: '+10',
        explanation: 'Sensitive data requires strict access control'
      });
    }

    // 6.1 Establish an Access Granting Process
    if (sfId === '6.1') {
      if (profile.size === 'LARGE' || profile.size === 'ENTERPRISE') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Organization Size',
          value: profile.size,
          impact: '+10',
          explanation: 'Larger organizations need formal access processes'
        });
      }
    }

    // 6.3 Require MFA for Externally-Exposed Applications
    if (sfId === '6.3') {
      if (profile.publicFacingServices && profile.publicFacingServices !== 'NONE') {
        relevanceScore = 100;
        reasons.push('External services must use MFA');
        factors.push({
          parameter: 'Public-Facing Services',
          value: profile.publicFacingServices,
          impact: '→ 100',
          explanation: 'MFA is essential for externally accessible applications'
        });
      }
    }

    // 6.4 Require MFA for Remote Network Access
    if (sfId === '6.4') {
      if (profile.geographicScope === 'GLOBAL' || profile.geographicScope === 'EUROPEAN') {
        relevanceScore = 100;
        reasons.push('Distributed workforce requires MFA for remote access');
        factors.push({
          parameter: 'Geographic Scope',
          value: profile.geographicScope,
          impact: '→ 100',
          explanation: 'Remote workers need MFA for secure network access'
        });
      }
    }

    // 6.5 Require MFA for Administrative Access
    if (sfId === '6.5') {
      relevanceScore = Math.min(100, relevanceScore + 15);
      reasons.push('Admin access MFA is critical for all organizations');
      factors.push({
        parameter: 'Universal',
        value: null,
        impact: '+15',
        explanation: 'Administrative MFA is a fundamental security control'
      });
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 7: Continuous Vulnerability Management
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 7) {
    // Public-facing services increase vulnerability management importance
    if (profile.publicFacingServices && profile.publicFacingServices !== 'NONE') {
      relevanceScore = Math.min(100, relevanceScore + 10);
      factors.push({
        parameter: 'Public-Facing Services',
        value: profile.publicFacingServices,
        impact: '+10',
        explanation: 'External exposure increases vulnerability risk'
      });
    }

    // 7.1 Establish and Maintain a Vulnerability Management Process
    if (sfId === '7.1') {
      if (profile.regulatoryObligations && profile.regulatoryObligations.length > 0) {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Regulatory Obligations',
          value: profile.regulatoryObligations.join(', '),
          impact: '+10',
          explanation: 'Compliance requires documented vulnerability management'
        });
      }
    }

    // 7.4 Perform Automated Application Patch Management
    if (sfId === '7.4') {
      if (profile.itEndpointRange === 'OVER_5000' || profile.itEndpointRange === 'FROM_500_5000') {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('Large environment requires automated patching');
        factors.push({
          parameter: 'IT Endpoints',
          value: profile.itEndpointRange,
          impact: '+15',
          explanation: 'Manual patching impractical at scale'
        });
      }
    }

    // 7.5 Perform Automated Vulnerability Scans of Internal Enterprise Assets
    if (sfId === '7.5') {
      if (profile.itEndpointRange === 'OVER_5000') {
        relevanceScore = Math.min(100, relevanceScore + 15);
        factors.push({
          parameter: 'IT Endpoints',
          value: 'OVER_5000',
          impact: '+15',
          explanation: 'Large environments need automated scanning'
        });
      }
      if (profile.targetedAttackLikelihood === 'HIGH') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Targeted Attack Likelihood',
          value: 'HIGH',
          impact: '+10',
          explanation: 'High-threat environments need continuous scanning'
        });
      }
    }

    // 7.6 Perform Automated Vulnerability Scans of Externally-Exposed Enterprise Assets
    if (sfId === '7.6') {
      if (profile.publicFacingServices === 'CRITICAL_SERVICES') {
        relevanceScore = 100;
        reasons.push('Critical public services require external scanning');
        factors.push({
          parameter: 'Public-Facing Services',
          value: 'CRITICAL_SERVICES',
          impact: '→ 100',
          explanation: 'Critical external services need regular vulnerability scanning'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 8: Audit Log Management
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 8) {
    // Regulatory obligations drive audit requirements
    if (profile.regulatoryObligations && profile.regulatoryObligations.length > 0) {
      relevanceScore = Math.min(100, relevanceScore + 10);
      factors.push({
        parameter: 'Regulatory Obligations',
        value: profile.regulatoryObligations.join(', '),
        impact: '+10',
        explanation: 'Compliance requires comprehensive audit logging'
      });
    }

    // 8.2 Collect Audit Logs
    if (sfId === '8.2') {
      if (profile.dataSensitivity && profile.dataSensitivity.length > 0) {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Data Sensitivity',
          value: profile.dataSensitivity.join(', '),
          impact: '+10',
          explanation: 'Sensitive data access must be logged'
        });
      }
    }

    // 8.9 Centralize Audit Logs
    if (sfId === '8.9') {
      if (profile.itEndpointRange === 'OVER_5000' || profile.itEndpointRange === 'FROM_500_5000') {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('Large environment benefits from centralized logging');
        factors.push({
          parameter: 'IT Endpoints',
          value: profile.itEndpointRange,
          impact: '+15',
          explanation: 'Centralization essential for log analysis at scale'
        });
      }
      if (profile.geographicScope === 'GLOBAL') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Geographic Scope',
          value: 'GLOBAL',
          impact: '+10',
          explanation: 'Distributed operations benefit from centralized logs'
        });
      }
    }

    // 8.11 Conduct Audit Log Reviews
    if (sfId === '8.11') {
      if (profile.regulatoryObligations?.includes('NIS2') || profile.regulatoryObligations?.includes('DORA')) {
        relevanceScore = Math.min(100, relevanceScore + 15);
        factors.push({
          parameter: 'Regulatory Obligations',
          value: profile.regulatoryObligations.filter(r => ['NIS2', 'DORA'].includes(r)).join(', '),
          impact: '+15',
          explanation: 'NIS2/DORA require regular log review'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 9: Email and Web Browser Protections
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 9) {
    // Organization size affects email/web protection scope
    if (profile.size === 'LARGE' || profile.size === 'ENTERPRISE') {
      relevanceScore = Math.min(100, relevanceScore + 5);
      factors.push({
        parameter: 'Organization Size',
        value: profile.size,
        impact: '+5',
        explanation: 'More users increase phishing/malware risk surface'
      });
    }

    // 9.1 Ensure Use of Only Fully Supported Browsers and Email Clients
    if (sfId === '9.1') {
      if (profile.targetedAttackLikelihood === 'HIGH') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Targeted Attack Likelihood',
          value: 'HIGH',
          impact: '+10',
          explanation: 'Attackers exploit outdated browsers and email clients'
        });
      }
    }

    // 9.2 Use DNS Filtering Services
    if (sfId === '9.2') {
      if (profile.size === 'MICRO' || profile.size === 'SMALL') {
        if (!profile.itSecurityStaff || profile.itSecurityStaff === 'NO_DEDICATED_IT') {
          relevanceScore = Math.min(100, relevanceScore + 10);
          reasons.push('DNS filtering provides low-effort protection for small orgs');
          factors.push({
            parameter: 'IT Security Staff',
            value: profile.itSecurityStaff || 'NO_DEDICATED_IT',
            impact: '+10',
            explanation: 'DNS filtering is easy to deploy without security staff'
          });
        }
      }
    }

    // 9.5 Implement DMARC
    if (sfId === '9.5') {
      if (profile.publicFacingServices && profile.publicFacingServices !== 'NONE') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Public-Facing Services',
          value: profile.publicFacingServices,
          impact: '+10',
          explanation: 'DMARC protects brand from email spoofing'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 10: Malware Defenses
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 10) {
    // Malware defense is universally important but scale matters
    if (profile.itEndpointRange === 'OVER_5000' || profile.itEndpointRange === 'FROM_500_5000') {
      relevanceScore = Math.min(100, relevanceScore + 10);
      factors.push({
        parameter: 'IT Endpoints',
        value: profile.itEndpointRange,
        impact: '+10',
        explanation: 'More endpoints increase malware exposure surface'
      });
    }

    // 10.1 Deploy and Maintain Anti-Malware Software
    if (sfId === '10.1') {
      relevanceScore = 100;
      reasons.push('Anti-malware is essential for all organizations');
      factors.push({
        parameter: 'Universal',
        value: null,
        impact: '→ 100',
        explanation: 'Anti-malware is a fundamental protection'
      });
    }

    // 10.2 Configure Automatic Anti-Malware Signature Updates
    if (sfId === '10.2') {
      relevanceScore = 100;
      factors.push({
        parameter: 'Universal',
        value: null,
        impact: '→ 100',
        explanation: 'Signature updates essential for malware detection'
      });
    }

    // 10.7 Use Behavior-Based Anti-Malware Software
    if (sfId === '10.7') {
      if (profile.targetedAttackLikelihood === 'HIGH') {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('High-threat environment needs advanced malware detection');
        factors.push({
          parameter: 'Targeted Attack Likelihood',
          value: 'HIGH',
          impact: '+15',
          explanation: 'Advanced threats require behavior-based detection'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 11: Data Recovery
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 11) {
    // Downtime tolerance is critical for data recovery
    if (profile.downtimeTolerance === 'NEAR_ZERO') {
      relevanceScore = Math.min(100, relevanceScore + 15);
      reasons.push('Near-zero downtime tolerance requires robust recovery');
      factors.push({
        parameter: 'Downtime Tolerance',
        value: 'NEAR_ZERO',
        impact: '+15',
        explanation: 'Business continuity demands fast recovery capability'
      });
    } else if (profile.downtimeTolerance === 'HOURS') {
      relevanceScore = Math.min(100, relevanceScore + 10);
      factors.push({
        parameter: 'Downtime Tolerance',
        value: 'HOURS',
        impact: '+10',
        explanation: 'Limited tolerance requires tested recovery procedures'
      });
    }

    // Data sensitivity affects backup importance
    if (profile.dataSensitivity && profile.dataSensitivity.length > 0) {
      relevanceScore = Math.min(100, relevanceScore + 5);
      factors.push({
        parameter: 'Data Sensitivity',
        value: profile.dataSensitivity.join(', '),
        impact: '+5',
        explanation: 'Sensitive data loss has greater business impact'
      });
    }

    // 11.2 Perform Automated Backups
    if (sfId === '11.2') {
      if (profile.itEndpointRange === 'OVER_5000' || profile.itEndpointRange === 'FROM_500_5000') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'IT Endpoints',
          value: profile.itEndpointRange,
          impact: '+10',
          explanation: 'Large environments require automated backup processes'
        });
      }
    }

    // 11.4 Establish and Maintain an Isolated Instance of Recovery Data
    if (sfId === '11.4') {
      if (profile.targetedAttackLikelihood === 'HIGH') {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('High threat environment needs isolated recovery data');
        factors.push({
          parameter: 'Targeted Attack Likelihood',
          value: 'HIGH',
          impact: '+15',
          explanation: 'Ransomware/wipers require isolated backups'
        });
      }
    }

    // 11.5 Test Data Recovery
    if (sfId === '11.5') {
      if (profile.regulatoryObligations?.includes('DORA')) {
        relevanceScore = 100;
        reasons.push('DORA requires regular recovery testing');
        factors.push({
          parameter: 'Regulatory Obligations',
          value: 'DORA',
          impact: '→ 100',
          explanation: 'DORA mandates regular resilience testing'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 12: Network Infrastructure Management
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 12) {
    // Infrastructure type is primary driver
    if (profile.infrastructureTypes?.includes('CLOUD_ONLY') && profile.infrastructureTypes.length === 1) {
      relevanceScore = Math.max(40, relevanceScore - 30);
      reasons.push('Cloud-only environment has reduced network management needs');
      factors.push({
        parameter: 'Infrastructure Types',
        value: 'CLOUD_ONLY',
        impact: '-30 (floor: 40)',
        explanation: 'Cloud provider manages network infrastructure'
      });
    } else if (profile.infrastructureTypes?.includes('ON_PREMISES') || profile.infrastructureTypes?.includes('HYBRID')) {
      relevanceScore = Math.min(100, relevanceScore + 10);
      factors.push({
        parameter: 'Infrastructure Types',
        value: profile.infrastructureTypes.join(', '),
        impact: '+10',
        explanation: 'On-prem/hybrid infrastructure needs direct management'
      });
    }

    // 12.1 Ensure Network Infrastructure is Up-to-Date
    if (sfId === '12.1') {
      if (profile.publicFacingServices && profile.publicFacingServices !== 'NONE') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Public-Facing Services',
          value: profile.publicFacingServices,
          impact: '+10',
          explanation: 'Public exposure requires up-to-date network devices'
        });
      }
    }

    // 12.7 Ensure Remote Devices Utilize a VPN and are Connecting to an Enterprise's AAA Infrastructure
    if (sfId === '12.7') {
      if (profile.geographicScope === 'GLOBAL' || profile.geographicScope === 'EUROPEAN') {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('Distributed workforce requires secure remote access');
        factors.push({
          parameter: 'Geographic Scope',
          value: profile.geographicScope,
          impact: '+15',
          explanation: 'Remote workers need VPN for secure access'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 13: Network Monitoring and Defense
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 13) {
    // Small organizations have simpler monitoring needs
    if ((profile.size === 'MICRO' || profile.size === 'SMALL') && !profile.regulatoryObligations?.length) {
      relevanceScore = Math.max(40, relevanceScore - 30);
      reasons.push('Small organization with simpler monitoring requirements');
      factors.push({
        parameter: 'Organization Size',
        value: profile.size || null,
        impact: '-30 (floor: 40)',
        explanation: 'Small environments have simpler network patterns'
      });
    }

    // Threat level increases monitoring importance
    if (profile.targetedAttackLikelihood === 'HIGH') {
      relevanceScore = Math.min(100, relevanceScore + 20);
      reasons.push('High threat environment requires advanced network monitoring');
      factors.push({
        parameter: 'Targeted Attack Likelihood',
        value: 'HIGH',
        impact: '+20',
        explanation: 'Detection capabilities critical in high-threat environment'
      });
    }

    // 13.1 Centralize Security Event Alerting
    if (sfId === '13.1') {
      if (profile.itEndpointRange === 'OVER_5000' || profile.itEndpointRange === 'FROM_500_5000') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'IT Endpoints',
          value: profile.itEndpointRange,
          impact: '+10',
          explanation: 'Large environments need centralized alerting'
        });
      }
    }

    // 13.6 Collect Network Traffic Flow Logs
    if (sfId === '13.6') {
      if (profile.infrastructureTypes?.includes('CLOUD_ONLY') && profile.infrastructureTypes.length === 1) {
        relevanceScore = Math.max(50, relevanceScore - 20);
        factors.push({
          parameter: 'Infrastructure Types',
          value: 'CLOUD_ONLY',
          impact: '-20 (floor: 50)',
          explanation: 'Cloud environments use different flow logging approaches'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 14: Security Awareness and Skills Training
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 14) {
    // Training relevance scales with organization size
    if (profile.size === 'LARGE' || profile.size === 'ENTERPRISE') {
      relevanceScore = Math.min(100, relevanceScore + 10);
      factors.push({
        parameter: 'Organization Size',
        value: profile.size,
        impact: '+10',
        explanation: 'More employees require structured training programs'
      });
    }

    // 14.1 Establish and Maintain a Security Awareness Program
    if (sfId === '14.1') {
      if (profile.regulatoryObligations && profile.regulatoryObligations.length > 0) {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Regulatory Obligations',
          value: profile.regulatoryObligations.join(', '),
          impact: '+10',
          explanation: 'Compliance often requires security awareness programs'
        });
      }
    }

    // 14.3 Train Workforce on Authentication Best Practices
    if (sfId === '14.3') {
      if (profile.publicFacingServices && profile.publicFacingServices !== 'NONE') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Public-Facing Services',
          value: profile.publicFacingServices,
          impact: '+10',
          explanation: 'External services increase credential attack risk'
        });
      }
    }

    // 14.5 Train Workforce on Causes of Unintentional Data Exposure
    if (sfId === '14.5') {
      if (profile.dataSensitivity && profile.dataSensitivity.length > 0) {
        relevanceScore = Math.min(100, relevanceScore + 15);
        reasons.push('Sensitive data handling requires data exposure training');
        factors.push({
          parameter: 'Data Sensitivity',
          value: profile.dataSensitivity.join(', '),
          impact: '+15',
          explanation: 'Sensitive data mishandling has serious consequences'
        });
      }
    }

    // 14.9 Conduct Role-Specific Security Awareness and Skills Training
    if (sfId === '14.9') {
      if (profile.softwareDevelopment && profile.softwareDevelopment !== 'NONE') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Software Development',
          value: profile.softwareDevelopment,
          impact: '+10',
          explanation: 'Developers need specific secure coding training'
        });
      }
      if (profile.itSecurityStaff === 'SPECIALIZED_SECURITY' || profile.itSecurityStaff === 'DEDICATED_SECURITY') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'IT Security Staff',
          value: profile.itSecurityStaff,
          impact: '+10',
          explanation: 'Security staff need ongoing specialized training'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 15: Service Provider Management
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 15) {
    // Cloud reliance increases vendor management importance
    if (profile.infrastructureTypes?.includes('CLOUD_ONLY') || profile.infrastructureTypes?.includes('MULTI_CLOUD')) {
      relevanceScore = Math.min(100, relevanceScore + 15);
      reasons.push('Cloud dependency requires strong vendor management');
      factors.push({
        parameter: 'Infrastructure Types',
        value: profile.infrastructureTypes.join(', '),
        impact: '+15',
        explanation: 'Cloud reliance increases third-party risk'
      });
    }

    // As a service provider, controls are critical
    if (profile.supplyChainPosition === 'MSP_CLOUD_PROVIDER') {
      relevanceScore = 100;
      reasons.push('Service provider must demonstrate strong security controls');
      factors.push({
        parameter: 'Supply Chain Position',
        value: 'MSP_CLOUD_PROVIDER',
        impact: '→ 100',
        explanation: 'Service providers must meet client security requirements'
      });
    }

    // 15.1 Establish and Maintain an Inventory of Service Providers
    if (sfId === '15.1') {
      if (profile.regulatoryObligations?.includes('NIS2') || profile.regulatoryObligations?.includes('DORA')) {
        relevanceScore = Math.min(100, relevanceScore + 15);
        factors.push({
          parameter: 'Regulatory Obligations',
          value: profile.regulatoryObligations.filter(r => ['NIS2', 'DORA'].includes(r)).join(', '),
          impact: '+15',
          explanation: 'NIS2/DORA require vendor inventory and risk assessment'
        });
      }
    }

    // 15.4 Ensure Service Provider Contracts Include Security Requirements
    if (sfId === '15.4') {
      if (profile.dataSensitivity && profile.dataSensitivity.length > 0) {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Data Sensitivity',
          value: profile.dataSensitivity.join(', '),
          impact: '+10',
          explanation: 'Sensitive data sharing requires contractual protections'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 16: Application Software Security
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 16) {
    // Software development is the primary driver
    if (profile.softwareDevelopment === 'NONE') {
      shouldBeInactive = true;
      relevanceScore = 10;
      reasons.push('No software development - application security controls not applicable');
      factors.push({
        parameter: 'Software Development',
        value: 'NONE',
        impact: '→ INACTIVE (10)',
        explanation: 'No in-house development makes AppSec not applicable'
      });
    } else if (profile.softwareDevelopment === 'SOFTWARE_IS_PRODUCT') {
      relevanceScore = 100;
      reasons.push('Software product company - all AppSec safeguards are critical');
      factors.push({
        parameter: 'Software Development',
        value: 'SOFTWARE_IS_PRODUCT',
        impact: '→ 100',
        explanation: 'Software products require comprehensive application security'
      });
    } else if (profile.softwareDevelopment === 'CORE_BUSINESS') {
      relevanceScore = Math.min(100, relevanceScore + 15);
      reasons.push('Business-critical software development requires AppSec');
      factors.push({
        parameter: 'Software Development',
        value: 'CORE_BUSINESS',
        impact: '+15',
        explanation: 'Business-critical applications need security controls'
      });
    } else if (profile.softwareDevelopment === 'SOME_INTERNAL') {
      relevanceScore = Math.min(100, relevanceScore + 5);
      factors.push({
        parameter: 'Software Development',
        value: 'SOME_INTERNAL',
        impact: '+5',
        explanation: 'Internal tools benefit from basic AppSec practices'
      });
    }

    // 16.1 Establish and Maintain a Secure Application Development Process
    if (sfId === '16.1' && profile.softwareDevelopment !== 'NONE') {
      if (profile.regulatoryObligations?.includes('DORA')) {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Regulatory Obligations',
          value: 'DORA',
          impact: '+10',
          explanation: 'DORA requires secure development practices'
        });
      }
    }

    // 16.12 Implement Code-Level Security Checks
    if (sfId === '16.12' && profile.softwareDevelopment !== 'NONE') {
      if (profile.publicFacingServices === 'CRITICAL_SERVICES') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Public-Facing Services',
          value: 'CRITICAL_SERVICES',
          impact: '+10',
          explanation: 'Critical services need code-level security checks'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 17: Incident Response Management
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 17) {
    // Regulatory drivers
    if (profile.regulatoryObligations?.includes('NIS2') || profile.regulatoryObligations?.includes('DORA')) {
      relevanceScore = Math.min(100, relevanceScore + 15);
      reasons.push('NIS2/DORA require formal incident response capabilities');
      factors.push({
        parameter: 'Regulatory Obligations',
        value: profile.regulatoryObligations.filter(r => ['NIS2', 'DORA'].includes(r)).join(', '),
        impact: '+15',
        explanation: 'NIS2/DORA mandate incident response and reporting'
      });
    }

    // Threat likelihood
    if (profile.targetedAttackLikelihood === 'HIGH') {
      relevanceScore = Math.min(100, relevanceScore + 10);
      factors.push({
        parameter: 'Targeted Attack Likelihood',
        value: 'HIGH',
        impact: '+10',
        explanation: 'High-threat environment needs robust incident response'
      });
    }

    // 17.1 Designate Personnel to Manage Incident Handling
    if (sfId === '17.1') {
      if (profile.itSecurityStaff === 'SPECIALIZED_SECURITY' || profile.itSecurityStaff === 'DEDICATED_SECURITY') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'IT Security Staff',
          value: profile.itSecurityStaff,
          impact: '+10',
          explanation: 'Security staff can handle incident response roles'
        });
      }
    }

    // 17.4 Establish and Maintain an Incident Response Process
    if (sfId === '17.4') {
      if (profile.downtimeTolerance === 'NEAR_ZERO') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Downtime Tolerance',
          value: 'NEAR_ZERO',
          impact: '+10',
          explanation: 'Low tolerance demands efficient incident response'
        });
      }
    }

    // 17.7 Conduct Routine Incident Response Exercises
    if (sfId === '17.7') {
      if (profile.regulatoryObligations?.includes('DORA')) {
        relevanceScore = 100;
        reasons.push('DORA requires regular incident response exercises');
        factors.push({
          parameter: 'Regulatory Obligations',
          value: 'DORA',
          impact: '→ 100',
          explanation: 'DORA mandates regular resilience testing'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Control 18: Penetration Testing
  // ════════════════════════════════════════════════════════════════════════════
  if (controlId === 18) {
    // Budget and size constraints
    if (profile.securityBudgetRange === 'MINIMAL') {
      relevanceScore = Math.max(30, relevanceScore - 40);
      reasons.push('Limited budget may constrain penetration testing');
      factors.push({
        parameter: 'Security Budget',
        value: 'MINIMAL',
        impact: '-40 (floor: 30)',
        explanation: 'Budget constraints limit testing scope and frequency'
      });
    }

    if (profile.size === 'MICRO') {
      relevanceScore = Math.max(20, relevanceScore - 40);
      reasons.push('Micro organization may defer penetration testing');
      factors.push({
        parameter: 'Organization Size',
        value: 'MICRO',
        impact: '-40 (floor: 20)',
        explanation: 'Micro organizations typically defer pentesting'
      });
    } else if (profile.size === 'SMALL') {
      relevanceScore = Math.max(40, relevanceScore - 20);
      factors.push({
        parameter: 'Organization Size',
        value: 'SMALL',
        impact: '-20 (floor: 40)',
        explanation: 'Small organizations may do limited pentesting'
      });
    }

    // Regulatory drivers
    if (profile.regulatoryObligations?.includes('PCI_DSS')) {
      relevanceScore = 100;
      reasons.push('PCI-DSS requires regular penetration testing');
      factors.push({
        parameter: 'Regulatory Obligations',
        value: 'PCI_DSS',
        impact: '→ 100',
        explanation: 'PCI-DSS mandates annual penetration testing'
      });
    }

    if (profile.regulatoryObligations?.includes('DORA')) {
      relevanceScore = Math.min(100, relevanceScore + 15);
      factors.push({
        parameter: 'Regulatory Obligations',
        value: 'DORA',
        impact: '+15',
        explanation: 'DORA requires threat-led penetration testing'
      });
    }

    // Public exposure
    if (profile.publicFacingServices === 'CRITICAL_SERVICES') {
      relevanceScore = Math.min(100, relevanceScore + 15);
      reasons.push('Critical public services should undergo penetration testing');
      factors.push({
        parameter: 'Public-Facing Services',
        value: 'CRITICAL_SERVICES',
        impact: '+15',
        explanation: 'Critical services need regular security validation'
      });
    }

    // 18.1 Establish and Maintain a Penetration Testing Program
    if (sfId === '18.1') {
      if (profile.targetedAttackLikelihood === 'HIGH') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Targeted Attack Likelihood',
          value: 'HIGH',
          impact: '+10',
          explanation: 'High-threat environments benefit from regular testing'
        });
      }
    }

    // 18.4 Validate Security Measures
    if (sfId === '18.4') {
      if (profile.securityMaturity === 'MANAGED' || profile.securityMaturity === 'OPTIMIZING') {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Security Maturity',
          value: profile.securityMaturity,
          impact: '+10',
          explanation: 'Mature programs benefit from control validation'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Industry Sector (NACE) - Safeguard-level adjustments
  // ════════════════════════════════════════════════════════════════════════════
  if (profile.naceSection && !shouldBeInactive) {
    const sectorNames: Record<string, string> = {
      'D': 'Energy/Utilities', 'E': 'Water/Waste', 'H': 'Transportation',
      'K': 'Financial Services', 'Q': 'Healthcare', 'O': 'Public Admin', 'J': 'IT/Telecom'
    };
    const sectorName = sectorNames[profile.naceSection];

    // Healthcare-specific: patient data protection safeguards
    if (profile.naceSection === 'Q') {
      if (controlId === 3 && ['3.1', '3.2', '3.3', '3.10', '3.11'].includes(sfId)) {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Industry Sector',
          value: 'Healthcare',
          impact: '+10',
          explanation: 'Healthcare must protect patient data (special category)'
        });
      }
      if (sfId === '14.5') { // Data exposure training
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Industry Sector',
          value: 'Healthcare',
          impact: '+10',
          explanation: 'Healthcare staff need data handling training'
        });
      }
    }

    // Financial services: transaction security and fraud prevention
    if (profile.naceSection === 'K') {
      if (controlId === 6 && ['6.3', '6.4', '6.5'].includes(sfId)) { // MFA safeguards
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Industry Sector',
          value: 'Financial Services',
          impact: '+10',
          explanation: 'Financial services require strong authentication'
        });
      }
      if (controlId === 8) { // All audit logging
        relevanceScore = Math.min(100, relevanceScore + 5);
        factors.push({
          parameter: 'Industry Sector',
          value: 'Financial Services',
          impact: '+5',
          explanation: 'Financial regulations require comprehensive audit trails'
        });
      }
    }

    // Critical infrastructure (Energy, Water, Transport): availability focus
    if (['D', 'E', 'H'].includes(profile.naceSection)) {
      if (controlId === 11) { // Data Recovery
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Industry Sector',
          value: sectorName || 'Critical Infrastructure',
          impact: '+10',
          explanation: 'Critical infrastructure requires robust recovery capabilities'
        });
      }
      if (sfId === '17.4' || sfId === '17.7') { // Incident response process/exercises
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Industry Sector',
          value: sectorName || 'Critical Infrastructure',
          impact: '+10',
          explanation: 'Critical infrastructure incidents require rapid response'
        });
      }
    }

    // IT/Telecom: high-value target, advanced monitoring needed
    if (profile.naceSection === 'J') {
      if (controlId === 13 && ['13.1', '13.3', '13.6'].includes(sfId)) {
        relevanceScore = Math.min(100, relevanceScore + 10);
        factors.push({
          parameter: 'Industry Sector',
          value: 'IT/Telecom',
          impact: '+10',
          explanation: 'IT/Telecom sector is frequently targeted by advanced threats'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Digital Maturity - Safeguard-level adjustments
  // ════════════════════════════════════════════════════════════════════════════
  if (profile.digitalMaturity && !shouldBeInactive) {
    // Traditional organizations: automated safeguards are harder
    if (profile.digitalMaturity === 'TRADITIONAL') {
      // Automated inventory tools (1.3, 2.4)
      if (['1.3', '2.4'].includes(sfId)) {
        relevanceScore = Math.max(50, relevanceScore - 15);
        factors.push({
          parameter: 'Digital Maturity',
          value: 'TRADITIONAL',
          impact: '-15 (floor: 50)',
          explanation: 'Automated tools require digital infrastructure to deploy'
        });
      }
      // Automated patching (7.3, 7.4)
      if (['7.3', '7.4'].includes(sfId)) {
        factors.push({
          parameter: 'Digital Maturity',
          value: 'TRADITIONAL',
          impact: 'note',
          explanation: 'Automated patching may require infrastructure improvements'
        });
      }
      // Centralized logging (8.9, 8.11)
      if (['8.9', '8.11'].includes(sfId)) {
        relevanceScore = Math.max(50, relevanceScore - 10);
        factors.push({
          parameter: 'Digital Maturity',
          value: 'TRADITIONAL',
          impact: '-10 (floor: 50)',
          explanation: 'Log centralization requires compatible infrastructure'
        });
      }
    }

    // Digital-native organizations: can implement advanced safeguards
    if (profile.digitalMaturity === 'DIGITAL_NATIVE') {
      // Automated discovery and inventory (1.3, 1.5, 2.4)
      if (['1.3', '1.5', '2.4'].includes(sfId)) {
        relevanceScore = Math.min(100, relevanceScore + 5);
        factors.push({
          parameter: 'Digital Maturity',
          value: 'DIGITAL_NATIVE',
          impact: '+5',
          explanation: 'Digital-native can easily deploy automated discovery'
        });
      }
      // Continuous vulnerability scanning (7.5, 7.6)
      if (['7.5', '7.6'].includes(sfId)) {
        relevanceScore = Math.min(100, relevanceScore + 5);
        factors.push({
          parameter: 'Digital Maturity',
          value: 'DIGITAL_NATIVE',
          impact: '+5',
          explanation: 'Can implement continuous/automated vulnerability scanning'
        });
      }
      // Advanced AppSec (16.2, 16.9, 16.12)
      if (['16.2', '16.9', '16.12'].includes(sfId) && profile.softwareDevelopment !== 'NONE') {
        relevanceScore = Math.min(100, relevanceScore + 5);
        factors.push({
          parameter: 'Digital Maturity',
          value: 'DIGITAL_NATIVE',
          impact: '+5',
          explanation: 'Can integrate security into CI/CD pipelines'
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Fallback: If no specific factors were added, note the standard scope
  // ════════════════════════════════════════════════════════════════════════════
  if (reasons.length === 0 && factors.length === 1) {
    reasons.push(`Standard safeguard for IG${recommendedIg} compliance`);
    factors.push({
      parameter: 'Standard Scope',
      value: `IG${recommendedIg}`,
      impact: 'none',
      explanation: 'Standard safeguard with baseline relevance'
    });
  }

  return {
    safeguardId: safeguard.id,
    controlId,
    title: safeguard.title,
    recommendedIg,
    shouldBeInactive,
    reasons,
    relevanceScore,
    factors,
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
      factors: controlRelevance.factors,
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
