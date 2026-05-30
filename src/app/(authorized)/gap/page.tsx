'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/context/OrganizationContext';
import { CIS_CONTROLS } from '@/lib/constants/cis-controls';

const TOTAL_SAFEGUARDS = CIS_CONTROLS.reduce((n, c) => n + c.safeguards.length, 0);

type CmmiRow = { currentCmmi: number; targetCmmi: number };
type SnapshotCmmi = { safeguardId: string; currentCmmi: number; targetCmmi: number };

// 'none' = never finalized; 'matches' = latest snapshot equals current state;
// 'drift' = a snapshot exists but at least one CMMI value or active flag
// differs from the live state. Mirrors the same diff used in /gap/report.
type ReportStatus = 'none' | 'matches' | 'drift';

export default function GapAnalysisPage() {
  const router = useRouter();
  const { activeOrganization } = useOrganization();

  const [definedCount,       setDefinedCount]       = useState(0);
  const [assessedCount,      setAssessedCount]      = useState(0);
  const [cmmiMap,            setCmmiMap]            = useState<Record<string, CmmiRow>>({});
  const [inactiveSafeguards, setInactiveSafeguards] = useState<Set<string>>(new Set());
  const [snapshotRows,       setSnapshotRows]       = useState<SnapshotCmmi[] | null>(null);

  useEffect(() => {
    if (!activeOrganization?.id) {
      setDefinedCount(0);
      setAssessedCount(0);
      setCmmiMap({});
      setInactiveSafeguards(new Set());
      setSnapshotRows(null);
      return;
    }
    let cancelled = false;

    fetch(`/api/safeguard-classification?organizationId=${activeOrganization.id}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        if (json.success) setDefinedCount(Object.keys(json.data ?? {}).length);
      })
      .catch(() => { /* leave defaults */ });

    fetch(`/api/safeguard-cmmi?organizationId=${activeOrganization.id}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        if (json.success) {
          const map = json.data as Record<string, CmmiRow>;
          setCmmiMap(map);
          setAssessedCount(Object.values(map).filter(v => v.targetCmmi > 0).length);
        }
      })
      .catch(() => { /* leave defaults */ });

    fetch(`/api/safeguard-inactive?organizationId=${activeOrganization.id}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        if (json.success) setInactiveSafeguards(new Set(json.data ?? []));
      })
      .catch(() => { /* leave defaults */ });

    // Latest snapshot (or null if never finalized). GET returns version:desc
    // with cmmiValues included; we only need the first row's frozen CMMI map.
    fetch(`/api/gap-report?organizationId=${activeOrganization.id}`)
      .then(res => res.json())
      .then(json => {
        if (cancelled) return;
        if (!json.success) return;
        const rows = Array.isArray(json.data) ? json.data : [];
        if (rows.length === 0) {
          setSnapshotRows(null);
        } else {
          setSnapshotRows((rows[0].cmmiValues ?? []) as SnapshotCmmi[]);
        }
      })
      .catch(() => { /* leave defaults */ });

    return () => { cancelled = true; };
  }, [activeOrganization?.id]);

  const definitionStatus =
    definedCount === 0                  ? 'not_started'
    : definedCount >= TOTAL_SAFEGUARDS  ? 'finished'
    :                                     'in_progress';

  const reportStatus =
    assessedCount === 0                  ? 'not_started'
    : assessedCount >= TOTAL_SAFEGUARDS  ? 'finished'
    :                                      'in_progress';

  // Same drift logic as /gap/report — a safeguard counts as drifted if it was
  // added, removed, or had either CMMI level changed since the last snapshot.
  const finalizeStatus: ReportStatus = useMemo(() => {
    if (snapshotRows === null) return 'none';

    const activeSet = new Set<string>();
    for (const ctrl of CIS_CONTROLS) {
      for (const sg of ctrl.safeguards) {
        if (!inactiveSafeguards.has(sg.id)) activeSet.add(sg.id);
      }
    }

    const snapMap = new Map<string, SnapshotCmmi>();
    for (const r of snapshotRows) snapMap.set(r.safeguardId, r);

    for (const id of activeSet) {
      const snap = snapMap.get(id);
      const cur  = cmmiMap[id];
      const curCurrent = cur?.currentCmmi ?? 1;
      const curTarget  = cur?.targetCmmi  ?? 1;
      if (!snap) return 'drift';
      if (snap.currentCmmi !== curCurrent || snap.targetCmmi !== curTarget) return 'drift';
    }
    for (const r of snapshotRows) {
      if (!activeSet.has(r.safeguardId)) return 'drift';
    }
    return 'matches';
  }, [snapshotRows, cmmiMap, inactiveSafeguards]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">

      <div>
        <h1 className="text-2xl font-bold tracking-tight">GAP Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Identify and prioritize compliance gaps
        </p>
      </div>

      {/* ── GAP Definition Section ───────────────────────────────────────── */}
      <div className="rounded-xl border bg-panel p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">GAP Definition</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define the scope and criteria for the gap analysis
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          {definitionStatus === 'not_started' && (
            <Badge variant="outline" className="text-muted-foreground">
              Not started
            </Badge>
          )}
          {definitionStatus === 'in_progress' && (
            <Badge variant="outline" className="border-blue-500/50 text-blue-600 dark:text-blue-400">
              In progress — {definedCount} of {TOTAL_SAFEGUARDS}
            </Badge>
          )}
          {definitionStatus === 'finished' && (
            <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">
              Finished
            </Badge>
          )}

          <Button
            variant={definitionStatus === 'finished' ? 'outline' : 'default'}
            className="cursor-pointer"
            onClick={() => router.push('/gap/definition')}
            disabled={!activeOrganization}
          >
            {definitionStatus === 'not_started' && 'Start'}
            {definitionStatus === 'in_progress' && 'Continue'}
            {definitionStatus === 'finished'    && 'Edit'}
          </Button>
        </div>
      </div>

      {/* ── GAP Analysis Section ─────────────────────────────────────────── */}
      <div className="rounded-xl border bg-panel p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">GAP Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review the gap analysis findings and recommendations
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          {reportStatus === 'not_started' && (
            <Badge variant="outline" className="text-muted-foreground">
              Not started
            </Badge>
          )}
          {reportStatus === 'in_progress' && (
            <Badge variant="outline" className="border-blue-500/50 text-blue-600 dark:text-blue-400">
              In progress — {assessedCount} of {TOTAL_SAFEGUARDS}
            </Badge>
          )}
          {reportStatus === 'finished' && (
            <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">
              Finished
            </Badge>
          )}

          <Button
            variant={reportStatus === 'finished' ? 'outline' : 'default'}
            className="cursor-pointer"
            onClick={() => router.push('/gap/analysis')}
            disabled={!activeOrganization}
          >
            {reportStatus === 'not_started' && 'Start'}
            {reportStatus === 'in_progress' && 'Continue'}
            {reportStatus === 'finished'    && 'View'}
          </Button>
        </div>
      </div>

      {/* ── GAP Report Section ───────────────────────────────────────────── */}
      <div className="rounded-xl border bg-panel p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">GAP Report</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Finalize the gap assessment and produce a versioned snapshot
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          {finalizeStatus === 'none' && (
            <Badge variant="outline" className="text-muted-foreground">
              Not finalized
            </Badge>
          )}
          {finalizeStatus === 'matches' && (
            <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">
              Finalized
            </Badge>
          )}
          {finalizeStatus === 'drift' && (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 dark:text-yellow-400">
              Changes pending
            </Badge>
          )}

          <Button
            variant={finalizeStatus === 'matches' ? 'outline' : 'default'}
            className="cursor-pointer"
            onClick={() => router.push('/gap/report')}
            disabled={!activeOrganization || assessedCount === 0}
          >
            {finalizeStatus === 'none'    && 'Finalize'}
            {finalizeStatus === 'matches' && 'View'}
            {finalizeStatus === 'drift'   && 'Re-finalize'}
          </Button>
        </div>
      </div>
    </div>
  );
}
