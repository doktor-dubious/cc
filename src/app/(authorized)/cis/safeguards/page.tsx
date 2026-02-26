'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter }   from 'next/navigation';
import { useTranslations }              from 'next-intl';
import { ArrowLeft, Link2, Plus, Star, ChevronDown, ClipboardList } from 'lucide-react';
import { Button }                       from '@/components/ui/button';
import { Input }                        from '@/components/ui/input';
import { Textarea }                     from '@/components/ui/textarea';
import { Badge }                        from '@/components/ui/badge';
import { Checkbox }                     from '@/components/ui/checkbox';
import { Switch }                       from '@/components/ui/switch';
import { toast }                        from 'sonner';
import { format }                       from 'date-fns';
import { getControlById }               from '@/lib/constants/cis-controls';
import type { Safeguard }               from '@/lib/constants/cis-controls';
import { useOrganization }              from '@/context/OrganizationContext';
import { TASK_STATUSES, TASK_STATUS_LABELS } from '@/lib/constants/task-status';
import { TaskStatus }                   from '@prisma/client';
import { DatePicker }                   from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type IG = 'ig1' | 'ig2' | 'ig3';

const IG_LABELS: Record<IG, string> = { ig1: 'IG1', ig2: 'IG2', ig3: 'IG3' };
const IG_FULL_LABELS: Record<IG, string> = { ig1: 'Implementation Group 1', ig2: 'Implementation Group 2', ig3: 'Implementation Group 3' };

