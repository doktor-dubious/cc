'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useOrganization } from '@/context/OrganizationContext';
import { generateCesReport } from '@/lib/ces/ces-report-generator';
import type { ThirdPartyCompanyObj } from '@/lib/database/third-party';
import type { RiskLevel } from '@/lib/ces/ces-report-generator';

// The 15 wizard step field keys — used to compute org profile completion
const WIZARD_FIELDS = [
  'name',
  'size',
  'legalForm',
  'geographicScope',
  'businessOrientation',
  'naceSection',
  'euTaxonomyAligned',
  'digitalMaturity',
  'itSecurityStaff',
  'dataSensitivity',
  'itEndpointRange',
  'softwareDevelopment',
  'supplyChainPosition',
  'manualOperation',
  'securityBudgetRange',
] as const;

const TOTAL_STEPS = WIZARD_FIELDS.length;

type OrgProfileStatus = 'not_started' | 'in_progress' | 'finished';

function getOrgProfileProgress(org: Record<string, unknown> | null): {
  status: OrgProfileStatus;
  filledCount: number;
} {
  if (!org) return { status: 'not_started', filledCount: 0 };

  let filled = 0;
  for (const key of WIZARD_FIELDS) {
    const val = org[key];
    if (val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)) {
      filled++;
    }
  }

  if (filled === 0) return { status: 'not_started', filledCount: 0 };
  if (filled >= TOTAL_STEPS) return { status: 'finished', filledCount: filled };
  return { status: 'in_progress', filledCount: filled };
}

function getThirdPartyStatus(tp: ThirdPartyCompanyObj): 'not_started' | 'in_progress' | 'completed' {
  // Check how many CES fields are filled
  const cesFields: (keyof ThirdPartyCompanyObj)[] = [
    'regulatoryFramework',
    'customerSector',
    'dedicatedCompliance',
    'standardContract',
    'slaIncluded',
    'deliversToRegulated',
    'deliversToPublicInfra',
    'internationalOps',
    'coreDigital',
    'itDependency',
    'publicBrand',
    'deliveryRole',
    'accessLevel',
    'dataHandled',
    'disruptionImpact',
    'supplyChainRole',
  ];

  let filled = 0;
  for (const key of cesFields) {
    const val = tp[key];
    if (val !== null && val !== undefined) filled++;
  }

  if (filled === 0) return 'not_started';
  if (filled >= cesFields.length) return 'completed';
  return 'in_progress';
}

function riskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'Low':      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'Moderate': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'Elevated': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'High':     return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'Severe':   return 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300';
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'completed': return 'text-green-600 dark:text-green-400';
    case 'in_progress': return 'text-blue-600 dark:text-blue-400';
    default: return 'text-muted-foreground';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'completed':   return 'Completed';
    case 'in_progress': return 'In progress';
    default:            return 'Not started';
  }
}

