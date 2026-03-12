'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Check, LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RocketIcon } from '@/components/animate-ui/icons/rocket';

// ── Option constants (same values as CES wizard) ─────────────────────────────

const REGULATORY_FRAMEWORK_OPTIONS = [
    { value: 'NIS2_ESSENTIAL',  labelKey: 'enums.regulatoryFramework.NIS2_ESSENTIAL' },
    { value: 'NIS2_IMPORTANT',  labelKey: 'enums.regulatoryFramework.NIS2_IMPORTANT' },
    { value: 'FINANCIAL',       labelKey: 'enums.regulatoryFramework.FINANCIAL' },
    { value: 'HEALTH',          labelKey: 'enums.regulatoryFramework.HEALTH' },
    { value: 'PUBLIC',          labelKey: 'enums.regulatoryFramework.PUBLIC' },
    { value: 'LISTED',          labelKey: 'enums.regulatoryFramework.LISTED' },
    { value: 'ENTERPRISE',      labelKey: 'enums.regulatoryFramework.ENTERPRISE' },
    { value: 'DATACENTER',      labelKey: 'enums.regulatoryFramework.DATACENTER' },
    { value: 'SAAS',            labelKey: 'enums.regulatoryFramework.SAAS' },
    { value: 'NON_REG_SME',     labelKey: 'enums.regulatoryFramework.NON_REG_SME' },
];

const TRISTATE_OPTIONS = [
    { value: 'NO',     labelKey: 'enums.triState.NO' },
    { value: 'PARTLY', labelKey: 'enums.triState.PARTLY' },
    { value: 'YES',    labelKey: 'enums.triState.YES' },
];

const DEPENDENCY_OPTIONS = [
    { value: 'LOW',      labelKey: 'enums.dependencyLevel.LOW' },
    { value: 'MODERATE', labelKey: 'enums.dependencyLevel.MODERATE' },
    { value: 'HIGH',     labelKey: 'enums.dependencyLevel.HIGH' },
];

const DELIVERY_ROLE_OPTIONS = [
    { value: 'ADVISORY',                labelKey: 'enums.deliveryRole.ADVISORY' },
    { value: 'SOFTWARE',                labelKey: 'enums.deliveryRole.SOFTWARE' },
    { value: 'HOSTING',                 labelKey: 'enums.deliveryRole.HOSTING' },
    { value: 'MANAGED_IT',              labelKey: 'enums.deliveryRole.MANAGED_IT' },
    { value: 'OPERATE_CRITICAL_SYSTEM', labelKey: 'enums.deliveryRole.OPERATE_CRITICAL_SYSTEM' },
    { value: 'SUBSUPPLIER',             labelKey: 'enums.deliveryRole.SUBSUPPLIER' },
];

const ACCESS_LEVEL_OPTIONS = [
    { value: 'NONE',         labelKey: 'enums.accessLevel.NONE' },
    { value: 'READ_ONLY',    labelKey: 'enums.accessLevel.READ_ONLY' },
    { value: 'REMOTE',       labelKey: 'enums.accessLevel.REMOTE' },
    { value: 'PRIVILEGED',   labelKey: 'enums.accessLevel.PRIVILEGED' },
    { value: 'FULL_CONTROL', labelKey: 'enums.accessLevel.FULL_CONTROL' },
];

const DATA_HANDLED_OPTIONS = [
    { value: 'NONE',              labelKey: 'enums.dataHandled.NONE' },
    { value: 'PERSONAL',          labelKey: 'enums.dataHandled.PERSONAL' },
    { value: 'SENSITIVE',         labelKey: 'enums.dataHandled.SENSITIVE' },
    { value: 'BUSINESS_CRITICAL', labelKey: 'enums.dataHandled.BUSINESS_CRITICAL' },
    { value: 'SOCIETAL_CRITICAL', labelKey: 'enums.dataHandled.SOCIETAL_CRITICAL' },
];

const DISRUPTION_IMPACT_OPTIONS = [
    { value: 'NONE',                   labelKey: 'enums.disruptionImpact.NONE' },
    { value: 'TEMPORARY',              labelKey: 'enums.disruptionImpact.TEMPORARY' },
    { value: 'OPERATIONAL_DISRUPTION', labelKey: 'enums.disruptionImpact.OPERATIONAL_DISRUPTION' },
    { value: 'PRODUCTION_STOP',        labelKey: 'enums.disruptionImpact.PRODUCTION_STOP' },
    { value: 'SOCIETAL_CRITICAL',      labelKey: 'enums.disruptionImpact.SOCIETAL_CRITICAL' },
];

