'use client';

import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import { GapIgSelector } from './GapIgSelector';
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

  const getEffectiveIg = (safeguardId: string): number => {
    return safeguardIgOverrides[safeguardId] ?? organizationIg;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {t('labels.control')} {control.id}: {control.title}
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-muted-foreground">{t('labels.active')}</span>
          <Switch
            checked={isActive}
            onCheckedChange={onToggleActive}
          />
        </div>
      </div>

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

      {/* Safeguards Table */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          {t('labels.safeguards')} ({control.safeguards.length})
        </p>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">{t('tableColumns.id')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('tableColumns.title')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('tableColumns.ig')}</th>
                <th className="text-left p-3 text-sm font-medium">{t('tableColumns.active')}</th>
              </tr>
            </thead>
            <tbody>
              {control.safeguards.map((safeguard) => {
                const isInactive = inactiveSafeguards.has(safeguard.id);
                const effectiveIg = getEffectiveIg(safeguard.id);

                return (
                  <tr
                    key={safeguard.id}
                    className={`border-t hover:bg-muted/50 cursor-pointer ${isInactive ? 'opacity-50' : ''}`}
                    onClick={() => onSafeguardClick(safeguard)}
                  >
                    <td className="p-3 text-sm font-mono">{safeguard.id}</td>
                    <td className="p-3 text-sm">{safeguard.title}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <GapIgSelector
                        value={effectiveIg}
                        onChange={(ig) => onSafeguardIgChange(safeguard.id, ig)}
                      />
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <Switch
                        checked={!isInactive}
                        onCheckedChange={() => onToggleSafeguardActive(safeguard.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
