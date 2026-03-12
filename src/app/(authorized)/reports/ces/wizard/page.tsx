'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganization } from '@/context/OrganizationContext';

// ── Field / Step config ──────────────────────────────────────────────────────

type FieldType = 'text' | 'select' | 'boolean' | 'tristate';

type FieldConfig = {
  key: string;
  type: FieldType;
  labelKey: string;
  placeholderKey?: string;
  options?: { value: string; labelKey: string }[];
  required?: boolean;
};

type WizardStep = {
  id: string;
  titleKey: string;
  fields: FieldConfig[];
};

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
  { value: 'NO',    labelKey: 'enums.triState.NO' },
  { value: 'PARTLY',labelKey: 'enums.triState.PARTLY' },
  { value: 'YES',   labelKey: 'enums.triState.YES' },
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

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'company-profile',
    titleKey: 'wizard.steps.companyProfile',
    fields: [
      { key: 'name',               type: 'text',    labelKey: 'wizard.labels.name',               placeholderKey: 'wizard.placeholders.name', required: true },
      { key: 'regulatoryFramework',type: 'select',  labelKey: 'wizard.labels.regulatoryFramework',placeholderKey: 'wizard.placeholders.selectRegulatoryFramework', options: REGULATORY_FRAMEWORK_OPTIONS },
      { key: 'customerSector',     type: 'text',    labelKey: 'wizard.labels.customerSector',     placeholderKey: 'wizard.placeholders.customerSector' },
      { key: 'dedicatedCompliance',type: 'boolean', labelKey: 'wizard.labels.dedicatedCompliance',placeholderKey: 'wizard.placeholders.selectBoolean' },
      { key: 'partOfGroup',        type: 'boolean', labelKey: 'wizard.labels.partOfGroup',        placeholderKey: 'wizard.placeholders.selectBoolean' },
      { key: 'listedOrPeOwned',    type: 'boolean', labelKey: 'wizard.labels.listedOrPeOwned',    placeholderKey: 'wizard.placeholders.selectBoolean' },
    ],
  },
  {
    id: 'contractual',
    titleKey: 'wizard.steps.contractual',
    fields: [
      { key: 'standardContract',       type: 'boolean', labelKey: 'wizard.labels.standardContract',       placeholderKey: 'wizard.placeholders.selectBoolean' },
      { key: 'slaIncluded',            type: 'boolean', labelKey: 'wizard.labels.slaIncluded',            placeholderKey: 'wizard.placeholders.selectBoolean' },
      { key: 'professionalProcurement',type: 'boolean', labelKey: 'wizard.labels.professionalProcurement',placeholderKey: 'wizard.placeholders.selectBoolean' },
      { key: 'deliversToRegulated',    type: 'tristate',labelKey: 'wizard.labels.deliversToRegulated',    placeholderKey: 'wizard.placeholders.selectTriState', options: TRISTATE_OPTIONS },
      { key: 'deliversToPublicInfra',  type: 'boolean', labelKey: 'wizard.labels.deliversToPublicInfra',  placeholderKey: 'wizard.placeholders.selectBoolean' },
    ],
  },
  {
    id: 'operations',
    titleKey: 'wizard.steps.operations',
    fields: [
      { key: 'internationalOps',    type: 'boolean', labelKey: 'wizard.labels.internationalOps',    placeholderKey: 'wizard.placeholders.selectBoolean' },
      { key: 'coreDigital',         type: 'tristate',labelKey: 'wizard.labels.coreDigital',         placeholderKey: 'wizard.placeholders.selectTriState', options: TRISTATE_OPTIONS },
      { key: 'itDependency',        type: 'select',  labelKey: 'wizard.labels.itDependency',        placeholderKey: 'wizard.placeholders.selectDependency', options: DEPENDENCY_OPTIONS },
      { key: 'publicBrand',         type: 'boolean', labelKey: 'wizard.labels.publicBrand',         placeholderKey: 'wizard.placeholders.selectBoolean' },
      { key: 'criticalSocietalRole',type: 'boolean', labelKey: 'wizard.labels.criticalSocietalRole',placeholderKey: 'wizard.placeholders.selectBoolean' },
      { key: 'mediaExposure',       type: 'boolean', labelKey: 'wizard.labels.mediaExposure',       placeholderKey: 'wizard.placeholders.selectBoolean' },
    ],
  },
  {
    id: 'technical',
    titleKey: 'wizard.steps.technical',
    fields: [
      { key: 'deliveryRole',    type: 'select', labelKey: 'wizard.labels.deliveryRole',    placeholderKey: 'wizard.placeholders.selectDeliveryRole',    options: DELIVERY_ROLE_OPTIONS },
      { key: 'accessLevel',     type: 'select', labelKey: 'wizard.labels.accessLevel',     placeholderKey: 'wizard.placeholders.selectAccessLevel',     options: ACCESS_LEVEL_OPTIONS },
      { key: 'dataHandled',     type: 'select', labelKey: 'wizard.labels.dataHandled',     placeholderKey: 'wizard.placeholders.selectDataHandled',     options: DATA_HANDLED_OPTIONS },
      { key: 'disruptionImpact',type: 'select', labelKey: 'wizard.labels.disruptionImpact',placeholderKey: 'wizard.placeholders.selectDisruptionImpact',options: DISRUPTION_IMPACT_OPTIONS },
      { key: 'supplyChainRole', type: 'select', labelKey: 'wizard.labels.supplyChainRole', placeholderKey: 'wizard.placeholders.selectSupplyChainRole', options: SUPPLY_CHAIN_ROLE_OPTIONS },
    ],
  },
];