const SUPPLY_CHAIN_ROLE_OPTIONS = [
    { value: 'DIRECT',               labelKey: 'enums.supplyChainRole.DIRECT' },
    { value: 'SUBSUPPLIER',          labelKey: 'enums.supplyChainRole.SUBSUPPLIER' },
    { value: 'CRITICAL_SUBSUPPLIER', labelKey: 'enums.supplyChainRole.CRITICAL_SUBSUPPLIER' },
    { value: 'INTEGRATED',           labelKey: 'enums.supplyChainRole.INTEGRATED' },
];

const BOOLEAN_OPTIONS = [
    { value: 'true',  labelKey: 'enums.boolean.true' },
    { value: 'false', labelKey: 'enums.boolean.false' },
];

// ── Field / Step config ──────────────────────────────────────────────────────

type FieldType = 'text' | 'textarea' | 'select' | 'boolean' | 'tristate';

type FieldConfig = {
    key          : string;
    type         : FieldType;
    labelKey     : string;
    placeholderKey? : string;
    options?     : { value: string; labelKey: string }[];
    required?    : boolean;
    namespace?   : 'workflow' | 'ces'; // which t() to use for labelKey/placeholderKey
};

type WizardStep = {
    id       : string;
    titleKey : string;
    fields   : FieldConfig[];
};

const WIZARD_STEPS: WizardStep[] = [
    {
        id       : 'basics',
        titleKey : 'wizard.steps.basics',
        fields   : [
            { key: 'name',           type: 'text',     labelKey: 'wizard.labels.name',         placeholderKey: 'wizard.placeholders.name',          required: true, namespace: 'workflow' },
            { key: 'description',    type: 'textarea', labelKey: 'wizard.labels.description',   placeholderKey: 'wizard.placeholders.description',   namespace: 'workflow' },
            { key: 'customerSector', type: 'text',     labelKey: 'wizard.labels.customerSector',placeholderKey: 'wizard.placeholders.customerSector', namespace: 'workflow' },
        ],
    },
    {
        id       : 'ownership',
        titleKey : 'wizard.steps.ownership',
        fields   : [
            { key: 'regulatoryFramework', type: 'select',  labelKey: 'wizard.labels.regulatoryFramework', placeholderKey: 'wizard.placeholders.selectRegulatoryFramework', options: REGULATORY_FRAMEWORK_OPTIONS, namespace: 'ces' },
            { key: 'partOfGroup',         type: 'boolean', labelKey: 'wizard.labels.partOfGroup',         placeholderKey: 'wizard.placeholders.selectBoolean',              namespace: 'ces' },
            { key: 'listedOrPeOwned',     type: 'boolean', labelKey: 'wizard.labels.listedOrPeOwned',     placeholderKey: 'wizard.placeholders.selectBoolean',              namespace: 'ces' },
            { key: 'dedicatedCompliance', type: 'boolean', labelKey: 'wizard.labels.dedicatedCompliance', placeholderKey: 'wizard.placeholders.selectBoolean',              namespace: 'ces' },
        ],
    },
    {
        id       : 'contractual',
        titleKey : 'wizard.steps.contractual',
        fields   : [
            { key: 'standardContract',       type: 'boolean', labelKey: 'wizard.labels.standardContract',       placeholderKey: 'wizard.placeholders.selectBoolean', namespace: 'ces' },
            { key: 'slaIncluded',            type: 'boolean', labelKey: 'wizard.labels.slaIncluded',            placeholderKey: 'wizard.placeholders.selectBoolean', namespace: 'ces' },
            { key: 'professionalProcurement',type: 'boolean', labelKey: 'wizard.labels.professionalProcurement',placeholderKey: 'wizard.placeholders.selectBoolean', namespace: 'ces' },
        ],
    },
    {
        id       : 'marketReach',
        titleKey : 'wizard.steps.marketReach',
        fields   : [
            { key: 'deliversToRegulated',  type: 'tristate', labelKey: 'wizard.labels.deliversToRegulated',  placeholderKey: 'wizard.placeholders.selectTriState', options: TRISTATE_OPTIONS, namespace: 'ces' },
            { key: 'deliversToPublicInfra',type: 'boolean',  labelKey: 'wizard.labels.deliversToPublicInfra',placeholderKey: 'wizard.placeholders.selectBoolean',  namespace: 'ces' },
            { key: 'internationalOps',     type: 'boolean',  labelKey: 'wizard.labels.internationalOps',     placeholderKey: 'wizard.placeholders.selectBoolean',  namespace: 'ces' },
        ],
    },
    {
        id       : 'operations',
        titleKey : 'wizard.steps.operations',
        fields   : [
            { key: 'coreDigital',  type: 'tristate', labelKey: 'wizard.labels.coreDigital',  placeholderKey: 'wizard.placeholders.selectTriState',  options: TRISTATE_OPTIONS,  namespace: 'ces' },
            { key: 'itDependency', type: 'select',   labelKey: 'wizard.labels.itDependency', placeholderKey: 'wizard.placeholders.selectDependency', options: DEPENDENCY_OPTIONS, namespace: 'ces' },
            { key: 'publicBrand',  type: 'boolean',  labelKey: 'wizard.labels.publicBrand',  placeholderKey: 'wizard.placeholders.selectBoolean',   namespace: 'ces' },
        ],
    },
    {
        id       : 'exposure',
        titleKey : 'wizard.steps.exposure',
        fields   : [
            { key: 'criticalSocietalRole', type: 'boolean', labelKey: 'wizard.labels.criticalSocietalRole', placeholderKey: 'wizard.placeholders.selectBoolean',        namespace: 'ces' },
            { key: 'mediaExposure',        type: 'boolean', labelKey: 'wizard.labels.mediaExposure',        placeholderKey: 'wizard.placeholders.selectBoolean',        namespace: 'ces' },
            { key: 'disruptionImpact',     type: 'select',  labelKey: 'wizard.labels.disruptionImpact',     placeholderKey: 'wizard.placeholders.selectDisruptionImpact', options: DISRUPTION_IMPACT_OPTIONS, namespace: 'ces' },
        ],
    },
    {
        id       : 'technical',
        titleKey : 'wizard.steps.technical',
        fields   : [
            { key: 'deliveryRole',    type: 'select', labelKey: 'wizard.labels.deliveryRole',    placeholderKey: 'wizard.placeholders.selectDeliveryRole',    options: DELIVERY_ROLE_OPTIONS,    namespace: 'ces' },
            { key: 'accessLevel',     type: 'select', labelKey: 'wizard.labels.accessLevel',     placeholderKey: 'wizard.placeholders.selectAccessLevel',     options: ACCESS_LEVEL_OPTIONS,     namespace: 'ces' },
            { key: 'dataHandled',     type: 'select', labelKey: 'wizard.labels.dataHandled',     placeholderKey: 'wizard.placeholders.selectDataHandled',     options: DATA_HANDLED_OPTIONS,     namespace: 'ces' },
            { key: 'supplyChainRole', type: 'select', labelKey: 'wizard.labels.supplyChainRole', placeholderKey: 'wizard.placeholders.selectSupplyChainRole', options: SUPPLY_CHAIN_ROLE_OPTIONS, namespace: 'ces' },
        ],
    },
];

