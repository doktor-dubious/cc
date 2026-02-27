'use client';

import { useUser }              from '@/context/UserContext';
import { useOrganization }      from '@/context/OrganizationContext';
import { useRouter }            from 'next/navigation';
import { useEffect, useState }  from 'react';
import { Trash2, Star, ChevronDown } from 'lucide-react';
import { Button }               from "@/components/ui/button";
import { Checkbox }             from "@/components/ui/checkbox";
import { useTranslations }      from 'next-intl';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExportMenu } from '@/components/ui/export-menu';
import type { ExportColumn } from '@/lib/export';

export default function OrganizationPage()
{
    const user = useUser();
    const { activeOrganization } = useOrganization();
    const router = useRouter();
    const t = useTranslations('Organization');
    const tc = useTranslations('Common');

    const [organizations, setOrganizations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);

    // Form fields (controlled)
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [ig, setIg] = useState<number>(1);
    const [size, setSize] = useState<string>("MICRO");

    // Classification fields
    const [naceSection, setNaceSection] = useState<string | null>(null);
    const [legalForm, setLegalForm] = useState<string | null>(null);
    const [revenueRange, setRevenueRange] = useState<string | null>(null);
    const [maturity, setMaturity] = useState<string | null>(null);
    const [ownershipType, setOwnershipType] = useState<string | null>(null);
    const [geographicScope, setGeographicScope] = useState<string | null>(null);
    const [businessOrientation, setBusinessOrientation] = useState<string | null>(null);
    const [digitalMaturity, setDigitalMaturity] = useState<string | null>(null);
    const [esgStatus, setEsgStatus] = useState<string | null>(null);
    const [supplyChainRole, setSupplyChainRole] = useState<string | null>(null);
    const [riskProfile, setRiskProfile] = useState<string | null>(null);
    const [euTaxonomyAligned, setEuTaxonomyAligned] = useState<boolean | null>(null);

    // IT & Security Classification fields
    const [itSecurityStaff, setItSecurityStaff] = useState<string | null>(null);
    const [securityMaturity, setSecurityMaturity] = useState<string | null>(null);
    const [dataSensitivity, setDataSensitivity] = useState<string[]>([]);
    const [regulatoryObligations, setRegulatoryObligations] = useState<string[]>([]);
    const [itEndpointRange, setItEndpointRange] = useState<string | null>(null);
    const [infrastructureTypes, setInfrastructureTypes] = useState<string[]>([]);
    const [softwareDevelopment, setSoftwareDevelopment] = useState<string | null>(null);
    const [publicFacingServices, setPublicFacingServices] = useState<string | null>(null);
    const [targetedAttackLikelihood, setTargetedAttackLikelihood] = useState<string | null>(null);
    const [downtimeTolerance, setDowntimeTolerance] = useState<string | null>(null);
    const [supplyChainPosition, setSupplyChainPosition] = useState<string | null>(null);
    const [securityBudgetRange, setSecurityBudgetRange] = useState<string | null>(null);

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

    // Selection and starring state
    const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());
    const [starredOrgIds, setStarredOrgIds] = useState<Set<string>>(new Set());

    // Bulk delete state
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleteConfirmChecked, setBulkDeleteConfirmChecked] = useState(false);
    const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState("");
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

    // ----------------------------------------------------------------------------------------------------------------
    // FETCH STARRED ORGANIZATIONS
    const fetchStarredOrganizations = async () =>
    {
        try
        {
            const res = await fetch('/api/organization-star');
            const data = await res.json();
            if (!data.success)
            {
                console.error('Failed to fetch starred organizations:', data.message);
                return;
            }
            setStarredOrgIds(new Set(data.data || []));
        }
        catch (error)
        {
            console.error('Failed to fetch starred organizations:', error);
        }
    };

    // ----------------------------------------------------------------------------------------------------------------
    // TOGGLE STAR (API call)
    const toggleStarApi = async (organizationId: string) =>
    {
        try
        {
            const res = await fetch('/api/organization-star', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizationId }),
            });
            const data = await res.json();
            if (!data.success)
            {
                console.error('Failed to toggle star:', data.message);
                return;
            }
            // Update local state based on response
            setStarredOrgIds(prev => {
                const newSet = new Set(prev);
                if (data.starred) {
                    newSet.add(organizationId);
                } else {
                    newSet.delete(organizationId);
                }
                return newSet;
            });
        }
        catch (error)
        {
            console.error('Failed to toggle star:', error);
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
        fetchStarredOrganizations();

        // Listen for refresh event
        const handleRefresh = () =>
        {
            fetchOrganizations();
            fetchStarredOrganizations();
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

            setSelectedOrg((prev: any) => 
            {
                if (!prev) return prev;
                return {
                    ...prev,
                    profiles: [...prev.profiles, addedProfile],
                };
            });

            toast.success(t('toast.profileAssigned'));

            // Event: profile added
            await createEvent(`Profile added: "${addedProfile.name}"`, 'HIGH', selectedOrg.id);

            setIsAddProfileDialogOpen(false);
            setSelectedProfileToAdd(null);
        } 
        catch (err: any) 
        {
            // -- Debug -- console.error("Add profile error:", err);
            toast.error(err.message || t('toast.assignProfileError'));
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

            setSelectedOrg((prev: any) => 
            {
                if (!prev) return prev;
                return {
                    ...prev,
                    tasks: [...prev.tasks, addedTask],
                };
            });

            toast.success(t('toast.taskAssigned'));

            // Event: task added
            await createEvent(`Task added: "${addedTask.name}"`, 'MIDDLE', selectedOrg.id);

            setIsAddTaskDialogOpen(false);
            setSelectedTaskToAdd(null);
        } 
        catch (err: any) 
        {
            // -- Debug -- console.error("Add task error:", err);
            toast.error(err.message || t('toast.assignTaskError'));
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
                toast.error(t('toast.loadProfilesError'));
                router.push('/error');
                return;
            }
        }
        catch (err)
        {
            // -- Debug -- console.error("Failed to fetch available profiles", err);
            toast.error(t('toast.loadProfilesError'));
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
                toast.error(t('toast.loadTasksError'));
                router.push('/error');
                return;
            }
        }
        catch (err)
        {
            console.error("Failed to fetch available tasks", err);
            toast.error(t('toast.loadTasksError'));
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
            setIg(selectedOrg.ig || 1);
            setSize(selectedOrg.size || "MICRO");

            // Classification fields
            setNaceSection(selectedOrg.naceSection || null);
            setLegalForm(selectedOrg.legalForm || null);
            setRevenueRange(selectedOrg.revenueRange || null);
            setMaturity(selectedOrg.maturity || null);
            setOwnershipType(selectedOrg.ownershipType || null);
            setGeographicScope(selectedOrg.geographicScope || null);
            setBusinessOrientation(selectedOrg.businessOrientation || null);
            setDigitalMaturity(selectedOrg.digitalMaturity || null);
            setEsgStatus(selectedOrg.esgStatus || null);
            setSupplyChainRole(selectedOrg.supplyChainRole || null);
            setRiskProfile(selectedOrg.riskProfile || null);
            setEuTaxonomyAligned(selectedOrg.euTaxonomyAligned ?? null);

            // IT & Security Classification fields
            setItSecurityStaff(selectedOrg.itSecurityStaff || null);
            setSecurityMaturity(selectedOrg.securityMaturity || null);
            setDataSensitivity(selectedOrg.dataSensitivity || []);
            setRegulatoryObligations(selectedOrg.regulatoryObligations || []);
            setItEndpointRange(selectedOrg.itEndpointRange || null);
            setInfrastructureTypes(selectedOrg.infrastructureTypes || []);
            setSoftwareDevelopment(selectedOrg.softwareDevelopment || null);
            setPublicFacingServices(selectedOrg.publicFacingServices || null);
            setTargetedAttackLikelihood(selectedOrg.targetedAttackLikelihood || null);
            setDowntimeTolerance(selectedOrg.downtimeTolerance || null);
            setSupplyChainPosition(selectedOrg.supplyChainPosition || null);
            setSecurityBudgetRange(selectedOrg.securityBudgetRange || null);

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
            toast.error(t('toast.directoryFieldsRequired'));
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

            setSelectedOrg((prev: any) => (
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

            toast.success(t('toast.settingsSaved'));
            setSettingsHasChanges(false);
        } 
        catch (err: any) 
        {
            console.error(err);
            toast.error(err.error || t('toast.saveSettingsError'));
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
            setIg(selectedOrg.ig || 1);
            setSize(selectedOrg.size || "MICRO");
            setNaceSection(selectedOrg.naceSection || null);
            setLegalForm(selectedOrg.legalForm || null);
            setRevenueRange(selectedOrg.revenueRange || null);
            setMaturity(selectedOrg.maturity || null);
            setOwnershipType(selectedOrg.ownershipType || null);
            setGeographicScope(selectedOrg.geographicScope || null);
            setBusinessOrientation(selectedOrg.businessOrientation || null);
            setDigitalMaturity(selectedOrg.digitalMaturity || null);
            setEsgStatus(selectedOrg.esgStatus || null);
            setSupplyChainRole(selectedOrg.supplyChainRole || null);
            setRiskProfile(selectedOrg.riskProfile || null);
            setEuTaxonomyAligned(selectedOrg.euTaxonomyAligned ?? null);
            setItSecurityStaff(selectedOrg.itSecurityStaff || null);
            setSecurityMaturity(selectedOrg.securityMaturity || null);
            setDataSensitivity(selectedOrg.dataSensitivity || []);
            setRegulatoryObligations(selectedOrg.regulatoryObligations || []);
            setItEndpointRange(selectedOrg.itEndpointRange || null);
            setInfrastructureTypes(selectedOrg.infrastructureTypes || []);
            setSoftwareDevelopment(selectedOrg.softwareDevelopment || null);
            setPublicFacingServices(selectedOrg.publicFacingServices || null);
            setTargetedAttackLikelihood(selectedOrg.targetedAttackLikelihood || null);
            setDowntimeTolerance(selectedOrg.downtimeTolerance || null);
            setSupplyChainPosition(selectedOrg.supplyChainPosition || null);
            setSecurityBudgetRange(selectedOrg.securityBudgetRange || null);
        }
        else
        {
            // Reset form when no org selected (for "New Organisation")
            setName("");
            setDescription("");
            setIg(1);
            setSize("MICRO");
            setNaceSection(null);
            setLegalForm(null);
            setRevenueRange(null);
            setMaturity(null);
            setOwnershipType(null);
            setGeographicScope(null);
            setBusinessOrientation(null);
            setDigitalMaturity(null);
            setEsgStatus(null);
            setSupplyChainRole(null);
            setRiskProfile(null);
            setEuTaxonomyAligned(null);
            setItSecurityStaff(null);
            setSecurityMaturity(null);
            setDataSensitivity([]);
            setRegulatoryObligations([]);
            setItEndpointRange(null);
            setInfrastructureTypes([]);
            setSoftwareDevelopment(null);
            setPublicFacingServices(null);
            setTargetedAttackLikelihood(null);
            setDowntimeTolerance(null);
            setSupplyChainPosition(null);
            setSecurityBudgetRange(null);
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

        // Helper to compare arrays
        const arraysEqual = (a: string[], b: string[]) =>
            a.length === b.length && a.every((v, i) => v === b[i]);

        // Edit existing organization mode - Basic fields
        const nameChanged = name.trim() !== (selectedOrg.name || "").trim();
        const descChanged = description.trim() !== (selectedOrg.description || "").trim();
        const igChanged = ig !== (selectedOrg.ig || 1);
        const sizeChanged = size !== (selectedOrg.size || "MICRO");

        // Classification fields (Taxonomy tab)
        const naceSectionChanged = naceSection !== (selectedOrg.naceSection || null);
        const legalFormChanged = legalForm !== (selectedOrg.legalForm || null);
        const revenueRangeChanged = revenueRange !== (selectedOrg.revenueRange || null);
        const maturityChanged = maturity !== (selectedOrg.maturity || null);
        const ownershipTypeChanged = ownershipType !== (selectedOrg.ownershipType || null);
        const geographicScopeChanged = geographicScope !== (selectedOrg.geographicScope || null);
        const businessOrientationChanged = businessOrientation !== (selectedOrg.businessOrientation || null);
        const digitalMaturityChanged = digitalMaturity !== (selectedOrg.digitalMaturity || null);
        const esgStatusChanged = esgStatus !== (selectedOrg.esgStatus || null);
        const supplyChainRoleChanged = supplyChainRole !== (selectedOrg.supplyChainRole || null);
        const riskProfileChanged = riskProfile !== (selectedOrg.riskProfile || null);
        const euTaxonomyAlignedChanged = euTaxonomyAligned !== (selectedOrg.euTaxonomyAligned ?? null);

        // IT & Security Classification fields
        const itSecurityStaffChanged = itSecurityStaff !== (selectedOrg.itSecurityStaff || null);
        const securityMaturityChanged = securityMaturity !== (selectedOrg.securityMaturity || null);
        const dataSensitivityChanged = !arraysEqual(dataSensitivity, selectedOrg.dataSensitivity || []);
        const regulatoryObligationsChanged = !arraysEqual(regulatoryObligations, selectedOrg.regulatoryObligations || []);
        const itEndpointRangeChanged = itEndpointRange !== (selectedOrg.itEndpointRange || null);
        const infrastructureTypesChanged = !arraysEqual(infrastructureTypes, selectedOrg.infrastructureTypes || []);
        const softwareDevelopmentChanged = softwareDevelopment !== (selectedOrg.softwareDevelopment || null);
        const publicFacingServicesChanged = publicFacingServices !== (selectedOrg.publicFacingServices || null);
        const targetedAttackLikelihoodChanged = targetedAttackLikelihood !== (selectedOrg.targetedAttackLikelihood || null);
        const downtimeToleranceChanged = downtimeTolerance !== (selectedOrg.downtimeTolerance || null);
        const supplyChainPositionChanged = supplyChainPosition !== (selectedOrg.supplyChainPosition || null);
        const securityBudgetRangeChanged = securityBudgetRange !== (selectedOrg.securityBudgetRange || null);

        const hasAnyChange =
            nameChanged || descChanged || igChanged || sizeChanged ||
            // Classification
            naceSectionChanged || legalFormChanged || revenueRangeChanged || maturityChanged ||
            ownershipTypeChanged || geographicScopeChanged || businessOrientationChanged ||
            digitalMaturityChanged || esgStatusChanged || supplyChainRoleChanged ||
            riskProfileChanged || euTaxonomyAlignedChanged ||
            // IT & Security
            itSecurityStaffChanged || securityMaturityChanged || dataSensitivityChanged ||
            regulatoryObligationsChanged || itEndpointRangeChanged || infrastructureTypesChanged ||
            softwareDevelopmentChanged || publicFacingServicesChanged || targetedAttackLikelihoodChanged ||
            downtimeToleranceChanged || supplyChainPositionChanged || securityBudgetRangeChanged;

        setHasChanges(hasAnyChange);
    }, [
        name, description, ig, size, selectedOrg,
        // Classification fields
        naceSection, legalForm, revenueRange, maturity, ownershipType,
        geographicScope, businessOrientation, digitalMaturity, esgStatus,
        supplyChainRole, riskProfile, euTaxonomyAligned,
        // IT & Security fields
        itSecurityStaff, securityMaturity, dataSensitivity, regulatoryObligations,
        itEndpointRange, infrastructureTypes, softwareDevelopment, publicFacingServices,
        targetedAttackLikelihood, downtimeTolerance, supplyChainPosition, securityBudgetRange
    ]);

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
            toast.error(t('toast.profileNameRequired'));
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
            setSelectedOrg((prev: any) =>
            {
                if (!prev) return prev;
                return {
                    ...prev,
                    profiles: prev.profiles.map((p: any) =>
                        p.id === selectedProfile.id ? updatedProfile : p
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

    const handleCancel = () =>
    {
        if (!selectedOrg)
        {
            setName("");
            setDescription("");
            setIg(1);
            setSize("MICRO");
            setNaceSection(null);
            setLegalForm(null);
            setRevenueRange(null);
            setMaturity(null);
            setOwnershipType(null);
            setGeographicScope(null);
            setBusinessOrientation(null);
            setDigitalMaturity(null);
            setEsgStatus(null);
            setSupplyChainRole(null);
            setRiskProfile(null);
            setEuTaxonomyAligned(null);
            // IT & Security fields
            setItSecurityStaff(null);
            setSecurityMaturity(null);
            setDataSensitivity([]);
            setRegulatoryObligations([]);
            setItEndpointRange(null);
            setInfrastructureTypes([]);
            setSoftwareDevelopment(null);
            setPublicFacingServices(null);
            setTargetedAttackLikelihood(null);
            setDowntimeTolerance(null);
            setSupplyChainPosition(null);
            setSecurityBudgetRange(null);
        }
        else
        {
            setName(selectedOrg.name || "");
            setDescription(selectedOrg.description || "");
            setIg(selectedOrg.ig || 1);
            setSize(selectedOrg.size || "MICRO");
            setNaceSection(selectedOrg.naceSection || null);
            setLegalForm(selectedOrg.legalForm || null);
            setRevenueRange(selectedOrg.revenueRange || null);
            setMaturity(selectedOrg.maturity || null);
            setOwnershipType(selectedOrg.ownershipType || null);
            setGeographicScope(selectedOrg.geographicScope || null);
            setBusinessOrientation(selectedOrg.businessOrientation || null);
            setDigitalMaturity(selectedOrg.digitalMaturity || null);
            setEsgStatus(selectedOrg.esgStatus || null);
            setSupplyChainRole(selectedOrg.supplyChainRole || null);
            setRiskProfile(selectedOrg.riskProfile || null);
            setEuTaxonomyAligned(selectedOrg.euTaxonomyAligned ?? null);
            // IT & Security fields
            setItSecurityStaff(selectedOrg.itSecurityStaff || null);
            setSecurityMaturity(selectedOrg.securityMaturity || null);
            setDataSensitivity(selectedOrg.dataSensitivity || []);
            setRegulatoryObligations(selectedOrg.regulatoryObligations || []);
            setItEndpointRange(selectedOrg.itEndpointRange || null);
            setInfrastructureTypes(selectedOrg.infrastructureTypes || []);
            setSoftwareDevelopment(selectedOrg.softwareDevelopment || null);
            setPublicFacingServices(selectedOrg.publicFacingServices || null);
            setTargetedAttackLikelihood(selectedOrg.targetedAttackLikelihood || null);
            setDowntimeTolerance(selectedOrg.downtimeTolerance || null);
            setSupplyChainPosition(selectedOrg.supplyChainPosition || null);
            setSecurityBudgetRange(selectedOrg.securityBudgetRange || null);
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
                name                     : name.trim(),
                description              : description.trim(),
                ig                       : ig,
                size                     : size,
                naceSection              : naceSection,
                legalForm                : legalForm,
                revenueRange             : revenueRange,
                maturity                 : maturity,
                ownershipType            : ownershipType,
                geographicScope          : geographicScope,
                businessOrientation      : businessOrientation,
                digitalMaturity          : digitalMaturity,
                esgStatus                : esgStatus,
                supplyChainRole          : supplyChainRole,
                riskProfile              : riskProfile,
                euTaxonomyAligned        : euTaxonomyAligned,
                itSecurityStaff          : itSecurityStaff,
                securityMaturity         : securityMaturity,
                dataSensitivity          : dataSensitivity,
                regulatoryObligations    : regulatoryObligations,
                itEndpointRange          : itEndpointRange,
                infrastructureTypes      : infrastructureTypes,
                softwareDevelopment      : softwareDevelopment,
                publicFacingServices     : publicFacingServices,
                targetedAttackLikelihood : targetedAttackLikelihood,
                downtimeTolerance        : downtimeTolerance,
                supplyChainPosition      : supplyChainPosition,
                securityBudgetRange      : securityBudgetRange,
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
            toast.success(isNew ? t('toast.organizationCreated') : t('toast.organizationUpdated'));
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
    // DETETE ORGANIZATION
    const handleDelete = async () =>
    {
        if (!orgToDelete) return;

        setIsDeleting(true);

        // Capture org name before deletion
        const deletedOrg = organizations.find(o => o.id === orgToDelete);

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

            await createEvent(`Organization deleted: "${deletedOrg?.name || 'Unknown'}"`, 'HIGH', orgToDelete);

            toast.success(t('toast.organizationDeleted'));

            // Reset
            setOrgToDelete(null);
        }
        catch (err)
        {
            console.error("Delete error:", err);
            toast.error(t('toast.deleteError'));
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
            setSelectedOrg((prev: any) => 
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

            toast.success(t('toast.taskRemoved'));

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
            toast.error(err.message || t('toast.removeTaskError'));
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
            setSelectedOrg((prev: any) => 
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

            toast.success(t('toast.profileRemoved'));

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
            toast.error(err.message || t('toast.removeProfileError'));
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
            toast.error(t('toast.taskNameRequired'));
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
            setSelectedOrg((prev: any) =>
            prev
                ? {
                    ...prev,
                    tasks: prev.tasks.map((t: any) =>
                    t.id === updatedTask.id ? updatedTask : t
                    ),
                }
                : prev
            );

            toast.success(t('toast.taskUpdated'));
            setIsEditTaskDialogOpen(false);
        }
        catch (err)
        {
            console.error(err);
            toast.error(t('toast.updateTaskError'));
        }
        finally
        {
            setIsSaving(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FILTER ORGANIZATION TABLE
    const filteredOrganizations = organizations
        .filter(org =>
            org.name.toLowerCase().includes(filterText.toLowerCase()) ||
            org.id.toString().includes(filterText)
        )
        // Sort: active organization first, then by updatedAt descending
        .sort((a, b) => {
            // Active organization always on top
            if (activeOrganization?.id === a.id) return -1;
            if (activeOrganization?.id === b.id) return 1;
            // Then sort by updatedAt descending (most recent first)
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            return dateB - dateA;
        });

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Calculate pagination based on filtered data
    const totalPages = Math.ceil(filteredOrganizations.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentOrganizations = filteredOrganizations.slice(startIndex, endIndex);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Selection helpers
    const toggleOrgSelection = (orgId: string) => {
        setSelectedOrgIds(prev => {
            const next = new Set(prev);
            if (next.has(orgId)) {
                next.delete(orgId);
            } else {
                next.add(orgId);
            }
            return next;
        });
    };

    const toggleOrgStar = (orgId: string) => {
        toggleStarApi(orgId);
    };

    const selectAllOrgs = () => {
        setSelectedOrgIds(new Set(currentOrganizations.map(o => o.id)));
    };

    const deselectAllOrgs = () => {
        setSelectedOrgIds(new Set());
    };

    const selectStarredOrgs = () => {
        setSelectedOrgIds(new Set(
            currentOrganizations.filter(o => starredOrgIds.has(o.id)).map(o => o.id)
        ));
    };

    // Get localized "delete" word based on user's language
    const getDeleteWord = () => {
        return tc('words.delete') || 'delete';
    };

    // Bulk delete organizations
    const handleBulkDelete = async () => {
        if (!bulkDeleteConfirmChecked) return;
        if (bulkDeleteConfirmText.toLowerCase() !== getDeleteWord().toLowerCase()) return;

        setIsBulkDeleting(true);
        const orgIds = Array.from(selectedOrgIds);
        let success = 0;
        let failed = 0;

        for (const orgId of orgIds) {
            try {
                const res = await fetch(`/api/organization/${orgId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                });

                if (res.ok) {
                    success++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.error('Failed to delete organization:', orgId, error);
                failed++;
            }
        }

        setIsBulkDeleting(false);
        setIsBulkDeleteDialogOpen(false);
        setBulkDeleteConfirmChecked(false);
        setBulkDeleteConfirmText("");

        if (success > 0) {
            // Remove deleted organizations from state
            setOrganizations(prev => prev.filter(o => !selectedOrgIds.has(o.id)));
            if (selectedOrg && selectedOrgIds.has(selectedOrg.id)) {
                setSelectedOrg(null);
            }
            setSelectedOrgIds(new Set());
            toast.success(t('toast.organizationsDeleted', { count: success }));
        }
        if (failed > 0) {
            toast.error(t('toast.organizationsDeleteFailed', { count: failed }));
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Show loading while user context is loading
    if (!user)
    {
        return <div>{t('loading.loadingUser')}</div>;
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
        return <div>{t('loading.loadingOrganizations')}</div>;
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

    const exportColumns: ExportColumn[] = [
        { header: 'Name', accessor: 'name' },
        { header: 'Profiles', accessor: (row: any) => String(row.profiles?.length || 0) },
        { header: 'Tasks', accessor: (row: any) => String(row.tasks?.length || 0) },
    ];

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
      <AlertDialogTitle>{t('dialogs.removeTaskTitle')}</AlertDialogTitle>
      <AlertDialogDescription>
        {t('dialogs.removeTaskDescription')}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>{tc('buttons.cancel')}</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive text-white hover:bg-destructive/90"
        onClick={handleRemoveTask}
        disabled={isDeleting}
      >
        {isDeleting ? t('buttons.removing') : t('buttons.removeTask')}
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
      <AlertDialogTitle>{t('dialogs.removeProfileTitle')}</AlertDialogTitle>
      <AlertDialogDescription>
        {t('dialogs.removeProfileDescription')}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>{tc('buttons.cancel')}</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive text-white hover:bg-destructive/90"
        onClick={handleRemoveProfile}
        disabled={isDeleting}
      >
        {isDeleting ? t('buttons.removing') : t('buttons.removeProfile')}
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
      <AlertDialogTitle>{tc('dialogs.deleteTitle')}</AlertDialogTitle>
      <AlertDialogDescription>
        {t('dialogs.deleteDescription', { name: organizations.find(o => o.id === orgToDelete)?.name || 'this item' })}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>{tc('buttons.cancel')}</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive text-white hover:bg-destructive/90"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? tc('buttons.deleting') : tc('buttons.delete')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

{/* Bulk Delete Organizations Dialog */}
<Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
    <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <DialogTitle className="text-destructive">{t('dialogs.bulkDeleteTitle')}</DialogTitle>
            <DialogDescription>
                {t('dialogs.bulkDeleteDescription', { count: selectedOrgIds.size })}
            </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 border border-destructive/30 rounded-lg bg-destructive/5">
                <Checkbox
                    id="bulk-delete-confirm"
                    checked={bulkDeleteConfirmChecked}
                    onCheckedChange={(checked) => setBulkDeleteConfirmChecked(!!checked)}
                />
                <label htmlFor="bulk-delete-confirm" className="text-sm cursor-pointer">
                    {t('dialogs.bulkDeleteConfirmCheckbox')}
                </label>
            </div>

            <div className="space-y-2">
                <label className="block text-sm">
                    {t('dialogs.bulkDeleteTypeWord', { word: getDeleteWord() })}
                </label>
                <Input
                    value={bulkDeleteConfirmText}
                    onChange={(e) => setBulkDeleteConfirmText(e.target.value)}
                    placeholder={getDeleteWord()}
                    className={bulkDeleteConfirmText.toLowerCase() === getDeleteWord().toLowerCase() ? 'border-green-500' : ''}
                />
            </div>
        </div>

        <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isBulkDeleting}>
                {tc('buttons.cancel')}
            </Button>
            <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={
                    isBulkDeleting ||
                    !bulkDeleteConfirmChecked ||
                    bulkDeleteConfirmText.toLowerCase() !== getDeleteWord().toLowerCase()
                }
            >
                {isBulkDeleting ? tc('buttons.deleting') : t('buttons.deleteOrganizations', { count: selectedOrgIds.size })}
            </Button>
        </div>
    </DialogContent>
</Dialog>

{/* ── New Organization pop up */}
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
        <label className="block text-sm">{t('labels.organisationName')}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('placeholders.enterOrganizationName')}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <label className="block text-sm">{t('labels.description')}</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('placeholders.enterDescription')}
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
        {tc('buttons.cancel')}
      </Button>
      <Button
        onClick={handleSave}
        disabled={!hasChanges || isSaving}
      >
        {isSaving ? t('buttons.creating') : t('buttons.createOrganisation')}
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* ── Edit Profile pop up */}
<Dialog open={isEditProfileDialogOpen} onOpenChange={setIsEditProfileDialogOpen}>
    <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
        <DialogTitle>{t('dialogs.editProfileTitle')}</DialogTitle>
        <DialogDescription>
            {t('dialogs.editProfileDescription')}
        </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
        <div className="grid gap-2">
            <label className="block text-sm">{t('labels.profileName')}</label>
            <Input
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder={t('placeholders.enterProfileName')}
            autoFocus
            />
        </div>
        <div className="grid gap-2">
            <label className="block text-sm">{t('labels.description')}</label>
            <Textarea
            value={profileDescription}
            onChange={(e) => setProfileDescription(e.target.value)}
            placeholder={t('placeholders.enterProfileDescription')}
            className="min-h-30"
            />
        </div>
        </div>
        <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleProfileCancel} disabled={isSaving}>
            {tc('buttons.cancel')}
        </Button>
        <Button onClick={handleProfileSave} disabled={!profileHasChanges || isSaving}>
            {isSaving ? tc('buttons.saving') : tc('buttons.saveChanges')}
        </Button>
        </div>
    </DialogContent>
</Dialog>

{/* ── Edit Task pop up */}
<Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
  <DialogContent className="sm:max-w-125">
    <DialogHeader>
      <DialogTitle>{t('dialogs.editTaskTitle')}</DialogTitle>
      <DialogDescription>
        {t('dialogs.editTaskDescription')}
      </DialogDescription>
    </DialogHeader>

    <div className="grid gap-6 py-4">
      <div className="grid gap-2">
        <label className="text-sm">{t('labels.taskName')}</label>
        <Input
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm">{t('labels.description')}</label>
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
        {tc('buttons.cancel')}
      </Button>

      <Button
        onClick={handleTaskSave}
        disabled={!taskHasChanges || isSaving}
      >
        {isSaving ? tc('buttons.saving') : tc('buttons.saveChanges')}
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* Add Existing Profile Dialog */}
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
        placeholder={t('placeholders.searchByNameOrEmail')}
        value={searchProfileText}
        onChange={(e) => setSearchProfileText(e.target.value)}
        className="mb-4"
      />

      <div className="max-h-75 overflow-y-auto border rounded">
        {availableProfiles.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t('empty.noAvailableProfiles')}</p>
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
                <div className="text-sm text-muted-foreground">{profile.user?.email || t('status.noEmail')}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {profile.organization
                    ? t('status.currentlyIn', { name: profile.organization.name })
                    : t('status.unassigned')}
                </div>
              </div>
            ))
        )}
      </div>
    </div>

    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={() => setIsAddProfileDialogOpen(false)}>
        {tc('buttons.cancel')}
      </Button>
      <Button
        disabled={!selectedProfileToAdd}
        onClick={handleAddProfile}
      >
        {t('buttons.addProfile')}
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* Add Existing Task Dialog */}
<Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
  <DialogContent className="sm:max-w-125">
    <DialogHeader>
      <DialogTitle>{t('dialogs.addTaskTitle')}</DialogTitle>
      <DialogDescription>
        {t('dialogs.addTaskDescription')}
      </DialogDescription>
    </DialogHeader>

    <div className="py-4">
      <Input
        placeholder={t('placeholders.searchByName')}
        value={searchTaskText}
        onChange={(e) => setSearchTaskText(e.target.value)}
        className="mb-4"
      />

      <div className="max-h-75 overflow-y-auto border rounded">
        {availableTasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t('empty.noAvailableTasks')}</p>
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
                    {task.description?.slice(0, 60) || t('status.noDescription')}...
                  </p>
                  <p className="text-xs">
                    {task.organization
                      ? t('status.currentlyIn', { name: task.organization.name })
                      : t('status.notAssigned')}
                  </p>
                </div>
              </div>
            ))
        )}
      </div>
    </div>

    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={() => setIsAddTaskDialogOpen(false)}>
        {tc('buttons.cancel')}
      </Button>
      <Button
        variant="default"
        disabled={!selectedTaskToAdd}
        onClick={handleAddTask}
      >
        {t('buttons.addTask')}
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
        {t('buttons.newOrganisation')}
    </Button>
    </div>

    {/* Filter Input */}
    <div className="flex justify-end gap-2">
        <Input
            placeholder={t('placeholders.filterByNameOrId')}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-sm"
        />
        <ExportMenu data={filteredOrganizations} columns={exportColumns} filename="organizations" />
    </div>

    {/* Organisations table */}
    <Table>
        <TableHeader>
            <TableRow>
                {/* Checkbox header with dropdown */}
                <TableHead className="w-10">
                    <div className="flex items-center gap-1">
                        <Checkbox
                            checked={selectedOrgIds.size === currentOrganizations.length && currentOrganizations.length > 0}
                            onCheckedChange={(checked) => {
                                if (checked) selectAllOrgs();
                                else deselectAllOrgs();
                            }}
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 hover:bg-muted rounded">
                                    <ChevronDown className="h-3 w-3" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={selectAllOrgs}>{tc('selection.selectAll')}</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={selectStarredOrgs}>{tc('selection.starred')}</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TableHead>
                <TableHead>{tc('table.name')}</TableHead>
                <TableHead className="w-28 text-right">{tc('table.profiles')}</TableHead>
                <TableHead className="w-28 text-right">{tc('table.tasks')}</TableHead>
                <TableHead className="w-10"></TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
{ currentOrganizations.length === 0 ? (
            <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {filterText ? t('empty.noOrganizationsMatch') : t('empty.noOrganizationsFound')}
                </TableCell>
            </TableRow>
) : (
    currentOrganizations.map((org) => {
        const isSelected = selectedOrgIds.has(org.id);
        const isStarred = starredOrgIds.has(org.id);

        return (
            <TableRow
                key={org.id}
                className={`
                    cursor-pointer transition-colors
                    ${selectedOrg?.id === org.id ? "bg-muted/60 hover:bg-muted/80" : "hover:bg-muted/50"}
                `}
                onClick={() => handleRowClick(org)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    toggleOrgStar(org.id);
                }}
            >
                {/* Checkbox cell */}
                <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOrgSelection(org.id)}
                    />
                </TableCell>
                <TableCell>{org.name}</TableCell>
                <TableCell className="w-28 text-right tabular-nums">{org.profiles?.length || 0}</TableCell>
                <TableCell className="w-28 text-right tabular-nums">{org.tasks?.length || 0}</TableCell>
                {/* Star cell */}
                <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                    <Star
                        className={`w-4 h-4 cursor-pointer ${isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                        onClick={() => toggleOrgStar(org.id)}
                    />
                </TableCell>
            </TableRow>
        );
    })
)
}
        </TableBody>
    </Table>

    {/* Pagination */}
{totalPages > 1 && (
    <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
            {t('pagination.showingOrganizations', { start: startIndex + 1, end: Math.min(endIndex, filteredOrganizations.length), total: filteredOrganizations.length })}
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

    {/* Bulk Action Bar */}
    {selectedOrgIds.size > 0 && (
        <div className="border rounded-lg bg-muted/30 p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
                {t('selection.selectedOf', { selected: selectedOrgIds.size, total: currentOrganizations.length })}
            </span>
            <div className="flex items-center gap-4">
                <span
                    title={t('buttons.deleteSelected')}
                    onClick={() => {
                        setBulkDeleteConfirmChecked(false);
                        setBulkDeleteConfirmText("");
                        setIsBulkDeleteDialogOpen(true);
                    }}
                    className="cursor-pointer"
                >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
                </span>
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
                <TabsList className="w-full bg-transparent border-b border-neutral-700 rounded-none p-0 h-auto grid grid-cols-8">
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="details"
                    >
                        {t('tabs.details')}
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="taxonomy"
                    >
                        {t('tabs.taxonomy')}
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="classification"
                    >
                        {t('tabs.classification')}
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="settings"
                    >
                        {t('tabs.settings')}
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="profiles"
                    >
                        {t('tabs.profiles', { count: selectedOrg.profiles?.length || 0 })}
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="tasks"
                    >
                        {t('tabs.tasks', { count: selectedOrg.tasks?.length || 0 })}
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="audit"
                    >
                        {t('tabs.auditTrail', { count: events.length })}
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="actions"
                    >
                        {t('tabs.actions')}
                    </TabsTrigger>
                </TabsList>
                <div
                    className="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out z-0"
                    style={{
                        width: '12.5%',
                        left: activeTab === 'taxonomy' ? '12.5%' :
                             activeTab === 'classification' ? '25%' :
                             activeTab === 'settings' ? '37.5%' :
                             activeTab === 'profiles' ? '50%' :
                             activeTab === 'tasks' ? '62.5%' :
                             activeTab === 'audit' ? '75%' :
                             activeTab === 'actions' ? '87.5%' : '0%'
                    }}
                />
            </div>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6 max-w-2xl mt-6">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm mb-2">{tc('table.id')}</label>
                        <Input
                            value={selectedOrg?.id?.toString() || ''}
                            disabled
                            className="opacity-60"
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-2">{t('labels.organisationName')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('placeholders.enterOrganizationName')}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-2">{t('labels.description')}</label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('placeholders.enterDescription')}
                            className="min-h-[120px] bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-2">{t('labels.targetIg')}</label>
                        <div className="flex gap-2">
                            <Badge
                                className={`px-4 py-2 cursor-pointer transition-all ${
                                    ig === 1
                                        ? 'bg-[#5D664D] ring-2 ring-white ring-offset-2 ring-offset-neutral-900'
                                        : 'bg-[#5D664D]/40 hover:bg-[#5D664D]/60'
                                }`}
                                onClick={() => setIg(1)}
                            >
                                IG1
                            </Badge>
                            <Badge
                                className={`px-4 py-2 cursor-pointer transition-all ${
                                    ig === 2
                                        ? 'bg-[#335c8c] ring-2 ring-white ring-offset-2 ring-offset-neutral-900'
                                        : 'bg-[#335c8c]/40 hover:bg-[#335c8c]/60'
                                }`}
                                onClick={() => setIg(2)}
                            >
                                IG2
                            </Badge>
                            <Badge
                                className={`px-4 py-2 cursor-pointer transition-all ${
                                    ig === 3
                                        ? 'bg-[#ad423f] ring-2 ring-white ring-offset-2 ring-offset-neutral-900'
                                        : 'bg-[#ad423f]/40 hover:bg-[#ad423f]/60'
                                }`}
                                onClick={() => setIg(3)}
                            >
                                IG3
                            </Badge>
                        </div>
                    </div>
                </div>
            </TabsContent>

            {/* Taxonomy Tab */}
            <TabsContent value="taxonomy" className="space-y-6 max-w-2xl mt-6">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm mb-2">{t('labels.organizationSize')}</label>
                        <Select value={size} onValueChange={setSize}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectSize')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="MICRO">{t('sizes.micro')}</SelectItem>
                                <SelectItem value="SMALL">{t('sizes.small')}</SelectItem>
                                <SelectItem value="MEDIUM">{t('sizes.medium')}</SelectItem>
                                <SelectItem value="LARGE">{t('sizes.large')}</SelectItem>
                                <SelectItem value="ENTERPRISE">{t('sizes.enterprise')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.organizationSizeHelp')}
                        </p>
                    </div>

                    {/* NACE Section */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.naceSection')}</label>
                        <Select value={naceSection || ""} onValueChange={(v) => setNaceSection(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectNaceSection')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none max-h-[300px]">
                                <SelectItem value="A">{t('nace.A')}</SelectItem>
                                <SelectItem value="B">{t('nace.B')}</SelectItem>
                                <SelectItem value="C">{t('nace.C')}</SelectItem>
                                <SelectItem value="D">{t('nace.D')}</SelectItem>
                                <SelectItem value="E">{t('nace.E')}</SelectItem>
                                <SelectItem value="F">{t('nace.F')}</SelectItem>
                                <SelectItem value="G">{t('nace.G')}</SelectItem>
                                <SelectItem value="H">{t('nace.H')}</SelectItem>
                                <SelectItem value="I">{t('nace.I')}</SelectItem>
                                <SelectItem value="J">{t('nace.J')}</SelectItem>
                                <SelectItem value="K">{t('nace.K')}</SelectItem>
                                <SelectItem value="L">{t('nace.L')}</SelectItem>
                                <SelectItem value="M">{t('nace.M')}</SelectItem>
                                <SelectItem value="N">{t('nace.N')}</SelectItem>
                                <SelectItem value="O">{t('nace.O')}</SelectItem>
                                <SelectItem value="P">{t('nace.P')}</SelectItem>
                                <SelectItem value="Q">{t('nace.Q')}</SelectItem>
                                <SelectItem value="R">{t('nace.R')}</SelectItem>
                                <SelectItem value="S">{t('nace.S')}</SelectItem>
                                <SelectItem value="OTHER">{t('nace.OTHER')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.naceSectionHelp')}
                        </p>
                    </div>

                    {/* Legal Form */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.legalForm')}</label>
                        <Select value={legalForm || ""} onValueChange={(v) => setLegalForm(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectLegalForm')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="SOLE_PROPRIETOR">{t('legalForms.soleProprietor')}</SelectItem>
                                <SelectItem value="PARTNERSHIP">{t('legalForms.partnership')}</SelectItem>
                                <SelectItem value="PRIVATE_LIMITED">{t('legalForms.privateLimited')}</SelectItem>
                                <SelectItem value="PUBLIC_LIMITED">{t('legalForms.publicLimited')}</SelectItem>
                                <SelectItem value="COOPERATIVE">{t('legalForms.cooperative')}</SelectItem>
                                <SelectItem value="FOUNDATION">{t('legalForms.foundation')}</SelectItem>
                                <SelectItem value="BRANCH_FOREIGN">{t('legalForms.branchForeign')}</SelectItem>
                                <SelectItem value="PUBLIC_BODY">{t('legalForms.publicBody')}</SelectItem>
                                <SelectItem value="OTHER">{t('legalForms.other')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Revenue Range */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.revenueRange')}</label>
                        <Select value={revenueRange || ""} onValueChange={(v) => setRevenueRange(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectRevenueRange')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="UNDER_2M">{t('revenueRanges.under2m')}</SelectItem>
                                <SelectItem value="FROM_2M_10M">{t('revenueRanges.from2mTo10m')}</SelectItem>
                                <SelectItem value="FROM_10M_50M">{t('revenueRanges.from10mTo50m')}</SelectItem>
                                <SelectItem value="FROM_50M_250M">{t('revenueRanges.from50mTo250m')}</SelectItem>
                                <SelectItem value="FROM_250M_1B">{t('revenueRanges.from250mTo1b')}</SelectItem>
                                <SelectItem value="OVER_1B">{t('revenueRanges.over1b')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Organization Maturity */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.maturity')}</label>
                        <Select value={maturity || ""} onValueChange={(v) => setMaturity(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectMaturity')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="STARTUP">{t('maturities.startup')}</SelectItem>
                                <SelectItem value="GROWTH">{t('maturities.growth')}</SelectItem>
                                <SelectItem value="ESTABLISHED">{t('maturities.established')}</SelectItem>
                                <SelectItem value="MATURE">{t('maturities.mature')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Ownership Type */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.ownershipType')}</label>
                        <Select value={ownershipType || ""} onValueChange={(v) => setOwnershipType(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectOwnershipType')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="PRIVATE">{t('ownershipTypes.private')}</SelectItem>
                                <SelectItem value="PUBLIC_LISTED">{t('ownershipTypes.publicListed')}</SelectItem>
                                <SelectItem value="STATE_OWNED">{t('ownershipTypes.stateOwned')}</SelectItem>
                                <SelectItem value="FAMILY_OWNED">{t('ownershipTypes.familyOwned')}</SelectItem>
                                <SelectItem value="PE_VC_BACKED">{t('ownershipTypes.peVcBacked')}</SelectItem>
                                <SelectItem value="COOPERATIVE">{t('ownershipTypes.cooperative')}</SelectItem>
                                <SelectItem value="NON_PROFIT">{t('ownershipTypes.nonProfit')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Geographic Scope */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.geographicScope')}</label>
                        <Select value={geographicScope || ""} onValueChange={(v) => setGeographicScope(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectGeographicScope')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="LOCAL">{t('geographicScopes.local')}</SelectItem>
                                <SelectItem value="REGIONAL">{t('geographicScopes.regional')}</SelectItem>
                                <SelectItem value="NATIONAL">{t('geographicScopes.national')}</SelectItem>
                                <SelectItem value="EUROPEAN">{t('geographicScopes.european')}</SelectItem>
                                <SelectItem value="GLOBAL">{t('geographicScopes.global')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Business Orientation */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.businessOrientation')}</label>
                        <Select value={businessOrientation || ""} onValueChange={(v) => setBusinessOrientation(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectBusinessOrientation')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="B2B">{t('businessOrientations.b2b')}</SelectItem>
                                <SelectItem value="B2C">{t('businessOrientations.b2c')}</SelectItem>
                                <SelectItem value="B2G">{t('businessOrientations.b2g')}</SelectItem>
                                <SelectItem value="MIXED">{t('businessOrientations.mixed')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Digital Maturity */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.digitalMaturity')}</label>
                        <Select value={digitalMaturity || ""} onValueChange={(v) => setDigitalMaturity(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectDigitalMaturity')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="TRADITIONAL">{t('digitalMaturities.traditional')}</SelectItem>
                                <SelectItem value="DEVELOPING">{t('digitalMaturities.developing')}</SelectItem>
                                <SelectItem value="MATURE">{t('digitalMaturities.mature')}</SelectItem>
                                <SelectItem value="DIGITAL_NATIVE">{t('digitalMaturities.digitalNative')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ESG Status */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.esgStatus')}</label>
                        <Select value={esgStatus || ""} onValueChange={(v) => setEsgStatus(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectEsgStatus')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="REPORTING">{t('esgStatuses.reporting')}</SelectItem>
                                <SelectItem value="NOT_REQUIRED">{t('esgStatuses.notRequired')}</SelectItem>
                                <SelectItem value="EXEMPT">{t('esgStatuses.exempt')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Supply Chain Role */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.supplyChainRole')}</label>
                        <Select value={supplyChainRole || ""} onValueChange={(v) => setSupplyChainRole(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectSupplyChainRole')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="MANUFACTURER">{t('supplyChainRoles.manufacturer')}</SelectItem>
                                <SelectItem value="DISTRIBUTOR">{t('supplyChainRoles.distributor')}</SelectItem>
                                <SelectItem value="RETAILER">{t('supplyChainRoles.retailer')}</SelectItem>
                                <SelectItem value="SERVICE_PROVIDER">{t('supplyChainRoles.serviceProvider')}</SelectItem>
                                <SelectItem value="PLATFORM">{t('supplyChainRoles.platform')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Risk Profile */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.riskProfile')}</label>
                        <Select value={riskProfile || ""} onValueChange={(v) => setRiskProfile(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectRiskProfile')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="LOW">{t('riskProfiles.low')}</SelectItem>
                                <SelectItem value="MEDIUM">{t('riskProfiles.medium')}</SelectItem>
                                <SelectItem value="HIGH">{t('riskProfiles.high')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* EU Taxonomy Aligned */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.euTaxonomyAligned')}</label>
                        <Select
                            value={euTaxonomyAligned === null ? "" : euTaxonomyAligned ? "true" : "false"}
                            onValueChange={(v) => setEuTaxonomyAligned(v === "" ? null : v === "true")}
                        >
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectEuTaxonomyAligned')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="true">{t('euTaxonomy.yes')}</SelectItem>
                                <SelectItem value="false">{t('euTaxonomy.no')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.euTaxonomyHelp')}
                        </p>
                    </div>
                </div>
            </TabsContent>

            {/* Classification Tab - IT & Security */}
            <TabsContent value="classification" className="space-y-6 max-w-2xl mt-6">
                <div className="space-y-6">

                    {/* IT Security Staff */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.itSecurityStaff')}</label>
                        <Select value={itSecurityStaff || ""} onValueChange={(v) => setItSecurityStaff(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectItSecurityStaff')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="NO_DEDICATED_IT">{t('itSecurityStaff.noDedicatedIt')}</SelectItem>
                                <SelectItem value="IT_NO_SECURITY">{t('itSecurityStaff.itNoSecurity')}</SelectItem>
                                <SelectItem value="DEDICATED_SECURITY">{t('itSecurityStaff.dedicatedSecurity')}</SelectItem>
                                <SelectItem value="SPECIALIZED_SECURITY">{t('itSecurityStaff.specializedSecurity')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.itSecurityStaffHelp')}
                        </p>
                    </div>

                    {/* Security Maturity */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.securityMaturity')}</label>
                        <Select value={securityMaturity || ""} onValueChange={(v) => setSecurityMaturity(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectSecurityMaturity')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="NO_PROGRAM">{t('securityMaturity.noProgram')}</SelectItem>
                                <SelectItem value="BASIC">{t('securityMaturity.basic')}</SelectItem>
                                <SelectItem value="DEFINED">{t('securityMaturity.defined')}</SelectItem>
                                <SelectItem value="MANAGED">{t('securityMaturity.managed')}</SelectItem>
                                <SelectItem value="OPTIMIZING">{t('securityMaturity.optimizing')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.securityMaturityHelp')}
                        </p>
                    </div>

                    {/* Data Sensitivity (Multi-select) */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.dataSensitivity')}</label>
                        <div className="space-y-2 bg-neutral-800 border border-neutral-700 p-3">
                            {[
                                { value: 'BASIC_BUSINESS', label: t('dataSensitivity.basicBusiness') },
                                { value: 'CUSTOMER_PII', label: t('dataSensitivity.customerPii') },
                                { value: 'SPECIAL_CATEGORY', label: t('dataSensitivity.specialCategory') },
                                { value: 'PAYMENT_CARD', label: t('dataSensitivity.paymentCard') },
                                { value: 'INTELLECTUAL_PROPERTY', label: t('dataSensitivity.intellectualProperty') },
                                { value: 'CLASSIFIED_GOVERNMENT', label: t('dataSensitivity.classifiedGovernment') },
                                { value: 'CRITICAL_INFRASTRUCTURE', label: t('dataSensitivity.criticalInfrastructure') },
                            ].map((item) => (
                                <div key={item.value} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`dataSensitivity-${item.value}`}
                                        checked={dataSensitivity.includes(item.value)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setDataSensitivity([...dataSensitivity, item.value]);
                                            } else {
                                                setDataSensitivity(dataSensitivity.filter(v => v !== item.value));
                                            }
                                        }}
                                    />
                                    <label htmlFor={`dataSensitivity-${item.value}`} className="text-sm cursor-pointer">
                                        {item.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.dataSensitivityHelp')}
                        </p>
                    </div>

                    {/* Regulatory Obligations (Multi-select) */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.regulatoryObligations')}</label>
                        <div className="space-y-2 bg-neutral-800 border border-neutral-700 p-3">
                            {[
                                { value: 'GDPR', label: t('regulatoryObligations.gdpr') },
                                { value: 'NIS2', label: t('regulatoryObligations.nis2') },
                                { value: 'DORA', label: t('regulatoryObligations.dora') },
                                { value: 'PCI_DSS', label: t('regulatoryObligations.pciDss') },
                                { value: 'HIPAA', label: t('regulatoryObligations.hipaa') },
                                { value: 'SOX', label: t('regulatoryObligations.sox') },
                                { value: 'ISO_27001', label: t('regulatoryObligations.iso27001') },
                                { value: 'CRITICAL_INFRASTRUCTURE', label: t('regulatoryObligations.criticalInfrastructure') },
                                { value: 'SECTOR_SPECIFIC', label: t('regulatoryObligations.sectorSpecific') },
                                { value: 'NONE_IDENTIFIED', label: t('regulatoryObligations.noneIdentified') },
                            ].map((item) => (
                                <div key={item.value} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`regulatoryObligations-${item.value}`}
                                        checked={regulatoryObligations.includes(item.value)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setRegulatoryObligations([...regulatoryObligations, item.value]);
                                            } else {
                                                setRegulatoryObligations(regulatoryObligations.filter(v => v !== item.value));
                                            }
                                        }}
                                    />
                                    <label htmlFor={`regulatoryObligations-${item.value}`} className="text-sm cursor-pointer">
                                        {item.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.regulatoryObligationsHelp')}
                        </p>
                    </div>

                    {/* IT Endpoint Range */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.itEndpointRange')}</label>
                        <Select value={itEndpointRange || ""} onValueChange={(v) => setItEndpointRange(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectItEndpointRange')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="UNDER_10">{t('itEndpointRange.under10')}</SelectItem>
                                <SelectItem value="FROM_10_50">{t('itEndpointRange.from10to50')}</SelectItem>
                                <SelectItem value="FROM_50_250">{t('itEndpointRange.from50to250')}</SelectItem>
                                <SelectItem value="FROM_250_1000">{t('itEndpointRange.from250to1000')}</SelectItem>
                                <SelectItem value="FROM_1000_5000">{t('itEndpointRange.from1000to5000')}</SelectItem>
                                <SelectItem value="OVER_5000">{t('itEndpointRange.over5000')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.itEndpointRangeHelp')}
                        </p>
                    </div>

                    {/* Infrastructure Types (Multi-select) */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.infrastructureTypes')}</label>
                        <div className="space-y-2 bg-neutral-800 border border-neutral-700 p-3">
                            {[
                                { value: 'ON_PREMISES', label: t('infrastructureTypes.onPremises') },
                                { value: 'PRIVATE_CLOUD', label: t('infrastructureTypes.privateCloud') },
                                { value: 'PUBLIC_CLOUD', label: t('infrastructureTypes.publicCloud') },
                                { value: 'HYBRID', label: t('infrastructureTypes.hybrid') },
                                { value: 'SAAS_ONLY', label: t('infrastructureTypes.saasOnly') },
                                { value: 'OT_ICS', label: t('infrastructureTypes.otIcs') },
                            ].map((item) => (
                                <div key={item.value} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`infrastructureTypes-${item.value}`}
                                        checked={infrastructureTypes.includes(item.value)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setInfrastructureTypes([...infrastructureTypes, item.value]);
                                            } else {
                                                setInfrastructureTypes(infrastructureTypes.filter(v => v !== item.value));
                                            }
                                        }}
                                    />
                                    <label htmlFor={`infrastructureTypes-${item.value}`} className="text-sm cursor-pointer">
                                        {item.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.infrastructureTypesHelp')}
                        </p>
                    </div>

                    {/* Software Development */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.softwareDevelopment')}</label>
                        <Select value={softwareDevelopment || ""} onValueChange={(v) => setSoftwareDevelopment(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectSoftwareDevelopment')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="NONE">{t('softwareDevelopment.none')}</SelectItem>
                                <SelectItem value="INTERNAL_TOOLS">{t('softwareDevelopment.internalTools')}</SelectItem>
                                <SelectItem value="CUSTOMER_FACING">{t('softwareDevelopment.customerFacing')}</SelectItem>
                                <SelectItem value="COMMERCIAL_PRODUCTS">{t('softwareDevelopment.commercialProducts')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.softwareDevelopmentHelp')}
                        </p>
                    </div>

                    {/* Public Facing Services */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.publicFacingServices')}</label>
                        <Select value={publicFacingServices || ""} onValueChange={(v) => setPublicFacingServices(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectPublicFacingServices')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="MINIMAL">{t('publicFacingServices.minimal')}</SelectItem>
                                <SelectItem value="STANDARD_WEB">{t('publicFacingServices.standardWeb')}</SelectItem>
                                <SelectItem value="ECOMMERCE">{t('publicFacingServices.ecommerce')}</SelectItem>
                                <SelectItem value="CRITICAL_SERVICES">{t('publicFacingServices.criticalServices')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.publicFacingServicesHelp')}
                        </p>
                    </div>

                    {/* Targeted Attack Likelihood */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.targetedAttackLikelihood')}</label>
                        <Select value={targetedAttackLikelihood || ""} onValueChange={(v) => setTargetedAttackLikelihood(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectTargetedAttackLikelihood')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="LOW">{t('targetedAttackLikelihood.low')}</SelectItem>
                                <SelectItem value="MEDIUM">{t('targetedAttackLikelihood.medium')}</SelectItem>
                                <SelectItem value="HIGH">{t('targetedAttackLikelihood.high')}</SelectItem>
                                <SelectItem value="CRITICAL">{t('targetedAttackLikelihood.critical')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.targetedAttackLikelihoodHelp')}
                        </p>
                    </div>

                    {/* Downtime Tolerance */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.downtimeTolerance')}</label>
                        <Select value={downtimeTolerance || ""} onValueChange={(v) => setDowntimeTolerance(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectDowntimeTolerance')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="HIGH_TOLERANCE">{t('downtimeTolerance.highTolerance')}</SelectItem>
                                <SelectItem value="MODERATE">{t('downtimeTolerance.moderate')}</SelectItem>
                                <SelectItem value="LOW_TOLERANCE">{t('downtimeTolerance.lowTolerance')}</SelectItem>
                                <SelectItem value="ZERO_TOLERANCE">{t('downtimeTolerance.zeroTolerance')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.downtimeToleranceHelp')}
                        </p>
                    </div>

                    {/* Supply Chain Position */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.supplyChainPosition')}</label>
                        <Select value={supplyChainPosition || ""} onValueChange={(v) => setSupplyChainPosition(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectSupplyChainPosition')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="END_CONSUMER">{t('supplyChainPosition.endConsumer')}</SelectItem>
                                <SelectItem value="DOWNSTREAM">{t('supplyChainPosition.downstream')}</SelectItem>
                                <SelectItem value="MIDSTREAM">{t('supplyChainPosition.midstream')}</SelectItem>
                                <SelectItem value="UPSTREAM">{t('supplyChainPosition.upstream')}</SelectItem>
                                <SelectItem value="CRITICAL_SUPPLIER">{t('supplyChainPosition.criticalSupplier')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.supplyChainPositionHelp')}
                        </p>
                    </div>

                    {/* Security Budget Range */}
                    <div>
                        <label className="block text-sm mb-2">{t('labels.securityBudgetRange')}</label>
                        <Select value={securityBudgetRange || ""} onValueChange={(v) => setSecurityBudgetRange(v || null)}>
                            <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectValue placeholder={t('placeholders.selectSecurityBudgetRange')} />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-800 border border-neutral-700 rounded-none">
                                <SelectItem value="MINIMAL">{t('securityBudgetRange.minimal')}</SelectItem>
                                <SelectItem value="LIMITED">{t('securityBudgetRange.limited')}</SelectItem>
                                <SelectItem value="MODERATE">{t('securityBudgetRange.moderate')}</SelectItem>
                                <SelectItem value="SUBSTANTIAL">{t('securityBudgetRange.substantial')}</SelectItem>
                                <SelectItem value="ENTERPRISE">{t('securityBudgetRange.enterprise')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            {t('helpers.securityBudgetRangeHelp')}
                        </p>
                    </div>
                </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6 max-w-2xl mt-6">
                <div className="space-y-6">
                    <div>
                    <label className="block text-sm mb-2">{t('labels.uploadDirectory')}</label>
                    <Input
                        value={uploadDirectory}
                        onChange={(e) => setUploadDirectory(e.target.value)}
                        placeholder={t('placeholders.enterUploadDirectory')}
                        className="bg-neutral-800 border border-neutral-700 rounded-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('helpers.uploadDirectoryHelp')}
                    </p>
                    </div>

                    <div>
                    <label className="block text-sm mb-2">{t('labels.downloadDirectory')}</label>
                    <Input
                        value={downloadDirectory}
                        onChange={(e) => setDownloadDirectory(e.target.value)}
                        placeholder={t('placeholders.enterDownloadDirectory')}
                        className="bg-neutral-800 border border-neutral-700 rounded-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('helpers.downloadDirectoryHelp')}
                    </p>
                    </div>

                    <div>
                    <label className="block text-sm mb-2">{t('labels.artifactDirectory')}</label>
                    <Input
                        value={artifactDirectory}
                        onChange={(e) => setArtifactDirectory(e.target.value)}
                        placeholder={t('placeholders.enterArtifactDirectory')}
                        className="bg-neutral-800 border border-neutral-700 rounded-none"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('helpers.artifactDirectoryHelp')}
                    </p>
                    </div>

                    {!selectedOrg.settings && !settingsHasChanges && (
                    <div className="text-sm text-muted-foreground italic">
                        {t('empty.noSettings')}
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
                        {selectedOrg.profiles?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    {t('empty.noProfilesFound')}
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
                                {t('pagination.showingProfiles', { start: startIdx + 1, end: endIdx, total: totalProfiles })}
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
                        {t('buttons.addTask')}
                    </Button>
                </div>
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
                        {selectedOrg.tasks?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground">
                                    {t('empty.noTasksFound')}
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
                                {t('pagination.showingTasks', { start: startIdx + 1, end: endIdx, total: totalTasks })}
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
                                    {t('pagination.showingEvents', { start: startIdx + 1, end: endIdx, total: events.length })}
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
                        <h3 className="text-lg font-semibold mb-4">{t('sections.organizationActions')}</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            {t('sections.organizationActionsDescription')}
                        </p>
                    </div>

                    <div className="border border-destructive/30 rounded-lg p-4 bg-destructive/5">
                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <h4 className="font-medium text-destructive mb-1">{t('sections.deleteOrganizationTitle')}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {t('sections.deleteOrganizationDescription')}
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={() => setOrgToDelete(selectedOrg.id)}
                                className="shrink-0"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('buttons.deleteOrganization')}
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
        setIg(selectedOrg.ig || 1);
        setSize(selectedOrg.size || "MICRO");
        setNaceSection(selectedOrg.naceSection || null);
        setLegalForm(selectedOrg.legalForm || null);
        setRevenueRange(selectedOrg.revenueRange || null);
        setMaturity(selectedOrg.maturity || null);
        setOwnershipType(selectedOrg.ownershipType || null);
        setGeographicScope(selectedOrg.geographicScope || null);
        setBusinessOrientation(selectedOrg.businessOrientation || null);
        setDigitalMaturity(selectedOrg.digitalMaturity || null);
        setEsgStatus(selectedOrg.esgStatus || null);
        setSupplyChainRole(selectedOrg.supplyChainRole || null);
        setRiskProfile(selectedOrg.riskProfile || null);
        setEuTaxonomyAligned(selectedOrg.euTaxonomyAligned ?? null);
        // IT & Security fields
        setItSecurityStaff(selectedOrg.itSecurityStaff || null);
        setSecurityMaturity(selectedOrg.securityMaturity || null);
        setDataSensitivity(selectedOrg.dataSensitivity || []);
        setRegulatoryObligations(selectedOrg.regulatoryObligations || []);
        setItEndpointRange(selectedOrg.itEndpointRange || null);
        setInfrastructureTypes(selectedOrg.infrastructureTypes || []);
        setSoftwareDevelopment(selectedOrg.softwareDevelopment || null);
        setPublicFacingServices(selectedOrg.publicFacingServices || null);
        setTargetedAttackLikelihood(selectedOrg.targetedAttackLikelihood || null);
        setDowntimeTolerance(selectedOrg.downtimeTolerance || null);
        setSupplyChainPosition(selectedOrg.supplyChainPosition || null);
        setSecurityBudgetRange(selectedOrg.securityBudgetRange || null);
        setUploadDirectory(selectedOrg.settings?.uploadDirectory || "");
        setDownloadDirectory(selectedOrg.settings?.downloadDirectory || "");
        setArtifactDirectory(selectedOrg.settings?.artifactDirectory || "");
        setHasChanges(false);
        setSettingsHasChanges(false);
      }}
      disabled={isSaving}
      className="rounded-none"
    >
      {tc('buttons.cancel')}
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
      {isSaving ? tc('buttons.saving') : tc('buttons.saveChanges')}
    </Button>
  </div>
)}
</div>
</>

       );
}