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
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';
import type { ConcAllCosts, ConcSteps, IrSteps, RestoreSteps, EbiSteps, CclSteps, RegSteps, ReputationSteps, GovSteps, NotificationSteps, FineSteps, CostBand } from './conc-calculator';
import type { BreachLikelihoodBand, AleBand, FactorContribution } from './breach-likelihood-calculator';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(value: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function pctProb(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

type DocChild = Paragraph | Table;

const BORDER_NONE = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
} as const;

const HEADER_SHADING = { fill: 'E5E7EB' };

function costBandTable(band: CostBand): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Low (-30%)', bold: true, size: 20 })] })],
            width: { size: 33, type: WidthType.PERCENTAGE },
            shading: HEADER_SHADING,
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Mid (expected)', bold: true, size: 20 })] })],
            width: { size: 34, type: WidthType.PERCENTAGE },
            shading: HEADER_SHADING,
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'High (+30%)', bold: true, size: 20 })] })],
            width: { size: 33, type: WidthType.PERCENTAGE },
            shading: HEADER_SHADING,
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ text: fmt(band.low) })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(band.mid), bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ text: fmt(band.high) })] }),
        ],
      }),
    ],
  });
}

function stepsTable(steps: { label: string; value: string }[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Step', bold: true, size: 20 })] })],
            width: { size: 5, type: WidthType.PERCENTAGE },
            shading: HEADER_SHADING,
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Parameter', bold: true, size: 20 })] })],
            width: { size: 55, type: WidthType.PERCENTAGE },
            shading: HEADER_SHADING,
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: 'Value', bold: true, size: 20 })] })],
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: HEADER_SHADING,
          }),
        ],
      }),
      ...steps.map(({ label, value }, i) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: String(i + 1), alignment: AlignmentType.CENTER })] }),
            new TableCell({ children: [new Paragraph({ text: label })] }),
            new TableCell({ children: [new Paragraph({ text: value })] }),
          ],
        }),
      ),
    ],
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  });
}

function subHeading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({ text, spacing: { after: 150 } });
}

// ─── Export types ────────────────────────────────────────────────────────────

export type ConcReportData = {
  costs: ConcAllCosts;
  steps: ConcSteps;
  irSteps: IrSteps;
  restoreSteps: RestoreSteps;
  ebiSteps: EbiSteps;
  cclSteps: CclSteps;
  regSteps: RegSteps;
  reputationSteps: ReputationSteps;
  govSteps: GovSteps;
  notificationSteps: NotificationSteps;
  fineSteps: FineSteps;
};

export type BreachLikelihoodData = {
  band: BreachLikelihoodBand;
  ale: AleBand | null;
  riskLevel: string;
  factors: FactorContribution[];
};

// ─── DOCX export ────────────────────────────────────────────────────────────

