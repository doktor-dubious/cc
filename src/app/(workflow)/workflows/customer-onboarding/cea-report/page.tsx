'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  LogOut,
  Loader2,
  Users,
  X,
  Shield,
  AlertTriangle,
} from 'lucide-react';
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
import { useOrganization } from '@/context/OrganizationContext';
import type { ThirdPartyCompanyObj } from '@/lib/database/third-party';
import { calculatePriorityControls, type CeaPriorityResult } from '@/lib/ces/cea-priority-controls';
import type { RiskLevel } from '@/lib/ces/ces-report-generator';

// ── Risk level badge colors ──────────────────────────────────────────────────

const RISK_COLORS: Record<RiskLevel, string> = {
  Low:      'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
  Moderate: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
  Elevated: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  High:     'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
  Severe:   'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
};

function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${RISK_COLORS[level]}`}>
      {level}
    </span>
  );
}

// ── Relevance bar ─────────────────────────────────────────────────────────────

function RelevanceBar({ score }: { score: number }) {
  const pct = Math.min(100, score);
  const color = pct >= 60 ? 'bg-red-500' : pct >= 40 ? 'bg-orange-500' : pct >= 20 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground">{pct}</span>
    </div>
  );
}

// ── Exposure panel ────────────────────────────────────────────────────────────

function ExposurePanel({
  result,
  onClose,
}: {
  result: CeaPriorityResult;
  onClose: () => void;
}) {
  const t = useTranslations('Workflow.ceaReport');
  const { cesReport, priorityControls } = result;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 h-full w-full max-w-2xl overflow-y-auto bg-background border-l shadow-xl">
        {/* Panel header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold">{cesReport.companyName}</h3>
            <p className="text-sm text-muted-foreground">{t('title')}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-8">
          {/* Overall score */}
          <div className="flex items-center gap-6 rounded-lg border bg-card p-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-muted">
              <span className="text-2xl font-bold tabular-nums">{cesReport.overallScore}</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('overallScore')}</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm font-medium">{t('riskLevel')}:</p>
                <RiskBadge level={cesReport.riskLevel} />
              </div>
            </div>
          </div>

          {/* Exposure categories */}
          <div>
            <h4 className="text-sm font-semibold mb-3">{t('categories')}</h4>
            <div className="space-y-2">
              {cesReport.categories.map((cat) => (
                <div key={cat.name} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{cat.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">{cat.score}/100</span>
                      <RiskBadge level={cat.riskLevel} />
                    </div>
                  </div>
                  {cat.findings.length > 0 && (
                    <ul className="space-y-1 mt-2">
                      {cat.findings.map((f, i) => (
                        <li key={i} className="text-xs text-muted-foreground pl-4 relative before:content-['\2022'] before:absolute before:left-0 before:text-muted-foreground/50">
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Priority CIS Controls */}
          <div>
            <h4 className="text-sm font-semibold mb-1">{t('priorityControlsTitle')}</h4>
            <p className="text-xs text-muted-foreground mb-3">{t('priorityControlsSubtitle')}</p>
            <div className="space-y-3">
              {priorityControls.map((ctrl, i) => (
                <div key={ctrl.controlId} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {t('control')} {ctrl.controlId}: {ctrl.controlTitle}
                        </p>
                        <RelevanceBar score={ctrl.relevanceScore} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{ctrl.reason}</p>

                      {/* Priority safeguard */}
                      <div className="mt-3 rounded-md border border-dashed bg-muted/30 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="h-3.5 w-3.5 text-primary" />
                          <p className="text-xs font-semibold">{t('prioritySafeguard')}: {ctrl.prioritySafeguard.id}</p>
                        </div>
                        <p className="text-xs font-medium">{ctrl.prioritySafeguard.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{ctrl.prioritySafeguard.reason}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {cesReport.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">{t('recommendations')}</h4>
              <div className="rounded-lg border bg-card p-4">
                <ul className="space-y-2">
                  {cesReport.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CeaReportPage() {
  const t = useTranslations('Workflow.ceaReport');
  const tw = useTranslations('Workflow.customerOnboarding');
  const tc = useTranslations('Common');
  const router = useRouter();
  const { activeOrganization } = useOrganization();

  const [thirdParties, setThirdParties] = useState<ThirdPartyCompanyObj[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<CeaPriorityResult | null>(null);

  const loadThirdParties = useCallback(async () => {
    if (!activeOrganization?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/third-party?organizationId=${activeOrganization.id}`);
      const json = await res.json();
      if (json.success) setThirdParties(json.data ?? []);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [activeOrganization?.id]);

  useEffect(() => { loadThirdParties(); }, [loadThirdParties]);

  const handleExposure = (tp: ThirdPartyCompanyObj) => {
    const result = calculatePriorityControls(tp);
    setSelectedResult(result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
        <div className="mx-auto max-w-5xl">
          {/* Intro */}
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t('description')}</p>
          </div>

          {/* Third-party cards */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : thirdParties.length === 0 ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 p-12 text-center">
              <Users className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">{t('noThirdParties')}</p>
              <p className="mt-1 text-sm text-muted-foreground/60">{t('noThirdPartiesHint')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {thirdParties.map((tp) => (
                <div
                  key={tp.id}
                  className="flex flex-col gap-4 rounded-lg border border-muted bg-card p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base leading-tight">{tp.name}</p>
                      {tp.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                          {tp.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExposure(tp)}
                    className="mt-auto w-full gap-2"
                  >
                    {t('exposure')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-12">
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

      {/* Exposure panel */}
      {selectedResult && (
        <ExposurePanel
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}

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
