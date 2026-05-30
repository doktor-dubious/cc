'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/context/OrganizationContext';
import { CIS_CONTROLS, getControlById, type CISControl, type Safeguard } from '@/lib/constants/cis-controls';
import { GapCatalog, GapNoteEditor } from '@/components/gap-report';
import { calculateConcDowntimeCosts, type ConcInputs, type ConcResult } from '@/lib/conc/conc-calculator';
import { calculateBreachLikelihood } from '@/lib/conc/breach-likelihood-calculator';
import { calculateSafeguardImpact, type SafeguardImpact } from '@/lib/conc/safeguard-impact-calculator';
import {
  buildSpectrumInputs,
  calculateSafeguardExposureSpectrum,
} from '@/lib/conc/safeguard-exposure-spectrum';

type Classification = 'include' | 'maybe' | 'exclude';
type Filter = 'all' | 'include' | 'maybe' | 'exclude';

type CurrentItem = {
  type: 'control' | 'safeguard';
  controlId: number;
  safeguardId?: string;
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all',      label: 'All' },
  { value: 'include',  label: 'Included' },
  { value: 'maybe',    label: 'Maybe' },
  { value: 'exclude',  label: 'Exclude' },
];

const CLASSIFICATIONS: { value: Classification; label: string }[] = [
  { value: 'include',  label: 'Include' },
  { value: 'maybe',    label: 'Maybe' },
  { value: 'exclude',  label: 'Exclude' },
];