export default function CISSafeguardsPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const t            = useTranslations('CISSafeguards');
  const { activeOrganization } = useOrganization();
  const controlId    = parseInt(searchParams.get('control') || '1', 10);
  const control      = getControlById(controlId);

  const [activeIG, setActiveIG] = useState<IG>('ig1');
  const [selectedSafeguard, setSelectedSafeguard] = useState<Safeguard | null>(null);

  // Link to Task dialog state
  const [isLinkTaskDialogOpen, setIsLinkTaskDialogOpen] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);
  const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
  const [taskSearchText, setTaskSearchText] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Create New Task dialog state
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskExpectedEvidence, setNewTaskExpectedEvidence] = useState("");
  const [newTaskStartAt, setNewTaskStartAt] = useState("");
  const [newTaskEndAt, setNewTaskEndAt] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("NOT_STARTED");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Selection and starring state
  const [selectedSafeguardIds, setSelectedSafeguardIds] = useState<Set<string>>(new Set());
  const [starredSafeguardIds, setStarredSafeguardIds] = useState<Set<string>>(new Set());
  const [safeguardTaskCounts, setSafeguardTaskCounts] = useState<Record<string, number>>({});

  // Safeguard IG overrides - per safeguard, stores the IG value (1, 2, or 3)
  const [safeguardIgOverrides, setSafeguardIgOverrides] = useState<Record<string, number>>({});
  const [organizationIg, setOrganizationIg] = useState<number>(1);

  // Bulk task creation state
  const [isBulkCreateDialogOpen, setIsBulkCreateDialogOpen] = useState(false);
  const [bulkTaskEndAt, setBulkTaskEndAt] = useState("");
  const [bulkTaskStatus, setBulkTaskStatus] = useState<TaskStatus>("NOT_STARTED");
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [bulkCreateProgress, setBulkCreateProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });

  // Inactive safeguards state
  const [inactiveSafeguards, setInactiveSafeguards] = useState<Set<string>>(new Set());
  const [showInactive, setShowInactive] = useState(false);

  // Fetch tasks linked to selected safeguard
  const fetchLinkedTasks = async (safeguardId: string) => {
    try {
      const res = await fetch(`/api/task-safeguard?safeguardId=${safeguardId}`);
      const data = await res.json();
      if (data.success) {
        setLinkedTaskIds((data.data || []).map((ts: any) => ts.taskId));
      }
    } catch (error) {
      console.error('Failed to fetch linked tasks:', error);
    }
  };

  // Fetch available tasks from organization
  const fetchAvailableTasks = async () => {
    if (!activeOrganization) return;
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/task?organizationId=${activeOrganization.id}`);
      const data = await res.json();
      if (data.success) {
        setAvailableTasks(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Link safeguard to task
  const handleLinkTask = async (taskId: string) => {
    if (!selectedSafeguard) return;
    try {
      const res = await fetch('/api/task-safeguard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, safeguardId: selectedSafeguard.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Linked to task`);
        fetchLinkedTasks(selectedSafeguard.id);
        setIsLinkTaskDialogOpen(false);
      } else {
        toast.error(data.message || 'Failed to link task');
      }
    } catch (error) {
      console.error('Failed to link task:', error);
      toast.error('Failed to link task');
    }
  };

  // Open create task dialog with prefilled values
  const openCreateTaskDialog = () => {
    if (!selectedSafeguard) return;

    // Prefill form values
    setNewTaskName(selectedSafeguard.title);
    setNewTaskDescription(
      `${selectedSafeguard.definition}\n\nPurpose: ${selectedSafeguard.purpose}\n\nWhy: ${selectedSafeguard.why}`
    );
    setNewTaskExpectedEvidence("");
    setNewTaskStartAt(format(new Date(), "yyyy-MM-dd"));
    setNewTaskEndAt("");
    setNewTaskStatus("NOT_STARTED");
    setIsCreateTaskDialogOpen(true);
  };

  // Create new task and link to safeguard
  const handleCreateTask = async () => {
    if (!selectedSafeguard || !activeOrganization) return;

    setIsCreatingTask(true);
    try {
      // Create the task
      const createRes = await fetch('/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTaskName,
          description: newTaskDescription,
          expectedEvidence: newTaskExpectedEvidence,
          startAt: newTaskStartAt || null,
          endAt: newTaskEndAt || null,
          status: newTaskStatus,
          organizationId: activeOrganization.id,
        }),
      });
      const createData = await createRes.json();

      if (!createData.success) {
        toast.error(createData.message || 'Failed to create task');
        return;
      }

      const newTaskId = createData.data.id;

      // Link the task to the safeguard
      const linkRes = await fetch('/api/task-safeguard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: newTaskId, safeguardId: selectedSafeguard.id }),
      });
      const linkData = await linkRes.json();

      if (linkData.success) {
        toast.success('Task created and linked to safeguard');
        fetchLinkedTasks(selectedSafeguard.id);
        fetchAvailableTasks();
        setIsCreateTaskDialogOpen(false);
      } else {
        toast.success('Task created but failed to link to safeguard');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Fetch task counts for all safeguards in the control
  const fetchSafeguardTaskCounts = async () => {
    if (!control) return;
    const counts: Record<string, number> = {};
    try {
      for (const safeguard of control.safeguards) {
        const res = await fetch(`/api/task-safeguard?safeguardId=${safeguard.id}`);
        const data = await res.json();
        if (data.success) {
          counts[safeguard.id] = (data.data || []).length;
        }
      }
      setSafeguardTaskCounts(counts);
    } catch (error) {
      console.error('Failed to fetch safeguard task counts:', error);
    }
  };

  // Fetch safeguard IG overrides for the organization
  const fetchSafeguardIgOverrides = async () => {
    if (!activeOrganization) return;
    try {
      const res = await fetch(`/api/safeguard-ig?organizationId=${activeOrganization.id}`);
      const data = await res.json();
      if (data.success) {
        setSafeguardIgOverrides(data.data || {});
      }
    } catch (error) {
      console.error('Failed to fetch safeguard IG overrides:', error);
    }
  };

  // Set safeguard IG override
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
        setSafeguardIgOverrides(prev => ({ ...prev, [safeguardId]: ig }));
      } else {
        toast.error('Failed to save IG override');
      }
    } catch (error) {
      console.error('Failed to set safeguard IG:', error);
      toast.error('Failed to save IG override');
    }
  };

  // Get the effective IG for a safeguard (override or organization default)
  const getEffectiveIg = (safeguardId: string): number => {
    return safeguardIgOverrides[safeguardId] ?? organizationIg;
  };

  // Fetch inactive safeguards for the organization
  const fetchInactiveSafeguards = async () => {
    if (!activeOrganization) return;
    try {
      const res = await fetch(`/api/safeguard-inactive?organizationId=${activeOrganization.id}`);
      const data = await res.json();
      if (data.success) {
        setInactiveSafeguards(new Set(data.data || []));
      }
    } catch (error) {
      console.error('Failed to fetch inactive safeguards:', error);
    }
  };

  // Toggle safeguard active/inactive status
  const toggleSafeguardActive = async (safeguardId: string) => {
    if (!activeOrganization) return;
    const isCurrentlyInactive = inactiveSafeguards.has(safeguardId);

    try {
      if (isCurrentlyInactive) {
        // Mark as active (remove from inactive list)
        const res = await fetch('/api/safeguard-inactive', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId: activeOrganization.id, safeguardId }),
        });
        const data = await res.json();
        if (data.success) {
          setInactiveSafeguards(prev => {
            const next = new Set(prev);
            next.delete(safeguardId);
            return next;
          });
          toast.success('Safeguard marked as active');
        }
      } else {
        // Mark as inactive
        const res = await fetch('/api/safeguard-inactive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organizationId: activeOrganization.id, safeguardId }),
        });
        const data = await res.json();
        if (data.success) {
          setInactiveSafeguards(prev => new Set([...prev, safeguardId]));
          toast.success('Safeguard marked as inactive');
        }
      }
    } catch (error) {
      console.error('Failed to toggle safeguard active status:', error);
      toast.error('Failed to update safeguard status');
    }
  };

  // Toggle safeguard selection (checkbox)
  const toggleSafeguardSelection = (safeguardId: string) => {
    setSelectedSafeguardIds(prev => {
      const next = new Set(prev);
      if (next.has(safeguardId)) {
        next.delete(safeguardId);
      } else {
        next.add(safeguardId);
      }
      return next;
    });
  };

  // Toggle safeguard star
  const toggleSafeguardStar = (safeguardId: string) => {
    setStarredSafeguardIds(prev => {
      const next = new Set(prev);
      if (next.has(safeguardId)) {
        next.delete(safeguardId);
      } else {
        next.add(safeguardId);
      }
      return next;
    });
  };

  // Selection helpers
  const selectAll = () => {
    setSelectedSafeguardIds(new Set(filteredSafeguards.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedSafeguardIds(new Set());
  };

  const selectTasked = () => {
    setSelectedSafeguardIds(new Set(
      filteredSafeguards.filter(s => (safeguardTaskCounts[s.id] || 0) > 0).map(s => s.id)
    ));
  };

  const selectUntasked = () => {
    setSelectedSafeguardIds(new Set(
      filteredSafeguards.filter(s => !safeguardTaskCounts[s.id] || safeguardTaskCounts[s.id] === 0).map(s => s.id)
    ));
  };

  const selectStarred = () => {
    setSelectedSafeguardIds(new Set(
      filteredSafeguards.filter(s => starredSafeguardIds.has(s.id)).map(s => s.id)
    ));
  };

  // Bulk create tasks from selected safeguards
  const handleBulkCreateTasks = async () => {
    if (!activeOrganization || selectedSafeguardIds.size === 0) return;

    setIsBulkCreating(true);
    const safeguardIds = Array.from(selectedSafeguardIds);
    setBulkCreateProgress({ current: 0, total: safeguardIds.length, success: 0, failed: 0 });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < safeguardIds.length; i++) {
      const safeguardId = safeguardIds[i];
      const safeguard = control?.safeguards.find(s => s.id === safeguardId);
      if (!safeguard) {
        failed++;
        continue;
      }

      try {
        // Create the task
        const createRes = await fetch('/api/task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: safeguard.title,
            description: `${safeguard.definition}\n\nPurpose: ${safeguard.purpose}\n\nWhy: ${safeguard.why}`,
            expectedEvidence: "",
            startAt: format(new Date(), "yyyy-MM-dd"),
            endAt: bulkTaskEndAt || null,
            status: bulkTaskStatus,
            organizationId: activeOrganization.id,
          }),
        });
        const createData = await createRes.json();

        if (!createData.success) {
          failed++;
          setBulkCreateProgress({ current: i + 1, total: safeguardIds.length, success, failed });
          continue;
        }

        // Link the task to the safeguard
        const linkRes = await fetch('/api/task-safeguard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: createData.data.id, safeguardId }),
        });
        const linkData = await linkRes.json();

        if (linkData.success) {
          success++;
        } else {
          // Task created but link failed - still count as partial success
          success++;
        }
      } catch (error) {
        console.error('Failed to create task for safeguard:', safeguardId, error);
        failed++;
      }

      setBulkCreateProgress({ current: i + 1, total: safeguardIds.length, success, failed });
    }

    setIsBulkCreating(false);
    setIsBulkCreateDialogOpen(false);

    if (success > 0) {
      toast.success(`Created ${success} task(s) from safeguards`);
      fetchSafeguardTaskCounts();
      fetchAvailableTasks();
      setSelectedSafeguardIds(new Set());
    }
    if (failed > 0) {
      toast.error(`Failed to create ${failed} task(s)`);
    }
  };

  // Fetch task counts, IG overrides, and inactive safeguards when control/organization changes
  useEffect(() => {
    if (control && activeOrganization) {
      fetchSafeguardTaskCounts();
      fetchSafeguardIgOverrides();
      fetchInactiveSafeguards();
      // Set organization's target IG as the default
      setOrganizationIg(activeOrganization.ig || 1);
      // Also set the active IG filter to match organization's target
      setActiveIG(`ig${activeOrganization.ig || 1}` as IG);
    }
  }, [control?.id, activeOrganization?.id]);

  // When safeguard selection changes, fetch linked tasks and available tasks for names
  useEffect(() => {
    if (selectedSafeguard) {
      fetchLinkedTasks(selectedSafeguard.id);
      if (availableTasks.length === 0) {
        fetchAvailableTasks();
      }
    } else {
      setLinkedTaskIds([]);
    }
  }, [selectedSafeguard]);

  // When dialog opens, fetch available tasks
  useEffect(() => {
    if (isLinkTaskDialogOpen) {
      fetchAvailableTasks();
    }
  }, [isLinkTaskDialogOpen]);

  // Filter safeguards that have content for the selected IG and are not inactive (unless showInactive is true)
  const filteredSafeguards = useMemo(() => {
    if (!control) return [];
    return control.safeguards.filter((s) => {
      const ig = s[activeIG];
      const hasContent = ig.scope && ig.scope !== 'N/A';
      const isInactive = inactiveSafeguards.has(s.id);
      // Show if: has content AND (showInactive is true OR safeguard is not inactive)
      return hasContent && (showInactive || !isInactive);
    });
  }, [control, activeIG, inactiveSafeguards, showInactive]);

  if (!control) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Control not found.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">

      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 select-none"
        onClick={() => router.push('/cis/controls')}
      >
        <ArrowLeft size={16} />
        Back to Controls
      </Button>

      {/* Control header */}
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">
          Control {control.id}: {control.title}
        </h1>

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Overview</h2>
          <p className="text-sm leading-relaxed">{control.definition}</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Purpose</h2>
          <p className="text-sm leading-relaxed">{control.purpose}</p>
        </div>
      </div>

      {/* IG buttons */}
      <div className="flex gap-3 select-none">
        {(['ig1', 'ig2', 'ig3'] as IG[]).map((ig) => {
          const igNum = parseInt(ig.replace('ig', ''));
          const bgColor = igNum === 1 ? '#5D664D' : igNum === 2 ? '#335c8c' : '#ad423f';
          const isActive = activeIG === ig;
          return (
            <Button
              key={ig}
              variant="outline"
              className={`border-0 text-white transition-all ${
                isActive
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900'
                  : 'opacity-50 hover:opacity-80'
              }`}
              style={{ backgroundColor: bgColor }}
              onClick={() => setActiveIG(ig)}
              title={IG_FULL_LABELS[ig]}
            >
              {IG_LABELS[ig]}
            </Button>
          );
        })}
      </div>

      {/* Safeguards table */}
      {filteredSafeguards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No safeguards defined for {IG_FULL_LABELS[activeIG]} in this control.
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {/* Checkbox header with dropdown */}
                <th className="p-3 w-10">
                  <div className="flex items-center gap-1">
                    <Checkbox
                      checked={selectedSafeguardIds.size === filteredSafeguards.length && filteredSafeguards.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) selectAll();
                        else deselectAll();
                      }}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-muted rounded">
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={selectAll}>Select All</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={selectTasked}>All Tasked</DropdownMenuItem>
                        <DropdownMenuItem onClick={selectUntasked}>All Untasked</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={selectStarred}>Starred</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </th>
                <th className="text-left p-3 whitespace-nowrap min-w-50">Safeguard</th>
                <th className="text-left p-3 whitespace-nowrap min-w-25">Function</th>
                <th className="text-left p-3 whitespace-nowrap min-w-25">IG</th>
                <th className="text-left p-3 whitespace-nowrap min-w-25">Task</th>
                <th className="text-left p-3 whitespace-nowrap min-w-25">{t('tableColumns.exclude')}</th>
                <th className="p-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredSafeguards.map((safeguard) => {
                const taskCount = safeguardTaskCounts[safeguard.id] || 0;
                const hasTask = taskCount > 0;
                const isStarred = starredSafeguardIds.has(safeguard.id);
                const isSelected = selectedSafeguardIds.has(safeguard.id);

                // Determine lowest IG this safeguard belongs to
                const inIG1 = safeguard.ig1.scope && safeguard.ig1.scope !== 'N/A';
                const inIG2 = safeguard.ig2.scope && safeguard.ig2.scope !== 'N/A';
                const inIG3 = safeguard.ig3.scope && safeguard.ig3.scope !== 'N/A';
                const lowestIG = inIG1 ? 'IG1' : inIG2 ? 'IG2' : 'IG3';

                const isInactive = inactiveSafeguards.has(safeguard.id);

                return (
                  <tr
                    key={safeguard.id}
                    className={`border-t hover:bg-muted/50 cursor-pointer ${selectedSafeguard?.id === safeguard.id ? 'bg-muted/50' : ''} ${isInactive ? 'opacity-50' : ''}`}
                    onClick={() => setSelectedSafeguard(selectedSafeguard?.id === safeguard.id ? null : safeguard)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      toggleSafeguardStar(safeguard.id);
                    }}
                  >
                    {/* Checkbox cell */}
                    <td className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSafeguardSelection(safeguard.id)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{safeguard.id} – {safeguard.title}</div>
                    </td>
                    <td className="p-3 text-muted-foreground text-sm">–</td>
                    {/* IG column with clickable badges */}
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {[1, 2, 3].map((igValue) => {
                          const effectiveIg = getEffectiveIg(safeguard.id);
                          const isActive = effectiveIg === igValue;
                          const bgColor = igValue === 1 ? '#5D664D' : igValue === 2 ? '#335c8c' : '#ad423f';
                          return (
                            <Badge
                              key={igValue}
                              className={`text-xs cursor-pointer transition-all border-0 ${
                                isActive
                                  ? 'text-white ring-1 ring-white ring-offset-1 ring-offset-neutral-900'
                                  : 'text-white/70 opacity-40 hover:opacity-70'
                              }`}
                              style={{ backgroundColor: bgColor }}
                              onClick={() => setSafeguardIg(safeguard.id, igValue)}
                            >
                              IG{igValue}
                            </Badge>
                          );
                        })}
                      </div>
                    </td>
                    {/* Task column with badge */}
                    <td className="p-3">
                      {hasTask ? (
                        <Badge variant="default" className="text-xs">
                          Yes{taskCount > 1 ? ` (${taskCount})` : ''}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          No
                        </Badge>
                      )}
                    </td>
                    {/* Exclude column */}
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      {inactiveSafeguards.has(safeguard.id) ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => toggleSafeguardActive(safeguard.id)}
                        >
                          {t('buttons.setActive')}
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => toggleSafeguardActive(safeguard.id)}
                        >
                          {t('buttons.setInactive')}
                        </Button>
                      )}
                    </td>
                    {/* Star cell */}
                    <td className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
                      <Star
                        className={`w-4 h-4 cursor-pointer ${isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                        onClick={() => toggleSafeguardStar(safeguard.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Show inactive toggle */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <span className="text-sm text-muted-foreground">{t('legends.showInactive')}</span>
        </label>
      </div>

      {/* Bulk Action Bar */}
      {selectedSafeguardIds.size > 0 && (
        <div className="border rounded-lg bg-muted/30 p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Selected {selectedSafeguardIds.size} of {filteredSafeguards.length} Safeguards
          </span>
          <div className="flex items-center gap-4">
            <span
              title="Create tasks from selected safeguards"
              onClick={() => {
                setBulkTaskEndAt("");
                setBulkTaskStatus("NOT_STARTED");
                setIsBulkCreateDialogOpen(true);
              }}
              className="cursor-pointer"
            >
              <ClipboardList className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
            </span>
          </div>
        </div>
      )}

      {/* Bulk Create Tasks Dialog */}
      <Dialog open={isBulkCreateDialogOpen} onOpenChange={setIsBulkCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Tasks from Safeguards</DialogTitle>
            <DialogDescription>
              Create {selectedSafeguardIds.size} task(s) from selected safeguards.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div
              className="grid gap-2"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerDownCapture={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
            >
              <label className="block text-sm">End Date (optional)</label>
              <DatePicker
                value={bulkTaskEndAt}
                onChange={(date) => {
                  setBulkTaskEndAt(date ? format(date, "yyyy-MM-dd") : "");
                }}
                placeholder="Select end date"
              />
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">Status</label>
              <Select value={bulkTaskStatus} onValueChange={(v) => setBulkTaskStatus(v as TaskStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  sideOffset={4}
                  className="max-h-75 overflow-y-auto"
                >
                  {TASK_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {TASK_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isBulkCreating && (
              <div className="text-sm text-muted-foreground">
                Creating tasks... {bulkCreateProgress.current}/{bulkCreateProgress.total}
                {bulkCreateProgress.failed > 0 && (
                  <span className="text-red-500 ml-2">({bulkCreateProgress.failed} failed)</span>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsBulkCreateDialogOpen(false)} disabled={isBulkCreating}>
              Cancel
            </Button>
            <Button onClick={handleBulkCreateTasks} disabled={isBulkCreating}>
              {isBulkCreating ? 'Creating...' : `Create ${selectedSafeguardIds.size} Task(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail section below table */}
      {selectedSafeguard && (
        <div className="border rounded-lg bg-muted/30 max-w-3xl md:max-w-4xl lg:max-w-5xl">
          <div className="flex items-start justify-between p-6 pb-0">
            <h3 className="text-lg font-semibold">{selectedSafeguard.id} – {selectedSafeguard.title}</h3>
          </div>

          <Tabs defaultValue="information" className="w-full">
            <TabsList className="bg-transparent border-b rounded-none px-6 h-auto">
              <TabsTrigger
                value="information"
                className="bg-transparent! rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-4 py-2"
              >
                Information
              </TabsTrigger>
              <TabsTrigger
                value="tasks"
                className="bg-transparent! rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-transparent px-4 py-2"
              >
                Tasks ({linkedTaskIds.length})
              </TabsTrigger>
            </TabsList>

            {/* Information Tab */}
            <TabsContent value="information" className="p-6 pt-4 space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Definition</p>
                <p className="text-sm">{selectedSafeguard.definition}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Purpose</p>
                <p className="text-sm">{selectedSafeguard.purpose}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Why</p>
                <p className="text-sm">{selectedSafeguard.why}</p>
              </div>

              <hr />

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Scope</p>
                <p className="text-sm">{selectedSafeguard[activeIG].scope}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Approach</p>
                <p className="text-sm">{selectedSafeguard[activeIG].approach}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Example</p>
                <p className="text-sm">{selectedSafeguard[activeIG].example}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Resources</p>
                <p className="text-sm">{selectedSafeguard[activeIG].resources}</p>
              </div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="p-6 pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Tasks linked to this safeguard.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setTaskSearchText(""); setIsLinkTaskDialogOpen(true); }}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Link to Existing Task
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={openCreateTaskDialog}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Task
                  </Button>
                </div>
              </div>

              {linkedTaskIds.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No tasks linked to this safeguard.
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedTaskIds.map((taskId) => {
                    const task = availableTasks.find((t: any) => t.id === taskId);
                    return (
                      <div
                        key={taskId}
                        className="border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/task?id=${taskId}`)}
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{task ? task.name : taskId}</div>
                          {task?.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                        </div>
                        {task && (
                          <Badge variant="outline" className="ml-3 shrink-0 text-xs">{task.status}</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Link to Task Dialog */}
      <Dialog open={isLinkTaskDialogOpen} onOpenChange={setIsLinkTaskDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Link Safeguard to Task</DialogTitle>
            <DialogDescription>
              Select a task to link safeguard {selectedSafeguard?.id} to.
            </DialogDescription>
          </DialogHeader>
          <div className="mb-3">
            <Input
              placeholder="Search tasks..."
              value={taskSearchText}
              onChange={(e) => setTaskSearchText(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[50vh]">
            {loadingTasks ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading tasks...</p>
            ) : (
              <>
                {availableTasks
                  .filter(task => {
                    const q = taskSearchText.toLowerCase();
                    return !q || task.name.toLowerCase().includes(q) || (task.description || '').toLowerCase().includes(q);
                  })
                  .filter(task => !linkedTaskIds.includes(task.id))
                  .map(task => (
                    <button
                      key={task.id}
                      className="w-full text-left px-3 py-2 rounded hover:bg-muted/60 transition-colors border border-transparent hover:border-border"
                      onClick={() => handleLinkTask(task.id)}
                    >
                      <div className="text-sm font-medium">{task.name}</div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                      )}
                      <Badge variant="outline" className="mt-1 text-xs">{task.status}</Badge>
                    </button>
                  ))
                }
                {availableTasks
                  .filter(task => {
                    const q = taskSearchText.toLowerCase();
                    return !q || task.name.toLowerCase().includes(q) || (task.description || '').toLowerCase().includes(q);
                  })
                  .filter(task => !linkedTaskIds.includes(task.id)).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {taskSearchText ? 'No matching tasks found.' : 'No available tasks to link.'}
                  </p>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create New Task Dialog */}
      <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Create a new task based on safeguard {selectedSafeguard?.id}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <label className="block text-sm">Task Name</label>
              <Input
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Enter task name"
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">Description</label>
              <Textarea
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Enter task description"
                className="min-h-30"
              />
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">Expected Evidence</label>
              <Textarea
                value={newTaskExpectedEvidence}
                onChange={(e) => setNewTaskExpectedEvidence(e.target.value)}
                placeholder="Enter expected evidence"
                className="min-h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div
                className="grid gap-2 relative"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerDownCapture={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              >
                <label className="block text-sm">Start Date</label>
                <DatePicker
                  value={newTaskStartAt}
                  onChange={(date) => {
                    setNewTaskStartAt(date ? format(date, "yyyy-MM-dd") : "");
                  }}
                  placeholder="Select start date"
                />
              </div>

              <div
                className="grid gap-2 relative"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerDownCapture={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              >
                <label className="block text-sm">End Date</label>
                <DatePicker
                  value={newTaskEndAt}
                  onChange={(date) => {
                    setNewTaskEndAt(date ? format(date, "yyyy-MM-dd") : "");
                  }}
                  placeholder="Select end date"
                  disabled={(date) =>
                    (newTaskStartAt && date < new Date(newTaskStartAt)) ||
                    date > new Date("2030-12-31")
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">Status</label>
              <Select value={newTaskStatus} onValueChange={(v) => setNewTaskStatus(v as TaskStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  sideOffset={4}
                  className="max-h-75 overflow-y-auto"
                >
                  {TASK_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {TASK_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsCreateTaskDialogOpen(false)} disabled={isCreatingTask}>
              Cancel
            </Button>
            <Button onClick={handleCreateTask} disabled={!newTaskName.trim() || isCreatingTask}>
              {isCreatingTask ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
