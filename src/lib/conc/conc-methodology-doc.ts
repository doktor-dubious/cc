import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';

// ─── Methodology content (shared between page + export) ─────────────────────

export type MethodologySection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export const METHODOLOGY_SECTIONS: MethodologySection[] = [
  {
    id: 'overview',
    title: 'Methodology Overview',
    paragraphs: [
      'The Cost of Non-Compliance (CoNC) model estimates the financial impact of a significant cyber incident across ten cost categories. Each category is calculated independently using organisation-specific inputs (revenue, sector, IT dependency, business orientation) and maturity scores derived from a CIS Controls v8 GAP assessment.',
      'All estimates are presented as a three-point range (low / mid / high) with the low and high bounds set at \u00b130% of the mid-point estimate. This range reflects the inherent uncertainty in incident cost modelling and aligns with the calibrated estimation approach recommended by Hubbard (2016) and the FAIR standard.',
    ],
  },
  {
    id: 'loss-taxonomy',
    title: 'Loss Taxonomy Alignment',
    paragraphs: [
      'The ten cost categories are structured to align with the Factor Analysis of Information Risk (FAIR) loss magnitude taxonomy, published as The Open Group Standard (O-RA / O-RR). FAIR is the only international standard for quantitative cyber risk analysis and is widely used by cyber insurance underwriters and enterprise risk teams.',
      'Operational Downtime and Extended Business Interruption map to FAIR\'s Productivity Loss. Incident Response & Forensics and Notification Costs map to Response Cost. System Restoration & Rebuild maps to Replacement Cost. Customer & Contract Loss maps to Competitive Advantage loss. Regulatory & Supervisory Cost and the Administrative Fine Ceiling map to Fines & Judgments. Reputational Impact maps to Reputation Damage. Management & Governance Cost represents internal overhead that spans multiple FAIR categories.',
    ],
  },
  {
    id: 'data-sources',
    title: 'Primary Data Sources',
    paragraphs: [
      'IBM / Ponemon Institute \u2014 Cost of a Data Breach Report (annual, published since 2006). The sector adjustment factors used in this model are calibrated from the industry-specific cost figures in IBM\'s dataset. This is the largest and most widely cited longitudinal study of breach costs, covering 6,000+ organisations across 16 countries. The 2024 report (covering 2023 incidents) reports a global average breach cost of $4.88M, with organisations under 500 employees averaging $3.31M \u2014 disproportionately high relative to revenue.',
      'Hiscox Cyber Readiness Report (annual). Provides SME-specific cyber incident cost data across European markets, including median and mean costs by organisation size band. Particularly relevant for validating base cost tiers for organisations in the \u20ac10M\u2013\u20ac250M revenue range.',
      'ENISA Threat Landscape and ENISA Cybersecurity for SMEs (2021). Published by the EU Agency for Cybersecurity, these reports provide European-focused incident frequency data and SME-specific risk guidance. ENISA carries regulatory authority weight as the body advising on NIS2 implementation.',
      'Verizon Data Breach Investigations Report (DBIR, annual). While primarily focused on attack patterns rather than costs, the DBIR provides authoritative data on incident frequency and vectors that inform the threat likelihood assumptions underlying this model.',
    ],
  },
  {
    id: 'sector-factors',
    title: 'Sector Adjustment Factors',
    paragraphs: [
      'Each organisation\'s NACE section code is mapped to an IBM industry classification, which determines a sector-specific cost factor. These factors range from 0.90 (Public sector) to 1.10 (Healthcare), normalised around 1.0. The narrow range reflects that while sector influences breach costs significantly in absolute terms, much of that variation is already captured by revenue-based scaling. The sector factor captures the residual effect \u2014 for example, Healthcare\'s higher factor reflects elevated regulatory scrutiny, data sensitivity, and operational criticality.',
    ],
  },
  {
    id: 'revenue-scaling',
    title: 'Revenue-Based Cost Scaling',
    paragraphs: [
      'Base costs for Incident Response, System Restoration, Regulatory, and Governance categories are scaled by annual revenue using piecewise linear interpolation between anchor points at \u20ac0, \u20ac50M, and \u20ac250M. This produces a smooth, continuous cost curve rather than discrete tier jumps.',
      'For example, the IR base cost interpolates from \u20ac500K at \u20ac0 revenue to \u20ac1.2M at \u20ac50M to \u20ac3M at \u20ac250M+. A \u20ac25M company receives an IR base of \u20ac850K, a \u20ac100M company receives \u20ac1.55M, and a \u20ac200M company receives \u20ac2.55M. This eliminates cliff-edge discontinuities at tier boundaries, where previously a negligible revenue change (e.g., \u20ac49.9M to \u20ac50.1M) could cause a 2.4\u00d7 cost jump.',
      'The anchor point values are calibrated from IBM Cost of a Data Breach industry data, adjusted for the European mid-market. Above the highest anchor point (\u20ac250M), the base cost clamps to the maximum value.',
    ],
  },
  {
    id: 'maturity-model',
    title: 'Maturity-Based Adjustments',
    paragraphs: [
      'Security maturity is assessed using CMMI (Capability Maturity Model Integration) levels 1\u20135 for specific CIS Controls v8 safeguards. The CIS Controls framework is maintained by the Center for Internet Security and is one of the most widely adopted security control frameworks globally.',
      'Maturity scores feed the model in two ways. First, an aggregate GAP score across 8 safeguards (11.1, 11.2, 11.4, 11.5, 17.1, 17.2, 17.5, 8.11) determines the expected downtime duration (1.0\u20135.0 days). A fully immature organisation (all CMMI level 1) receives 5.0 days \u2014 realistic for ransomware at an unprepared SME. A fully mature organisation (all CMMI level 5) receives 1.0 day \u2014 the minimum realistic downtime for a significant incident even with strong preparation. Second, sub-group scores for Incident Response safeguards (17.1, 17.2, 17.5, 8.11) and Backup/Restore safeguards (11.2, 11.4, 11.5) drive maturity multipliers on their respective cost categories. Safeguard 8.11 (Monitoring/Detection) is included in the IR sub-group because detection capability directly affects incident response cost and duration \u2014 IBM\u2019s 2024 report found that organisations with security AI and automation (which depends on monitoring maturity) saved $2.22M per breach, largely through faster detection.',
      'The IR maturity multiplier formula (1.3 \u2212 ((score \u2212 1) / 4) \u00d7 0.5) produces a range from 1.3\u00d7 at CMMI level 1 (immature) to 0.8\u00d7 at CMMI level 5 (optimised). This aligns with IBM\'s finding that organisations with tested incident response plans save approximately $2.66M per breach compared to those without. The Restore maturity multiplier uses a steeper slope (1.4 \u2212 ((score \u2212 1) / 4) \u00d7 0.7, range 1.4\u00d7 to 0.7\u00d7), reflecting that backup and recovery maturity has a stronger cost-reduction effect on restoration than IR process maturity has on forensics \u2014 a well-tested, automated backup regime can eliminate the most expensive component of system rebuild.',
    ],
  },
  {
    id: 'it-dependency',
    title: 'IT Dependency Model',
    paragraphs: [
      'IT dependency is assessed across three dimensions: manual operation capability (can the business operate without IT?), production dependency on IT systems, and customer access dependency. Each dimension scores 0\u20132, producing an aggregate score of 0\u20136 that maps to Low (0\u20131), Medium (2\u20133), or High (4\u20136) dependency levels.',
      'The IT dependency level drives two effects. First, it determines the IT Factor (30%, 60%, or 90%), which represents the proportion of daily revenue at risk during a system outage. Second, it provides a multiplier on IR, Restore, and EBI costs, reflecting that highly IT-dependent organisations face proportionally higher incident handling and recovery costs.',
    ],
  },
  {
    id: 'org-size',
    title: 'Organisation Size Factor',
    paragraphs: [
      'Organisation size (EU SME Classification per Commission Recommendation 2003/361/EC) is used as a complexity multiplier on the adjusted daily loss. Two organisations with identical revenue but different workforce sizes experience different incident impacts: a larger organisation has more systems to coordinate, more people idled during downtime, and greater operational overhead during recovery.',
      'The multipliers are: Micro (0\u20139 employees): 0.90\u00d7, Small (10\u201349): 0.95\u00d7, Medium (50\u2013249): 1.00\u00d7 (baseline), Large (250\u2013999): 1.10\u00d7, Enterprise (1000+): 1.15\u00d7. These are deliberately mild \u2014 revenue remains the primary cost driver, with size acting as a secondary adjustment for organisational complexity.',
    ],
  },
  {
    id: 'infra-type',
    title: 'Infrastructure Type Factor',
    paragraphs: [
      'The organisation\u2019s infrastructure types (from the organisation profile) drive a multiplier on System Restoration & Rebuild costs. Cloud-native organisations restore significantly faster and cheaper due to infrastructure-as-code, immutable deployments, and automated re-provisioning. On-premises and Operational Technology (OT/ICS/SCADA) environments require physical intervention, hardware procurement, and specialised safety validation.',
      'The multipliers are: Cloud Only: 0.75\u00d7, Multi-Cloud: 0.85\u00d7, Hybrid: 1.00\u00d7 (baseline), On-Premises: 1.20\u00d7, Operational Technology: 1.35\u00d7. When an organisation has multiple infrastructure types, the highest multiplier applies \u2014 restore cost is bottlenecked by the slowest-to-recover infrastructure layer. For example, an organisation with both Cloud Only and Operational Technology infrastructure receives the OT multiplier (1.35\u00d7).',
    ],
  },
  {
    id: 'ebi-model',
    title: 'Extended Business Interruption (EBI) Model',
    paragraphs: [
      'EBI captures post-recovery productivity loss \u2014 the period after core systems are restored but the organisation has not yet returned to full operational capacity. This includes backlog clearing, manual workarounds, re-training, and re-establishing workflow context.',
      'The model uses a quadratic recovery friction formula: friction days = 0.15 \u00d7 downtimeDays\u00b2. This reflects three empirical observations: short outages (1 day) produce near-zero EBI because staff absorb the backlog naturally (0.15 friction days); medium outages (~3 days) produce moderate EBI (1.35 friction days) as backlogs accumulate beyond easy recovery; and long outages (5+ days) produce super-linear EBI (3.75 friction days) as cascading backlogs, lost work context, and process disruption compound. The quadratic relationship is consistent with queueing theory, where recovery time from a service interruption grows faster than the interruption length once backlogs exceed buffer capacity.',
    ],
  },
  {
    id: 'cost-bands',
    title: 'Range Estimates (\u00b130% Bands)',
    paragraphs: [
      'All cost estimates are presented with low (\u221230%) and high (+30%) bounds around the mid-point. This is a deliberate modelling choice, not an expression of low confidence.',
      'The FAIR standard and Hubbard (2016) both advocate for range estimates over point estimates in risk quantification. A \u00b130% band is conservative \u2014 real-world incident costs exhibit significantly higher variance. The band represents the range within which the cost is most likely to fall for a typical incident of the modelled severity, not the full distribution of possible outcomes.',
      'The mid-point should be interpreted as the expected value for a significant but not catastrophic incident. Tail-risk scenarios (e.g., extended ransomware with data exfiltration) may substantially exceed the high estimate.',
    ],
  },
  {
    id: 'fine-ceiling',
    title: 'Administrative Fine Ceiling',
    paragraphs: [
      'The administrative fine ceiling represents the statutory maximum fine exposure, not an expected fine amount. It is deliberately excluded from the CoNC total because it is a legal ceiling, not a probabilistic cost estimate.',
      'The rates used reflect NIS2 Article 34 fine ceilings. For Essential entities: the higher of 2% of worldwide annual turnover or \u20ac10M. For Important entities: the higher of 1.4% of worldwide annual turnover or \u20ac7M. These are the statutory maximums under NIS2 and are deliberately kept separate from GDPR Article 83 fines, which may apply in parallel but are modelled independently.',
    ],
  },
  {
    id: 'data-sensitivity',
    title: 'Data Sensitivity Factor',
    paragraphs: [
      'The type of data compromised in a breach dramatically affects reputational impact. A breach of health records or children\u2019s data generates far greater public outrage and media coverage than exposure of internal business documents. The model applies a data sensitivity multiplier to the Reputational Impact category based on the organisation\u2019s data sensitivity profile.',
      'The multipliers are: Basic Business Data: 0.80\u00d7, Intellectual Property: 0.90\u00d7, Critical Infrastructure Data and Customer PII: 1.00\u00d7 (baseline), Payment Card Data: 1.30\u00d7, Special Category Data (health, biometric, children\u2019s) and Classified/Government Data: 1.50\u00d7. When an organisation handles multiple data types, the highest multiplier applies \u2014 reputational damage is driven by the most sensitive data exposed.',
    ],
  },
  {
    id: 'reg-multi-framework',
    title: 'Multi-Framework & Cross-Border Regulatory Exposure',
    paragraphs: [
      'Organisations subject to multiple regulatory frameworks face compounding supervisory costs after an incident. Each framework may require separate incident notifications (e.g., NIS2 Article 23 to CSIRT, GDPR Article 33 to DPA, DORA Article 19 to financial supervisor), independent audits, distinct documentation formats, and parallel remediation plans. The model applies a multi-framework multiplier of 1.0\u00d7 for a single framework, adding 0.25\u00d7 for each additional framework. For example, an organisation subject to NIS2 + GDPR + DORA receives a 1.50\u00d7 multiplier. The 0.25\u00d7 increment (rather than a full 1.0\u00d7) reflects that compliance processes partially overlap \u2014 an incident response documented for NIS2 substantially satisfies GDPR requirements, but not entirely.',
      'Frameworks that do not create direct supervisory obligations (cyber insurance, "none/not sure") are excluded from the count. The qualifying frameworks are: GDPR, NIS2, DORA, EU AI Act, PCI DSS, and industry-specific regulation.',
      'Geographic scope further affects regulatory cost. Organisations operating across multiple EU member states (European scope) must coordinate with multiple national supervisory authorities, multiplying notification and response effort (1.20\u00d7). Organisations with global operations face additional non-EU regulatory requirements (1.35\u00d7), such as the UK ICO, US state attorney general notifications, or APAC data protection authorities.',
    ],
  },
  {
    id: 'regulatory',
    title: 'Regulatory Alignment',
    paragraphs: [
      'NIS2 Directive (EU 2022/2555), Article 21 mandates risk-based security measures proportionate to the risk. Recital 89 explicitly requires consideration of "the likelihood of incidents and their severity, including their societal and economic impact." This model directly supports that obligation by quantifying the economic impact dimension.',
      'GDPR (Regulation 2016/679), Article 32 requires security measures appropriate to the risk, "taking into account the state of the art, the costs of implementation and the nature, scope, context and purposes of processing as well as the risk of varying likelihood and severity." The CoNC output provides the cost baseline against which security investment decisions can be evaluated.',
      'The Gordon-Loeb Model (2002, published in ACM Transactions on Information and System Security) provides a theoretical framework showing that optimal security investment is bounded by approximately 37% of the expected loss. When combined with the CoNC mid-point estimate, this gives organisations a principled upper bound for their security budget.',
    ],
  },
  {
    id: 'notification-costs',
    title: 'Notification Costs',
    paragraphs: [
      'GDPR Article 33 requires notification to the supervisory authority within 72 hours of becoming aware of a personal data breach. Article 34 requires individual notification to affected data subjects "without undue delay" when the breach is likely to result in a high risk to their rights and freedoms. NIS2 Article 23 imposes parallel notification obligations to the national CSIRT for essential and important entities.',
      'Notification costs cover: contact database management and data subject identification, communication production and delivery (letters, email, dedicated call centres), credit monitoring and identity protection services offered to affected individuals, and legal review of notification content across jurisdictions. IBM\'s 2024 Cost of a Data Breach Report reports average notification costs of $430K globally.',
      'The base cost is interpolated by revenue (€100K at €0 to €800K at €250M+), then adjusted by data sensitivity (higher-sensitivity data triggers broader individual notification and more expensive remediation services), organisation size (larger organisations typically have more affected data subjects), geographic scope (cross-border operations require multi-jurisdiction notifications), and regulatory framework count (each framework may require separate notification procedures).',
    ],
  },
  {
    id: 'limitations',
    title: 'Limitations & Conservative Assumptions',
    paragraphs: [
      'This model estimates the cost of a single significant cyber incident (e.g., ransomware with operational disruption). It does not model aggregate annual loss expectancy across multiple smaller incidents.',
      'The downtime range of 1.0\u20135.0 days (with \u00b130% bands giving 0.7\u20136.5 days) models a significant incident. Real-world ransomware incidents have caused 10\u201321+ days of disruption in severe cases (e.g., Maersk ~10 days, Change Healthcare 2024: weeks). Organisations concerned about tail risk should consider the high estimate as a floor rather than a ceiling for the most severe scenarios.',
    ],
  },
  {
    id: 'breach-likelihood-overview',
    title: 'Annual Breach Likelihood Model',
    paragraphs: [
      'The Annual Breach Likelihood model estimates the probability of a material data breach occurring within a 12-month period. It complements the CoNC cost model by answering "how likely?" before "how much?". Together, these two outputs enable a complete quantitative risk statement aligned with the FAIR standard: Annual Loss Expectancy = Loss Event Frequency \u00d7 Loss Magnitude.',
      'The model uses a logistic base-rate approach: logit(P) = logit(P_base) + \u03a3(\u03b2\u1d62 \u00d7 factor\u1d62), where P is the annual breach probability, P_base is a size-calibrated base rate, and each \u03b2\u1d62 represents a risk-modifying factor. The logistic (log-odds) transform ensures the output remains a valid probability (0\u20131) regardless of the number or magnitude of factors, and is the standard mathematical framework used in actuarial risk modelling and cyber insurance pricing.',
      'All estimates are presented with \u00b130% confidence bands, consistent with the CoNC cost model and with calibrated estimation practices recommended by Hubbard & Seiersen (2016) and the FAIR standard.',
    ],
  },
  {
    id: 'breach-likelihood-base-rates',
    title: 'Breach Likelihood Base Rates',
    paragraphs: [
      'Base annual breach probabilities are calibrated by organisation size, reflecting the well-documented log-linear relationship between company size and breach frequency. Larger organisations have more assets, users, and attack surface, and are more likely to both experience and detect breaches.',
      'The base rates are: Micro (0\u20139 employees): 6%, Small (10\u201349): 10%, Medium (50\u2013249): 18%, Large (250\u2013999): 25%, Enterprise (1000+): 33%. These are calibrated from three primary sources: the Cyentia Institute IRIS reports (2020\u20132024), which provide actuarial-quality breach frequency data by company size band; the Hiscox Cyber Readiness Report (2024), which reports ~18% of European firms experienced a cyber incident; and IBM/Ponemon (2024), which found ~27% of sampled organisations had a data breach over a 24-month period.',
      'These rates represent "material breach" probabilities \u2014 incidents with significant data exfiltration or operational disruption \u2014 not all security events. Minor incidents (failed phishing attempts, blocked malware) occur far more frequently but are excluded from the model.',
    ],
  },
  {
    id: 'breach-likelihood-factors',
    title: 'Breach Likelihood Factor Contributions',
    paragraphs: [
      'Thirteen factors adjust the base rate in logit space. Each factor has a \u03b2 coefficient derived from empirical data and expert calibration. Positive \u03b2 values increase breach likelihood; negative values decrease it.',
      'Industry sector is derived from the same NACE-to-IBM mapping used in the CoNC model. Healthcare (+0.40), Financial (+0.30), and Technology (+0.15) sectors face elevated breach rates due to data value and targeting. Public sector (\u22120.10) experiences lower rates due to reduced financial motivation for attackers. Source: Verizon DBIR 2024 industry-specific breach frequency analysis.',
      'CIS Controls maturity is the largest controllable factor, decomposed into three sub-groups for actionable insight. Preventive Controls (CIS 4, 5, 6, 7, 10, 14 \u2014 45% weight) cover access control, vulnerability management, malware defence, and security awareness. Detective Controls (CIS 8, 9, 13 \u2014 35% weight) cover audit logging, email/web protections, and network monitoring. Data Protection Controls (CIS 3, 11 \u2014 20% weight) cover data management and recovery. For each sub-group, the average CMMI score (1\u20135) maps to a \u03b2 coefficient: at CMMI 1 (immature), \u03b2 = 0 (no protective effect); at CMMI 5 (optimised), \u03b2 reaches its maximum protective value. The total CIS maturity \u03b2 ranges from 0 to \u22120.80, meaning a fully mature organisation reduces its breach odds by approximately 55% relative to an immature one. This aligns with Cyentia IRIS findings that top-quintile security maturity organisations experience ~45% fewer breaches, and with IBM\u2019s 2024 finding that security AI/automation (dependent on detective maturity) saved $2.22M per breach.',
      'Additional factors capture organisation-specific risk characteristics already collected in the organisation profile: data sensitivity (the attractiveness of the data to attackers, ranging from Basic Business at \u22120.15 to Classified Government at +0.25), infrastructure exposure (Cloud Only at \u22120.10 to Operational Technology at +0.20), geographic scope (Local at \u22120.10 to Global at +0.10), IT security staffing, security program maturity, public-facing services, self-assessed targeted attack likelihood, and supply chain position. Each uses a lookup table with \u03b2 values calibrated from DBIR, ENISA, and IBM sector data.',
    ],
  },
  {
    id: 'annual-loss-expectancy',
    title: 'Annual Loss Expectancy (ALE)',
    paragraphs: [
      'The Annual Loss Expectancy combines the breach likelihood model with the CoNC cost model to produce a single monetary risk figure: ALE = P(breach) \u00d7 CoNC Total. This is the core output of the FAIR (Factor Analysis of Information Risk) standard, where ALE equals Loss Event Frequency multiplied by Loss Magnitude.',
      'The CoNC Total is the sum of all nine cost category mid-points (Operational Downtime, Incident Response, System Restoration, Extended Business Interruption, Customer & Contract Loss, Regulatory, Reputational, Governance, and Notification). The Administrative Fine Ceiling is excluded as it represents a statutory maximum, not an expected cost.',
      'The ALE low and high bounds combine the uncertainty from both models: the low estimate uses the low probability bound with the low cost bound (\u00d70.7 \u00d7 \u00d70.7 = \u00d70.49), and the high estimate uses the high probability bound with the high cost bound (\u00d71.3 \u00d7 \u00d71.3 = \u00d71.69). This produces a wider band than either model alone, reflecting the compounding of uncertainty across both frequency and magnitude dimensions.',
      'The Gordon-Loeb Model (2002) demonstrates that optimal security investment is bounded by approximately 37% (1/e) of the expected loss. The ALE mid-point estimate therefore provides a principled upper bound for the organisation\u2019s annual security budget: security spending should not exceed ~37% of ALE to remain economically rational.',
    ],
  },
  {
    id: 'breach-likelihood-limitations',
    title: 'Breach Likelihood Limitations',
    paragraphs: [
      'The logistic model assumes factor independence \u2014 that is, each factor adjusts the log-odds additively without interaction terms. In practice, factors interact (e.g., poor access controls combined with high data attractiveness may compound risk more than the sum of their individual effects). The additive model is a deliberate simplification that trades precision for transparency and auditability.',
      'The base rates are calibrated from aggregate industry data (Cyentia IRIS, Verizon DBIR, IBM/Ponemon) and carry inherent sampling bias: breach frequency data over-represents organisations that detect and report breaches. Smaller organisations with no detection capability may experience unreported breaches, which would make the MICRO and SMALL base rates conservative.',
      'The \u00b130% band represents calibrated uncertainty around the point estimate. The true distribution of breach likelihood is wider and right-skewed \u2014 most organisations in a cohort experience no breach in a given year, while a small number experience multiple incidents. The model output should be interpreted as a calibrated expected probability, not a prediction.',
      'This model does not account for threat landscape changes (zero-day prevalence, emerging attack techniques) or organisation-specific factors such as previous breach history, active threat intelligence, or the quality of specific security tools deployed. Organisations concerned about targeted threats should treat the estimate as a floor and consider scenario-based analysis for tail risk.',
    ],
  },
];

