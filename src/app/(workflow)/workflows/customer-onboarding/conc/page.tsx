'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, LogOut, Loader2, ChevronDown, Download, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { RocketIcon } from '@/components/animate-ui/icons/rocket';
import { Button } from '@/components/ui/button';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useOrganization } from '@/context/OrganizationContext';
import {
  calculateConcDowntimeCosts,
  type ConcResult,
  type CostBand,
} from '@/lib/conc/conc-calculator';
import {
  calculateBreachLikelihood,
  type BreachLikelihoodResult,
  type BreachLikelihoodBand,
  type AleBand,
  type FactorContribution,
} from '@/lib/conc/breach-likelihood-calculator';
import {
  METHODOLOGY_SECTIONS,
  FAIR_MAPPING,
  REFERENCES,
  exportMethodologyDocx,
} from '@/lib/conc/conc-methodology-doc';
import { exportConcReportDocx } from '@/lib/conc/conc-report-doc';

type GapReportCmmi = {
  safeguardId: string;
  currentCmmi: number;
};

type GapReport = {
  version: number;
  cmmiValues: GapReportCmmi[];
};

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

// ─── Reusable cost block ──────────────────────────────────────────────────────

function CostBlock({
  title,
  subtitle,
  band,
  labelLow,
  labelMid,
  labelHigh,
  steps,
  note,
}: {
  title: string;
  subtitle: string;
  band: CostBand;
  labelLow: string;
  labelMid: string;
  labelHigh: string;
  steps: { label: string; value: string }[];
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
              {formatCurrency(band.low)}
            </p>
          </div>
          <div className="px-4">
            <p className="text-xs text-muted-foreground mb-1">{labelMid}</p>
            <p className="font-mono tabular-nums font-semibold text-sm">
              {formatCurrency(band.mid)}
            </p>
          </div>
          <div className="pl-4">
            <p className="text-xs text-muted-foreground mb-1">{labelHigh}</p>
            <p className="font-mono tabular-nums font-medium text-sm">
              {formatCurrency(band.high)}
            </p>
          </div>
        </div>
      </div>

      {/* Intermediate steps */}
      <div className="rounded-lg border bg-card">
        <div className="px-5 py-3 border-b">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Calculation Steps
          </p>
        </div>
        <div className="divide-y">
          {steps.map(({ label, value }, i) => (
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

// ─── Risk level badge colors ─────────────────────────────────────────────────

const RISK_LEVEL_STYLE: Record<string, string> = {
  VERY_LOW:  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  LOW:       'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  MODERATE:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  ELEVATED:  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  HIGH:      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  VERY_HIGH: 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200',
};

const RISK_LEVEL_KEY: Record<string, string> = {
  VERY_LOW:  'blRiskVeryLow',
  LOW:       'blRiskLow',
  MODERATE:  'blRiskModerate',
  ELEVATED:  'blRiskElevated',
  HIGH:      'blRiskHigh',
  VERY_HIGH: 'blRiskVeryHigh',
};

function formatProbability(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

// ─── Breach Likelihood Block ─────────────────────────────────────────────────

function BreachLikelihoodBlock({
  band,
  ale,
  riskLevel,
  factors,
  t,
}: {
  band: BreachLikelihoodBand;
  ale: AleBand | null;
  riskLevel: string;
  factors: FactorContribution[];
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-2">
      {/* Probability card */}
      <div className="rounded-lg border border-blue-500/40 bg-blue-500/5 p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-sm">{t('blTitle')}</p>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${RISK_LEVEL_STYLE[riskLevel] ?? ''}`}>
            {t(RISK_LEVEL_KEY[riskLevel] ?? 'blRiskModerate')}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{t('blSubtitle')}</p>
        <div className="grid grid-cols-3 divide-x divide-border">
          <div className="pr-4">
            <p className="text-xs text-muted-foreground mb-1">{t('blLow')}</p>
            <p className="font-mono tabular-nums font-medium text-sm">
              {formatProbability(band.low)}
            </p>
          </div>
          <div className="px-4">
            <p className="text-xs text-muted-foreground mb-1">{t('blMid')}</p>
            <p className="font-mono tabular-nums font-semibold text-sm">
              {formatProbability(band.mid)}
            </p>
          </div>
          <div className="pl-4">
            <p className="text-xs text-muted-foreground mb-1">{t('blHigh')}</p>
            <p className="font-mono tabular-nums font-medium text-sm">
              {formatProbability(band.high)}
            </p>
          </div>
        </div>
      </div>

      {/* ALE (Annual Loss Expectancy) card */}
      {ale && (
        <div className="rounded-lg border bg-card p-5">
          <p className="font-semibold text-sm mb-1">{t('aleTitle')}</p>
          <p className="text-sm text-muted-foreground mb-4">{t('aleSubtitle')}</p>
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="pr-4">
              <p className="text-xs text-muted-foreground mb-1">{t('blLow')}</p>
              <p className="font-mono tabular-nums font-medium text-sm">
                {formatCurrency(ale.low)}
              </p>
            </div>
            <div className="px-4">
              <p className="text-xs text-muted-foreground mb-1">{t('blMid')}</p>
              <p className="font-mono tabular-nums font-semibold text-sm">
                {formatCurrency(ale.mid)}
              </p>
            </div>
            <div className="pl-4">
              <p className="text-xs text-muted-foreground mb-1">{t('blHigh')}</p>
              <p className="font-mono tabular-nums font-medium text-sm">
                {formatCurrency(ale.high)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Factor contributions */}
      <div className="rounded-lg border bg-card">
        <div className="px-5 py-3 border-b">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('blFactorsTitle')}
          </p>
        </div>
        <div className="divide-y">
          {factors.map((factor, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-2.5">
              <div className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground">{t(factor.name)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${
                  factor.direction === 'increases'
                    ? 'text-red-500 dark:text-red-400'
                    : factor.direction === 'decreases'
                    ? 'text-emerald-500 dark:text-emerald-400'
                    : 'text-muted-foreground'
                }`}>
                  {factor.direction === 'increases' ? '\u2191' : factor.direction === 'decreases' ? '\u2193' : '\u2014'}
                </span>
                <span className="font-mono text-sm tabular-nums">
                  {factor.beta >= 0 ? '+' : ''}{factor.beta.toFixed(3)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConcPage() {
  const t = useTranslations('Workflow.conc');
  const tw = useTranslations('Workflow.customerOnboarding');
  const tc = useTranslations('Common');
  const router = useRouter();
  const { activeOrganization } = useOrganization();

  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [result, setResult] = useState<Extract<ConcResult, { ok: true }> | null>(null);
  const [blResult, setBlResult] = useState<Extract<BreachLikelihoodResult, { ok: true }> | null>(null);

  useEffect(() => {
    if (!activeOrganization?.id) return;

    setIsLoading(true);

    fetch(`/api/gap-report?organizationId=${activeOrganization.id}`)
      .then((res) => res.json())
      .then((data) => {
        const cmmiValues: Record<string, number> = {};
        if (data.success && data.data?.length) {
          const latest: GapReport = data.data[0];
          for (const entry of latest.cmmiValues) {
            cmmiValues[entry.safeguardId] = entry.currentCmmi;
          }
        }

        const calcResult = calculateConcDowntimeCosts({
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
          cmmiValues,
        });

        if (calcResult.ok) {
          setResult(calcResult);
          setMissingFields([]);
        } else {
          setResult(null);
          setMissingFields(calcResult.missing);
        }

        // Breach likelihood — pass CoNC total for ALE calculation
        const concTotalMid = calcResult.ok
          ? calcResult.costs.downtime.mid +
            calcResult.costs.ir.mid +
            calcResult.costs.restore.mid +
            calcResult.costs.ebi.mid +
            calcResult.costs.ccl.mid +
            calcResult.costs.reg.mid +
            calcResult.costs.reputation.mid +
            calcResult.costs.governance.mid +
            calcResult.costs.notification.mid
          : undefined;

        const blCalcResult = calculateBreachLikelihood({
          orgSize: activeOrganization.size,
          naceSection: activeOrganization.naceSection,
          dataSensitivity: activeOrganization.dataSensitivity ?? [],
          infrastructureTypes: activeOrganization.infrastructureTypes ?? [],
          geographicScope: activeOrganization.geographicScope,
          itSecurityStaff: activeOrganization.itSecurityStaff,
          securityMaturity: activeOrganization.securityMaturity,
          publicFacingServices: activeOrganization.publicFacingServices,
          targetedAttackLikelihood: activeOrganization.targetedAttackLikelihood,
          supplyChainPosition: activeOrganization.supplyChainPosition,
          remoteWorkforce: activeOrganization.remoteWorkforce,
          previousBreachHistory: activeOrganization.previousBreachHistory,
          cmmiValues,
          concTotalMid,
        });
        if (blCalcResult.ok) {
          setBlResult(blCalcResult);
        } else {
          setBlResult(null);
        }
      })
      .catch(() => {
        setMissingFields(['Failed to load GAP report data']);
      })
      .finally(() => setIsLoading(false));
  }, [activeOrganization]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <RocketIcon size={20} />
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">{t('title')}</h1>
              {activeOrganization && (
                <>
                  <div className="h-5 w-px bg-border" />
                  <span className="text-base text-muted-foreground">
                    {activeOrganization.name}
                  </span>
                </>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExitDialog(true)}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            {tc('navigation.exit')}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-xl">
          {/* Intro */}
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t('description')}</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : missingFields.length > 0 ? (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-6">
              <p className="font-semibold text-yellow-700 dark:text-yellow-400 mb-3">
                Cannot calculate downtime costs — missing data:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-600 dark:text-yellow-300">
                {missingFields.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-8">

              {/* 0 – Annual Breach Likelihood & ALE */}
              {blResult && (
                <BreachLikelihoodBlock
                  band={blResult.band}
                  ale={blResult.ale}
                  riskLevel={blResult.riskLevel}
                  factors={blResult.factors}
                  t={t}
                />
              )}

              {/* 1 – Estimated Downtime Costs */}
              {result && (
                <CostBlock
                  title={t('downtimeCostsTitle')}
                  subtitle={t('downtimeCostsSubtitle')}
                  band={result.costs.downtime}
                  labelLow={t('downtimeCostLow')}
                  labelMid={t('downtimeCostMid')}
                  labelHigh={t('downtimeCostHigh')}
                  steps={[
                    { label: 'IBM Industry',        value: result.steps.ibmIndustry },
                    { label: 'Daily Revenue',        value: formatCurrency(result.steps.dailyRevenue) },
                    { label: 'IT Dependency Level',  value: String(result.steps.itDependencyLevel) },
                    { label: 'IT Factor',            value: `${(result.steps.itFactor * 100).toFixed(0)}%` },
                    { label: 'Sector Factor',        value: result.steps.sectorFactor.toFixed(4) },
                    { label: 'Org Size Factor',      value: `${result.steps.orgSize} (${result.steps.orgSizeMult.toFixed(2)}\u00d7)` },
                    { label: 'Adjusted Daily Loss',  value: formatCurrency(result.steps.adjustedDailyLoss) },
                    { label: 'Total GAP Score',      value: `SUM(${result.steps.cmmiScores.join(',')}) = ${result.steps.cmmiSum}` },
                    { label: 'Downtime GAP Score',   value: `${result.steps.gapScore.toFixed(1)} / 100` },
                    { label: 'Downtime Days',        value: `${result.steps.downtimeDays.toFixed(2)} days` },
                  ]}
                />
              )}

              {/* 2 – IR */}
              {result && (
                <CostBlock
                  title={t('irTitle')}
                  subtitle={t('irSubtitle')}
                  band={result.costs.ir}
                  labelLow={t('bandLow')}
                  labelMid={t('bandMid')}
                  labelHigh={t('bandHigh')}
                  steps={[
                    { label: 'IR Base (revenue benchmark)',  value: formatCurrency(result.irSteps.irBase) },
                    { label: 'IR Score (avg 17.2, 17.1, 17.5, 8.11)', value: result.irSteps.irScore.toFixed(2) },
                    { label: 'IR Maturity Multiplier',       value: result.irSteps.irMaturityMult.toFixed(4) },
                    { label: 'IR Dependency Multiplier',     value: result.irSteps.irDepMult.toFixed(2) },
                  ]}
                />
              )}

              {/* 3 – Restore */}
              {result && (
                <CostBlock
                  title={t('restoreTitle')}
                  subtitle={t('restoreSubtitle')}
                  band={result.costs.restore}
                  labelLow={t('bandLow')}
                  labelMid={t('bandMid')}
                  labelHigh={t('bandHigh')}
                  steps={[
                    { label: 'Restore Base (revenue benchmark)',    value: formatCurrency(result.restoreSteps.restoreBase) },
                    { label: 'Restore Score (avg 11.2, 11.4, 11.5)', value: result.restoreSteps.restoreScore.toFixed(2) },
                    { label: 'Restore Maturity Multiplier',         value: result.restoreSteps.restoreMaturityMult.toFixed(4) },
                    { label: 'Restore Dependency Multiplier',       value: result.restoreSteps.restoreDepMult.toFixed(2) },
                    { label: 'Infrastructure Type Multiplier',       value: `${result.restoreSteps.infraMult.toFixed(2)}\u00d7` },
                  ]}
                />
              )}

              {/* 4 – EBI */}
              {result && (
                <CostBlock
                  title={t('ebiTitle')}
                  subtitle={t('ebiSubtitle')}
                  band={result.costs.ebi}
                  labelLow={t('bandLow')}
                  labelMid={t('bandMid')}
                  labelHigh={t('bandHigh')}
                  steps={[
                    { label: 'Daily Revenue',             value: formatCurrency(result.steps.dailyRevenue) },
                    { label: 'Downtime Days',             value: `${result.steps.downtimeDays.toFixed(2)} days` },
                    { label: 'Recovery Friction (0.15 \u00d7 d\u00b2)', value: `${result.ebiSteps.ebiRecoveryFriction.toFixed(2)} days` },
                    { label: 'EBI Sector Adjustment',     value: result.ebiSteps.ebiSectorAdj.toFixed(4) },
                    { label: 'EBI Dependency Multiplier', value: result.ebiSteps.ebiDepMult.toFixed(2) },
                    { label: 'EBI Restore Adjustment',    value: result.ebiSteps.ebiRestoreAdj.toFixed(4) },
                  ]}
                />
              )}

              {/* 5 – CCL */}
              {result && (
                <CostBlock
                  title={t('cclTitle')}
                  subtitle={t('cclSubtitle')}
                  band={result.costs.ccl}
                  labelLow={t('bandLow')}
                  labelMid={t('bandMid')}
                  labelHigh={t('bandHigh')}
                  steps={[
                    { label: 'Customer Model',           value: result.cclSteps.customerModel },
                    { label: 'Revenue Concentration',    value: result.cclSteps.revenueConcentration },
                    { label: 'Base % of Annual Revenue', value: formatPct(result.cclSteps.basePct) },
                    { label: 'CCL Sector Adjustment',    value: result.cclSteps.cclSectorAdj.toFixed(4) },
                    { label: 'CCL Severity Adjustment',  value: result.cclSteps.cclSeverityAdj.toFixed(4) },
                    { label: 'CCL IR Adjustment',        value: result.cclSteps.cclIrAdj.toFixed(4) },
                  ]}
                />
              )}

              {/* 6 – Regulatory */}
              {result && (
                <CostBlock
                  title={t('regTitle')}
                  subtitle={t('regSubtitle')}
                  band={result.costs.reg}
                  labelLow={t('bandLow')}
                  labelMid={t('bandMid')}
                  labelHigh={t('bandHigh')}
                  steps={[
                    { label: 'Reg Base (revenue benchmark)', value: formatCurrency(result.regSteps.regBase) },
                    { label: 'Reg Sector Adjustment',        value: result.regSteps.regSectorAdj.toFixed(4) },
                    { label: 'Reg Severity Adjustment',      value: result.regSteps.regSeverityAdj.toFixed(4) },
                    { label: 'Reg IR Adjustment',            value: result.regSteps.regIrAdj.toFixed(4) },
                    { label: 'Framework Multiplier',         value: `${result.regSteps.regFrameworkCount} framework${result.regSteps.regFrameworkCount !== 1 ? 's' : ''} (${result.regSteps.regFrameworkMult.toFixed(2)}\u00d7)` },
                    { label: 'Geographic Scope Multiplier',  value: `${result.regSteps.regGeoMult.toFixed(2)}\u00d7` },
                    { label: 'Previous Breach Multiplier',   value: `${result.regSteps.regPrevBreachMult.toFixed(2)}\u00d7` },
                  ]}
                />
              )}

              {/* 7 – Reputational */}
              {result && (
                <CostBlock
                  title={t('repTitle')}
                  subtitle={t('repSubtitle')}
                  band={result.costs.reputation}
                  labelLow={t('bandLow')}
                  labelMid={t('bandMid')}
                  labelHigh={t('bandHigh')}
                  steps={[
                    { label: 'Customer Model',       value: result.reputationSteps.customerModel },
                    { label: 'Base % of Revenue',    value: formatPct(result.reputationSteps.basePct) },
                    { label: 'Severity Adjustment',  value: result.reputationSteps.severityAdj.toFixed(4) },
                    { label: 'Sector Adjustment',    value: result.reputationSteps.sectorAdj.toFixed(4) },
                    { label: 'IR Adjustment',        value: result.reputationSteps.irAdj.toFixed(4) },
                    { label: 'Visibility Multiplier (B2C)', value: result.reputationSteps.visibilityMult.toFixed(2) },
                    { label: 'Data Sensitivity Multiplier', value: `${result.reputationSteps.dataSensitivityMult.toFixed(2)}\u00d7` },
                    { label: 'Previous Breach Multiplier',  value: `${result.reputationSteps.prevBreachMult.toFixed(2)}\u00d7` },
                  ]}
                />
              )}

              {/* 8 – Governance */}
              {result && (
                <CostBlock
                  title={t('govTitle')}
                  subtitle={t('govSubtitle')}
                  band={result.costs.governance}
                  labelLow={t('bandLow')}
                  labelMid={t('bandMid')}
                  labelHigh={t('bandHigh')}
                  steps={[
                    { label: 'Governance Base (revenue benchmark)', value: formatCurrency(result.govSteps.govBase) },
                    { label: 'Severity Adjustment',                  value: result.govSteps.severityAdj.toFixed(4) },
                    { label: 'Sector Adjustment',                    value: result.govSteps.sectorAdj.toFixed(4) },
                  ]}
                />
              )}

              {/* 9 – Notification Costs */}
              {result && (
                <CostBlock
                  title={t('notifyTitle')}
                  subtitle={t('notifySubtitle')}
                  band={result.costs.notification}
                  labelLow={t('bandLow')}
                  labelMid={t('bandMid')}
                  labelHigh={t('bandHigh')}
                  steps={[
                    { label: 'Notification Base (revenue benchmark)', value: formatCurrency(result.notificationSteps.notifyBase) },
                    { label: 'Data Sensitivity Multiplier',            value: `${result.notificationSteps.dataSensitivityMult.toFixed(2)}\u00d7` },
                    { label: 'Org Size Multiplier',                    value: `${result.notificationSteps.orgSizeMult.toFixed(2)}\u00d7` },
                    { label: 'Geographic Scope Multiplier',            value: `${result.notificationSteps.geoMult.toFixed(2)}\u00d7` },
                    { label: 'Framework Multiplier',                   value: `${result.notificationSteps.frameworkMult.toFixed(2)}\u00d7` },
                  ]}
                />
              )}

              {/* 10 – Administrative Fine Ceiling */}
              {result && (
                <div className="space-y-2">
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-5">
                    <p className="font-semibold text-sm mb-1">{t('fineTitle')}</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('fineSubtitle')}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('fineCeilingLabel')}</span>
                      <span className="font-mono tabular-nums font-semibold text-sm">
                        {formatCurrency(result.costs.adminFineCeiling)}
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
                        { label: 'Entity Type',             value: result.fineSteps.entityType },
                        { label: 'Percent Cap',             value: formatPct(result.fineSteps.pctCap) },
                        { label: 'Fixed Cap',               value: formatCurrency(result.fineSteps.fixedCap) },
                        { label: 'Percent-based Amount',    value: formatCurrency(result.fineSteps.pctAmount) },
                        { label: 'Fine Ceiling (MAX)',       value: formatCurrency(result.costs.adminFineCeiling) },
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
              )}

            </div>
          )}

          {/* Export buttons */}
          {result && (
            <div className="mt-8 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isExportingReport}
                onClick={async () => {
                  setIsExportingReport(true);
                  try {
                    await exportConcReportDocx(
                      result,
                      blResult
                        ? { band: blResult.band, ale: blResult.ale, riskLevel: blResult.riskLevel, factors: blResult.factors }
                        : null,
                      activeOrganization?.name,
                    );
                    toast.success(t('exportSuccess'));
                  } catch {
                    toast.error(t('exportError'));
                  } finally {
                    setIsExportingReport(false);
                  }
                }}
              >
                {isExportingReport ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {t('exportReport')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
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
          )}

          {/* Methodology & Sources */}
          {result && (
            <div className="mt-8">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center justify-between rounded-lg border bg-card px-5 py-4 text-left hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold">{t('methodologyTitle')}</p>
                        <p className="text-xs text-muted-foreground">{t('methodologySubtitle')}</p>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-6 rounded-lg border bg-card px-5 py-6">
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
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t('concCategory')}</th>
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
                          <li key={i} className="text-xs text-muted-foreground leading-relaxed pl-4 relative before:content-['\2022'] before:absolute before:left-0 before:text-muted-foreground/50">
                            {ref}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8">
            <Button
              variant="outline"
              onClick={() => router.push('/workflows/customer-onboarding')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('backToWorkflow')}
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
