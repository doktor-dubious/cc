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
  showFinalize?: boolean;
  // Optional per-safeguard inline badge (e.g. "€450K" financial-exposure pre-view).
  safeguardBadges?: Record<string, string>;
  // Optional 0–100 Financial Relevance Score (rendered as a colored pill,
  // comparable to the Risk Relevance Score from structural-risk-profile).
  financialRelevance?: Record<string, number>;
  // Optional: safeguards to fully hide (not just dim). A control whose every
  // safeguard is hidden is itself omitted. Used by the Roadmap to show only
  // the subset of safeguards with a maturity gap.
  hiddenSafeguards?: Set<string>;
};

// Color tier for a 0–100 relevance score. Mirrors the Risk Relevance
// convention used in structural-risk-profile/detailed.
function relevanceTier(score: number): string {
  if (score >= 80) return 'text-red-600 dark:text-red-400 bg-red-500/10';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10';
  if (score >= 40) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
  return 'text-muted-foreground bg-muted/40';
}

export function GapCatalog({
  currentItem,
  expandedControlId,
  inactiveControls,
  inactiveSafeguards,
  onSelectControl,
  onSelectSafeguard,
  onToggleExpand,
  onSelectSummary,
  showFinalize = true,
  safeguardBadges,
  financialRelevance,
  hiddenSafeguards,
}: GapCatalogProps) {
  const t = useTranslations('GapReport');

  // A safeguard is hidden when it's in the hiddenSafeguards set. A control is
  // hidden when all of its safeguards are hidden (so empty controls vanish).
  const isSafeguardHidden = (id: string) => hiddenSafeguards?.has(id) ?? false;
  const isControlHidden = (control: typeof CIS_CONTROLS[number]) =>
    !!hiddenSafeguards && control.safeguards.every((s) => hiddenSafeguards.has(s.id));

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
          if (isControlHidden(control)) return null;

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
                <span className="truncate min-w-0">{control.title}</span>
              </div>

              {/* Safeguards */}
              {isExpanded && (
                <div className="ml-4">
                  {control.safeguards.map((safeguard) => {
                    if (isSafeguardHidden(safeguard.id)) return null;

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
                        <span className="truncate text-xs min-w-0">{safeguard.title}</span>
                        <span className="ml-auto shrink-0 flex items-center gap-1.5">
                          {safeguardBadges?.[safeguard.id] && (
                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                              {safeguardBadges[safeguard.id]}
                            </span>
                          )}
                          {financialRelevance?.[safeguard.id] !== undefined && (
                            <span
                              title={`Financial Relevance: ${financialRelevance[safeguard.id]}%`}
                              className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${relevanceTier(financialRelevance[safeguard.id])}`}
                            >
                              {financialRelevance[safeguard.id]}
                            </span>
                          )}
                        </span>
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
      {showFinalize && (
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
      )}
    </div>
  );
}
