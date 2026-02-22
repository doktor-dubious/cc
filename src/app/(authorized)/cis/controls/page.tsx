'use client';

import { useState }          from 'react';
import { useRouter }         from 'next/navigation';
import { useTranslations }   from 'next-intl';
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts';

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

// ── Derived data ────────────────────────────────────────────────────────────

// Outer ring: one segment per control, coloured by group
const outerData = controls.map((c) => ({
  name:  c.short,
  title: c.title,
  value: 1,                       // equal-sized segments
  fill:  GROUP_COLORS[c.group],
  group: c.group,
  id:    c.id,
}));

// Inner ring: one segment per control, coloured by risk score
function riskColor(risk: number): string {
  if (risk <= 33) return '#22c55e';  // green
  if (risk <= 66) return '#eab308';  // yellow
  return '#ef4444';                   // red
}

const innerData = controls.map((c) => ({
  name:  c.short,
  title: c.title,
  value: 1,
  fill:  riskColor(c.risk),
  risk:  c.risk,
  id:    c.id,
}));

// Unique groups for legend
const groups = Object.keys(GROUP_COLORS);

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

// ── Active-sector renderer (outer ring) ─────────────────────────────────────

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
  const titleLines = wrapText(payload.title);
  const totalLines = titleLines.length + 1; // +1 for group subtitle
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
      {/* Centre text on hover */}
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
  const totalLines = titleLines.length + 1; // +1 for risk subtitle
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
  const [activeOuter, setActiveOuter] = useState<number | undefined>(undefined);
  const [activeInner, setActiveInner] = useState<number | undefined>(undefined);
  const [highlightGroup, setHighlightGroup] = useState<string | null>(null);
  const [highlightRisk, setHighlightRisk] = useState<string | null>(null); // 'low' | 'medium' | 'high'

  // Only one ring active at a time
  const handleOuterEnter = (_: any, index: number) => {
    setActiveOuter(index);
    setActiveInner(undefined);
  };

  const handleInnerEnter = (_: any, index: number) => {
    setActiveInner(index);
    setActiveOuter(undefined);
  };

  // Click on segment → navigate to safeguards page
  const handleSegmentClick = (_: any, index: number) => {
    const controlId = controls[index].id;
    router.push(`/cis/safeguards?control=${controlId}`);
  };

  const handleMouseLeave = () => {
    setActiveOuter(undefined);
    setActiveInner(undefined);
    setHighlightGroup(null);
    setHighlightRisk(null);
  };

  // Custom label — only show for highlighted segments (or all if no highlight)
  const renderOuterLabel = (props: any) => {
    const RADIAN = Math.PI / 180;
    const { cx, cy, midAngle, outerRadius, name, index } = props;
    const control = controls[index];

    // Hide label if a group/risk is highlighted and this segment doesn't match
    if (highlightGroup && control.group !== highlightGroup) return null;
    if (highlightRisk) {
      const band = control.risk <= 33 ? 'low' : control.risk <= 66 ? 'medium' : 'high';
      if (band !== highlightRisk) return null;
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

  // Determine opacity for outer ring cells
  const outerOpacity = (index: number) => {
    if (!highlightGroup && !highlightRisk) return 1;
    if (highlightGroup) return controls[index].group === highlightGroup ? 1 : 0.15;
    return 1; // risk highlight doesn't affect outer ring
  };

  // Determine opacity for inner ring cells
  const innerOpacity = (index: number) => {
    if (!highlightGroup && !highlightRisk) return 1;
    if (highlightGroup) return controls[index].group === highlightGroup ? 1 : 0.15;
    if (highlightRisk) {
      const r = controls[index].risk;
      const band = r <= 33 ? 'low' : r <= 66 ? 'medium' : 'high';
      return band === highlightRisk ? 1 : 0.15;
    }
    return 1;
  };

  return (
    <div className="@container p-2 space-y-6">

      {/* Chart + Legends */}
      <div className="flex flex-col @[900px]:flex-row @[900px]:items-center" onMouseLeave={handleMouseLeave}>

        {/* Chart */}
        <div className="flex-1 min-w-0" style={{ height: 'calc(100vh - 100px)', minHeight: 500 }}>
          <ResponsiveContainer width="100%" height="100%" aspect={undefined}>
            <PieChart>
              {/* Inner ring — risk scores (slim, flush against outer) */}
              <Pie
                data={innerData}
                dataKey="value"
                cx="50%"
                cy="50%"
                startAngle={90}
                endAngle={-270}
                innerRadius="53%"
                outerRadius="58%"
                activeIndex={activeInner}
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

              {/* Outer ring — control groups */}
              <Pie
                data={outerData}
                dataKey="value"
                cx="50%"
                cy="50%"
                startAngle={90}
                endAngle={-270}
                innerRadius="58%"
                outerRadius="78%"
                activeIndex={activeOuter}
                activeShape={renderActiveShape}
                onMouseEnter={handleOuterEnter}
                onClick={handleSegmentClick}
                label={renderOuterLabel}
                isAnimationActive={false}
                strokeWidth={2}
                className="cursor-pointer"
                stroke="var(--background)"
              >
                {outerData.map((entry, index) => (
                  <Cell key={`outer-${index}`} fill={entry.fill} opacity={outerOpacity(index)} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legends — beside chart on wide screens, below on narrow */}
        <div className="flex flex-row flex-wrap justify-center gap-6 @[900px]:flex-col @[900px]:gap-8 @[900px]:pl-6 @[900px]:shrink-0">

          {/* Group legend */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('legends.controlGroups')}</p>
            {groups.map((group) => (
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
