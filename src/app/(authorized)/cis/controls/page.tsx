'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter }                    from 'next/navigation';
import { useTranslations }              from 'next-intl';
import { useOrganization }              from '@/context/OrganizationContext';
import { Switch }                       from '@/components/ui/switch';
import { Input }                        from '@/components/ui/input';
import { Button }                       from '@/components/ui/button';
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts';
import { X }                            from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

// ── CIS Controls v8 — 18 controls across 5 groups ──────────────────────────

const GROUP_COLORS: Record<string, string> =
{
    'Asset Management'          : 'var(--color-cis-wheel_1)',
    'Protection Mechanisms'     : 'var(--color-cis-wheel_2)',
    'Detection and Monitoring'  : 'var(--color-cis-wheel_3)',
    'Response and Recovery'     : 'var(--color-cis-wheel_4)',
    'Governance and Training'   : 'var(--color-cis-wheel_5)',
};

type Control = {
  id:    number;
  short: string;
  title: string;
  group: string;
  risk:  number; // 0–100  (0 = best, 100 = worst)
};

const controls: Control[] = [
  { id: 1,  short: 'Enterprise Assets',   title: 'Inventory and Control of Enterprise Assets',             group: 'Asset Management',         risk: 35 },
  { id: 2,  short: 'Software Assets',     title: 'Inventory and Control of Software Assets',               group: 'Asset Management',         risk: 50 },
  { id: 3,  short: 'Data Protection',     title: 'Data Protection',                                        group: 'Protection Mechanisms',    risk: 60 },
  { id: 4,  short: 'Secure Config',       title: 'Secure Configuration of Enterprise Assets and Software', group: 'Protection Mechanisms',    risk: 45 },
  { id: 5,  short: 'Account Mgmt',        title: 'Account Management',                                     group: 'Protection Mechanisms',    risk: 30 },
  { id: 6,  short: 'Access Control',      title: 'Access Control Management',                              group: 'Protection Mechanisms',    risk: 25 },
  { id: 7,  short: 'Vuln. Management',    title: 'Continuous Vulnerability Management',                    group: 'Detection and Monitoring', risk: 70 },
  { id: 8,  short: 'Audit Log Mgmt',      title: 'Audit Log Management',                                   group: 'Detection and Monitoring', risk: 40 },
  { id: 9,  short: 'Email & Browser',     title: 'Email and Web Browser Protections',                      group: 'Protection Mechanisms',    risk: 55 },
  { id: 10, short: 'Malware Defenses',    title: 'Malware Defenses',                                       group: 'Detection and Monitoring', risk: 35 },
  { id: 11, short: 'Data Recovery',       title: 'Data Recovery',                                           group: 'Response and Recovery',    risk: 50 },
  { id: 12, short: 'Network Infra',       title: 'Network Infrastructure Management',                      group: 'Protection Mechanisms',    risk: 45 },
  { id: 13, short: 'Network Monitor',     title: 'Network Monitoring and Defense',                          group: 'Detection and Monitoring', risk: 65 },
  { id: 14, short: 'Security Training',   title: 'Security Awareness and Skills Training',                 group: 'Governance and Training',  risk: 40 },
  { id: 15, short: 'Service Providers',   title: 'Service Provider Management',                            group: 'Governance and Training',  risk: 55 },
  { id: 16, short: 'App Software',        title: 'Application Software Security',                          group: 'Protection Mechanisms',    risk: 60 },
  { id: 17, short: 'Incident Response',   title: 'Incident Response Management',                           group: 'Response and Recovery',    risk: 45 },
  { id: 18, short: 'Penetration Testing', title: 'Penetration Testing',                                    group: 'Governance and Training',  risk: 70 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function riskColor(risk: number): string {
  if (risk <= 33) return '#22c55e';  // green
  if (risk <= 66) return '#eab308';  // yellow
  return '#ef4444';                   // red
}

const cisGroups = Object.keys(GROUP_COLORS);

// ── Palette for combined groups (distinct from CIS group colors) ────────────

const COMBINED_GROUP_PALETTE = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#e11d48', // rose
];

type CombinedGroup = {
  dbId?: string;  // DB id (undefined for not-yet-persisted)
  ids:   number[];
  name:  string;
  color: string;
};

// ── Build outermost ring data with combined groups ──────────────────────────

function buildOutermostData(
  controlsList: Control[],
  inactiveControls: Set<number>,
  combinedGroups: CombinedGroup[]
): Array<{ name: string; title: string; value: number; fill: string; id: number; ids: number[]; active: boolean; groupIndex: number }> {
  const result: Array<{ name: string; title: string; value: number; fill: string; id: number; ids: number[]; active: boolean; groupIndex: number }> = [];
  const processed = new Set<number>();
  const visibleIds = new Set(controlsList.map(c => c.id));

  for (let gi = 0; gi < combinedGroups.length; gi++) {
    const group = combinedGroups[gi];
    const visibleGroup = group.ids.filter(id => visibleIds.has(id));
    if (visibleGroup.length === 0) continue;

    const allActive = visibleGroup.every(id => !inactiveControls.has(id));

    result.push({
      name: group.name,
      title: `${group.name}: ${visibleGroup.map(id => controls.find(c => c.id === id)?.short).join(', ')}`,
      value: visibleGroup.length,
      fill: allActive ? group.color : '#6b7280',
      id: visibleGroup[0],
      ids: visibleGroup,
      active: allActive,
      groupIndex: gi,
    });
    visibleGroup.forEach(id => processed.add(id));
  }

  for (const control of controlsList) {
    if (!processed.has(control.id)) {
      const active = !inactiveControls.has(control.id);
      result.push({
        name: control.short,
        title: control.title,
        value: 1,
        fill: active ? '#22c55e' : '#6b7280',
        id: control.id,
        ids: [control.id],
        active,
        groupIndex: -1,
      });
    }
  }

  return result;
}

// ── Word-wrap helper for centre text ────────────────────────────────────────

const MAX_CHARS_PER_LINE = 28;

function wrapText(text: string): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current && (current + ' ' + word).length > MAX_CHARS_PER_LINE) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Active-sector renderer (outermost ring) ────────────────────────────────

