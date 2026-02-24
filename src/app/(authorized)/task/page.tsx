'use client';

import { useUser }                              from '@/context/UserContext';
import { useOrganization }                      from '@/context/OrganizationContext';
import { useRouter, useSearchParams }            from 'next/navigation';
import { useEffect, useState }                  from 'react';
import { TASK_STATUS_LABELS, TASK_STATUSES }    from '@/lib/constants/task-status';
import { TaskStatus }                           from '@prisma/client';
import { format }                               from "date-fns";
import { useTranslations }                      from 'next-intl';

import { Trash2, Shield, X } from 'lucide-react';
import { CIS_CONTROLS } from '@/lib/constants/cis-controls';
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
import { ExportMenu } from '@/components/ui/export-menu';
import type { ExportColumn } from '@/lib/export';

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
    const searchParams = useSearchParams();
    const t = useTranslations('Task');
    const tc = useTranslations('Common');

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
    const [activeTab, setActiveTab] = useState("messages");
    const [messages, setMessages] = useState<any[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [messagesCurrentPage, setMessagesCurrentPage] = useState(1);
    const messagesPerPage = 8;
    const [artifactsCurrentPage, setArtifactsCurrentPage] = useState(1);
    const artifactsPerPage = 10;
    const [profilesCurrentPage, setProfilesCurrentPage] = useState(1);
    const profilesPerPage = 10;
    const [events, setEvents] = useState<any[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [eventsCurrentPage, setEventsCurrentPage] = useState(1);
    const eventsPerPage = 8;

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

    // For adding profiles to this task
    const [isAddProfileDialogOpen, setIsAddProfileDialogOpen] = useState(false);
    const [searchProfileText, setSearchProfileText] = useState("");
    const [availableProfiles, setAvailableProfiles] = useState<any[]>([]);
    const [selectedProfileToAdd, setSelectedProfileToAdd] = useState<number | null>(null);

    // For CIS Safeguard assignment
    const [isAssignSafeguardDialogOpen, setIsAssignSafeguardDialogOpen] = useState(false);
    const [taskSafeguards, setTaskSafeguards] = useState<string[]>([]);
    const [safeguardSearchText, setSafeguardSearchText] = useState("");
    const [safeguardToRemove, setSafeguardToRemove] = useState<string | null>(null);

    // For viewing full message in modal
    const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

    // For creating new messages
    const [isNewMessageDialogOpen, setIsNewMessageDialogOpen] = useState(false);
    const [newMessageContent, setNewMessageContent] = useState("");
    const [isSendingMessage, setIsSendingMessage] = useState(false);

    // For editing messages
    const [isEditingMessage, setIsEditingMessage] = useState(false);
    const [editMessageContent, setEditMessageContent] = useState("");

    // For deleting messages
    const [messageToDelete, setMessageToDelete] = useState<number | null>(null);
    const [isDeletingMessage, setIsDeletingMessage] = useState(false);

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

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH MESSAGES FOR SELECTED TASK
    const fetchMessages = async (taskId: number) =>
    {
        setLoadingMessages(true);
        try
        {
            const res = await fetch(`/api/message?taskId=${taskId}`);
            const data = await res.json();
            if (!data.success)
            {
                console.error('Failed to fetch messages:', data.message);
                setMessages([]);
                return;
            }
            setMessages(data.data || []);
        }
        catch (error)
        {
            console.error('Failed to fetch messages:', error);
            setMessages([]);
        }
        finally
        {
            setLoadingMessages(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH EVENTS FOR SELECTED TASK
    const fetchEvents = async (taskId: number) =>
    {
        console.log('Fetching events for task:', taskId);
        setLoadingEvents(true);
        try
        {
            const res = await fetch(`/api/event?taskId=${taskId}`);
            console.log('Event API response status:', res.status);
            const data = await res.json();
            console.log('Event API response data:', data);
            if (!data.success)
            {
                console.error('Failed to fetch events:', data.error || data.message);
                setEvents([]);
                return;
            }
            console.log('Setting events:', data.data?.length || 0, 'events');
            setEvents(data.data || []);
        }
        catch (error)
        {
            console.error('Failed to fetch events:', error);
            setEvents([]);
        }
        finally
        {
            setLoadingEvents(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH SAFEGUARDS FOR SELECTED TASK
    const fetchTaskSafeguards = async (taskId: string) =>
    {
        try
        {
            const res = await fetch(`/api/task-safeguard?taskId=${taskId}`);
            const data = await res.json();
            if (data.success)
            {
                setTaskSafeguards((data.data || []).map((ts: any) => ts.safeguardId));
            }
        }
        catch (error)
        {
            console.error('Failed to fetch task safeguards:', error);
        }
    };

    // ASSIGN SAFEGUARD TO TASK
    const handleAssignSafeguard = async (safeguardId: string) =>
    {
        if (!selectedTask) return;
        try
        {
            const res = await fetch('/api/task-safeguard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId: selectedTask.id, safeguardId }),
            });
            const data = await res.json();
            if (data.success)
            {
                toast.success(`Safeguard ${safeguardId} assigned to task`);
                fetchTaskSafeguards(selectedTask.id);
            }
            else
            {
                toast.error(data.message || 'Failed to assign safeguard');
            }
        }
        catch (error)
        {
            console.error('Failed to assign safeguard:', error);
            toast.error('Failed to assign safeguard');
        }
    };

    // REMOVE SAFEGUARD FROM TASK
    const handleRemoveSafeguard = async (safeguardId: string) =>
    {
        if (!selectedTask) return;
        try
        {
            const res = await fetch('/api/task-safeguard', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ taskId: selectedTask.id, safeguardId }),
            });
            const data = await res.json();
            if (data.success)
            {
                toast.success(`Safeguard ${safeguardId} removed from task`);
                setSafeguardToRemove(null);
                fetchTaskSafeguards(selectedTask.id);
            }
            else
            {
                toast.error(data.message || 'Failed to remove safeguard');
            }
        }
        catch (error)
        {
            console.error('Failed to remove safeguard:', error);
            toast.error('Failed to remove safeguard');
        }
    };

    // Build a flat list of all safeguards with their control info
    const allSafeguards = CIS_CONTROLS.flatMap(control =>
        control.safeguards.map(sg => ({
            ...sg,
            controlId: control.id,
            controlTitle: control.title,
        }))
    );

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // CREATE EVENT
    const createEvent = async (message: string, importance: 'LOW' | 'MIDDLE' | 'HIGH', taskId: number) =>
    {
        try
        {
            await fetch('/api/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    importance,
                    taskId,
                    organizationId: activeOrganization?.id,
                }),
            });
            // Refresh events list
            fetchEvents(taskId);
        }
        catch (error)
        {
            console.error('Failed to create event:', error);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // VIEW MESSAGE IN MODAL
    const handleViewMessage = (message: any) =>
    {
        setSelectedMessage(message);
        setIsMessageModalOpen(true);

        // Mark as read if it's unread
        if (!message.isRead) {
            handleMarkMessageAsRead(message.id);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // MARK SINGLE MESSAGE AS READ
    const handleMarkMessageAsRead = async (messageId: number) =>
    {
        const message = messages.find(m => m.id === messageId);
        if (!message || message.isRead) return;

        try
        {
            const res = await fetch(`/api/message/${messageId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRead: true }),
            });

            if (res.ok)
            {
                // Update local state
                setMessages(prev => prev.map(m =>
                    m.id === messageId ? { ...m, isRead: true } : m
                ));

                // Trigger global refresh to update bell icon count
                window.dispatchEvent(new Event('refreshPage'));
            }
        }
        catch (error)
        {
            console.error('Failed to mark message as read:', error);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // MARK ALL MESSAGES AS READ
    const handleMarkAllAsRead = async () =>
    {
        if (!selectedTask) return;

        const unreadMessages = messages.filter(m => !m.isRead);
        if (unreadMessages.length === 0) return;

        try
        {
            // Mark all unread messages as read
            const promises = unreadMessages.map(message =>
                fetch(`/api/message/${message.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isRead: true }),
                })
            );

            await Promise.all(promises);

            // Update local state
            setMessages(prevMessages =>
                prevMessages.map(m => ({ ...m, isRead: true }))
            );

            // Trigger global refresh to update bell icon count
            window.dispatchEvent(new Event('refreshPage'));

            toast.success(t('toast.allMessagesRead'));
        }
        catch (error)
        {
            console.error('Failed to mark messages as read:', error);
            toast.error(t('toast.markReadError'));
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SEND NEW MESSAGE
    const handleSendMessage = async () =>
    {
        if (!selectedTask || !newMessageContent.trim()) return;

        setIsSendingMessage(true);

        try
        {
            const res = await fetch('/api/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: selectedTask.id,
                    content: newMessageContent.trim(),
                    type: 'USER',
                }),
            });

            const data = await res.json();
            if (!data.success)
            {
                throw new Error(data.error || 'Failed to send message');
            }

            // Add new message to list
            setMessages(prev => [data.data, ...prev]);
            setNewMessageContent("");
            setIsNewMessageDialogOpen(false);
            toast.success(t('toast.messageSent'));
        }
        catch (err: any)
        {
            console.error("Send message error:", err);
            toast.error(err.message || t('toast.sendMessageError'));
        }
        finally
        {
            setIsSendingMessage(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // EDIT MESSAGE
    const handleEditMessage = async () =>
    {
        if (!selectedMessage || !editMessageContent.trim()) return;

        setIsSendingMessage(true);

        try
        {
            const res = await fetch(`/api/message/${selectedMessage.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editMessageContent.trim() }),
            });

            const data = await res.json();
            if (!data.success)
            {
                throw new Error(data.error || 'Failed to edit message');
            }

            // Update in list
            setMessages(prev =>
                prev.map(m => m.id === selectedMessage.id ? { ...m, content: editMessageContent.trim() } : m)
            );
            setSelectedMessage({ ...selectedMessage, content: editMessageContent.trim() });
            setIsEditingMessage(false);
            toast.success(t('toast.messageUpdated'));
        }
        catch (err: any)
        {
            console.error("Edit message error:", err);
            toast.error(err.message || t('toast.editMessageError'));
        }
        finally
        {
            setIsSendingMessage(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // DELETE MESSAGE
    const handleDeleteMessage = async () =>
    {
        if (!messageToDelete) return;

        setIsDeletingMessage(true);

        try
        {
            const res = await fetch(`/api/message/${messageToDelete}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await res.json();
            if (!data.success)
            {
                throw new Error(data.error || 'Failed to delete message');
            }

            setMessages(prev => prev.filter(m => m.id !== messageToDelete));

            if (selectedMessage?.id === messageToDelete)
            {
                setIsMessageModalOpen(false);
                setSelectedMessage(null);
            }

            toast.success(t('toast.messageDeleted'));
            setMessageToDelete(null);
        }
        catch (err: any)
        {
            console.error("Delete message error:", err);
            toast.error(err.message || t('toast.deleteMessageError'));
        }
        finally
        {
            setIsDeletingMessage(false);
        }
    };

    // ── Change organization + Initial Load + Refresh ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    useEffect(() => 
    {
        if (!user) return;
        if (!activeOrganization) return;

        fetchTasks();

        // Listen for refresh event
        const handleRefresh = () =>
        {
            fetchTasks();
            // Also refresh messages and events if a task is selected
            if (selectedTask) {
                fetchMessages(selectedTask.id);
                fetchEvents(selectedTask.id);
                fetchTaskSafeguards(selectedTask.id);
            }
        };

        window.addEventListener('refreshPage', handleRefresh);

        return () =>
        {
            window.removeEventListener('refreshPage', handleRefresh);
        };

    }, [user, activeOrganization, selectedTask]);

    // Open new task dialog when navigated with ?new=1
    useEffect(() => {
        if (searchParams.get('new') === '1') {
            setSelectedTask(null);
            setName("");
            setDescription("");
            setExpectedEvidence("");
            setStartAt("");
            setEndAt("");
            setStatus(TaskStatus.NOT_STARTED);
            setHasChanges(false);
            setIsNewDialogOpen(true);
            router.replace('/task');
        }
    }, [searchParams]);

    // Auto-select task when navigated with ?id=<taskId>
    useEffect(() => {
        const taskId = searchParams.get('id');
        if (taskId && tasks.length > 0) {
            const task = tasks.find((t: any) => t.id === taskId);
            if (task) {
                // Find the page this task is on and navigate to it
                const taskIndex = tasks.findIndex((t: any) => t.id === taskId);
                if (taskIndex >= 0) {
                    setCurrentPage(Math.floor(taskIndex / itemsPerPage) + 1);
                }
                setSelectedTask(task);
                router.replace('/task');
                // Scroll to the detail form after a short delay to let the DOM update
                setTimeout(() => {
                    document.getElementById('edit-form')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        }
    }, [searchParams, tasks]);


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

          toast.success(t('toast.artifactRemoved'));
        } catch (err: any) {
          console.error("Remove artifact error:", err);
          toast.error(err.message || t('toast.removeArtifactError'));
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

          toast.success(t('toast.profileRemoved'));
        } catch (err: any) {
          console.error("Remove profile error:", err);
          toast.error(err.message || t('toast.removeProfileError'));
        } finally {
          setIsDeleting(false);
          setProfileToRemove(null);
        }
    };

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
          fetchMessages(selectedTask.id);
          fetchEvents(selectedTask.id);
          fetchTaskSafeguards(selectedTask.id);
      }
      else
      {
          setName("");
          setDescription("");
          setExpectedEvidence("");
          setStartAt("");
          setEndAt("");
          setStatus(TaskStatus.NOT_STARTED);
          setMessages([]);
          setEvents([]);
          setTaskSafeguards([]);
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
        
        const originalStartAt = selectedTask.startAt ? new Date(selectedTask.startAt).toISOString().slice(0, 10) : "";
        const originalEndAt = selectedTask.endAt ? new Date(selectedTask.endAt).toISOString().slice(0, 10) : "";
        const startChanged = startAt !== originalStartAt;
        const endChanged = endAt !== originalEndAt;

        setHasChanges(nameChanged || descChanged || evidenceChanged || statusChanged || startChanged || endChanged);
    }, [name, description, expectedEvidence, status, startAt, endAt, selectedTask]);

  useEffect(() =>
  {
      setCurrentPage(1);
  }, [filterText]);

  // Reset message pagination when messages change
  useEffect(() =>
  {
      setMessagesCurrentPage(1);
  }, [messages]);

  // Reset artifact, profile, and events pagination when task changes
  useEffect(() =>
  {
      setArtifactsCurrentPage(1);
      setProfilesCurrentPage(1);
      setEventsCurrentPage(1);
  }, [selectedTask]);

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
                body.organizationId = activeOrganization.id;
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
                // Track changes and create events
                const changes = [];

                if (selectedTask.name !== name.trim()) {
                    changes.push({ message: 'Task name changed', importance: 'LOW' as const });
                }
                if (selectedTask.description !== description.trim()) {
                    changes.push({ message: 'Task description changed', importance: 'LOW' as const });
                }
                if (selectedTask.expectedEvidence !== expectedEvidence.trim()) {
                    changes.push({ message: 'Expected evidence changed', importance: 'LOW' as const });
                }

                const oldStartAt = selectedTask.startAt ? new Date(selectedTask.startAt).toISOString().slice(0, 10) : '';
                if (oldStartAt !== startAt) {
                    changes.push({ message: 'Start date changed', importance: 'MIDDLE' as const });
                }

                const oldEndAt = selectedTask.endAt ? new Date(selectedTask.endAt).toISOString().slice(0, 10) : '';
                if (oldEndAt !== endAt) {
                    changes.push({ message: 'End date changed', importance: 'MIDDLE' as const });
                }

                if (selectedTask.status !== status) {
                    changes.push({ message: `Task status changed from ${selectedTask.status} to ${status}`, importance: 'HIGH' as const });
                }

                // Create events for all changes
                for (const change of changes) {
                    await createEvent(change.message, change.importance, updatedTask.id);
                }

                setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
                setSelectedTask(updatedTask);
            }

            setHasChanges(false);
            toast.success(isNew ? t('toast.taskCreated') : t('toast.taskUpdated'));
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

            toast.success(t('toast.taskDeleted'));
            setTaskToDelete(null);
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
          toast.error(t('toast.artifactNameRequired'));
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

          toast.success(t('toast.artifactUpdated'));
          setIsEditArtifactDialogOpen(false);
      }
      catch (err)
      {
          console.error(err);
          toast.error(t('toast.saveArtifactError'));
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
            toast.error(t('toast.profileNameRequired'));
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

            toast.success(t('toast.profileUpdated'));
            setIsEditProfileDialogOpen(false);
        }
        catch (err)
        {
            console.error(err);
            toast.error(t('toast.saveProfileError'));
        }
        finally
        {
            setIsSaving(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ADD PROFILE TO TASK
    const handleAddProfile = async () =>
    {
        if (!selectedProfileToAdd || !selectedTask) return;

        setIsSaving(true);

        try
        {
            const res = await fetch('/api/task-profile',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: selectedTask.id,
                    profileId: selectedProfileToAdd,
                }),
            });

            if (!res.ok)
            {
                const err = await res.json();
                throw new Error(err.message || 'Failed to add profile to task');
            }

            const data = await res.json();
            if (!data.success)
            {
                throw new Error(data.message || 'Operation failed');
            }

            const taskProfile = data.data;

            // Update tasks list
            setTasks(prevTasks =>
                prevTasks.map(task => {
                    if (task.id !== selectedTask.id) return task;
                    return {
                        ...task,
                        taskProfiles: [...task.taskProfiles, taskProfile],
                    };
                })
            );

            // Update selected task
            setSelectedTask(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    taskProfiles: [...prev.taskProfiles, taskProfile],
                };
            });

            toast.success(t('toast.profileAdded'));
            setIsAddProfileDialogOpen(false);
            setSelectedProfileToAdd(null);
            setSearchProfileText("");
        }
        catch (err: any)
        {
            console.error(err);
            toast.error(err.message || t('toast.addProfileError'));
        }
        finally
        {
            setIsSaving(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH AVAILABLE PROFILES (not yet assigned to this task)
    useEffect(() => {
        const fetchAvailableProfiles = async () => {
            if (!isAddProfileDialogOpen || !selectedTask || !activeOrganization) return;

            try {
                const res = await fetch(`/api/profile?organizationId=${activeOrganization.id}`);
                const data = await res.json();

                if (data.success) {
                    // Filter out profiles already assigned to this task
                    const assignedProfileIds = selectedTask.taskProfiles.map((tp: any) => tp.profile.id);
                    const available = data.data.filter((p: any) => !assignedProfileIds.includes(p.id));
                    setAvailableProfiles(available);
                }
            } catch (error) {
                console.error('Error fetching profiles:', error);
            }
        };

        fetchAvailableProfiles();
    }, [isAddProfileDialogOpen, selectedTask, activeOrganization]);

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

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Audit Trail Importance badges.
    const getEventImportanceBadge = (taskStatus: string) =>
    {
        const styles = 
        {
            LOW     : 'bg-[var(--color-event-low)]',
            MIDDLE  : 'bg-[var(--color-event-middle)]',
            HIGH    : 'bg-[var(--color-event-high)]',
        };
        return styles[taskStatus as keyof typeof styles] || '';
    };

  const exportColumns: ExportColumn[] = [
      { header: 'Name', accessor: 'name' },
      { header: 'Description', accessor: (row: any) => row.description || '' },
      { header: 'Status', accessor: 'status' },
  ];

  if (!user) {
    return <div>{t('loading.loadingUser')}</div>;
  }

  if (!activeOrganization) {
    return <div>{t('loading.selectOrganization')}</div>;
  }

  if (loading) {
    return <div>{t('loading.loadingTasks')}</div>;
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
      <AlertDialogTitle>{t('dialogs.removeArtifactTitle')}</AlertDialogTitle>
      <AlertDialogDescription>
        {t('dialogs.removeArtifactDescription')}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>{t('buttons.cancel')}</AlertDialogCancel>
      <AlertDialogAction
        variant="destructive"
        onClick={handleRemoveArtifact}
        disabled={isDeleting}
      >
        {isDeleting ? t('buttons.removing') : t('buttons.removeArtifact')}
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
      <AlertDialogTitle>{t('dialogs.removeProfileTitle')}</AlertDialogTitle>
      <AlertDialogDescription>
        {t('dialogs.removeProfileDescription')}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>{t('buttons.cancel')}</AlertDialogCancel>
      <AlertDialogAction
        variant="destructive"
        onClick={handleRemoveProfile}
        disabled={isDeleting}
      >
        {isDeleting ? t('buttons.removing') : t('buttons.removeProfile')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

{/* View full message modal */}
<Dialog open={isMessageModalOpen} onOpenChange={(open) => {
  setIsMessageModalOpen(open);
  if (!open) { setIsEditingMessage(false); }
}}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        {selectedMessage?.type === 'SYSTEM' ? (
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
            {t('badges.system')}
          </Badge>
        ) : (
          <span>{t('dialogs.messageFrom', { name: selectedMessage?.sender?.name || 'Unknown User' })}</span>
        )}
      </DialogTitle>
      <DialogDescription>
        {selectedMessage && new Date(selectedMessage.createdAt).toLocaleString()}
      </DialogDescription>
    </DialogHeader>
    <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
      {isEditingMessage ? (
        <Textarea
          value={editMessageContent}
          onChange={(e) => setEditMessageContent(e.target.value)}
          className="min-h-30"
          autoFocus
        />
      ) : (
        <p className="text-sm whitespace-pre-wrap">{selectedMessage?.content}</p>
      )}
    </div>
    <div className="flex justify-between mt-4">
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setMessageToDelete(selectedMessage?.id)}
      >
        {t('buttons.delete')}
      </Button>
      <div className="flex gap-2">
        {selectedMessage?.type !== 'SYSTEM' && selectedMessage?.sender?.email === user?.email && (
          isEditingMessage ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingMessage(false)}
                disabled={isSendingMessage}
              >
                {t('buttons.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleEditMessage}
                disabled={isSendingMessage || !editMessageContent.trim() || editMessageContent.trim() === selectedMessage?.content}
              >
                {isSendingMessage ? t('buttons.saving') : t('buttons.saveMessage')}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditMessageContent(selectedMessage?.content || "");
                setIsEditingMessage(true);
              }}
            >
              {t('buttons.edit')}
            </Button>
          )
        )}
      </div>
    </div>
  </DialogContent>
</Dialog>

{/* Delete message confirmation */}
<AlertDialog
  open={messageToDelete !== null}
  onOpenChange={(open) => {
    if (!open) setMessageToDelete(null);
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t('dialogs.deleteTitle')}</AlertDialogTitle>
      <AlertDialogDescription>
        {t('dialogs.deleteMessageDescription')}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeletingMessage}>{t('buttons.cancel')}</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDeleteMessage}
        disabled={isDeletingMessage}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {isDeletingMessage ? t('buttons.deleting') : t('buttons.delete')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>


{/* New Message Dialog */}
<Dialog open={isNewMessageDialogOpen} onOpenChange={(open) => {
  setIsNewMessageDialogOpen(open);
  if (!open) setNewMessageContent("");
}}>
  <DialogContent className="sm:max-w-125">
    <DialogHeader>
      <DialogTitle>{t('dialogs.newMessageTitle')}</DialogTitle>
      <DialogDescription>
        {t('dialogs.newMessageDescription')}
      </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      <Textarea
        value={newMessageContent}
        onChange={(e) => setNewMessageContent(e.target.value)}
        placeholder={t('placeholders.typeMessage')}
        className="min-h-30"
        autoFocus
      />
    </div>
    <div className="flex justify-end gap-3">
      <Button
        variant="outline"
        onClick={() => {
          setIsNewMessageDialogOpen(false);
          setNewMessageContent("");
        }}
        disabled={isSendingMessage}
      >
        {t('buttons.cancel')}
      </Button>
      <Button
        onClick={handleSendMessage}
        disabled={isSendingMessage || !newMessageContent.trim()}
      >
        {isSendingMessage ? t('buttons.saving') : t('buttons.saveMessage')}
      </Button>
    </div>
  </DialogContent>
</Dialog>

      <AlertDialog
        open={taskToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setTaskToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogs.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs.deleteTaskDescription', { name: tasks.find(t => t.id === taskToDelete)?.name || 'this item' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('buttons.cancel')}</AlertDialogCancel>
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

      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>{t('dialogs.createTitle')}</DialogTitle>
            <DialogDescription>
              {t('dialogs.createDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <label className="block text-sm">{t('labels.taskName')}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('placeholders.enterTaskName')}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">{t('labels.description')}</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('placeholders.enterTaskDescription')}
                className="min-h-30"
              />
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">{t('labels.expectedEvidence')}</label>
              <Textarea
                value={expectedEvidence}
                onChange={(e) => setExpectedEvidence(e.target.value)}
                placeholder={t('placeholders.enterExpectedEvidence')}
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
                <label className="block text-sm">{t('labels.startDate')}</label>
                <DatePicker
                    value={startAt}
                    onChange={(date) => {
                      setStartAt(date ? format(date, "yyyy-MM-dd") : "");
                    }}
                    placeholder={t('placeholders.selectStartDate')}
                  />
              </div>

              <div
                className="grid gap-2 relative"
                onPointerDown={(e) => e.stopPropagation()}
                onPointerDownCapture={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              >
                <label className="block text-sm">{t('labels.endDate')}</label>
                <DatePicker
                  value={endAt}
                  onChange={(date) => {
                    setEndAt(date ? format(date, "yyyy-MM-dd") : "");
                  }}
                  placeholder={t('placeholders.selectEndDate')}
                  disabled={(date) =>
                    (startAt && date < new Date(startAt)) ||
                    date > new Date("2030-12-31") // example max
                    }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">{t('labels.status')}</label>
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
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? t('buttons.creating') : t('buttons.createTask')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

{/* Edit Artifact Dialog */}
<Dialog open={isEditArtifactDialogOpen} onOpenChange={setIsEditArtifactDialogOpen}>
  <DialogContent className="sm:max-w-125">
    <DialogHeader>
      <DialogTitle>{t('dialogs.editArtifactTitle')}</DialogTitle>
      <DialogDescription>
        {t('dialogs.editArtifactDescription')}
      </DialogDescription>
    </DialogHeader>

    <div className="grid gap-6 py-4">
      <div className="grid gap-2">
        <label className="text-sm">{t('labels.artifactName')}</label>
        <Input
          value={artifactName}
          onChange={(e) => setArtifactName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm">{t('labels.description')}</label>
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
        {t('buttons.cancel')}
      </Button>

      <Button
        onClick={handleArtifactSave}
        disabled={!artifactHasChanges || isSaving}
      >
        {isSaving ? t('buttons.saving') : t('buttons.saveChanges')}
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* Edit Profile Dialog */}
<Dialog open={isEditProfileDialogOpen} onOpenChange={setIsEditProfileDialogOpen}>
  <DialogContent className="sm:max-w-125">
    <DialogHeader>
      <DialogTitle>{t('dialogs.editProfileTitle')}</DialogTitle>
      <DialogDescription>
        {t('dialogs.editProfileDescription')}
      </DialogDescription>
    </DialogHeader>

    <div className="grid gap-6 py-4">
      <div className="grid gap-2">
        <label className="text-sm">{t('labels.profileName')}</label>
        <Input
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm">{t('labels.description')}</label>
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
        {t('buttons.cancel')}
      </Button>

      <Button
        onClick={handleProfileSave}
        disabled={!profileHasChanges || isSaving}
      >
        {isSaving ? t('buttons.saving') : t('buttons.saveChanges')}
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* Add Profile to Task Dialog */}
<Dialog open={isAddProfileDialogOpen} onOpenChange={setIsAddProfileDialogOpen}>
  <DialogContent className="sm:max-w-125">
    <DialogHeader>
      <DialogTitle>{t('dialogs.addProfileTitle')}</DialogTitle>
      <DialogDescription>
        {t('dialogs.addProfileDescription')}
      </DialogDescription>
    </DialogHeader>

    <div className="py-4">
      <Input
        placeholder={t('placeholders.searchProfiles')}
        value={searchProfileText}
        onChange={(e) => setSearchProfileText(e.target.value)}
        className="mb-4"
      />

      <div className="border rounded-lg max-h-80 overflow-y-auto">
        {availableProfiles
          .filter(profile =>
            profile.name.toLowerCase().includes(searchProfileText.toLowerCase()) ||
            profile.id.toString().includes(searchProfileText)
          )
          .map((profile) => (
            <div
              key={profile.id}
              className={`
                p-3 border-b last:border-b-0 cursor-pointer transition-colors
                ${selectedProfileToAdd === profile.id ? 'bg-muted' : 'hover:bg-muted/50'}
              `}
              onClick={() => setSelectedProfileToAdd(profile.id)}
            >
              <div className="font-medium">#{profile.id} - {profile.name}</div>
              {profile.description && (
                <div className="text-sm text-muted-foreground truncate">
                  {profile.description}
                </div>
              )}
            </div>
          ))}
        {availableProfiles.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            {t('empty.noAvailableProfiles')}
          </div>
        )}
      </div>
    </div>

    <div className="flex justify-end gap-3">
      <Button
        variant="outline"
        onClick={() => {
          setIsAddProfileDialogOpen(false);
          setSelectedProfileToAdd(null);
          setSearchProfileText("");
        }}
        disabled={isSaving}
      >
        {t('buttons.cancel')}
      </Button>
      <Button
        onClick={handleAddProfile}
        disabled={!selectedProfileToAdd || isSaving}
      >
        {isSaving ? t('buttons.adding') : t('buttons.addProfile')}
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* Assign Safeguard Dialog */}
<Dialog open={isAssignSafeguardDialogOpen} onOpenChange={setIsAssignSafeguardDialogOpen}>
  <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
    <DialogHeader>
      <DialogTitle>Assign CIS Safeguard</DialogTitle>
      <DialogDescription>
        Search and select a CIS Control Safeguard to link to this task.
      </DialogDescription>
    </DialogHeader>
    <div className="mb-3">
      <Input
        placeholder="Search safeguards..."
        value={safeguardSearchText}
        onChange={(e) => setSafeguardSearchText(e.target.value)}
      />
    </div>
    <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[50vh]">
      {allSafeguards
        .filter(sg => {
          const q = safeguardSearchText.toLowerCase();
          return !q || sg.id.toLowerCase().includes(q) || sg.title.toLowerCase().includes(q) || sg.controlTitle.toLowerCase().includes(q);
        })
        .filter(sg => !taskSafeguards.includes(sg.id))
        .map(sg => (
          <button
            key={sg.id}
            className="w-full text-left px-3 py-2 rounded hover:bg-muted/60 transition-colors border border-transparent hover:border-border"
            onClick={() => {
              handleAssignSafeguard(sg.id);
              setIsAssignSafeguardDialogOpen(false);
            }}
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="shrink-0 text-xs">{sg.id}</Badge>
              <span className="text-sm font-medium truncate">{sg.title}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 ml-[3.5rem]">Control {sg.controlId}: {sg.controlTitle}</p>
          </button>
        ))
      }
      {allSafeguards
        .filter(sg => {
          const q = safeguardSearchText.toLowerCase();
          return !q || sg.id.toLowerCase().includes(q) || sg.title.toLowerCase().includes(q) || sg.controlTitle.toLowerCase().includes(q);
        })
        .filter(sg => !taskSafeguards.includes(sg.id)).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {safeguardSearchText ? 'No matching safeguards found.' : 'All safeguards are already assigned.'}
        </p>
      )}
    </div>
  </DialogContent>
</Dialog>

{/* Remove Safeguard Confirmation */}
<AlertDialog open={safeguardToRemove !== null} onOpenChange={(open) => { if (!open) setSafeguardToRemove(null); }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Remove Safeguard</AlertDialogTitle>
      <AlertDialogDescription>
        Are you sure you want to remove safeguard {safeguardToRemove} from this task?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => { if (safeguardToRemove) handleRemoveSafeguard(safeguardToRemove); }}>
        Remove
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

      <div className="space-y-8 p-6">
        <div className="flex justify-center">
          <Button
            variant="default"
            size="sm"
            onClick={handleNewTask}
          >
            {t('buttons.newTask')}
          </Button>
        </div>

        <div className="flex justify-end gap-2">
          <Input
            placeholder={t('placeholders.filterByNameOrId')}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-sm"
          />
          <ExportMenu data={filteredTasks} columns={exportColumns} filename="tasks" />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc('table.name')}</TableHead>
              <TableHead>{tc('table.description')}</TableHead>
              <TableHead className="w-32">{tc('table.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foregroundX">
                  {filterText ? t('empty.noTasksMatch') : t('empty.noTasksFound')}
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
                  <TableCell>{task.name}</TableCell>
                  <TableCell className="max-w-md truncate">{task.description || '-'}</TableCell>
                  <TableCell className="w-32">
                    <Badge variant="secondary" className={`${getStatusBadge(task.status)} px-2 py-1 text-xs status-badge`}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {t('pagination.showingTasks', { start: startIndex + 1, end: Math.min(endIndex, filteredTasks.length), total: filteredTasks.length })}
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

              <Tabs defaultValue="messages" value={activeTab} onValueChange={setActiveTab} className="w-full" id="edit-form">
                <div className="relative w-full max-w-300">
                  <TabsList className="w-full bg-transparent border-b border-neutral-700 rounded-none p-0 h-auto grid grid-cols-7">
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10 justify-center text-center px-4"
                      value="messages"
                    >
                      <span>{t('tabs.messages', { count: messages.length })}</span>
                      {(() => {
                        const unreadCount = messages.filter(m => !m.isRead).length;
                        return unreadCount > 0 && (
                          <Badge variant="destructive" className="ml-2 h-5 px-2 text-xs">
                            {unreadCount} {t('badges.new')}
                          </Badge>
                        );
                      })()}
                    </TabsTrigger>
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10 justify-center text-center px-4"
                      value="details"
                    >
                      {t('tabs.details')}
                    </TabsTrigger>
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10 justify-center text-center px-4"
                      value="profiles"
                    >
                      {t('tabs.profiles', { count: selectedTask.taskProfiles?.length || 0 })}
                    </TabsTrigger>
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10 justify-center text-center px-4"
                      value="artifacts"
                    >
                      {t('tabs.artifacts', { count: selectedTask.taskArtifacts?.length || 0 })}
                    </TabsTrigger>
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10 justify-center text-center px-4"
                      value="safeguards"
                    >
                      Safeguards ({taskSafeguards.length})
                    </TabsTrigger>
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10 justify-center text-center px-4"
                      value="audit"
                    >
                      {t('tabs.auditTrail', { count: events.length })}
                    </TabsTrigger>
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10 justify-center text-center px-4"
                      value="actions"
                    >
                      {t('tabs.actions')}
                    </TabsTrigger>
                  </TabsList>
                  <div
                    className="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out z-0"
                    style={{
                      width: `${100/7}%`,
                      left: activeTab === 'details' ? `${100/7}%` :
                           activeTab === 'profiles' ? `${200/7}%` :
                           activeTab === 'artifacts' ? `${300/7}%` :
                           activeTab === 'safeguards' ? `${400/7}%` :
                           activeTab === 'audit' ? `${500/7}%` :
                           activeTab === 'actions' ? `${600/7}%` : '0%'
                    }}
                  />
                </div>

                {/* ----------------------------------------------------------- */}
                {/* Messages Tab */}
                <TabsContent value="messages" className="mt-6">
                  <div className="flex justify-between items-center mb-4 max-w-3xl">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setIsNewMessageDialogOpen(true)}
                    >
                      {t('buttons.newMessage')}
                    </Button>
                    {(() => {
                      const unreadCount = messages.filter(m => !m.isRead).length;
                      return unreadCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleMarkAllAsRead}
                        >
                          {t('buttons.markAllRead', { count: unreadCount })}
                        </Button>
                      );
                    })()}
                  </div>
                  {loadingMessages ? (
                    <div className="text-center text-muted-foreground py-8">{t('loading.loadingMessages')}</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">{t('empty.noMessages')}</div>
                  ) : (
                    <>

                      <div className="space-y-4 max-w-3xl">
                        {(() => {
                          const totalMessagesPages = Math.ceil(messages.length / messagesPerPage);
                          const startIndex = (messagesCurrentPage - 1) * messagesPerPage;
                          const endIndex = startIndex + messagesPerPage;
                          const currentMessages = messages.slice(startIndex, endIndex);

                          return currentMessages.map((message) => (
                            <div
                              key={message.id}
                              onClick={() => handleViewMessage(message)}
                              className={`
                                p-4 rounded-lg border relative cursor-pointer
                                ${message.type === 'SYSTEM'
                                  ? 'bg-blue-500/10 border-blue-500/30'
                                  : 'bg-muted/50 border-border'
                                }
                                ${!message.isRead ? 'ring-2 ring-blue-400/30 hover:ring-blue-400/50' : 'hover:bg-muted/70'}
                                transition-all
                              `}
                            >
                              {!message.isRead && (
                                <div className="absolute top-4 left-0 w-2 h-2 bg-blue-500 rounded-full -ml-1"></div>
                              )}
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  {!message.isRead && (
                                    <Badge variant="default" className="bg-blue-500 text-white text-[10px] px-1.5 py-0">
                                      NEW
                                    </Badge>
                                  )}
                                  {message.type === 'SYSTEM' ? (
                                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                                      {t('badges.system')}
                                    </Badge>
                                  ) : (
                                    <span className={`text-sm ${!message.isRead ? 'font-bold' : 'font-semibold'}`}>
                                      {message.sender?.name || 'Unknown User'}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(message.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap line-clamp-2">{message.content}</p>
                            </div>
                          ));
                        })()}
                      </div>

                      {/* Messages Pagination */}
                      {(() => {
                        const totalMessagesPages = Math.ceil(messages.length / messagesPerPage);
                        const startIndex = (messagesCurrentPage - 1) * messagesPerPage;
                        const endIndex = Math.min(startIndex + messagesPerPage, messages.length);

                        return totalMessagesPages > 1 && (
                          <div className="flex items-center justify-between mt-6 max-w-3xl">
                            <div className="text-sm text-muted-foreground">
                              {t('pagination.showingMessages', { start: startIndex + 1, end: endIndex, total: messages.length })}
                            </div>

                            <div className="flex justify-end">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious
                                      onClick={() => setMessagesCurrentPage(prev => Math.max(prev - 1, 1))}
                                      className={messagesCurrentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                  </PaginationItem>

                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                      {Array.from({ length: totalMessagesPages }, (_, i) => i + 1).map((page) => (
                                        <PaginationItem key={page}>
                                          <PaginationLink
                                            onClick={() => setMessagesCurrentPage(page)}
                                            isActive={messagesCurrentPage === page}
                                            className="cursor-pointer"
                                          >
                                            {page}
                                          </PaginationLink>
                                        </PaginationItem>
                                      ))}
                                    </div>

                                    <PaginationItem>
                                      <PaginationNext
                                        onClick={() => setMessagesCurrentPage(prev => Math.min(prev + 1, totalMessagesPages))}
                                        className={messagesCurrentPage === totalMessagesPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                      />
                                    </PaginationItem>
                                  </div>
                                </PaginationContent>
                              </Pagination>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="details" className="space-y-6 max-w-2xl mt-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm mb-2">{tc('table.id')}</label>
                      <Input
                        value={selectedTask?.id?.toString() || ''}
                        disabled
                        className="opacity-60"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">{t('labels.taskName')}</label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('placeholders.enterTaskName')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2">{t('labels.description')}</label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('placeholders.enterTaskDescription')}
                        className="min-h-30"
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2">{t('labels.expectedEvidence')}</label>
                      <Textarea
                        value={expectedEvidence}
                        onChange={(e) => setExpectedEvidence(e.target.value)}
                        placeholder={t('placeholders.enterExpectedEvidence')}
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
                        <label className="block text-sm">{t('labels.startDate')}</label>
                        <DatePicker
                            value={startAt}
                            onChange={(date) => {
                              setStartAt(date ? format(date, "yyyy-MM-dd") : "");
                            }}
                            placeholder={t('placeholders.selectStartDate')}
                          />
                      </div>

                      <div
                        className="grid gap-2 relative"
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerDownCapture={(e) => e.preventDefault()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label className="block text-sm">{t('labels.endDate')}</label>
                        <DatePicker
                          value={endAt}
                          onChange={(date) => {
                            setEndAt(date ? format(date, "yyyy-MM-dd") : "");
                          }}
                          placeholder={t('placeholders.selectEndDate')}
                          disabled={(date) =>
                            (startAt && date < new Date(startAt)) ||
                            date > new Date("2030-12-31") // example max
                            }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm mb-2">{t('labels.status')}</label>
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
                        <TableHead className="w-20 text-right">{tc('table.id')}</TableHead>
                        <TableHead>{tc('table.name')}</TableHead>
                        <TableHead>{tc('table.description')}</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTask.taskArtifacts?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            {t('empty.noArtifacts')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        (() => {
                          const artifacts = selectedTask.taskArtifacts || [];
                          const startIndex = (artifactsCurrentPage - 1) * artifactsPerPage;
                          const endIndex = startIndex + artifactsPerPage;
                          const currentArtifacts = artifacts.slice(startIndex, endIndex);

                          return currentArtifacts.map((ta: any) => (
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
                          ));
                        })()
                      )}
                    </TableBody>
                  </Table>

                  {/* Artifacts Pagination */}
                  {(() => {
                    const artifacts = selectedTask.taskArtifacts || [];
                    const totalPages = Math.ceil(artifacts.length / artifactsPerPage);
                    const startIndex = (artifactsCurrentPage - 1) * artifactsPerPage;
                    const endIndex = Math.min(startIndex + artifactsPerPage, artifacts.length);

                    return totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          {t('pagination.showingArtifacts', { start: startIndex + 1, end: endIndex, total: artifacts.length })}
                        </div>

                        <div className="flex justify-end">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious
                                  onClick={() => setArtifactsCurrentPage(prev => Math.max(prev - 1, 1))}
                                  className={artifactsCurrentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                              </PaginationItem>

                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <PaginationItem key={page}>
                                      <PaginationLink
                                        onClick={() => setArtifactsCurrentPage(page)}
                                        isActive={artifactsCurrentPage === page}
                                        className="cursor-pointer"
                                      >
                                        {page}
                                      </PaginationLink>
                                    </PaginationItem>
                                  ))}
                                </div>

                                <PaginationItem>
                                  <PaginationNext
                                    onClick={() => setArtifactsCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    className={artifactsCurrentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                  />
                                </PaginationItem>
                              </div>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* ----------------------------------------------------------- */ }
                {/* Profile Table */ }
                <TabsContent value="profiles" className="mt-6">
                  <div className="flex justify-center mb-4">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setIsAddProfileDialogOpen(true)}
                    >
                      {t('buttons.addProfile')}
                    </Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20 text-right">{tc('table.id')}</TableHead>
                        <TableHead>{tc('table.name')}</TableHead>
                        <TableHead>{tc('table.description')}</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTask.taskProfiles?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            {t('empty.noProfiles')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        (() => {
                          const profiles = selectedTask.taskProfiles || [];
                          const startIndex = (profilesCurrentPage - 1) * profilesPerPage;
                          const endIndex = startIndex + profilesPerPage;
                          const currentProfiles = profiles.slice(startIndex, endIndex);

                          return currentProfiles.map((tp: any) => (
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
                          ));
                        })()
                      )}
                    </TableBody>
                  </Table>

                  {/* Profiles Pagination */}
                  {(() => {
                    const profiles = selectedTask.taskProfiles || [];
                    const totalPages = Math.ceil(profiles.length / profilesPerPage);
                    const startIndex = (profilesCurrentPage - 1) * profilesPerPage;
                    const endIndex = Math.min(startIndex + profilesPerPage, profiles.length);

                    return totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          {t('pagination.showingProfiles', { start: startIndex + 1, end: endIndex, total: profiles.length })}
                        </div>

                        <div className="flex justify-end">
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious
                                  onClick={() => setProfilesCurrentPage(prev => Math.max(prev - 1, 1))}
                                  className={profilesCurrentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                              </PaginationItem>

                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <PaginationItem key={page}>
                                      <PaginationLink
                                        onClick={() => setProfilesCurrentPage(page)}
                                        isActive={profilesCurrentPage === page}
                                        className="cursor-pointer"
                                      >
                                        {page}
                                      </PaginationLink>
                                    </PaginationItem>
                                  ))}
                                </div>

                                <PaginationItem>
                                  <PaginationNext
                                    onClick={() => setProfilesCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    className={profilesCurrentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                  />
                                </PaginationItem>
                              </div>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* ----------------------------------------------------------- */ }
                {/* Audit Trail Table */ }
                <TabsContent value="audit" className="mt-6">
                  {loadingEvents ? (
                    <div className="text-center text-muted-foreground py-8">{t('loading.loadingEvents')}</div>
                  ) : events.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">{t('empty.noEvents')}</div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20 text-right">{tc('table.id')}</TableHead>
                            <TableHead className="w-40">{tc('table.date')}</TableHead>
                            <TableHead className="w-40">{tc('table.user')}</TableHead>
                            <TableHead className="w-32">{tc('table.importance')}</TableHead>
                            <TableHead>{tc('table.message')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            const startIndex = (eventsCurrentPage - 1) * eventsPerPage;
                            const endIndex = startIndex + eventsPerPage;
                            const currentEvents = events.slice(startIndex, endIndex);

                            return currentEvents.map((event: any) => (
                              <TableRow key={event.id}>
                                <TableCell className="w-20 text-right tabular-nums">{event.id}</TableCell>
                                <TableCell className="w-40 text-xs">
                                  {new Date(event.createdAt).toLocaleString()}
                                </TableCell>
                                <TableCell className="w-40">
                                  {event.user?.name || 'System'}
                                </TableCell>
                                <TableCell className="w-32">
                                    {event.importance ? (
                                        <Badge variant="secondary" className={`${getEventImportanceBadge(event.importance)} px-2 py-1 text-xs audit-event-badge`}>
                                            {event.importance.replace('_', ' ')}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">-</span>
                                    )}
                                </TableCell>
                                <TableCell>{event.message}</TableCell>
                              </TableRow>
                            ));
                          })()}
                        </TableBody>
                      </Table>

                      {/* Events Pagination */}
                      {(() => {
                        const totalEventsPages = Math.ceil(events.length / eventsPerPage);
                        const startIndex = (eventsCurrentPage - 1) * eventsPerPage;
                        const endIndex = Math.min(startIndex + eventsPerPage, events.length);

                        return totalEventsPages > 1 && (
                          <div className="flex items-center justify-between mt-6">
                            <div className="text-sm text-muted-foreground">
                              {t('pagination.showingEvents', { start: startIndex + 1, end: endIndex, total: events.length })}
                            </div>

                            <div className="flex justify-end">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious
                                      onClick={() => setEventsCurrentPage(prev => Math.max(prev - 1, 1))}
                                      className={eventsCurrentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                  </PaginationItem>

                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                      {Array.from({ length: totalEventsPages }, (_, i) => i + 1).map((page) => (
                                        <PaginationItem key={page}>
                                          <PaginationLink
                                            onClick={() => setEventsCurrentPage(page)}
                                            isActive={eventsCurrentPage === page}
                                            className="cursor-pointer"
                                          >
                                            {page}
                                          </PaginationLink>
                                        </PaginationItem>
                                      ))}
                                    </div>

                                    <PaginationItem>
                                      <PaginationNext
                                        onClick={() => setEventsCurrentPage(prev => Math.min(prev + 1, totalEventsPages))}
                                        className={eventsCurrentPage === totalEventsPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                      />
                                    </PaginationItem>
                                  </div>
                                </PaginationContent>
                              </Pagination>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </TabsContent>

                {/* ----------------------------------------------------------- */ }
                {/* Safeguards Tab */ }
                <TabsContent value="safeguards" className="mt-6">
                  <div className="space-y-6 max-w-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">CIS Control Safeguards</h3>
                        <p className="text-sm text-muted-foreground">
                          Link this task to CIS Control Safeguards for compliance tracking.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => { setSafeguardSearchText(""); setIsAssignSafeguardDialogOpen(true); }}
                        className="shrink-0"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Assign Safeguard
                      </Button>
                    </div>

                    {taskSafeguards.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No safeguards assigned to this task.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {taskSafeguards.map((sgId) => {
                          const sg = allSafeguards.find(s => s.id === sgId);
                          return (
                            <div key={sgId} className="border rounded-lg p-4 flex items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="shrink-0 text-xs">{sgId}</Badge>
                                  <span className="font-medium text-sm">{sg ? sg.title : sgId}</span>
                                </div>
                                {sg && (
                                  <>
                                    <p className="text-xs text-muted-foreground">Control {sg.controlId}: {sg.controlTitle}</p>
                                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{sg.definition}</p>
                                  </>
                                )}
                              </div>
                              <button
                                onClick={() => setSafeguardToRemove(sgId)}
                                className="shrink-0 p-1 hover:text-destructive rounded transition-colors"
                                title="Remove safeguard"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ----------------------------------------------------------- */ }
                {/* Actions Tab */ }
                <TabsContent value="actions" className="mt-6">
                  <div className="space-y-6 max-w-2xl">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">{t('sections.taskActions')}</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        {t('sections.taskActionsDescription')}
                      </p>
                    </div>

                    <div className="border border-destructive/30 rounded-lg p-4 bg-destructive/5">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-destructive mb-1">{t('buttons.deleteTask')}</h4>
                          <p className="text-sm text-muted-foreground">
                            {t('sections.deleteTaskDescription')}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => setTaskToDelete(selectedTask.id)}
                          className="shrink-0"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('buttons.deleteTask')}
                        </Button>
                      </div>
                    </div>
                  </div>
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
              {t('buttons.cancel')}
            </Button>
            <Button
              variant="default"
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