// ─── FAIR mapping table data ────────────────────────────────────────────────

export const FAIR_MAPPING = [
  { fair: 'Productivity Loss', conc: 'Operational Downtime + Extended Business Interruption' },
  { fair: 'Response Cost', conc: 'Incident Response & Forensics + Notification Costs' },
  { fair: 'Replacement Cost', conc: 'System Restoration & Rebuild' },
  { fair: 'Competitive Advantage', conc: 'Customer & Contract Loss' },
  { fair: 'Fines & Judgments', conc: 'Regulatory & Supervisory Cost + Fine Ceiling' },
  { fair: 'Reputation Damage', conc: 'Reputational Impact' },
];

export const REFERENCES = [
  'IBM Security / Ponemon Institute. Cost of a Data Breach Report 2024. IBM Corporation.',
  'Hiscox. Cyber Readiness Report 2024. Hiscox Ltd.',
  'ENISA. Threat Landscape 2024. European Union Agency for Cybersecurity.',
  'ENISA. Cybersecurity for SMEs. 2021. European Union Agency for Cybersecurity.',
  'Verizon. 2024 Data Breach Investigations Report. Verizon Business.',
  'The Open Group. Open FAIR\u2122 Risk Analysis (O-RA) Standard. The Open Group.',
  'CIS. CIS Controls v8. Center for Internet Security, Inc.',
  'CIS. CIS Risk Assessment Method (CIS RAM) v2.1. Center for Internet Security, Inc.',
  'Gordon, L.A. & Loeb, M.P. (2002). The Economics of Information Security Investment. ACM Transactions on Information and System Security, 5(4), 438\u2013457.',
  'Hubbard, D.W. & Seiersen, R. (2016). How to Measure Anything in Cybersecurity Risk. Wiley.',
  'ISO/IEC 27005:2022. Information Security Risk Management. International Organization for Standardization.',
  'NIST SP 800-30 Rev. 1. Guide for Conducting Risk Assessments. National Institute of Standards and Technology.',
  'Directive (EU) 2022/2555 (NIS2). European Parliament and Council.',
  'Regulation (EU) 2016/679 (GDPR). European Parliament and Council.',
  'Jacobs, J. et al. (2020\u20132024). Information Risk Insights Study (IRIS). Cyentia Institute.',
  'Romanosky, S. (2016). Examining the Costs and Causes of Cyber Incidents. Journal of Cybersecurity, 2(2), 121\u2013135.',
  'Edwards, B., Hofmeyr, S. & Forrest, S. (2016). Hype and Heavy Tails: A Closer Look at Data Breaches. Journal of Cybersecurity, 2(1), 3\u201314.',
];