// ── Form state ────────────────────────────────────────────────────────────────

type FormData = {
    name                    : string;
    description             : string;
    customerSector          : string;
    regulatoryFramework     : string | null;
    partOfGroup             : string | null;
    listedOrPeOwned         : string | null;
    dedicatedCompliance     : string | null;
    standardContract        : string | null;
    slaIncluded             : string | null;
    professionalProcurement : string | null;
    deliversToRegulated     : string | null;
    deliversToPublicInfra   : string | null;
    internationalOps        : string | null;
    coreDigital             : string | null;
    itDependency            : string | null;
    publicBrand             : string | null;
    criticalSocietalRole    : string | null;
    mediaExposure           : string | null;
    disruptionImpact        : string | null;
    deliveryRole            : string | null;
    accessLevel             : string | null;
    dataHandled             : string | null;
    supplyChainRole         : string | null;
};

const initialFormData: FormData = {
    name                    : '',
    description             : '',
    customerSector          : '',
    regulatoryFramework     : null,
    partOfGroup             : null,
    listedOrPeOwned         : null,
    dedicatedCompliance     : null,
    standardContract        : null,
    slaIncluded             : null,
    professionalProcurement : null,
    deliversToRegulated     : null,
    deliversToPublicInfra   : null,
    internationalOps        : null,
    coreDigital             : null,
    itDependency            : null,
    publicBrand             : null,
    criticalSocietalRole    : null,
    mediaExposure           : null,
    disruptionImpact        : null,
    deliveryRole            : null,
    accessLevel             : null,
    dataHandled             : null,
    supplyChainRole         : null,
};

const BOOLEAN_KEYS = [
    'partOfGroup','listedOrPeOwned','dedicatedCompliance','standardContract',
    'slaIncluded','professionalProcurement','deliversToPublicInfra','internationalOps',
    'publicBrand','criticalSocietalRole','mediaExposure',
] as const;

