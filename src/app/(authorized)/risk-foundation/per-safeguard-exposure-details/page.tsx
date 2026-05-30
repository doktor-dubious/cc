'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useOrganization } from '@/context/OrganizationContext';
import {
  buildSpectrumInputs,
  calculateSafeguardExposureSpectrum,
  LOWER_DISPLAY_LEVEL,
  UPPER_DISPLAY_LEVEL,
  type ControlSpectrum,
  type SafeguardSpectrum,
} from '@/lib/conc/safeguard-exposure-spectrum';

type SortKey =
  | 'controlId'
  | 'safeguardCount'
  | 'avoidableLow'
  | 'avoidableHigh'
  | 'aleLow'
  | 'aleHigh'
  | 'relevance';
type SortDir = 'asc' | 'desc';

// Color tier for a 0–100 Financial Relevance Score (mirrors Risk Relevance).
function relevanceTier(score: number): string {
  if (score >= 80) return 'text-red-600 dark:text-red-400 bg-red-500/10';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400 bg-amber-500/10';
  if (score >= 40) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10';
  return 'text-muted-foreground bg-muted/40';
}

const CATEGORY_LABEL: Record<string, string> = {
  downtime:     'Downtime',
  ir:           'Incident Response',
  restore:      'Restore',
  ebi:          'Extended Business Impact',
  ccl:          'Customer Churn Loss',
  reg:          'Regulatory',
  reputation:   'Reputation',
  governance:   'Governance',
  notification: 'Notification',
};

function formatMoney(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '€0';
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 10_000)    return `€${Math.round(value / 1_000)}K`;
  if (value >= 1_000)     return `€${(value / 1_000).toFixed(1)}K`;
  return `€${Math.round(value)}`;
}

