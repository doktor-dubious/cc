'use client';

import { useUser }              from '@/context/UserContext';
import { useRouter }            from 'next/navigation';
import { useEffect, useState }  from 'react';
import { Trash2 }               from 'lucide-react';
import { Button }               from "@/components/ui/button";

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
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

import { Input } from "@/components/ui/input"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function OrganizationPage()
{
    const user = useUser();
    const router = useRouter();

    const [organizations, setOrganizations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);

    // Form fields (controlled)
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const [profileName, setProfileName] = useState("");
    const [profileDescription, setProfileDescription] = useState("");

    const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);

    const [taskName, setTaskName] = useState("");
    const [taskDescription, setTaskDescription] = useState("");
    const [taskHasChanges, setTaskHasChanges] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [profileHasChanges, setProfileHasChanges] = useState(false);

    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
    const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);

    const [orgToDelete, setOrgToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [filterText, setFilterText] = useState("")
    const [activeTab, setActiveTab] = useState("details")

    // Settings tab fields
    const [uploadDirectory, setUploadDirectory] = useState("");
    const [downloadDirectory, setDownloadDirectory] = useState("");
    const [artifactDirectory, setArtifactDirectory] = useState("");
    const [settingsHasChanges, setSettingsHasChanges] = useState(false);

    // Delete Profile.
    const [profileToDelete, setProfileToDelete] = useState<number | null>(null);

    // Detele Task.
    const [taskToRemove, setTaskToRemove] = useState<number | null>(null);

    // For adding existing profile to org
    const [isAddProfileDialogOpen, setIsAddProfileDialogOpen] = useState(false);
    const [searchProfileText, setSearchProfileText] = useState("");
    const [availableProfiles, setAvailableProfiles] = useState<any[]>([]);
    const [selectedProfileToAdd, setSelectedProfileToAdd] = useState<number | null>(null);

    // For adding existing task to org
    const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
    const [searchTaskText, setSearchTaskText] = useState("");
    const [availableTasks, setAvailableTasks] = useState<any[]>([]);
    const [selectedTaskToAdd, setSelectedTaskToAdd] = useState<number | null>(null);

    // Pagination for sub-tabs
    const [profilesCurrentPage, setProfilesCurrentPage] = useState(1);
    const [tasksCurrentPage, setTasksCurrentPage] = useState(1);
    const [eventsCurrentPage, setEventsCurrentPage] = useState(1);
    const subTabPerPage = 8;

    // For events/audit trail
    const [events, setEvents] = useState<any[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);

    // ----------------------------------------------------------------------------------------------------------------
    // FETCH ORGANISATIONS - WITH SETTINGS (& refresh).
    const fetchOrganizations = async () =>
    {
        try
        {
            const res = await fetch('/api/organization');
            const data = await res.json();
            if (data.success == false)
            {
                console.error('Failed to fetch organizations:', data.error);
                router.push('/error');
                return;
            }
            setOrganizations(data.data);
        }
        catch (error)
        {
            console.error('Failed to fetch organizations:', error);
            router.push('/error');
            return;
        }
        finally 
        {
            setLoading(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH EVENTS FOR SELECTED ORGANIZATION
    const fetchEvents = async (organizationId: number) =>
    {
        setLoadingEvents(true);
        try
        {
            const res = await fetch(`/api/event?organizationId=${organizationId}`);
            const data = await res.json();
            if (!data.success)
            {
                console.error('Failed to fetch events:', data.error || data.message);
                setEvents([]);
                return;
            }
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
    // CREATE EVENT (audit trail)
    const createEvent = async (message: string, importance: 'LOW' | 'MIDDLE' | 'HIGH', organizationId: number) =>
    {
        try
        {
            await fetch('/api/event', {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify({ message, importance, organizationId }),
            });

            // Refresh the audit trail if viewing this organization
            if (selectedOrg?.id === organizationId)
            {
                fetchEvents(organizationId);
            }
        }
        catch (error)
        {
            console.error('Failed to create event:', error);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Change user +  + Refresh event
    useEffect(() =>
    {
        if (user?.role !== 'SUPER_ADMIN') return;

        fetchOrganizations();

        // Listen for refresh event
        const handleRefresh = () => 
        {
            fetchOrganizations();
        };

        window.addEventListener('refreshPage', handleRefresh);
        // console.log("Event listener added for refreshPage");

        return () => 
        {
            // console.log("Cleaning up event listener");
            window.removeEventListener('refreshPage', handleRefresh);
        };
    }, [user]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ADD (EXISTING) PROFILE TO ORGANIZATION
    const handleAddProfile = async () => 
    {
        if (!selectedProfileToAdd || !selectedOrg) return;

        setIsSaving(true);

        try 
        {
            const res = await fetch(`/api/profile/${selectedProfileToAdd}`, 
            {
                method      : 'PATCH',
                headers     : { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                {
                    organizationId: selectedOrg.id,
                }),
            });

            if (!res.ok) 
            {
                const err = await res.json();
                throw new Error(err.error || 'Failed to assign profile');
            }

            const data = await res.json();
            if (!data.success) 
            {
                throw new Error(data.error || 'Operation failed');
            }

            const addedProfile = data.data;

            // Optimistic update
            setOrganizations((prevOrgs) =>
            prevOrgs.map((org) => 
            {
                if (org.id !== selectedOrg.id) return org;
                return {
                    ...org,
                    profiles: [...org.profiles, addedProfile],
                    };
                })
            );

            setSelectedOrg((prev) => 
            {
                if (!prev) return prev;
                return {
                    ...prev,
                    profiles: [...prev.profiles, addedProfile],
                };
            });

            toast.success("Profile assigned to organization");

            // Event: profile added
            await createEvent(`Profile added: "${addedProfile.name}"`, 'HIGH', selectedOrg.id);

            setIsAddProfileDialogOpen(false);
            setSelectedProfileToAdd(null);
        } 
        catch (err: any) 
        {
            // -- Debug -- console.error("Add profile error:", err);
            toast.error(err.message || "Could not assign profile");
        } 
        finally 
        {
            setIsSaving(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ADD (EXISTING) TASK TO ORGANIZATION
    const handleAddTask = async () => 
    {
        if (!selectedTaskToAdd || !selectedOrg) return;

        setIsSaving(true);

        try 
        {
            const res = await fetch(`/api/task/${selectedTaskToAdd}`, 
            {
                method      : 'PATCH',
                headers     : { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                {
                    organizationId: selectedOrg.id,
                }),
            });

            if (!res.ok) 
            {
                const err = await res.json();
                throw new Error(err.error || 'Failed to assign task');
            }

            const data = await res.json();
            if (!data.success) 
            {
                throw new Error(data.error || 'Operation failed');
            }

            const addedTask = data.task;

            // Optimistic update
            setOrganizations((prevOrgs) =>
            prevOrgs.map((org) => {
                if (org.id !== selectedOrg.id) return org;
                return {
                ...org,
                tasks: [...org.tasks, addedTask],
                };
            })
            );

            setSelectedOrg((prev) => 
            {
                if (!prev) return prev;
                return {
                    ...prev,
                    tasks: [...prev.tasks, addedTask],
                };
            });

            toast.success("Task assigned to organization");

            // Event: task added
            await createEvent(`Task added: "${addedTask.name}"`, 'MIDDLE', selectedOrg.id);

            setIsAddTaskDialogOpen(false);
            setSelectedTaskToAdd(null);
        } 
        catch (err: any) 
        {
            // -- Debug -- console.error("Add task error:", err);
            toast.error(err.message || "Could not assign task");
            return;
        }
        finally 
        {
            setIsSaving(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Fetch all profiles
    const fetchAvailableProfiles = async () => 
    {
        if (!selectedOrg) return;
        try 
        {
            // const res = await fetch(`/api/profile?organizationId=${selectedOrg.id}&excludeOrg=true`); // adjust endpoint/query
            const res = await fetch('/api/profile');
            const data = await res.json();
            if (data.success)
            {
                // Filter out profiles already in this org to avoid duplicates.
                const currentProfileIds = new Set(selectedOrg.profiles.map((p: any) => p.id));
                const allProfiles = data.data.filter((p: any) => !currentProfileIds.has(p.id));
                setAvailableProfiles(allProfiles);
            }
            else
            {
                toast.error("Failed to load profiles");
                router.push('/error');
                return;
            }
        } 
        catch (err) 
        {
            // -- Debug -- console.error("Failed to fetch available profiles", err);
            toast.error("Could not load available profiles");
            router.push('/error');
            return;
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Fetch tasks not already in this org
    const fetchAvailableTasks = async () => 
    {
        if (!selectedOrg) return;
        try 
        {
            const res = await fetch('/api/task');
            const data = await res.json();
            if (data.success) 
            {
                // Create a Set of IDs of tasks already in this organization (fast lookup)
                const currentTaskIds = new Set(
                    selectedOrg.tasks.map((t: any) => t.id)
                );

                // Filter: keep only tasks NOT already in this org
                const available = (data.data || []).filter(
                    (task: any) => !currentTaskIds.has(task.id)
                );

                setAvailableTasks(available);
            }
            else 
            {
                toast.error("Failed to load available tasks");
                router.push('/error');
                return;
            }
        } 
        catch (err) 
        {
            console.error("Failed to fetch available tasks", err);
            toast.error("Could not load available tasks");
            router.push('/error');
            return;
        }
    };

    // ----------------------------------------------------------------------------------------------------------------
    // TAB 2 - SETTINGS

    // Set Settings on new Organization.
    useEffect(() =>
    {
        if (selectedOrg)
        {
            setName(selectedOrg.name || "");
            setDescription(selectedOrg.description || "");

            // Load settings if they exist
            setUploadDirectory(selectedOrg.settings?.uploadDirectory || "");
            setDownloadDirectory(selectedOrg.settings?.downloadDirectory || "");
            setArtifactDirectory(selectedOrg.settings?.artifactDirectory || "");

            // Fetch events for this organization
            fetchEvents(selectedOrg.id);

            // Reset sub-tab pagination
            setProfilesCurrentPage(1);
            setTasksCurrentPage(1);
            setEventsCurrentPage(1);
        }
        else
        {
            setName("");
            setDescription("");
            setUploadDirectory("");
            setDownloadDirectory("");
            setArtifactDirectory("");
            setEvents([]);
        }
    }, [selectedOrg]);

    // Settings change detection:
    useEffect(() => 
    {
        if (!selectedOrg) 
        {
            setSettingsHasChanges(false);
            return;
        }

        const uploadChanged = uploadDirectory.trim() !== (selectedOrg.settings?.uploadDirectory || "").trim();
        const downloadChanged = downloadDirectory.trim() !== (selectedOrg.settings?.downloadDirectory || "").trim();
        const artifactChanged = artifactDirectory.trim() !== (selectedOrg.settings?.artifactDirectory || "").trim();

        setSettingsHasChanges(uploadChanged || downloadChanged || artifactChanged);
    }, [uploadDirectory, downloadDirectory, artifactDirectory, selectedOrg]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SAVE SETTINGS
    const handleSettingsSave = async () => 
    {
        if (!selectedOrg) return;

        if (!uploadDirectory.trim() || !downloadDirectory.trim() || !artifactDirectory.trim()) 
        {
            toast.error("All directory fields are required");
            return;
        }

        setIsSaving(true);

        try 
        {
            const res = await fetch(`/api/organization/${selectedOrg.id}/settings`, 
            {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(
                {
                    uploadDirectory     : uploadDirectory.trim(),
                    downloadDirectory   : downloadDirectory.trim(),
                    artifactDirectory   : artifactDirectory.trim(),
                }),
            });

            if (!res.ok) 
            {
                const err = await res.json();
                throw new Error(err.error || err.error || 'Failed to save settings');
            }

            const data = await res.json();
            if (!data.success) 
            {
                throw new Error(data.error || 'Save failed');
            }

            // Update local state with new settings
            setOrganizations(prev =>
                prev.map(o => 
                    o.id === selectedOrg.id 
                    ? { ...o, settings: data.data }
                    : o
                )
            );

            setSelectedOrg(prev => (
            {
                ...prev!,
                settings: data.data
            }));

            // Events: directory changes
            const origUpload   = (selectedOrg.settings?.uploadDirectory || "").trim();
            const origDownload = (selectedOrg.settings?.downloadDirectory || "").trim();
            const origArtifact = (selectedOrg.settings?.artifactDirectory || "").trim();

            if (uploadDirectory.trim() !== origUpload)
            {
                await createEvent('Upload directory changed', 'LOW', selectedOrg.id);
            }
            if (downloadDirectory.trim() !== origDownload)
            {
                await createEvent('Download directory changed', 'LOW', selectedOrg.id);
            }
            if (artifactDirectory.trim() !== origArtifact)
            {
                await createEvent('Artifact directory changed', 'LOW', selectedOrg.id);
            }

            toast.success("Settings saved successfully");
            setSettingsHasChanges(false);
        } 
        catch (err: any) 
        {
            console.error(err);
            toast.error(err.error || "Could not save settings");
        } 
        finally 
        {
            setIsSaving(false);
        }
    };

    // ----------------------------------------------------------------------------------------------------------------
    // 


    // Protect the route
    useEffect(() =>
    {
        if (!user)
        {
            return;
        }
        
        if (user.role !== 'SUPER_ADMIN')
        {
            router.push('/dashboard');
        }
    }, [user, router]);

    useEffect(() =>
    {
        if (selectedOrg)
        {
            setName(selectedOrg.name || "");
            setDescription(selectedOrg.description || "");
        }
        else
        {
            // Reset form when no org selected (for "New Organisation")
            setName("");
            setDescription("");
        }
    }, [selectedOrg]);

    useEffect(() => 
    {
        if (!selectedOrg)
        {
            // New organization mode
            const hasContent = name.trim() !== "" || description.trim() !== "";
            setHasChanges(name.trim() !== "");
            return;
        }

        // Edit existing organization mode
        const originalName = selectedOrg.name || "";
        const originalDesc = selectedOrg.description || "";

        const nameChanged   = name.trim() !== originalName.trim();
        const descChanged   = description.trim() !== originalDesc.trim();

        setHasChanges(nameChanged || descChanged);
    }, [name, description, selectedOrg]);

    // Reset to page 1 when filter changes
    useEffect(() =>
    {
        setCurrentPage(1);
    }, [filterText]);

    const handleRowClick = (org: any) =>
    {
        setSelectedOrg(org);
        setIsCreatingNew(false);

        // Scroll to edit section.
        document.getElementById('edit-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleProfileRowClick = (profile: any) =>
    {
        console.log("EDIT PROFILE: ", profile);
        setSelectedProfile(profile);
        setProfileName(profile.name || "");
        setProfileDescription(profile.description || "");
        setIsEditProfileDialogOpen(true);
    };

    const handleTaskRowClick = (task: any) =>
    {
        setSelectedTask(task);
        setTaskName(task.name || "");
        setTaskDescription(task.description || "");
        setIsEditTaskDialogOpen(true);
    };

    // New organisation button → clear selection
    const handleNewOrg = () =>
    {
        setSelectedOrg(null);
        setName("");
        setDescription("");
        setHasChanges(false);        
        setIsNewDialogOpen(true); // Open dialog.
    };

    const handleProfileCancel = () =>
    {
        setIsEditProfileDialogOpen(false);
        setSelectedProfile(null);
        setProfileName("");
        setProfileDescription("");
    };

    useEffect(() =>
    {
        if (!selectedProfile) return;

        const nameChanged = profileName.trim() !== (selectedProfile.name ?? "").trim();

        const descChanged = profileDescription.trim() !== (selectedProfile.description ?? "").trim();

        setProfileHasChanges(nameChanged || descChanged);
    }, [profileName, profileDescription, selectedProfile]);

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
            const res = await fetch(`/api/profile/${selectedProfile.id}`, {
                method  : 'PATCH',
                headers : { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                {
                    name        : profileName.trim(),
                    description : profileDescription.trim(),
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
                throw new Error(data.message || 'Update failed');
            }

            const updatedProfile = data.data;

            // Update local state
            setOrganizations(prevOrgs =>
                prevOrgs.map(org => {
                    if (org.id !== selectedOrg?.id) return org;
                    return {
                        ...org,
                        profiles: org.profiles.map((p: any) =>
                            p.id === selectedProfile.id ? updatedProfile : p
                        ),
                    };
                })
            );

            // Update selectedOrg so the table refreshes immediately
            setSelectedOrg(prev =>
            {
                if (!prev) return prev;
                return {
                    ...prev,
                    profiles: prev.profiles.map((p: any) =>
                        p.id === selectedProfile.id ? updatedProfile : p
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

    const handleCancel = () =>
    {
        if (!selectedOrg)
        {
            setName("");
            setDescription("");
        }
        else
        {
            setName(selectedOrg.name || "");
            setDescription(selectedOrg.description || "");
        }

        setHasChanges(false);
        setIsCreatingNew(false);
        setIsNewDialogOpen(false); // Close Dialog.
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SAVE ORGANIZATION
    const handleSave = async () =>
    {
        if (!name.trim())
        {
            return;
        }

        setIsSaving(true);

        try
        {
            const isNew = !selectedOrg;
            const url = isNew 
                ? '/api/organization'                     // POST for create
                : `/api/organization/${selectedOrg!.id}`; // PATCH for update

            const method = isNew ? 'POST' : 'PATCH';

            const body =
            {
                name        : name.trim(),
                description : description.trim(),
            };

            const res = await fetch(url,
            {
                method,
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(body),
            });

            if (!res.ok)
            {
                const err = await res.json();
                throw new Error(err.error || 'Save failed');
            }

            const data = await res.json();

            if (!data.success)
            {
                throw new Error(data.message || data.error || 'Save failed');
            }

            const updatedOrg = data.data;

            // ── Update local state ───────────────────────────────
            if (isNew)
            {
                setIsCreatingNew(false);
                setSelectedOrg(null);

                // Add new org to list (optimistic or from response)
                setOrganizations(prev => [...prev, updatedOrg]);

                setIsNewDialogOpen(false);

                // Event: new organization created
                await createEvent(`Organization created: "${updatedOrg.name}"`, 'HIGH', updatedOrg.id);
            }
            else
            {
                const originalName = selectedOrg.name || "";
                const originalDesc = selectedOrg.description || "";

                // Update existing
                setOrganizations(prev =>
                    prev.map(o => o.id === selectedOrg.id ? updatedOrg : o)
                );

                setSelectedOrg(updatedOrg); // keep form in sync

                // Events: name/description changed
                if (name.trim() !== originalName.trim())
                {
                    await createEvent(`Organization name changed from "${originalName}" to "${name.trim()}"`, 'LOW', selectedOrg.id);
                }
                if (description.trim() !== originalDesc.trim())
                {
                    await createEvent('Organization description changed', 'LOW', selectedOrg.id);
                }
            }

            setHasChanges(false);
            toast.success(isNew ? "Organization created" : "Organization updated");
        }
        catch (err)
        {
            console.error(err);
            toast.error("Could not save organization");
        }
        finally
        {
            setIsSaving(false);
        }
    };


    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // DETETE ORGANIZATION
    const handleDelete = async () =>
    {
        if (!orgToDelete) return;

        setIsDeleting(true);

        try
        {
            const res = await fetch(`/api/organization/${orgToDelete}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok)
            {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete organization');
            }

            const data = await res.json();
            
            if (!data.success) 
            {
                throw new Error(data.message || 'Failed to delete organization');
            }

            // Optimistic update: remove from local state
            setOrganizations(prev => prev.filter(o => o.id !== orgToDelete));

            // Clear selection if deleted org was selected
            if (selectedOrg?.id === orgToDelete) 
            {
                setSelectedOrg(null);
            }

            toast.success("Organization deleted successfully");
            
            // Reset
            setOrgToDelete(null);
        }
        catch (err)
        {
            console.error("Delete error:", err);
            toast.error("Could not delete organization");
        }
        finally
        {
            setIsDeleting(false);
        }  
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // DETETE TASK.
    const handleRemoveTask = async () => 
    {
        if (!taskToRemove || !selectedOrg) return;

        setIsDeleting(true);

        try
        {
            const res = await fetch(`/api/task/${taskToRemove}`, 
            {
                method  : 'PATCH',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(
                {
                    organization: 
                    {
                        disconnect: true,
                    },
                }),
            });

            if (!res.ok) 
            {
                const err = await res.json();
                throw new Error(err.error || 'Failed to remove task from organization');
            }

            const data = await res.json();
            if (!data.success) 
            {
                throw new Error(data.error || 'Operation failed');
            }

            // Optimistic update: remove from organization's task list
            setOrganizations((prevOrgs) =>
            prevOrgs.map((org) => 
            {
                if (org.id !== selectedOrg.id) return org;
                return {
                ...org,
                tasks: org.tasks.filter((t: any) => t.id !== taskToRemove),
                };
            })
            );

            // Update selectedOrg
            setSelectedOrg((prev) => 
            {
                if (!prev) return prev;
                return {
                    ...prev,
                    tasks: prev.tasks.filter((t: any) => t.id !== taskToRemove),
                };
            });

            // Event: task removed
            const removedTaskName = selectedOrg.tasks.find((t: any) => t.id === taskToRemove)?.name || 'Unknown';
            await createEvent(`Task removed: "${removedTaskName}"`, 'MIDDLE', selectedOrg.id);

            toast.success("Task removed from organization");

            // Close edit dialog if it was open for this task
            if (selectedTask?.id === taskToRemove) 
            {
                setIsEditTaskDialogOpen(false);
                setSelectedTask(null);
            }
        } 
        catch (err: any) 
        {
            console.error("Remove task error:", err);
            toast.error(err.message || "Could not remove task");
        } 
        finally 
        {
            setIsDeleting(false);
            setTaskToRemove(null);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // DETETE PROFILE.
    const handleRemoveProfile = async () => 
    {
        if (!profileToDelete || !selectedOrg) return;

        setIsDeleting(true); // or setIsRemovingProfile(true) if you want separate state

        try 
        {
            const res = await fetch(`/api/profile/${profileToDelete}`, 
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                {
                    organization: {
                        disconnect: true,
                    },
                }),
            });

            if (!res.ok) 
            {
                const err = await res.json();
                throw new Error(err.error || 'Failed to remove profile from organization');
            }

            const data = await res.json();
            if (!data.success) 
            {
                throw new Error(data.message || 'Operation failed');
            }

            // Optimistic + sync update
            setOrganizations((prevOrgs) =>
                prevOrgs.map((org) => {
                    if (org.id !== selectedOrg.id) return org;
                    return {
                    ...org,
                    profiles: org.profiles.filter((p: any) => p.id !== profileToDelete),
                    };
                })
            );

            // Also update selectedOrg
            setSelectedOrg((prev) => 
            {
                if (!prev) return prev;
                return {
                    ...prev,
                    profiles: prev.profiles.filter((p: any) => p.id !== profileToDelete),
                };
            });

            // Event: profile removed
            const removedProfileName = selectedOrg.profiles.find((p: any) => p.id === profileToDelete)?.name || 'Unknown';
            await createEvent(`Profile removed: "${removedProfileName}"`, 'HIGH', selectedOrg.id);

            toast.success("Profile removed from organization");

            // Close any open edit dialog if it was the deleted one
            if (selectedProfile?.id === profileToDelete) 
            {
                setIsEditProfileDialogOpen(false);
                setSelectedProfile(null);
            }
        } 
        catch (err: any) 
        {
            console.error("Remove profile error:", err);
            toast.error(err.message || "Could not remove profile");
        } 
        finally 
        {
            setIsDeleting(false);
            setProfileToDelete(null);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // 
    useEffect(() =>
    {
        if (!selectedTask) return;

        const nameChanged = taskName.trim() !== (selectedTask.name ?? "").trim();

        const descChanged = taskDescription.trim() !== (selectedTask.description ?? "").trim();

        setTaskHasChanges(nameChanged || descChanged);
    }, [taskName, taskDescription, selectedTask]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SAVE CHANGES TO TASK
    const handleTaskSave = async () =>
    {
        if (!selectedTask) return;

        if (!taskName.trim())
        {
            toast.error("Task name is required");
            return;
        }

        setIsSaving(true);

        try
        {
            const res = await fetch(`/api/task/${selectedTask.id}`,
            {
                method  : "PATCH",
                headers : { "Content-Type": "application/json" },
                body    : JSON.stringify(
                    {
                        name        : taskName.trim(),
                        description : taskDescription.trim(),
                    }),
            });

            if (!res.ok) throw new Error("Failed to update task");

            const data = await res.json();
            const updatedTask = data.data;

            // Update organizations list
            setOrganizations(prev =>
            prev.map(org =>
                org.id !== selectedOrg?.id
                ? org
                : {
                    ...org,
                    tasks: org.tasks.map((t: any) =>
                        t.id === updatedTask.id ? updatedTask : t
                    ),
                    }
            )
            );

            // Update selectedOrg
            setSelectedOrg(prev =>
            prev
                ? {
                    ...prev,
                    tasks: prev.tasks.map((t: any) =>
                    t.id === updatedTask.id ? updatedTask : t
                    ),
                }
                : prev
            );

            toast.success("Task updated");
            setIsEditTaskDialogOpen(false);
        }
        catch (err)
        {
            console.error(err);
            toast.error("Could not update task");
        }
        finally
        {
            setIsSaving(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FILTER ORGANIZATION TABLE
    const filteredOrganizations = organizations.filter(org => 
        org.name.toLowerCase().includes(filterText.toLowerCase()) ||
        org.id.toString().includes(filterText)
    );

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Calculate pagination based on filtered data
    const totalPages = Math.ceil(filteredOrganizations.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentOrganizations = filteredOrganizations.slice(startIndex, endIndex);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Show loading while user context is loading
    if (!user)
    {
        return <div>Loading user...</div>;
    }

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Don't render if not SUPER_ADMIN
    if (user.role !== 'SUPER_ADMIN')
    {
        return null;
    }

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Loading..
    if (loading)
    {
        return <div>Loading organizations...</div>;
    }

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Task Status badges.
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

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // DOM
    return (
<>
{/* Confirm delte Task */}
<AlertDialog
  open={taskToRemove !== null}
  onOpenChange={(open) => {
    if (!open) setTaskToRemove(null);
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Remove task from organization?</AlertDialogTitle>
      <AlertDialogDescription>
        This will unlink the task from the current organization (set organizationId to null).
        The task record itself will remain in the system.
        This action cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
      <AlertDialogAction
        variant="destructive"
        onClick={handleRemoveTask}
        disabled={isDeleting}
      >
        {isDeleting ? "Removing..." : "Remove task"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

{/* Confirm delte Profile */}
<AlertDialog
  open={profileToDelete !== null}
  onOpenChange={(open) => {
    if (!open) setProfileToDelete(null);
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Remove profile from organization?</AlertDialogTitle>
      <AlertDialogDescription>
        This will unlink the profile from the current organization (set organizationId to null).
        The profile record itself will remain in the system.
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

{/* Confirm Delete Organisation */}
<AlertDialog 
  open={orgToDelete !== null} 
  onOpenChange={(open) => {
    if (!open) setOrgToDelete(null); // reset when closed
  }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete the organization
        "{organizations.find(o => o.id === orgToDelete)?.name || 'this item'}"
        and remove it from the system.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
      <AlertDialogAction
        variant="destructive"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

{/* ── New Organization pop up */}
<Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>Create New Organisation</DialogTitle>
      <DialogDescription>
        Enter the details for the new organisation. Click Save when you're done.
      </DialogDescription>
    </DialogHeader>

    <div className="grid gap-6 py-4">
      <div className="grid gap-2">
        <label className="block text-sm">Organisation name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter organization name"
          className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <label className="block text-sm">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter organization description"
          className="min-h-30 bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
        />
      </div>
    </div>

    <div className="flex justify-end gap-3">
      <Button
        variant="outline"
        onClick={handleCancel}
        disabled={isSaving}
      >
        Cancel
      </Button>
      <Button
        onClick={handleSave}
        disabled={!hasChanges || isSaving}
      >
        {isSaving ? 'Creating...' : 'Create organisation'}
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* ── Edit Profile pop up */}
<Dialog open={isEditProfileDialogOpen} onOpenChange={setIsEditProfileDialogOpen}>
    <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogDescription>
            Update the name and description. Click Save when you're done.
        </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
        <div className="grid gap-2">
            <label className="block text-sm">Profile name</label>
            <Input
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Enter profile name"
            autoFocus
            />
        </div>
        <div className="grid gap-2">
            <label className="block text-sm">Description</label>
            <Textarea
            value={profileDescription}
            onChange={(e) => setProfileDescription(e.target.value)}
            placeholder="Enter profile description"
            className="min-h-30"
            />
        </div>
        </div>
        <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleProfileCancel} disabled={isSaving}>
            Cancel
        </Button>
        <Button onClick={handleProfileSave} disabled={!profileHasChanges || isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
        </Button>
        </div>
    </DialogContent>
</Dialog>

{/* ── Edit Task pop up */}
<Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
  <DialogContent className="sm:max-w-125">
    <DialogHeader>
      <DialogTitle>Edit Task</DialogTitle>
      <DialogDescription>
        Update the task name and description.
      </DialogDescription>
    </DialogHeader>

    <div className="grid gap-6 py-4">
      <div className="grid gap-2">
        <label className="text-sm">Task name</label>
        <Input
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm">Description</label>
        <Textarea
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          className="min-h-30"
        />
      </div>
    </div>

    <div className="flex justify-end gap-3">
      <Button
        variant="outline"
        onClick={() => setIsEditTaskDialogOpen(false)}
        disabled={isSaving}
      >
        Cancel
      </Button>

      <Button
        onClick={handleTaskSave}
        disabled={!taskHasChanges || isSaving}
      >
        {isSaving ? "Saving..." : "Save changes"}
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* Add Existing Profile Dialog */}
<Dialog open={isAddProfileDialogOpen} onOpenChange={setIsAddProfileDialogOpen}>
  <DialogContent className="sm:max-w-125">
    <DialogHeader>
      <DialogTitle>Add Existing Profile to Organization</DialogTitle>
      <DialogDescription>
        Search and select a profile to assign to this organization.
      </DialogDescription>
    </DialogHeader>

    <div className="py-4">
      <Input
        placeholder="Search by name or email..."
        value={searchProfileText}
        onChange={(e) => setSearchProfileText(e.target.value)}
        className="mb-4"
      />

      <div className="max-h-75 overflow-y-auto border rounded">
        {availableProfiles.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No available profiles found</p>
        ) : (
          availableProfiles
            .filter((p) =>
              searchProfileText === "" ||
              p.name.toLowerCase().includes(searchProfileText.toLowerCase()) ||
              p.user?.email?.toLowerCase().includes(searchProfileText.toLowerCase())
            )
            .map((profile) => (
              <div
                key={profile.id}
                className={`p-3 border-b cursor-pointer hover:bg-muted ${
                  selectedProfileToAdd === profile.id ? "bg-muted" : ""
                }`}
                onClick={() => setSelectedProfileToAdd(profile.id)}
              >
                <div className="font-medium">{profile.name}</div>
                <div className="text-sm text-muted-foreground">{profile.user?.email || "No email"}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {profile.organization
                    ? `Currently in: ${profile.organization.name}`
                    : "Unassigned"}
                </div>
              </div>
            ))
        )}
      </div>
    </div>

    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={() => setIsAddProfileDialogOpen(false)}>
        Cancel
      </Button>
      <Button
        disabled={!selectedProfileToAdd}
        onClick={handleAddProfile}
      >
        Add Profile
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* Add Existing Task Dialog */}
<Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
  <DialogContent className="sm:max-w-125">
    <DialogHeader>
      <DialogTitle>Add Existing Task to Organization</DialogTitle>
      <DialogDescription>
        Search and select a task to assign to this organization.
      </DialogDescription>
    </DialogHeader>

    <div className="py-4">
      <Input
        placeholder="Search by name..."
        value={searchTaskText}
        onChange={(e) => setSearchTaskText(e.target.value)}
        className="mb-4"
      />

      <div className="max-h-75 overflow-y-auto border rounded">
        {availableTasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No available tasks found</p>
        ) : (
          availableTasks
            .filter((t) =>
              searchTaskText === "" ||
              t.name.toLowerCase().includes(searchTaskText.toLowerCase())
            )
            .map((task) => (
              <div
                key={task.id}
                className={`p-3 border-b cursor-pointer hover:bg-muted ${
                  selectedTaskToAdd === task.id ? "bg-muted" : ""
                }`}
                onClick={() => setSelectedTaskToAdd(task.id)}
              >
                <div className="font-medium">{task.name}</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="italic leading-tight">
                    {task.description?.slice(0, 60) || "No description"}...
                  </p>
                  <p className="text-xs">
                    {task.organization
                      ? `Currently in: ${task.organization.name}`
                      : "Currently not assigned to any organization"}
                  </p>
                </div>
              </div>
            ))
        )}
      </div>
    </div>

    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={() => setIsAddTaskDialogOpen(false)}>
        Cancel
      </Button>
      <Button
        variant="default"
        disabled={!selectedTaskToAdd}
        onClick={handleAddTask}
      >
        Add Task
      </Button>
    </div>
  </DialogContent>
</Dialog>

<div className="space-y-8 p-6">

    {/* Header Row (New Organisation) */}
    <div className="flex justify-center">
    <Button
        variant="default"
        size="sm"
        onClick={handleNewOrg}
    >
        New Organisation
    </Button>
    </div>

    {/* Filter Input */}
    <div className="flex justify-end">
        <Input
            placeholder="Filter by name or ID..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-sm"
        />
    </div>

    {/* Organisations table */}
    <Table>
        <TableHeader>
            <TableRow>
                <TableHead className="w-20 text-right">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-28 text-right">Profiles</TableHead>
                <TableHead className="w-28 text-right">Tasks</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
{ currentOrganizations.length === 0 ? (
            <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                    {filterText ? "No organizations match your filter" : "No organizations found"}
                </TableCell>
            </TableRow>
) : (
    currentOrganizations.map((org) => (
            <TableRow
                key={org.id}
                className={`
                    cursor-pointer transition-colors
                    ${selectedOrg?.id === org.id ? "bg-muted/60 hover:bg-muted/80" : "hover:bg-muted/50"}
                `}
                onClick={() => handleRowClick(org)}
            >
                <TableCell className="w-20 text-right tabular-nums">{org.id}</TableCell>
                <TableCell>{org.name}</TableCell>
                <TableCell className="w-28 text-right tabular-nums">{org.profiles?.length || 0}</TableCell>
                <TableCell className="w-28 text-right tabular-nums">{org.tasks?.length || 0}</TableCell>
            </TableRow>
        ))
    )
}
        </TableBody>
    </Table>

    {/* Pagination */}
{totalPages > 1 && (
    <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredOrganizations.length)} of {filteredOrganizations.length} organizations
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
    { Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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

{ /* Bottom/Detail Section with TABS */ }
{ selectedOrg && (
    <>
    <div>
        <hr className="my-8" />

        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full" id="edit-form">
            <div className="relative w-full">
                <TabsList className="w-full bg-transparent border-b border-neutral-700 rounded-none p-0 h-auto grid grid-cols-6">
                    <TabsTrigger 
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10" 
                        value="details"
                    >
                        Details
                    </TabsTrigger>
                    <TabsTrigger 
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10" 
                        value="settings"
                    >
                        Settings
                    </TabsTrigger>
                    <TabsTrigger 
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10" 
                        value="profiles"
                    >
                        Profiles ({selectedOrg.profiles?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="tasks"
                    >
                        Tasks ({selectedOrg.tasks?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="audit"
                    >
                        Audit Trail ({events.length})
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="actions"
                    >
                        Actions
                    </TabsTrigger>
                </TabsList>
                <div
                    className="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out z-0"
                    style={{
                        width: '16.666%',
                        left: activeTab === 'settings' ? '16.666%' :
                             activeTab === 'profiles' ? '33.333%' :
                             activeTab === 'tasks' ? '50%' :
                             activeTab === 'audit' ? '66.666%' :
                             activeTab === 'actions' ? '83.333%' : '0%'
                    }}
                />
            </div>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6 max-w-2xl mt-6">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm mb-2">Organisation name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter organization name"
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-2">Description</label>
                        <Textarea 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter organization description"
                            className="min-h-[120px] bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent" 
                        />
                    </div>
                </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6 max-w-2xl mt-6">
                <div className="space-y-6">
                    <div>
                    <label className="block text-sm mb-2">Upload Directory</label>
                    <Input
                        value={uploadDirectory}
                        onChange={(e) => setUploadDirectory(e.target.value)}
                        placeholder="Enter upload directory path (e.g., /var/uploads)"
                        className="bg-neutral-800 border border-neutral-700 rounded-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Directory where uploaded files are temporarily stored
                    </p>
                    </div>

                    <div>
                    <label className="block text-sm mb-2">Download Directory</label>
                    <Input
                        value={downloadDirectory}
                        onChange={(e) => setDownloadDirectory(e.target.value)}
                        placeholder="Enter download directory path (e.g., /var/downloads)"
                        className="bg-neutral-800 border border-neutral-700 rounded-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Directory where files are prepared for download
                    </p>
                    </div>

                    <div>
                    <label className="block text-sm mb-2">Artifact Directory</label>
                    <Input
                        value={artifactDirectory}
                        onChange={(e) => setArtifactDirectory(e.target.value)}
                        placeholder="Enter artifact directory path (e.g., /var/artifacts)"
                        className="bg-neutral-800 border border-neutral-700 rounded-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Directory where artifact files are permanently stored
                    </p>
                    </div>

                    {!selectedOrg.settings && !settingsHasChanges && (
                    <div className="text-sm text-muted-foreground italic">
                        No settings configured for this organization yet. Enter the directory paths above and save.
                    </div>
                    )}
                </div>
            </TabsContent>

            {/* Profiles Tab */}
            <TabsContent value="profiles" className="mt-6">
                <div className="flex justify-center mb-4">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                        fetchAvailableProfiles();
                        setIsAddProfileDialogOpen(true);
                        }}
                    >
                        Add Profile
                    </Button>
                </div>
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
                        {selectedOrg.profiles?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    No profiles found for this organization
                                </TableCell>
                            </TableRow>
                        ) : (
                            (() => {
                                const startIdx = (profilesCurrentPage - 1) * subTabPerPage;
                                const endIdx = startIdx + subTabPerPage;
                                const pageProfiles = (selectedOrg.profiles || []).slice(startIdx, endIdx);
                                return pageProfiles.map((profile: any) => (
                                    <TableRow
                                        key={profile.id}
                                        className={`
                                            cursor-pointer transition-colors
                                            ${selectedProfile?.id === profile.id ? "bg-muted/60 hover:bg-muted/80" : "hover:bg-muted/50"}
                                        `}
                                        onClick={() => handleProfileRowClick(profile)}
                                    >
                                        <TableCell className="w-20 text-right tabular-nums">{profile.id}</TableCell>
                                        <TableCell>{profile.name}</TableCell>
                                        <TableCell>{profile.description || '-'}</TableCell>
                                        <TableCell>
                                            <button
                                                className="hover:text-destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setProfileToDelete(profile.id);
                                                }}
                                            >
                                                <Trash2 size={16}  className="cursor-pointer" />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ));
                            })()
                        )}
                    </TableBody>
                </Table>
                {(() => {
                    const totalProfiles = selectedOrg.profiles?.length || 0;
                    const totalPages = Math.ceil(totalProfiles / subTabPerPage);
                    const startIdx = (profilesCurrentPage - 1) * subTabPerPage;
                    const endIdx = Math.min(startIdx + subTabPerPage, totalProfiles);
                    return totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                            <div className="text-sm text-muted-foreground">
                                Showing {startIdx + 1} to {endIdx} of {totalProfiles} profiles
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

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="mt-6">
                <div className="flex justify-center mb-4">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                        fetchAvailableTasks();
                        setIsAddTaskDialogOpen(true);
                        }}
                    >
                        Add Task
                    </Button>
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
                        {selectedOrg.tasks?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    No tasks found for this organization
                                </TableCell>
                            </TableRow>
                        ) : (
                            (() => {
                                const startIdx = (tasksCurrentPage - 1) * subTabPerPage;
                                const endIdx = startIdx + subTabPerPage;
                                const pageTasks = (selectedOrg.tasks || []).slice(startIdx, endIdx);
                                return pageTasks.map((task: any) => (
                                    <TableRow
                                        key={task.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleTaskRowClick(task)}
                                    >
                                        <TableCell className="w-20 text-right tabular-nums">{task.id}</TableCell>
                                        <TableCell>{task.name}</TableCell>
                                        <TableCell>{task.description || '-'}</TableCell>
                                        <TableCell className="w-32">
                                            <Badge variant="secondary" className={`${getStatusBadge(task.status)} px-2 py-1 text-xs status-badge`}>
                                                {task.status.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="w-16 text-right">
                                            <button
                                                className="hover:text-destructive p-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTaskToRemove(task.id);
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
                {(() => {
                    const totalTasks = selectedOrg.tasks?.length || 0;
                    const totalPages = Math.ceil(totalTasks / subTabPerPage);
                    const startIdx = (tasksCurrentPage - 1) * subTabPerPage;
                    const endIdx = Math.min(startIdx + subTabPerPage, totalTasks);
                    return totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                            <div className="text-sm text-muted-foreground">
                                Showing {startIdx + 1} to {endIdx} of {totalTasks} tasks
                            </div>
                            <div className="flex justify-end">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => setTasksCurrentPage(prev => Math.max(prev - 1, 1))}
                                                className={tasksCurrentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                        </PaginationItem>
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                    <PaginationItem key={page}>
                                                        <PaginationLink
                                                            onClick={() => setTasksCurrentPage(page)}
                                                            isActive={tasksCurrentPage === page}
                                                            className="cursor-pointer"
                                                        >
                                                            {page}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ))}
                                            </div>
                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() => setTasksCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                    className={tasksCurrentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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

            {/* Audit Trail Tab */}
            <TabsContent value="audit" className="mt-6">
                {loadingEvents ? (
                    <div className="text-center text-muted-foreground py-8">Loading events...</div>
                ) : events.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No events for this organization</div>
                ) : (
                    <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20 text-right">ID</TableHead>
                                <TableHead className="w-40">Date</TableHead>
                                <TableHead className="w-40">User</TableHead>
                                <TableHead className="w-32">Importance</TableHead>
                                <TableHead>Message</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(() => {
                                const startIdx = (eventsCurrentPage - 1) * subTabPerPage;
                                const endIdx = startIdx + subTabPerPage;
                                const currentEvents = events.slice(startIdx, endIdx);
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
                    {(() => {
                        const totalEventsPages = Math.ceil(events.length / subTabPerPage);
                        const startIdx = (eventsCurrentPage - 1) * subTabPerPage;
                        const endIdx = Math.min(startIdx + subTabPerPage, events.length);
                        return totalEventsPages > 1 && (
                            <div className="flex items-center justify-between mt-6">
                                <div className="text-sm text-muted-foreground">
                                    Showing {startIdx + 1} to {endIdx} of {events.length} events
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

            {/* Actions Tab */}
            <TabsContent value="actions" className="mt-6">
                <div className="space-y-6 max-w-2xl">
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Organization Actions</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Manage this organization with the actions below.
                        </p>
                    </div>

                    <div className="border border-destructive/30 rounded-lg p-4 bg-destructive/5">
                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <h4 className="font-medium text-destructive mb-1">Delete Organization</h4>
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete this organization and all associated data. This action cannot be undone.
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={() => setOrgToDelete(selectedOrg.id)}
                                className="shrink-0"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Organization
                            </Button>
                        </div>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
    </div>
    </>
    )}

{selectedOrg && (hasChanges || settingsHasChanges) && (
  <div className={`
    fixed bottom-0 left-0 right-0
    left-var(--sidebar-width) 
    bg-background border-t border-neutral-800
    px-6 py-3
    flex justify-end items-center gap-3
    transition-transform duration-300 ease-in-out
    ${hasChanges || settingsHasChanges ? 'translate-y-0' : 'translate-y-full'}
  `}>
    <Button
      variant="secondary"
      onClick={() => {
        // Reset both detail & settings fields
        setName(selectedOrg.name || "");
        setDescription(selectedOrg.description || "");
        setUploadDirectory(selectedOrg.settings?.uploadDirectory || "");
        setDownloadDirectory(selectedOrg.settings?.downloadDirectory || "");
        setArtifactDirectory(selectedOrg.settings?.artifactDirectory || "");
        setHasChanges(false);
        setSettingsHasChanges(false);
      }}
      disabled={isSaving}
      className="rounded-none"
    >
      Cancel
    </Button>

    <Button
      variant="default"
      onClick={async () => {
        setIsSaving(true);
        let success = true;

        // ── Save details if changed ────────
        if (hasChanges) {
          try {
            await handleSave(); // ← your existing organization save logic
          } catch (err) {
            success = false;
          }
        }

        // ── Save settings if changed ───────
        if (success && settingsHasChanges) {
          try {
            await handleSettingsSave(); // ← your existing settings save logic
          } catch (err) {
            success = false;
          }
        }

        setIsSaving(false);

        if (success) {
          // Both (or whichever was dirty) succeeded
          setHasChanges(false);
          setSettingsHasChanges(false);
        }
      }}
      disabled={isSaving || (!hasChanges && !settingsHasChanges)}
    >
      {isSaving ? 'Saving...' : 'Save changes'}
    </Button>
  </div>
)}
</div>
</>

       );
}