// ── Form state ───────────────────────────────────────────────────────────────

type FormData = {
  name                   : string;
  regulatoryFramework    : string | null;
  customerSector         : string;
  dedicatedCompliance    : string | null; // 'true'|'false'|null
  partOfGroup            : string | null;
  listedOrPeOwned        : string | null;
  standardContract       : string | null;
  slaIncluded            : string | null;
  professionalProcurement: string | null;
  deliversToRegulated    : string | null;
  deliversToPublicInfra  : string | null;
  internationalOps       : string | null;
  coreDigital            : string | null;
  itDependency           : string | null;
  publicBrand            : string | null;
  criticalSocietalRole   : string | null;
  mediaExposure          : string | null;
  deliveryRole           : string | null;
  accessLevel            : string | null;
  dataHandled            : string | null;
  disruptionImpact       : string | null;
  supplyChainRole        : string | null;
};

const initialFormData: FormData = {
  name                   : '',
  regulatoryFramework    : null,
  customerSector         : '',
  dedicatedCompliance    : null,
  partOfGroup            : null,
  listedOrPeOwned        : null,
  standardContract       : null,
  slaIncluded            : null,
  professionalProcurement: null,
  deliversToRegulated    : null,
  deliversToPublicInfra  : null,
  internationalOps       : null,
  coreDigital            : null,
  itDependency           : null,
  publicBrand            : null,
  criticalSocietalRole   : null,
  mediaExposure          : null,
  deliveryRole           : null,
  accessLevel            : null,
  dataHandled            : null,
  disruptionImpact       : null,
  supplyChainRole        : null,
};

// Convert FormData booleans ('true'/'false') to actual booleans for API
function serializeFormData(data: FormData, organizationId: string) {
  const booleanKeys = [
    'dedicatedCompliance','partOfGroup','listedOrPeOwned','standardContract',
    'slaIncluded','professionalProcurement','deliversToPublicInfra','internationalOps',
    'publicBrand','criticalSocietalRole','mediaExposure',
  ];

  const result: Record<string, unknown> = {
    ...data,
    organizationId,
    customerSector: data.customerSector || null,
    name: data.name.trim(),
  };

  for (const key of booleanKeys)
  {
    const val = result[key];
    if (val === 'true')  result[key] = true;
    else if (val === 'false') result[key] = false;
    else result[key] = null;
  }

  return result;
}