export default function GapDefinitionPage() {
  const { activeOrganization } = useOrganization();
  const [classifications, setClassifications] = useState<Record<string, Classification>>({});
  const [cmmiMap, setCmmiMap] = useState<Record<string, number>>({});
  // Risk Relevance Score per safeguard, sourced from /api/gap-recommendation
  // (same engine as /risk-foundation/structural-risk-profile/detailed).
  const [riskRelevance, setRiskRelevance] = useState<Record<string, number>>({});
  // Per-item notes, keyed by `${itemType}:${itemId}` (e.g. "safeguard:1.1",
  // "control:1"). Same shape as on /gap/analysis so the two pages share storage
  // through /api/cis-note.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [currentItem, setCurrentItem] = useState<CurrentItem>({ type: 'control', controlId: 1 });
  const [expandedControlId, setExpandedControlId] = useState(1);

  // Load classifications + per-safeguard CMMI for the active organization
  useEffect(() => {
    if (!activeOrganization?.id) {
      setClassifications({});
      setCmmiMap({});
      setNotes({});
      return;
    }
    let cancelled = false;

    fetch(`/api/safeguard-classification?organizationId=${activeOrganization.id}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        if (json.success) setClassifications(json.data ?? {});
      })
      .catch(() => { /* leave defaults */ });

    fetch(`/api/safeguard-cmmi?organizationId=${activeOrganization.id}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        if (!json.success) return;
        const raw = json.data as Record<string, { currentCmmi: number; targetCmmi: number }>;
        const out: Record<string, number> = {};
        for (const [sid, v] of Object.entries(raw)) out[sid] = v.currentCmmi || 1;
        setCmmiMap(out);
      })
      .catch(() => { /* leave defaults */ });

    // Notes — shared with /gap/analysis via /api/cis-note. Returns a
    // Record<`${itemType}:${itemId}`, string>.
    fetch(`/api/cis-note?organizationId=${activeOrganization.id}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        if (json.success) setNotes(json.data ?? {});
      })
      .catch(() => { /* leave defaults */ });

    // Risk Relevance from the recommendation engine.
    fetch(`/api/gap-recommendation?organizationId=${activeOrganization.id}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        if (!json.success) return;
        const out: Record<string, number> = {};
        for (const ctrl of json.data?.recommendation?.controls ?? []) {
          for (const sf of ctrl.safeguards ?? []) {
            if (typeof sf.relevanceScore === 'number') {
              out[sf.safeguardId] = sf.relevanceScore;
            }
          }
        }
        setRiskRelevance(out);
      })
      .catch(() => { /* leave defaults */ });

    return () => { cancelled = true; };
  }, [activeOrganization?.id]);

  // ── Per-Safeguard Financial Exposure: compute CONC + breach probability, then
  //    derive the marginal $-impact per safeguard so the GAP define UI can show
  //    a money-anchored prioritisation signal next to each safeguard.
  const impactMap = useMemo<Record<string, SafeguardImpact>>(() => {
    if (!activeOrganization) return {};

    const baseInputs: Omit<ConcInputs, 'cmmiValues' | 'overrideDowntimeDays'> = {
      naceSection:           activeOrganization.naceSection,
      revenueRange:          activeOrganization.revenueRange,
      businessDaysPerYear:   activeOrganization.businessDaysPerYear,
      manualOperation:       activeOrganization.manualOperation,
      productionDependency:  activeOrganization.productionDependency,
      customerAccess:        activeOrganization.customerAccess,
      orgSize:               activeOrganization.size,
      infrastructureTypes:   activeOrganization.infrastructureTypes ?? [],
      dataSensitivity:       activeOrganization.dataSensitivity ?? [],
      regulatoryObligations: activeOrganization.regulatoryObligations ?? [],
      geographicScope:       activeOrganization.geographicScope,
      businessOrientation:   activeOrganization.businessOrientation,
      revenueConcentration:  activeOrganization.revenueConcentration,
      entityType:            activeOrganization.entityType,
      previousBreachHistory: activeOrganization.previousBreachHistory,
    };

    const conc: ConcResult = calculateConcDowntimeCosts({ ...baseInputs, cmmiValues: cmmiMap });
    if (!conc.ok) return {};

    const bl = calculateBreachLikelihood({
      orgSize:                 activeOrganization.size,
      naceSection:             activeOrganization.naceSection,
      dataSensitivity:         activeOrganization.dataSensitivity ?? [],
      infrastructureTypes:     activeOrganization.infrastructureTypes ?? [],
      geographicScope:         activeOrganization.geographicScope,
      itSecurityStaff:         activeOrganization.itSecurityStaff,
      securityMaturity:        activeOrganization.securityMaturity,
      publicFacingServices:    activeOrganization.publicFacingServices,
      targetedAttackLikelihood:activeOrganization.targetedAttackLikelihood,
      supplyChainPosition:     activeOrganization.supplyChainPosition,
      remoteWorkforce:         activeOrganization.remoteWorkforce,
      previousBreachHistory:   activeOrganization.previousBreachHistory,
      cmmiValues:              cmmiMap,
    });
    const breachProbability = bl.ok ? bl.band.mid : undefined;

    const out: Record<string, SafeguardImpact> = {};
    for (const ctrl of CIS_CONTROLS) {
      for (const sg of ctrl.safeguards) {
        out[sg.id] = calculateSafeguardImpact(
          sg.id,
          cmmiMap[sg.id] ?? 1,
          conc.costs,
          breachProbability,
        );
      }
    }
    return out;
  }, [activeOrganization, cmmiMap]);

  const safeguardBadges = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [sid, imp] of Object.entries(impactMap)) {
      if (imp.avoidableLoss > 0) out[sid] = formatCompactMoney(imp.avoidableLoss);
    }
    return out;
  }, [impactMap]);

  // Financial Relevance Score (0–100), computed from the L1-anchored spectrum
  // so it's stable across the user's CMMI choices on this page. Comparable
  // with the Risk Relevance Score from /risk-foundation/structural-risk-profile.
  const financialRelevance = useMemo<Record<string, number>>(() => {
    if (!activeOrganization) return {};
    const { concBase, breachBase } = buildSpectrumInputs(activeOrganization);
    const result = calculateSafeguardExposureSpectrum(concBase, breachBase);
    if (!result.ok) return {};
    const out: Record<string, number> = {};
    for (const spec of result.spectrum.bySafeguard.values()) {
      out[spec.safeguardId] = spec.financialRelevance;
    }
    return out;
  }, [activeOrganization]);

  // Save a note (control or safeguard). Mirrors /gap/analysis so both pages
  // share storage through /api/cis-note; an empty trimmed content removes
  // the row server-side and the key locally.
  const saveNote = useCallback(
    async (itemId: string, itemType: 'control' | 'safeguard', content: string) => {
      if (!activeOrganization?.id) return;

      const res = await fetch('/api/cis-note', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: activeOrganization.id,
          itemId,
          itemType,
          content,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const key = `${itemType}:${itemId}`;
        setNotes(prev => {
          if (content.trim() === '') {
            const next = { ...prev };
            delete next[key];
            return next;
          }
          return { ...prev, [key]: content };
        });
      } else {
        throw new Error(data.error || 'Failed to save note');
      }
    },
    [activeOrganization?.id],
  );

  const getClassification = useCallback(
    (safeguardId: string): Classification | undefined => classifications[safeguardId],
    [classifications],
  );

  // Optimistic update + PUT. On failure, revert to the previous value.
  const setClassification = (safeguardId: string, c: Classification) => {
    if (!activeOrganization?.id) return;
    const prev = classifications[safeguardId];
    setClassifications(p => ({ ...p, [safeguardId]: c }));
    fetch('/api/safeguard-classification', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: activeOrganization.id,
        safeguardId,
        classification: c,
      }),
    })
      .then(res => res.json())
      .then(json => {
        if (!json.success) {
          setClassifications(p => {
            const next = { ...p };
            if (prev === undefined) delete next[safeguardId];
            else next[safeguardId] = prev;
            return next;
          });
        }
      })
      .catch(() => {
        setClassifications(p => {
          const next = { ...p };
          if (prev === undefined) delete next[safeguardId];
          else next[safeguardId] = prev;
          return next;
        });
      });
  };

  const counts = useMemo(() => {
    let include = 0, maybe = 0, exclude = 0;
    for (const ctrl of CIS_CONTROLS) {
      for (const sg of ctrl.safeguards) {
        const c = getClassification(sg.id);
        if      (c === 'include') include++;
        else if (c === 'maybe')   maybe++;
        else if (c === 'exclude') exclude++;
      }
    }
    return { include, maybe, exclude };
  }, [getClassification]);

  // Safeguards that DON'T match the current filter — dimmed in catalog, skipped in navigation.
  const filteredOutSafeguards = useMemo(() => {
    const set = new Set<string>();
    if (filter === 'all') return set;
    for (const ctrl of CIS_CONTROLS) {
      for (const sg of ctrl.safeguards) {
        if (getClassification(sg.id) !== filter) set.add(sg.id);
      }
    }
    return set;
  }, [filter, getClassification]);

  const navigationSequence = useMemo(() => {
    const items: CurrentItem[] = [];
    for (const ctrl of CIS_CONTROLS) {
      items.push({ type: 'control', controlId: ctrl.id });
      for (const sg of ctrl.safeguards) {
        if (!filteredOutSafeguards.has(sg.id)) {
          items.push({ type: 'safeguard', controlId: ctrl.id, safeguardId: sg.id });
        }
      }
    }
    return items;
  }, [filteredOutSafeguards]);

  const currentIndex = useMemo(() => {
    return navigationSequence.findIndex(item => {
      if (item.type === 'control' && currentItem.type === 'control') {
        return item.controlId === currentItem.controlId;
      }
      if (item.type === 'safeguard' && currentItem.type === 'safeguard') {
        return item.safeguardId === currentItem.safeguardId;
      }
      return false;
    });
  }, [navigationSequence, currentItem]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prev = navigationSequence[currentIndex - 1];
      setCurrentItem(prev);
      setExpandedControlId(prev.controlId);
    }
  }, [currentIndex, navigationSequence]);

  const goToNext = useCallback(() => {
    if (currentIndex < navigationSequence.length - 1) {
      const next = navigationSequence[currentIndex + 1];
      setCurrentItem(next);
      setExpandedControlId(next.controlId);
    }
  }, [currentIndex, navigationSequence]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft')  goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goToPrevious, goToNext]);

  const currentControl = getControlById(currentItem.controlId);
  const currentSafeguard =
    currentItem.type === 'safeguard' && currentItem.safeguardId
      ? currentControl?.safeguards.find(s => s.id === currentItem.safeguardId)
      : null;

  return (
    <div className="bg-background">
      <div className="flex">
        {/* Main content (70%) */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">

            {/* Title + intro + navigation */}
            <div>
              <div className="flex items-start justify-between gap-6 mb-2">
                <h1 className="text-2xl font-bold tracking-tight">Define Scope</h1>

                <div className="flex items-center gap-2 shrink-0 select-none">
                  {currentSafeguard && (
                    <>
                      {CLASSIFICATIONS.map(({ value, label }) => (
                        <Button
                          key={value}
                          variant={getClassification(currentSafeguard.id) === value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setClassification(currentSafeguard.id, value)}
                          className="cursor-pointer"
                        >
                          {label}
                        </Button>
                      ))}
                      <span className="mx-1 text-muted-foreground" aria-hidden>•</span>
                    </>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevious}
                    disabled={currentIndex <= 0}
                    className="cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNext}
                    disabled={currentIndex >= navigationSequence.length - 1}
                    className="cursor-pointer"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
              <p className="text-muted-foreground">
                Select safeguards to include in the GAP analysis
              </p>
            </div>

            {/* Current slide */}
            {currentItem.type === 'control' && currentControl && (
              <ControlView
                control={currentControl}
                note={notes[`control:${currentControl.id}`] || ''}
                onSaveNote={(content) => saveNote(String(currentControl.id), 'control', content)}
              />
            )}
            {currentSafeguard && currentControl && (
              <SafeguardView
                control={currentControl}
                safeguard={currentSafeguard}
                impact={impactMap[currentSafeguard.id]}
                riskRelevance={riskRelevance[currentSafeguard.id]}
                financialRelevance={financialRelevance[currentSafeguard.id]}
                note={notes[`safeguard:${currentSafeguard.id}`] || ''}
                onSaveNote={(content) => saveNote(currentSafeguard.id, 'safeguard', content)}
              />
            )}
          </div>
        </div>

        {/* Catalog (30%) */}
        <div className="w-80 shrink-0">
          {/* Counts */}
          <div className="flex items-center justify-between px-3 py-2 border-l border-b border-muted-foreground bg-muted/50 text-xs">
            <span>
              <span className="text-muted-foreground">Include:</span>{' '}
              <span className="font-semibold">{counts.include}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Maybe:</span>{' '}
              <span className="font-semibold">{counts.maybe}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Excluded:</span>{' '}
              <span className="font-semibold">{counts.exclude}</span>
            </span>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1 p-2 border-l border-b border-muted-foreground bg-muted/50">
            {FILTERS.map(({ value, label }) => (
              <Button
                key={value}
                variant={filter === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(value)}
                className="cursor-pointer flex-1 h-7 px-2 text-xs"
              >
                {label}
              </Button>
            ))}
          </div>
          <GapCatalog
            currentItem={currentItem}
            expandedControlId={expandedControlId}
            inactiveControls={new Set()}
            inactiveSafeguards={filteredOutSafeguards}
            onSelectControl={id => {
              setCurrentItem({ type: 'control', controlId: id });
              setExpandedControlId(id);
            }}
            onSelectSafeguard={(cId, sId) => {
              setCurrentItem({ type: 'safeguard', controlId: cId, safeguardId: sId });
              setExpandedControlId(cId);
            }}
            onToggleExpand={id => setExpandedControlId(prev => (prev === id ? 0 : id))}
            onSelectSummary={() => {}}
            showFinalize={false}
            safeguardBadges={safeguardBadges}
            financialRelevance={financialRelevance}
          />
        </div>
      </div>
    </div>
  );
}

function ControlView({
  control,
  note,
  onSaveNote,
}: {
  control: CISControl;
  note: string;
  onSaveNote: (content: string) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">
          Control {control.id}: {control.title}
        </h2>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          Definition
        </p>
        <p className="text-sm leading-relaxed">{control.definition}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          Purpose
        </p>
        <p className="text-sm leading-relaxed">{control.purpose}</p>
      </div>

      <GapNoteEditor
        itemId={String(control.id)}
        itemType="control"
        initialContent={note}
        onSave={onSaveNote}
      />
    </div>
  );
}

function SafeguardView({
  control,
  safeguard,
  impact,
  riskRelevance,
  financialRelevance,
  note,
  onSaveNote,
}: {
  control: CISControl;
  safeguard: Safeguard;
  impact?: SafeguardImpact;
  riskRelevance?: number;
  financialRelevance?: number;
  note: string;
  onSaveNote: (content: string) => Promise<void>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-1">
          Control {control.id}: {control.title}
        </p>
        <h2 className="text-2xl font-semibold">
          {safeguard.id}: {safeguard.title}
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Definition
          </p>
          <p className="text-sm leading-relaxed">{safeguard.definition}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Purpose
          </p>
          <p className="text-sm leading-relaxed">{safeguard.purpose}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Why
          </p>
          <p className="text-sm leading-relaxed">{safeguard.why}</p>
        </div>
      </div>

      {/* Risk Relevance panel — sourced from the same recommendation engine
          as /risk-foundation/structural-risk-profile/detailed. */}
      {typeof riskRelevance === 'number' && (
        <div className="border rounded-lg bg-muted/20 p-4">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Risk relevance
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Structural relevance to this organization's business model, IT dependency, and regulatory exposure.
              </p>
            </div>
            <p className={`text-2xl font-semibold tabular-nums ${riskRelevanceColor(riskRelevance)}`}>
              {riskRelevance}%
            </p>
          </div>
        </div>
      )}

      {/* Per-Safeguard Financial Exposure panel — theoretical $ impact of
          this safeguard failing during an incident. */}
      {impact && impact.avoidableLoss > 0 && (
        <div className="border rounded-lg bg-muted/20 p-4 space-y-3">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Financial impact
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                If non-compliant at current maturity (L{impact.currentCmmi}) when an incident occurs.
              </p>
            </div>
            <div className="text-right shrink-0 flex items-center gap-3">
              <div>
                <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                  {formatCompactMoney(impact.avoidableLoss)}
                </p>
                {impact.annualizedExpectedLoss !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {formatCompactMoney(impact.annualizedExpectedLoss)} / year (ALE)
                  </p>
                )}
              </div>
              {typeof financialRelevance === 'number' && (
                <span
                  title={`Financial Relevance Score: ${financialRelevance}/100 — comparable to Risk Relevance`}
                  className={`text-sm font-semibold tabular-nums px-2 py-1 rounded ${financialRelevanceTier(financialRelevance)}`}
                >
                  {financialRelevance}
                </span>
              )}
            </div>
          </div>

          {Object.keys(impact.categoryBreakdown).length > 0 && (
            <div className="space-y-1.5 pt-3 border-t">
              {Object.entries(impact.categoryBreakdown)
                .filter(([, v]) => (v as number) > 0)
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .slice(0, 5)
                .map(([cat, v]) => (
                  <div key={cat} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground capitalize">
                      {COST_CATEGORY_LABEL[cat] ?? cat}
                    </span>
                    <span className="tabular-nums">{formatCompactMoney(v as number)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <GapNoteEditor
        itemId={safeguard.id}
        itemType="safeguard"
        initialContent={note}
        onSave={onSaveNote}
      />
    </div>
  );
}

const COST_CATEGORY_LABEL: Record<string, string> = {
  downtime:     'Operational downtime',
  ir:           'Incident response',
  restore:      'Restore / recovery',
  ebi:          'Extended business impact',
  ccl:          'Customer churn',
  reg:          'Regulatory cost',
  reputation:   'Reputation damage',
  governance:   'Management & governance',
  notification: 'Breach notification',
};

// Matches the color convention from
// /risk-foundation/structural-risk-profile/detailed where the score originates.
// (≥80 = green, ≥50 = yellow, <50 = red — "is this relevant to my org?")
function riskRelevanceColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 50) return 'text-yellow-500';
  return 'text-red-500';
}

// Same tier mapping as the catalog pill in GapCatalog (high = attention).
function financialRelevanceTier(score: number): string {
  if (score >= 80) return 'text-red-600 dark:text-red-400 bg-red-500/10';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10';
  if (score >= 40) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
  return 'text-muted-foreground bg-muted/40';
}

function formatCompactMoney(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '€0';
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 10_000)    return `€${Math.round(value / 1_000)}K`;
  if (value >= 1_000)     return `€${(value / 1_000).toFixed(1)}K`;
  return `€${Math.round(value)}`;
}
