'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter }   from 'next/navigation';
import { useTranslations }              from 'next-intl';
import { ArrowLeft, Link2 }             from 'lucide-react';
import { Button }                       from '@/components/ui/button';
import { Input }                        from '@/components/ui/input';
import { Badge }                        from '@/components/ui/badge';
import { toast }                        from 'sonner';
import { getControlById }               from '@/lib/constants/cis-controls';
import type { Safeguard }               from '@/lib/constants/cis-controls';
import { useOrganization }              from '@/context/OrganizationContext';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type IG = 'ig1' | 'ig2' | 'ig3';

const IG_KEYS: IG[] = ['ig1', 'ig2', 'ig3'];

const IG_LABELS: Record<IG, string> = { ig1: 'IG1', ig2: 'IG2', ig3: 'IG3' };
const IG_FULL_LABELS: Record<IG, string> = { ig1: 'Implementation Group 1', ig2: 'Implementation Group 2', ig3: 'Implementation Group 3' };

// const TABLE_COLUMN_KEYS = ['asset', 'function', 'frequency', 'status', 'priority', 'likelihood', 'impact', 'owner'] as const;
const TABLE_COLUMN_KEYS = [ 'function', 
                            'IG',
                            'Task'
                          ] as const;
const TABLE_COLUMNS = TABLE_COLUMN_KEYS.map((k) => k.charAt(0).toUpperCase() + k.slice(1));

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

  // Filter safeguards that have content for the selected IG
  const filteredSafeguards = useMemo(() => {
    if (!control) return [];
    return control.safeguards.filter((s) => {
      const ig = s[activeIG];
      return ig.scope && ig.scope !== 'N/A';
    });
  }, [control, activeIG]);

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
        {(['ig1', 'ig2', 'ig3'] as IG[]).map((ig) => (
          <Button
            key={ig}
            variant={activeIG === ig ? 'default' : 'outline'}
            onClick={() => setActiveIG(ig)}
            title={IG_FULL_LABELS[ig]}
          >
            {IG_LABELS[ig]}
          </Button>
        ))}
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
                <th className="text-left p-3 whitespace-nowrap min-w-50">Safeguard</th>
                {TABLE_COLUMNS.map((col) => (
                  <th key={col} className="text-left p-3 whitespace-nowrap min-w-25">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSafeguards.map((safeguard) => (
                <tr
                  key={safeguard.id}
                  className={`border-t hover:bg-muted/50 cursor-pointer ${selectedSafeguard?.id === safeguard.id ? 'bg-muted/50' : ''}`}
                  onClick={() => setSelectedSafeguard(selectedSafeguard?.id === safeguard.id ? null : safeguard)}
                >
                  <td className="p-3">
                    <div className="font-medium">{safeguard.id} – {safeguard.title}</div>
                  </td>
                  {TABLE_COLUMNS.map((col) => (
                    <td key={col} className="p-3 text-muted-foreground text-sm">–</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setTaskSearchText(""); setIsLinkTaskDialogOpen(true); }}
                >
                  <Link2 className="w-4 h-4 mr-2" />
                  Link to Task
                </Button>
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
    </div>
  );
}