// ── Wizard content ───────────────────────────────────────────────────────────

function CesWizardContent() {
  const t  = useTranslations('CES');
  const tc = useTranslations('Common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrganization } = useOrganization();

  const companyId = searchParams.get('id');
  const isEditing = !!companyId;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = WIZARD_STEPS[currentStepIndex];

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [internalId, setInternalId] = useState<string | null>(companyId);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load existing data when editing
  useEffect(() => {
    if (!companyId) return;

    setIsLoading(true);
    fetch(`/api/third-party/${companyId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data)
        {
          const c = data.data;
          const toStr = (v: boolean | null | undefined): string | null => {
            if (v === true) return 'true';
            if (v === false) return 'false';
            return null;
          };
          setFormData({
            name                   : c.name || '',
            regulatoryFramework    : c.regulatoryFramework || null,
            customerSector         : c.customerSector || '',
            dedicatedCompliance    : toStr(c.dedicatedCompliance),
            partOfGroup            : toStr(c.partOfGroup),
            listedOrPeOwned        : toStr(c.listedOrPeOwned),
            standardContract       : toStr(c.standardContract),
            slaIncluded            : toStr(c.slaIncluded),
            professionalProcurement: toStr(c.professionalProcurement),
            deliversToRegulated    : c.deliversToRegulated || null,
            deliversToPublicInfra  : toStr(c.deliversToPublicInfra),
            internationalOps       : toStr(c.internationalOps),
            coreDigital            : c.coreDigital || null,
            itDependency           : c.itDependency || null,
            publicBrand            : toStr(c.publicBrand),
            criticalSocietalRole   : toStr(c.criticalSocietalRole),
            mediaExposure          : toStr(c.mediaExposure),
            deliveryRole           : c.deliveryRole || null,
            accessLevel            : c.accessLevel || null,
            dataHandled            : c.dataHandled || null,
            disruptionImpact       : c.disruptionImpact || null,
            supplyChainRole        : c.supplyChainRole || null,
          });
        }
      })
      .catch(() => toast.error(t('wizard.toast.saveError')))
      .finally(() => setIsLoading(false));
  }, [companyId, t]);

  // Auto-save
  const saveData = useCallback(async (data: FormData) => {
    if (!data.name.trim() || !activeOrganization) return;

    setIsSaving(true);
    try {
      const payload = serializeFormData(data, activeOrganization.id);

      if (internalId)
      {
        await fetch(`/api/third-party/${internalId}`, {
          method  : 'PATCH',
          headers : { 'Content-Type': 'application/json' },
          body    : JSON.stringify(payload),
        });
      }
      else
      {
        const res = await fetch('/api/third-party', {
          method  : 'POST',
          headers : { 'Content-Type': 'application/json' },
          body    : JSON.stringify(payload),
        });
        const result = await res.json();
        if (result.success && result.data?.id)
        {
          setInternalId(result.data.id);
          router.replace(`/reports/ces/wizard?id=${result.data.id}`);
        }
      }
    }
    catch (error) {
      console.error('Save failed:', error);
      toast.error(t('wizard.toast.saveError'));
    }
    finally {
      setIsSaving(false);
    }
  }, [internalId, activeOrganization, router, t]);

  // Debounced save
  useEffect(() => {
    if (isLoading) return;

    if (saveTimeout) clearTimeout(saveTimeout);

    const timeout = setTimeout(() => {
      saveData(formData);
    }, 800);

    setSaveTimeout(timeout);

    return () => { if (timeout) clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, isLoading]);

  const handleFieldChange = (key: string, value: string | null) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const goToPrevious = useCallback(() => {
    if (currentStepIndex > 0) setCurrentStepIndex(i => i - 1);
  }, [currentStepIndex]);

  const goToNext = useCallback(() => {
    if (currentStepIndex < WIZARD_STEPS.length - 1) setCurrentStepIndex(i => i + 1);
  }, [currentStepIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft') goToPrevious();
      else if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  const getStepStatus = (idx: number): 'complete' | 'current' | 'upcoming' => {
    if (idx < currentStepIndex)
    {
      const step = WIZARD_STEPS[idx];
      const allFilled = step.fields.every(f => {
        if (!f.required) return true;
        const val = formData[f.key as keyof FormData];
        return val !== null && val !== '';
      });
      return allFilled ? 'complete' : 'current';
    }
    if (idx === currentStepIndex) return 'current';
    return 'upcoming';
  };

  const renderField = (field: FieldConfig) => {
    const value = formData[field.key as keyof FormData] as string | null;

    if (field.type === 'text') {
      return (
        <div key={field.key} className="space-y-2">
          <Label htmlFor={field.key}>
            {t(field.labelKey)}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            id={field.key}
            value={value ?? ''}
            onChange={e => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
            className="w-full dark:!bg-transparent"
          />
        </div>
      );
    }

    // select / boolean / tristate all use a <Select>
    const options = field.type === 'boolean' ? BOOLEAN_OPTIONS : (field.options ?? []);

    return (
      <div key={field.key} className="space-y-2">
        <Label htmlFor={field.key}>{t(field.labelKey)}</Label>
        <Select
          value={value ?? ''}
          onValueChange={v => handleFieldChange(field.key, v || null)}
        >
          <SelectTrigger className="w-full dark:!bg-transparent">
            <SelectValue placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined} />
          </SelectTrigger>
          <SelectContent>
            {options.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <p className="text-muted-foreground">{t('wizard.loading')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {isEditing ? t('wizard.titleEdit') : t('wizard.title')}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{t('wizard.subtitle')}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => router.push('/reports/ces')} className="gap-2">
              <X className="w-4 h-4" />
              {tc('navigation.exit')}
            </Button>
          </div>

          {/* Step content */}
          <div className="border rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">{t(currentStep.titleKey)}</h2>
              {isSaving && <span className="text-xs text-muted-foreground">{t('wizard.saving')}</span>}
            </div>
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
              <Button variant="default" size="sm" onClick={() => router.push('/reports/ces')} className="gap-2">
                <Check className="w-4 h-4" />
                {tc('navigation.finish')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-72 shrink-0 h-full overflow-y-auto border-l border-muted-foreground">
        <div className="p-4 border-b bg-muted/50">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {t('wizard.steps.title')}
          </p>
        </div>
        <div className="py-2 pr-2">
          {WIZARD_STEPS.map((step, index) => {
            const status = getStepStatus(index);
            const isSelected = index === currentStepIndex;
            return (
              <div
                key={step.id}
                className={`
                  relative flex items-center gap-3 pl-4 pr-2 py-2 cursor-pointer text-sm
                  border-l-2 transition-colors
                  ${isSelected
                    ? 'border-l-primary text-foreground font-medium'
                    : 'border-l-transparent hover:border-l-muted-foreground/30 text-muted-foreground hover:text-foreground'
                  }
                `}
                onClick={() => setCurrentStepIndex(index)}
              >
                <div
                  className={`
                    w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0
                    ${status === 'complete'
                      ? 'bg-primary text-primary-foreground'
                      : status === 'current'
                        ? 'border-2 border-primary text-primary'
                        : 'border border-muted-foreground/30 text-muted-foreground'
                    }
                  `}
                >
                  {status === 'complete' ? <Check className="w-3 h-3" /> : index + 1}
                </div>
                <span className="truncate">{t(step.titleKey)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CesWizardPage() {
  const t = useTranslations('CES');
  return (
    <Suspense fallback={
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-background">
        <p className="text-muted-foreground">{t('wizard.loading')}</p>
      </div>
    }>
      <CesWizardContent />
    </Suspense>
  );
}
