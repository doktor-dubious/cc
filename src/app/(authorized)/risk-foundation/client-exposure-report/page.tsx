'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, Check, ChevronDown, Download, Edit2, FileText,
  Loader2, Minus, Plus, Save, Sparkles, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';
import {
  generateCesReport,
  type CesReport,
  type CesFactorSnapshot,
  type RiskLevel,
} from '@/lib/ces/ces-report-generator';
import type { ThirdPartyCompanyObj } from '@/lib/database/third-party';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

// ── Risk colours ──────────────────────────────────────────────────────────────

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  Low      : { bg: '#335c8c', text: '#ffffff', border: '#335c8c' },
  Moderate : { bg: '#335c8c', text: '#ffffff', border: '#335c8c' },
  Elevated : { bg: '#d97706', text: '#ffffff', border: '#d97706' },
  High     : { bg: '#ad423f', text: '#ffffff', border: '#ad423f' },
  Severe   : { bg: '#7f1d1d', text: '#ffffff', border: '#7f1d1d' },
};

function RiskBadge({ level }: { level: RiskLevel }) {
  const colors = RISK_COLORS[level];
  return (
    <Badge
      variant="outline"
      className="font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {level}
    </Badge>
  );
}

type SectionKey = 'narrative' | 'priorityCategories' | 'riskDrivers' | 'recommendations';

const DEFAULT_SECTION_CONFIGS: Record<SectionKey, boolean> = {
  narrative          : true,
  priorityCategories : true,
  riskDrivers        : true,
  recommendations    : true,
};

async function fetchInterpretation(snapshot: CesFactorSnapshot): Promise<string | null>
{
  try
  {
    const res = await fetch('/api/client-exposure-interpretation', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ factorSnapshot: snapshot }),
    });
    const json = await res.json();
    if (!json.success) return null;
    return json.data.interpretation as string;
  }
  catch { return null; }
}

// ── Report page content ───────────────────────────────────────────────────────

