'use client';

import { useUser }                              from '@/context/UserContext';
import { useOrganization }                      from '@/context/OrganizationContext';
import { useRouter }                            from 'next/navigation';
import { useEffect, useState }                  from 'react';
import { TASK_STATUS_LABELS, TASK_STATUSES }    from '@/lib/constants/task-status';
import { TaskStatus }                           from '@prisma/client';
import { format }                               from "date-fns";

import { SquarePen, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

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

import { DatePicker } from "@/components/ui/date-picker"

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

export default function TaskPage()
{
    const user = useUser();
    const { activeOrganization } = useOrganization();
    const router = useRouter();

    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedTask, setSelectedTask] = useState<any | null>(null);

    // Form fields
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [expectedEvidence, setExpectedEvidence] = useState("");
    const [startAt, setStartAt] = useState("");
    const [endAt, setEndAt] = useState("");
    const [status, setStatus] = useState<TaskStatus>("NOT_STARTED");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

    const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [filterText, setFilterText] = useState("");
    const [activeTab, setActiveTab] = useState("details");

    const [selectedArtifact, setSelectedArtifact] = useState<any | null>(null);
    const [isEditArtifactDialogOpen, setIsEditArtifactDialogOpen] = useState(false);
    const [artifactName, setArtifactName] = useState("");
    const [artifactDescription, setArtifactDescription] = useState("");
    const [artifactHasChanges, setArtifactHasChanges] = useState(false);

    const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
    const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
    const [profileName, setProfileName] = useState("");
    const [profileDescription, setProfileDescription] = useState("");
    const [profileHasChanges, setProfileHasChanges] = useState(false);

    // For removing artifacts from this task
    const [artifactToRemove, setArtifactToRemove] = useState<number | null>(null);

    // For removing profiles from this task
    const [profileToRemove, setProfileToRemove] = useState<number | null>(null);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // REMOVE ARTIFACT FROM TASK
    const handleRemoveArtifact = async () => 
    {
        if (!artifactToRemove || !selectedTask) return;

        setIsDeleting(true);

        try {
          const res = await fetch('/api/task-artifact', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: selectedTask.id,
              artifactId: artifactToRemove,
            }),
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to remove artifact from task');
          }

          const data = await res.json();
          if (!data.success) {
            throw new Error(data.error || 'Operation failed');
          }

          // Optimistic UI update
          setTasks((prevTasks) =>
            prevTasks.map((t) => {
              if (t.id !== selectedTask.id) return t;
              return {
                ...t,
                taskArtifacts: t.taskArtifacts.filter((ta: any) => ta.artifact.id !== artifactToRemove),
              };
            })
          );

          setSelectedTask((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              taskArtifacts: prev.taskArtifacts.filter((ta: any) => ta.artifact.id !== artifactToRemove),
            };
          });

          toast.success("Artifact removed from task");
        } catch (err: any) {
          console.error("Remove artifact error:", err);
          toast.error(err.message || "Could not remove artifact from task");
        } finally {
          setIsDeleting(false);
          setArtifactToRemove(null);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // REMOVE PROFILE FROM TASK
    const handleRemoveProfile = async () => 
    {
        if (!profileToRemove || !selectedTask) return;

        setIsDeleting(true);

        try {
          const res = await fetch('/api/task-profile', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: selectedTask.id,
              profileId: profileToRemove,
            }),
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to remove profile from task');
          }

          const data = await res.json();
          if (!data.success) {
            throw new Error(data.error || 'Operation failed');
          }

          // Optimistic UI update
          setTasks((prevTasks) =>
            prevTasks.map((t) => {
              if (t.id !== selectedTask.id) return t;
              return {
                ...t,
                taskProfiles: t.taskProfiles.filter((tp: any) => tp.profile.id !== profileToRemove),
              };
            })
          );

          setSelectedTask((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              taskProfiles: prev.taskProfiles.filter((tp: any) => tp.profile.id !== profileToRemove),
            };
          });

          toast.success("Profile removed from task");
        } catch (err: any) {
          console.error("Remove profile error:", err);
          toast.error(err.message || "Could not remove profile from task");
        } finally {
          setIsDeleting(false);
          setProfileToRemove(null);
        }
    };

    // ── Change organization ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    useEffect(() => 
    {
        if (!user) return;
        if (activeOrganization) 
        {
            fetchTasks();
        }
    }, [user, activeOrganization]);

    useEffect(() =>
    {
      if (selectedTask)
      {
          setName(selectedTask.name || "");
          setDescription(selectedTask.description || "");
          setExpectedEvidence(selectedTask.expectedEvidence || "");
          setStartAt(selectedTask.startAt ? new Date(selectedTask.startAt).toISOString().slice(0, 10) : "");
          setEndAt(selectedTask.endAt ? new Date(selectedTask.endAt).toISOString().slice(0, 10) : "");
          setStatus(selectedTask.status || TaskStatus.NOT_STARTED);
      } 
      else 
      {
          setName("");
          setDescription("");
          setExpectedEvidence("");
          setStartAt("");
          setEndAt("");
          setStatus(TaskStatus.NOT_STARTED);
      }
    }, [selectedTask]);

    useEffect(() => 
    {
        if (!selectedTask) 
        {
            const hasContent = name.trim() !== "";
            setHasChanges(hasContent);
            return;
        }

        const nameChanged = name.trim() !== (selectedTask.name || "").trim();
        const descChanged = description.trim() !== (selectedTask.description || "").trim();
        const evidenceChanged = expectedEvidence.trim() !== (selectedTask.expectedEvidence || "").trim();
        const statusChanged = status !== selectedTask.status;
        
        const originalStartAt = selectedTask.startAt ? new Date(selectedTask.startAt).toISOString().slice(0, 16) : "";
        const originalEndAt = selectedTask.endAt ? new Date(selectedTask.endAt).toISOString().slice(0, 16) : "";
        const startChanged = startAt !== originalStartAt;
        const endChanged = endAt !== originalEndAt;

        setHasChanges(nameChanged || descChanged || evidenceChanged || statusChanged || startChanged || endChanged);
    }, [name, description, expectedEvidence, status, startAt, endAt, selectedTask]);

  useEffect(() => 
  {
      setCurrentPage(1);
  }, [filterText]);

  const handleRowClick = (task: any) => 
  {
      setSelectedTask(task);
      document.getElementById('edit-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleNewTask = () => 
  {
      setSelectedTask(null);
      setName("");
      setDescription("");
      setExpectedEvidence("");
      setStartAt("");
      setEndAt("");
      setStatus(TaskStatus.NOT_STARTED);
      setHasChanges(false);
      setIsNewDialogOpen(true);
  };

  const handleCancel = () => 
  {
      if (!selectedTask) 
      {
          setName("");
          setDescription("");
          setExpectedEvidence("");
          setStartAt("");
          setEndAt("");
          setStatus(TaskStatus.NOT_STARTED);
      } 
      else 
      {
          setName(selectedTask.name || "");
          setDescription(selectedTask.description || "");
          setExpectedEvidence(selectedTask.expectedEvidence || "");
          setStartAt(selectedTask.startAt ? new Date(selectedTask.startAt).toISOString().slice(0, 10) : "");
          setEndAt(selectedTask.endAt ? new Date(selectedTask.endAt).toISOString().slice(0, 10) : "");
          setStatus(selectedTask.status || TaskStatus.NOT_STARTED);
      }

      setHasChanges(false);
      setIsNewDialogOpen(false);
  };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SAVE TASK
    const handleSave = async () => 
    {
        if (!name.trim()) 
        {
            toast.error("Task name is required");
            return;
        }

        if (!activeOrganization) 
        {
            toast.error("No organization selected");
            return;
        }

        setIsSaving(true);

        try
        {
            const isNew  = !selectedTask;
            const url    = isNew ? '/api/task' : `/api/task/${selectedTask.id}`;
            const method = isNew ? 'POST' : 'PATCH';

            const body: any = 
            {
                name              : name.trim(),
                description       : description.trim(),
                expectedEvidence  : expectedEvidence.trim(),
                status,
            };

            if (isNew) 
            {
                body.organizationId = parseInt(activeOrganization.id);
            }

            if (startAt) body.startAt = new Date(startAt).toISOString();
            if (endAt) body.endAt = new Date(endAt).toISOString();

            const res = await fetch(url, 
            {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok)
            {
                const err = await res.json();
                throw new Error(err.error || 'Save failed');
            }

            const data = await res.json();
            if (!data.success) 
            {
                throw new Error(data.error || 'Save failed');
            }

            const updatedTask = data.data;

            if (isNew) 
            {
                setTasks(prev => [...prev, updatedTask]);
                setSelectedTask(null);
                setIsNewDialogOpen(false);
            } 
            else 
            {
                setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
                setSelectedTask(updatedTask);
            }

            setHasChanges(false);
            toast.success(isNew ? "Task created" : "Task updated");
        } 
        catch (err) 
        {
            console.error(err);
            toast.error("Could not save task");
        } 
        finally 
        {
          setIsSaving(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // DELETE TASK
    const handleDelete = async () => 
    {
        if (!taskToDelete) return;

        setIsDeleting(true);

        try
        {
            const res = await fetch(`/api/task/${taskToDelete}`, 
            {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) 
            {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete task');
            }

            setTasks(prev => prev.filter(t => t.id !== taskToDelete));
            if (selectedTask?.id === taskToDelete)
            {
                setSelectedTask(null);
            }

            toast.success("Task deleted successfully");
            setTaskToDelete(null);
        } 
        catch (err) 
        {
            toast.error("Could not delete task");
        } 
        finally 
        {
            setIsDeleting(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // CLICK ON ARTIFACT

const handleArtifactRowClick = (artifact: any) => {
  setSelectedArtifact(artifact);
  setArtifactName(artifact.name || "");
  setArtifactDescription(artifact.description || "");
  setIsEditArtifactDialogOpen(true);
};

const handleProfileRowClick = (profile: any) => {
  setSelectedProfile(profile);
  setProfileName(profile.name || "");
  setProfileDescription(profile.description || "");
  setIsEditProfileDialogOpen(true);
};

// Artifact change detection
useEffect(() => {
  if (!selectedArtifact) return;

  const nameChanged = artifactName.trim() !== (selectedArtifact.name ?? "").trim();
  const descChanged = artifactDescription.trim() !== (selectedArtifact.description ?? "").trim();

  setArtifactHasChanges(nameChanged || descChanged);
}, [artifactName, artifactDescription, selectedArtifact]);

// Profile change detection
useEffect(() => {
  if (!selectedProfile) return;

  const nameChanged = profileName.trim() !== (selectedProfile.name ?? "").trim();
  const descChanged = profileDescription.trim() !== (selectedProfile.description ?? "").trim();

  setProfileHasChanges(nameChanged || descChanged);
}, [profileName, profileDescription, selectedProfile]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SAVE ARTIFACT
  const handleArtifactSave = async () => 
  {
      if (!selectedArtifact) return;

      if (!artifactName.trim()) 
      {
          toast.error("Artifact name is required");
          return;
      }

      setIsSaving(true);

      try 
      {
          const res = await fetch(`/api/artifact/${selectedArtifact.id}`, 
          {
              method  : 'PATCH',
              headers : { 'Content-Type': 'application/json' },
              body    : JSON.stringify({
                name: artifactName.trim(),
                description: artifactDescription.trim(),
              }),
          });

          if (!res.ok) 
          {
              const err = await res.json();
              throw new Error(err.error || 'Failed to update artifact');
          }

          const data = await res.json();
          if (!data.success) 
          {
              throw new Error(data.error || 'Update failed');
          }

          const updatedArtifact = data.data;

          // Update local state
          setTasks(prevTasks =>
            prevTasks.map(task => {
              if (task.id !== selectedTask?.id) return task;
              return {
                ...task,
                taskArtifacts: task.taskArtifacts.map((ta: any) =>
                  ta.artifact.id === selectedArtifact.id 
                    ? { ...ta, artifact: updatedArtifact } 
                    : ta
                ),
              };
            })
          );

          // Update selectedTask
          setSelectedTask(prev => 
          {
              if (!prev) return prev;
              return {
                ...prev,
                taskArtifacts: prev.taskArtifacts.map((ta: any) =>
                  ta.artifact.id === selectedArtifact.id 
                    ? { ...ta, artifact: updatedArtifact } 
                    : ta
                ),
              };
          });

          toast.success("Artifact updated successfully");
          setIsEditArtifactDialogOpen(false);
      } 
      catch (err) 
      {
          console.error(err);
          toast.error("Could not save artifact");
      } 
      finally 
      {
          setIsSaving(false);
      }
  };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SAVE PROFILE
    const handleProfileSave = async () => 
    {
        if (!selectedProfile) return;

        if (!profileName.trim()) 
        {
            toast.error("Profile name is required");
            return;
        }

        setIsSaving(true);

        try 
        {
            const res = await fetch(`/api/profile/${selectedProfile.id}`, 
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: profileName.trim(),
                  description: profileDescription.trim(),
                }),
            });

            if (!res.ok) 
            {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update profile');
            }

            const data = await res.json();
            if (!data.success) 
            {
                throw new Error(data.error || 'Update failed');
            }

            const updatedProfile = data.data;

            // Update local state
            setTasks(prevTasks =>
              prevTasks.map(task => {
                if (task.id !== selectedTask?.id) return task;
                return {
                  ...task,
                  taskProfiles: task.taskProfiles.map((tp: any) =>
                    tp.profile.id === selectedProfile.id 
                      ? { ...tp, profile: updatedProfile } 
                      : tp
                  ),
                };
              })
            );

            // Update selectedTask
            setSelectedTask(prev => 
            {
                if (!prev) return prev;
                return {
                  ...prev,
                  taskProfiles: prev.taskProfiles.map((tp: any) =>
                    tp.profile.id === selectedProfile.id 
                      ? { ...tp, profile: updatedProfile } 
                      : tp
                  ),
                };
            });

            toast.success("Profile updated successfully");
            setIsEditProfileDialogOpen(false);
        } 
        catch (err) 
        {
            console.error(err);
            toast.error("Could not save profile");
        } 
        finally 
        {
            setIsSaving(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH TASKS
    const fetchTasks = async () => 
    {
        if (!activeOrganization) return;

        try 
        {
            const res = await fetch(`/api/task?organizationId=${activeOrganization.id}`);
            const data = await res.json();
            if (!data.success)
            {
              console.error('Failed to fetch tasks:', data.message);
              return;
            }
            setTasks(data.data);
        } 
        catch (error) 
        {
            console.error('Failed to fetch tasks:', error);
        } 
        finally 
        {
            setLoading(false);
        }
    };

  const filteredTasks = tasks.filter(task =>
    task.name.toLowerCase().includes(filterText.toLowerCase()) ||
    task.id.toString().includes(filterText)
  );

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTasks = filteredTasks.slice(startIndex, endIndex);

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

  if (!user) {
    return <div>Loading user...</div>;
  }

  if (!activeOrganization) {
    return <div>Please select an organization</div>;
  }

  if (loading) {
    return <div>Loading tasks...</div>;
  }

  return (
<>
{/* Confirm remove artifact from task */}
<AlertDialog
  open={artifactToRemove !== null}
  onOpenChange={(open) => {
    if (!open) setArtifactToRemove(null);
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Remove artifact from task?</AlertDialogTitle>
      <AlertDialogDescription>
        This will unlink the artifact from the current task (delete the link in TaskArtifact).
        The artifact itself remains in the system and can still be assigned to other tasks.
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
      <AlertDialogAction
        variant="destructive"
        onClick={handleRemoveArtifact}
        disabled={isDeleting}
      >
        {isDeleting ? "Removing..." : "Remove artifact"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

{/* Confirm remove profile from task */}
<AlertDialog
  open={profileToRemove !== null}
  onOpenChange={(open) => {
    if (!open) setProfileToRemove(null);
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Remove profile from task?</AlertDialogTitle>
      <AlertDialogDescription>
        This will unlink the profile from the current task (delete the link in TaskProfile).
        The profile itself remains in the system and can still be assigned to other tasks.
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
      <AlertDialogAction
        variant="destructive"
        onClick={handleRemoveProfile}
        disabled={isDeleting}
      >
        {isDeleting ? "Removing..." : "Remove profile"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>


      <AlertDialog
        open={taskToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTaskToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task
              "{tasks.find(t => t.id === taskToDelete)?.name || 'this item'}"
              and remove it from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Enter the details for the new task. Click Save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <label className="block text-sm">Task name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter task name"
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter task description"
                className="min-h-30"
              />
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">Expected Evidence</label>
              <Textarea
                value={expectedEvidence}
                onChange={(e) => setExpectedEvidence(e.target.value)}
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
                    value={startAt}
                    onChange={(date) => {
                      setStartAt(date ? format(date, "yyyy-MM-dd") : "");
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
                  value={endAt}
                  onChange={(date) => {
                    setEndAt(date ? format(date, "yyyy-MM-dd") : "");
                  }}
                  placeholder="Select end date"
                  disabled={(date) =>
                    (startAt && date < new Date(startAt)) ||
                    date > new Date("2030-12-31") // example max
                    }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">Status</label>
              <Select value={status} onValueChange={setStatus}>
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
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? 'Creating...' : 'Create task'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

{/* Edit Artifact Dialog */}
<Dialog open={isEditArtifactDialogOpen} onOpenChange={setIsEditArtifactDialogOpen}>
  <DialogContent className="sm:max-w-125">
    <DialogHeader>
      <DialogTitle>Edit Artifact</DialogTitle>
      <DialogDescription>
        Update the artifact name and description.
      </DialogDescription>
    </DialogHeader>

    <div className="grid gap-6 py-4">
      <div className="grid gap-2">
        <label className="text-sm">Artifact name</label>
        <Input
          value={artifactName}
          onChange={(e) => setArtifactName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm">Description</label>
        <Textarea
          value={artifactDescription}
          onChange={(e) => setArtifactDescription(e.target.value)}
          className="min-h-30"
        />
      </div>
    </div>

    <div className="flex justify-end gap-3">
      <Button
        variant="outline"
        onClick={() => setIsEditArtifactDialogOpen(false)}
        disabled={isSaving}
      >
        Cancel
      </Button>

      <Button
        onClick={handleArtifactSave}
        disabled={!artifactHasChanges || isSaving}
      >
        {isSaving ? "Saving..." : "Save changes"}
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* Edit Profile Dialog */}
<Dialog open={isEditProfileDialogOpen} onOpenChange={setIsEditProfileDialogOpen}>
  <DialogContent className="sm:max-w-125">
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>
        Update the profile name and description.
      </DialogDescription>
    </DialogHeader>

    <div className="grid gap-6 py-4">
      <div className="grid gap-2">
        <label className="text-sm">Profile name</label>
        <Input
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm">Description</label>
        <Textarea
          value={profileDescription}
          onChange={(e) => setProfileDescription(e.target.value)}
          className="min-h-30"
        />
      </div>
    </div>

    <div className="flex justify-end gap-3">
      <Button
        variant="outline"
        onClick={() => setIsEditProfileDialogOpen(false)}
        disabled={isSaving}
      >
        Cancel
      </Button>

      <Button
        onClick={handleProfileSave}
        disabled={!profileHasChanges || isSaving}
      >
        {isSaving ? "Saving..." : "Save changes"}
      </Button>
    </div>
  </DialogContent>
</Dialog>


      <div className="space-y-8 p-6">
        <div className="flex justify-center">
          <Button
            variant="default"
            size="sm"
            onClick={handleNewTask}
          >
            New Task
          </Button>
        </div>

        <div className="flex justify-end">
          <Input
            placeholder="Filter by name or ID..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 text-right">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foregroundX">
                  {filterText ? "No tasks match your filter" : "No tasks found"}
                </TableCell>
              </TableRow>
            ) : (
              currentTasks.map((task) => (
                <TableRow
                  key={task.id}
                  className={`
                    cursor-pointer transition-colors
                    ${selectedTask?.id === task.id ? "bg-muted/60 hover:bg-muted/80" : "hover:bg-muted/50"}
                  `}
                  onClick={() => handleRowClick(task)}
                >
                  <TableCell className="w-20 text-right tabular-nums">{task.id}</TableCell>
                  <TableCell>{task.name}</TableCell>
                  <TableCell className="max-w-md truncate">{task.description || '-'}</TableCell>
                  <TableCell className="w-32">
                    <Badge variant="secondary" className={`${getStatusBadge(task.status)} px-2 py-1 text-xs status-badge`}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-20 text-right">
                    <div onClick={(e) => e.stopPropagation()} className="flex justify-end gap-2">
                      <button
                        className="hover:text-primary p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                      >
                        <SquarePen size={16} className="cursor-pointer" />
                      </button>
                      <button
                        className="hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskToDelete(task.id);
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
              Showing {startIndex + 1} to {Math.min(endIndex, filteredTasks.length)} of {filteredTasks.length} tasks
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

        {selectedTask && (
          <>
            <div>
              <hr className="my-8" />

              <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full" id="edit-form">
                <div className="relative w-full max-w-150">
                  <TabsList className="w-full bg-transparent border-b border-neutral-700 rounded-none p-0 h-auto grid grid-cols-3">
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                      value="details"
                    >
                      Details
                    </TabsTrigger>
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                      value="artifacts"
                    >
                      Artifacts ({selectedTask.taskArtifacts?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                      value="profiles"
                    >
                      Profiles ({selectedTask.taskProfiles?.length || 0})
                    </TabsTrigger>
                  </TabsList>
                  <div
                    className="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out z-0"
                    style={{
                      width: '33.333%',
                      left: activeTab === 'artifacts' ? '33.333%' : activeTab === 'profiles' ? '66.666%' : '0%'
                    }}
                  />
                </div>

                <TabsContent value="details" className="space-y-6 max-w-2xl mt-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm mb-2">Task name</label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter task name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2">Description</label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter task description"
                        className="min-h-30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2">Expected Evidence</label>
                      <Textarea
                        value={expectedEvidence}
                        onChange={(e) => setExpectedEvidence(e.target.value)}
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
                            value={startAt}
                            onChange={(date) => {
                              setStartAt(date ? format(date, "yyyy-MM-dd") : "");
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
                          value={endAt}
                          onChange={(date) => {
                            setEndAt(date ? format(date, "yyyy-MM-dd") : "");
                          }}
                          placeholder="Select end date"
                          disabled={(date) =>
                            (startAt && date < new Date(startAt)) ||
                            date > new Date("2030-12-31") // example max
                            }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm mb-2">Status</label>
                      <Select value={status} onValueChange={setStatus}>
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
                </TabsContent>

                {/* ----------------------------------------------------------- */ }
                {/* Artifacts Table */ }
                <TabsContent value="artifacts" className="mt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20 text-right">ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTask.taskArtifacts?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No artifacts found for this task
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedTask.taskArtifacts?.map((ta: any) => (
                          <TableRow 
                            key={ta.artifact.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleArtifactRowClick(ta.artifact)}
                          >
                            <TableCell className="w-20 text-right tabular-nums">{ta.artifact.id}</TableCell>
                            <TableCell>{ta.artifact.name}</TableCell>
                            <TableCell>{ta.artifact.description || '-'}</TableCell>
                            <TableCell className="text-right">
                              <button
                                className="hover:text-destructive p-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setArtifactToRemove(ta.artifact.id);
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

                {/* ----------------------------------------------------------- */ }
                {/* Profile Table */ }
                <TabsContent value="profiles" className="mt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20 text-right">ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTask.taskProfiles?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No profiles assigned to this task
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedTask.taskProfiles?.map((tp: any) => (
                          <TableRow 
                            key={tp.profile.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => handleProfileRowClick(tp.profile)}
                          >
                            <TableCell className="w-20 text-right tabular-nums">{tp.profile.id}</TableCell>
                            <TableCell>{tp.profile.name}</TableCell>
                            <TableCell>{tp.profile.description || '-'}</TableCell>
                            <TableCell className="text-right">
                              <button
                                className="hover:text-destructive p-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProfileToRemove(tp.profile.id);
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

        {selectedTask && hasChanges && (
          <div className={`
            fixed 
            bottom-0 
            left-var(--sidebar-width) 
            right-0 
            bg-background
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
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}