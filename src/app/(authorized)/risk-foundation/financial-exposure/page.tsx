'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter }                    from 'next/navigation';
import {
    BookOpen, ChevronDown, Check, Download, Edit2, FileText,
    Loader2, Save, X,
}                                       from 'lucide-react';
import {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    Table as DocxTable, TableRow as DocxRow, TableCell as DocxCell,
    WidthType,
}                                       from 'docx';
import { saveAs }                       from 'file-saver';
import { toast }                        from 'sonner';

import { Button }                       from '@/components/ui/button';
import { Separator }                    from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger,
         TabsContent }                  from '@/components/ui/tabs';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
}                                       from '@/components/ui/dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
}                                       from '@/components/ui/dropdown-menu';
import { cn }                           from '@/lib/utils';
import { useOrganization }              from '@/context/OrganizationContext';
import { useUser }                      from '@/context/UserContext';
import {
    calculateConcDowntimeCosts,
    type ConcResult,
    type ConcInputs,
    type CostBand,
}                                       from '@/lib/conc/conc-calculator';
import {
    METHODOLOGY_SECTIONS, FAIR_MAPPING, REFERENCES,
}                                       from '@/lib/conc/conc-methodology-doc';

// ── Types ─────────────────────────────────────────────────────────────────────

type OkResult = Extract<ConcResult, { ok: true }>;
type ScenarioId = 'scenario1' | 'scenario2';

type CostRowKey =
    | 'downtime' | 'ir' | 'restore' | 'ebi' | 'ccl'
    | 'reg' | 'reputation' | 'governance' | 'notification'
    | 'adminFineCeiling';

type CostRowDef = {
    key:    CostRowKey;
    label:  string;
    /** When true, value is a single ceiling (not a band) and not summed into ALE. */
    ceiling?: boolean;
};

const COST_ROWS: CostRowDef[] = [
    { key: 'downtime',          label: 'Estimated Downtime Costs' },
    { key: 'ir',                label: 'Incident Response & Forensics (IR)' },
    { key: 'restore',           label: 'System Restoration & Rebuild' },
    { key: 'ebi',               label: 'Extended Business Interruption (EBI)' },
    { key: 'ccl',               label: 'Customer & Contract Loss (CCL)' },
    { key: 'reg',               label: 'Regulatory & Supervisory Cost' },
    { key: 'reputation',        label: 'Reputational Impact' },
    { key: 'governance',        label: 'Management & Governance Cost' },
    { key: 'notification',      label: 'Notification Costs' },
    { key: 'adminFineCeiling',  label: 'Legal Exposure – Administrative Fine Ceiling', ceiling: true },
];

const DEFAULT_VISIBILITY: Record<CostRowKey, boolean> =
    Object.fromEntries(COST_ROWS.map(r => [r.key, true])) as Record<CostRowKey, boolean>;

// Menu-button styling: pointer cursor + underline-on-hover, matching the
// tab-pane indicator on /financial-exposure-detailed.
const MENU_BTN_CLASS =
    'cursor-pointer rounded-none border-b-2 border-transparent ' +
    'hover:border-foreground hover:bg-transparent';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string
{
    return new Intl.NumberFormat('en-EU', {
        style:                'currency',
        currency:             'EUR',
        maximumFractionDigits: 0,
    }).format(value);
}

/** Pull the band/ceiling value for a row from a scenario result. */
function getRowValue(result: OkResult, row: CostRowDef): { low: number; high: number }
{
    if (row.ceiling)
    {
        const v = result.costs.adminFineCeiling;
        return { low: v, high: v };
    }
    const band: CostBand = result.costs[row.key as Exclude<CostRowKey, 'adminFineCeiling'>];
    return { low: band.low, high: band.high };
}