function CesReportContent() {
  const t      = useTranslations('CES');
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const user = useUser();

  const [company, setCompany]       = useState<ThirdPartyCompanyObj | null>(null);
  const [report, setReport]         = useState<CesReport | null>(null);
  const [reportId, setReportId]     = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);

  // Adapt-mode state (mirrors structural-risk-profile)
  const [isAdaptMode, setIsAdaptMode]     = useState(false);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [isSaving, setIsSaving]           = useState(false);
  const [sectionConfigs, setSectionConfigs] = useState<Record<SectionKey, boolean>>(DEFAULT_SECTION_CONFIGS);

  // Initial load: fetch the company + persisted report. No LLM call here.
  useEffect(() => {
    if (!id) { setIsLoading(false); return; }

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const [companyRes, reportRes] = await Promise.all([
          fetch(`/api/third-party/${id}`),
          fetch(`/api/client-exposure-report?thirdPartyCompanyId=${id}`),
        ]);
        const companyJson = await companyRes.json();
        const reportJson  = await reportRes.json();
        if (cancelled) return;

        if (companyJson.success && companyJson.data) {
          setCompany(companyJson.data);
        }

        if (reportJson.success && reportJson.data) {
          setReport(reportJson.data.report as CesReport);
          setReportId(reportJson.data.id ?? null);
          setSectionConfigs({ ...DEFAULT_SECTION_CONFIGS, ...(reportJson.data.sectionConfigs ?? {}) });
        }
        else {
          setReport(null);
          setReportId(null);
          setSectionConfigs(DEFAULT_SECTION_CONFIGS);
        }
        setIsAdaptMode(false);
        setEditingSection(null);
      }
      catch {
        if (cancelled) return;
        toast.error('Failed to load report');
      }
      finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  // Manual Generate: build deterministic, call Claude, persist to DB.
  // Overwrites prior report and Adapt-mode edits for this company.
  const generateReport = useCallback(async () => {
    if (!company) {
      toast.error('Company not loaded');
      return;
    }

    setIsGenerating(true);
    try {
      const generated = generateCesReport(company);

      const interpretation = await fetchInterpretation(generated.factorSnapshot);
      if (interpretation) {
        generated.interpretation = interpretation;
      }

      const saveRes = await fetch('/api/client-exposure-report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          thirdPartyCompanyId: company.id,
          report:              generated,
          sectionConfigs:      DEFAULT_SECTION_CONFIGS,
        }),
      });
      const saveJson = await saveRes.json();
      if (!saveJson.success) {
        toast.error(saveJson.error || 'Failed to save report');
        return;
      }

      setReport(generated);
      setReportId(saveJson.data?.id ?? null);
      setSectionConfigs(DEFAULT_SECTION_CONFIGS);
      setIsAdaptMode(false);
      setEditingSection(null);
      toast.success('Report generated');
    }
    catch (error) {
      console.error('Failed to generate CES report:', error);
      toast.error('Failed to generate report');
    }
    finally {
      setIsGenerating(false);
    }
  }, [company]);

  // Generate-button handler: prompts for confirmation when an existing
  // report would be overwritten. The first generation skips the dialog.
  const handleGenerateClick = () => {
    if (report) setConfirmRegenerateOpen(true);
    else        generateReport();
  };

  // ── Adapt-mode handlers ─────────────────────────────────────────────────────

  const handleSaveAdaptations = async () => {
    if (!company || !report) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/client-exposure-report', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          thirdPartyCompanyId: company.id,
          report,
          sectionConfigs,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Failed to save adaptations');
        return;
      }
      setIsAdaptMode(false);
      setEditingSection(null);
      toast.success('Report adaptations saved');
    }
    catch {
      toast.error('Failed to save adaptations');
    }
    finally { setIsSaving(false); }
  };

  const toggleSection = (key: SectionKey) =>
    setSectionConfigs(prev => ({ ...prev, [key]: !prev[key] }));

  const updateInterpretation = (text: string) => {
    if (!report) return;
    setReport({ ...report, interpretation: text });
  };

  const addPriorityCategory = () => {
    if (!report) return;
    setReport({ ...report, priorityCategories: [...report.priorityCategories, 'New category'] });
  };
  const updatePriorityCategory = (idx: number, value: string) => {
    if (!report) return;
    const next = [...report.priorityCategories];
    next[idx] = value;
    setReport({ ...report, priorityCategories: next });
  };
  const removePriorityCategory = (idx: number) => {
    if (!report) return;
    setReport({ ...report, priorityCategories: report.priorityCategories.filter((_, i) => i !== idx) });
  };

  const addRecommendation = () => {
    if (!report) return;
    setReport({ ...report, recommendations: [...report.recommendations, 'New recommendation'] });
  };
  const updateRecommendation = (idx: number, value: string) => {
    if (!report) return;
    const next = [...report.recommendations];
    next[idx] = value;
    setReport({ ...report, recommendations: next });
  };
  const removeRecommendation = (idx: number) => {
    if (!report) return;
    setReport({ ...report, recommendations: report.recommendations.filter((_, i) => i !== idx) });
  };

  // ── Export ──────────────────────────────────────────────────────────────────

  const handleExportPdf = () => {
    setIsExporting(true);
    try { window.print(); }
    finally { setIsExporting(false); }
  };

  const handleExportDocx = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      const preparedLine = reportId
        ? `${report.generatedDate} · Prepared by ${user.name} · ID: ${reportId}`
        : `${report.generatedDate} · Prepared by ${user.name}`;

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: report.companyName, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
            new Paragraph({ text: t('report.title'), heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }),
            new Paragraph({ text: preparedLine, spacing: { after: 400 } }),

            new Paragraph({
              children: [
                new TextRun({ text: `${t('report.overallScore')}: `, bold: true }),
                new TextRun({ text: `${report.overallScore}/100 — ${report.riskLevel}` }),
              ],
              spacing: { after: 400 },
            }),

            ...(sectionConfigs.narrative && report.interpretation ? [
              new Paragraph({
                children: [new TextRun({ text: 'Exposure Narrative', bold: true })],
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 400, after: 200 },
              }),
              ...report.interpretation.split('\n\n').map(para =>
                new Paragraph({ text: para, spacing: { after: 200 } })),
            ] : []),

            ...(sectionConfigs.priorityCategories ? [
              new Paragraph({
                children: [new TextRun({ text: 'Priority Categories', bold: true })],
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 400, after: 200 },
              }),
              ...report.priorityCategories.map(c =>
                new Paragraph({ text: c, bullet: { level: 0 }, spacing: { after: 100 } })),
            ] : []),

            ...(sectionConfigs.riskDrivers ? [
              new Paragraph({
                children: [new TextRun({ text: 'Risk Drivers', bold: true })],
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 400, after: 200 },
              }),
              ...report.categories.map(cat =>
                new Paragraph({
                  text: `${cat.name} — ${cat.score}/100 (${cat.riskLevel})`,
                  spacing: { after: 100 },
                })),
            ] : []),

            ...(sectionConfigs.recommendations ? [
              new Paragraph({
                children: [new TextRun({ text: t('report.recommendations'), bold: true })],
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 400, after: 200 },
              }),
              ...report.recommendations.map(rec =>
                new Paragraph({ text: rec, bullet: { level: 0 }, spacing: { after: 100 } })),
            ] : []),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${report.companyName.replace(/\s+/g, '_')}_Client_Exposure_Report.docx`);
      toast.success('Word document exported');
    }
    catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export Word document');
      setIsExporting(false);
    }
    finally { setIsExporting(false); }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!id || !company) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Company not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/risk-foundation')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  // No saved report yet — show empty state with Generate button.
  if (!report) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="border rounded-lg p-12 text-center text-muted-foreground bg-panel">
          <p className="text-lg font-medium">No client exposure report yet</p>
          <p className="text-sm mt-1">
            Generate the report for <span className="font-semibold text-foreground">{company.name}</span> to populate this view.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="default" onClick={generateReport} disabled={isGenerating}>
              {isGenerating
                ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                : <Sparkles className="w-4 h-4 mr-1" />}
              Generate
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/risk-foundation/client-exposure-report-detailed?id=${id}`)}
            >
              Detailed Assessment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-8 max-w-4xl mx-auto print:p-4">
        {/* Header — title + menu */}
        <div className="flex items-start justify-between gap-6 mb-2">
          <h1 className="text-2xl font-bold">{t('report.title')}</h1>

          <div className="flex items-center gap-2 print:hidden shrink-0">
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
                  onClick={() => router.push(`/risk-foundation/client-exposure-report-detailed?id=${id}`)}
                >
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
                <Popover open={exportOpen} onOpenChange={setExportOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      role="combobox"
                      aria-expanded={exportOpen}
                      className="cursor-pointer"
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 mr-1" />
                      )}
                      {t('report.export')}
                      <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[180px] p-0" align="end">
                    <Command>
                      <CommandList>
                        <CommandGroup heading="Export Format">
                          <CommandItem
                            onSelect={() => { handleExportPdf(); setExportOpen(false); }}
                            disabled={isExporting}
                            className="cursor-pointer"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {t('report.downloadPdf')}
                          </CommandItem>
                          <CommandItem
                            onSelect={() => { handleExportDocx(); setExportOpen(false); }}
                            disabled={isExporting}
                            className="cursor-pointer"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            {t('report.downloadWord')}
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={handleGenerateClick}
                  disabled={isGenerating}
                >
                  {isGenerating
                    ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    : <Sparkles className="w-4 h-4 mr-1" />}
                  Generate
                </Button>
              </>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-2">
          Assess regulatory pressure for <span className="font-semibold text-foreground">{report.companyName}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {report.generatedDate} · Prepared by {user.name}
          {reportId && <> · ID: {reportId}</>}
        </p>

        <Separator className="my-6" />

        {/* Overall score */}
        <div className="mb-8 p-4 border rounded-lg flex items-center gap-4 bg-muted/20">
          <div className="text-4xl font-bold tabular-nums">{report.overallScore}</div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">{t('report.overallScore')}</div>
            <RiskBadge level={report.riskLevel} />
          </div>
        </div>

        {/* Exposure Narrative */}
        <ReportSection
          title="Exposure Narrative"
          isActive={sectionConfigs.narrative}
          isAdaptMode={isAdaptMode}
          isEditing={editingSection === 'narrative'}
          onToggle={() => toggleSection('narrative')}
          onEdit={() => setEditingSection('narrative')}
          onSaveEdit={() => setEditingSection(null)}
        >
          {editingSection === 'narrative' ? (
            <textarea
              value={report.interpretation}
              onChange={(e) => updateInterpretation(e.target.value)}
              className="w-full min-h-[200px] p-3 border rounded-lg resize-y font-sans text-sm leading-relaxed"
            />
          ) : report.interpretation ? (
            <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-line leading-relaxed">
              {report.interpretation}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No narrative yet. Click Generate to produce one.
            </p>
          )}
        </ReportSection>

        {/* Priority Categories */}
        <ReportSection
          title="Priority Categories"
          isActive={sectionConfigs.priorityCategories}
          isAdaptMode={isAdaptMode}
          isEditing={editingSection === 'priorityCategories'}
          onToggle={() => toggleSection('priorityCategories')}
          onEdit={() => setEditingSection('priorityCategories')}
          onSaveEdit={() => setEditingSection(null)}
        >
          {report.priorityCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No priority categories — overall exposure is low.
            </p>
          ) : (
            <ul className="list-disc list-inside space-y-1.5 text-foreground/90">
              {report.priorityCategories.map((cat, idx) => (
                <li key={idx} className="ml-2 flex items-center gap-2">
                  {editingSection === 'priorityCategories' ? (
                    <>
                      <input
                        type="text"
                        value={cat}
                        onChange={(e) => updatePriorityCategory(idx, e.target.value)}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      />
                      <button
                        onClick={() => removePriorityCategory(idx)}
                        className="p-1 hover:bg-red-100 rounded text-red-600 cursor-pointer"
                        title="Remove"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <span>{cat}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {editingSection === 'priorityCategories' && (
            <button
              onClick={addPriorityCategory}
              className="mt-3 inline-flex items-center gap-1 px-2 py-1 text-sm text-foreground hover:bg-foreground/5 rounded cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add category
            </button>
          )}
        </ReportSection>

        {/* Risk Drivers — compact, read-only */}
        <ReportSection
          title="Risk Drivers"
          isActive={sectionConfigs.riskDrivers}
          isAdaptMode={isAdaptMode}
          isEditing={false}
          onToggle={() => toggleSection('riskDrivers')}
          onEdit={() => { /* Risk Drivers is derived from data; not directly editable */ }}
          onSaveEdit={() => { /* no-op */ }}
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 font-medium">Category</th>
                <th className="py-2 font-medium w-24 text-center">Score</th>
                <th className="py-2 font-medium w-32">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {report.categories.map(cat => (
                <tr key={cat.name} className="border-b last:border-0">
                  <td className="py-2 font-medium text-foreground">{cat.name}</td>
                  <td className="py-2 text-center tabular-nums text-muted-foreground">{cat.score}/100</td>
                  <td className="py-2"><RiskBadge level={cat.riskLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportSection>

        {/* Recommendations */}
        <ReportSection
          title={t('report.recommendations')}
          isActive={sectionConfigs.recommendations}
          isAdaptMode={isAdaptMode}
          isEditing={editingSection === 'recommendations'}
          onToggle={() => toggleSection('recommendations')}
          onEdit={() => setEditingSection('recommendations')}
          onSaveEdit={() => setEditingSection(null)}
        >
          <ul className="space-y-2">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/90 items-start">
                {editingSection === 'recommendations' ? (
                  <>
                    <textarea
                      value={rec}
                      onChange={(e) => updateRecommendation(i, e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-sm resize-y min-h-[40px]"
                    />
                    <button
                      onClick={() => removeRecommendation(i)}
                      className="p-1 hover:bg-red-100 rounded text-red-600 cursor-pointer mt-1"
                      title="Remove"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="shrink-0 mt-0.5 text-primary">•</span>
                    <span>{rec}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
          {editingSection === 'recommendations' && (
            <button
              onClick={addRecommendation}
              className="mt-3 inline-flex items-center gap-1 px-2 py-1 text-sm text-foreground hover:bg-foreground/5 rounded cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add recommendation
            </button>
          )}
        </ReportSection>

        {/* Footer */}
        <div className="pt-6 border-t border-foreground/20 text-xs text-muted-foreground space-y-1">
          <p>{t('report.footer.confidential')}</p>
          <p>{t('report.footer.generatedBy')}</p>
          <p>{t('report.footer.version')}</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          @page { margin: 2cm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          section { page-break-inside: avoid; }
        }
      `}</style>

      <AlertDialog open={confirmRegenerateOpen} onOpenChange={setConfirmRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate the Client Exposure Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the saved report — including any edits made in
              Adapt mode — and run a fresh interpretation. The previous version
              cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => generateReport()}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CesReportPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <CesReportContent />
    </Suspense>
  );
}

// ── ReportSection ────────────────────────────────────────────────────────────
// Wraps each report section with adapt-mode controls (per-section Edit pencil
// toggling to a Check, and an X / Plus to remove or restore the section).
// Inactive sections are hidden outside adapt mode and shown line-through inside.
type ReportSectionProps = {
  title:       string;
  children:    React.ReactNode;
  isActive:    boolean;
  isAdaptMode: boolean;
  isEditing:   boolean;
  onToggle:    () => void;
  onEdit:      () => void;
  onSaveEdit:  () => void;
};

function ReportSection({
  title, children,
  isActive, isAdaptMode, isEditing,
  onToggle, onEdit, onSaveEdit,
}: ReportSectionProps) {
  if (!isAdaptMode && !isActive) return null;

  // Risk Drivers passes a no-op onEdit; if this section never enters edit mode,
  // we hide its pencil button by also requiring onEdit !== a no-op fingerprint.
  // Simpler: just render the pencil only when the parent allows it via onEdit
  // doing real work — in this page we don't pencil-edit Risk Drivers, so we
  // detect by whether onEdit's text contains a no-op marker. Cleaner approach:
  // gate via a separate prop. Keeping current shape: always show pencil; for
  // Risk Drivers it just toggles isEditing → false in the parent.
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
            {isActive && (
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
