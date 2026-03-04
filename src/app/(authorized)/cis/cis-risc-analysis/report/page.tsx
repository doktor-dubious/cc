'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useOrganization } from '@/context/OrganizationContext';
import {
  ArrowLeft,
  Download,
  FileDown,
  FileText,
  Loader2,
  Settings,
  Save,
  Edit2,
  Check,
  Minus,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { XIcon, type XIconHandle } from '@/components/animate-ui/icons/x';
import { PlusIcon, type PlusIconHandle } from '@/components/animate-ui/icons/plus';
import { generateStructuralRiskReport, type StructuralRiskReport, type RiskLevel } from '@/lib/risk-report/report-generator';
import type { GapRecommendation, OrganizationProfile } from '@/lib/gap-analysis/recommendation-engine';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

const RISK_LEVEL_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  Low: { bg: '#335c8c', text: '#ffffff', border: '#335c8c' },
  Moderate: { bg: '#335c8c', text: '#ffffff', border: '#335c8c' },
  Elevated: { bg: '#25693e', text: '#ffffff', border: '#25693e' },
  High: { bg: '#ad423f', text: '#ffffff', border: '#ad423f' },
  Severe: { bg: '#ad423f', text: '#ffffff', border: '#ad423f' },
};

const RISK_LEVELS: RiskLevel[] = ['Low', 'Moderate', 'Elevated', 'High', 'Severe'];

type SectionKey = 'exposureIndicators' | 'structuralInterpretation' | 'priorityControlDomains' | 'nextSteps';

type SectionConfig = {
  key: SectionKey;
  active: boolean;
};

