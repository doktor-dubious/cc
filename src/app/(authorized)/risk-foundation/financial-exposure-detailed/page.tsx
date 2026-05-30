'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, LogOut, Loader2, Download, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useOrganization } from '@/context/OrganizationContext';
import {
  calculateConcDowntimeCosts,
  type ConcResult,
  type CostBand,
  type ConcInputs,
} from '@/lib/conc/conc-calculator';
import {
  METHODOLOGY_SECTIONS,
  FAIR_MAPPING,
  REFERENCES,
  exportMethodologyDocx,
} from '@/lib/conc/conc-methodology-doc';

type OkResult = Extract<ConcResult, { ok: true }>;

// Bottom-border underline tab style (matches gorm.ai's configuration page).
// Inactive tabs show a subtle border so each row reads as a tab-strip; the
// active tab swaps to a stronger foreground border.
const TAB_CLASS =
  "bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-border " +
  "data-[state=active]:bg-transparent data-[state=active]:border-foreground " +
  "data-[state=active]:shadow-none px-4 py-2.5 text-center justify-center relative z-10 cursor-pointer";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

// ── Range cost block — shows scenario 1 → scenario 2 range ─────────────────

function RangeCostBlock({
  title,
  subtitle,
  band1,
  band2,
  labelLow,
  labelMid,
  labelHigh,
  steps1,
  steps2,
  scenario1Label,
  scenario2Label,
  note,
}: {
  title: string;
  subtitle: string;
  band1: CostBand;
  band2: CostBand;
  labelLow: string;
  labelMid: string;
  labelHigh: string;
  steps1: { label: string; value: string }[];
  steps2: { label: string; value: string }[];
  scenario1Label: string;
  scenario2Label: string;
  note?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card p-5">
        <p className="font-semibold text-sm mb-1">{title}</p>
        <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>
        <div className="grid grid-cols-3 divide-x divide-border">
          <div className="pr-4">
            <p className="text-xs text-muted-foreground mb-1">{labelLow}</p>
            <p className="font-mono tabular-nums font-medium text-sm">
              {formatCurrency(Math.min(band1.low, band2.low))}
            </p>
            <p className="font-mono tabular-nums font-medium text-sm text-muted-foreground">
              {formatCurrency(Math.max(band1.low, band2.low))}
            </p>
          </div>
          <div className="px-4">
            <p className="text-xs text-muted-foreground mb-1">{labelMid}</p>
            <p className="font-mono tabular-nums font-semibold text-sm">
              {formatCurrency(Math.min(band1.mid, band2.mid))}
            </p>
            <p className="font-mono tabular-nums font-semibold text-sm text-muted-foreground">
              {formatCurrency(Math.max(band1.mid, band2.mid))}
            </p>
          </div>
          <div className="pl-4">
            <p className="text-xs text-muted-foreground mb-1">{labelHigh}</p>
            <p className="font-mono tabular-nums font-medium text-sm">
              {formatCurrency(Math.min(band1.high, band2.high))}
            </p>
            <p className="font-mono tabular-nums font-medium text-sm text-muted-foreground">
              {formatCurrency(Math.max(band1.high, band2.high))}
            </p>
          </div>
        </div>
      </div>

      {/* Intermediate steps for both scenarios */}
      <div className="rounded-lg border bg-card">
        <div className="px-5 py-3 border-b">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {scenario1Label}
          </p>
        </div>
        <div className="divide-y">
          {steps1.map(({ label, value }, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-2.5">
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
              <span className="font-mono text-sm tabular-nums">{value}</span>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-b border-t">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {scenario2Label}
          </p>
        </div>
        <div className="divide-y">
          {steps2.map(({ label, value }, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-2.5">
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
              <span className="font-mono text-sm tabular-nums">{value}</span>
            </div>
          ))}
        </div>
        {note && (
          <div className="px-5 py-3 border-t">
            <p className="text-xs text-muted-foreground italic">{note}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function StructuralFinancialExposurePage() {
  const t = useTranslations('Workflow.sfe');
  const tw = useTranslations('Workflow.customerOnboarding');
  const tc = useTranslations('Common');
  const router = useRouter();
  const { activeOrganization } = useOrganization();

  const [isExporting, setIsExporting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [result1, setResult1] = useState<OkResult | null>(null);
  const [result2, setResult2] = useState<OkResult | null>(null);

  useEffect(() => {
    if (!activeOrganization?.id) return;

    // Build base inputs from organization profile (no GAP report needed)
    const baseInputs: Omit<ConcInputs, 'cmmiValues' | 'overrideDowntimeDays'> = {
      naceSection: activeOrganization.naceSection,
      revenueRange: activeOrganization.revenueRange,
      businessDaysPerYear: activeOrganization.businessDaysPerYear,
      manualOperation: activeOrganization.manualOperation,
      productionDependency: activeOrganization.productionDependency,
      customerAccess: activeOrganization.customerAccess,
      orgSize: activeOrganization.size,
      infrastructureTypes: activeOrganization.infrastructureTypes ?? [],
      dataSensitivity: activeOrganization.dataSensitivity ?? [],
      regulatoryObligations: activeOrganization.regulatoryObligations ?? [],
      geographicScope: activeOrganization.geographicScope,
      businessOrientation: activeOrganization.businessOrientation,
      revenueConcentration: activeOrganization.revenueConcentration,
      entityType: activeOrganization.entityType,
      previousBreachHistory: activeOrganization.previousBreachHistory,
    };

    // Build CMMI maps: all safeguards set to 1 or 5
    const allSafeguardIds = ['11.1', '11.2', '11.4', '11.5', '17.1', '17.2', '17.5', '8.11'];
    const cmmiAll1: Record<string, number> = {};
    const cmmiAll5: Record<string, number> = {};
    for (const id of allSafeguardIds) {
      cmmiAll1[id] = 1;
      cmmiAll5[id] = 5;
    }

    // Scenario 1: Downtime = 1 day, all CMMI = 1 (minimum maturity)
    const calc1 = calculateConcDowntimeCosts({
      ...baseInputs,
      cmmiValues: cmmiAll1,
      overrideDowntimeDays: 1,
    });

    // Scenario 2: Downtime = 5 days, all CMMI = 5 (maximum maturity)
    const calc2 = calculateConcDowntimeCosts({
      ...baseInputs,
      cmmiValues: cmmiAll5,
      overrideDowntimeDays: 5,
    });

    if (calc1.ok && calc2.ok) {
      setResult1(calc1);
      setResult2(calc2);
      setMissingFields([]);
    } else {
      setResult1(null);
      setResult2(null);
      const missing = !calc1.ok ? calc1.missing : !calc2.ok ? calc2.missing : [];
      setMissingFields(missing);
    }
  }, [activeOrganization]);

  const s1Label = t('scenario1Label');
  const s2Label = t('scenario2Label');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-4xl">
          {/* Intro */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-sm text-muted-foreground mt-2">{t('description')}</p>
          </div>

          <Separator className="mb-6" />

          {missingFields.length > 0 ? (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-6">
              <p className="font-semibold text-yellow-700 dark:text-yellow-400 mb-3">
                Cannot calculate structural exposure — missing data:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-600 dark:text-yellow-300">
                {missingFields.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ) : result1 && result2 ? (
            <Tabs defaultValue="downtime" className="flex-1 flex flex-col gap-0">
              <TabsList className="w-full bg-transparent rounded-none p-0 h-auto grid grid-cols-3 gap-x-1">
                <TabsTrigger value="downtime"          className={TAB_CLASS}>Estimated Downtime Costs</TabsTrigger>
                <TabsTrigger value="ir"                className={TAB_CLASS}>Incident Response &amp; Forensics (IR)</TabsTrigger>
                <TabsTrigger value="restore"           className={TAB_CLASS}>System Restoration &amp; Rebuild</TabsTrigger>
                <TabsTrigger value="ebi"               className={TAB_CLASS}>Extended Business Interruption (EBI)</TabsTrigger>
                <TabsTrigger value="ccl"               className={TAB_CLASS}>Customer &amp; Contract Loss (CCL)</TabsTrigger>
                <TabsTrigger value="reg"               className={TAB_CLASS}>Regulatory &amp; Supervisory Cost</TabsTrigger>
                <TabsTrigger value="reputation"        className={TAB_CLASS}>Reputational Impact</TabsTrigger>
                <TabsTrigger value="governance"        className={TAB_CLASS}>Management &amp; Governance Cost</TabsTrigger>
                <TabsTrigger value="notification"      className={TAB_CLASS}>Notification Costs</TabsTrigger>
                <TabsTrigger value="adminFineCeiling"  className={TAB_CLASS}>Legal Exposure – Administrative Fine Ceiling</TabsTrigger>
                <TabsTrigger value="methodology"       className={TAB_CLASS}>Methodology Overview</TabsTrigger>
              </TabsList>

              {/* 1 – Downtime Costs */}
              <TabsContent value="downtime" className="mt-6">
              <RangeCostBlock
                title={t('downtimeCostsTitle')}
                subtitle={t('downtimeCostsSubtitle')}
                band1={result1.costs.downtime}
                band2={result2.costs.downtime}
                labelLow={t('bandLow')}
                labelMid={t('bandMid')}
                labelHigh={t('bandHigh')}
                scenario1Label={s1Label}
                scenario2Label={s2Label}
                steps1={[
                  { label: 'IBM Industry',        value: result1.steps.ibmIndustry },
                  { label: 'Daily Revenue',        value: formatCurrency(result1.steps.dailyRevenue) },
                  { label: 'IT Dependency Level',  value: String(result1.steps.itDependencyLevel) },
                  { label: 'IT Factor',            value: `${(result1.steps.itFactor * 100).toFixed(0)}%` },
                  { label: 'Sector Factor',        value: result1.steps.sectorFactor.toFixed(4) },
                  { label: 'Org Size Factor',      value: `${result1.steps.orgSize} (${result1.steps.orgSizeMult.toFixed(2)}\u00d7)` },
                  { label: 'Adjusted Daily Loss',  value: formatCurrency(result1.steps.adjustedDailyLoss) },
                  { label: 'Downtime Days',        value: `${result1.steps.downtimeDays.toFixed(2)} days` },
                ]}
                steps2={[
                  { label: 'Adjusted Daily Loss',  value: formatCurrency(result2.steps.adjustedDailyLoss) },
                  { label: 'Downtime Days',        value: `${result2.steps.downtimeDays.toFixed(2)} days` },
                ]}
              />

              </TabsContent>

              {/* 2 – IR */}
              <TabsContent value="ir" className="mt-6">
              <RangeCostBlock
                title={t('irTitle')}
                subtitle={t('irSubtitle')}
                band1={result1.costs.ir}
                band2={result2.costs.ir}
                labelLow={t('bandLow')}
                labelMid={t('bandMid')}
                labelHigh={t('bandHigh')}
                scenario1Label={s1Label}
                scenario2Label={s2Label}
                steps1={[
                  { label: 'IR Base (revenue benchmark)',  value: formatCurrency(result1.irSteps.irBase) },
                  { label: 'IR Score (avg safeguards)',     value: result1.irSteps.irScore.toFixed(2) },
                  { label: 'IR Maturity Multiplier',       value: result1.irSteps.irMaturityMult.toFixed(4) },
                  { label: 'IR Dependency Multiplier',     value: result1.irSteps.irDepMult.toFixed(2) },
                ]}
                steps2={[
                  { label: 'IR Base (revenue benchmark)',  value: formatCurrency(result2.irSteps.irBase) },
                  { label: 'IR Score (avg safeguards)',     value: result2.irSteps.irScore.toFixed(2) },
                  { label: 'IR Maturity Multiplier',       value: result2.irSteps.irMaturityMult.toFixed(4) },
                  { label: 'IR Dependency Multiplier',     value: result2.irSteps.irDepMult.toFixed(2) },
                ]}
              />

              </TabsContent>

              {/* 3 – Restore */}
              <TabsContent value="restore" className="mt-6">
              <RangeCostBlock
                title={t('restoreTitle')}
                subtitle={t('restoreSubtitle')}
                band1={result1.costs.restore}
                band2={result2.costs.restore}
                labelLow={t('bandLow')}
                labelMid={t('bandMid')}
                labelHigh={t('bandHigh')}
                scenario1Label={s1Label}
                scenario2Label={s2Label}
                steps1={[
                  { label: 'Restore Base (revenue benchmark)',    value: formatCurrency(result1.restoreSteps.restoreBase) },
                  { label: 'Restore Score (avg safeguards)',       value: result1.restoreSteps.restoreScore.toFixed(2) },
                  { label: 'Restore Maturity Multiplier',         value: result1.restoreSteps.restoreMaturityMult.toFixed(4) },
                  { label: 'Restore Dependency Multiplier',       value: result1.restoreSteps.restoreDepMult.toFixed(2) },
                  { label: 'Infrastructure Type Multiplier',       value: `${result1.restoreSteps.infraMult.toFixed(2)}\u00d7` },
                ]}
                steps2={[
                  { label: 'Restore Score (avg safeguards)',       value: result2.restoreSteps.restoreScore.toFixed(2) },
                  { label: 'Restore Maturity Multiplier',         value: result2.restoreSteps.restoreMaturityMult.toFixed(4) },
                ]}
              />

              </TabsContent>

              {/* 4 – EBI */}
              <TabsContent value="ebi" className="mt-6">
              <RangeCostBlock
                title={t('ebiTitle')}
                subtitle={t('ebiSubtitle')}
                band1={result1.costs.ebi}
                band2={result2.costs.ebi}
                labelLow={t('bandLow')}
                labelMid={t('bandMid')}
                labelHigh={t('bandHigh')}
                scenario1Label={s1Label}
                scenario2Label={s2Label}
                steps1={[
                  { label: 'Daily Revenue',             value: formatCurrency(result1.steps.dailyRevenue) },
                  { label: 'Downtime Days',             value: `${result1.steps.downtimeDays.toFixed(2)} days` },
                  { label: 'Recovery Friction (0.15 \u00d7 d\u00b2)', value: `${result1.ebiSteps.ebiRecoveryFriction.toFixed(2)} days` },
                  { label: 'EBI Sector Adjustment',     value: result1.ebiSteps.ebiSectorAdj.toFixed(4) },
                  { label: 'EBI Dependency Multiplier', value: result1.ebiSteps.ebiDepMult.toFixed(2) },
                  { label: 'EBI Restore Adjustment',    value: result1.ebiSteps.ebiRestoreAdj.toFixed(4) },
                ]}
                steps2={[
                  { label: 'Downtime Days',             value: `${result2.steps.downtimeDays.toFixed(2)} days` },
                  { label: 'Recovery Friction (0.15 \u00d7 d\u00b2)', value: `${result2.ebiSteps.ebiRecoveryFriction.toFixed(2)} days` },
                  { label: 'EBI Restore Adjustment',    value: result2.ebiSteps.ebiRestoreAdj.toFixed(4) },
                ]}
              />

              </TabsContent>

              {/* 5 – CCL */}
              <TabsContent value="ccl" className="mt-6">
              <RangeCostBlock
                title={t('cclTitle')}
                subtitle={t('cclSubtitle')}
                band1={result1.costs.ccl}
                band2={result2.costs.ccl}
                labelLow={t('bandLow')}
                labelMid={t('bandMid')}
                labelHigh={t('bandHigh')}
                scenario1Label={s1Label}
                scenario2Label={s2Label}
                steps1={[
                  { label: 'Customer Model',           value: result1.cclSteps.customerModel },
                  { label: 'Revenue Concentration',    value: result1.cclSteps.revenueConcentration },
                  { label: 'Base % of Annual Revenue', value: formatPct(result1.cclSteps.basePct) },
                  { label: 'CCL Sector Adjustment',    value: result1.cclSteps.cclSectorAdj.toFixed(4) },
                  { label: 'CCL Severity Adjustment',  value: result1.cclSteps.cclSeverityAdj.toFixed(4) },
                  { label: 'CCL IR Adjustment',        value: result1.cclSteps.cclIrAdj.toFixed(4) },
                ]}
                steps2={[
                  { label: 'CCL Severity Adjustment',  value: result2.cclSteps.cclSeverityAdj.toFixed(4) },
                  { label: 'CCL IR Adjustment',        value: result2.cclSteps.cclIrAdj.toFixed(4) },
                ]}
              />

              </TabsContent>

              {/* 6 – Regulatory */}
              <TabsContent value="reg" className="mt-6">
              <RangeCostBlock
                title={t('regTitle')}
                subtitle={t('regSubtitle')}
                band1={result1.costs.reg}
                band2={result2.costs.reg}
                labelLow={t('bandLow')}
                labelMid={t('bandMid')}
                labelHigh={t('bandHigh')}
                scenario1Label={s1Label}
                scenario2Label={s2Label}
                steps1={[
                  { label: 'Reg Base (revenue benchmark)', value: formatCurrency(result1.regSteps.regBase) },
                  { label: 'Reg Sector Adjustment',        value: result1.regSteps.regSectorAdj.toFixed(4) },
                  { label: 'Reg Severity Adjustment',      value: result1.regSteps.regSeverityAdj.toFixed(4) },
                  { label: 'Reg IR Adjustment',            value: result1.regSteps.regIrAdj.toFixed(4) },
                  { label: 'Framework Multiplier',         value: `${result1.regSteps.regFrameworkCount} framework${result1.regSteps.regFrameworkCount !== 1 ? 's' : ''} (${result1.regSteps.regFrameworkMult.toFixed(2)}\u00d7)` },
                  { label: 'Geographic Scope Multiplier',  value: `${result1.regSteps.regGeoMult.toFixed(2)}\u00d7` },
                ]}
                steps2={[
                  { label: 'Reg Severity Adjustment',      value: result2.regSteps.regSeverityAdj.toFixed(4) },
                  { label: 'Reg IR Adjustment',            value: result2.regSteps.regIrAdj.toFixed(4) },
                ]}
              />

              </TabsContent>

              {/* 7 – Reputational */}
              <TabsContent value="reputation" className="mt-6">
              <RangeCostBlock
                title={t('repTitle')}
                subtitle={t('repSubtitle')}
                band1={result1.costs.reputation}
                band2={result2.costs.reputation}
                labelLow={t('bandLow')}
                labelMid={t('bandMid')}
                labelHigh={t('bandHigh')}
                scenario1Label={s1Label}
                scenario2Label={s2Label}
                steps1={[
                  { label: 'Customer Model',       value: result1.reputationSteps.customerModel },
                  { label: 'Base % of Revenue',    value: formatPct(result1.reputationSteps.basePct) },
                  { label: 'Severity Adjustment',  value: result1.reputationSteps.severityAdj.toFixed(4) },
                  { label: 'Sector Adjustment',    value: result1.reputationSteps.sectorAdj.toFixed(4) },
                  { label: 'IR Adjustment',        value: result1.reputationSteps.irAdj.toFixed(4) },
                  { label: 'Visibility Multiplier (B2C)', value: result1.reputationSteps.visibilityMult.toFixed(2) },
                  { label: 'Data Sensitivity Multiplier', value: `${result1.reputationSteps.dataSensitivityMult.toFixed(2)}\u00d7` },
                ]}
                steps2={[
                  { label: 'Severity Adjustment',  value: result2.reputationSteps.severityAdj.toFixed(4) },
                  { label: 'IR Adjustment',        value: result2.reputationSteps.irAdj.toFixed(4) },
                ]}
              />

              </TabsContent>

              {/* 8 – Governance */}
              <TabsContent value="governance" className="mt-6">
              <RangeCostBlock
                title={t('govTitle')}
                subtitle={t('govSubtitle')}
                band1={result1.costs.governance}
                band2={result2.costs.governance}
                labelLow={t('bandLow')}
                labelMid={t('bandMid')}
                labelHigh={t('bandHigh')}
                scenario1Label={s1Label}
                scenario2Label={s2Label}
                steps1={[
                  { label: 'Governance Base (revenue benchmark)', value: formatCurrency(result1.govSteps.govBase) },
                  { label: 'Severity Adjustment',                  value: result1.govSteps.severityAdj.toFixed(4) },
                  { label: 'Sector Adjustment',                    value: result1.govSteps.sectorAdj.toFixed(4) },
                ]}
                steps2={[
                  { label: 'Severity Adjustment',                  value: result2.govSteps.severityAdj.toFixed(4) },
                  { label: 'Sector Adjustment',                    value: result2.govSteps.sectorAdj.toFixed(4) },
                ]}
              />

              </TabsContent>

              {/* 9 – Notification Costs */}
              <TabsContent value="notification" className="mt-6">
              <RangeCostBlock
                title={t('notifyTitle')}
                subtitle={t('notifySubtitle')}
                band1={result1.costs.notification}
                band2={result2.costs.notification}
                labelLow={t('bandLow')}
                labelMid={t('bandMid')}
                labelHigh={t('bandHigh')}
                scenario1Label={s1Label}
                scenario2Label={s2Label}
                steps1={[
                  { label: 'Notification Base (revenue benchmark)', value: formatCurrency(result1.notificationSteps.notifyBase) },
                  { label: 'Data Sensitivity Multiplier',            value: `${result1.notificationSteps.dataSensitivityMult.toFixed(2)}\u00d7` },
                  { label: 'Org Size Multiplier',                    value: `${result1.notificationSteps.orgSizeMult.toFixed(2)}\u00d7` },
                  { label: 'Geographic Scope Multiplier',            value: `${result1.notificationSteps.geoMult.toFixed(2)}\u00d7` },
                  { label: 'Framework Multiplier',                   value: `${result1.notificationSteps.frameworkMult.toFixed(2)}\u00d7` },
                ]}
                steps2={[
                  { label: 'Notification Base (revenue benchmark)', value: formatCurrency(result2.notificationSteps.notifyBase) },
                  { label: 'Data Sensitivity Multiplier',            value: `${result2.notificationSteps.dataSensitivityMult.toFixed(2)}\u00d7` },
                  { label: 'Org Size Multiplier',                    value: `${result2.notificationSteps.orgSizeMult.toFixed(2)}\u00d7` },
                  { label: 'Geographic Scope Multiplier',            value: `${result2.notificationSteps.geoMult.toFixed(2)}\u00d7` },
                  { label: 'Framework Multiplier',                   value: `${result2.notificationSteps.frameworkMult.toFixed(2)}\u00d7` },
                ]}
              />

              </TabsContent>

              {/* 10 – Administrative Fine Ceiling (same for both scenarios) */}
              <TabsContent value="adminFineCeiling" className="mt-6">
              <div className="space-y-2">
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-5">
                  <p className="font-semibold text-sm mb-1">{t('fineTitle')}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('fineSubtitle')}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('fineCeilingLabel')}</span>
                    <span className="font-mono tabular-nums font-semibold text-sm">
                      {formatCurrency(result1.costs.adminFineCeiling)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border bg-card">
                  <div className="px-5 py-3 border-b">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Calculation Steps
                    </p>
                  </div>
                  <div className="divide-y">
                    {[
                      { label: 'Entity Type',             value: result1.fineSteps.entityType },
                      { label: 'Percent Cap',             value: formatPct(result1.fineSteps.pctCap) },
                      { label: 'Fixed Cap',               value: formatCurrency(result1.fineSteps.fixedCap) },
                      { label: 'Percent-based Amount',    value: formatCurrency(result1.fineSteps.pctAmount) },
                      { label: 'Fine Ceiling (MAX)',       value: formatCurrency(result1.costs.adminFineCeiling) },
                    ].map(({ label, value }, i) => (
                      <div key={i} className="flex items-center justify-between px-5 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-sm text-muted-foreground">{label}</span>
                        </div>
                        <span className="font-mono text-sm tabular-nums">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              </TabsContent>

              {/* 11 – Methodology Overview */}
              <TabsContent value="methodology" className="mt-6">
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{t('methodologyTitle')}</p>
                        <p className="text-xs text-muted-foreground">{t('methodologySubtitle')}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 shrink-0"
                      disabled={isExporting}
                      onClick={async () => {
                        setIsExporting(true);
                        try {
                          await exportMethodologyDocx(activeOrganization?.name);
                          toast.success(t('exportSuccess'));
                        } catch {
                          toast.error(t('exportError'));
                        } finally {
                          setIsExporting(false);
                        }
                      }}
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {t('exportMethodology')}
                    </Button>
                  </div>

                  <div className="space-y-6 rounded-lg border bg-card px-5 py-6">
                    {METHODOLOGY_SECTIONS.map((section) => (
                      <div key={section.id}>
                        <h4 className="text-sm font-semibold mb-2">{section.title}</h4>
                        {section.paragraphs.map((para, i) => (
                          <p key={i} className="text-sm text-muted-foreground mb-2 leading-relaxed">
                            {para}
                          </p>
                        ))}
                      </div>
                    ))}

                    {/* FAIR mapping table */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">{t('fairMappingTitle')}</h4>
                      <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('fairLossForm')}</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('sfeCategory')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {FAIR_MAPPING.map((row, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2 text-muted-foreground">{row.fair}</td>
                                <td className="px-3 py-2 text-muted-foreground">{row.conc}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* References */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">{t('referencesTitle')}</h4>
                      <ul className="space-y-1">
                        {REFERENCES.map((ref, i) => (
                          <li key={i} className="text-xs text-muted-foreground leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-muted-foreground/50">
                            {ref}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>

            </Tabs>
          ) : null}

          {/* Navigation */}
          <div className="mt-8">
            <Button
              variant="outline"
              onClick={() => router.push('/risk-foundation/financial-exposure')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Financial Exposure
            </Button>
          </div>
        </div>
      </main>

      {/* Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tw('exitDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{tw('exitDialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/home')}>
              {tc('navigation.exit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