function formatPercent(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

export default function PerSafeguardExposureDetailsPage() {
  const router = useRouter();
  const { activeOrganization } = useOrganization();

  const [sortKey, setSortKey] = useState<SortKey>('avoidableLow');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [expandedControls, setExpandedControls] = useState<Set<number>>(new Set());

  const result = useMemo(() => {
    if (!activeOrganization) return null;
    const { concBase, breachBase } = buildSpectrumInputs(activeOrganization);
    return calculateSafeguardExposureSpectrum(concBase, breachBase);
  }, [activeOrganization]);

  // Group safeguards by controlId for the fold-out rows.
  const safeguardsByControl = useMemo<Record<number, SafeguardSpectrum[]>>(() => {
    if (!result || !result.ok) return {};
    const out: Record<number, SafeguardSpectrum[]> = {};
    for (const spec of result.spectrum.bySafeguard.values()) {
      (out[spec.controlId] ??= []).push(spec);
    }
    for (const sgs of Object.values(out)) {
      sgs.sort((a, b) => {
        const [a1, a2] = a.safeguardId.split('.').map((n) => Number(n) || 0);
        const [b1, b2] = b.safeguardId.split('.').map((n) => Number(n) || 0);
        return a1 - b1 || a2 - b2;
      });
    }
    return out;
  }, [result]);

  const toggleExpand = (controlId: number) => {
    setExpandedControls((prev) => {
      const next = new Set(prev);
      if (next.has(controlId)) next.delete(controlId);
      else next.add(controlId);
      return next;
    });
  };

  // Filter + sort controls. A search query matches a control if its title/id
  // matches OR any of its safeguards match (by id or title).
  const visible: ControlSpectrum[] = useMemo(() => {
    if (!result || !result.ok) return [];
    let rows = result.spectrum.byControl;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        if (r.controlTitle.toLowerCase().includes(q)) return true;
        if (String(r.controlId).includes(q)) return true;
        const sgs = safeguardsByControl[r.controlId] ?? [];
        return sgs.some(
          (s) =>
            s.safeguardId.toLowerCase().includes(q) ||
            s.safeguardTitle.toLowerCase().includes(q),
        );
      });
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = controlKey(a, sortKey);
      const bv = controlKey(b, sortKey);
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [result, safeguardsByControl, sortKey, sortDir, search]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(k);
      setSortDir(k === 'controlId' ? 'asc' : 'desc');
    }
  }

  if (!activeOrganization) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-muted-foreground">Select an organization to continue.</p>
      </div>
    );
  }

  if (!result || !result.ok) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Per-Safeguard Financial Exposure — Details</h1>
        </div>
        <div className="rounded-xl border bg-panel p-6 space-y-3">
          <p className="font-medium">Missing organization profile data:</p>
          <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
            {(result?.ok === false ? result.missing : []).map((m) => <li key={m}>{m}</li>)}
          </ul>
          <p className="text-sm text-muted-foreground">
            Complete the Organization Profile to compute exposure.
          </p>
        </div>
      </div>
    );
  }

  const { byLevel } = result.spectrum;
  const lLow  = byLevel[LOWER_DISPLAY_LEVEL];   // L1 — worst case, largest €
  const lHigh = byLevel[UPPER_DISPLAY_LEVEL];   // L4 — best case, smallest €
  const rangeLabel = `L${UPPER_DISPLAY_LEVEL} → L${LOWER_DISPLAY_LEVEL}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Per-Safeguard Financial Exposure — Details</h1>
        <p className="text-muted-foreground mt-1">
          Avoidable loss and annual loss expectancy attributed to each CIS control, shown as
          a range across the CMMI maturity spectrum (L{UPPER_DISPLAY_LEVEL} = best case,
          L{LOWER_DISPLAY_LEVEL} = worst case). Expand a row to see per-safeguard breakdowns.
        </p>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          <span>
            Theoretical impact based on CONC loss model × safeguard cost-fingerprint —
            pre-calibration. Standalone marginal contributions, not summable totals.
          </span>
        </div>
        <div className="flex items-start gap-2 mt-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            <strong className="text-foreground">Relevance</strong> is a 0–100 score on the
            same scale as the Risk Relevance Score from the Structural Risk Profile.
            Computed as <code className="px-1 rounded bg-muted">round(100 × √(ale[L1]) / √(max ale[L1]))</code> —
            the top safeguard is 100, others scale by √-transform to keep mid-tier
            safeguards visible despite the heavy-tailed ALE distribution.
          </span>
        </div>
      </div>

      {/* ── Summary range cards (same as the summary page) ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <RangeCard
          label="Total breach cost"
          hint="Loss-given-event (CONC mid)"
          lowValue={formatMoney(lLow.concTotalMid)}
          highValue={formatMoney(lHigh.concTotalMid)}
          rangeLabel={rangeLabel}
        />
        <RangeCard
          label="Avoidable loss"
          hint="Marginal $ at risk from safeguard gaps"
          lowValue={formatMoney(lLow.totalAvoidable)}
          highValue={formatMoney(lHigh.totalAvoidable)}
          rangeLabel={rangeLabel}
        />
        <RangeCard
          label="Breach probability"
          hint="Annual P(breach)"
          lowValue={lLow.probability !== null ? formatPercent(lLow.probability) : '—'}
          highValue={lHigh.probability !== null ? formatPercent(lHigh.probability) : '—'}
          rangeLabel={rangeLabel}
        />
        <RangeCard
          label="Annual expected loss"
          hint="P(breach) × avoidable"
          lowValue={lLow.totalAle !== null ? formatMoney(lLow.totalAle) : '—'}
          highValue={lHigh.totalAle !== null ? formatMoney(lHigh.totalAle) : '—'}
          rangeLabel={rangeLabel}
        />
      </div>

      {/* ── Filter row + back link ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search control or safeguard…"
          className="max-w-xs h-9"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/risk-foundation/per-safeguard-exposure')}
          className="cursor-pointer gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to summary
        </Button>
      </div>

      {/* ── Control table with fold-out safeguards ──────────────────────── */}
      <div className="rounded-xl border bg-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <SortableTh label="#"  k="controlId" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <th className="p-3 text-left">Control</th>
              <SortableTh label="Safeguards" k="safeguardCount" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
              <th className="p-3 text-right">
                <div className="flex flex-col items-end">
                  <span>Avoidable</span>
                  <span className="text-[10px] normal-case font-normal">{rangeLabel}</span>
                </div>
              </th>
              <th className="p-3 text-right">
                <div className="flex flex-col items-end">
                  <span>Annual ALE</span>
                  <span className="text-[10px] normal-case font-normal">{rangeLabel}</span>
                </div>
              </th>
              <SortableTh label="Relevance" k="relevance" current={sortKey} dir={sortDir} onClick={toggleSort} align="right" />
              <th className="p-3 text-left">Top driver</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const isExpanded = expandedControls.has(r.controlId);
              const safeguards = safeguardsByControl[r.controlId] ?? [];
              return (
                <React.Fragment key={r.controlId}>
                  <tr
                    className="border-t hover:bg-muted/30 cursor-pointer"
                    onClick={() => toggleExpand(r.controlId)}
                  >
                    <td className="p-3 font-mono">
                      <div className="flex items-center gap-1.5">
                        {isExpanded
                          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                        <span>{r.controlId}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="truncate max-w-md">{r.controlTitle}</div>
                    </td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">
                      {r.safeguardCount}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      <RangeCell
                        low={r.avoidableByLevel[LOWER_DISPLAY_LEVEL]}
                        high={r.avoidableByLevel[UPPER_DISPLAY_LEVEL]}
                      />
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      <RangeCell
                        low={r.aleByLevel[LOWER_DISPLAY_LEVEL]}
                        high={r.aleByLevel[UPPER_DISPLAY_LEVEL]}
                      />
                    </td>
                    <td className="p-3 text-right">
                      <span
                        title={`Financial Relevance: ${r.financialRelevance}% — avg of control's safeguards`}
                        className={`inline-block text-xs font-semibold tabular-nums px-2 py-0.5 rounded ${relevanceTier(r.financialRelevance)}`}
                      >
                        {r.financialRelevance}%
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {r.topCategory ? CATEGORY_LABEL[r.topCategory] ?? r.topCategory : '—'}
                    </td>
                  </tr>

                  {/* Fold-out safeguard rows */}
                  {isExpanded && safeguards.map((sg) => (
                    <tr key={sg.safeguardId} className="border-t bg-muted/20">
                      <td className="py-2 pl-10 pr-3 font-mono text-xs text-muted-foreground">
                        {sg.safeguardId}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate text-sm">{sg.safeguardTitle}</span>
                          {sg.role && (
                            <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                              {sg.role}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground" />
                      <td className="py-2 px-3 text-right tabular-nums">
                        <RangeCell
                          low={sg.avoidableByLevel[LOWER_DISPLAY_LEVEL]}
                          high={sg.avoidableByLevel[UPPER_DISPLAY_LEVEL]}
                        />
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        <RangeCell
                          low={sg.aleByLevel[LOWER_DISPLAY_LEVEL]}
                          high={sg.aleByLevel[UPPER_DISPLAY_LEVEL]}
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          title={`Financial Relevance: ${sg.financialRelevance}/100`}
                          className={`inline-block text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${relevanceTier(sg.financialRelevance)}`}
                        >
                          {sg.financialRelevance}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">
                        {sg.topCategory ? CATEGORY_LABEL[sg.topCategory] ?? sg.topCategory : '—'}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No matching controls.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Range card ─────────────────────────────────────────────────────────────

function RangeCard({ label, hint, lowValue, highValue, rangeLabel }: {
  label: string;
  hint: string;
  lowValue: string;   // L1 — largest value
  highValue: string;  // L4 — smallest value
  rangeLabel: string;
}) {
  return (
    <div className="rounded-xl border bg-panel p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{highValue}</span>
        <span className="text-muted-foreground">→</span>
        <span className="text-2xl font-semibold">{lowValue}</span>
      </p>
      <p className="text-xs text-muted-foreground mt-1">{hint} ({rangeLabel})</p>
    </div>
  );
}

// ─── Range cell ─────────────────────────────────────────────────────────────

function RangeCell({ low, high }: { low?: number | null; high?: number | null }) {
  if (low === undefined || low === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  const hi = high !== null && high !== undefined ? formatMoney(high) : '—';
  return (
    <div className="flex items-baseline justify-end gap-1.5 tabular-nums leading-tight">
      <span className="font-medium">{hi}</span>
      <span className="text-muted-foreground">→</span>
      <span className="font-medium">{formatMoney(low)}</span>
    </div>
  );
}

// ─── Sortable header ───────────────────────────────────────────────────────

function SortableTh({
  label, k, current, dir, onClick, align = 'left',
}: {
  label: string;
  k: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = current === k;
  return (
    <th className={`p-3 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground"
        onClick={() => onClick(k)}
      >
        {label}
        {active && (dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );
}

// ─── Sort-key getter ───────────────────────────────────────────────────────

function controlKey(r: ControlSpectrum, k: SortKey): number {
  switch (k) {
    case 'controlId':       return r.controlId;
    case 'safeguardCount':  return r.safeguardCount;
    case 'avoidableLow':    return r.avoidableByLevel[LOWER_DISPLAY_LEVEL] ?? 0;
    case 'avoidableHigh':   return r.avoidableByLevel[UPPER_DISPLAY_LEVEL] ?? 0;
    case 'aleLow':          return r.aleByLevel[LOWER_DISPLAY_LEVEL] ?? -1;
    case 'aleHigh':         return r.aleByLevel[UPPER_DISPLAY_LEVEL] ?? -1;
    case 'relevance':       return r.financialRelevance;
  }
}