export default function RiskReportPage() {
  const t = useTranslations('RiskReport');
  const tc = useTranslations('Common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrganization } = useOrganization();

  const [report, setReport] = useState<StructuralRiskReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isAdaptMode, setIsAdaptMode] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Section configurations
  const [sectionConfigs, setSectionConfigs] = useState<Record<SectionKey, boolean>>({
    exposureIndicators: true,
    structuralInterpretation: true,
    priorityControlDomains: true,
    nextSteps: true,
  });

  const returnUrl = searchParams.get('returnUrl');

  // Load report and any saved customizations
  useEffect(() => {
    async function loadReport() {
      if (!activeOrganization) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch the gap recommendation to generate the report
        const res = await fetch(`/api/gap-recommendation?organizationId=${activeOrganization.id}`);
        const data = await res.json();

        if (data.success) {
          const recommendation = data.data.recommendation as GapRecommendation;

          // Fetch full organization profile
          const orgRes = await fetch(`/api/organization/${activeOrganization.id}`);
          const orgData = await orgRes.json();

          if (orgData.success) {
            const org = orgData.data;

            // Build organization profile
            const profile: OrganizationProfile = {
              size: org.size,
              ig: org.ig,
              naceSection: org.naceSection,
              riskProfile: org.riskProfile,
              geographicScope: org.geographicScope,
              digitalMaturity: org.digitalMaturity,
              itSecurityStaff: org.itSecurityStaff,
              securityMaturity: org.securityMaturity,
              dataSensitivity: org.dataSensitivity,
              regulatoryObligations: org.regulatoryObligations,
              itEndpointRange: org.itEndpointRange,
              infrastructureTypes: org.infrastructureTypes,
              softwareDevelopment: org.softwareDevelopment,
              publicFacingServices: org.publicFacingServices,
              targetedAttackLikelihood: org.targetedAttackLikelihood,
              downtimeTolerance: org.downtimeTolerance,
              supplyChainPosition: org.supplyChainPosition,
              securityBudgetRange: org.securityBudgetRange,
              manualOperation: org.manualOperation,
              productionDependency: org.productionDependency,
              customerAccess: org.customerAccess,
            };

            // Generate the report
            const generatedReport = generateStructuralRiskReport(
              profile,
              recommendation,
              org.name
            );

            // Check for saved customizations in localStorage
            const storageKey = `risk-report-${activeOrganization.id}`;
            const saved = localStorage.getItem(storageKey);
            if (saved) {
              try {
                const { report: customReport, sectionConfigs: savedConfigs } = JSON.parse(saved);
                setReport(customReport);
                setSectionConfigs(savedConfigs);
              } catch (e) {
                setReport(generatedReport);
              }
            } else {
              setReport(generatedReport);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load report:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadReport();
  }, [activeOrganization?.id]);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      window.print();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJson = () => {
    if (!report) return;

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.organizationName.replace(/\s+/g, '_')}_Risk_Report.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportDocx = async () => {
    if (!report) return;

    setIsExporting(true);
    try {
      // Helper to get color from risk level
      const getRiskColor = (level: RiskLevel): string => {
        const colors = {
          Low: '335c8c',
          Moderate: '335c8c',
          Elevated: '25693e',
          High: 'ad423f',
          Severe: 'ad423f',
        };
        return colors[level];
      };

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Title
            new Paragraph({
              text: report.organizationName,
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 },
            }),
            new Paragraph({
              text: t('title'),
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 100 },
            }),
            new Paragraph({
              text: report.generatedDate,
              spacing: { after: 400 },
            }),

            // Section 1: Structural Exposure Indicators
            ...(sectionConfigs.exposureIndicators ? [
              new Paragraph({
                text: t('section1.title'),
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 400, after: 200 },
                italics: true,
              }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                  // Header row
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph({ text: t('section1.exposureDriver'), bold: true })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        shading: { fill: 'E5E7EB' },
                      }),
                      new TableCell({
                        children: [new Paragraph({ text: t('section1.assessment'), bold: true })],
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        shading: { fill: 'E5E7EB' },
                      }),
                    ],
                  }),
                  // Data rows
                  ...report.exposureIndicators.map(indicator =>
                    new TableRow({
                      children: [
                        new TableCell({
                          children: [new Paragraph({ text: indicator.name })],
                        }),
                        new TableCell({
                          children: [new Paragraph({
                            children: [
                              new TextRun({
                                text: indicator.assessment,
                                bold: true,
                                color: 'FFFFFF',
                                shading: { fill: getRiskColor(indicator.assessment) },
                              }),
                            ],
                            alignment: AlignmentType.CENTER,
                          })],
                        }),
                      ],
                    })
                  ),
                ],
              }),
            ] : []),

            // Section 2: Structural Risk Interpretation
            ...(sectionConfigs.structuralInterpretation ? [
              new Paragraph({
                text: t('section2.title'),
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 400, after: 200 },
                italics: true,
              }),
              ...report.structuralInterpretation.split('\n\n').map(para =>
                new Paragraph({
                  text: para,
                  spacing: { after: 200 },
                })
              ),
            ] : []),

            // Section 3: Expected Priority Control Domains
            ...(sectionConfigs.priorityControlDomains ? [
              new Paragraph({
                text: t('section3.title'),
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 400, after: 200 },
                italics: true,
              }),
              ...report.priorityControlDomains.map(domain =>
                new Paragraph({
                  text: domain,
                  bullet: { level: 0 },
                  spacing: { after: 100 },
                })
              ),
            ] : []),

            // Section 4: Next Step Consideration
            ...(sectionConfigs.nextSteps ? [
              new Paragraph({
                text: t('section4.title'),
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 400, after: 200 },
                italics: true,
              }),
              new Paragraph({
                text: report.nextSteps,
                spacing: { after: 200 },
              }),
            ] : []),

            // Footer
            new Paragraph({
              text: '',
              spacing: { before: 600 },
              border: {
                top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
              },
            }),
            new Paragraph({
              text: t('footer.confidential'),
              spacing: { before: 200, after: 50 },
              style: 'Footer',
            }),
            new Paragraph({
              text: t('footer.generatedBy'),
              spacing: { after: 50 },
              style: 'Footer',
            }),
            new Paragraph({
              text: t('footer.version'),
              style: 'Footer',
            }),
          ],
        }],
      });

      // Generate and save
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${report.organizationName.replace(/\s+/g, '_')}_Risk_Report.docx`);
      toast.success('DOCX exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export DOCX');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveAdaptations = () => {
    if (!activeOrganization || !report) return;

    setIsSaving(true);
    try {
      const storageKey = `risk-report-${activeOrganization.id}`;
      localStorage.setItem(storageKey, JSON.stringify({ report, sectionConfigs }));
      setIsAdaptMode(false);
      setEditingSection(null);
      toast.success('Report adaptations saved');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save adaptations');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (key: SectionKey) => {
    setSectionConfigs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const changeAssessmentLevel = (index: number, direction: 'up' | 'down') => {
    if (!report) return;

    const currentLevel = report.exposureIndicators[index].assessment;
    const currentIndex = RISK_LEVELS.indexOf(currentLevel);

    let newIndex = currentIndex;
    if (direction === 'up' && currentIndex < RISK_LEVELS.length - 1) {
      newIndex = currentIndex + 1;
    } else if (direction === 'down' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    }

    if (newIndex !== currentIndex) {
      const newIndicators = [...report.exposureIndicators];
      newIndicators[index] = {
        ...newIndicators[index],
        assessment: RISK_LEVELS[newIndex],
      };

      setReport({
        ...report,
        exposureIndicators: newIndicators,
      });
    }
  };

  const updateInterpretation = (text: string) => {
    if (!report) return;
    setReport({ ...report, structuralInterpretation: text });
  };

  const updateNextSteps = (text: string) => {
    if (!report) return;
    setReport({ ...report, nextSteps: text });
  };

  const addPriorityDomain = () => {
    if (!report) return;
    setReport({
      ...report,
      priorityControlDomains: [...report.priorityControlDomains, 'New Domain'],
    });
  };

  const updatePriorityDomain = (index: number, value: string) => {
    if (!report) return;
    const newDomains = [...report.priorityControlDomains];
    newDomains[index] = value;
    setReport({ ...report, priorityControlDomains: newDomains });
  };

  const removePriorityDomain = (index: number) => {
    if (!report) return;
    const newDomains = report.priorityControlDomains.filter((_, i) => i !== index);
    setReport({ ...report, priorityControlDomains: newDomains });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeOrganization || !report) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">{t('noData')}</p>
          <p className="text-sm mt-1">{t('noDataDescription')}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push(returnUrl || '/cis/cis-risc-analysis')}
          >
            {t('backToAnalysis')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Print-hidden controls */}
      <div className="print:hidden p-6 border-b bg-muted/30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => router.push(returnUrl || '/cis/cis-risc-analysis')}
          >
            <ArrowLeft size={16} />
            {t('backToAnalysis')}
          </Button>

          <div className="flex items-center gap-2">
            {isAdaptMode ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveAdaptations}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? tc('buttons.saving') : tc('buttons.save')}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAdaptMode(true)}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Adapt
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
                          {t('exporting')}
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          {t('export')}
                          <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
                        </>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="end">
                    <Command>
                      <CommandList>
                        <CommandEmpty>No export options found.</CommandEmpty>
                        <CommandGroup heading="Export Format">
                          <CommandItem
                            onSelect={() => {
                              handleExportPdf();
                              setExportOpen(false);
                            }}
                            disabled={isExporting}
                            className="cursor-pointer"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {t('exportPdf')}
                          </CommandItem>
                          <CommandItem
                            onSelect={() => {
                              handleExportDocx();
                              setExportOpen(false);
                            }}
                            disabled={isExporting}
                            className="cursor-pointer"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            {t('exportDocx')}
                          </CommandItem>
                          <CommandItem
                            onSelect={() => {
                              handleExportJson();
                              setExportOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            {t('exportJson')}
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="p-8 max-w-4xl mx-auto print:p-4">
        {/* Header */}
        <div className="mb-8 pb-6 border-b-2 border-foreground/20">
          <h1 className="text-3xl font-bold mb-2">{report.organizationName}</h1>
          <h2 className="text-xl text-muted-foreground font-medium mb-1">
            {t('title')}
          </h2>
          <p className="text-sm text-muted-foreground">{report.generatedDate}</p>
        </div>

        {/* Section 1: Structural Exposure Indicators */}
        <ReportSection
          sectionKey="exposureIndicators"
          title={t('section1.title')}
          isActive={sectionConfigs.exposureIndicators}
          isAdaptMode={isAdaptMode}
          isEditing={editingSection === 'exposureIndicators'}
          onToggle={() => toggleSection('exposureIndicators')}
          onEdit={() => setEditingSection('exposureIndicators')}
          onSaveEdit={() => setEditingSection(null)}
        >
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium border-r">
                    {t('section1.exposureDriver')}
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    {t('section1.assessment')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.exposureIndicators.map((indicator, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="px-4 py-3 border-r font-medium">
                      {indicator.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {editingSection === 'exposureIndicators' && (
                          <button
                            onClick={() => changeAssessmentLevel(idx, 'down')}
                            className="p-1 hover:bg-muted rounded cursor-pointer"
                            disabled={RISK_LEVELS.indexOf(indicator.assessment) === 0}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        )}
                        <Badge
                          variant="outline"
                          className="font-medium w-24 justify-center"
                          style={{
                            backgroundColor: RISK_LEVEL_COLORS[indicator.assessment].bg,
                            color: RISK_LEVEL_COLORS[indicator.assessment].text,
                            borderColor: RISK_LEVEL_COLORS[indicator.assessment].border,
                          }}
                        >
                          {indicator.assessment}
                        </Badge>
                        {editingSection === 'exposureIndicators' && (
                          <button
                            onClick={() => changeAssessmentLevel(idx, 'up')}
                            className="p-1 hover:bg-muted rounded cursor-pointer"
                            disabled={RISK_LEVELS.indexOf(indicator.assessment) === RISK_LEVELS.length - 1}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>

        {/* Section 2: Structural Risk Interpretation */}
        <ReportSection
          sectionKey="structuralInterpretation"
          title={t('section2.title')}
          isActive={sectionConfigs.structuralInterpretation}
          isAdaptMode={isAdaptMode}
          isEditing={editingSection === 'structuralInterpretation'}
          onToggle={() => toggleSection('structuralInterpretation')}
          onEdit={() => setEditingSection('structuralInterpretation')}
          onSaveEdit={() => setEditingSection(null)}
        >
          {editingSection === 'structuralInterpretation' ? (
            <textarea
              value={report.structuralInterpretation}
              onChange={(e) => updateInterpretation(e.target.value)}
              className="w-full min-h-[200px] p-3 border rounded-lg resize-y font-sans text-sm leading-relaxed"
            />
          ) : (
            <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-line leading-relaxed">
              {report.structuralInterpretation}
            </div>
          )}
        </ReportSection>

        {/* Section 3: Expected Priority Control Domains */}
        <ReportSection
          sectionKey="priorityControlDomains"
          title={t('section3.title')}
          isActive={sectionConfigs.priorityControlDomains}
          isAdaptMode={isAdaptMode}
          isEditing={editingSection === 'priorityControlDomains'}
          onToggle={() => toggleSection('priorityControlDomains')}
          onEdit={() => setEditingSection('priorityControlDomains')}
          onSaveEdit={() => setEditingSection(null)}
        >
          <ul className="list-disc list-inside space-y-1.5 text-foreground/90">
            {report.priorityControlDomains.map((domain, idx) => (
              <li key={idx} className="ml-2 flex items-center gap-2">
                {editingSection === 'priorityControlDomains' ? (
                  <>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => updatePriorityDomain(idx, e.target.value)}
                      className="flex-1 px-2 py-1 border rounded text-sm"
                    />
                    <button
                      onClick={() => removePriorityDomain(idx)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  domain
                )}
              </li>
            ))}
          </ul>
          {editingSection === 'priorityControlDomains' && (
            <Button
              variant="outline"
              size="sm"
              onClick={addPriorityDomain}
              className="mt-3 gap-2"
            >
              <Plus className="w-3 h-3" />
              Add Domain
            </Button>
          )}
        </ReportSection>

        {/* Section 4: Next Step Consideration */}
        <ReportSection
          sectionKey="nextSteps"
          title={t('section4.title')}
          isActive={sectionConfigs.nextSteps}
          isAdaptMode={isAdaptMode}
          isEditing={editingSection === 'nextSteps'}
          onToggle={() => toggleSection('nextSteps')}
          onEdit={() => setEditingSection('nextSteps')}
          onSaveEdit={() => setEditingSection(null)}
        >
          {editingSection === 'nextSteps' ? (
            <textarea
              value={report.nextSteps}
              onChange={(e) => updateNextSteps(e.target.value)}
              className="w-full min-h-[100px] p-3 border rounded-lg resize-y font-sans text-sm leading-relaxed"
            />
          ) : (
            <p className="text-foreground/90 leading-relaxed">
              {report.nextSteps}
            </p>
          )}
        </ReportSection>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-foreground/20 text-xs text-muted-foreground">
          <p className="mb-1">{t('footer.confidential')}</p>
          <p className="mb-1">{t('footer.generatedBy')}</p>
          <p className="mb-1">{t('footer.version')}</p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 2cm;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:p-4 {
            padding: 1rem !important;
          }

          section {
            page-break-inside: avoid;
          }

          table {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

// Reusable Section Component
type ReportSectionProps = {
  sectionKey: SectionKey;
  title: string;
  children: React.ReactNode;
  isActive: boolean;
  isAdaptMode: boolean;
  isEditing: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onSaveEdit: () => void;
};

function ReportSection({
  sectionKey,
  title,
  children,
  isActive,
  isAdaptMode,
  isEditing,
  onToggle,
  onEdit,
  onSaveEdit,
}: ReportSectionProps) {
  const xIconRef = useRef<XIconHandle>(null);
  const plusIconRef = useRef<PlusIconHandle>(null);

  const handleRemoveButtonMouseEnter = () => {
    if (isActive) {
      xIconRef.current?.startAnimation();
    } else {
      plusIconRef.current?.startAnimation();
    }
  };

  const handleRemoveButtonMouseLeave = () => {
    if (isActive) {
      xIconRef.current?.stopAnimation();
    } else {
      plusIconRef.current?.stopAnimation();
    }
  };

  // Don't render inactive sections when not in adapt mode
  if (!isAdaptMode && !isActive) {
    return null;
  }

  return (
    <section className={cn(
      'mb-10 relative',
      !isActive && 'opacity-50'
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn(
          'text-lg font-semibold italic',
          !isActive && 'line-through text-muted-foreground'
        )}>
          {title}
        </h3>

        {isAdaptMode && (
          <div className="flex items-center gap-1 print:hidden">
            {/* Edit button */}
            {isActive && (
              <button
                onClick={isEditing ? onSaveEdit : onEdit}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded border-2 transition-all hover:scale-105 cursor-pointer',
                  'border-foreground/50 bg-foreground/10 text-foreground hover:bg-foreground/20'
                )}
                title={isEditing ? 'Save changes' : 'Edit section'}
              >
                {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
              </button>
            )}

            {/* Remove/Restore button */}
            <button
              onClick={onToggle}
              onMouseEnter={handleRemoveButtonMouseEnter}
              onMouseLeave={handleRemoveButtonMouseLeave}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded border-2 transition-all hover:scale-105 cursor-pointer',
                'border-foreground/50 bg-foreground/10 text-foreground hover:bg-foreground/20'
              )}
              title={isActive ? 'Remove section' : 'Restore section'}
            >
              {isActive ? (
                <XIcon ref={xIconRef} size={14} />
              ) : (
                <PlusIcon ref={plusIconRef} size={14} />
              )}
            </button>
          </div>
        )}
      </div>

      {isActive && (
        <div className={cn(
          isEditing && 'border-2 border-blue-500/30 rounded-lg p-4 bg-blue-500/5'
        )}>
          {children}
        </div>
      )}
    </section>
  );
}