export default function RiskFoundationPage() {
  const router = useRouter();
  const { activeOrganization } = useOrganization();

  const [orgData, setOrgData] = useState<Record<string, unknown> | null>(null);
  const [thirdParties, setThirdParties] = useState<ThirdPartyCompanyObj[]>([]);
  const [isLoadingOrg, setIsLoadingOrg] = useState(false);
  const [isLoadingTp, setIsLoadingTp] = useState(false);

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch organization data
  const loadOrg = useCallback(async () => {
    if (!activeOrganization?.id) return;
    setIsLoadingOrg(true);
    try {
      const res = await fetch(`/api/organization/${activeOrganization.id}`);
      const json = await res.json();
      if (json.success && json.data) setOrgData(json.data);
    } catch {
      // silently fail
    } finally {
      setIsLoadingOrg(false);
    }
  }, [activeOrganization?.id]);

  // Fetch third-party companies
  const loadThirdParties = useCallback(async () => {
    if (!activeOrganization?.id) return;
    setIsLoadingTp(true);
    try {
      const res = await fetch(`/api/third-party?organizationId=${activeOrganization.id}`);
      const json = await res.json();
      if (json.success) setThirdParties(json.data ?? []);
    } catch {
      // silently fail
    } finally {
      setIsLoadingTp(false);
    }
  }, [activeOrganization?.id]);

  useEffect(() => { loadOrg(); }, [loadOrg]);
  useEffect(() => { loadThirdParties(); }, [loadThirdParties]);

  const { status: orgStatus, filledCount } = getOrgProfileProgress(orgData);

  // Create third-party handler
  const handleCreate = async () => {
    if (!activeOrganization?.id || !newName.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/third-party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: activeOrganization.id,
          name: newName.trim(),
          description: newDescription.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreateDialog(false);
        setNewName('');
        setNewDescription('');
        // Navigate to the CES wizard for this new third party
        router.push(`/risk-foundation/client-exposure/${json.data.id}`);
      }
    } catch {
      // silently fail
    } finally {
      setIsCreating(false);
    }
  };

  const isLoading = isLoadingOrg || isLoadingTp;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Risk Foundation</h1>
        <p className="text-muted-foreground mt-1">
          Define the baseline risk profile for your organization
        </p>
      </div>

      {/* ── Organization Profile Section ─────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Organization Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define the company&apos;s structure and baseline risk
          </p>
        </div>

        {isLoadingOrg ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex items-center justify-between pt-4 border-t">
            {/* Status badge — bottom left */}
            <div>
              {orgStatus === 'not_started' && (
                <Badge variant="outline" className="text-muted-foreground">
                  Not started
                </Badge>
              )}
              {orgStatus === 'in_progress' && (
                <Badge variant="outline" className="border-blue-500/50 text-blue-600 dark:text-blue-400">
                  In progress — Step {filledCount} of {TOTAL_STEPS}
                </Badge>
              )}
              {orgStatus === 'finished' && (
                <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400">
                  Finished
                </Badge>
              )}
            </div>

            {/* Action button — bottom right */}
            <Button
              variant={orgStatus === 'finished' ? 'outline' : 'default'}
              className="cursor-pointer"
              onClick={() =>
                router.push(
                  `/risk-foundation/organization-profile${
                    activeOrganization?.id ? `?id=${activeOrganization.id}` : ''
                  }`
                )
              }
              disabled={!activeOrganization}
            >
              {orgStatus === 'not_started' && 'Start'}
              {orgStatus === 'in_progress' && 'Continue'}
              {orgStatus === 'finished' && 'Edit'}
            </Button>
          </div>
        )}
      </div>

      {/* ── Client Exposure Section ──────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Client Exposure</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Assess regulatory pressure from key customers
          </p>
        </div>

        {isLoadingTp ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Third-party company rows */}
            {thirdParties.map((tp) => {
              const tpStatus = getThirdPartyStatus(tp);
              const report = tpStatus !== 'not_started' ? generateCesReport(tp) : null;

              return (
                <div
                  key={tp.id}
                  className="rounded-lg border bg-background p-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">{tp.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      {report && (
                        <span className="flex items-center gap-1.5">
                          External pressure:
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${riskLevelColor(report.riskLevel)}`}>
                            {report.riskLevel}
                          </span>
                        </span>
                      )}
                      <span>
                        Status:{' '}
                        <span className={`font-medium ${statusColor(tpStatus)}`}>
                          {statusLabel(tpStatus)}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {tpStatus !== 'not_started' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => router.push(`/reports/ces`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/risk-foundation/client-exposure/${tp.id}`
                        )
                      }
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Add client exposure button */}
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer mt-2"
              onClick={() => {
                setNewName('');
                setNewDescription('');
                setShowCreateDialog(true);
              }}
              disabled={!activeOrganization}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add client exposure
            </Button>
          </div>
        )}
      </div>

      {/* ── Current Insights Section ────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-2">
          <h2 className="text-lg font-semibold">Current Insights</h2>
        </div>

        <div className="divide-y">
          {/* Structural Risk Profile */}
          <div className="flex items-center justify-between py-4">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
              Structural Risk Profile
            </span>
            {orgStatus === 'finished' ? (
              <Button
                variant="link"
                size="sm"
                className="cursor-pointer text-blue-600 dark:text-blue-400"
                onClick={() => router.push('/risk-foundation/structural-risk-profile')}
              >
                View
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">
                Complete Organization Profile to unlock
              </span>
            )}
          </div>

          {/* Financial Exposure */}
          <div className="flex items-center justify-between py-4">
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Financial Exposure
            </span>
            {orgStatus === 'finished' ? (
              <Button
                variant="link"
                size="sm"
                className="cursor-pointer text-blue-600 dark:text-blue-400"
                onClick={() => router.push('/risk-foundation/financial-exposure')}
              >
                View
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">
                Complete Organization Profile to unlock
              </span>
            )}
          </div>

          {/* Customer Exposure */}
          <div className="flex items-center justify-between py-4">
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Customer Exposure
            </span>
            <Button
              variant="link"
              size="sm"
              className="cursor-pointer text-blue-600 dark:text-blue-400"
              onClick={() => router.push('/risk-foundation/customer-exposure')}
            >
              View
            </Button>
          </div>
        </div>
      </div>

      {/* ── Create Third-Party Dialog ────────────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Client Exposure</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tp-name">Company name</Label>
              <Input
                id="tp-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter company name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newName.trim()) handleCreate();
                }}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tp-desc">Description (optional)</Label>
              <Textarea
                id="tp-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Brief description"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || isCreating}
              className="gap-2"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
