'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check, ChevronDown, Download, Edit2, FileText, Info, ListTree, Loader2,
  Plus, RefreshCw, Save, Sparkles, X,
} from 'lucide-react';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table as DocxTable, TableRow as DocxRow, TableCell as DocxCell, WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/context/OrganizationContext';
import { useUser } from '@/context/UserContext';
import {
  buildSpectrumInputs,
  calculateSafeguardExposureSpectrum,
  LOWER_DISPLAY_LEVEL,
  UPPER_DISPLAY_LEVEL,
} from '@/lib/conc/safeguard-exposure-spectrum';

// Sections the user can toggle / edit while in Adapt mode. The top-line range
// cards are page-essential (data-driven) and not part of this set.
type SectionKey = 'exposureSummary' | 'costDistribution';

const DEFAULT_SECTION_CONFIGS: Record<SectionKey, boolean> = {
  exposureSummary:   true,
  costDistribution:  true,
};

const CATEGORY_LABEL: Record<string, string> = {
  downtime:     'Estimated Downtime Costs',
  ir:           'Incident Response & Forensics (IR)',
  restore:      'System Restoration & Rebuild',
  ebi:          'Extended Business Interruption (EBI)',
  ccl:          'Customer & Contract Loss (CCL)',
  reg:          'Regulatory & Supervisory Cost',
  reputation:   'Reputational Impact',
  governance:   'Management & Governance Cost',
  notification: 'Notification Costs',
};

// The 9 CONC cost categories used for the top-drivers list.
const DRIVER_CATEGORIES = [
  'downtime', 'ir', 'restore', 'ebi', 'ccl',
  'reg', 'reputation', 'governance', 'notification',
] as const;

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

