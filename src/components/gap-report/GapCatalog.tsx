'use client';

import { useTranslations } from 'next-intl';
import { ChevronRight, ChevronDown, CheckSquare } from 'lucide-react';
import { CIS_CONTROLS } from '@/lib/constants/cis-controls';

type CurrentItem = {
  type: 'control' | 'safeguard' | 'summary';
  controlId: number;
  safeguardId?: string;
};

type GapCatalogProps = {
  currentItem: CurrentItem;
  expandedControlId: number;
  inactiveControls: Set<number>;
  inactiveSafeguards: Set<string>;
  onSelectControl: (controlId: number) => void;
  onSelectSafeguard: (controlId: number, safeguardId: string) => void;
  onToggleExpand: (controlId: number) => void;
  onSelectSummary: () => void;
};

export function GapCatalog({
  currentItem,
  expandedControlId,
  inactiveControls,
  inactiveSafeguards,
  onSelectControl,
  onSelectSafeguard,
  onToggleExpand,
  onSelectSummary,
}: GapCatalogProps) {
  const t = useTranslations('GapReport');

  const isControlSelected = (controlId: number) =>
    currentItem.type === 'control' && currentItem.controlId === controlId;

  const isSafeguardSelected = (safeguardId: string) =>
    currentItem.type === 'safeguard' && currentItem.safeguardId === safeguardId;

  return (
    <div className="h-full overflow-y-auto border-l border-muted-foreground">
      <div className="p-4 border-b bg-muted/50">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('catalog.title')}</p>
      </div>

      <div className="py-2 pr-2">
        {CIS_CONTROLS.map((control) => {
          const isInactive = inactiveControls.has(control.id);
          const isExpanded = expandedControlId === control.id;
          const isSelected = isControlSelected(control.id);

          return (
            <div key={control.id} className="relative">
              {/* Control Row */}
              <div
                className={`
                  relative flex items-center gap-2 pl-4 pr-2 py-1.5 cursor-pointer text-sm
                  border-l-2 transition-colors
                  ${isSelected
                    ? 'border-l-primary text-foreground font-medium'
                    : 'border-l-transparent hover:border-l-muted-foreground/30 text-muted-foreground hover:text-foreground'}
                  ${isInactive && !isSelected ? 'opacity-50' : ''}
                `}
                onClick={() => onSelectControl(control.id)}
              >
                <button
                  className="p-0.5 hover:bg-muted rounded shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(control.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
                <span className="truncate">{control.title}</span>
              </div>

              {/* Safeguards */}
              {isExpanded && (
                <div className="ml-4">
                  {control.safeguards.map((safeguard) => {
                    const isSgInactive = inactiveSafeguards.has(safeguard.id);
                    const isSgSelected = isSafeguardSelected(safeguard.id);

                    return (
                      <div
                        key={safeguard.id}
                        className={`
                          relative flex items-center gap-2 pl-6 pr-2 py-1 cursor-pointer text-sm
                          border-l-2 transition-colors
                          ${isSgSelected
                            ? 'border-l-primary text-foreground font-medium'
                            : 'border-l-transparent hover:border-l-muted-foreground/30 text-muted-foreground hover:text-foreground'}
                          ${isSgInactive && !isSgSelected ? 'opacity-50' : ''}
                        `}
                        onClick={() => onSelectSafeguard(control.id, safeguard.id)}
                      >
                        <span className="font-mono text-xs shrink-0 text-muted-foreground">{safeguard.id}</span>
                        <span className="truncate text-xs">{safeguard.title}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Finalize row */}
      <div className="border-t border-muted-foreground/30 mt-2 pt-2 pb-2 px-2">
        <div
          className={`
            flex items-center gap-2 pl-4 pr-2 py-1.5 cursor-pointer text-sm rounded
            border-l-2 transition-colors
            ${currentItem.type === 'summary'
              ? 'border-l-primary text-foreground font-medium'
              : 'border-l-transparent hover:border-l-muted-foreground/30 text-muted-foreground hover:text-foreground'}
          `}
          onClick={onSelectSummary}
        >
          <CheckSquare className="w-3.5 h-3.5 shrink-0" />
          <span>{t('catalog.finalize')}</span>
        </div>
      </div>
    </div>
  );
}