/** Sum low/high across all visible non-ceiling rows for one scenario. */
function totalAle(result: OkResult, visibility: Record<CostRowKey, boolean>): { low: number; high: number }
{
    let low = 0, high = 0;
    for (const row of COST_ROWS)
    {
        if (row.ceiling)            continue;
        if (!visibility[row.key])   continue;
        const v = getRowValue(result, row);
        low  += v.low;
        high += v.high;
    }
    return { low, high };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinancialExposureSummaryPage()
{
    const router                 = useRouter();
    const { activeOrganization } = useOrganization();
    const user                   = useUser();

    const [result1,         setResult1]         = useState<OkResult | null>(null);
    const [result2,         setResult2]         = useState<OkResult | null>(null);
    const [missingFields,   setMissingFields]   = useState<string[]>([]);
    const [isLoading,       setIsLoading]       = useState(true);
    const [isExporting,     setIsExporting]     = useState(false);
    const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

    // Adapt-mode state — mirrors structural-risk-profile UX
    const [isAdaptMode, setIsAdaptMode] = useState(false);
    const [isSaving,    setIsSaving]    = useState(false);
    const [visibility,  setVisibility]  = useState<Record<CostRowKey, boolean>>(DEFAULT_VISIBILITY);

    // ── Calculate both scenarios from the org profile ────────────────────────
    useEffect(() =>
    {
        if (!activeOrganization?.id)
        {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        const baseInputs: Omit<ConcInputs, 'cmmiValues' | 'overrideDowntimeDays'> = {
            naceSection:           activeOrganization.naceSection,
            revenueRange:          activeOrganization.revenueRange,
            businessDaysPerYear:   activeOrganization.businessDaysPerYear,
            manualOperation:       activeOrganization.manualOperation,
            productionDependency:  activeOrganization.productionDependency,
            customerAccess:        activeOrganization.customerAccess,
            orgSize:               activeOrganization.size,
            infrastructureTypes:   activeOrganization.infrastructureTypes ?? [],
            dataSensitivity:       activeOrganization.dataSensitivity ?? [],
            regulatoryObligations: activeOrganization.regulatoryObligations ?? [],
            geographicScope:       activeOrganization.geographicScope,
            businessOrientation:   activeOrganization.businessOrientation,
            revenueConcentration:  activeOrganization.revenueConcentration,
            entityType:            activeOrganization.entityType,
            previousBreachHistory: activeOrganization.previousBreachHistory,
        };

        // Match the detailed page: scenario 1 = 1 day @ CMMI=1, scenario 2 = 5 days @ CMMI=5
        const safeguardIds = ['11.1', '11.2', '11.4', '11.5', '17.1', '17.2', '17.5', '8.11'];
        const cmmiAll1: Record<string, number> = {};
        const cmmiAll5: Record<string, number> = {};
        for (const id of safeguardIds) { cmmiAll1[id] = 1; cmmiAll5[id] = 5; }

        const calc1 = calculateConcDowntimeCosts({ ...baseInputs, cmmiValues: cmmiAll1, overrideDowntimeDays: 1 });
        const calc2 = calculateConcDowntimeCosts({ ...baseInputs, cmmiValues: cmmiAll5, overrideDowntimeDays: 5 });

        if (calc1.ok && calc2.ok)
        {
            setResult1(calc1);
            setResult2(calc2);
            setMissingFields([]);
        }
        else
        {
            setResult1(null);
            setResult2(null);
            setMissingFields(!calc1.ok ? calc1.missing : !calc2.ok ? calc2.missing : []);
        }

        // Restore saved visibility config
        const saved = localStorage.getItem(`financial-exposure-${activeOrganization.id}`);
        if (saved)
        {
            try
            {
                const parsed = JSON.parse(saved);
                setVisibility({ ...DEFAULT_VISIBILITY, ...(parsed.visibility ?? {}) });
            }
            catch { /* ignore */ }
        }

        setIsLoading(false);
    }, [activeOrganization]);

    // ── Aggregate ALE across scenarios (range = min low, max high) ───────────
    const ale = useMemo(() =>
    {
        if (!result1 || !result2) return null;
        const t1 = totalAle(result1, visibility);
        const t2 = totalAle(result2, visibility);
        return {
            low:  Math.min(t1.low,  t2.low),
            high: Math.max(t1.high, t2.high),
        };
    }, [result1, result2, visibility]);

    // ── Adapt-mode handlers ──────────────────────────────────────────────────
    const handleSaveAdaptations = () =>
    {
        if (!activeOrganization) return;
        setIsSaving(true);
        try
        {
            localStorage.setItem(
                `financial-exposure-${activeOrganization.id}`,
                JSON.stringify({ visibility }),
            );
            setIsAdaptMode(false);
            toast.success('Customizations saved');
        }
        catch
        {
            toast.error('Failed to save customizations');
        }
        finally { setIsSaving(false); }
    };

    const toggleRow = (key: CostRowKey) =>
        setVisibility(prev => ({ ...prev, [key]: !prev[key] }));

    // ── Exports ──────────────────────────────────────────────────────────────
    const handleExportPdf = () =>
    {
        setIsExporting(true);
        try { window.print(); }
        finally { setIsExporting(false); }
    };

    const handleExportDocx = async () =>
    {
        if (!result1 || !result2 || !ale || !activeOrganization) return;
        setIsExporting(true);
        try
        {
            const preparedLine = `Prepared by ${user.name}`;
            const visibleRows  = COST_ROWS.filter(r => visibility[r.key]);

            const scenarioTable = (label: string, result: OkResult) => new DocxTable({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new DocxRow({
                        children: [
                            new DocxCell({
                                children: [new Paragraph({ children: [new TextRun({ text: 'Cost Category',  bold: true })] })],
                                width:    { size: 60, type: WidthType.PERCENTAGE },
                                shading:  { fill: 'E5E7EB' },
                            }),
                            new DocxCell({
                                children: [new Paragraph({ children: [new TextRun({ text: 'Low estimate',  bold: true })] })],
                                width:    { size: 20, type: WidthType.PERCENTAGE },
                                shading:  { fill: 'E5E7EB' },
                            }),
                            new DocxCell({
                                children: [new Paragraph({ children: [new TextRun({ text: 'High estimate', bold: true })] })],
                                width:    { size: 20, type: WidthType.PERCENTAGE },
                                shading:  { fill: 'E5E7EB' },
                            }),
                        ],
                    }),
                    ...visibleRows.map(row => {
                        const v = getRowValue(result, row);
                        return new DocxRow({
                            children: [
                                new DocxCell({ children: [new Paragraph({ text: row.label })] }),
                                new DocxCell({ children: [new Paragraph({ text: formatCurrency(v.low) })] }),
                                new DocxCell({ children: [new Paragraph({ text: formatCurrency(v.high) })] }),
                            ],
                        });
                    }),
                ],
            });

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({ text: activeOrganization.name, heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
                        new Paragraph({ text: 'Financial Exposure',  heading: HeadingLevel.HEADING_2, spacing: { after: 100 } }),
                        new Paragraph({ text: preparedLine,           spacing: { after: 400 } }),

                        new Paragraph({
                            children: [new TextRun({ text: 'Estimated Annual Loss (ALE)', bold: true })],
                            heading: HeadingLevel.HEADING_3,
                            spacing: { before: 400, after: 200 },
                        }),
                        new Paragraph({ text: `${formatCurrency(ale.low)}  –  ${formatCurrency(ale.high)}`, spacing: { after: 100 } }),
                        new Paragraph({ text: 'The range reflects uncertainty in incident severity and operational impact.', spacing: { after: 400 } }),

                        new Paragraph({
                            children: [new TextRun({ text: 'Scenario 1 — Best Case', bold: true })],
                            heading: HeadingLevel.HEADING_3,
                            spacing: { before: 400, after: 200 },
                        }),
                        scenarioTable('Scenario 1', result1),

                        new Paragraph({
                            children: [new TextRun({ text: 'Scenario 2 — Worst Case', bold: true })],
                            heading: HeadingLevel.HEADING_3,
                            spacing: { before: 400, after: 200 },
                        }),
                        scenarioTable('Scenario 2', result2),
                    ],
                }],
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${activeOrganization.name.replace(/\s+/g, '_')}_Financial_Exposure.docx`);
            toast.success('Word document exported');
        }
        catch (error)
        {
            console.error('Export failed:', error);
            toast.error('Failed to export Word document');
        }
        finally { setIsExporting(false); }
    };

    // ── Loading / empty states ───────────────────────────────────────────────
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

    if (!activeOrganization || (missingFields.length > 0))
    {
        return (
            <div className="flex flex-col min-h-screen bg-background">
                <div className="flex-1 p-6">
                    <div className="border rounded-lg p-12 text-center text-muted-foreground max-w-4xl mx-auto bg-panel">
                        {!activeOrganization ? (
                            <p className="text-lg font-medium">Please select an organization first</p>
                        ) : (
                            <>
                                <p className="text-lg font-medium">Cannot calculate financial exposure</p>
                                <p className="text-sm mt-1 mb-4">Missing data:</p>
                                <ul className="list-disc list-inside space-y-1 text-sm text-left max-w-md mx-auto">
                                    {missingFields.map(f => <li key={f}>{f}</li>)}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (!result1 || !result2 || !ale) return null;

    // ── Main render ──────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <div className="flex-1 overflow-y-auto p-8 print:p-4">
                <div className="max-w-4xl mx-auto">

                    {/* ── Title row with right-aligned menu ─────────────────── */}
                    <div className="flex items-start justify-between gap-6 mb-2">
                        <h1 className="text-2xl font-bold">Financial Exposure</h1>

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
                                        variant="ghost"
                                        size="sm"
                                        className={MENU_BTN_CLASS}
                                        onClick={() => router.push('/risk-foundation/financial-exposure-detailed')}
                                    >
                                        Details
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={MENU_BTN_CLASS}
                                        onClick={() => setIsAdaptMode(true)}
                                    >
                                        <Edit2 className="w-4 h-4 mr-1" />
                                        Edit
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className={MENU_BTN_CLASS} disabled={isExporting}>
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
                                        variant="ghost"
                                        size="sm"
                                        className={MENU_BTN_CLASS}
                                        onClick={() => setIsMethodologyOpen(true)}
                                    >
                                        <BookOpen className="w-4 h-4 mr-1" />
                                        Methodology &amp; Sources
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* ── Description + prepared-by ─────────────────────────── */}
                    <p className="text-sm text-muted-foreground mb-2">
                        Estimated annual loss based on operational, regulatory, and reputational risk
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Prepared by {user.name}
                    </p>

                    <Separator className="my-6" />

                    {/* ── Estimated Annual Loss (ALE) hero ──────────────────── */}
                    <section className="mb-8">
                        <div className="rounded-lg border bg-panel p-6 text-center">
                            <p className="text-sm text-muted-foreground mb-2">Estimated Annual Loss (ALE)</p>
                            <p className="text-3xl font-semibold tabular-nums tracking-tight">
                                {formatCurrency(ale.low)}
                                <span className="mx-3 text-muted-foreground">–</span>
                                {formatCurrency(ale.high)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-3">
                                The range reflects uncertainty in incident severity and operational impact.
                            </p>
                        </div>
                    </section>

                    {/* ── Scenario tabs ─────────────────────────────────────── */}
                    <Tabs defaultValue={'scenario1' satisfies ScenarioId} className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="scenario1">Scenario 1</TabsTrigger>
                            <TabsTrigger value="scenario2">Scenario 2</TabsTrigger>
                        </TabsList>

                        <TabsContent value="scenario1">
                            <ScenarioCostList
                                result={result1}
                                visibility={visibility}
                                isAdaptMode={isAdaptMode}
                                onToggle={toggleRow}
                            />
                        </TabsContent>
                        <TabsContent value="scenario2">
                            <ScenarioCostList
                                result={result2}
                                visibility={visibility}
                                isAdaptMode={isAdaptMode}
                                onToggle={toggleRow}
                            />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* ── Methodology dialog ──────────────────────────────────────── */}
            <Dialog open={isMethodologyOpen} onOpenChange={setIsMethodologyOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Methodology &amp; Sources</DialogTitle>
                        <DialogDescription>
                            How these figures are derived, with references to source studies and frameworks.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 mt-2">
                        {METHODOLOGY_SECTIONS.map(section => (
                            <div key={section.id}>
                                <h4 className="text-sm font-semibold mb-2">{section.title}</h4>
                                {section.paragraphs.map((para, i) => (
                                    <p key={i} className="text-sm text-muted-foreground mb-2 leading-relaxed">{para}</p>
                                ))}
                            </div>
                        ))}

                        <div>
                            <h4 className="text-sm font-semibold mb-2">FAIR mapping</h4>
                            <div className="rounded-md border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/50">
                                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">FAIR loss form</th>
                                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">SFE category</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {FAIR_MAPPING.map((row, i) => (
                                            <tr key={i}>
                                                <td className="px-3 py-2 text-muted-foreground">{row.fair}</td>
                                                <td className="px-3 py-2 text-muted-foreground">{row.conc}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold mb-2">References</h4>
                            <ul className="space-y-1">
                                {REFERENCES.map((ref, i) => (
                                    <li key={i} className="text-xs text-muted-foreground leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-muted-foreground/50">
                                        {ref}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                @media print {
                    @page { margin: 2cm; }
                    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    .print\\:hidden { display: none !important; }
                    .print\\:p-4 { padding: 1rem !important; }
                    section { page-break-inside: avoid; }
                }
            `}</style>
        </div>
    );
}

