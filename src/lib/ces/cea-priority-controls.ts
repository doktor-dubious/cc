// CEA Priority Controls Engine
// Maps third-party exposure profile to the 5 most relevant CIS v8 Controls
// and identifies the priority safeguard under each control.

import type { ThirdPartyCompanyObj } from '@/lib/database/third-party';
import { generateCesReport, type CesReport } from './ces-report-generator';

export type PrioritySafeguard = {
  id: string;
  title: string;
  reason: string;
};

export type PriorityControl = {
  controlId: number;
  controlTitle: string;
  relevanceScore: number;        // 0-100
  reason: string;
  prioritySafeguard: PrioritySafeguard;
};

export type CeaPriorityResult = {
  companyId: string;
  companyName: string;
  cesReport: CesReport;
  priorityControls: PriorityControl[];
};

// Each scoring rule adds weight to specific CIS controls based on third-party attributes.
// The top 5 by accumulated score are returned.

type ControlScore = {
  score: number;
  reasons: string[];
  safeguard: PrioritySafeguard | null;
};

const CONTROL_META: Record<number, { title: string; safeguards: { id: string; title: string }[] }> = {
  1:  { title: 'Inventory and Control of Enterprise Assets',          safeguards: [{ id: '1.1', title: 'Establish and Maintain Detailed Enterprise Asset Inventory' }, { id: '1.2', title: 'Address Unauthorized Assets' }] },
  2:  { title: 'Inventory and Control of Software Assets',            safeguards: [{ id: '2.1', title: 'Establish and Maintain a Software Inventory' }, { id: '2.3', title: 'Address Unauthorized Software' }] },
  3:  { title: 'Data Protection',                                     safeguards: [{ id: '3.1', title: 'Establish and Maintain a Data Management Process' }, { id: '3.3', title: 'Configure Data Access Control Lists' }, { id: '3.10', title: 'Encrypt Sensitive Data in Transit' }, { id: '3.11', title: 'Encrypt Sensitive Data at Rest' }, { id: '3.12', title: 'Segment Data Processing and Storage Based on Sensitivity' }] },
  4:  { title: 'Secure Configuration of Enterprise Assets and Software', safeguards: [{ id: '4.1', title: 'Establish and Maintain a Secure Configuration Process' }, { id: '4.4', title: 'Implement and Manage a Firewall on Servers' }] },
  5:  { title: 'Account Management',                                  safeguards: [{ id: '5.1', title: 'Establish and Maintain an Inventory of Accounts' }, { id: '5.3', title: 'Disable Dormant Accounts' }, { id: '5.4', title: 'Restrict Administrator Privileges to Dedicated Administrator Accounts' }] },
  6:  { title: 'Access Control Management',                           safeguards: [{ id: '6.1', title: 'Establish an Access Granting Process' }, { id: '6.2', title: 'Establish an Access Revoking Process' }, { id: '6.3', title: 'Require MFA for Externally-Exposed Applications' }, { id: '6.5', title: 'Require MFA for Administrative Access' }, { id: '6.8', title: 'Define and Maintain Role-Based Access Control' }] },
  7:  { title: 'Continuous Vulnerability Management',                 safeguards: [{ id: '7.1', title: 'Establish and Maintain a Vulnerability Management Process' }, { id: '7.3', title: 'Perform Automated Operating System Patch Management' }, { id: '7.7', title: 'Remediate Detected Vulnerabilities' }] },
  8:  { title: 'Audit Log Management',                                safeguards: [{ id: '8.1', title: 'Establish and Maintain an Audit Log Management Process' }, { id: '8.2', title: 'Collect Audit Logs' }, { id: '8.11', title: 'Conduct Audit Log Reviews' }] },
  9:  { title: 'Email and Web Browser Protections',                   safeguards: [{ id: '9.1', title: 'Ensure Use of Only Fully Supported Browsers and Email Clients' }, { id: '9.2', title: 'Use DNS Filtering Services' }] },
  10: { title: 'Malware Defenses',                                    safeguards: [{ id: '10.1', title: 'Deploy and Maintain Anti-Malware Software' }, { id: '10.2', title: 'Configure Automatic Anti-Malware Signature Updates' }] },
  11: { title: 'Data Recovery',                                       safeguards: [{ id: '11.1', title: 'Establish and Maintain a Data Recovery Process' }, { id: '11.2', title: 'Perform Automated Backups' }, { id: '11.4', title: 'Establish and Maintain an Isolated Instance of Recovery Data' }] },
  12: { title: 'Network Infrastructure Management',                   safeguards: [{ id: '12.1', title: 'Ensure Network Infrastructure is Up-to-Date' }, { id: '12.2', title: 'Establish and Maintain a Secure Network Architecture' }] },
  13: { title: 'Network Monitoring and Defense',                      safeguards: [{ id: '13.1', title: 'Centralize Security Event Alerting' }, { id: '13.6', title: 'Collect Network Traffic Flow Logs' }] },
  14: { title: 'Security Awareness and Skills Training',              safeguards: [{ id: '14.1', title: 'Establish and Maintain a Security Awareness Program' }, { id: '14.2', title: 'Train Workforce Members to Recognize Social Engineering Attacks' }] },
  15: { title: 'Service Provider Management',                         safeguards: [{ id: '15.1', title: 'Establish and Maintain an Inventory of Service Providers' }, { id: '15.2', title: 'Establish and Maintain a Service Provider Management Policy' }, { id: '15.4', title: 'Ensure Service Provider Contracts Include Security Requirements' }] },
  16: { title: 'Application Software Security',                       safeguards: [{ id: '16.1', title: 'Establish and Maintain a Secure Application Development Process' }, { id: '16.9', title: 'Train Developers in Application Security Concepts and Secure Coding' }] },
  17: { title: 'Incident Response Management',                        safeguards: [{ id: '17.1', title: 'Designate Personnel to Manage Incident Handling' }, { id: '17.2', title: 'Establish and Maintain Contact Information for Reporting Security Incidents' }, { id: '17.3', title: 'Establish and Maintain an Enterprise Process for Reporting Incidents' }] },
  18: { title: 'Penetration Testing',                                 safeguards: [{ id: '18.1', title: 'Establish and Maintain a Penetration Testing Program' }, { id: '18.2', title: 'Perform Periodic External Penetration Tests' }] },
};