export async function exportConcReportDocx(
  conc: ConcReportData,
  breach: BreachLikelihoodData | null,
  orgName?: string,
): Promise<void> {
  const children: DocChild[] = [];

  // ── Title block ───────────────────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Cost of Non-Compliance (CoNC)', bold: true, size: 36 })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Downtime Cost Calculator Report', size: 28, color: '666666' })],
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

  // ── Executive Summary ─────────────────────────────────────────────────────
  const concTotal: CostBand = {
    mid: conc.costs.downtime.mid + conc.costs.ir.mid + conc.costs.restore.mid +
         conc.costs.ebi.mid + conc.costs.ccl.mid + conc.costs.reg.mid +
         conc.costs.reputation.mid + conc.costs.governance.mid + conc.costs.notification.mid,
    low: conc.costs.downtime.low + conc.costs.ir.low + conc.costs.restore.low +
         conc.costs.ebi.low + conc.costs.ccl.low + conc.costs.reg.low +
         conc.costs.reputation.low + conc.costs.governance.low + conc.costs.notification.low,
    high: conc.costs.downtime.high + conc.costs.ir.high + conc.costs.restore.high +
          conc.costs.ebi.high + conc.costs.ccl.high + conc.costs.reg.high +
          conc.costs.reputation.high + conc.costs.governance.high + conc.costs.notification.high,
  };

  children.push(sectionHeading('Executive Summary'));
  children.push(bodyText(
    `This report estimates the financial impact of a significant cyber incident for ${orgName ?? 'the organisation'}. ` +
    `The total estimated Cost of Non-Compliance ranges from ${fmt(concTotal.low)} to ${fmt(concTotal.high)}, ` +
    `with a mid-point estimate of ${fmt(concTotal.mid)}. ` +
    `The administrative fine ceiling (excluded from the total) is ${fmt(conc.costs.adminFineCeiling)}.`,
  ));

  if (breach) {
    children.push(bodyText(
      `The estimated annual breach probability is ${pctProb(breach.band.mid)} (risk level: ${breach.riskLevel.replace('_', ' ')}). ` +
      (breach.ale
        ? `This produces an Annual Loss Expectancy (ALE) of ${fmt(breach.ale.mid)} (range: ${fmt(breach.ale.low)} \u2013 ${fmt(breach.ale.high)}).`
        : ''),
    ));
  }

  // ── Summary table ─────────────────────────────────────────────────────────
  children.push(subHeading('Cost Summary'));

  const summaryRows: { category: string; band: CostBand }[] = [
    { category: 'Operational Downtime', band: conc.costs.downtime },
    { category: 'Incident Response & Forensics', band: conc.costs.ir },
    { category: 'System Restoration & Rebuild', band: conc.costs.restore },
    { category: 'Extended Business Interruption', band: conc.costs.ebi },
    { category: 'Customer & Contract Loss', band: conc.costs.ccl },
    { category: 'Regulatory & Supervisory', band: conc.costs.reg },
    { category: 'Reputational Impact', band: conc.costs.reputation },
    { category: 'Management & Governance', band: conc.costs.governance },
    { category: 'Notification Costs', band: conc.costs.notification },
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cost Category', bold: true, size: 20 })] })], width: { size: 40, type: WidthType.PERCENTAGE }, shading: HEADER_SHADING }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Low (-30%)', bold: true, size: 20 })] })], width: { size: 20, type: WidthType.PERCENTAGE }, shading: HEADER_SHADING }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Mid (expected)', bold: true, size: 20 })] })], width: { size: 20, type: WidthType.PERCENTAGE }, shading: HEADER_SHADING }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'High (+30%)', bold: true, size: 20 })] })], width: { size: 20, type: WidthType.PERCENTAGE }, shading: HEADER_SHADING }),
          ],
        }),
        ...summaryRows.map(({ category, band }) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: category })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(band.low) })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(band.mid), bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ text: fmt(band.high) })] }),
            ],
          }),
        ),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Total CoNC', bold: true })] })], shading: { fill: 'F3F4F6' } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(concTotal.low), bold: true })] })], shading: { fill: 'F3F4F6' } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(concTotal.mid), bold: true })] })], shading: { fill: 'F3F4F6' } }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(concTotal.high), bold: true })] })], shading: { fill: 'F3F4F6' } }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Administrative Fine Ceiling', italics: true, color: '888888' })] })] }),
            new TableCell({ children: [new Paragraph({})] }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(conc.costs.adminFineCeiling), italics: true, color: '888888' })] })] }),
            new TableCell({ children: [new Paragraph({})] }),
          ],
        }),
      ],
    }),
  );

  // ── Breach Likelihood ─────────────────────────────────────────────────────
  if (breach) {
    children.push(sectionHeading('Annual Breach Likelihood'));
    children.push(bodyText(
      `The annual probability of a material breach is estimated using a logistic base-rate model calibrated from Cyentia IRIS, Verizon DBIR, IBM/Ponemon, and Hiscox reports. The model combines a size-calibrated base rate with 14 risk-modifying factors in log-odds space.`,
    ));

    children.push(subHeading('Probability Estimate'));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Low (-30%)', bold: true, size: 20 })] })], shading: HEADER_SHADING }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Mid (expected)', bold: true, size: 20 })] })], shading: HEADER_SHADING }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'High (+30%)', bold: true, size: 20 })] })], shading: HEADER_SHADING }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Risk Level', bold: true, size: 20 })] })], shading: HEADER_SHADING }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: pctProb(breach.band.low) })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: pctProb(breach.band.mid), bold: true })] })] }),
              new TableCell({ children: [new Paragraph({ text: pctProb(breach.band.high) })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: breach.riskLevel.replace('_', ' '), bold: true })] })] }),
            ],
          }),
        ],
      }),
    );

    if (breach.ale) {
      children.push(subHeading('Annual Loss Expectancy (ALE)'));
      children.push(bodyText('ALE = P(breach) \u00d7 CoNC Total. This is the core FAIR output for annual risk quantification.'));
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Low', bold: true, size: 20 })] })], shading: HEADER_SHADING }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Mid (expected)', bold: true, size: 20 })] })], shading: HEADER_SHADING }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'High', bold: true, size: 20 })] })], shading: HEADER_SHADING }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: fmt(breach.ale.low) })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(breach.ale.mid), bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ text: fmt(breach.ale.high) })] }),
              ],
            }),
          ],
        }),
      );
    }

    children.push(subHeading('Factor Contributions'));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '#', bold: true, size: 20 })] })], width: { size: 5, type: WidthType.PERCENTAGE }, shading: HEADER_SHADING }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Factor', bold: true, size: 20 })] })], width: { size: 55, type: WidthType.PERCENTAGE }, shading: HEADER_SHADING }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Direction', bold: true, size: 20 })] })], width: { size: 20, type: WidthType.PERCENTAGE }, shading: HEADER_SHADING }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Beta (\u03b2)', bold: true, size: 20 })] })], width: { size: 20, type: WidthType.PERCENTAGE }, shading: HEADER_SHADING }),
            ],
          }),
          ...breach.factors.map((f, i) =>
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: String(i + 1), alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: FACTOR_LABELS[f.name] ?? f.name })] }),
                new TableCell({ children: [new Paragraph({ text: f.direction === 'increases' ? '\u2191 Increases' : f.direction === 'decreases' ? '\u2193 Decreases' : '\u2014 Neutral' })] }),
                new TableCell({ children: [new Paragraph({ text: `${f.beta >= 0 ? '+' : ''}${f.beta.toFixed(3)}` })] }),
              ],
            }),
          ),
        ],
      }),
    );
  }

  // ── 1. Operational Downtime ───────────────────────────────────────────────
  children.push(sectionHeading('1. Operational Downtime'));
  children.push(bodyText('Cost of lost revenue during system outage. Driven by daily revenue, IT dependency, sector risk, and security maturity (via downtime days).'));
  children.push(costBandTable(conc.costs.downtime));
  children.push(subHeading('Calculation Steps'));
  children.push(stepsTable([
    { label: 'IBM Industry Classification', value: conc.steps.ibmIndustry },
    { label: 'Sector Factor', value: conc.steps.sectorFactor.toFixed(4) },
    { label: 'Daily Revenue', value: fmt(conc.steps.dailyRevenue) },
    { label: 'IT Dependency Level (0\u20136)', value: String(conc.steps.itDependencyLevel) },
    { label: 'IT Factor', value: `${(conc.steps.itFactor * 100).toFixed(0)}%` },
    { label: 'Organisation Size', value: `${conc.steps.orgSize} (\u00d7${conc.steps.orgSizeMult.toFixed(2)})` },
    { label: 'Adjusted Daily Loss', value: fmt(conc.steps.adjustedDailyLoss) },
    { label: 'CMMI Scores (8 safeguards)', value: `[${conc.steps.cmmiScores.join(', ')}] = ${conc.steps.cmmiSum}` },
    { label: 'Downtime GAP Score', value: `${conc.steps.gapScore.toFixed(1)} / 100` },
    { label: 'Downtime Days', value: `${conc.steps.downtimeDays.toFixed(2)} days` },
  ]));

  // ── 2. Incident Response ──────────────────────────────────────────────────
  children.push(sectionHeading('2. Incident Response & Forensics'));
  children.push(bodyText('Cost of forensic investigation, response coordination, and legal review. Base cost is revenue-anchored and adjusted by IR maturity and IT dependency.'));
  children.push(costBandTable(conc.costs.ir));
  children.push(subHeading('Calculation Steps'));
  children.push(stepsTable([
    { label: 'IR Base (revenue benchmark)', value: fmt(conc.irSteps.irBase) },
    { label: 'IR Score (avg CMMI: 17.2, 17.1, 17.5, 8.11)', value: conc.irSteps.irScore.toFixed(2) },
    { label: 'IR Maturity Multiplier', value: `\u00d7${conc.irSteps.irMaturityMult.toFixed(4)}` },
    { label: 'IR Dependency Multiplier', value: `\u00d7${conc.irSteps.irDepMult.toFixed(2)}` },
  ]));

  // ── 3. System Restoration ─────────────────────────────────────────────────
  children.push(sectionHeading('3. System Restoration & Rebuild'));
  children.push(bodyText('Cost to restore systems, rebuild infrastructure, and recover data. Strongly influenced by backup maturity and infrastructure type.'));
  children.push(costBandTable(conc.costs.restore));
  children.push(subHeading('Calculation Steps'));
  children.push(stepsTable([
    { label: 'Restore Base (revenue benchmark)', value: fmt(conc.restoreSteps.restoreBase) },
    { label: 'Restore Score (avg CMMI: 11.2, 11.4, 11.5)', value: conc.restoreSteps.restoreScore.toFixed(2) },
    { label: 'Restore Maturity Multiplier', value: `\u00d7${conc.restoreSteps.restoreMaturityMult.toFixed(4)}` },
    { label: 'Restore Dependency Multiplier', value: `\u00d7${conc.restoreSteps.restoreDepMult.toFixed(2)}` },
    { label: 'Infrastructure Type Multiplier', value: `\u00d7${conc.restoreSteps.infraMult.toFixed(2)}` },
  ]));

  // ── 4. Extended Business Interruption ─────────────────────────────────────
  children.push(sectionHeading('4. Extended Business Interruption'));
  children.push(bodyText('Post-recovery productivity loss including backlog clearing, workarounds, and retraining. Uses a quadratic friction model where longer outages produce disproportionately higher recovery costs.'));
  children.push(costBandTable(conc.costs.ebi));
  children.push(subHeading('Calculation Steps'));
  children.push(stepsTable([
    { label: 'Daily Revenue', value: fmt(conc.steps.dailyRevenue) },
    { label: 'Downtime Days', value: `${conc.steps.downtimeDays.toFixed(2)} days` },
    { label: 'Recovery Friction (0.15 \u00d7 d\u00b2)', value: `${conc.ebiSteps.ebiRecoveryFriction.toFixed(2)} days` },
    { label: 'EBI Sector Adjustment', value: `\u00d7${conc.ebiSteps.ebiSectorAdj.toFixed(4)}` },
    { label: 'EBI Dependency Multiplier', value: `\u00d7${conc.ebiSteps.ebiDepMult.toFixed(2)}` },
    { label: 'EBI Restore Adjustment', value: `\u00d7${conc.ebiSteps.ebiRestoreAdj.toFixed(4)}` },
  ]));

  // ── 5. Customer & Contract Loss ───────────────────────────────────────────
  children.push(sectionHeading('5. Customer & Contract Loss'));
  children.push(bodyText('Lost customer relationships, contract penalties, and churn. Driven by business orientation (B2B/B2C), revenue concentration, and incident severity.'));
  children.push(costBandTable(conc.costs.ccl));
  children.push(subHeading('Calculation Steps'));
  children.push(stepsTable([
    { label: 'Customer Model', value: conc.cclSteps.customerModel },
    { label: 'Revenue Concentration', value: conc.cclSteps.revenueConcentration },
    { label: 'Base % of Annual Revenue', value: pct(conc.cclSteps.basePct) },
    { label: 'CCL Sector Adjustment', value: `\u00d7${conc.cclSteps.cclSectorAdj.toFixed(4)}` },
    { label: 'CCL Severity Adjustment', value: `\u00d7${conc.cclSteps.cclSeverityAdj.toFixed(4)}` },
    { label: 'CCL IR Adjustment', value: `\u00d7${conc.cclSteps.cclIrAdj.toFixed(4)}` },
  ]));

  // ── 6. Regulatory & Supervisory ───────────────────────────────────────────
  children.push(sectionHeading('6. Regulatory & Supervisory'));
  children.push(bodyText('Notification to authorities, compliance remediation, audits, and fines. Affected by number of regulatory frameworks, geographic scope, and breach history.'));
  children.push(costBandTable(conc.costs.reg));
  children.push(subHeading('Calculation Steps'));
  children.push(stepsTable([
    { label: 'Regulatory Base (revenue benchmark)', value: fmt(conc.regSteps.regBase) },
    { label: 'Sector Adjustment', value: `\u00d7${conc.regSteps.regSectorAdj.toFixed(4)}` },
    { label: 'Severity Adjustment', value: `\u00d7${conc.regSteps.regSeverityAdj.toFixed(4)}` },
    { label: 'IR Adjustment', value: `\u00d7${conc.regSteps.regIrAdj.toFixed(4)}` },
    { label: 'Framework Multiplier', value: `${conc.regSteps.regFrameworkCount} framework${conc.regSteps.regFrameworkCount !== 1 ? 's' : ''} (\u00d7${conc.regSteps.regFrameworkMult.toFixed(2)})` },
    { label: 'Geographic Scope Multiplier', value: `\u00d7${conc.regSteps.regGeoMult.toFixed(2)}` },
    { label: 'Previous Breach Multiplier', value: `\u00d7${conc.regSteps.regPrevBreachMult.toFixed(2)}` },
  ]));

  // ── 7. Reputational Impact ────────────────────────────────────────────────
  children.push(sectionHeading('7. Reputational Impact'));
  children.push(bodyText('Loss of brand value, media coverage, and customer trust erosion. B2C organisations face significantly higher reputational exposure. Data sensitivity drives the scale of public outrage.'));
  children.push(costBandTable(conc.costs.reputation));
  children.push(subHeading('Calculation Steps'));
  children.push(stepsTable([
    { label: 'Customer Model', value: conc.reputationSteps.customerModel },
    { label: 'Base % of Revenue', value: pct(conc.reputationSteps.basePct) },
    { label: 'Severity Adjustment', value: `\u00d7${conc.reputationSteps.severityAdj.toFixed(4)}` },
    { label: 'Sector Adjustment', value: `\u00d7${conc.reputationSteps.sectorAdj.toFixed(4)}` },
    { label: 'IR Adjustment', value: `\u00d7${conc.reputationSteps.irAdj.toFixed(4)}` },
    { label: 'Visibility Multiplier (B2C)', value: `\u00d7${conc.reputationSteps.visibilityMult.toFixed(2)}` },
    { label: 'Data Sensitivity Multiplier', value: `\u00d7${conc.reputationSteps.dataSensitivityMult.toFixed(2)}` },
    { label: 'Previous Breach Multiplier', value: `\u00d7${conc.reputationSteps.prevBreachMult.toFixed(2)}` },
  ]));

  // ── 8. Management & Governance ────────────────────────────────────────────
  children.push(sectionHeading('8. Management & Governance'));
  children.push(bodyText('Internal investigation, board reporting, and remediation planning costs.'));
  children.push(costBandTable(conc.costs.governance));
  children.push(subHeading('Calculation Steps'));
  children.push(stepsTable([
    { label: 'Governance Base (revenue benchmark)', value: fmt(conc.govSteps.govBase) },
    { label: 'Severity Adjustment', value: `\u00d7${conc.govSteps.severityAdj.toFixed(4)}` },
    { label: 'Sector Adjustment', value: `\u00d7${conc.govSteps.sectorAdj.toFixed(4)}` },
  ]));

  // ── 9. Notification Costs ─────────────────────────────────────────────────
  children.push(sectionHeading('9. Notification Costs'));
  children.push(bodyText('GDPR Art 33/34 and NIS2 Art 23 notification obligations including contact management, communications, credit monitoring, and legal review.'));
  children.push(costBandTable(conc.costs.notification));
  children.push(subHeading('Calculation Steps'));
  children.push(stepsTable([
    { label: 'Notification Base (revenue benchmark)', value: fmt(conc.notificationSteps.notifyBase) },
    { label: 'Data Sensitivity Multiplier', value: `\u00d7${conc.notificationSteps.dataSensitivityMult.toFixed(2)}` },
    { label: 'Organisation Size Multiplier', value: `\u00d7${conc.notificationSteps.orgSizeMult.toFixed(2)}` },
    { label: 'Geographic Scope Multiplier', value: `\u00d7${conc.notificationSteps.geoMult.toFixed(2)}` },
    { label: 'Framework Multiplier', value: `\u00d7${conc.notificationSteps.frameworkMult.toFixed(2)}` },
  ]));

  // ── 10. Administrative Fine Ceiling ───────────────────────────────────────
  children.push(sectionHeading('10. Administrative Fine Ceiling'));
  children.push(bodyText('Statutory maximum fine exposure under NIS2 Article 34. This is a legal ceiling, not an expected cost, and is excluded from the CoNC total.'));
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Fine Ceiling', bold: true, size: 20 })] })], shading: HEADER_SHADING }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(conc.costs.adminFineCeiling), bold: true })] })] }),
          ],
        }),
      ],
    }),
  );
  children.push(subHeading('Calculation Steps'));
  children.push(stepsTable([
    { label: 'Entity Type (NIS2)', value: conc.fineSteps.entityType },
    { label: 'Percent Cap', value: pct(conc.fineSteps.pctCap) },
    { label: 'Fixed Cap', value: fmt(conc.fineSteps.fixedCap) },
    { label: 'Percent-based Amount', value: fmt(conc.fineSteps.pctAmount) },
    { label: 'Fine Ceiling (MAX of above)', value: fmt(conc.costs.adminFineCeiling) },
  ]));

  // ── Confidentiality footer ────────────────────────────────────────────────
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
    ? `${orgName.replace(/\s+/g, '_')}_CoNC_Report.docx`
    : 'CoNC_Report.docx';
  saveAs(blob, filename);
}

// ─── Factor label map (i18n keys → readable English for export) ─────────────

const FACTOR_LABELS: Record<string, string> = {
  blFactorBase:            'Base Rate (organisation size)',
  blFactorIndustry:        'Industry Sector',
  blFactorCisPreventive:   'CIS Preventive Controls (45%)',
  blFactorCisDetective:    'CIS Detective Controls (35%)',
  blFactorCisDataProt:     'CIS Data Protection Controls (20%)',
  blFactorDataAttract:     'Data Attractiveness',
  blFactorInfra:           'Infrastructure Exposure',
  blFactorGeo:             'Geographic Scope',
  blFactorSecStaff:        'Security Staffing',
  blFactorSecMaturity:     'Security Program Maturity',
  blFactorPublicServices:  'Public-Facing Services',
  blFactorTargetedAttack:  'Targeted Attack Likelihood',
  blFactorSupplyChain:     'Supply Chain Position',
  blFactorRemoteWorkforce: 'Remote Workforce',
  blFactorPreviousBreach:  'Previous Breach History',
};
