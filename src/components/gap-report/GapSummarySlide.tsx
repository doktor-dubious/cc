'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type CmmiData = {
  safeguardId: string;
  currentCmmi: number;
  targetCmmi: number;
};

type GapSummarySlideProps = {
  cmmiData: Record<string, CmmiData>;
  activeSafeguardIds: string[];
  isFinalized: boolean;
  onFinalize: (remarks: string) => Promise<void>;
};

export function GapSummarySlide({
  cmmiData,
  activeSafeguardIds,
  isFinalized,
  onFinalize,
}: GapSummarySlideProps) {
  const t = useTranslations('GapReport');
  const [remarks, setRemarks] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Calculate statistics from active safeguards only
  const activeCmmiEntries = activeSafeguardIds
    .map((id) => cmmiData[id])
    .filter((entry): entry is CmmiData => !!entry);

  const totalSafeguards = activeSafeguardIds.length;
  const assessedSafeguards = activeCmmiEntries.length;
  const unassessedCount = totalSafeguards - assessedSafeguards;

  // Calculate average GAP
  const totalGap = activeCmmiEntries.reduce(
    (sum, entry) => sum + (entry.targetCmmi - entry.currentCmmi),
    0
  );
  const averageGap = assessedSafeguards > 0 ? totalGap / assessedSafeguards : 0;

  // Calculate CMMI level distributions
  const currentLevelCounts = [0, 0, 0, 0, 0];
  const targetLevelCounts = [0, 0, 0, 0, 0];

  for (const entry of activeCmmiEntries) {
    currentLevelCounts[entry.currentCmmi - 1]++;
    targetLevelCounts[entry.targetCmmi - 1]++;
  }

  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      await onFinalize(remarks);
    } finally {
      setIsFinalizing(false);
    }
  };

  const canFinalize = assessedSafeguards > 0 && !isFinalized;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{t('summary.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('summary.subtitle')}</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {t('summary.totalSafeguards')}
          </p>
          <p className="text-2xl font-semibold mt-1">{totalSafeguards}</p>
        </div>

        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {t('summary.assessed')}
          </p>
          <p className="text-2xl font-semibold mt-1">{assessedSafeguards}</p>
        </div>

        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {t('summary.unassessed')}
          </p>
          <p className={cn(
            'text-2xl font-semibold mt-1',
            unassessedCount > 0 ? 'text-yellow-500' : 'text-green-500'
          )}>
            {unassessedCount}
          </p>
        </div>

        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {t('summary.averageGap')}
          </p>
          <p className={cn(
            'text-2xl font-semibold mt-1',
            averageGap > 1 ? 'text-red-500' : averageGap > 0 ? 'text-yellow-500' : 'text-green-500'
          )}>
            {averageGap.toFixed(2)}
          </p>
        </div>
      </div>

      {/* CMMI Distribution */}
      <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 space-y-4">
        <h3 className="font-medium">{t('summary.cmmiDistribution')}</h3>

        <div className="grid grid-cols-2 gap-6">
          {/* Current CMMI Distribution */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              {t('cmmi.currentCmmi')}
            </p>
            <div className="space-y-1">
              {currentLevelCounts.map((count, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-8">L{idx + 1}</span>
                  <div className="flex-1 h-4 bg-neutral-700 rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${assessedSafeguards > 0 ? (count / assessedSafeguards) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Target CMMI Distribution */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
              {t('cmmi.targetCmmi')}
            </p>
            <div className="space-y-1">
              {targetLevelCounts.map((count, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-8">L{idx + 1}</span>
                  <div className="flex-1 h-4 bg-neutral-700 rounded overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${assessedSafeguards > 0 ? (count / assessedSafeguards) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Warning for unassessed safeguards */}
      {unassessedCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-500">{t('summary.unassessedWarning')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('summary.unassessedWarningDescription', { count: unassessedCount })}
            </p>
          </div>
        </div>
      )}

      {/* Remarks */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('summary.remarks')}
        </label>
        <Textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder={t('summary.remarksPlaceholder')}
          className="min-h-24 resize-y"
          disabled={isFinalized}
        />
      </div>

      {/* Finalize Button */}
      {isFinalized ? (
        <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="font-medium text-green-500">{t('summary.finalized')}</p>
        </div>
      ) : (
        <Button
          onClick={handleFinalize}
          disabled={!canFinalize || isFinalizing}
          className="w-full"
          size="lg"
        >
          {isFinalizing ? t('summary.finalizing') : t('summary.finalizeButton')}
        </Button>
      )}
    </div>
  );
}