function serialize(data: FormData): Record<string, unknown> {
    const result: Record<string, unknown> = {
        ...data,
        description    : data.description.trim() || null,
        customerSector : data.customerSector.trim() || null,
        name           : data.name.trim(),
    };
    for (const key of BOOLEAN_KEYS) {
        const v = result[key];
        result[key] = v === 'true' ? true : v === 'false' ? false : null;
    }
    return result;
}

function toStr(v: boolean | null | undefined): string | null {
    if (v === true)  return 'true';
    if (v === false) return 'false';
    return null;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ThirdPartyWizardPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);

    const tw = useTranslations('Workflow.thirdPartyRiskExposure');
    const tc = useTranslations('Common');
    const ces = useTranslations('CES');
    const router = useRouter();

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const currentStep = WIZARD_STEPS[currentStepIndex];

    const [formData, setFormData]       = useState<FormData>(initialFormData);
    const [companyName, setCompanyName] = useState('');
    const [isSaving, setIsSaving]       = useState(false);
    const [isLoading, setIsLoading]     = useState(true);
    const [showExitDialog, setShowExitDialog] = useState(false);
    const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

    // Load existing data
    useEffect(() => {
        fetch(`/api/third-party/${id}`)
            .then(r => r.json())
            .then(json => {
                if (json.success && json.data) {
                    const c = json.data;
                    setCompanyName(c.name || '');
                    setFormData({
                        name                    : c.name || '',
                        description             : c.description || '',
                        customerSector          : c.customerSector || '',
                        regulatoryFramework     : c.regulatoryFramework || null,
                        partOfGroup             : toStr(c.partOfGroup),
                        listedOrPeOwned         : toStr(c.listedOrPeOwned),
                        dedicatedCompliance     : toStr(c.dedicatedCompliance),
                        standardContract        : toStr(c.standardContract),
                        slaIncluded             : toStr(c.slaIncluded),
                        professionalProcurement : toStr(c.professionalProcurement),
                        deliversToRegulated     : c.deliversToRegulated || null,
                        deliversToPublicInfra   : toStr(c.deliversToPublicInfra),
                        internationalOps        : toStr(c.internationalOps),
                        coreDigital             : c.coreDigital || null,
                        itDependency            : c.itDependency || null,
                        publicBrand             : toStr(c.publicBrand),
                        criticalSocietalRole    : toStr(c.criticalSocietalRole),
                        mediaExposure           : toStr(c.mediaExposure),
                        disruptionImpact        : c.disruptionImpact || null,
                        deliveryRole            : c.deliveryRole || null,
                        accessLevel             : c.accessLevel || null,
                        dataHandled             : c.dataHandled || null,
                        supplyChainRole         : c.supplyChainRole || null,
                    });
                }
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, [id]);

    // Auto-save with debounce
    const saveData = useCallback(async (data: FormData) => {
        if (!data.name.trim()) return;
        setIsSaving(true);
        try {
            await fetch(`/api/third-party/${id}`, {
                method  : 'PATCH',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(serialize(data)),
            });
        } catch {
            // silently fail
        } finally {
            setIsSaving(false);
        }
    }, [id]);

    useEffect(() => {
        if (isLoading) return;
        if (saveTimeout) clearTimeout(saveTimeout);
        const t = setTimeout(() => saveData(formData), 800);
        setSaveTimeout(t);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData, isLoading]);

    const handleFieldChange = (key: string, value: string | null) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        if (key === 'name' && value) setCompanyName(value);
    };

    const goToPrevious = useCallback(() => {
        if (currentStepIndex > 0) setCurrentStepIndex(i => i - 1);
    }, [currentStepIndex]);

    const goToNext = useCallback(() => {
        if (currentStepIndex < WIZARD_STEPS.length - 1) setCurrentStepIndex(i => i + 1);
    }, [currentStepIndex]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'ArrowLeft') goToPrevious();
            else if (e.key === 'ArrowRight') goToNext();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [goToPrevious, goToNext]);

    const getStepStatus = (idx: number): 'complete' | 'current' | 'upcoming' => {
        if (idx < currentStepIndex) {
            const allFilled = WIZARD_STEPS[idx].fields.every(f => {
                if (!f.required) return true;
                const v = formData[f.key as keyof FormData];
                return v !== null && v !== '';
            });
            return allFilled ? 'complete' : 'current';
        }
        return idx === currentStepIndex ? 'current' : 'upcoming';
    };

    const renderField = (field: FieldConfig) => {
        const value = formData[field.key as keyof FormData] as string | null;
        const tFunc = field.namespace === 'ces' ? ces : tw;
        const label = tFunc(field.labelKey);
        const placeholder = field.placeholderKey ? tFunc(field.placeholderKey) : undefined;

        if (field.type === 'text') {
            return (
                <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>
                        {label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Input
                        id={field.key}
                        value={value ?? ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        placeholder={placeholder}
                        className="w-full dark:!bg-transparent"
                    />
                </div>
            );
        }

        if (field.type === 'textarea') {
            return (
                <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key}>{label}</Label>
                    <Textarea
                        id={field.key}
                        value={value ?? ''}
                        onChange={e => handleFieldChange(field.key, e.target.value || null)}
                        placeholder={placeholder}
                        rows={3}
                        className="resize-none w-full dark:!bg-transparent"
                    />
                </div>
            );
        }

        // select / boolean / tristate
        const options = field.type === 'boolean' ? BOOLEAN_OPTIONS : (field.options ?? []);
        return (
            <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{label}</Label>
                <Select
                    value={value ?? ''}
                    onValueChange={v => handleFieldChange(field.key, v || null)}
                >
                    <SelectTrigger className="w-full dark:!bg-transparent">
                        <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {ces(opt.labelKey)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <p className="text-muted-foreground">{tw('wizard.loading')}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <RocketIcon size={20} />
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-semibold">{tw('wizard.title')}</h1>
                            {companyName && (
                                <>
                                    <div className="h-5 w-px bg-border" />
                                    <span className="text-base text-muted-foreground">{companyName}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isSaving && (
                            <span className="text-xs text-muted-foreground">{tw('wizard.saving')}</span>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowExitDialog(true)}
                            className="gap-2"
                        >
                            <LogOut className="h-4 w-4" />
                            {tc('navigation.exit')}
                        </Button>
                    </div>
                </div>
            </header>

            {/* Body — main content + right sidebar */}
            <div className="flex flex-1">
                {/* Main content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-2xl mx-auto">
                        {/* Step content */}
                        <div className="border rounded-lg p-6 space-y-6">
                            <h2 className="text-lg font-medium">
                                {tw(currentStep.titleKey)}
                            </h2>
                            <div className="space-y-6">
                                {currentStep.fields.map(field => renderField(field))}
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between border-t border-muted pt-4 mt-6">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={goToPrevious}
                                disabled={currentStepIndex === 0}
                                className="gap-2"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                {tc('navigation.previous')}
                            </Button>

                            <span className="text-sm text-muted-foreground">
                                {currentStepIndex + 1} / {WIZARD_STEPS.length}
                            </span>

                            {currentStepIndex < WIZARD_STEPS.length - 1 ? (
                                <Button variant="outline" size="sm" onClick={goToNext} className="gap-2">
                                    {tc('navigation.next')}
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => router.push('/workflows/customer-onboarding/third-party-risk-exposure')}
                                    className="gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    {tc('navigation.finish')}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right sidebar — step index */}
                <aside className="w-64 shrink-0 border-l border-muted h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
                    <div className="p-4 border-b bg-muted/50">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                            {tw('wizard.steps.sidebar')}
                        </p>
                    </div>
                    <div className="py-2 pr-2">
                        {WIZARD_STEPS.map((step, index) => {
                            const status     = getStepStatus(index);
                            const isSelected = index === currentStepIndex;
                            return (
                                <button
                                    key={step.id}
                                    onClick={() => setCurrentStepIndex(index)}
                                    className={[
                                        'w-full relative flex items-center gap-3 pl-4 pr-2 py-2.5 text-sm text-left',
                                        'border-l-2 transition-colors cursor-pointer',
                                        isSelected
                                            ? 'border-l-primary text-foreground font-medium'
                                            : 'border-l-transparent hover:border-l-muted-foreground/30 text-muted-foreground hover:text-foreground',
                                    ].join(' ')}
                                >
                                    <div
                                        className={[
                                            'w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0',
                                            status === 'complete'
                                                ? 'bg-primary text-primary-foreground'
                                                : status === 'current'
                                                    ? 'border-2 border-primary text-primary'
                                                    : 'border border-muted-foreground/30 text-muted-foreground',
                                        ].join(' ')}
                                    >
                                        {status === 'complete' ? <Check className="w-3 h-3" /> : index + 1}
                                    </div>
                                    <span className="truncate">{tw(step.titleKey)}</span>
                                </button>
                            );
                        })}
                    </div>
                </aside>
            </div>

            {/* Exit Dialog */}
            <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tc('navigation.exit')}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your progress has been saved. You can return to continue onboarding at any time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tc('buttons.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => router.push('/workflows/customer-onboarding/third-party-risk-exposure')}
                        >
                            {tw('wizard.backToList')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
