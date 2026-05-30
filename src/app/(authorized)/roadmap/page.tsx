'use client';

// /roadmap — Advisor-facing maturity roadmap.
//
// Only reachable once the org has at least one finalized GAP report (the
// sidebar hides the entry otherwise; this page also guards directly for a
// deep-link visit). The roadmap lists every active safeguard whose finalized
// target CMMI exceeds its current CMMI — i.e. the ones with something to
// improve — using the same right-hand catalog index as GAP Definition/Analysis.
//
// For the selected safeguard we show: its title/definition, the maturity step,
// AI-generated context insights (lazy + cached server-side), the advisor notes
// captured during GAP definition, and an advisor-decision form whose fields
// autosave to /api/roadmap.

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useOrganization } from '@/context/OrganizationContext';
import { CIS_CONTROLS, getControlById, type CISControl, type Safeguard } from '@/lib/constants/cis-controls';
import { GapCatalog } from '@/components/gap-report';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  buildSpectrumInputs,
  calculateSafeguardExposureSpectrum,
  type CmmiLevel,
  type SafeguardSpectrum,
} from '@/lib/conc/safeguard-exposure-spectrum';
import type { RoadmapItemDto } from '@/app/api/roadmap/route';

type CurrentItem = { type: 'control' | 'safeguard'; controlId: number; safeguardId?: string };

type ViewMode = 'control' | 'impact' | 'roadmap';

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'control', label: 'Control' },
  { value: 'impact',  label: 'Impact'  },
  { value: 'roadmap', label: 'Roadmap' },
];

// One flat-list row: a roadmap safeguard with its computed worth and phase.
type RoadmapRow = {
  controlId: number;
  safeguard: Safeguard;
  worth:     number | null;
  phase:     number | null;
};

// current/target CMMI taken from the latest finalized GAP report snapshot.
type ReportCmmi = { currentCmmi: number; targetCmmi: number };

// Clamp an arbitrary CMMI number into the 1–5 band the spectrum is keyed on.
const asLevel = (n: number): CmmiLevel => Math.min(5, Math.max(1, Math.round(n))) as CmmiLevel;

function formatMoney(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '€0';
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 10_000)    return `€${Math.round(value / 1_000)}K`;
  if (value >= 1_000)     return `€${(value / 1_000).toFixed(1)}K`;
  return `€${Math.round(value)}`;
}

// Annual expected loss avoided by moving a safeguard from `current` to `target`
// maturity. Prefers the probability-weighted ALE basis; falls back to the
// loss-given-event ("avoidable") basis when no breach-probability is available.
function maturityGainValue(spec: SafeguardSpectrum | undefined, current: number, target: number):
  { amount: number; perYear: boolean } | null {
  if (!spec || target <= current) return null;
  const c = asLevel(current);
  const t = asLevel(target);

  const aleC = spec.aleByLevel[c];
  const aleT = spec.aleByLevel[t];
  if (aleC !== null && aleC !== undefined && aleT !== null && aleT !== undefined) {
    const amount = aleC - aleT;
    return amount > 0 ? { amount, perYear: true } : null;
  }

  const avC = spec.avoidableByLevel[c];
  const avT = spec.avoidableByLevel[t];
  if (avC !== undefined && avT !== undefined) {
    const amount = avC - avT;
    return amount > 0 ? { amount, perYear: false } : null;
  }
  return null;
}

