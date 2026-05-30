'use client';

import { useTranslations } from 'next-intl';
import { GapNoteEditor } from './GapNoteEditor';
import type { CISControl, Safeguard } from '@/lib/constants/cis-controls';

type GapControlSlideProps = {
  control: CISControl;
  isActive: boolean;
  onToggleActive: (active: boolean) => void;
  note: string;
  onSaveNote: (content: string) => Promise<void>;
  safeguardIgOverrides: Record<string, number>;
  organizationIg: number;
  inactiveSafeguards: Set<string>;
  onSafeguardClick: (safeguard: Safeguard) => void;
  onSafeguardIgChange: (safeguardId: string, ig: number) => void;
  onToggleSafeguardActive: (safeguardId: string) => void;
};

export function GapControlSlide({
  control,
  isActive,
  onToggleActive,
  note,
  onSaveNote,
  safeguardIgOverrides,
  organizationIg,
  inactiveSafeguards,
  onSafeguardClick,
  onSafeguardIgChange,
  onToggleSafeguardActive,
}: GapControlSlideProps) {
  const t = useTranslations('GapReport');

  return (
    <div className="space-y-6">
      {/* Header — control name only; the "Control N:" prefix is rendered by the page next to the navigation buttons. */}
      <h1 className="text-2xl font-semibold">{control.title}</h1>

      {/* Definition & Purpose */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {t('labels.definition')}
          </p>
          <p className="text-sm leading-relaxed">{control.definition}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {t('labels.purpose')}
          </p>
          <p className="text-sm leading-relaxed">{control.purpose}</p>
        </div>
      </div>

      {/* Notes */}
      <GapNoteEditor
        itemId={String(control.id)}
        itemType="control"
        initialContent={note}
        onSave={onSaveNote}
      />
    </div>
  );
}