// ─── DOCX export ────────────────────────────────────────────────────────────

type DocChild = Paragraph | Table;

export async function exportMethodologyDocx(orgName?: string): Promise<void> {
  const children: DocChild[] = [];

  // Title block
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Cost of Non-Compliance (CoNC)', bold: true, size: 36 })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Methodology & Sources', size: 28, color: '666666' })],
      spacing: { after: 200 },
    }),
  );

  if (orgName) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Prepared for: ', bold: true }),
          new TextRun({ text: orgName }),
        ],
        spacing: { after: 100 },
      }),
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
          color: '888888',
        }),
      ],
      spacing: { after: 400 },
    }),
  );

  // Methodology sections
  for (const section of METHODOLOGY_SECTIONS) {
    children.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    );
    for (const para of section.paragraphs) {
      children.push(
        new Paragraph({ text: para, spacing: { after: 200 } }),
      );
    }
  }

  // FAIR mapping table
  children.push(
    new Paragraph({
      text: 'FAIR Loss Taxonomy Mapping',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'FAIR Loss Form', bold: true })] })],
              width: { size: 35, type: WidthType.PERCENTAGE },
              shading: { fill: 'E5E7EB' },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'CoNC Category', bold: true })] })],
              width: { size: 65, type: WidthType.PERCENTAGE },
              shading: { fill: 'E5E7EB' },
            }),
          ],
        }),
        ...FAIR_MAPPING.map(
          (row) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: row.fair })] }),
                new TableCell({ children: [new Paragraph({ text: row.conc })] }),
              ],
            }),
        ),
      ],
    }),
  );

  // References
  children.push(
    new Paragraph({
      text: 'References',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
  );
  for (const ref of REFERENCES) {
    children.push(
      new Paragraph({ text: ref, bullet: { level: 0 }, spacing: { after: 80 } }),
    );
  }

  // Confidentiality footer
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Confidential \u2014 Compliance Circle', italics: true, color: '999999', size: 18 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
    }),
  );

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const filename = orgName
    ? `${orgName.replace(/\s+/g, '_')}_CoNC_Methodology.docx`
    : 'CoNC_Methodology.docx';
  saveAs(blob, filename);
}
