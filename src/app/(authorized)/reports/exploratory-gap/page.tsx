'use client';

import { useState, useMemo }               from 'react';
import { useTranslations }                 from 'next-intl';
import { useRouter }                       from 'next/navigation';
import { Button }                          from '@/components/ui/button';
import { Badge }                           from '@/components/ui/badge';
import { Switch }                          from '@/components/ui/switch';
import { Checkbox }                        from '@/components/ui/checkbox';
import { toast }                           from 'sonner';
import { useOrganization }                 from '@/context/OrganizationContext';
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Info,
  Loader2,
  ArrowRight,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type SafeguardRecommendation = {
  safeguardId: string;
  controlId: number;
  title: string;
  recommendedIg: number;
  shouldBeInactive: boolean;
  reasons: string[];
  relevanceScore: number;
};

type ControlRecommendation = {
  controlId: number;
  title: string;
  shouldBeInactive: boolean;
  reasons: string[];
  relevanceScore: number;
  safeguards: SafeguardRecommendation[];
};

type GapRecommendation = {
  recommendedIg: number;
  igReasons: string[];
  controls: ControlRecommendation[];
  summary: {
    totalControls: number;
    activeControls: number;
    inactiveControls: number;
    totalSafeguards: number;
    activeSafeguards: number;
    inactiveSafeguards: number;
  };
};

const IG_COLORS: Record<number, string> = {
  1: '#5D664D',
  2: '#335c8c',
  3: '#ad423f',
};