const EFFORT_OPTIONS = [
  { value: 'LOW',    label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH',   label: 'High' },
] as const;

const OWNER_OPTIONS = [
  { value: 'IT',                  label: 'IT' },
  { value: 'MANAGEMENT',          label: 'Management' },
  { value: 'OPERATIONS',          label: 'Operations' },
  { value: 'SECURITY_COMPLIANCE', label: 'Security / Compliance' },
  { value: 'EXTERNAL_VENDOR',     label: 'External Vendor' },
] as const;

export default function RoadmapPage() {
  const { activeOrganization } = useOrganization();

  const [reportCmmi,  setReportCmmi]  = useState<Record<string, ReportCmmi>>({});
  const [hasReport,   setHasReport]   = useState<boolean | null>(null); // null = loading
  const [notes,       setNotes]       = useState<Record<string, string>>({});
  const [items,       setItems]       = useState<Record<string, RoadmapItemDto>>({});
  const [isLoading,   setIsLoading]   = useState(true);

  const [currentItem,       setCurrentItem]       = useState<CurrentItem>({ type: 'control', controlId: 1 });
  const [expandedControlId, setExpandedControlId] = useState(1);

  // Right-index view: controls tree, or a flat safeguard list sorted by worth
  // ('impact') or by assigned phase ('roadmap').
  const [viewMode, setViewMode] = useState<ViewMode>('control');

  // ── Load everything for the active organization ──────────────────────────
  useEffect(() => {
    const orgId = activeOrganization?.id;
    if (!orgId) {
      setReportCmmi({}); setHasReport(null); setNotes({}); setItems({}); setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);

    const reportP = fetch(`/api/gap-report?organizationId=${orgId}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled || !json.success) return;
        const rows = Array.isArray(json.data) ? json.data : [];
        if (rows.length === 0) { setHasReport(false); setReportCmmi({}); return; }
        setHasReport(true);
        const latest = rows[0];
        const map: Record<string, ReportCmmi> = {};
        for (const r of latest.cmmiValues ?? []) {
          map[r.safeguardId] = { currentCmmi: r.currentCmmi, targetCmmi: r.targetCmmi };
        }
        setReportCmmi(map);
      })
      .catch(() => { if (!cancelled) setHasReport(false); });

    const notesP = fetch(`/api/cis-note?organizationId=${orgId}`)
      .then(r => r.json())
      .then(json => { if (!cancelled && json.success) setNotes(json.data ?? {}); })
      .catch(() => {});

    const itemsP = fetch(`/api/roadmap?organizationId=${orgId}`)
      .then(r => r.json())
      .then(json => { if (!cancelled && json.success) setItems(json.data ?? {}); })
      .catch(() => {});

    Promise.allSettled([reportP, notesP, itemsP]).then(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [activeOrganization?.id]);

  // ── Roadmap = active safeguards with a positive gap in the finalized report ─
  const roadmapSafeguardIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [sid, v] of Object.entries(reportCmmi)) {
      if (v.targetCmmi > v.currentCmmi) ids.add(sid);
    }
    return ids;
  }, [reportCmmi]);

  // Per-safeguard exposure spectrum (avoidable + ALE at each CMMI level),
  // computed once from the org's base inputs. Used to value each maturity step.
  const spectrumBySafeguard = useMemo<Map<string, SafeguardSpectrum>>(() => {
    if (!activeOrganization) return new Map();
    const { concBase, breachBase } = buildSpectrumInputs(activeOrganization);
    const result = calculateSafeguardExposureSpectrum(concBase, breachBase);
    return result.ok ? result.spectrum.bySafeguard : new Map();
  }, [activeOrganization]);

  // Everything NOT on the roadmap is hidden from the catalog.
  const hiddenSafeguards = useMemo(() => {
    const hidden = new Set<string>();
    for (const ctrl of CIS_CONTROLS) {
      for (const sg of ctrl.safeguards) {
        if (!roadmapSafeguardIds.has(sg.id)) hidden.add(sg.id);
      }
    }
    return hidden;
  }, [roadmapSafeguardIds]);

  // Flat rows for the Impact / Roadmap views: each roadmap safeguard with its
  // computed worth (ALE avoided current→target) and advisor-assigned phase.
  // Recomputes as the advisor edits targets/phases so the ordering stays live.
  const roadmapRows = useMemo<RoadmapRow[]>(() => {
    const rows: RoadmapRow[] = [];
    for (const ctrl of CIS_CONTROLS) {
      for (const sg of ctrl.safeguards) {
        if (!roadmapSafeguardIds.has(sg.id)) continue;
        const rc      = reportCmmi[sg.id];
        const it      = items[sg.id];
        const current = rc?.currentCmmi ?? 1;
        const target  = it?.targetCmmi ?? rc?.targetCmmi ?? current + 1;
        const gain    = maturityGainValue(spectrumBySafeguard.get(sg.id), current, target);
        rows.push({ controlId: ctrl.id, safeguard: sg, worth: gain?.amount ?? null, phase: it?.phase ?? null });
      }
    }
    return rows;
  }, [roadmapSafeguardIds, reportCmmi, items, spectrumBySafeguard]);

  const sortedRows = useMemo<RoadmapRow[]>(() => {
    const rows = [...roadmapRows];
    if (viewMode === 'impact') {
      // Highest worth first; unknown worth sinks to the bottom.
      rows.sort((a, b) => (b.worth ?? -Infinity) - (a.worth ?? -Infinity));
    } else if (viewMode === 'roadmap') {
      // Phase 1 first; unassigned phase last, then by worth desc within a phase.
      rows.sort((a, b) => {
        const pa = a.phase ?? Infinity;
        const pb = b.phase ?? Infinity;
        if (pa !== pb) return pa - pb;
        return (b.worth ?? -Infinity) - (a.worth ?? -Infinity);
      });
    }
    return rows;
  }, [roadmapRows, viewMode]);

  // Once the data is in, land on the first roadmap safeguard.
  useEffect(() => {
    if (roadmapSafeguardIds.size === 0) return;
    for (const ctrl of CIS_CONTROLS) {
      const first = ctrl.safeguards.find(s => roadmapSafeguardIds.has(s.id));
      if (first) {
        setCurrentItem({ type: 'safeguard', controlId: ctrl.id, safeguardId: first.id });
        setExpandedControlId(ctrl.id);
        return;
      }
    }
  }, [roadmapSafeguardIds]);

  const updateItem = useCallback((safeguardId: string, patch: Partial<RoadmapItemDto>) => {
    setItems(prev => ({
      ...prev,
      [safeguardId]: { ...(prev[safeguardId] ?? { safeguardId } as RoadmapItemDto), ...patch },
    }));
  }, []);

  // ── Render guards ─────────────────────────────────────────────────────────
  if (!activeOrganization) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-muted-foreground">Select an organization to continue.</p>
      </div>
    );
  }

  if (isLoading || hasReport === null) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Roadmap</h1>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!hasReport) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Roadmap</h1>
        <div className="rounded-xl border bg-panel p-6 text-sm text-muted-foreground">
          The roadmap becomes available once you finalize a GAP report. Complete and finalize one in{' '}
          <Link href="/gap/report" className="underline underline-offset-2 hover:text-foreground">
            GAP Report
          </Link>
          {' '}first.
        </div>
      </div>
    );
  }

  if (roadmapSafeguardIds.size === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Roadmap</h1>
        <div className="rounded-xl border bg-panel p-6 text-sm text-muted-foreground">
          No maturity gaps to plan — every active safeguard in the finalized GAP report is already at
          or above its target CMMI level.
        </div>
      </div>
    );
  }

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
          <div className="max-w-4xl mx-auto">
            <div className="mb-4">
              <h1 className="text-2xl font-bold tracking-tight">Roadmap</h1>
              <p className="text-muted-foreground mt-1">
                Plan how to close each maturity gap from the finalized GAP report.
              </p>
            </div>

            {currentSafeguard && currentControl ? (
              <SafeguardRoadmap
                key={currentSafeguard.id}
                organizationId={activeOrganization.id}
                sector={activeOrganization.naceSection ?? null}
                size={activeOrganization.size ?? null}
                control={currentControl}
                safeguard={currentSafeguard}
                reportCmmi={reportCmmi[currentSafeguard.id]}
                spectrum={spectrumBySafeguard.get(currentSafeguard.id)}
                note={notes[`safeguard:${currentSafeguard.id}`] || ''}
                item={items[currentSafeguard.id]}
                onItemChange={(patch) => updateItem(currentSafeguard.id, patch)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a safeguard from the index to plan its maturity step.
              </p>
            )}
          </div>
        </div>

        {/* Catalog index (30%) — only roadmap safeguards are shown */}
        <div className="w-80 shrink-0">
          {/* View toggle (mirrors the All/Included bar on /gap/definition) */}
          <div className="flex items-center gap-1 p-2 border-l border-b border-muted-foreground bg-muted/50">
            {VIEW_OPTIONS.map(({ value, label }) => (
              <Button
                key={value}
                variant={viewMode === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode(value)}
                className="cursor-pointer flex-1 h-7 px-2 text-xs"
              >
                {label}
              </Button>
            ))}
          </div>

          {viewMode === 'control' ? (
            <GapCatalog
              currentItem={currentItem}
              expandedControlId={expandedControlId}
              inactiveControls={new Set()}
              inactiveSafeguards={new Set()}
              hiddenSafeguards={hiddenSafeguards}
              showFinalize={false}
              onSelectControl={(id) => { setCurrentItem({ type: 'control', controlId: id }); setExpandedControlId(id); }}
              onSelectSafeguard={(cId, sId) => { setCurrentItem({ type: 'safeguard', controlId: cId, safeguardId: sId }); setExpandedControlId(cId); }}
              onToggleExpand={(id) => setExpandedControlId(prev => (prev === id ? 0 : id))}
              onSelectSummary={() => {}}
            />
          ) : (
            <FlatSafeguardList
              rows={sortedRows}
              mode={viewMode}
              selectedId={currentItem.type === 'safeguard' ? currentItem.safeguardId : undefined}
              onSelect={(cId, sId) => { setCurrentItem({ type: 'safeguard', controlId: cId, safeguardId: sId }); setExpandedControlId(cId); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── FlatSafeguardList ────────────────────────────────────────────────────────
// Control-less index used by the Impact and Roadmap views. Mirrors GapCatalog's
// outer chrome but renders a flat, pre-sorted list of safeguards with a trailing
// badge: the maturity-gain worth (Impact) or the assigned phase (Roadmap).
function FlatSafeguardList({ rows, mode, selectedId, onSelect }: {
  rows: RoadmapRow[];
  mode: 'impact' | 'roadmap';
  selectedId?: string;
  onSelect: (controlId: number, safeguardId: string) => void;
}) {
  return (
    <div className="h-full overflow-y-auto border-l border-muted-foreground">
      <div className="p-4 border-b bg-muted/50">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {mode === 'impact' ? 'By worth' : 'By phase'}
        </p>
      </div>

      <div className="py-2 pr-2">
        {rows.map(({ controlId, safeguard, worth, phase }) => {
          const isSelected = selectedId === safeguard.id;
          return (
            <div
              key={safeguard.id}
              className={`
                relative flex items-center gap-2 pl-4 pr-2 py-1.5 cursor-pointer text-sm
                border-l-2 transition-colors
                ${isSelected
                  ? 'border-l-primary text-foreground font-medium'
                  : 'border-l-transparent hover:border-l-muted-foreground/30 text-muted-foreground hover:text-foreground'}
              `}
              onClick={() => onSelect(controlId, safeguard.id)}
            >
              <span className="font-mono text-xs shrink-0 text-muted-foreground">{safeguard.id}</span>
              <span className="truncate text-xs min-w-0">{safeguard.title}</span>
              <span className="ml-auto shrink-0">
                {mode === 'impact' ? (
                  <span className="text-[10px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {worth !== null ? formatMoney(worth) : '—'}
                  </span>
                ) : (
                  <span className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${
                    phase !== null ? 'bg-muted text-foreground' : 'text-muted-foreground/60'
                  }`}>
                    {phase !== null ? `P${phase}` : '—'}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SafeguardRoadmap ─────────────────────────────────────────────────────────
// The detail pane for one safeguard. Remounted (via key) per safeguard so the
// debounce timers and local form state reset cleanly.
function SafeguardRoadmap({
  organizationId, sector, size, control, safeguard, reportCmmi, spectrum, note, item, onItemChange,
}: {
  organizationId: string;
  sector: string | null;
  size: string | null;
  control: CISControl;
  safeguard: Safeguard;
  reportCmmi?: ReportCmmi;
  spectrum?: SafeguardSpectrum;
  note: string;
  item?: RoadmapItemDto;
  onItemChange: (patch: Partial<RoadmapItemDto>) => void;
}) {
  const currentCmmi = reportCmmi?.currentCmmi ?? 1;
  // Target from GAP analysis (the finalized report). The roadmap target is
  // selectable in [max(1, current) .. gapTarget] — both inclusive, never below
  // L1 — and defaults to the GAP target until the advisor picks a lower step.
  // A stored override is clamped into range (and is cleared server-side when
  // the GAP target changes, so it re-derives from the new value).
  const gapTarget   = reportCmmi?.targetCmmi ?? currentCmmi + 1;
  const minTarget   = Math.max(1, currentCmmi);
  const maxTarget   = Math.max(minTarget, gapTarget);
  const targetCmmi  = Math.min(maxTarget, Math.max(minTarget, item?.targetCmmi ?? gapTarget));

  // €/year (or per-incident) avoided by reaching the advisor's target. Reactive
  // to the Target dropdown since it's just a different aleByLevel[target] lookup.
  const gain = maturityGainValue(spectrum, currentCmmi, targetCmmi);

  const [aiState, setAiState] = useState<'idle' | 'loading' | 'error'>('idle');
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Lazy-generate AI insights the first time this safeguard is opened and the
  // row has no cached insights yet.
  useEffect(() => {
    if (item?.aiGeneratedAt) return;           // already cached
    if (aiState === 'loading') return;
    let cancelled = false;
    setAiState('loading');
    fetch('/api/roadmap-insight', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        organizationId, safeguardId: safeguard.id,
        currentCmmi, targetCmmi: reportCmmi?.targetCmmi ?? targetCmmi,
        sector, size,
      }),
    })
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        if (json.success) {
          onItemChange({
            aiBusinessRelevance:     json.data.aiBusinessRelevance,
            aiCustomerExposure:      json.data.aiCustomerExposure,
            aiImplementationInsight: json.data.aiImplementationInsight,
            aiGeneratedAt:           json.data.aiGeneratedAt,
          });
          setAiState('idle');
        } else {
          setAiState('error');
        }
      })
      .catch(() => { if (!cancelled) setAiState('error'); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeguard.id]);

  // Persist one advisor-decision field (debounced for text, immediate for
  // selects) and toast the outcome. `label` names the field for the toast;
  // for debounced text fields the toast fires once the write settles, not on
  // every keystroke.
  const save = useCallback((
    patch: Partial<RoadmapItemDto>,
    label: string,
    debounceKey?: string,
  ) => {
    onItemChange(patch);
    const fire = async () => {
      try {
        const res  = await fetch('/api/roadmap', {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ organizationId, safeguardId: safeguard.id, ...patch }),
        });
        const json = await res.json();
        if (json.success) {
          toast.success(`${label} updated`, { description: `Safeguard ${safeguard.id}` });
        } else {
          toast.error(`Couldn't save ${label.toLowerCase()}`, { description: json.error });
        }
      } catch (error) {
        console.error('Failed to save roadmap field:', error);
        toast.error(`Couldn't save ${label.toLowerCase()}`);
      }
    };
    if (debounceKey) {
      clearTimeout(debounceRef.current[debounceKey]);
      debounceRef.current[debounceKey] = setTimeout(fire, 800);
    } else {
      fire();
    }
  }, [organizationId, safeguard.id, onItemChange]);

  return (
    <div className="space-y-6">
      {/* A/B/C header */}
      <div className="rounded-xl border bg-panel p-6 space-y-1">
        <h2 className="text-xl font-semibold">{safeguard.title}</h2>
        <p className="text-sm text-muted-foreground line-clamp-1">{safeguard.definition}</p>
        <p className="text-sm text-foreground/80 pt-1">
          Increase maturity from{' '}
          <span className="font-semibold">{currentCmmi <= 0 ? 'Not Started' : `CMMI level ${currentCmmi}`}</span> to CMMI level{' '}
          <span className="font-semibold">{targetCmmi}</span>
          {gain && (
            <>
              {' — worth '}
              <span
                className="font-semibold text-emerald-600 dark:text-emerald-400"
                title={
                  gain.perYear
                    ? 'Reduction in annual expected loss (probability × loss) at the target level'
                    : 'Reduction in loss-given-event at the target level (no breach-probability data available)'
                }
              >
                ~{formatMoney(gain.amount)}{gain.perYear ? '/year' : ''}
              </span>
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground pt-1">
          Safeguard {safeguard.id} · Control {control.id}: {control.title}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Left column: context ──────────────────────────────────────── */}
        <div className="space-y-5">
          <h3 className="text-base font-semibold border-b pb-2">Context (platform + GAP)</h3>

          <div className="space-y-4">
            <p className="text-sm font-medium">Why this matters</p>

            <Insight label="Business relevance"     value={item?.aiBusinessRelevance}     state={aiState} />
            <Insight label="Customer exposure"      value={item?.aiCustomerExposure}      state={aiState} />
            <Insight label="Implementation insight" value={item?.aiImplementationInsight} state={aiState} />
          </div>

          <div className="space-y-1.5 pt-2">
            <p className="text-sm font-medium">From GAP analysis (advisor notes)</p>
            {note.trim() ? (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{note}</p>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">
                No advisor notes were recorded for this safeguard during GAP definition.
              </p>
            )}
          </div>
        </div>

        {/* ── Right column: advisor decision ────────────────────────────── */}
        <div className="space-y-5">
          <h3 className="text-base font-semibold border-b pb-2">Advisor decision</h3>

          <Field label="Target CMMI maturity">
            <Select
              value={String(targetCmmi)}
              onValueChange={(v) => save({ targetCmmi: Number(v) }, 'Target CMMI maturity')}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {/* Selectable between current and the GAP target, inclusive, min L1. */}
                {Array.from({ length: maxTarget - minTarget + 1 }, (_, i) => minTarget + i).map(l => (
                  <SelectItem key={l} value={String(l)}>Level {l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Phase">
            <Select
              value={item?.phase ? String(item.phase) : undefined}
              onValueChange={(v) => save({ phase: Number(v) }, 'Phase')}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select phase" /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map(p => (
                  <SelectItem key={p} value={String(p)}>Phase {p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Effort (advisor estimate)">
            <Select
              value={item?.effort ?? undefined}
              onValueChange={(v) => save({ effort: v as RoadmapItemDto['effort'] }, 'Effort')}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select effort" /></SelectTrigger>
              <SelectContent>
                {EFFORT_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Client explanation">
            <Textarea
              defaultValue={item?.clientExplanation ?? ''}
              onChange={(e) => save({ clientExplanation: e.target.value }, 'Client explanation', 'clientExplanation')}
              placeholder="Shown to the client — why this step is recommended…"
              className="min-h-24 resize-y"
            />
          </Field>

          <Field label="Internal note (not shown to client)">
            <Textarea
              defaultValue={item?.internalNote ?? ''}
              onChange={(e) => save({ internalNote: e.target.value }, 'Internal note', 'internalNote')}
              placeholder="Add internal notes…"
              className="min-h-24 resize-y"
            />
          </Field>

          <Field label="Owner">
            <Select
              value={item?.owner ?? undefined}
              onValueChange={(v) => save({ owner: v as RoadmapItemDto['owner'] }, 'Owner')}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select owner" /></SelectTrigger>
              <SelectContent>
                {OWNER_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
    </div>
  );
}

function Insight({ label, value, state }: {
  label: string;
  value?: string | null;
  state: 'idle' | 'loading' | 'error';
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground/90">{label}</p>
      {value ? (
        <p className="text-sm text-muted-foreground mt-0.5">{value}</p>
      ) : state === 'loading' ? (
        <p className="text-sm text-muted-foreground/70 mt-0.5 inline-flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…
        </p>
      ) : state === 'error' ? (
        <p className="text-sm text-muted-foreground/60 mt-0.5 inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Could not generate — reopen this safeguard to retry.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground/50 mt-0.5">—</p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