// ── ScenarioCostList ─────────────────────────────────────────────────────────
// Renders the 10 cost rows as a label / range table for one scenario. In adapt
// mode each row shows an X / + button to hide / restore that row from the
// summary (and from the ALE total).

type ScenarioCostListProps = {
    result:      OkResult;
    visibility:  Record<CostRowKey, boolean>;
    isAdaptMode: boolean;
    onToggle:    (key: CostRowKey) => void;
};

function ScenarioCostList({ result, visibility, isAdaptMode, onToggle }: ScenarioCostListProps)
{
    return (
        <div className="rounded-lg border bg-panel divide-y">
            {COST_ROWS.map(row =>
            {
                const isActive = visibility[row.key];
                if (!isAdaptMode && !isActive) return null;

                const v = getRowValue(result, row);

                return (
                    <div
                        key={row.key}
                        className={cn(
                            'flex items-center justify-between gap-4 px-5 py-3',
                            !isActive && 'opacity-50',
                        )}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            {isAdaptMode && (
                                <button
                                    onClick={() => onToggle(row.key)}
                                    className="flex h-6 w-6 items-center justify-center rounded border-2 border-foreground/40 bg-foreground/5 text-foreground hover:bg-foreground/15 transition-colors cursor-pointer shrink-0"
                                    title={isActive ? 'Hide row' : 'Restore row'}
                                >
                                    {isActive ? <X size={12} /> : <Check size={12} />}
                                </button>
                            )}
                            <span className={cn(
                                'text-sm',
                                !isActive && 'line-through text-muted-foreground',
                            )}>
                                {row.label}
                            </span>
                        </div>

                        <div className="flex items-baseline gap-2 font-mono tabular-nums shrink-0">
                            {row.ceiling ? (
                                <span className="text-sm font-medium">{formatCurrency(v.low)}</span>
                            ) : (
                                <>
                                    <span className="text-sm">{formatCurrency(v.low)}</span>
                                    <span className="text-muted-foreground">–</span>
                                    <span className="text-sm">{formatCurrency(v.high)}</span>
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
