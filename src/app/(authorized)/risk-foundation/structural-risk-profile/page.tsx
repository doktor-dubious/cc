'use client';

import { useState, useEffect, useCallback }                     from 'react';
import Link                                                     from 'next/link';
import { useRouter }                                            from 'next/navigation';
import { Check, ChevronDown, Download, Edit2, FileText, Loader2,
         Minus, Plus, Save, Sparkles, X }                        from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table as DocxTable,
         TableRow as DocxRow, TableCell as DocxCell,
         WidthType, HeadingLevel, AlignmentType }                from 'docx';
import { saveAs }                                               from 'file-saver';
import { toast }                                                from 'sonner';

import { Button }                                               from '@/components/ui/button';
import { Badge }                                                from '@/components/ui/badge';
import { Separator }                                            from '@/components/ui/separator';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
}                                                               from '@/components/ui/dropdown-menu';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
}                                                               from '@/components/ui/alert-dialog';
import { cn }                                                   from '@/lib/utils';
import { useOrganization }                                      from '@/context/OrganizationContext';
import { useUser }                                              from '@/context/UserContext';
import {
    generateStructuralRiskReport,
    type StructuralRiskReport,
    type RiskLevel,
    type FactorSnapshot,
}                                                               from '@/lib/risk-report/report-generator';
import type {
    GapRecommendation,
    OrganizationProfile,
}                                                               from '@/lib/gap-analysis/recommendation-engine';

