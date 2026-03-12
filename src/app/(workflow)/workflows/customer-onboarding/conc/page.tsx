'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, LogOut, Loader2 } from 'lucide-react';
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
import {
  calculateConcDowntimeCosts,
  DOWNTIME_SAFEGUARD_IDS,
} from '@/lib/conc/conc-calculator';

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

export default function ConcPage() {
  const t = useTranslations('Workflow.conc');
  const tw = useTranslations('Workflow.customerOnboarding');
  const tc = useTranslations('Common');
  const router = useRouter();
  const { activeOrganization } = useOrganization();

  const [isLoading, setIsLoading] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Calculated values (can be overridden by user)
  const [downtimeCostMid, setDowntimeCostMid] = useState('');
  const [downtimeCostLow, setDowntimeCostLow] = useState('');
  const [downtimeCostHigh, setDowntimeCostHigh] = useState('');
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    if (!activeOrganization?.id) return;

    setIsLoading(true);

    fetch(`/api/gap-report?organizationId=${activeOrganization.id}`)
      .then((res) => res.json())
      .then((data) => {
        // Use the latest finalized report if available; otherwise use empty scores (defaults to CMMI=1)
        const cmmiValues: Record<string, number> = {};
        if (data.success && data.data?.length) {
          const latest: GapReport = data.data[0];
          for (const entry of latest.cmmiValues) {
            cmmiValues[entry.safeguardId] = entry.currentCmmi;
          }
        }

        const result = calculateConcDowntimeCosts({
          naceSection: activeOrganization.naceSection,
          revenueRange: activeOrganization.revenueRange,
          businessDaysPerYear: activeOrganization.businessDaysPerYear,
          manualOperation: activeOrganization.manualOperation,
          productionDependency: activeOrganization.productionDependency,
          customerAccess: activeOrganization.customerAccess,
          cmmiValues,
        });

        if (result.ok) {
          setDowntimeCostMid(Math.round(result.mid).toString());
          setDowntimeCostLow(Math.round(result.low).toString());
          setDowntimeCostHigh(Math.round(result.high).toString());
          setMissingFields([]);
        } else {
          setMissingFields(result.missing);
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
            /* Missing data notice */
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
            /* Results container */
            <div className="rounded-lg border bg-card p-5">
              <p className="font-semibold text-sm mb-1">{t('downtimeCostsTitle')}</p>
              <p className="text-sm text-muted-foreground mb-4">{t('downtimeCostsSubtitle')}</p>
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="pr-4">
                  <p className="text-xs text-muted-foreground mb-1">{t('downtimeCostLow')}</p>
                  <p className="font-mono tabular-nums font-medium text-sm">
                    {formatCurrency(Number(downtimeCostLow))}
                  </p>
                </div>
                <div className="px-4">
                  <p className="text-xs text-muted-foreground mb-1">{t('downtimeCostMid')}</p>
                  <p className="font-mono tabular-nums font-semibold text-sm">
                    {formatCurrency(Number(downtimeCostMid))}
                  </p>
                </div>
                <div className="pl-4">
                  <p className="text-xs text-muted-foreground mb-1">{t('downtimeCostHigh')}</p>
                  <p className="font-mono tabular-nums font-medium text-sm">
                    {formatCurrency(Number(downtimeCostHigh))}
                  </p>
                </div>
              </div>
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
