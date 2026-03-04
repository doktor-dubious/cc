'use client';

import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { GapIgSelector } from './GapIgSelector';
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

  const igKey = `ig${effectiveIg}` as IgKey;
  const igData = safeguard[igKey];
  const hasIgData = igData.scope && igData.scope !== 'N/A';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            {t('labels.control')} {controlId}: {controlTitle}
          </p>
          <h1 className="text-2xl font-semibold">
            {safeguard.id}: {safeguard.title}
          </h1>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <GapIgSelector value={effectiveIg} onChange={onIgChange} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('labels.active')}</span>
            <Switch
              checked={isActive}
              onCheckedChange={onToggleActive}
            />
          </div>
        </div>
      </div>

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

      {/* IG-Specific Details */}
      {hasIgData ? (
        <div className="border rounded-lg bg-muted/20 p-4 space-y-4">
          <h3 className="font-medium">
            {t('labels.igDetails', { ig: effectiveIg })}
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
      ) : (
        <div className="border rounded-lg bg-muted/20 p-4 text-center text-muted-foreground">
          <p>{t('messages.noIgData', { ig: effectiveIg })}</p>
        </div>
      )}

      {/* CMMI Assessment */}
      <GapCmmiGroup
        currentCmmi={currentCmmi}
        targetCmmi={targetCmmi}
        onChange={onCmmiChange}
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