const renderActiveOuter = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
  const titleLines = wrapText(payload.title);
  const totalLines = titleLines.length + 1;
  const lineHeight = 24;
  const startY = cy - ((totalLines - 1) * lineHeight) / 2;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.9}
      />
      <text x={cx} textAnchor="middle" className="fill-foreground" style={{ fontSize: '18px', fontWeight: 500 }}>
        {titleLines.map((line, i) => (
          <tspan key={i} x={cx} y={startY + i * lineHeight}>{line}</tspan>
        ))}
      </text>
      <text x={cx} y={startY + titleLines.length * lineHeight + 4} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '14px' }}>
        {payload.active ? 'Active' : 'Inactive'}
      </text>
    </g>
  );
};

// ── Active-sector renderer (middle ring) ───────────────────────────────────

const renderActiveMiddle = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
  const titleLines = wrapText(payload.title);
  const totalLines = titleLines.length + 1;
  const lineHeight = 24;
  const startY = cy - ((totalLines - 1) * lineHeight) / 2;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.9}
      />
      <text x={cx} textAnchor="middle" className="fill-foreground" style={{ fontSize: '18px', fontWeight: 500 }}>
        {titleLines.map((line, i) => (
          <tspan key={i} x={cx} y={startY + i * lineHeight}>{line}</tspan>
        ))}
      </text>
      <text x={cx} y={startY + titleLines.length * lineHeight + 4} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '14px' }}>
        {payload.group}
      </text>
    </g>
  );
};

// ── Active-sector renderer (inner ring) ─────────────────────────────────────

