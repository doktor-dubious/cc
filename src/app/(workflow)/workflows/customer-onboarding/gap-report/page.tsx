'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/context/OrganizationContext';
import { CIS_CONTROLS, getControlById } from '@/lib/constants/cis-controls';
import {
  GapCatalog,
  GapControlSlide,
  GapSafeguardSlide,
  GapNavigation,
  GapSummarySlide,
} from '@/components/gap-report';

type CurrentItem = {
  type: 'control' | 'safeguard' | 'summary';
  controlId: number;
  safeguardId?: string;
};

type CmmiData = {
  safeguardId: string;
  currentCmmi: number;
  targetCmmi: number;
};

const WORKFLOW_RETURN_URL = '/workflows/customer-onboarding';

export default function WorkflowGapReportPage() {
  const t = useTranslations('GapReport');
  const tc = useTranslations('Common');
  const router = useRouter();
  const { activeOrganization } = useOrganization();

  // Current item being viewed
  const [currentItem, setCurrentItem] = useState<CurrentItem>({
    type: 'control',
    controlId: 1,
  });

  // Expanded control in catalog
  const [expandedControlId, setExpandedControlId] = useState(1);

  // Inactive states
  const [inactiveControls, setInactiveControls] = useState<Set<number>>(new Set());
  const [inactiveSafeguards, setInactiveSafeguards] = useState<Set<string>>(new Set());

  // IG overrides
  const [safeguardIgOverrides, setSafeguardIgOverrides] = useState<Record<string, number>>({});
  const [organizationIg, setOrganizationIg] = useState<number>(1);

  // Notes
  const [notes, setNotes] = useState<Record<string, string>>({});

  // CMMI data for each safeguard
  const [cmmiData, setCmmiData] = useState<Record<string, CmmiData>>({});

  // Whether the report has been finalized
  const [isFinalized, setIsFinalized] = useState(false);

  // Build navigation sequence (only active items)
  const navigationSequence = useMemo(() => {
    const items: CurrentItem[] = [];

    for (const control of CIS_CONTROLS) {
      items.push({ type: 'control', controlId: control.id });

      for (const safeguard of control.safeguards) {
        if (!inactiveSafeguards.has(safeguard.id)) {
          items.push({
            type: 'safeguard',
            controlId: control.id,
            safeguardId: safeguard.id,
          });
        }
      }
    }

    items.push({ type: 'summary', controlId: 0 });

    return items;
  }, [inactiveSafeguards]);

  // Get all active safeguard IDs
  const activeSafeguardIds = useMemo(() => {
    const ids: string[] = [];
    for (const control of CIS_CONTROLS) {
      for (const safeguard of control.safeguards) {
        if (!inactiveSafeguards.has(safeguard.id)) {
          ids.push(safeguard.id);
        }
      }
    }
    return ids;
  }, [inactiveSafeguards]);

  // Current index in navigation
  const currentIndex = useMemo(() => {
    return navigationSequence.findIndex((item) => {
      if (item.type === 'control' && currentItem.type === 'control') {
        return item.controlId === currentItem.controlId;
      }
      if (item.type === 'safeguard' && currentItem.type === 'safeguard') {
        return item.safeguardId === currentItem.safeguardId;
      }
      if (item.type === 'summary' && currentItem.type === 'summary') {
        return true;
      }
      return false;
    });
  }, [navigationSequence, currentItem]);

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prev = navigationSequence[currentIndex - 1];
      setCurrentItem(prev);
      setExpandedControlId(prev.controlId);
    }
  }, [currentIndex, navigationSequence]);

  const goToNext = useCallback(() => {
    if (currentIndex < navigationSequence.length - 1) {
      const next = navigationSequence[currentIndex + 1];
      setCurrentItem(next);
      setExpandedControlId(next.controlId);
    }
  }, [currentIndex, navigationSequence]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  // Update organization IG when organization changes
  const orgIg = activeOrganization?.ig || 1;
  useEffect(() => {
    setOrganizationIg(orgIg);
  }, [orgIg]);

  // Fetch data on organization change
  useEffect(() => {
    if (!activeOrganization) return;

    fetch(`/api/cis-control?organizationId=${activeOrganization.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const inactive = new Set<number>();
          for (const record of data.data) {
            if (!record.active) {
              inactive.add(record.controlId);
            }
          }
          setInactiveControls(inactive);
        }
      })
      .catch(console.error);

    fetch(`/api/safeguard-inactive?organizationId=${activeOrganization.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setInactiveSafeguards(new Set(data.data || []));
        }
      })
      .catch(console.error);

    fetch(`/api/safeguard-ig?organizationId=${activeOrganization.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSafeguardIgOverrides(data.data || {});
        }
      })
      .catch(console.error);

    fetch(`/api/cis-note?organizationId=${activeOrganization.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNotes(data.data || {});
        }
      })
      .catch(console.error);
  }, [activeOrganization?.id]);

  // Toggle control active/inactive
  const toggleControlActive = async (controlId: number, active: boolean) => {
    if (!activeOrganization) return;

    try {
      const res = await fetch('/api/cis-control', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: activeOrganization.id,
          controlId,
          active,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setInactiveControls((prev) => {
          const next = new Set(prev);
          if (active) {
            next.delete(controlId);
          } else {
            next.add(controlId);
          }
          return next;
        });

        if (active) {
          const control = getControlById(controlId);
          if (control) {
            setInactiveSafeguards((prev) => {
              const next = new Set(prev);
              for (const sg of control.safeguards) {
                next.delete(sg.id);
              }
              return next;
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to toggle control:', error);
      toast.error(t('errors.toggleControl'));
    }
  };

  // Toggle safeguard active/inactive
  const toggleSafeguardActive = async (safeguardId: string) => {
    if (!activeOrganization) return;
    const isInactive = inactiveSafeguards.has(safeguardId);

    try {
      const res = await fetch('/api/safeguard-inactive', {
        method: isInactive ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: activeOrganization.id,
          safeguardId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setInactiveSafeguards((prev) => {
          const next = new Set(prev);
          if (isInactive) {
            next.delete(safeguardId);
          } else {
            next.add(safeguardId);
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to toggle safeguard:', error);
      toast.error(t('errors.toggleSafeguard'));
    }
  };

  // Set safeguard IG
  const setSafeguardIg = async (safeguardId: string, ig: number) => {
    if (!activeOrganization) return;

    try {
      const res = await fetch('/api/safeguard-ig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: activeOrganization.id,
          safeguardId,
          ig,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSafeguardIgOverrides((prev) => ({ ...prev, [safeguardId]: ig }));
      }
    } catch (error) {
      console.error('Failed to set safeguard IG:', error);
      toast.error(t('errors.setIg'));
    }
  };

  // Save note
  const saveNote = async (itemId: string, itemType: 'control' | 'safeguard', content: string) => {
    if (!activeOrganization) return;

    const res = await fetch('/api/cis-note', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: activeOrganization.id,
        itemId,
        itemType,
        content,
      }),
    });

    const data = await res.json();
    if (data.success) {
      const key = `${itemType}:${itemId}`;
      setNotes((prev) => {
        if (content.trim() === '') {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: content };
      });
    } else {
      throw new Error(data.error || 'Failed to save note');
    }
  };

  // Update CMMI data for a safeguard
  const updateCmmi = (safeguardId: string, currentCmmi: number, targetCmmi: number) => {
    setCmmiData((prev) => ({
      ...prev,
      [safeguardId]: { safeguardId, currentCmmi, targetCmmi },
    }));
  };

  // Get CMMI for a safeguard (default to level 1 for both)
  const getCmmi = (safeguardId: string) => {
    return cmmiData[safeguardId] || { safeguardId, currentCmmi: 1, targetCmmi: 1 };
  };

  // Finalize the GAP report
  const finalizeReport = async (remarks: string) => {
    if (!activeOrganization) return;

    const cmmiEntries = activeSafeguardIds.map((id) => {
      const data = cmmiData[id];
      return {
        safeguardId: id,
        currentCmmi: data?.currentCmmi ?? 1,
        targetCmmi: data?.targetCmmi ?? 1,
      };
    });

    try {
      const res = await fetch('/api/gap-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: activeOrganization.id,
          cmmiData: cmmiEntries,
          remarks,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsFinalized(true);
        toast.success(data.message || t('messages.reportFinalized'));
      } else {
        toast.error(data.error || t('errors.finalizeReport'));
      }
    } catch (error) {
      console.error('Failed to finalize report:', error);
      toast.error(t('errors.finalizeReport'));
    }
  };

  // Handle catalog selection
  const handleSelectControl = (controlId: number) => {
    setCurrentItem({ type: 'control', controlId });
    setExpandedControlId(controlId);
  };

  const handleSelectSafeguard = (controlId: number, safeguardId: string) => {
    setCurrentItem({ type: 'safeguard', controlId, safeguardId });
    setExpandedControlId(controlId);
  };

  const handleToggleExpand = (controlId: number) => {
    setExpandedControlId((prev) => (prev === controlId ? 0 : controlId));
  };

  // Get current control and safeguard
  const currentControl = getControlById(currentItem.controlId);
  const currentSafeguard =
    currentItem.type === 'safeguard' && currentItem.safeguardId
      ? currentControl?.safeguards.find((s) => s.id === currentItem.safeguardId)
      : null;

  // Get effective IG for current safeguard
  const getEffectiveIg = (safeguardId: string): number => {
    return safeguardIgOverrides[safeguardId] ?? organizationIg;
  };

  if (!activeOrganization) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {t('messages.selectOrganization')}
      </div>
    );
  }

  if (!currentControl && currentItem.type !== 'summary') {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {t('messages.controlNotFound')}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Workflow Header */}
      <header className="shrink-0 border-b bg-background px-6 py-3">
        <Button
          variant="secondary"
          size="sm"
          className="gap-2 cursor-pointer"
          onClick={() => router.push(WORKFLOW_RETURN_URL)}
        >
          <ArrowLeft className="h-4 w-4" />
          {tc('navigation.workflow')}
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area (70%) */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {currentItem.type === 'summary' ? (
              <GapSummarySlide
                cmmiData={cmmiData}
                activeSafeguardIds={activeSafeguardIds}
                isFinalized={isFinalized}
                onFinalize={finalizeReport}
              />
            ) : currentItem.type === 'control' && currentControl ? (
              <GapControlSlide
                control={currentControl}
                isActive={!inactiveControls.has(currentControl.id)}
                onToggleActive={(active) => toggleControlActive(currentControl.id, active)}
                note={notes[`control:${currentControl.id}`] || ''}
                onSaveNote={(content) => saveNote(String(currentControl.id), 'control', content)}
                safeguardIgOverrides={safeguardIgOverrides}
                organizationIg={organizationIg}
                inactiveSafeguards={inactiveSafeguards}
                onSafeguardClick={(safeguard) =>
                  handleSelectSafeguard(currentControl.id, safeguard.id)
                }
                onSafeguardIgChange={setSafeguardIg}
                onToggleSafeguardActive={toggleSafeguardActive}
              />
            ) : currentSafeguard && currentControl ? (
              <GapSafeguardSlide
                safeguard={currentSafeguard}
                controlId={currentControl.id}
                controlTitle={currentControl.title}
                isActive={!inactiveSafeguards.has(currentSafeguard.id)}
                onToggleActive={() => toggleSafeguardActive(currentSafeguard.id)}
                effectiveIg={getEffectiveIg(currentSafeguard.id)}
                onIgChange={(ig) => setSafeguardIg(currentSafeguard.id, ig)}
                note={notes[`safeguard:${currentSafeguard.id}`] || ''}
                onSaveNote={(content) => saveNote(currentSafeguard.id, 'safeguard', content)}
                currentCmmi={getCmmi(currentSafeguard.id).currentCmmi}
                targetCmmi={getCmmi(currentSafeguard.id).targetCmmi}
                onCmmiChange={(current, target) => updateCmmi(currentSafeguard.id, current, target)}
              />
            ) : null}

            {/* Navigation */}
            <GapNavigation
              onPrevious={goToPrevious}
              onNext={goToNext}
              hasPrevious={currentIndex > 0}
              hasNext={currentIndex < navigationSequence.length - 1}
              currentIndex={currentIndex}
              totalItems={navigationSequence.length}
            />
          </div>
        </div>

        {/* Catalog Sidebar (30%) */}
        <div className="w-80 shrink-0 h-full overflow-y-auto">
          <GapCatalog
            currentItem={currentItem}
            expandedControlId={expandedControlId}
            inactiveControls={inactiveControls}
            inactiveSafeguards={inactiveSafeguards}
            onSelectControl={handleSelectControl}
            onSelectSafeguard={handleSelectSafeguard}
            onToggleExpand={handleToggleExpand}
          />
        </div>
      </div>
    </div>
  );
}
