'use client';

// /gap/report — Finalize the GAP report. Extracted from /gap/analysis so the
// per-safeguard navigation page no longer has to thread the summary slide
// through its own state machine.
//
// "Finalized" is not a global boolean on this page: a finalized snapshot can
// exist *and* the user can have edited safeguards since. We compute three
// states from the latest snapshot:
//
//   - 'none'     — no snapshot exists yet
//   - 'matches'  — current CMMI + active set matches the latest snapshot
//   - 'drift'    — a snapshot exists, but the current state differs
//
// Only 'matches' shows the green "this is the finalized state" banner.
// 'drift' shows an amber "X changes since last finalize" hint and re-enables
// the finalize button so the user can produce a new version.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertTriangle, ArrowDown, ArrowUp, Minus, Trash2 } from 'lucide-react';
import { useOrganization } from '@/context/OrganizationContext';
import { CIS_CONTROLS } from '@/lib/constants/cis-controls';
import { GapSummarySlide } from '@/components/gap-report';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// Type-to-confirm word for the destructive "Reset History" action.
const RESET_WORD = 'reset';

type CmmiData = {
  safeguardId: string;
  currentCmmi: number;
  targetCmmi: number;
};

// Shape of one row returned by GET /api/gap-report (already include:cmmiValues).
type SnapshotCmmi = {
  safeguardId: string;
  currentCmmi: number;
  targetCmmi:  number;
};

// A single finalized version. We keep the cmmiValues array so the drift check
// against the latest version can run client-side without a second request.
type Snapshot = {
  version:     number;
  finalizedAt: string;
  averageGap:  number;
  remarks:     string | null;
  cmmiValues:  SnapshotCmmi[];
};

type DriftStatus = 'none' | 'matches' | 'drift';

// Map an API row to our Snapshot shape. Defensive about cmmiValues missing
// or non-array because the route returns whatever Prisma yields.
function toSnapshot(row: {
  version:     number;
  finalizedAt: string;
  averageGap:  number;
  remarks:    string | null;
  cmmiValues?: SnapshotCmmi[];
}): Snapshot {
  return {
    version:     row.version,
    finalizedAt: row.finalizedAt,
    averageGap:  row.averageGap,
    remarks:     row.remarks,
    cmmiValues: (row.cmmiValues ?? []).map((r) => ({
      safeguardId: r.safeguardId,
      currentCmmi: r.currentCmmi,
      targetCmmi:  r.targetCmmi,
    })),
  };
}

