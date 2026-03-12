'use client';

import { useState, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Download, FileText, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { generateCesReport, type CesReport, type RiskLevel } from '@/lib/ces/ces-report-generator';
import type { ThirdPartyCompanyObj } from '@/lib/database/third-party';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } from 'docx';
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

// ── Report page content ───────────────────────────────────────────────────────

function CesReportContent() {
  const t      = useTranslations('CES');
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [company, setCompany]       = useState<ThirdPartyCompanyObj | null>(null);
  const [report, setReport]         = useState<CesReport | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!id) { setIsLoading(false); return; }

    fetch(`/api/third-party/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setCompany(data.data);
          setReport(generateCesReport(data.data));
        }
      })
      .catch(() => toast.error('Failed to load company'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleExportPdf = () => {
    setIsExporting(true);
    try { window.print(); }
    finally { setIsExporting(false); }
  };

  const handleExportDocx = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: report.companyName, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
            new Paragraph({ text: t('report.title'), heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }),
            new Paragraph({ text: `${t('report.generated')}: ${report.generatedDate}`, spacing: { after: 300 } }),

            new Paragraph({
              children: [
                new TextRun({ text: `${t('report.overallScore')}: `, bold: true }),
                new TextRun({ text: `${report.overallScore}/100 — ${report.riskLevel}` }),
              ],
              spacing: { after: 400 },
            }),

            new Paragraph({ text: t('report.categories'), heading: HeadingLevel.HEADING_3, spacing: { before: 400, after: 200 } }),

            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Category', bold: true })] })], width: { size: 40, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t('report.score'), bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t('report.riskLevel'), bold: true })] })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t('report.keyFindings'), bold: true })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
                  ],
                }),
                ...report.categories.map(cat =>
                  new TableRow({
                    children: [
                      new TableCell({ children: [new Paragraph({ text: cat.name })] }),
                      new TableCell({ children: [new Paragraph({ text: `${cat.score}`, alignment: AlignmentType.CENTER })] }),
                      new TableCell({ children: [new Paragraph({ text: cat.riskLevel })] }),
                      new TableCell({ children: cat.findings.map(f => new Paragraph({ text: `• ${f}`, spacing: { after: 80 } })) }),
                    ],
                  })
                ),
              ],
            }),

            new Paragraph({ text: t('report.recommendations'), heading: HeadingLevel.HEADING_3, spacing: { before: 400, after: 200 } }),
            ...report.recommendations.map(rec => new Paragraph({ text: rec, bullet: { level: 0 }, spacing: { after: 100 } })),

            new Paragraph({ text: t('report.footer.confidential'), spacing: { before: 600, after: 50 } }),
            new Paragraph({ text: t('report.footer.generatedBy'), spacing: { after: 50 } }),
            new Paragraph({ text: t('report.footer.version') }),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${report.companyName.replace(/\s+/g, '_')}_CES_Report.docx`);
    }
    catch (error) {
      console.error('DOCX export failed:', error);
      toast.error('Failed to export DOCX');
    }
    finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company || !report) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Company not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/reports/ces')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to CES
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden p-6 border-b bg-muted/30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => router.push('/reports/ces')}
          >
            <ArrowLeft size={16} />
            {t('report.backToList')}
          </Button>

          <Popover open={exportOpen} onOpenChange={setExportOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                role="combobox"
                aria-expanded={exportOpen}
                className="gap-2"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    {t('report.export')}
                    <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                  </>
                )}
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
        </div>
      </div>

      {/* Report content */}
      <div className="p-8 max-w-4xl mx-auto print:p-4">
        {/* Header */}
        <div className="mb-8 pb-6 border-b-2 border-foreground/20">
          <h1 className="text-3xl font-bold mb-1">{report.companyName}</h1>
          <h2 className="text-xl text-muted-foreground font-medium mb-1">{t('report.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('report.generated')}: {report.generatedDate}</p>
        </div>

        {/* Overall score */}
        <div className="mb-8 p-4 border rounded-lg flex items-center gap-4 bg-muted/20">
          <div className="text-4xl font-bold tabular-nums">{report.overallScore}</div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">{t('report.overallScore')}</div>
            <RiskBadge level={report.riskLevel} />
          </div>
        </div>

        {/* Categories */}
        <section className="mb-10">
          <h3 className="text-lg font-semibold italic mb-4">{t('report.categories')}</h3>
          <div className="space-y-4">
            {report.categories.map(cat => (
              <div key={cat.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{cat.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground tabular-nums">{cat.score}/100</span>
                    <RiskBadge level={cat.riskLevel} />
                  </div>
                </div>
                {cat.findings.length > 0 ? (
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    {cat.findings.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground italic">{t('report.noFindings')}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Recommendations */}
        <section className="mb-10">
          <h3 className="text-lg font-semibold italic mb-4">{t('report.recommendations')}</h3>
          <ul className="space-y-2">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/90">
                <span className="shrink-0 mt-0.5 text-primary">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </section>

        {/* Footer */}
        <div className="pt-6 border-t border-foreground/20 text-xs text-muted-foreground space-y-1">
          <p>{t('report.footer.confidential')}</p>
          <p>{t('report.footer.generatedBy')}</p>
          <p>{t('report.footer.version')}</p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          @page { margin: 2cm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          section { page-break-inside: avoid; }
        }
      `}</style>
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