export default function ExploratoryGapPage() {
  const t = useTranslations('ExploratoryGap');
  const router = useRouter();
  const { activeOrganization } = useOrganization();

  const [isLoading, setIsLoading] = useState(false);
  const [isImplementing, setIsImplementing] = useState(false);
  const [recommendation, setRecommendation] = useState<GapRecommendation | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');

  // User adjustments
  const [selectedIg, setSelectedIg] = useState<number>(1);
  const [inactiveControls, setInactiveControls] = useState<Set<number>>(new Set());
  const [inactiveSafeguards, setInactiveSafeguards] = useState<Set<string>>(new Set());

  // UI state
  const [expandedControls, setExpandedControls] = useState<Set<number>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Generate recommendation
  const generateRecommendation = async () => {
    if (!activeOrganization) {
      toast.error(t('toast.selectOrganization'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/gap-recommendation?organizationId=${activeOrganization.id}`);
      const data = await res.json();

      if (data.success) {
        const rec = data.data.recommendation as GapRecommendation;
        setRecommendation(rec);
        setOrganizationName(data.data.organizationName);
        setSelectedIg(rec.recommendedIg);

        // Initialize inactive sets from recommendation
        const inactiveCtrl = new Set<number>();
        const inactiveSf = new Set<string>();

        for (const control of rec.controls) {
          if (control.shouldBeInactive) {
            inactiveCtrl.add(control.controlId);
          }
          for (const sf of control.safeguards) {
            if (sf.shouldBeInactive) {
              inactiveSf.add(sf.safeguardId);
            }
          }
        }

        setInactiveControls(inactiveCtrl);
        setInactiveSafeguards(inactiveSf);
        toast.success(t('toast.generateSuccess'));
      } else {
        toast.error(data.error || t('toast.generateError'));
      }
    } catch (error) {
      console.error('Failed to generate recommendation:', error);
      toast.error(t('toast.generateError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle control active/inactive
  const toggleControl = (controlId: number) => {
    setInactiveControls(prev => {
      const next = new Set(prev);
      if (next.has(controlId)) {
        next.delete(controlId);
      } else {
        next.add(controlId);
        // Also mark all safeguards of this control as inactive
        const control = recommendation?.controls.find(c => c.controlId === controlId);
        if (control) {
          setInactiveSafeguards(prevSf => {
            const nextSf = new Set(prevSf);
            control.safeguards.forEach(sf => nextSf.add(sf.safeguardId));
            return nextSf;
          });
        }
      }
      return next;
    });
  };

  // Toggle safeguard active/inactive
  const toggleSafeguard = (safeguardId: string) => {
    setInactiveSafeguards(prev => {
      const next = new Set(prev);
      if (next.has(safeguardId)) {
        next.delete(safeguardId);
      } else {
        next.add(safeguardId);
      }
      return next;
    });
  };

  // Toggle control expansion
  const toggleExpand = (controlId: number) => {
    setExpandedControls(prev => {
      const next = new Set(prev);
      if (next.has(controlId)) {
        next.delete(controlId);
      } else {
        next.add(controlId);
      }
      return next;
    });
  };

  // Implement recommendations
  const implementRecommendations = async () => {
    if (!activeOrganization) return;

    setIsImplementing(true);
    try {
      const res = await fetch('/api/gap-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: activeOrganization.id,
          recommendedIg: selectedIg,
          inactiveControlIds: Array.from(inactiveControls),
          inactiveSafeguardIds: Array.from(inactiveSafeguards),
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(t('toast.implementSuccess'));
        setShowConfirmDialog(false);
        router.push('/cis/controls');
      } else {
        toast.error(data.error || t('toast.implementError'));
      }
    } catch (error) {
      console.error('Failed to implement recommendations:', error);
      toast.error(t('toast.implementError'));
    } finally {
      setIsImplementing(false);
    }
  };

  // Calculate current summary based on user adjustments
  const currentSummary = useMemo(() => {
    if (!recommendation) return null;

    const activeControlsCount = 18 - inactiveControls.size;
    const inactiveControlsCount = inactiveControls.size;

    let totalSafeguards = 0;
    let activeSafeguardsCount = 0;

    for (const control of recommendation.controls) {
      for (const sf of control.safeguards) {
        totalSafeguards++;
        if (!inactiveSafeguards.has(sf.safeguardId)) {
          activeSafeguardsCount++;
        }
      }
    }

    return {
      totalControls: 18,
      activeControls: activeControlsCount,
      inactiveControls: inactiveControlsCount,
      totalSafeguards,
      activeSafeguards: activeSafeguardsCount,
      inactiveSafeguards: totalSafeguards - activeSafeguardsCount,
    };
  }, [recommendation, inactiveControls, inactiveSafeguards]);

  // Relevance score color
  const getRelevanceColor = (score: number): string => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="p-6 space-y-8 max-w-6xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Organization info & Generate button */}
      <div className="border rounded-lg p-6 bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t('labels.currentOrganization')}</p>
            <p className="text-lg font-medium">{activeOrganization?.name || t('labels.noOrganization')}</p>
          </div>
          <Button
            onClick={generateRecommendation}
            disabled={!activeOrganization || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('buttons.generating')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t('buttons.generate')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Recommendation Results */}
      {recommendation && (
        <div className="space-y-6">
          {/* Recommended IG */}
          <div className="border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{t('labels.recommendedIg')}</h2>
                <p className="text-sm text-muted-foreground">
                  {t('labels.basedOn', { name: organizationName })}
                </p>
              </div>
              <Badge
                className="text-white text-lg px-4 py-2"
                style={{ backgroundColor: IG_COLORS[selectedIg] }}
              >
                IG{selectedIg}
              </Badge>
            </div>

            {/* IG Selection */}
            <div className="flex gap-3 pt-2">
              {[1, 2, 3].map(ig => (
                <Button
                  key={ig}
                  variant={selectedIg === ig ? 'default' : 'outline'}
                  className={`flex-1 ${selectedIg === ig ? 'text-white' : ''}`}
                  style={selectedIg === ig ? { backgroundColor: IG_COLORS[ig] } : {}}
                  onClick={() => setSelectedIg(ig)}
                >
                  IG{ig}
                </Button>
              ))}
            </div>

            {/* IG Reasons */}
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Info className="w-4 h-4" />
                {t('labels.analysisFactors')}
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 pl-6">
                {recommendation.igReasons.map((reason, idx) => (
                  <li key={idx} className="list-disc">{reason}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Summary */}
          {currentSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-500">{currentSummary.activeControls}</p>
                <p className="text-sm text-muted-foreground">{t('labels.activeControls')}</p>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-500">{currentSummary.inactiveControls}</p>
                <p className="text-sm text-muted-foreground">{t('labels.inactiveControls')}</p>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-500">{currentSummary.activeSafeguards}</p>
                <p className="text-sm text-muted-foreground">{t('labels.activeSafeguards')}</p>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-500">{currentSummary.inactiveSafeguards}</p>
                <p className="text-sm text-muted-foreground">{t('labels.inactiveSafeguards')}</p>
              </div>
            </div>
          )}

          {/* Controls List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 p-4 border-b">
              <h2 className="font-semibold">{t('headings.controlsRecommendations')}</h2>
              <p className="text-sm text-muted-foreground">{t('headings.controlsDescription')}</p>
            </div>

            <div className="divide-y">
              {recommendation.controls.map(control => {
                const isControlInactive = inactiveControls.has(control.controlId);
                const isExpanded = expandedControls.has(control.controlId);
                const activeSafeguardsInControl = control.safeguards.filter(
                  sf => !inactiveSafeguards.has(sf.safeguardId)
                ).length;

                return (
                  <div key={control.controlId} className={isControlInactive ? 'opacity-60' : ''}>
                    {/* Control Row */}
                    <div
                      className="flex items-center gap-4 p-4 hover:bg-muted/30 cursor-pointer"
                      onClick={() => toggleExpand(control.controlId)}
                    >
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Control {control.controlId}</span>
                          <span className="text-muted-foreground">—</span>
                          <span className="truncate">{control.title}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className={getRelevanceColor(control.relevanceScore)}>
                            {t('labels.relevance')}: {control.relevanceScore}%
                          </span>
                          <span>•</span>
                          <span>
                            {activeSafeguardsInControl}/{control.safeguards.length} safeguards active
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Switch
                            checked={!isControlInactive}
                            onCheckedChange={() => toggleControl(control.controlId)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {isControlInactive ? t('labels.inactive') : t('labels.active')}
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Expanded Safeguards */}
                    {isExpanded && (
                      <div className="bg-muted/20 border-t">
                        {/* Control reasons */}
                        {control.reasons.length > 0 && (
                          <div className="px-4 py-3 border-b bg-muted/30">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                              {t('labels.analysis')}
                            </p>
                            <ul className="text-sm text-muted-foreground space-y-0.5">
                              {control.reasons.map((reason, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-muted-foreground">•</span>
                                  <span>{reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Safeguards list */}
                        <div className="divide-y">
                          {control.safeguards.map(sf => {
                            const isSfInactive = inactiveSafeguards.has(sf.safeguardId);
                            return (
                              <div
                                key={sf.safeguardId}
                                className={`flex items-center gap-4 px-4 py-3 pl-12 ${isSfInactive ? 'opacity-50' : ''}`}
                              >
                                <div className="flex-grow min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm text-muted-foreground">
                                      {sf.safeguardId}
                                    </span>
                                    <span className="truncate text-sm">{sf.title}</span>
                                  </div>
                                  {sf.reasons.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                      {sf.reasons[0]}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                  <span className={`text-xs ${getRelevanceColor(sf.relevanceScore)}`}>
                                    {sf.relevanceScore}%
                                  </span>
                                  <Checkbox
                                    checked={!isSfInactive}
                                    onCheckedChange={() => toggleSafeguard(sf.safeguardId)}
                                    disabled={isControlInactive}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Implement Button */}
          <div className="flex justify-end pt-4">
            <Button
              size="lg"
              onClick={() => setShowConfirmDialog(true)}
              className="gap-2"
            >
              {t('buttons.implement')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* No organization selected */}
      {!activeOrganization && (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">{t('empty.noOrganization')}</p>
          <p className="text-sm mt-1">{t('empty.noOrganizationDescription')}</p>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.description', { name: organizationName })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('dialog.targetIg')}</span>
              <Badge style={{ backgroundColor: IG_COLORS[selectedIg] }} className="text-white">
                IG{selectedIg}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('dialog.controlsInactive')}</span>
              <span className="font-medium">{inactiveControls.size}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">{t('dialog.safeguardsInactive')}</span>
              <span className="font-medium">{inactiveSafeguards.size}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={implementRecommendations} disabled={isImplementing}>
              {isImplementing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('buttons.implementing')}
                </>
              ) : (
                t('buttons.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