export default function GapReportPage() {
  const t = useTranslations('GapReport');
  const { activeOrganization } = useOrganization();

  const [cmmiData,           setCmmiData]           = useState<Record<string, CmmiData>>({});
  // Per-safeguard classification from /gap/definition. The report scopes to
  // safeguards set to "include", so changing Include↔Exclude there shows up
  // here as drift against the last finalized snapshot.
  const [classifications,    setClassifications]    = useState<Record<string, 'include' | 'maybe' | 'exclude'>>({});
  // Full version history, sorted version:desc (latest first). Server orders
  // it that way; we just trust the order.
  const [history,            setHistory]            = useState<Snapshot[]>([]);
  const [isLoading,          setIsLoading]          = useState(true);

  // "Reset History" confirmation (mirrors the Delete Organisation dialog).
  const [showReset,    setShowReset]    = useState(false);
  const [resetChecked, setResetChecked] = useState(false);
  const [resetText,    setResetText]    = useState('');
  const [isResetting,  setIsResetting]  = useState(false);

  const latestSnapshot = history[0] ?? null;

  useEffect(() => {
    if (!activeOrganization?.id) {
      setCmmiData({});
      setClassifications({});
      setHistory([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const cmmiP = fetch(`/api/safeguard-cmmi?organizationId=${activeOrganization.id}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled || !json.success) return;
        const map: Record<string, CmmiData> = {};
        for (const [sid, v] of Object.entries(
          json.data as Record<string, { currentCmmi: number; targetCmmi: number }>,
        )) {
          map[sid] = { safeguardId: sid, currentCmmi: v.currentCmmi, targetCmmi: v.targetCmmi };
        }
        setCmmiData(map);
      })
      .catch(console.error);

    const classP = fetch(`/api/safeguard-classification?organizationId=${activeOrganization.id}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled || !json.success) return;
        setClassifications(json.data ?? {});
      })
      .catch(console.error);

    // GET returns reports ordered version:desc, so we keep the order as-is.
    const reportP = fetch(`/api/gap-report?organizationId=${activeOrganization.id}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled || !json.success) return;
        const rows = Array.isArray(json.data) ? json.data : [];
        setHistory(rows.map(toSnapshot));
      })
      .catch(console.error);

    Promise.allSettled([cmmiP, classP, reportP]).then(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [activeOrganization?.id]);

  const activeSafeguardIds = useMemo(() => {
    const ids: string[] = [];
    for (const ctrl of CIS_CONTROLS) {
      for (const sg of ctrl.safeguards) {
        if (classifications[sg.id] === 'include') ids.push(sg.id);
      }
    }
    return ids;
  }, [classifications]);

  // Diff the snapshot's frozen CMMI map against the current state. We count
  // every safeguard that's been added, removed, or had either of its CMMI
  // levels changed. The active set is the canonical "what would be in the
  // next snapshot", so removals and additions both register as drift.
  const { status, driftCount, finalizedAt } = useMemo(() => {
    if (!latestSnapshot) {
      return { status: 'none' as DriftStatus, driftCount: 0, finalizedAt: null as string | null };
    }

    const snapshotMap = new Map<string, SnapshotCmmi>();
    for (const row of latestSnapshot.cmmiValues) snapshotMap.set(row.safeguardId, row);

    const currentSet = new Set(activeSafeguardIds);
    let drift = 0;

    // Added or changed safeguards.
    for (const id of activeSafeguardIds) {
      const snap = snapshotMap.get(id);
      const cur  = cmmiData[id];
      const curCurrent = cur?.currentCmmi ?? 1;
      const curTarget  = cur?.targetCmmi  ?? 1;
      if (!snap) { drift++; continue; }
      if (snap.currentCmmi !== curCurrent || snap.targetCmmi !== curTarget) drift++;
    }
    // Removed safeguards (in snapshot but not in current active set).
    for (const row of latestSnapshot.cmmiValues) {
      if (!currentSet.has(row.safeguardId)) drift++;
    }

    return {
      status: (drift === 0 ? 'matches' : 'drift') as DriftStatus,
      driftCount: drift,
      finalizedAt: latestSnapshot.finalizedAt,
    };
  }, [latestSnapshot, cmmiData, activeSafeguardIds]);

  const finalizeReport = async (remarks: string) => {
    if (!activeOrganization) return;

    const cmmiEntries = activeSafeguardIds.map((id) => {
      const data = cmmiData[id];
      return {
        safeguardId: id,
        currentCmmi: data?.currentCmmi ?? 1,
        targetCmmi:  data?.targetCmmi  ?? 1,
      };
    });

    try {
      const res = await fetch('/api/gap-report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          organizationId: activeOrganization.id,
          cmmiData:       cmmiEntries,
          remarks,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Re-fetch the full history so the new version shows up in the
        // table below and the drift banner flips from 'drift' to 'matches'.
        const refreshed = await fetch(`/api/gap-report?organizationId=${activeOrganization.id}`)
          .then(r => r.json())
          .catch(() => null);
        if (refreshed?.success && Array.isArray(refreshed.data)) {
          setHistory(refreshed.data.map(toSnapshot));
        }
        toast.success(data.message || t('messages.reportFinalized'));
      } else {
        toast.error(data.error || t('errors.finalizeReport'));
      }
    } catch (error) {
      console.error('Failed to finalize report:', error);
      toast.error(t('errors.finalizeReport'));
    }
  };

  // Reset History — permanently delete every finalized version for this org.
  const resetHistory = async () => {
    if (!activeOrganization) return;
    if (!resetChecked || resetText.toLowerCase() !== RESET_WORD) return;
    setIsResetting(true);
    try {
      const res = await fetch(`/api/gap-report?organizationId=${activeOrganization.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setHistory([]);
        setShowReset(false);
        setResetChecked(false);
        setResetText('');
        toast.success(data.message || 'GAP report history reset');
      } else {
        toast.error(data.error || 'Failed to reset history');
      }
    } catch (error) {
      console.error('Failed to reset history:', error);
      toast.error('Failed to reset history');
    } finally {
      setIsResetting(false);
    }
  };

  if (!activeOrganization) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-muted-foreground">{t('messages.selectOrganization')}</p>
      </div>
    );
  }

  // GapSummarySlide treats `isFinalized=true` as "lock the textarea + hide the
  // finalize button". That's only what we want in the 'matches' state — when
  // we have drift, the user needs to be able to re-finalize.
  const slideIsFinalized = status === 'matches';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">GAP Report</h1>
        <p className="text-muted-foreground mt-1">
          Snapshot the current gap assessment for record-keeping.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : activeSafeguardIds.length === 0 ? (
        <div className="rounded-xl border bg-panel p-6 text-sm text-muted-foreground">
          No active safeguards yet. Define scope in{' '}
          <Link href="/gap/definition" className="underline underline-offset-2 hover:text-foreground">
            GAP Definition
          </Link>
          {' '}first.
        </div>
      ) : (
        <>
          {status === 'drift' && finalizedAt && (
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-500">
                  {driftCount === 1 ? '1 change' : `${driftCount} changes`} since last finalize
                </p>
                <p className="text-muted-foreground mt-0.5">
                  Last finalized {new Date(finalizedAt).toLocaleString()}.
                  Re-finalize below to produce a new versioned snapshot.
                </p>
              </div>
            </div>
          )}

          <GapSummarySlide
            cmmiData={cmmiData}
            activeSafeguardIds={activeSafeguardIds}
            isFinalized={slideIsFinalized}
            onFinalize={finalizeReport}
            showHeader={false}
          />

          {history.length > 0 && (
            <HistorySection history={history} onReset={() => setShowReset(true)} />
          )}
        </>
      )}

      {/* Confirm Reset History (mirrors the Delete Organisation dialog) */}
      <Dialog
        open={showReset}
        onOpenChange={(open) => {
          if (!open) { setShowReset(false); setResetChecked(false); setResetText(''); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Reset GAP report history?</DialogTitle>
            <DialogDescription>
              This permanently deletes all {history.length} finalized version{history.length === 1 ? '' : 's'} for{' '}
              <span className="font-medium">{activeOrganization.name}</span>. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 border border-destructive/30 rounded-lg bg-destructive/5">
              <Checkbox
                id="reset-confirm"
                checked={resetChecked}
                onCheckedChange={(checked) => setResetChecked(!!checked)}
              />
              <label htmlFor="reset-confirm" className="text-sm cursor-pointer">
                I understand this deletes the entire finalized version history.
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm">
                Type <span className="font-mono font-medium">{RESET_WORD}</span> to confirm
              </label>
              <Input
                value={resetText}
                onChange={(e) => setResetText(e.target.value)}
                placeholder={RESET_WORD}
                className={resetText.toLowerCase() === RESET_WORD ? 'border-green-500' : ''}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowReset(false)} disabled={isResetting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={resetHistory}
              disabled={isResetting || !resetChecked || resetText.toLowerCase() !== RESET_WORD}
            >
              {isResetting ? 'Resetting…' : 'Reset History'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── HistorySection ──────────────────────────────────────────────────────────
// Renders the full version history below the live summary. Each row shows
// version, finalized timestamp, # safeguards in that snapshot, and the
// average gap with a direction indicator vs the previous version (so the
// reader can see at a glance whether the gap improved or regressed).
function HistorySection({ history, onReset }: { history: Snapshot[]; onReset: () => void }) {
  // history is version:desc. Pair each row with its previous (lower-version)
  // row for the delta arrow.
  const rows = history.map((row, idx) => {
    const prev = history[idx + 1] ?? null;
    return { row, prev };
  });

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold italic">History</h2>
          <p className="text-sm text-muted-foreground">
            Each finalize creates a permanent versioned snapshot. The arrow shows the change in
            average gap versus the previous version (down is better).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="shrink-0 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Reset History
        </Button>
      </div>

      <div className="rounded-lg border bg-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left  font-medium px-4 py-2 w-20">Version</th>
              <th className="text-left  font-medium px-4 py-2">Finalized</th>
              <th className="text-right font-medium px-4 py-2 w-28">Safeguards</th>
              <th className="text-right font-medium px-4 py-2 w-32">Avg gap</th>
              <th className="text-left  font-medium px-4 py-2">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(({ row, prev }) => {
              const delta = prev ? row.averageGap - prev.averageGap : null;
              return (
                <tr key={row.version} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-mono tabular-nums">v{row.version}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {new Date(row.finalizedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.cmmiValues.length}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {row.averageGap.toFixed(2)}
                      {delta !== null && <DeltaArrow delta={delta} />}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {row.remarks ? (
                      <span title={row.remarks} className="line-clamp-1 break-words">
                        {row.remarks}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DeltaArrow({ delta }: { delta: number }) {
  // The "gap" is target − current, so a smaller number = closer to target.
  // Down arrow (green) = improvement, up arrow (red) = regression.
  if (Math.abs(delta) < 0.005) {
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" aria-label="No change" />;
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-green-600 dark:text-green-500" aria-label={`Improved by ${Math.abs(delta).toFixed(2)}`}>
        <ArrowDown className="w-3.5 h-3.5" />
        <span className="text-xs tabular-nums">{delta.toFixed(2)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-red-600 dark:text-red-500" aria-label={`Worsened by ${delta.toFixed(2)}`}>
      <ArrowUp className="w-3.5 h-3.5" />
      <span className="text-xs tabular-nums">+{delta.toFixed(2)}</span>
    </span>
  );
}