const renderActiveInner = (riskScoreLabel: (risk: number) => string) => (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
  const titleLines = wrapText(payload.title);
  const totalLines = titleLines.length + 1;
  const lineHeight = 24;
  const startY = cy - ((totalLines - 1) * lineHeight) / 2;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.9}
      />
      <text x={cx} textAnchor="middle" className="fill-foreground" style={{ fontSize: '18px', fontWeight: 500 }}>
        {titleLines.map((line, i) => (
          <tspan key={i} x={cx} y={startY + i * lineHeight}>{line}</tspan>
        ))}
      </text>
      <text x={cx} y={startY + titleLines.length * lineHeight + 4} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: '14px' }}>
        {riskScoreLabel(payload.risk)}
      </text>
    </g>
  );
};

// ── Page component ──────────────────────────────────────────────────────────

export default function CISControlsPage() {
  const router = useRouter();
  const t = useTranslations('CISControls');
  const { activeOrganization } = useOrganization();

  const [activeOuter, setActiveOuter] = useState<number | undefined>(undefined);
  const [activeMiddle, setActiveMiddle] = useState<number | undefined>(undefined);
  const [activeInner, setActiveInner] = useState<number | undefined>(undefined);
  const [highlightGroup, setHighlightGroup] = useState<string | null>(null);
  const [highlightRisk, setHighlightRisk] = useState<string | null>(null);

  // Outermost ring configuration state
  const [inactiveControls, setInactiveControls] = useState<Set<number>>(new Set());
  const [combinedGroups, setCombinedGroups] = useState<CombinedGroup[]>([]);
  const [selectedForCombine, setSelectedForCombine] = useState<Set<number>>(new Set());

  // Show/hide inactive controls toggle
  const [showInactive, setShowInactive] = useState(false);

  // Confirm dialog for toggling inactive
  const [confirmInactive, setConfirmInactive] = useState<{ ids: number[]; names: string[] } | null>(null);

  // Rename group dialog
  const [renameDialog, setRenameDialog] = useState<{ groupIndex: number; name: string } | null>(null);

  // Set of all control IDs that are already in a combined group
  const groupedControlIds = useMemo(() => {
    const set = new Set<number>();
    combinedGroups.forEach(g => g.ids.forEach(id => set.add(id)));
    return set;
  }, [combinedGroups]);

  // ── Fetch active/inactive state + combined groups from DB ─────────────────
  useEffect(() => {
    if (!activeOrganization) return;

    fetch(`/api/cis-control?organizationId=${activeOrganization.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const inactive = new Set<number>();
          data.data.forEach((r: any) => { if (!r.active) inactive.add(r.controlId); });
          setInactiveControls(inactive);
        }
      })
      .catch(() => {});

    fetch(`/api/cis-control-group?organizationId=${activeOrganization.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setCombinedGroups(data.data.map((g: any) => ({
            dbId:  g.id,
            ids:   g.ids,
            name:  g.name,
            color: g.color,
          })));
        }
      })
      .catch(() => {});
  }, [activeOrganization]);

  // ── Visible controls (filtered unless showInactive is on) ────────────────
  const visibleControls = useMemo(() =>
    showInactive ? controls : controls.filter(c => !inactiveControls.has(c.id)),
    [showInactive, inactiveControls]
  );

  // ── Derived ring data from visible controls ──────────────────────────────
  const middleData = useMemo(() =>
    visibleControls.map(c => ({
      name:  c.short,
      title: c.title,
      value: 1,
      fill:  GROUP_COLORS[c.group],
      group: c.group,
      id:    c.id,
    })),
    [visibleControls]
  );

  const innerData = useMemo(() =>
    visibleControls.map(c => ({
      name:  c.short,
      title: c.title,
      value: 1,
      fill:  riskColor(c.risk),
      risk:  c.risk,
      id:    c.id,
    })),
    [visibleControls]
  );

  const outermostData = buildOutermostData(visibleControls, inactiveControls, combinedGroups);

  // ── Hover handlers (only one ring active at a time) ──────────────────────
  const handleOuterEnter = (_: any, index: number) => {
    setActiveOuter(index);
    setActiveMiddle(undefined);
    setActiveInner(undefined);
  };

  const handleMiddleEnter = (_: any, index: number) => {
    setActiveMiddle(index);
    setActiveOuter(undefined);
    setActiveInner(undefined);
  };

  const handleInnerEnter = (_: any, index: number) => {
    setActiveInner(index);
    setActiveOuter(undefined);
    setActiveMiddle(undefined);
  };

  // ── Click inner/middle ring → navigate to safeguards ─────────────────────
  const handleSegmentClick = (_: any, index: number, event: React.MouseEvent) => {
    if (event?.ctrlKey || event?.metaKey) return;
    const controlId = visibleControls[index].id;
    router.push(`/cis/safeguards?control=${controlId}`);
  };

  // ── Persist inactive toggle to DB ────────────────────────────────────────
  const persistInactiveToggle = useCallback((ids: number[]) => {
    if (!activeOrganization) return;

    setInactiveControls(prev => {
      const next = new Set(prev);
      ids.forEach(id => {
        const willBeActive = next.has(id);
        if (next.has(id)) next.delete(id);
        else next.add(id);

        fetch('/api/cis-control', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: activeOrganization.id,
            controlId: id,
            active: willBeActive,
          }),
        });
      });
      return next;
    });
  }, [activeOrganization]);

  // ── Click outer ring → toggle active/inactive or ctrl+click select ──────
  const handleOuterClick = (_: any, index: number, event: React.MouseEvent) => {
    const segment = outermostData[index];

    if (event?.ctrlKey || event?.metaKey) {
      // Only allow selecting ungrouped individual controls
      if (segment.groupIndex >= 0) return; // already in a group — skip
      setSelectedForCombine(prev => {
        const next = new Set(prev);
        segment.ids.forEach(id => {
          if (groupedControlIds.has(id)) return; // safety check
          if (next.has(id)) next.delete(id);
          else next.add(id);
        });
        return next;
      });
    } else {
      // If making active segments inactive → show confirm dialog
      const hasActiveSegments = segment.ids.some(id => !inactiveControls.has(id));
      if (hasActiveSegments) {
        const names = segment.ids
          .filter(id => !inactiveControls.has(id))
          .map(id => controls.find(c => c.id === id)?.short || `#${id}`);
        setConfirmInactive({ ids: segment.ids, names });
      } else {
        // Reactivating — no confirm needed
        persistInactiveToggle(segment.ids);
      }
    }
  };

  const handleMouseLeave = () => {
    setActiveOuter(undefined);
    setActiveMiddle(undefined);
    setActiveInner(undefined);
    setHighlightGroup(null);
    setHighlightRisk(null);
  };

  // ── Combine selected → persist to DB ──────────────────────────────────────
  const handleCombineSelected = useCallback(() => {
    const selected = Array.from(selectedForCombine).sort((a, b) => a - b);
    if (selected.length < 2 || !activeOrganization) return;

    const colorIndex = combinedGroups.length % COMBINED_GROUP_PALETTE.length;
    const defaultName = `Group ${combinedGroups.length + 1}`;
    const color = COMBINED_GROUP_PALETTE[colorIndex];

    // Optimistic update
    const newGroup: CombinedGroup = { ids: selected, name: defaultName, color };
    setCombinedGroups(prev => [...prev, newGroup]);
    setSelectedForCombine(new Set());

    // Persist
    fetch('/api/cis-control-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: activeOrganization.id,
        name: defaultName,
        color,
        controlIds: selected,
      }),
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.data) {
        // Update with the real DB id
        setCombinedGroups(prev => prev.map(g =>
          g === newGroup ? { ...g, dbId: data.data.id } : g
        ));
      }
    })
    .catch(() => {});
  }, [selectedForCombine, combinedGroups.length, activeOrganization]);

  // ── Uncombine → delete from DB ────────────────────────────────────────────
  const handleUncombine = useCallback((groupIndex: number) => {
    const group = combinedGroups[groupIndex];
    setCombinedGroups(prev => prev.filter((_, i) => i !== groupIndex));

    if (group?.dbId) {
      fetch(`/api/cis-control-group?id=${group.dbId}`, { method: 'DELETE' }).catch(() => {});
    }
  }, [combinedGroups]);

  // ── Rename group → persist to DB ──────────────────────────────────────────
  const handleRenameGroup = useCallback((groupIndex: number, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) { setRenameDialog(null); return; }

    setCombinedGroups(prev => prev.map((g, i) =>
      i === groupIndex ? { ...g, name: trimmed } : g
    ));
    setRenameDialog(null);

    const group = combinedGroups[groupIndex];
    if (group?.dbId) {
      fetch('/api/cis-control-group', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: group.dbId, name: trimmed }),
      }).catch(() => {});
    }
  }, [combinedGroups]);

  // ── Outermost ring label ─────────────────────────────────────────────────
  const renderOutermostLabel = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, outerRadius, name, index } = props;
    const segment = outermostData[index];

    if (highlightGroup || highlightRisk) {
      const matches = segment.ids.some(id => {
        const control = controls.find(c => c.id === id);
        if (!control) return false;
        if (highlightGroup && control.group !== highlightGroup) return false;
        if (highlightRisk) {
          const band = control.risk <= 33 ? 'low' : control.risk <= 66 ? 'medium' : 'high';
          if (band !== highlightRisk) return false;
        }
        return true;
      });
      if (!matches) return null;
    }

    const radius = outerRadius + 18;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="fill-muted-foreground"
        style={{ fontSize: '10px' }}
      >
        {name}
      </text>
    );
  };

  // ── Opacity helpers ──────────────────────────────────────────────────────
  const outermostOpacity = (index: number) => {
    const segment = outermostData[index];
    const baseOpacity = segment.active ? 0.6 : 0.3;

    if (!highlightGroup && !highlightRisk) return baseOpacity;

    const matches = segment.ids.some(id => {
      const control = controls.find(c => c.id === id);
      if (!control) return false;
      if (highlightGroup && control.group !== highlightGroup) return false;
      if (highlightRisk) {
        const band = control.risk <= 33 ? 'low' : control.risk <= 66 ? 'medium' : 'high';
        if (band !== highlightRisk) return false;
      }
      return true;
    });

    return matches ? baseOpacity : 0.15;
  };

  const middleOpacity = (index: number) => {
    const control = visibleControls[index];
    if (!control) return 1;
    if (!highlightGroup && !highlightRisk) return 1;
    if (highlightGroup) return control.group === highlightGroup ? 1 : 0.15;
    return 1;
  };

  const innerOpacity = (index: number) => {
    const control = visibleControls[index];
    if (!control) return 1;
    if (!highlightGroup && !highlightRisk) return 1;
    if (highlightGroup) return control.group === highlightGroup ? 1 : 0.15;
    if (highlightRisk) {
      const band = control.risk <= 33 ? 'low' : control.risk <= 66 ? 'medium' : 'high';
      return band === highlightRisk ? 1 : 0.15;
    }
    return 1;
  };

  // Only allow combining if all selected controls are ungrouped
  const canCombine = selectedForCombine.size >= 2 &&
    Array.from(selectedForCombine).every(id => !groupedControlIds.has(id));

  return (
    <div className="@container p-2 space-y-6 select-none">

      {/* Confirm inactive dialog */}
      <AlertDialog open={!!confirmInactive} onOpenChange={(open) => { if (!open) setConfirmInactive(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm.inactiveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm.inactiveDescription', { controls: confirmInactive?.names.join(', ') ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('confirm.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmInactive) persistInactiveToggle(confirmInactive.ids);
              setConfirmInactive(null);
            }}>
              {t('confirm.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename group dialog */}
      <Dialog open={!!renameDialog} onOpenChange={(open) => { if (!open) setRenameDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('segments.renameTitle')}</DialogTitle>
            <DialogDescription>{t('segments.renameDescription')}</DialogDescription>
          </DialogHeader>
          <Input
            value={renameDialog?.name ?? ''}
            onChange={(e) => setRenameDialog(prev => prev ? { ...prev, name: e.target.value } : null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && renameDialog) handleRenameGroup(renameDialog.groupIndex, renameDialog.name);
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>{t('confirm.cancel')}</Button>
            <Button onClick={() => {
              if (renameDialog) handleRenameGroup(renameDialog.groupIndex, renameDialog.name);
            }}>
              {t('segments.renameSave')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chart + Legends */}
      <div className="flex flex-col @[900px]:flex-row @[900px]:items-start" onMouseLeave={handleMouseLeave}>

        {/* Chart */}
        <div className="flex-1 min-w-0 [&_path]:outline-none [&_g]:outline-none [&_.recharts-sector]:outline-none" style={{ height: 'calc(100vh - 100px)', minHeight: 500 }}>
          <ResponsiveContainer width="100%" height="100%" aspect={undefined}>
            <PieChart>
              {/* Inner ring — risk scores */}
              <Pie
                data={innerData}
                dataKey="value"
                cx="50%"
                cy="50%"
                startAngle={90}
                endAngle={-270}
                innerRadius="53%"
                outerRadius="58%"
                {...{ activeIndex: activeInner }}
                activeShape={renderActiveInner((risk) => t('legends.riskScoreLabel', { risk }))}
                onMouseEnter={handleInnerEnter}
                onClick={handleSegmentClick}
                isAnimationActive={false}
                strokeWidth={2}
                stroke="var(--background)"
                className="cursor-pointer"
              >
                {innerData.map((entry, index) => (
                  <Cell key={`inner-${index}`} fill={entry.fill} opacity={innerOpacity(index)} />
                ))}
              </Pie>

              {/* Middle ring — control groups */}
              <Pie
                data={middleData}
                dataKey="value"
                cx="50%"
                cy="50%"
                startAngle={90}
                endAngle={-270}
                innerRadius="58%"
                outerRadius="78%"
                {...{ activeIndex: activeMiddle }}
                activeShape={renderActiveMiddle}
                onMouseEnter={handleMiddleEnter}
                onClick={handleSegmentClick}
                isAnimationActive={false}
                strokeWidth={2}
                className="cursor-pointer"
                stroke="var(--background)"
              >
                {middleData.map((entry, index) => (
                  <Cell key={`middle-${index}`} fill={entry.fill} opacity={middleOpacity(index)} />
                ))}
              </Pie>

              {/* Outermost ring — status/coverage configuration */}
              <Pie
                data={outermostData}
                dataKey="value"
                cx="50%"
                cy="50%"
                startAngle={90}
                endAngle={-270}
                innerRadius="80%"
                outerRadius="85%"
                {...{ activeIndex: activeOuter }}
                activeShape={renderActiveOuter}
                onMouseEnter={handleOuterEnter}
                onClick={handleOuterClick}
                label={renderOutermostLabel}
                isAnimationActive={false}
                strokeWidth={2}
                stroke="var(--background)"
                className="cursor-pointer"
              >
                {outermostData.map((entry, index) => {
                  const isSelected = entry.ids.some(id => selectedForCombine.has(id));
                  return (
                    <Cell
                      key={`outer-${index}`}
                      fill={entry.fill}
                      opacity={outermostOpacity(index)}
                      stroke={isSelected ? '#3b82f6' : 'var(--background)'}
                      strokeWidth={isSelected ? 4 : 2}
                    />
                  );
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legends — beside chart on wide screens, below on narrow */}
        <div className="flex flex-row flex-wrap justify-center gap-6 @[900px]:flex-col @[900px]:gap-8 @[900px]:pl-6 @[900px]:shrink-0 @[900px]:pt-12">

          {/* Group legend */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('legends.controlGroups')}</p>
            {cisGroups.map((group) => (
              <div
                key={group}
                className="flex items-center gap-2 cursor-pointer transition-opacity"
                style={{ opacity: highlightGroup && highlightGroup !== group ? 0.4 : 1 }}
                onMouseEnter={() => { setHighlightGroup(group); setHighlightRisk(null); }}
                onMouseLeave={() => setHighlightGroup(null)}
              >
                <div
                  className="h-3 w-3 rounded-sm shrink-0"
                  style={{ backgroundColor: GROUP_COLORS[group] }}
                />
                <span className="text-sm">{group}</span>
              </div>
            ))}
          </div>

          {/* Risk legend */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('legends.riskScore')}</p>
            <div
              className="flex items-center gap-2 cursor-pointer transition-opacity"
              style={{ opacity: highlightRisk && highlightRisk !== 'low' ? 0.4 : 1 }}
              onMouseEnter={() => { setHighlightRisk('low'); setHighlightGroup(null); }}
              onMouseLeave={() => setHighlightRisk(null)}
            >
              <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: '#22c55e' }} />
              <span className="text-sm text-muted-foreground">{t('legends.low')}</span>
            </div>
            <div
              className="flex items-center gap-2 cursor-pointer transition-opacity"
              style={{ opacity: highlightRisk && highlightRisk !== 'medium' ? 0.4 : 1 }}
              onMouseEnter={() => { setHighlightRisk('medium'); setHighlightGroup(null); }}
              onMouseLeave={() => setHighlightRisk(null)}
            >
              <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: '#eab308' }} />
              <span className="text-sm text-muted-foreground">{t('legends.medium')}</span>
            </div>
            <div
              className="flex items-center gap-2 cursor-pointer transition-opacity"
              style={{ opacity: highlightRisk && highlightRisk !== 'high' ? 0.4 : 1 }}
              onMouseEnter={() => { setHighlightRisk('high'); setHighlightGroup(null); }}
              onMouseLeave={() => setHighlightRisk(null)}
            >
              <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: '#ef4444' }} />
              <span className="text-sm text-muted-foreground">{t('legends.high')}</span>
            </div>
          </div>

          {/* Show inactive toggle — separated */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <span className="text-sm text-muted-foreground">{t('legends.showInactive')}</span>
            </div>
          </div>

          {/* Combined groups section */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('segments.combinedGroups')}</p>

            {/* Instructions */}
            <p className="text-xs text-muted-foreground">{t('segments.ctrlClickHint')}</p>

            {/* Selected controls info + combine button */}
            {selectedForCombine.size > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-blue-500">
                  {t('segments.selected')}: {Array.from(selectedForCombine).sort((a, b) => a - b).map(id =>
                    controls.find(c => c.id === id)?.short
                  ).join(', ')}
                </p>
                {canCombine && (
                  <Button variant="default" size="sm" onClick={handleCombineSelected}>
                    {t('segments.combine')} ({selectedForCombine.size})
                  </Button>
                )}
              </div>
            )}

            {/* Combined groups list */}
            {combinedGroups.length > 0 ? (
              <div className="space-y-2">
                {combinedGroups.map((group, index) => (
                  <div key={group.dbId ?? index} className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                    <div
                      className="h-3 w-3 rounded-sm shrink-0 mt-0.5"
                      style={{ backgroundColor: group.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-xs font-medium cursor-pointer hover:underline"
                        onClick={() => setRenameDialog({ groupIndex: index, name: group.name })}
                        title={t('segments.clickToRename')}
                      >
                        {group.name}
                      </span>
                      <div className="mt-0.5 space-y-0">
                        {group.ids.map(id => {
                          const ctrl = controls.find(c => c.id === id);
                          return (
                            <p key={id} className="text-xs text-muted-foreground leading-tight">
                              {ctrl?.short}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUncombine(index)}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      title={t('segments.uncombine')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground/60">{t('segments.noGroups')}</p>
            )}
          </div>

        </div>
      </div>

      {/* Controls table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full table-fixed">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 w-12">#</th>
              <th className="text-left p-3">{t('table.control')}</th>
              <th className="text-left p-3 w-56">{t('table.group')}</th>
              <th className="text-right p-3 w-28">{t('table.risk')}</th>
            </tr>
          </thead>
          <tbody>
            {controls.map((c) => (
              <tr key={c.id} className="border-t hover:bg-muted/50">
                <td className="p-3 text-muted-foreground">{c.id}</td>
                <td className="p-3 truncate" title={c.title}>{c.title}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: GROUP_COLORS[c.group] }}
                    />
                    <span className="truncate">{c.group}</span>
                  </div>
                </td>
                <td className="text-right p-3">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: riskColor(c.risk) + '20',
                      color: riskColor(c.risk),
                    }}
                  >
                    {c.risk}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
