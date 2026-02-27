'use client';

import { useState, useMemo, useEffect }    from 'react';
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
  Trash2,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FactorImpact = {
  parameter: string;
  value: string | null;
  impact: string;
  explanation: string;
};

type SafeguardRecommendation = {
  safeguardId: string;
  controlId: number;
  title: string;
  recommendedIg: number;
  shouldBeInactive: boolean;
  reasons: string[];
  relevanceScore: number;
  factors: FactorImpact[];
};

type ControlRecommendation = {
  controlId: number;
  title: string;
  shouldBeInactive: boolean;
  reasons: string[];
  relevanceScore: number;
  safeguards: SafeguardRecommendation[];
  factors: FactorImpact[];
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

export default function CISRiscAnalysisPage() {
  const t = useTranslations('ExploratoryGap');
  const tc = useTranslations('Common');
  const router = useRouter();
  const { activeOrganization } = useOrganization();

  const [isLoading, setIsLoading] = useState(false);
  const [isChangingIg, setIsChangingIg] = useState(false);
  const [isImplementing, setIsImplementing] = useState(false);
  const [recommendation, setRecommendation] = useState<GapRecommendation | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');

  // User adjustments
  const [selectedIg, setSelectedIg] = useState<number>(1);
  const [originalRecommendedIg, setOriginalRecommendedIg] = useState<number>(1); // System's recommendation
  const [inactiveControls, setInactiveControls] = useState<Set<number>>(new Set());
  const [inactiveSafeguards, setInactiveSafeguards] = useState<Set<string>>(new Set());

  // UI state
  const [expandedControls, setExpandedControls] = useState<Set<number>>(new Set());
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set()); // "control-{id}" or "safeguard-{id}"

  // Storage key for persistence
  const getStorageKey = (orgId: string) => `exploratory-gap-${orgId}`;

  // Load cached recommendation when organization changes
  useEffect(() => {
    if (!activeOrganization) return;

    const storageKey = getStorageKey(activeOrganization.id);
    const cached = localStorage.getItem(storageKey);

    if (cached) {
      try {
        const data = JSON.parse(cached);
        setRecommendation(data.recommendation);
        setOrganizationName(data.organizationName);
        setSelectedIg(data.selectedIg);
        setOriginalRecommendedIg(data.originalRecommendedIg ?? data.selectedIg);
        setInactiveControls(new Set(data.inactiveControls));
        setInactiveSafeguards(new Set(data.inactiveSafeguards));
      } catch (error) {
        console.error('Failed to load cached recommendation:', error);
        localStorage.removeItem(storageKey);
      }
    } else {
      // Clear state when switching to an organization with no cached data
      setRecommendation(null);
      setOrganizationName('');
      setSelectedIg(1);
      setOriginalRecommendedIg(1);
      setInactiveControls(new Set());
      setInactiveSafeguards(new Set());
    }
  }, [activeOrganization?.id]);

  // Save to localStorage when recommendation or adjustments change
  useEffect(() => {
    if (!activeOrganization || !recommendation) return;

    const storageKey = getStorageKey(activeOrganization.id);
    const data = {
      recommendation,
      organizationName,
      selectedIg,
      originalRecommendedIg,
      inactiveControls: Array.from(inactiveControls),
      inactiveSafeguards: Array.from(inactiveSafeguards),
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [activeOrganization?.id, recommendation, organizationName, selectedIg, originalRecommendedIg, inactiveControls, inactiveSafeguards]);

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
        setOriginalRecommendedIg(rec.recommendedIg); // Store the system's recommendation

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

  // Clear analysis
  const clearAnalysis = () => {
    if (!activeOrganization) return;

    const storageKey = getStorageKey(activeOrganization.id);
    localStorage.removeItem(storageKey);

    setRecommendation(null);
    setOrganizationName('');
    setSelectedIg(1);
    setOriginalRecommendedIg(1);
    setInactiveControls(new Set());
    setInactiveSafeguards(new Set());
    setExpandedControls(new Set());
    setExpandedExplanations(new Set());
    setShowClearDialog(false);

    toast.success(t('toast.clearSuccess'));
  };

  // Change IG and recalculate safeguard selections
  const changeIg = async (newIg: number) => {
    if (!activeOrganization || newIg === selectedIg) return;

    setIsChangingIg(true);
    try {
      const res = await fetch(`/api/gap-recommendation?organizationId=${activeOrganization.id}&targetIg=${newIg}`);
      const data = await res.json();

      if (data.success) {
        const rec = data.data.recommendation as GapRecommendation;
        setRecommendation(rec);
        setSelectedIg(newIg);
        // Don't update originalRecommendedIg - that stays as the system's recommendation

        // Update inactive sets from new recommendation
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
      } else {
        toast.error(data.error || t('toast.generateError'));
      }
    } catch (error) {
      console.error('Failed to change IG:', error);
      toast.error(t('toast.generateError'));
    } finally {
      setIsChangingIg(false);
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

  // Toggle explanation expansion
  const toggleExplanation = (key: string) => {
    setExpandedExplanations(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
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
        <h1 className="text-2xl font-semibold">{t('titleCISRisc')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Generate button and Clear/Implement buttons */}
      <div className="border rounded-lg p-6 bg-muted/30">
        <div className="flex items-center justify-between">
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
                {t('buttons.generateShort')}
              </>
            )}
          </Button>

          {recommendation && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowClearDialog(true)}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {tc('clear')}
              </Button>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                className="gap-2"
              >
                {t('buttons.implementShort')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
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
                  onClick={() => changeIg(ig)}
                  disabled={isChangingIg}
                >
                  {isChangingIg && selectedIg !== ig ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `IG${ig}`
                  )}
                  {ig === originalRecommendedIg && selectedIg !== ig && (
                    <span className="ml-1 text-xs opacity-60">(rec)</span>
                  )}
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
                          <span>•</span>
                          <button
                            className="text-xs text-blue-500 hover:text-blue-400 hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExplanation(`control-${control.controlId}`);
                            }}
                          >
                            {expandedExplanations.has(`control-${control.controlId}`) ? 'hide scoring' : 'explain scoring...'}
                          </button>
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

                    {/* Control explanation (shown when toggled, independent of expansion) */}
                    {expandedExplanations.has(`control-${control.controlId}`) && control.factors && (
                      <div className="px-4 py-3 bg-muted/30 border-t space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {t('labels.analysis')} — Factor Weights
                        </p>
                        <div className="rounded border bg-background/50 overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="text-left px-3 py-1.5 font-medium">Parameter</th>
                                <th className="text-left px-3 py-1.5 font-medium">Value</th>
                                <th className="text-left px-3 py-1.5 font-medium">Impact</th>
                                <th className="text-left px-3 py-1.5 font-medium">Explanation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {control.factors.map((factor, idx) => (
                                <tr key={idx} className="hover:bg-muted/30">
                                  <td className="px-3 py-1.5 font-medium">{factor.parameter}</td>
                                  <td className="px-3 py-1.5 text-muted-foreground font-mono">
                                    {factor.value || '—'}
                                  </td>
                                  <td className="px-3 py-1.5">
                                    <span className={
                                      factor.impact.includes('+') ? 'text-green-500' :
                                      factor.impact.includes('-') ? 'text-red-500' :
                                      factor.impact.includes('INACTIVE') ? 'text-red-500 font-medium' :
                                      'text-muted-foreground'
                                    }>
                                      {factor.impact}
                                    </span>
                                  </td>
                                  <td className="px-3 py-1.5 text-muted-foreground">{factor.explanation}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Final Score: <span className={`font-medium ${getRelevanceColor(control.relevanceScore)}`}>{control.relevanceScore}%</span>
                          {control.shouldBeInactive && <span className="text-red-500 ml-2">(Marked Inactive)</span>}
                        </p>
                      </div>
                    )}

                    {/* Expanded Safeguards */}
                    {isExpanded && (
                      <div className="bg-muted/20 border-t">
                        {/* Safeguards list */}
                        <div className="divide-y">
                          {control.safeguards.map(sf => {
                            const isSfInactive = inactiveSafeguards.has(sf.safeguardId);
                            const sfExplainKey = `safeguard-${sf.safeguardId}`;
                            return (
                              <div key={sf.safeguardId}>
                                <div
                                  className={`flex items-center gap-4 px-4 py-3 pl-12 ${isSfInactive ? 'opacity-50' : ''}`}
                                >
                                  <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm text-muted-foreground">
                                        {sf.safeguardId}
                                      </span>
                                      <span className="truncate text-sm">{sf.title}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                      {sf.reasons.length > 0 && (
                                        <p className="text-xs text-muted-foreground truncate">
                                          {sf.reasons[0]}
                                        </p>
                                      )}
                                      <button
                                        className="text-xs text-blue-500 hover:text-blue-400 hover:underline cursor-pointer flex-shrink-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleExplanation(sfExplainKey);
                                        }}
                                      >
                                        {expandedExplanations.has(sfExplainKey) ? 'hide' : 'explain...'}
                                      </button>
                                    </div>
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

                                {/* Expanded safeguard explanation */}
                                {expandedExplanations.has(sfExplainKey) && sf.factors && (
                                  <div className="px-4 py-2 pl-12 bg-muted/10 border-t">
                                    <div className="rounded border bg-background/50 overflow-hidden">
                                      <table className="w-full text-xs">
                                        <thead className="bg-muted/50">
                                          <tr>
                                            <th className="text-left px-2 py-1 font-medium">Parameter</th>
                                            <th className="text-left px-2 py-1 font-medium">Value</th>
                                            <th className="text-left px-2 py-1 font-medium">Impact</th>
                                            <th className="text-left px-2 py-1 font-medium">Explanation</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                          {sf.factors.map((factor, idx) => (
                                            <tr key={idx} className="hover:bg-muted/30">
                                              <td className="px-2 py-1 font-medium">{factor.parameter}</td>
                                              <td className="px-2 py-1 text-muted-foreground font-mono text-[10px]">
                                                {factor.value || '—'}
                                              </td>
                                              <td className="px-2 py-1">
                                                <span className={
                                                  factor.impact.includes('+') ? 'text-green-500' :
                                                  factor.impact.includes('-') ? 'text-red-500' :
                                                  factor.impact.includes('INACTIVE') ? 'text-red-500 font-medium' :
                                                  'text-muted-foreground'
                                                }>
                                                  {factor.impact}
                                                </span>
                                              </td>
                                              <td className="px-2 py-1 text-muted-foreground">{factor.explanation}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Final: <span className={`font-medium ${getRelevanceColor(sf.relevanceScore)}`}>{sf.relevanceScore}%</span>
                                      {sf.shouldBeInactive && <span className="text-red-500 ml-1">(Inactive)</span>}
                                    </p>
                                  </div>
                                )}
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

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.clearTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialog.clearDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={clearAnalysis}>
              {tc('clear')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Implement Confirmation Dialog */}
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
