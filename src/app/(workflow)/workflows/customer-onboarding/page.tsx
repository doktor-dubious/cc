'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Building2,
  Shield,
  FileBarChart,
  LogOut,
  ArrowRight,
  Settings,
  Save,
} from 'lucide-react';
import { RocketIcon } from '@/components/animate-ui/icons/rocket';
import { Button } from '@/components/ui/button';
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
import {
  TimelineStepCard,
  TimelineStepStatus,
} from '@/components/ui/workflow-timeline';
import { useOrganization } from '@/context/OrganizationContext';

const WORKFLOW_ID = 'customer-onboarding';

// Define step IDs as constants
const STEP_IDS = ['organization-wizard', 'cis-risc-analysis', 'gap-report'] as const;

type WorkflowStepDef = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  route: string;
  icon: React.ReactNode;
};

type StepConfig = {
  stepId: string;
  active: boolean;
  sortOrder: number;
};

// Initialize default configs for all steps
const getDefaultConfigs = (): Map<string, StepConfig> => {
  const map = new Map<string, StepConfig>();
  STEP_IDS.forEach((id, index) => {
    map.set(id, { stepId: id, active: true, sortOrder: index });
  });
  return map;
};

export default function CustomerOnboardingWorkflowPage() {
  const t = useTranslations('Workflow');
  const tc = useTranslations('Common');
  const router = useRouter();
  const { activeOrganization, organizations } = useOrganization();

  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isAdaptMode, setIsAdaptMode] = useState(false);
  const [stepConfigs, setStepConfigs] = useState<Map<string, StepConfig>>(getDefaultConfigs);
  const [isSaving, setIsSaving] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string>('organization-wizard');

  // Define all available workflow steps
  const allWorkflowSteps: WorkflowStepDef[] = useMemo(
    () => [
      {
        id: 'organization-wizard',
        titleKey: 'steps.organizationWizard.title',
        descriptionKey: 'steps.organizationWizard.description',
        route: '/workflows/customer-onboarding/organization',
        icon: <Building2 className="h-5 w-5" />,
      },
      {
        id: 'cis-risc-analysis',
        titleKey: 'steps.cisRiscAnalysis.title',
        descriptionKey: 'steps.cisRiscAnalysis.description',
        route: '/workflows/customer-onboarding/cis-analysis',
        icon: <Shield className="h-5 w-5" />,
      },
      {
        id: 'gap-report',
        titleKey: 'steps.gapReport.title',
        descriptionKey: 'steps.gapReport.description',
        route: '/workflows/customer-onboarding/gap-report',
        icon: <FileBarChart className="h-5 w-5" />,
      },
    ],
    []
  );

  // Load workflow config from API
  useEffect(() => {
    const loadWorkflowConfig = async () => {
      if (!activeOrganization?.id) return;

      try {
        const response = await fetch(
          `/api/workflow-config?organizationId=${activeOrganization.id}&workflowId=${WORKFLOW_ID}`
        );
        if (response.ok) {
          const { data } = await response.json();

          // Start with default configs and override with saved ones
          const configMap = getDefaultConfigs();
          data.forEach((config: StepConfig) => {
            configMap.set(config.stepId, config);
          });

          setStepConfigs(configMap);
        }
      } catch (error) {
        console.error('Failed to load workflow config:', error);
      }
    };

    loadWorkflowConfig();
  }, [activeOrganization?.id]);

  // Save workflow config to API
  const saveWorkflowConfig = async () => {
    if (!activeOrganization?.id) {
      console.error('No active organization');
      return;
    }

    setIsSaving(true);
    try {
      const steps = Array.from(stepConfigs.values());
      const response = await fetch('/api/workflow-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: activeOrganization.id,
          workflowId: WORKFLOW_ID,
          steps,
        }),
      });

      if (response.ok) {
        setIsAdaptMode(false);
      } else {
        const errorData = await response.json();
        console.error('Failed to save workflow config:', errorData);
      }
    } catch (error) {
      console.error('Failed to save workflow config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle step active state
  const toggleStepActive = (stepId: string) => {
    setStepConfigs((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(stepId);
      if (current) {
        newMap.set(stepId, { ...current, active: !current.active });
      } else {
        // Create new config if doesn't exist
        const index = STEP_IDS.indexOf(stepId as typeof STEP_IDS[number]);
        newMap.set(stepId, {
          stepId,
          active: false, // Toggle from default (true) to false
          sortOrder: index >= 0 ? index : newMap.size,
        });
      }
      return newMap;
    });
  };

  // Get active steps (filtered by config)
  const activeWorkflowSteps = useMemo(() => {
    return allWorkflowSteps.filter((step) => {
      const config = stepConfigs.get(step.id);
      return config ? config.active : true;
    });
  }, [allWorkflowSteps, stepConfigs]);

  // All steps are open - active step is "current", rest are "upcoming"
  const getStepStatus = (step: WorkflowStepDef): TimelineStepStatus => {
    return step.id === activeStepId ? 'current' : 'upcoming';
  };

  // Handle starting a step
  const handleStartStep = (step: WorkflowStepDef) => {
    router.push(step.route);
  };

  // Handle exit
  const handleExit = () => {
    router.push('/home');
  };

  // All steps are accessible (no locking)
  const canStartStep = (): boolean => {
    return !!activeOrganization;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <RocketIcon size={20} />
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">
                {t('customerOnboarding.title')}
              </h1>
              {activeOrganization && (
                <>
                  <div className="h-5 w-px bg-border" />
                  <span className="text-base text-muted-foreground">
                    {activeOrganization.name}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdaptMode ? (
              <Button
                variant="default"
                size="sm"
                onClick={saveWorkflowConfig}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? t('customerOnboarding.saving') : t('customerOnboarding.save')}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdaptMode(true)}
                className="gap-2"
                disabled={!activeOrganization}
              >
                <Settings className="h-4 w-4" />
                {t('customerOnboarding.adapt')}
              </Button>
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl">
          {/* Introduction */}
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              {t('customerOnboarding.welcome')}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t('customerOnboarding.description')}
            </p>
            {isAdaptMode && (
              <p className="mt-2 text-sm text-primary">
                {t('customerOnboarding.adaptModeHint')}
              </p>
            )}
          </div>

          {!activeOrganization && organizations.length > 0 && (
            <div className="mb-8 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-center">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Please select an organization from the header to continue.
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="relative">
            {allWorkflowSteps.map((step, index) => {
              const config = stepConfigs.get(step.id);
              const isActive = config ? config.active : true;
              const status = getStepStatus(step);
              const isStartable = canStartStep() && isActive;

              // In adapt mode, show all steps; otherwise only active ones
              if (!isAdaptMode && !isActive) {
                return null;
              }

              return (
                <TimelineStepCard
                  key={step.id}
                  stepNumber={index + 1}
                  isLast={index === allWorkflowSteps.length - 1}
                  isAdaptMode={isAdaptMode}
                  isActive={isActive}
                  onToggle={() => toggleStepActive(step.id)}
                  onSelect={() => setActiveStepId(step.id)}
                  step={{
                    id: step.id,
                    title: t(step.titleKey),
                    description: t(step.descriptionKey),
                    status: !activeOrganization ? 'locked' : status,
                    icon: step.icon,
                  }}
                >
                  <Button
                    onClick={() => handleStartStep(step)}
                    disabled={!isStartable}
                    className="gap-2 cursor-pointer"
                  >
                    {t('customerOnboarding.startStep')}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </TimelineStepCard>
              );
            })}
          </div>

          {/* Step count */}
          <div className="mt-12 rounded-lg border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t('customerOnboarding.stepCount', {
                count: activeWorkflowSteps.length,
              })}
            </p>
          </div>
        </div>
      </main>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('customerOnboarding.exitDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('customerOnboarding.exitDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc('buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleExit}>
              {tc('navigation.exit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