export default function PerSafeguardExposurePage() {
  const router = useRouter();
  const { activeOrganization } = useOrganization();
  const user = useUser();

  // LLM-generated exposure summary. Cached per organization in localStorage so
  // navigating back to the page doesn't re-spend tokens.
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryGeneratedAt, setSummaryGeneratedAt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ── Adapt-mode state (mirrors structural-risk-profile) ───────────────────
  const [isAdaptMode,    setIsAdaptMode]    = useState(false);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [isSaving,       setIsSaving]       = useState(false);
  const [sectionConfigs, setSectionConfigs] = useState<Record<SectionKey, boolean>>(DEFAULT_SECTION_CONFIGS);

  const summaryStorageKey = (orgId: string) => `per-safeguard-exposure-summary-${orgId}`;
  const configStorageKey  = (orgId: string) => `per-safeguard-exposure-config-${orgId}`;

  useEffect(() => {
    // Reset adapt-mode whenever the active organization changes — edits are
    // scoped per-org and shouldn't bleed across switches.
    setIsAdaptMode(false);
    setEditingSection(null);

    const orgId = activeOrganization?.id;
    if (!orgId) {
      setSummary(null);
      setSummaryGeneratedAt(null);
      setSectionConfigs(DEFAULT_SECTION_CONFIGS);
      return;
    }

    // Load summary
    const cached = localStorage.getItem(summaryStorageKey(orgId));
    if (!cached) {
      setSummary(null);
      setSummaryGeneratedAt(null);
    } else {
      try {
        const parsed = JSON.parse(cached) as { text: string; generatedAt: string };
        setSummary(parsed.text);
        setSummaryGeneratedAt(parsed.generatedAt);
      } catch {
        localStorage.removeItem(summaryStorageKey(orgId));
        setSummary(null);
        setSummaryGeneratedAt(null);
      }
    }

    // Load section visibility
    const cfgRaw = localStorage.getItem(configStorageKey(orgId));
    if (!cfgRaw) {
      setSectionConfigs(DEFAULT_SECTION_CONFIGS);
      return;
    }
    try {
      const parsed = JSON.parse(cfgRaw) as Partial<Record<SectionKey, boolean>>;
      setSectionConfigs({ ...DEFAULT_SECTION_CONFIGS, ...parsed });
    } catch {
      localStorage.removeItem(configStorageKey(orgId));
      setSectionConfigs(DEFAULT_SECTION_CONFIGS);
    }
  }, [activeOrganization?.id]);

  // Compute the L1..L5 spectrum once per active organization.
  const result = useMemo(() => {
    if (!activeOrganization) return null;
    const { concBase, breachBase } = buildSpectrumInputs(activeOrganization);
    return calculateSafeguardExposureSpectrum(concBase, breachBase);
  }, [activeOrganization]);

  // Top cost drivers: one row per CONC category, valued at L4 (best) → L1 (worst),
  // mid of each severity band. Sorted by worst-case descending.
  const drivers = useMemo(() => {
    if (!result || !result.ok) return [];
    const lLow  = result.spectrum.byLevel[LOWER_DISPLAY_LEVEL].concCosts;
    const lHigh = result.spectrum.byLevel[UPPER_DISPLAY_LEVEL].concCosts;
    const rows = DRIVER_CATEGORIES.map((cat) => ({
      key:   cat,
      label: CATEGORY_LABEL[cat] ?? cat,
      best:  lHigh[cat]?.mid ?? 0,
      worst: lLow[cat]?.mid ?? 0,
    }));
    return rows.sort((a, b) => b.worst - a.worst);
  }, [result]);

  // ── Snapshot builder + generator (LLM call) ──────────────────────────────
  const buildSnapshot = () => {
    if (!result || !result.ok || !activeOrganization) return null;
    const { byLevel, byControl } = result.spectrum;
    const lLow  = byLevel[LOWER_DISPLAY_LEVEL];
    const lHigh = byLevel[UPPER_DISPLAY_LEVEL];

    const topControls = [...byControl]
      .sort((a, b) =>
        (b.avoidableByLevel[LOWER_DISPLAY_LEVEL] ?? 0) -
        (a.avoidableByLevel[LOWER_DISPLAY_LEVEL] ?? 0),
      )
      .slice(0, 5)
      .map((c) => ({
        controlId:      c.controlId,
        controlTitle:   c.controlTitle,
        avoidableBest:  c.avoidableByLevel[UPPER_DISPLAY_LEVEL] ?? 0,
        avoidableWorst: c.avoidableByLevel[LOWER_DISPLAY_LEVEL] ?? 0,
        topCategory:    c.topCategory ? (CATEGORY_LABEL[c.topCategory] ?? c.topCategory) : null,
      }));

    const catTotals: Record<string, number> = {};
    for (const imp of lLow.impacts) {
      for (const [cat, v] of Object.entries(imp.categoryBreakdown)) {
        catTotals[cat] = (catTotals[cat] ?? 0) + (v as number);
      }
    }
    const catSum = Object.values(catTotals).reduce((s, v) => s + v, 0);
    const topCostCategories = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, v]) => ({
        category: CATEGORY_LABEL[cat] ?? cat,
        share:    catSum > 0 ? v / catSum : 0,
      }));

    return {
      organizationName: activeOrganization.name,
      sector:           activeOrganization.naceSection ?? null,
      size:             activeOrganization.size ?? null,
      totalBreachCost:         { best: lHigh.concTotalMid,  worst: lLow.concTotalMid  },
      totalAvoidableLoss:      { best: lHigh.totalAvoidable, worst: lLow.totalAvoidable },
      breachProbability:       { best: lHigh.probability,    worst: lLow.probability    },
      totalAnnualExpectedLoss: { best: lHigh.totalAle,        worst: lLow.totalAle        },
      topControls,
      topCostCategories,
    };
  };

  const generateSummary = async () => {
    const orgId = activeOrganization?.id;
    if (!orgId) return;
    const snapshot = buildSnapshot();
    if (!snapshot) {
      toast.error('Unable to build exposure snapshot');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch('/api/per-safeguard-exposure-interpretation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ snapshot }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to generate summary');
        return;
      }
      const text = json.data.interpretation as string;
      const generatedAt = new Date().toISOString();
      setSummary(text);
      setSummaryGeneratedAt(generatedAt);
      localStorage.setItem(summaryStorageKey(orgId), JSON.stringify({ text, generatedAt }));
      toast.success('Summary generated');
    } catch (error) {
      console.error('Failed to generate exposure summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Adapt-mode handlers (mirror structural-risk-profile) ─────────────────

  const handleSaveAdaptations = () => {
    const orgId = activeOrganization?.id;
    if (!orgId) return;
    setIsSaving(true);
    try {
      // Persist whatever's currently in `summary` (the textarea writes
      // straight to that state) plus the section visibility map.
      if (summary !== null) {
        const generatedAt = summaryGeneratedAt ?? new Date().toISOString();
        localStorage.setItem(
          summaryStorageKey(orgId),
          JSON.stringify({ text: summary, generatedAt }),
        );
        setSummaryGeneratedAt(generatedAt);
      }
      localStorage.setItem(configStorageKey(orgId), JSON.stringify(sectionConfigs));
      setIsAdaptMode(false);
      setEditingSection(null);
      toast.success('Report adaptations saved');
    } catch (error) {
      console.error('Failed to save adaptations:', error);
      toast.error('Failed to save adaptations');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (key: SectionKey) =>
    setSectionConfigs(prev => ({ ...prev, [key]: !prev[key] }));

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExportPdf = () => {
    setIsExporting(true);
    try { window.print(); }
    finally { setIsExporting(false); }
  };

  const handleExportDocx = async () => {
    if (!result || !result.ok || !activeOrganization) return;
    setIsExporting(true);
    try {
      const lLow  = result.spectrum.byLevel[LOWER_DISPLAY_LEVEL];
      const lHigh = result.spectrum.byLevel[UPPER_DISPLAY_LEVEL];
      const rangeLabel = `L${UPPER_DISPLAY_LEVEL} → L${LOWER_DISPLAY_LEVEL}`;

      const headerCell = (text: string, widthPct: number) => new DocxCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
        width:    { size: widthPct, type: WidthType.PERCENTAGE },
        shading:  { fill: 'E5E7EB' },
      });

      const topLineTable = new DocxTable({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new DocxRow({ children: [
            headerCell('Metric',     40),
            headerCell('Best case',  30),
            headerCell('Worst case', 30),
          ]}),
          new DocxRow({ children: [
            new DocxCell({ children: [new Paragraph({ text: 'Total breach cost (loss-given-event)' })] }),
            new DocxCell({ children: [new Paragraph({ text: formatMoney(lHigh.concTotalMid) })] }),
            new DocxCell({ children: [new Paragraph({ text: formatMoney(lLow.concTotalMid) })] }),
          ]}),
          new DocxRow({ children: [
            new DocxCell({ children: [new Paragraph({ text: 'Avoidable loss' })] }),
            new DocxCell({ children: [new Paragraph({ text: formatMoney(lHigh.totalAvoidable) })] }),
            new DocxCell({ children: [new Paragraph({ text: formatMoney(lLow.totalAvoidable) })] }),
          ]}),
          new DocxRow({ children: [
            new DocxCell({ children: [new Paragraph({ text: 'Annual breach probability' })] }),
            new DocxCell({ children: [new Paragraph({ text: lHigh.probability !== null ? formatPercent(lHigh.probability) : '—' })] }),
            new DocxCell({ children: [new Paragraph({ text: lLow.probability !== null ? formatPercent(lLow.probability) : '—' })] }),
          ]}),
          new DocxRow({ children: [
            new DocxCell({ children: [new Paragraph({ text: 'Annual expected loss (ALE)' })] }),
            new DocxCell({ children: [new Paragraph({ text: lHigh.totalAle !== null ? formatMoney(lHigh.totalAle) : '—' })] }),
            new DocxCell({ children: [new Paragraph({ text: lLow.totalAle !== null ? formatMoney(lLow.totalAle) : '—' })] }),
          ]}),
        ],
      });

      const driversTable = new DocxTable({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new DocxRow({ children: [
            headerCell('Cost driver', 50),
            headerCell('Best case',   25),
            headerCell('Worst case',  25),
          ]}),
          ...drivers.map((d) =>
            new DocxRow({ children: [
              new DocxCell({ children: [new Paragraph({ text: d.label })] }),
              new DocxCell({ children: [new Paragraph({ text: formatMoney(d.best) })] }),
              new DocxCell({ children: [new Paragraph({ text: formatMoney(d.worst) })] }),
            ]}),
          ),
        ],
      });

      const preparedLine = `Prepared by ${user.name}`;
      const generatedDate = new Date().toLocaleDateString();

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: activeOrganization.name, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
            new Paragraph({ text: 'Per-Safeguard Financial Exposure', heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }),
            new Paragraph({ text: `Cost of non-compliance across the CMMI maturity spectrum (${rangeLabel}).`, spacing: { after: 100 } }),
            new Paragraph({ text: `${generatedDate} · ${preparedLine}`, spacing: { after: 400 } }),

            new Paragraph({
              children: [new TextRun({ text: 'Top-line ranges', bold: true })],
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 200, after: 200 },
            }),
            topLineTable,

            ...(summary && sectionConfigs.exposureSummary ? [
              new Paragraph({
                children: [new TextRun({ text: 'Exposure Summary', bold: true })],
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 400, after: 200 },
              }),
              ...summary.split('\n\n').map((para) =>
                new Paragraph({ text: para, spacing: { after: 200 } })),
            ] : []),

            ...(sectionConfigs.costDistribution ? [
              new Paragraph({
                children: [new TextRun({ text: 'Cost Distribution by Category', bold: true })],
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 400, after: 200 },
              }),
              driversTable,
            ] : []),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${activeOrganization.name.replace(/\s+/g, '_')}_Per_Safeguard_Financial_Exposure.docx`);
      toast.success('Word document exported');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export Word document');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Empty / error states ──────────────────────────────────────────────────
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
          <h1 className="text-2xl font-bold tracking-tight">Per-Safeguard Financial Exposure</h1>
          <p className="text-muted-foreground mt-1">
            Cost of non-compliance attributed to each CIS control, across the full CMMI range.
          </p>
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
  // Range reads best-case → worst-case (small € → large €).
  const rangeLabel = `L${UPPER_DISPLAY_LEVEL} → L${LOWER_DISPLAY_LEVEL}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 print:p-4">

      {/* ── Title + menu ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6 mb-2">
        <h1 className="text-2xl font-bold">Per-Safeguard Financial Exposure</h1>

        <div className="flex items-center gap-2 shrink-0 print:hidden">
          {isAdaptMode ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveAdaptations}
              disabled={isSaving}
            >
              {isSaving
                ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                : <Save className="w-4 h-4 mr-1" />}
              {isSaving ? 'Saving' : 'Save'}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => router.push('/risk-foundation/per-safeguard-exposure-details')}
              >
                <ListTree className="w-4 h-4 mr-1" />
                Detailed Assessment
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setIsAdaptMode(true)}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="cursor-pointer" disabled={isExporting}>
                    {isExporting
                      ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      : <Download className="w-4 h-4 mr-1" />}
                    Export
                    <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportPdf} className="cursor-pointer">
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportDocx} className="cursor-pointer">
                    <FileText className="w-4 h-4 mr-2" />
                    Word
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={generateSummary}
                disabled={isGenerating}
              >
                {isGenerating
                  ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  : summary
                    ? <RefreshCw className="w-4 h-4 mr-1" />
                    : <Sparkles className="w-4 h-4 mr-1" />}
                {isGenerating ? 'Generating' : summary ? 'Regenerate' : 'Generate'}
              </Button>
            </>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-2">
        Cost of non-compliance across the CMMI maturity spectrum
      </p>
      <p className="text-sm text-muted-foreground mb-2">
        Financial counterpart to the{' '}
        <Link
          href="/risk-foundation/structural-risk-profile"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Structural Risk Profile
        </Link>
        {' '}— read that first for the qualitative picture.
      </p>
      <p className="text-sm text-muted-foreground">
        L{UPPER_DISPLAY_LEVEL} = best case (smallest €) · L{LOWER_DISPLAY_LEVEL} = worst case (largest €)
        {summaryGeneratedAt && <> · Summary generated {new Date(summaryGeneratedAt).toLocaleString()}</>}
      </p>

      <Separator className="my-6" />

      {/* ── Range cards (top-line totals) ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <RangeCard
          label="Total breach cost"
          hint="Loss-given-event"
          lowValue={formatMoney(lLow.concTotalMid)}
          highValue={formatMoney(lHigh.concTotalMid)}
          rangeLabel={rangeLabel}
        />
        <RangeCard
          label="Avoidable loss"
          hint="Marginal € at risk"
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
          hint="P(breach) × loss"
          lowValue={lLow.totalAle !== null ? formatMoney(lLow.totalAle) : '—'}
          highValue={lHigh.totalAle !== null ? formatMoney(lHigh.totalAle) : '—'}
          rangeLabel={rangeLabel}
        />
      </div>

      {/* ── Exposure Summary (LLM-generated prose) ──────────────────────── */}
      <ReportSection
        title="Exposure Summary"
        isActive={sectionConfigs.exposureSummary}
        isAdaptMode={isAdaptMode}
        isEditing={editingSection === 'exposureSummary'}
        editable={summary !== null}
        onToggle={() => toggleSection('exposureSummary')}
        onEdit={() => setEditingSection('exposureSummary')}
        onSaveEdit={() => setEditingSection(null)}
      >
        {editingSection === 'exposureSummary' && summary !== null ? (
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full min-h-[200px] p-3 border rounded-lg resize-y font-sans text-sm leading-relaxed"
          />
        ) : summary ? (
          <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-line leading-relaxed">
            {summary}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click <span className="font-medium text-foreground">Generate</span> above for a
            plain-English interpretation of the ranges and cost distribution below.
            Grounded only on the figures shown on this page.
          </p>
        )}
      </ReportSection>

      {/* ── Cost Distribution by Category ───────────────────────────────── */}
      <ReportSection
        title="Cost Distribution by Category"
        isActive={sectionConfigs.costDistribution}
        isAdaptMode={isAdaptMode}
        isEditing={false}
        editable={false}
        onToggle={() => toggleSection('costDistribution')}
        onEdit={() => {}}
        onSaveEdit={() => {}}
      >
        <div className="rounded-lg border bg-panel divide-y">
          {drivers.map((d) => (
            <div
              key={d.key}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <span className="text-sm">{d.label}</span>
              <div className="flex items-baseline gap-2 font-mono tabular-nums shrink-0">
                <span className="text-sm">{formatMoney(d.best)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-sm">{formatMoney(d.worst)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>
            Each category is shown at L{UPPER_DISPLAY_LEVEL} → L{LOWER_DISPLAY_LEVEL} (best → worst maturity),
            mid of CONC severity band. Sorted by worst-case exposure.
          </span>
        </div>
      </ReportSection>

      <style jsx global>{`
        @media print {
          @page { margin: 2cm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:p-4 { padding: 1rem !important; }
          section { page-break-inside: avoid; }
          table { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

// ── ReportSection ──────────────────────────────────────────────────────────
// Mirrors the structural-risk-profile helper. Inactive sections are hidden
// outside Adapt mode and rendered line-through inside it. The pencil-to-check
// edit toggle only renders when both the section is active AND the section
// has editable content (`editable` prop).
type ReportSectionProps = {
  title:       string;
  children:    React.ReactNode;
  isActive:    boolean;
  isAdaptMode: boolean;
  isEditing:   boolean;
  editable:    boolean;
  onToggle:    () => void;
  onEdit:      () => void;
  onSaveEdit:  () => void;
};

function ReportSection({
  title, children,
  isActive, isAdaptMode, isEditing, editable,
  onToggle, onEdit, onSaveEdit,
}: ReportSectionProps) {
  if (!isAdaptMode && !isActive) return null;

  return (
    <section className={cn('mb-10 relative', !isActive && 'opacity-50')}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn(
          'text-lg font-semibold italic',
          !isActive && 'line-through text-muted-foreground',
        )}>
          {title}
        </h3>

        {isAdaptMode && (
          <div className="flex items-center gap-1 print:hidden">
            {isActive && editable && (
              <button
                onClick={isEditing ? onSaveEdit : onEdit}
                className="flex h-7 w-7 items-center justify-center rounded border-2 border-foreground/50 bg-foreground/10 text-foreground hover:bg-foreground/20 hover:scale-105 transition-all cursor-pointer"
                title={isEditing ? 'Save changes' : 'Edit section'}
              >
                {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
              </button>
            )}
            <button
              onClick={onToggle}
              className="flex h-7 w-7 items-center justify-center rounded border-2 border-foreground/50 bg-foreground/10 text-foreground hover:bg-foreground/20 hover:scale-105 transition-all cursor-pointer"
              title={isActive ? 'Remove section' : 'Restore section'}
            >
              {isActive ? <X size={14} /> : <Plus size={14} />}
            </button>
          </div>
        )}
      </div>

      {isActive && (
        <div className={cn(
          isEditing && 'border-2 border-blue-500/30 rounded-lg p-4 bg-blue-500/5',
        )}>
          {children}
        </div>
      )}
    </section>
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