function initScores(): Map<number, ControlScore> {
  const m = new Map<number, ControlScore>();
  for (let i = 1; i <= 18; i++) {
    m.set(i, { score: 0, reasons: [], safeguard: null });
  }
  return m;
}

function addScore(scores: Map<number, ControlScore>, controlId: number, points: number, reason: string, safeguard?: PrioritySafeguard) {
  const entry = scores.get(controlId)!;
  entry.score += points;
  entry.reasons.push(reason);
  if (safeguard && (!entry.safeguard || points > 10)) {
    entry.safeguard = safeguard;
  }
}

function sf(controlId: number, safeguardId: string, reason: string): PrioritySafeguard {
  const meta = CONTROL_META[controlId];
  const s = meta.safeguards.find(s => s.id === safeguardId);
  return { id: safeguardId, title: s?.title ?? safeguardId, reason };
}

export function calculatePriorityControls(company: ThirdPartyCompanyObj): CeaPriorityResult {
  const cesReport = generateCesReport(company);
  const scores = initScores();

  // ── Access level drives access control, account management, and audit logging ──
  if (company.accessLevel === 'FULL_CONTROL' || company.accessLevel === 'PRIVILEGED') {
    addScore(scores, 6, 30, 'Privileged access requires strict access control',
      sf(6, '6.5', 'MFA for administrative access is critical for privileged third-party accounts'));
    addScore(scores, 5, 25, 'Privileged accounts need rigorous account management',
      sf(5, '5.4', 'Restrict administrator privileges to dedicated admin accounts'));
    addScore(scores, 8, 20, 'All privileged actions must be audit-logged',
      sf(8, '8.2', 'Collect audit logs for all privileged third-party activity'));
    addScore(scores, 13, 15, 'Monitor privileged third-party network activity',
      sf(13, '13.1', 'Centralize alerting to detect anomalous privileged access'));
  } else if (company.accessLevel === 'REMOTE') {
    addScore(scores, 6, 20, 'Remote access requires MFA and access controls',
      sf(6, '6.3', 'MFA for externally-exposed applications used by this third party'));
    addScore(scores, 8, 15, 'Remote sessions should be logged',
      sf(8, '8.2', 'Collect audit logs covering remote access sessions'));
  } else if (company.accessLevel === 'READ_ONLY') {
    addScore(scores, 6, 10, 'Read-only access still needs proper granting controls',
      sf(6, '6.1', 'Formalize access granting process for third-party read access'));
  }

  // ── Data sensitivity drives data protection and notification readiness ──
  if (company.dataHandled === 'SOCIETAL_CRITICAL' || company.dataHandled === 'BUSINESS_CRITICAL') {
    addScore(scores, 3, 30, 'Critical data requires comprehensive data protection',
      sf(3, '3.12', 'Segment critical data processing and storage'));
    addScore(scores, 11, 20, 'Critical data must be recoverable',
      sf(11, '11.4', 'Maintain isolated recovery data for critical information'));
    addScore(scores, 17, 15, 'Incident response must cover critical data breaches',
      sf(17, '17.3', 'Establish enterprise process for reporting data incidents'));
  } else if (company.dataHandled === 'SENSITIVE' || company.dataHandled === 'PERSONAL') {
    addScore(scores, 3, 20, 'Sensitive/personal data needs encryption and access controls',
      sf(3, '3.10', 'Encrypt sensitive data in transit between your org and this third party'));
    addScore(scores, 17, 10, 'Incident response should cover personal data breaches',
      sf(17, '17.2', 'Maintain contact information for reporting security incidents'));
  }

  // ── Delivery role drives supply chain and software security controls ──
  if (company.deliveryRole === 'OPERATE_CRITICAL_SYSTEM') {
    addScore(scores, 15, 30, 'Critical system operator requires rigorous service provider management',
      sf(15, '15.4', 'Ensure contracts include security requirements for system operation'));
    addScore(scores, 7, 20, 'Systems operated by third party need vulnerability management',
      sf(7, '7.7', 'Remediate detected vulnerabilities in third-party operated systems'));
    addScore(scores, 4, 15, 'Secure configuration of externally operated systems',
      sf(4, '4.1', 'Establish secure configuration standards for third-party managed systems'));
  } else if (company.deliveryRole === 'MANAGED_IT') {
    addScore(scores, 15, 25, 'Managed IT provider needs service provider oversight',
      sf(15, '15.2', 'Establish service provider management policy for managed IT'));
    addScore(scores, 7, 15, 'Patch management must extend to managed infrastructure',
      sf(7, '7.3', 'Automated OS patch management across managed infrastructure'));
    addScore(scores, 12, 15, 'Network infrastructure managed by third party needs oversight',
      sf(12, '12.1', 'Ensure third-party managed network infrastructure is up-to-date'));
  } else if (company.deliveryRole === 'HOSTING') {
    addScore(scores, 15, 20, 'Hosting provider requires contractual security requirements',
      sf(15, '15.4', 'Security requirements in hosting agreements'));
    addScore(scores, 4, 15, 'Hosted infrastructure needs secure configuration',
      sf(4, '4.4', 'Firewall management on hosted servers'));
    addScore(scores, 12, 10, 'Hosted network architecture must be secure',
      sf(12, '12.2', 'Maintain secure network architecture in hosted environment'));
  } else if (company.deliveryRole === 'SOFTWARE') {
    addScore(scores, 16, 25, 'Software supplier needs application security oversight',
      sf(16, '16.1', 'Ensure third-party follows a secure application development process'));
    addScore(scores, 2, 15, 'Track software components from this supplier',
      sf(2, '2.1', 'Maintain software inventory including third-party supplied software'));
    addScore(scores, 7, 15, 'Patch management for supplied software',
      sf(7, '7.4', 'Automated application patch management for third-party software'));
  }

  // ── Disruption impact drives data recovery and incident response ──
  if (company.disruptionImpact === 'SOCIETAL_CRITICAL' || company.disruptionImpact === 'PRODUCTION_STOP') {
    addScore(scores, 11, 25, 'High disruption impact demands robust data recovery',
      sf(11, '11.2', 'Automated backups for systems dependent on this third party'));
    addScore(scores, 17, 20, 'Critical disruption requires incident response readiness',
      sf(17, '17.1', 'Designate personnel for handling incidents involving this provider'));
    addScore(scores, 15, 10, 'Critical dependency must be managed contractually',
      sf(15, '15.1', 'Inventory this provider as a critical service provider'));
  } else if (company.disruptionImpact === 'OPERATIONAL_DISRUPTION') {
    addScore(scores, 11, 15, 'Operational disruption risk warrants backup planning',
      sf(11, '11.1', 'Establish data recovery process covering this dependency'));
    addScore(scores, 17, 10, 'Disruption scenarios need incident handling procedures',
      sf(17, '17.1', 'Designate personnel for managing operational disruption incidents'));
  }

  // ── Supply chain role drives service provider management ──
  if (company.supplyChainRole === 'CRITICAL_SUBSUPPLIER' || company.supplyChainRole === 'INTEGRATED') {
    addScore(scores, 15, 20, 'Deep supply chain integration needs formal provider management',
      sf(15, '15.1', 'Inventory and track deeply integrated supply chain dependencies'));
    addScore(scores, 1, 15, 'Integrated suppliers may bring unknown assets onto the network',
      sf(1, '1.2', 'Address unauthorized assets from integrated supply chain partners'));
  }

  // ── IT dependency level ──
  if (company.itDependency === 'HIGH') {
    addScore(scores, 7, 15, 'High IT dependency increases vulnerability exposure',
      sf(7, '7.1', 'Establish vulnerability management covering highly dependent systems'));
    addScore(scores, 10, 10, 'Malware defenses critical for high-IT-dependency relationships',
      sf(10, '10.1', 'Deploy anti-malware on systems interacting with this provider'));
  }

  // ── Regulatory burden ──
  if (company.regulatoryFramework === 'NIS2_ESSENTIAL' || company.regulatoryFramework === 'NIS2_IMPORTANT' ||
      company.regulatoryFramework === 'FINANCIAL' || company.regulatoryFramework === 'HEALTH') {
    addScore(scores, 8, 15, 'Regulatory framework demands comprehensive audit logging',
      sf(8, '8.1', 'Establish audit log management to satisfy regulatory requirements'));
    addScore(scores, 14, 10, 'Regulated relationships need security awareness training',
      sf(14, '14.1', 'Security awareness program covering regulatory obligations'));
  }

  // ── International operations and public brand increase exposure ──
  if (company.internationalOps) {
    addScore(scores, 15, 10, 'International operations require cross-border provider oversight',
      sf(15, '15.2', 'Service provider management policy covering international operations'));
  }
  if (company.publicBrand) {
    addScore(scores, 14, 10, 'Public brand exposure amplifies social engineering risk',
      sf(14, '14.2', 'Train workforce to recognize social engineering targeting brand relationships'));
  }
  if (company.criticalSocietalRole) {
    addScore(scores, 17, 15, 'Societal role demands mature incident response',
      sf(17, '17.1', 'Designate incident handling personnel for societal-critical dependencies'));
    addScore(scores, 18, 10, 'Critical societal role justifies penetration testing',
      sf(18, '18.2', 'External penetration tests covering interfaces with this provider'));
  }

  // ── No compliance function → training and governance controls ──
  if (company.dedicatedCompliance === false) {
    addScore(scores, 14, 10, 'No compliance function increases need for security training',
      sf(14, '14.1', 'Compensate for lack of third-party compliance with your own awareness program'));
  }

  // ── Core digital business ──
  if (company.coreDigital === 'YES') {
    addScore(scores, 9, 10, 'Core digital business increases web/email attack surface',
      sf(9, '9.1', 'Ensure supported browsers and email clients for digital interactions'));
    addScore(scores, 13, 10, 'Digital-native third party needs network monitoring',
      sf(13, '13.1', 'Centralize security event alerting for digital integrations'));
  }

  // ── Select top 5 and build result ──
  const sorted = Array.from(scores.entries())
    .filter(([, v]) => v.score > 0)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 5);

  const priorityControls: PriorityControl[] = sorted.map(([controlId, entry]) => {
    const meta = CONTROL_META[controlId];
    // If no specific safeguard was selected by rules, default to the first
    const safeguard = entry.safeguard ?? {
      id: meta.safeguards[0].id,
      title: meta.safeguards[0].title,
      reason: 'Primary safeguard for this control area.',
    };
    return {
      controlId,
      controlTitle: meta.title,
      relevanceScore: Math.min(100, entry.score),
      reason: entry.reasons[0],
      prioritySafeguard: safeguard,
    };
  });

  return {
    companyId: company.id,
    companyName: company.name,
    cesReport,
    priorityControls,
  };
}