async function fetchInterpretation(snapshot: FactorSnapshot): Promise<string | null>
{
    try
    {
        const res = await fetch('/api/structural-risk-interpretation', {
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

const RISK_LEVEL_COLORS: Record<RiskLevel, { bg: string; text: string }> = {
    Low:      { bg: '#335c8c', text: '#ffffff' },
    Moderate: { bg: '#335c8c', text: '#ffffff' },
    Elevated: { bg: '#25693e', text: '#ffffff' },
    High:     { bg: '#ad423f', text: '#ffffff' },
    Severe:   { bg: '#ad423f', text: '#ffffff' },
};

const RISK_LEVEL_DOCX_COLORS: Record<RiskLevel, string> = {
    Low:      '335c8c',
    Moderate: '335c8c',
    Elevated: '25693e',
    High:     'ad423f',
    Severe:   'ad423f',
};

const RISK_LEVELS: RiskLevel[] = ['Low', 'Moderate', 'Elevated', 'High', 'Severe'];

type SectionKey = 'structuralInterpretation' | 'priorityControlDomains' | 'exposureIndicators';

const DEFAULT_SECTION_CONFIGS: Record<SectionKey, boolean> = {
    structuralInterpretation: true,
    priorityControlDomains:   true,
    exposureIndicators:       true,
};

export default function StructuralRiskProfileSummaryPage()
{
    const router                  = useRouter();
    const { activeOrganization }  = useOrganization();
    const user                    = useUser();

    const [report,         setReport]         = useState<StructuralRiskReport | null>(null);
    const [reportId,       setReportId]       = useState<string | null>(null);
    const [isLoading,      setIsLoading]      = useState(true);
    const [isExporting,    setIsExporting]    = useState(false);
    const [isGenerating,   setIsGenerating]   = useState(false);
    const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);

    // ── Adapt-mode state (mirrors /report page) ──────────────────────────────
    const [isAdaptMode,    setIsAdaptMode]    = useState(false);
    const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
    const [isSaving,       setIsSaving]       = useState(false);
    const [sectionConfigs, setSectionConfigs] = useState<Record<SectionKey, boolean>>(DEFAULT_SECTION_CONFIGS);

    // Initial load: fetch the persisted report from the DB. No LLM call here —
    // the Anthropic interpretation only runs on an explicit Generate click.
    useEffect(() =>
    {
        const orgId = activeOrganization?.id;
        if (!orgId)
        {
            setIsLoading(false);
            setReport(null);
            setReportId(null);
            setSectionConfigs(DEFAULT_SECTION_CONFIGS);
            return;
        }

        let cancelled = false;
        setIsLoading(true);

        (async () =>
        {
            try
            {
                const res  = await fetch(`/api/structural-risk-report?organizationId=${orgId}`);
                const json = await res.json();
                if (cancelled) return;

                if (json.success && json.data)
                {
                    setReport(json.data.report as StructuralRiskReport);
                    setReportId(json.data.id ?? null);
                    setSectionConfigs({ ...DEFAULT_SECTION_CONFIGS, ...(json.data.sectionConfigs ?? {}) });
                }
                else
                {
                    setReport(null);
                    setReportId(null);
                    setSectionConfigs(DEFAULT_SECTION_CONFIGS);
                }
                setIsAdaptMode(false);
                setEditingSection(null);
            }
            catch (error)
            {
                if (cancelled) return;
                console.error('Failed to load structural risk report:', error);
                setReport(null);
                setReportId(null);
            }
            finally
            {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [activeOrganization?.id]);

    // Manual Generate: fetches deps, runs the deterministic scoring, calls
    // Claude for the interpretation, and persists the result to the DB. This
    // overwrites any prior report (and any prior Adapt-mode edits) for the org.
    const generateReport = useCallback(async () =>
    {
        if (!activeOrganization)
        {
            toast.error('Please select an organization first');
            return;
        }

        setIsGenerating(true);
        try
        {
            const recRes  = await fetch(`/api/gap-recommendation?organizationId=${activeOrganization.id}`);
            const recJson = await recRes.json();
            if (!recJson.success)
            {
                toast.error(recJson.error || 'Failed to generate report');
                return;
            }

            const recommendation = recJson.data.recommendation as GapRecommendation;
            const organizationName: string = recJson.data.organizationName;

            const orgRes  = await fetch(`/api/organization/${activeOrganization.id}`);
            const orgJson = await orgRes.json();
            if (!orgJson.success)
            {
                toast.error('Failed to load organization');
                return;
            }

            const org = orgJson.data;
            const profile: OrganizationProfile = {
                size:                     org.size,
                ig:                       org.ig,
                naceSection:              org.naceSection,
                geographicScope:          org.geographicScope,
                digitalMaturity:          org.digitalMaturity,
                itSecurityStaff:          org.itSecurityStaff,
                securityMaturity:         org.securityMaturity,
                dataSensitivity:          org.dataSensitivity,
                regulatoryObligations:    org.regulatoryObligations,
                itEndpointRange:          org.itEndpointRange,
                infrastructureTypes:      org.infrastructureTypes,
                softwareDevelopment:      org.softwareDevelopment,
                publicFacingServices:     org.publicFacingServices,
                targetedAttackLikelihood: org.targetedAttackLikelihood,
                downtimeTolerance:        org.downtimeTolerance,
                supplyChainPosition:      org.supplyChainPosition,
                securityBudgetRange:      org.securityBudgetRange,
                manualOperation:          org.manualOperation,
                productionDependency:     org.productionDependency,
                customerAccess:           org.customerAccess,
            };

            const generated = generateStructuralRiskReport(profile, recommendation, org.name);

            const llmInterpretation = await fetchInterpretation(generated.factorSnapshot);
            if (llmInterpretation)
            {
                generated.structuralInterpretation = llmInterpretation;
            }

            const saveRes = await fetch('/api/structural-risk-report', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    organizationId: activeOrganization.id,
                    report:         generated,
                    sectionConfigs: DEFAULT_SECTION_CONFIGS,
                }),
            });
            const saveJson = await saveRes.json();
            if (!saveJson.success)
            {
                toast.error(saveJson.error || 'Failed to save report');
                return;
            }

            setReport(generated);
            setReportId(saveJson.data?.id ?? null);
            setSectionConfigs(DEFAULT_SECTION_CONFIGS);
            setIsAdaptMode(false);
            setEditingSection(null);

            // Mirror the detailed-page generate side-effect: hydrate the
            // exploratory-gap cache so the Detailed Assessment view has data
            // ready without requiring another manual generate click.
            const inactiveControls   = new Set<number>();
            const inactiveSafeguards = new Set<string>();
            for (const control of recommendation.controls)
            {
                if (control.shouldBeInactive) inactiveControls.add(control.controlId);
                for (const sf of control.safeguards)
                {
                    if (sf.shouldBeInactive) inactiveSafeguards.add(sf.safeguardId);
                }
            }
            localStorage.setItem(`exploratory-gap-${activeOrganization.id}`, JSON.stringify({
                recommendation,
                organizationName,
                selectedIg:            recommendation.recommendedIg,
                originalRecommendedIg: recommendation.recommendedIg,
                inactiveControls:      Array.from(inactiveControls),
                inactiveSafeguards:    Array.from(inactiveSafeguards),
                savedAt:               new Date().toISOString(),
            }));

            toast.success('Report generated');
        }
        catch (error)
        {
            console.error('Failed to generate structural risk report:', error);
            toast.error('Failed to generate report');
        }
        finally
        {
            setIsGenerating(false);
        }
    }, [activeOrganization]);

    // Generate-button handler: prompts for confirmation when an existing
    // report would be overwritten. The first generation (no prior report)
    // skips the dialog and runs immediately.
    const handleGenerateClick = () =>
    {
        if (report) setConfirmRegenerateOpen(true);
        else        generateReport();
    };

    // ── Adapt-mode handlers (mirror /report page) ────────────────────────────

    const handleSaveAdaptations = async () =>
    {
        if (!activeOrganization || !report) return;
        setIsSaving(true);
        try
        {
            const res = await fetch('/api/structural-risk-report', {
                method:  'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    organizationId: activeOrganization.id,
                    report,
                    sectionConfigs,
                }),
            });
            const json = await res.json();
            if (!json.success)
            {
                toast.error(json.error || 'Failed to save adaptations');
                return;
            }
            setIsAdaptMode(false);
            setEditingSection(null);
            toast.success('Report adaptations saved');
        }
        catch (error)
        {
            console.error('Failed to save:', error);
            toast.error('Failed to save adaptations');
        }
        finally { setIsSaving(false); }
    };

    const toggleSection = (key: SectionKey) =>
        setSectionConfigs(prev => ({ ...prev, [key]: !prev[key] }));

    const changeAssessmentLevel = (index: number, direction: 'up' | 'down') =>
    {
        if (!report) return;
        const currentIndex = RISK_LEVELS.indexOf(report.exposureIndicators[index].assessment);
        const newIndex = direction === 'up'
            ? Math.min(currentIndex + 1, RISK_LEVELS.length - 1)
            : Math.max(currentIndex - 1, 0);
        if (newIndex === currentIndex) return;

        const newIndicators = [...report.exposureIndicators];
        newIndicators[index] = { ...newIndicators[index], assessment: RISK_LEVELS[newIndex] };
        setReport({ ...report, exposureIndicators: newIndicators });
    };

    const updateInterpretation = (text: string) =>
    {
        if (!report) return;
        setReport({ ...report, structuralInterpretation: text });
    };

    const addPriorityDomain = () =>
    {
        if (!report) return;
        setReport({ ...report, priorityControlDomains: [...report.priorityControlDomains, 'New Domain'] });
    };

    const updatePriorityDomain = (index: number, value: string) =>
    {
        if (!report) return;
        const newDomains = [...report.priorityControlDomains];
        newDomains[index] = value;
        setReport({ ...report, priorityControlDomains: newDomains });
    };

    const removePriorityDomain = (index: number) =>
    {
        if (!report) return;
        const newDomains = report.priorityControlDomains.filter((_, i) => i !== index);
        setReport({ ...report, priorityControlDomains: newDomains });
    };

    const handleExportPdf = () =>
    {
        setIsExporting(true);
        try { window.print(); }
        finally { setIsExporting(false); }
    };

    const handleExportDocx = async () =>
    {
        if (!report) return;
        setIsExporting(true);
        try
        {
            const preparedLine = reportId
                ? `${report.generatedDate} · Prepared by ${user.name} · ID: ${reportId}`
                : `${report.generatedDate} · Prepared by ${user.name}`;

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({ text: report.organizationName, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
                        new Paragraph({ text: 'Structural Risk Profile', heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }),
                        new Paragraph({ text: "Summary of the client's structural exposure", spacing: { after: 100 } }),
                        new Paragraph({ text: preparedLine, spacing: { after: 400 } }),

                        ...(sectionConfigs.structuralInterpretation ? [
                            new Paragraph({
                                children: [new TextRun({ text: 'Structural Risk Interpretation', bold: true })],
                                heading: HeadingLevel.HEADING_3,
                                spacing: { before: 400, after: 200 },
                            }),
                            ...report.structuralInterpretation.split('\n\n').map(para =>
                                new Paragraph({ text: para, spacing: { after: 200 } })),
                        ] : []),

                        ...(sectionConfigs.priorityControlDomains ? [
                            new Paragraph({
                                children: [new TextRun({ text: 'Priority Focus Areas', bold: true })],
                                heading: HeadingLevel.HEADING_3,
                                spacing: { before: 400, after: 200 },
                            }),
                            ...report.priorityControlDomains.map(domain =>
                                new Paragraph({ text: domain, bullet: { level: 0 }, spacing: { after: 100 } })),
                        ] : []),

                        ...(sectionConfigs.exposureIndicators ? [
                            new Paragraph({
                                children: [new TextRun({ text: 'Key Exposure Drivers', bold: true })],
                                heading: HeadingLevel.HEADING_3,
                                spacing: { before: 400, after: 200 },
                            }),
                            new DocxTable({
                                width: { size: 100, type: WidthType.PERCENTAGE },
                                rows: [
                                    new DocxRow({
                                        children: [
                                            new DocxCell({
                                                children: [new Paragraph({ children: [new TextRun({ text: 'Exposure Driver', bold: true })] })],
                                                width:    { size: 50, type: WidthType.PERCENTAGE },
                                                shading:  { fill: 'E5E7EB' },
                                            }),
                                            new DocxCell({
                                                children: [new Paragraph({ children: [new TextRun({ text: 'Assessment', bold: true })] })],
                                                width:    { size: 50, type: WidthType.PERCENTAGE },
                                                shading:  { fill: 'E5E7EB' },
                                            }),
                                        ],
                                    }),
                                    ...report.exposureIndicators.map(indicator =>
                                        new DocxRow({
                                            children: [
                                                new DocxCell({ children: [new Paragraph({ text: indicator.name })] }),
                                                new DocxCell({
                                                    children: [new Paragraph({
                                                        children: [new TextRun({
                                                            text:    indicator.assessment,
                                                            bold:    true,
                                                            color:   'FFFFFF',
                                                            shading: { fill: RISK_LEVEL_DOCX_COLORS[indicator.assessment] },
                                                        })],
                                                        alignment: AlignmentType.CENTER,
                                                    })],
                                                }),
                                            ],
                                        })),
                                ],
                            }),
                        ] : []),
                    ],
                }],
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${report.organizationName.replace(/\s+/g, '_')}_Structural_Risk_Profile.docx`);
            toast.success('Word document exported');
        }
        catch (error)
        {
            console.error('Export failed:', error);
            toast.error('Failed to export Word document');
        }
        finally { setIsExporting(false); }
    };

    if (isLoading)
    {
        return (
            <div className="flex flex-col min-h-screen bg-background">
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (!activeOrganization || !report)
    {
        return (
            <div className="flex flex-col min-h-screen bg-background">
                <div className="flex-1 p-6">
                    <div className="border rounded-lg p-12 text-center text-muted-foreground max-w-4xl mx-auto bg-panel">
                        <p className="text-lg font-medium">No structural risk data available</p>
                        <p className="text-sm mt-1">Generate a CIS gap analysis first to populate the structural risk profile.</p>
                        <div className="mt-4 flex items-center justify-center gap-2">
                            {activeOrganization && (
                                <Button
                                    variant="default"
                                    onClick={handleGenerateClick}
                                    disabled={isGenerating}
                                >
                                    {isGenerating
                                        ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        : <Sparkles className="w-4 h-4 mr-1" />}
                                    Generate
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => router.push('/risk-foundation/structural-risk-profile/detailed')}
                            >
                                Go to Detailed Assessment
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <div className="flex-1 overflow-y-auto p-8 print:p-4">
                <div className="max-w-4xl mx-auto">
                    {/* ── Title row with right-aligned menu ─────────────────── */}
                    <div className="flex items-start justify-between gap-6 mb-2">
                        <h1 className="text-2xl font-bold">Structural Risk Profile</h1>

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
                                        onClick={() => router.push('/risk-foundation/structural-risk-profile/detailed')}
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

                    {/* ── Description + date ────────────────────────────────── */}
                    <p className="text-sm text-muted-foreground mb-2">
                        Summary of the client&apos;s structural exposure
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">
                        Qualitative view of the client&apos;s control posture. See{' '}
                        <Link
                            href="/risk-foundation/per-safeguard-exposure"
                            className="underline underline-offset-2 hover:text-foreground"
                        >
                            Per-Safeguard Financial Exposure
                        </Link>
                        {' '}for the monetised counterpart.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {report.generatedDate} · Prepared by {user.name}
                        {reportId && <> · ID: {reportId}</>}
                    </p>

                    <Separator className="my-6" />

                    {/* ── Structural Risk Interpretation ────────────────────── */}
                    <ReportSection
                        title="Structural Risk Interpretation"
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

                    {/* ── Priority Focus Areas ──────────────────────────────── */}
                    <ReportSection
                        title="Priority Focus Areas"
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
                                                className="p-1 hover:bg-red-100 rounded text-red-600 cursor-pointer"
                                                title="Remove"
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

                    {/* ── Key Exposure Drivers ──────────────────────────────── */}
                    <ReportSection
                        title="Key Exposure Drivers"
                        isActive={sectionConfigs.exposureIndicators}
                        isAdaptMode={isAdaptMode}
                        isEditing={editingSection === 'exposureIndicators'}
                        onToggle={() => toggleSection('exposureIndicators')}
                        onEdit={() => setEditingSection('exposureIndicators')}
                        onSaveEdit={() => setEditingSection(null)}
                    >
                        <div className="border rounded-lg overflow-hidden bg-panel">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-medium border-r">Exposure Driver</th>
                                        <th className="text-left px-4 py-3 font-medium">Assessment</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {report.exposureIndicators.map((indicator, idx) => (
                                        <tr key={idx} className="hover:bg-muted/20">
                                            <td className="px-4 py-3 border-r font-medium">{indicator.name}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {editingSection === 'exposureIndicators' && (
                                                        <button
                                                            onClick={() => changeAssessmentLevel(idx, 'down')}
                                                            className="p-1 hover:bg-muted rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                            disabled={RISK_LEVELS.indexOf(indicator.assessment) === 0}
                                                            title="Lower assessment"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    <Badge
                                                        variant="outline"
                                                        className="font-medium w-24 justify-center"
                                                        style={{
                                                            backgroundColor: RISK_LEVEL_COLORS[indicator.assessment].bg,
                                                            color:           RISK_LEVEL_COLORS[indicator.assessment].text,
                                                            borderColor:     RISK_LEVEL_COLORS[indicator.assessment].bg,
                                                        }}
                                                    >
                                                        {indicator.assessment}
                                                    </Badge>
                                                    {editingSection === 'exposureIndicators' && (
                                                        <button
                                                            onClick={() => changeAssessmentLevel(idx, 'up')}
                                                            className="p-1 hover:bg-muted rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                                            disabled={RISK_LEVELS.indexOf(indicator.assessment) === RISK_LEVELS.length - 1}
                                                            title="Raise assessment"
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
                </div>
            </div>

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

            <AlertDialog open={confirmRegenerateOpen} onOpenChange={setConfirmRegenerateOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Regenerate the Structural Risk Profile?</AlertDialogTitle>
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
}: ReportSectionProps)
{
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
