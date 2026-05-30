'use client';

import { useTranslations } from 'next-intl';
import { GapNoteEditor } from './GapNoteEditor';
import { GapCmmiGroup } from './GapCmmiSelector';
import type { Safeguard } from '@/lib/constants/cis-controls';

type GapSafeguardSlideProps = {
  safeguard: Safeguard;
  controlId: number;
  controlTitle: string;
  isActive: boolean;
  onToggleActive: () => void;
  effectiveIg: number;
  onIgChange: (ig: number) => void;
  note: string;
  onSaveNote: (content: string) => Promise<void>;
  currentCmmi: number;
  targetCmmi: number;
  onCmmiChange: (current: number, target: number) => void;
};

type IgKey = 'ig1' | 'ig2' | 'ig3';

export function GapSafeguardSlide({
  safeguard,
  controlId,
  controlTitle,
  isActive,
  onToggleActive,
  effectiveIg,
  onIgChange,
  note,
  onSaveNote,
  currentCmmi,
  targetCmmi,
  onCmmiChange,
}: GapSafeguardSlideProps) {
  const t = useTranslations('GapReport');

  // Which IGs have real data for this safeguard (scope !== 'N/A')
  const ig1HasData = safeguard.ig1.scope && safeguard.ig1.scope !== 'N/A';
  const ig2HasData = safeguard.ig2.scope && safeguard.ig2.scope !== 'N/A';

  // Lowest IG that applies → drives the floor for Current CMMI:
  //   IG1 available  → min L1
  //   IG2 only       → min L3
  //   IG3 only       → min L4
  const minCurrentLevel = ig1HasData ? 1 : ig2HasData ? 3 : 4;

  // IG is implied by Target CMMI when assessed:
  //   targetCmmi 0   → not assessed (no IG panel)
  //   L1, L2         → IG1
  //   L3             → IG2
  //   L4, L5         → IG3
  const targetIg: 1 | 2 | 3 | null =
    targetCmmi === 0 ? null
    : targetCmmi <= 2 ? 1
    : targetCmmi === 3 ? 2
    : 3;

  const igKey = (targetIg ? `ig${targetIg}` : null) as IgKey | null;
  const igData = igKey ? safeguard[igKey] : null;
  const hasIgData = !!(igData && igData.scope && igData.scope !== 'N/A');

  return (
    <div className="space-y-6">
      {/* Header — safeguard title is rendered by the page on the navigation row. */}

      {/* Core Information */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {t('labels.definition')}
          </p>
          <p className="text-sm leading-relaxed">{safeguard.definition}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {t('labels.purpose')}
          </p>
          <p className="text-sm leading-relaxed">{safeguard.purpose}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {t('labels.why')}
          </p>
          <p className="text-sm leading-relaxed">{safeguard.why}</p>
        </div>
      </div>

      {/* IG-Specific Details — only when a Target CMMI has been set */}
      {targetIg !== null && hasIgData && igData && (
        <div className="border rounded-lg bg-muted/20 p-4 space-y-4">
          <h3 className="font-medium">
            {t('labels.igDetails', { ig: targetIg })}
          </h3>

          <div className="grid gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {t('labels.scope')}
              </p>
              <p className="text-sm leading-relaxed">{igData.scope}</p>
            </div>

            {igData.approach && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  {t('labels.approach')}
                </p>
                <p className="text-sm leading-relaxed">{igData.approach}</p>
              </div>
            )}

            {igData.example && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  {t('labels.example')}
                </p>
                <p className="text-sm leading-relaxed">{igData.example}</p>
              </div>
            )}

            {igData.resources && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  {t('labels.resources')}
                </p>
                <p className="text-sm leading-relaxed">{igData.resources}</p>
              </div>
            )}
          </div>
        </div>
      )}
      {targetIg !== null && !hasIgData && (
        <div className="border rounded-lg bg-muted/20 p-4 text-center text-muted-foreground">
          <p>{t('messages.noIgData', { ig: targetIg })}</p>
        </div>
      )}

      {/* CMMI Assessment */}
      <GapCmmiGroup
        currentCmmi={currentCmmi}
        targetCmmi={targetCmmi}
        onChange={onCmmiChange}
        minCurrentLevel={minCurrentLevel}
      />

      {/* Notes */}
      <GapNoteEditor
        itemId={safeguard.id}
        itemType="safeguard"
        initialContent={note}
        onSave={onSaveNote}
      />
    </div>
  );
}
