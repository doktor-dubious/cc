'use client';

import { useUser }                              from '@/context/UserContext';
import { useOrganization }                      from '@/context/OrganizationContext';
import { useRouter }                            from 'next/navigation';
import { useEffect, useState }                  from 'react';
import { SquarePen, Trash2 }                    from 'lucide-react';
import { Button }                               from "@/components/ui/button";
import { ARTIFACT_TYPE_LABELS, ARTIFACT_TYPES } from '@/lib/constants/artifact-type';
import { ArtifactType }                         from '@prisma/client';
import { useTranslations }                      from 'next-intl';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { refresh } from 'next/cache';

export default function ArtifactPage()
{
    const user = useUser();
    const { activeOrganization } = useOrganization();
    const router = useRouter();
    const t = useTranslations('Asset');
    const tc = useTranslations('Common');

    const [artifacts, setArtifacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedArtifact, setSelectedArtifact] = useState<any | null>(null);

    // Form fields
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [artifactType, setArtifactType] = useState("DOCUMENT");
    const [deleteFromFilesystem, setDeleteFromFilesystem] = useState(false);

    // File Details fields
    const [mimeType, setMimeType] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

    const [artifactToDelete, setArtifactToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [filterText, setFilterText] = useState("");
    const [activeTab, setActiveTab] = useState("details");

    // Remove Task.
    const [taskToRemove, setTaskToRemove] = useState<number | null>(null);

    // Edit Task dialog states
    const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [taskName, setTaskName] = useState("");
    const [taskDescription, setTaskDescription] = useState("");
    const [taskHasChanges, setTaskHasChanges] = useState(false);

    // ── Fetch Artifacts ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    const fetchArtifacts = async () =>
    {
        if (!activeOrganization) return;

        try
        {
            const res = await fetch(`/api/artifact?organizationId=${activeOrganization.id}`);
            const data = await res.json();

            if (!data.success)
            {
                console.error('Failed to fetch artifacts:', data.message);
                return;
            }

            setArtifacts(data.data);
        }
        catch (error)
        {
            console.error('Failed to fetch artifacts:', error);
        }
        finally
        {
            setLoading(false);
        }
    };

    // ── Change organization + Initial Load + Refresh ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    useEffect(() =>
    {
        if (!user) return;
        if (!activeOrganization) return;

        fetchArtifacts();

        // Listen for refresh event
        const handleRefresh = () =>
        {
            fetchArtifacts();
        };

        window.addEventListener('refreshPage', handleRefresh);
        // console.log("Event listener added for refreshPage");

        return () =>
        {
            // console.log("Cleaning up event listener");
            window.removeEventListener('refreshPage', handleRefresh);
        };
    }, [user, activeOrganization]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // REMOVE / UNLINK TASK FROM ARTIFACT
    const handleRemoveTask = async () =>
    {
        if (!taskToRemove || !selectedArtifact) return;

        setIsDeleting(true);

        try
        {
            const res = await fetch('/api/task-artifact',
            {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  taskId: taskToRemove,
                  artifactId: selectedArtifact.id,
                }),
            });

            if (!res.ok)
            {
                const err = await res.json();
                throw new Error(err.error || 'Failed to remove task from artifact');
            }

            const data = await res.json();
            if (!data.success)
            {
                throw new Error(data.message || 'Operation failed');
            }

            // Optimistic UI update: remove the task from selectedArtifact.taskArtifacts
            setArtifacts((prevArtifacts) =>
              prevArtifacts.map((a) => {
                if (a.id !== selectedArtifact.id) return a;
                return {
                  ...a,
                  taskArtifacts: a.taskArtifacts.filter((ta: any) => ta.task.id !== taskToRemove),
                };
              })
            );

            // Also update selectedArtifact
            setSelectedArtifact((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                taskArtifacts: prev.taskArtifacts.filter((ta: any) => ta.task.id !== taskToRemove),
              };
            });

          toast.success(t('toast.taskRemovedSuccess'));
        }
        catch (err: any)
        {
            console.error("Remove task from artifact error:", err);
            toast.error(err.message || t('toast.removeTaskError'));
        }
        finally
        {
            setIsDeleting(false);
            setTaskToRemove(null);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // EDIT TASK

    // Click on Task table row.
    const handleTaskRowClick = (task: any) =>
    {
        setSelectedTask(task);
        setTaskName(task.name || "");
        setTaskDescription(task.description || "");
        setTaskHasChanges(false);
        setIsEditTaskDialogOpen(true);
    };

    // Task change detection.
    useEffect(() =>
    {
        if (!selectedTask) return;
        const nameChanged = taskName.trim() !== (selectedTask.name ?? "").trim();
        const descChanged = taskDescription.trim() !== (selectedTask.description ?? "").trim();
        setTaskHasChanges(nameChanged || descChanged);
    }, [taskName, taskDescription, selectedTask]);

    // Save Task.
    const handleTaskSave = async () => {
      if (!selectedTask || !taskHasChanges || !selectedArtifact) return;

      setIsSaving(true);
      try
      {
          const res = await fetch(`/api/task/${selectedTask.id}`,
          {
              method    : "PATCH",
              headers   : { "Content-Type": "application/json" },
              body      : JSON.stringify(
              {
                name        : taskName.trim(),
                description : taskDescription.trim() || undefined,
              }),
          });

          if (!res.ok)
          {
              const err = await res.json();
              throw new Error(err.error || "Failed to update task");
          }

          const data = await res.json();
          if (!data.success)
          {
              throw new Error(data.error || "Update failed");
          }

          const updatedTask = data.data;

          // Optimistic update in artifacts list
          setArtifacts((prevArtifacts) =>
            prevArtifacts.map((a) =>
            {
                if (a.id !== selectedArtifact.id) return a;
                return {
                  ...a,
                  taskArtifacts: a.taskArtifacts.map((ta: any) =>
                    ta.task.id === updatedTask.id ? { ...ta, task: updatedTask } : ta
                  ),
                };
            })
          );

          // Update selected artifact view
          setSelectedArtifact((prev) =>
          {
              if (!prev) return prev;
              return {
                ...prev,
                taskArtifacts: prev.taskArtifacts.map((ta: any) =>
                  ta.task.id === updatedTask.id ? { ...ta, task: updatedTask } : ta
                ),
              };
          });

          toast.success(t('toast.taskUpdatedSuccess'));
          setIsEditTaskDialogOpen(false);
          setSelectedTask(null);
      }
      catch (err: any)
      {
          console.error("Task update error:", err);
          toast.error(err.message || t('toast.updateTaskError'));
      }
      finally
      {
          setIsSaving(false);
      }
    };

    const handleTaskCancel = () =>
    {
        setIsEditTaskDialogOpen(false);
        setSelectedTask(null);
        setTaskName("");
        setTaskDescription("");
        setTaskHasChanges(false);
    };

    // ── Selected Artifact changed ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    useEffect(() =>
    {
        if (selectedArtifact)
        {
            setName(selectedArtifact.name || "");
            setDescription(selectedArtifact.description || "");
            setArtifactType(selectedArtifact.type || "DOCUMENT");
            setMimeType(selectedArtifact.mimeType || "");
        }
        else
        {
            setName("");
            setDescription("");
            setArtifactType("DOCUMENT");
            setMimeType("");
        }
    }, [selectedArtifact]);

    useEffect(() =>
    {
        if (!selectedArtifact)
        {
            const hasContent = name.trim() !== "";
            setHasChanges(hasContent);
            return;
        }

        const nameChanged = name.trim() !== (selectedArtifact.name || "").trim();
        const descChanged = description.trim() !== (selectedArtifact.description || "").trim();
        const typeChanged = artifactType !== selectedArtifact.type;
        const mimeTypeChanged = mimeType.trim() !== (selectedArtifact.mimeType || "").trim();

        setHasChanges(nameChanged || descChanged || typeChanged || mimeTypeChanged);
    }, [name, description, artifactType, mimeType, selectedArtifact]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterText]);

  const handleRowClick = (artifact: any) => {
    setSelectedArtifact(artifact);
    document.getElementById('edit-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewArtifact = () => {
    setSelectedArtifact(null);
    setName("");
    setDescription("");
    setArtifactType("DOCUMENT");
    setMimeType("");
    setHasChanges(false);
    setIsNewDialogOpen(true);
  };

  const handleCancel = () => {
    if (!selectedArtifact) {
      setName("");
      setDescription("");
      setArtifactType("DOCUMENT");
      setMimeType("");
    } else {
      setName(selectedArtifact.name || "");
      setDescription(selectedArtifact.description || "");
      setArtifactType(selectedArtifact.type || "DOCUMENT");
      setMimeType(selectedArtifact.mimeType || "");
    }
    setHasChanges(false);
    setIsNewDialogOpen(false);
  };

    const handleSave = async () =>
    {
        if (!name.trim())
        {
            toast.error(t('toast.nameRequired'));
            return;
        }

        if (!activeOrganization)
        {
            toast.error(t('toast.noOrganization'));
            return;
        }

      setIsSaving(true);

      try
      {
          const isNew = !selectedArtifact;
          const url = isNew ? '/api/artifact' : `/api/artifact/${selectedArtifact.id}`;
          const method = isNew ? 'POST' : 'PATCH';

          const body: any =
          {
              name           : name.trim(),
              description    : description.trim() || undefined,
              type           : artifactType,
              organizationId : parseInt(activeOrganization.id)
          };

          // Only include mimeType if it's been changed and is not empty
          if (mimeType.trim()) {
              body.mimeType = mimeType.trim();
          }

          const res = await fetch(url,
          {
              method,
              headers: { 'Content-Type': 'application/json' },
              body   : JSON.stringify(body),
          });

          if (!res.ok)
          {
              const err = await res.json();
              throw new Error(err.error || 'Save failed');
          }

          const data = await res.json();
          if (!data.success)
          {
              throw new Error(data.message || 'Save failed');
          }

          const updatedArtifact = data.artifact;

          if (isNew)
          {
              setArtifacts(prev => [...prev, updatedArtifact]);
              setSelectedArtifact(null);
              setIsNewDialogOpen(false);
          }
          else
          {
              setArtifacts(prev => prev.map(a => a.id === selectedArtifact.id ? updatedArtifact : a));
              setSelectedArtifact(updatedArtifact);
          }

          setHasChanges(false);
          toast.success(isNew ? t('toast.artifactCreated') : t('toast.artifactUpdated'));
      }
      catch (err)
      {
          console.error(err);
          toast.error(t('toast.saveError'));
      }
      finally
      {
          setIsSaving(false);
      }
  };

    // ------------------------------------------------------------
    // Delete Artifact.
    const handleDelete = async () =>
    {
        if (!artifactToDelete) return;

        setIsDeleting(true);

        try
        {
            const res = await fetch(`/api/artifact/${artifactToDelete}`,
            {
                method  : 'DELETE',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(
                {
                    deleteFile: deleteFromFilesystem
                }),
            });

            if (!res.ok)
            {
                throw new Error('Failed to delete artifact');
            }

            setArtifacts(prev => prev.filter(a => a.id !== artifactToDelete));

            if (selectedArtifact?.id === artifactToDelete)
            {
                setSelectedArtifact(null);
            }

            toast.success
            (
              deleteFromFilesystem
                ? t('toast.artifactAndFileDeletedSuccess')
                : t('toast.artifactDeletedSuccess')
            );

            setArtifactToDelete(null);
            setDeleteFromFilesystem(false);
          }
          catch (err)
          {
              toast.error(t('toast.deleteError'));
          }
          finally
          {
              setIsDeleting(false);
          }
      };

    const filteredArtifacts = artifacts.filter(artifact =>
      artifact.name.toLowerCase().includes(filterText.toLowerCase()) ||
      artifact.id.toString().includes(filterText)
    );

    const totalPages = Math.ceil(filteredArtifacts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentArtifacts = filteredArtifacts.slice(startIndex, endIndex);

    const getTypeBadge = (type: string) =>
    {
        const styles: Record<ArtifactType, string> =
        {
            [ArtifactType.DOCUMENT]:     'bg-[var(--color_asset_type_1)]',
            [ArtifactType.EXCEL]:        'bg-[var(--color_asset_type_2)]',
            [ArtifactType.IMAGE]:        'bg-[var(--color_asset_type_3)]',
            [ArtifactType.PRESENTATION]: 'bg-[var(--color_asset_type_4)]',
            [ArtifactType.PDF]:          'bg-[var(--color_asset_type_5)]',
            [ArtifactType.CONTRACT]:     'bg-[var(--color_asset_type_6)]',
            [ArtifactType.LEGAL]:        'bg-[var(--color_asset_type_7)]',
            [ArtifactType.POLICY]:       'bg-[var(--color_asset_type_8)]',
            [ArtifactType.PROCEDURE]:    'bg-[var(--color_asset_type_9)]',
            [ArtifactType.REPORT]:       'bg-[var(--color_asset_type_10)]',
            [ArtifactType.VIDEO]:        'bg-[var(--color_asset_type_11)]',
            [ArtifactType.AUDIO]:        'bg-[var(--color_asset_type_12)]',
            [ArtifactType.ARCHIVE]:      'bg-[var(--color_asset_type_13)]',
            [ArtifactType.DATA]:         'bg-[var(--color_asset_type_14)]',
            [ArtifactType.SOURCE_CODE]:  'bg-[var(--color_asset_type_15)]',
            [ArtifactType.OTHER]:        'bg-[var(--color_asset_type_16)]',
        };

        return styles[type as ArtifactType] || styles[ArtifactType.OTHER];
    };

    // Helper function to format file size
    const formatFileSize = (sizeStr: string | null) =>
    {
        if (!sizeStr) return '-';
        const bytes = parseInt(sizeStr, 10);
        if (isNaN(bytes) || bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    if (!user)
    {
        return <div>{t('loading.loadingUser')}</div>;
    }

    if (!activeOrganization)
    {
        return <div>{t('loading.selectOrganization')}</div>;
    }

    if (loading)
    {
        return <div>{t('loading.loadingArtifacts')}</div>;
    }

    const getStatusBadge = (taskStatus: string) =>
    {
        const styles =
        {
            NOT_STARTED : 'bg-[var(--color-status-not-started)]',
            OPEN        : 'bg-[var(--color-status-open)]',
            COMPLETED   : 'bg-[var(--color-status-completed)]',
            CLOSED      : 'bg-[var(--color-status-closed)]'
        };
        return styles[taskStatus as keyof typeof styles] || '';
    };

  return (
<>
{ /* Delete Task Alert */ }
<AlertDialog
  open={taskToRemove !== null}
  onOpenChange={(open) => {
    if (!open) setTaskToRemove(null);
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t('dialogs.removeTaskTitle')}</AlertDialogTitle>
      <AlertDialogDescription>
        {t('dialogs.removeTaskDescription')}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>{tc('buttons.cancel')}</AlertDialogCancel>
      <AlertDialogAction
        variant="destructive"
        onClick={handleRemoveTask}
        disabled={isDeleting}
      >
        {isDeleting ? t('buttons.removing') : t('buttons.removeTask')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

    { /* Delete Artifact Alert */ }
<AlertDialog
  open={artifactToDelete !== null}
  onOpenChange={(open) => {
    if (!open) {
      setArtifactToDelete(null);
      setDeleteFromFilesystem(false);
    }
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t('dialogs.deleteTitle')}</AlertDialogTitle>
      <AlertDialogDescription>
        {t('dialogs.deleteDescription', { name: artifacts.find(a => a.id === artifactToDelete)?.name || 'this item' })}
      </AlertDialogDescription>
    </AlertDialogHeader>

    <div className="flex items-center space-x-2 px-6 py-2">
      <input
        type="checkbox"
        id="delete-file"
        checked={deleteFromFilesystem}
        onChange={(e) => setDeleteFromFilesystem(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-destructive focus:ring-destructive"
        disabled={isDeleting}
      />
      <label
        htmlFor="delete-file"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
      >
        {t('dialogs.alsoDeleteFile')}
      </label>
    </div>

    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>{tc('buttons.cancel')}</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDelete}
        disabled={isDeleting}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {isDeleting ? t('buttons.deleting') : t('buttons.delete')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

      {/* New Dialog */ }
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('dialogs.createTitle')}</DialogTitle>
            <DialogDescription>
              {t('dialogs.createDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <label className="block text-sm">{t('labels.artifactName')}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('placeholders.enterArtifactName')}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">{t('labels.description')}</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('placeholders.enterDescription')}
                className="min-h-[120px]"
              />
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">{t('labels.artifactType')}</label>
              <Select value={artifactType} onValueChange={setArtifactType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARTIFACT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {ARTIFACT_TYPE_LABELS[type]}
                        </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              {tc('buttons.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? t('buttons.creating') : t('buttons.createArtifact')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Task Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('dialogs.editTaskTitle')}</DialogTitle>
            <DialogDescription>
              {t('dialogs.editTaskDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <label className="block text-sm">{t('labels.taskName')}</label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder={t('placeholders.enterTaskName')}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">{t('labels.description')}</label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder={t('placeholders.enterTaskDescription')}
                className="min-h-[120px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleTaskCancel}
              disabled={isSaving}
            >
              {tc('buttons.cancel')}
            </Button>
            <Button
              onClick={handleTaskSave}
              disabled={!taskHasChanges || isSaving}
            >
              {isSaving ? t('buttons.saving') : t('buttons.saveChanges')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-8 p-6">
        <div className="flex justify-center">
          <Button
            variant="default"
            size="sm"
            onClick={handleNewArtifact}
            className="cursor-pointer rounded-none"
          >
            {t('buttons.newArtifact')}
          </Button>
        </div>

        <div className="flex justify-end">
          <Input
            placeholder={t('placeholders.filterByNameOrId')}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc('table.name')}</TableHead>
              <TableHead>{tc('table.description')}</TableHead>
              <TableHead className="w-40">{tc('table.type')}</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentArtifacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {filterText ? t('empty.noArtifactsMatch') : t('empty.noArtifactsFound')}
                </TableCell>
              </TableRow>
            ) : (
              currentArtifacts.map((artifact) => (
                <TableRow
                  key={artifact.id}
                  className={`
                    cursor-pointer transition-colors
                    ${selectedArtifact?.id === artifact.id ? "bg-muted/60 hover:bg-muted/80" : "hover:bg-muted/50"}
                  `}
                  onClick={() => handleRowClick(artifact)}
                >
                  <TableCell>{artifact.name}</TableCell>
                  <TableCell className="max-w-md truncate">{artifact.description || '-'}</TableCell>
                  <TableCell className="w-40">
                    <Badge variant="secondary" className={`${getTypeBadge(artifact.type)} px-2 py-1 text-xs asset-type-badge`}>
                      {artifact.type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-20 text-right">
                    <div onClick={(e) => e.stopPropagation()} className="flex justify-end gap-2">
                      <button
                        className="hover:text-primary p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArtifact(artifact);
                        }}
                      >
                        <SquarePen size={16} className="cursor-pointer" />
                      </button>
                      <button
                        className="hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setArtifactToDelete(artifact.id);
                        }}
                      >
                        <Trash2 size={16} className="cursor-pointer" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {t('pagination.showing', { start: startIndex + 1, end: Math.min(endIndex, filteredArtifacts.length), total: filteredArtifacts.length })}
            </div>

            <div className="flex justify-end">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    </div>

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </div>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}

        {selectedArtifact && (
          <>
            <div>
              <hr className="my-8" />

              <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full" id="edit-form">
                <div className="relative w-full max-w-225">
                  <TabsList className="w-full bg-transparent border-b border-neutral-700 rounded-none p-0 h-auto grid grid-cols-3">
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                      value="details"
                    >
                      {t('tabs.details')}
                    </TabsTrigger>
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                      value="file-details"
                    >
                      {t('tabs.fileDetails')}
                    </TabsTrigger>
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                      value="tasks"
                    >
                      {t('tabs.tasks', { count: selectedArtifact.taskArtifacts?.length || 0 })}
                    </TabsTrigger>
                  </TabsList>
                  <div
                    className="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out z-0"
                    style={{
                      width: '33.333%',
                      left: activeTab === 'details' ? '0%' : activeTab === 'file-details' ? '33.333%' : '66.666%'
                    }}
                  />
                </div>

                <TabsContent value="details" className="space-y-6 max-w-2xl mt-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm mb-2">{tc('table.id')}</label>
                      <Input
                        value={selectedArtifact?.id?.toString() || ''}
                        disabled
                        className="opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">{t('labels.artifactName')}</label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('placeholders.enterArtifactName')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2">{t('labels.description')}</label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('placeholders.enterDescription')}
                        className="min-h-[120px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2">{t('labels.artifactType')}</label>
                      <Select value={artifactType} onValueChange={setArtifactType}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ARTIFACT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {ARTIFACT_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                        </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="file-details" className="space-y-6 max-w-2xl mt-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm mb-2">{t('labels.mimeType')}</label>
                      <Input
                        value={mimeType}
                        onChange={(e) => setMimeType(e.target.value)}
                        placeholder={t('placeholders.mimeTypeExample')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2">{t('labels.fileExtension')}</label>
                      <Input
                        value={selectedArtifact.extension || '-'}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2">{t('labels.fileSize')}</label>
                      <Input
                        value={formatFileSize(selectedArtifact.size)}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2">{t('labels.originalFileName')}</label>
                      <Input
                        value={selectedArtifact.originalName || '-'}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tasks" className="mt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20 text-right">{tc('table.id')}</TableHead>
                        <TableHead>{tc('table.name')}</TableHead>
                        <TableHead>{tc('table.description')}</TableHead>
                        <TableHead className="w-32">{tc('table.status')}</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedArtifact.taskArtifacts?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            {t('empty.noTasksConnected')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedArtifact.taskArtifacts?.map((ta: any) => (
                          <TableRow key={ta.task.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleTaskRowClick(ta.task)}
                          >
                            <TableCell className="w-20 text-right tabular-nums">{ta.task.id}</TableCell>
                            <TableCell>{ta.task.name}</TableCell>
                            <TableCell>{ta.task.description || '-'}</TableCell>
                            <TableCell className="w-32">
                              <Badge variant="secondary" className={`${getStatusBadge(ta.task.status)} px-2 py-1 text-xs status-badge`}>
                                {ta.task.status.replace('_', ' ')}
                              </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              className="hover:text-destructive p-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskToRemove(ta.task.id);
                              }}
                            >
                              <Trash2 size={16} className="cursor-pointer" />
                            </button>
                          </TableCell>
                        </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}

        {selectedArtifact && hasChanges && (
          <div className={`
            fixed
            bottom-0
            left-var(--sidebar-width)
            right-0
            bg-neutral-900
            border-t
            border-neutral-800
            px-6
            py-2
            w-full
            flex
            justify-end
            gap-3
            transition-transform
            duration-500
            ease-in-out
            ${hasChanges ? 'translate-y-0' : 'translate-y-full'}
          `}>
            <Button
              variant="secondary"
              onClick={handleCancel}
              disabled={isSaving}
            >
              {tc('buttons.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? t('buttons.saving') : t('buttons.saveChanges')}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}