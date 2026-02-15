'use client';

import { useRef, useEffect, useState }    from 'react';
import { zxcvbn }                         from '@/lib/zxcvbn';
import { useUser }                        from '@/context/UserContext';
import { useOrganization }                from '@/context/OrganizationContext';
import { useRouter }                      from 'next/navigation';
import { Trash2 }                         from 'lucide-react';
import { Button }                         from "@/components/ui/button";

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

export default function ProfilePage() 
{
    const user = useUser();
    const { activeOrganization } = useOrganization();
    const router = useRouter();

    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedProfile, setSelectedProfile] = useState<any | null>(null);

    // Details tab fields ────────────────────────────────────────
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // Login tab fields ────────────────────────────────────────
    const [loginName, setLoginName] = useState("");
    const [nickname, setNickname] = useState("");
    const [workFunction, setWorkFunction] = useState("DEVELOPER");
    const [role, setRole] = useState("USER");

    // Pagination state ────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const [hasChanges, setHasChanges] = useState(false);

    const [isSaving, setIsSaving] = useState(false);

    const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);

    const [profileToDelete, setProfileToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [filterText, setFilterText] = useState("");
    const [activeTab, setActiveTab] = useState("details");

    // Detele Task ────────────────────────────────────────
    const [taskToRemove, setTaskToRemove] = useState<number | null>(null);

    // Email ────────────────────────────────────────
    const [email, setEmail]                       = useState("");
    const [emailValid, setEmailValid]             = useState<number | null>(null);
    const [isCheckingEmail, setIsCheckingEmail]   = useState(false);
    const emailCheckTimeout                       = useRef<NodeJS.Timeout | null>(null);

    // Password ────────────────────────────────────────
    const [password, setPassword]                 = useState("");
    const [passwordTouched, setPasswordTouched]   = useState(false);
    const [passwordStrength, setPasswordStrength] = useState<number | null>(null);
    const [passwordFeedback, setPasswordFeedback] = useState<string>("");

    // Edit Task states ────────────────────────────────────────
    const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);
    const [taskName, setTaskName] = useState("");
    const [taskDescription, setTaskDescription] = useState("");
    const [taskHasChanges, setTaskHasChanges] = useState(false);


    // Events / Audit Trail ────────────────────────────────────────
    const [events, setEvents] = useState<any[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [eventsCurrentPage, setEventsCurrentPage] = useState(1);
    const eventsPerPage = 8;

    const [initialForm, setInitialForm] = useState<null | {
        name        : string;
        description : string;
        email       : string;
        loginName   : string;
        nickname    : string;
        role        : string;
    }>(null);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH PROFILES
    const fetchProfiles = async () => 
    {
        if (!activeOrganization) return;

        try 
        {
            const res = await fetch(`/api/profile?organizationId=${activeOrganization.id}`);
            const data = await res.json();
            if (!data.success) 
            {
                console.error('Failed tNewo fetch profiles:', data.error);
                return;
            }
            setProfiles(data.data);
        } 
        catch (error) 
        {
            console.error('Failed to fetch profiles:', error);
        } 
        finally 
        {
            setLoading(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH EVENTS FOR SELECTED PROFILE
    const fetchEvents = async (profileId: number) =>
    {
        setLoadingEvents(true);
        try
        {
            const res = await fetch(`/api/event?profileId=${profileId}`);
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
    const createEvent = async (message: string, importance: 'LOW' | 'MIDDLE' | 'HIGH', profileId: number) =>
    {
        try
        {
            await fetch('/api/event', {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify({ message, importance, profileId }),
            });

            // Refresh the audit trail if viewing this profile
            if (selectedProfile?.id === profileId)
            {
                fetchEvents(profileId);
            }
        }
        catch (error)
        {
            console.error('Failed to create event:', error);
        }
    };

    // ── Change organization + Initial Load──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    useEffect(() => 
    {
        if (!user) return;
        if (!activeOrganization) return; 

        fetchProfiles();

        // Listen for refresh event
        const handleRefresh = () => 
        {
            fetchProfiles();
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
    // DETETE / UNASSIGN TASK FROM PROFILE
    const handleRemoveTask = async () => 
    {
        if (!taskToRemove || !selectedProfile) return;

        setIsDeleting(true);

        try
        {
            const res = await fetch('/api/task-profile', 
            {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(
                  {
                      taskId    : taskToRemove,
                      profileId : selectedProfile.id,
                  }),
            });

            if (!res.ok)
            {
                const err = await res.json();
                throw new Error(err.error || 'Failed to remove task from profile');
            }

            const data = await res.json();
            if (!data.success)
            {
                throw new Error(data.message || 'Remove Task failed');
            }

            // Optimistic update (update before waiting for the results of database query): remove the task from selectedProfile.taskProfiles
            setProfiles((prevProfiles) =>
              prevProfiles.map((p) =>
              {
                  if (p.id !== selectedProfile.id) return p;
                  return {
                    ...p,
                    taskProfiles: p.taskProfiles.filter((tp: any) => tp.task.id !== taskToRemove),
                  };
              })
            );

            // Update selectedProfile
            setSelectedProfile((prev) => 
            {
                if (!prev) return prev;
                return {
                  ...prev,
                  taskProfiles: prev.taskProfiles.filter((tp: any) => tp.task.id !== taskToRemove),
                };
            });

            toast.success("Task removed from profile");
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
    // EMAIL CHANGE - check if it is valid and available.
    const handleEmailChange = (newEmail: string) => 
    {
        setEmail(newEmail);

        // Cancel any previous pending validation
        if (emailCheckTimeout.current !== null) 
        {
            clearTimeout(emailCheckTimeout.current);
            emailCheckTimeout.current = null;
        }

        // Set new timeout to check email after 500ms of no typing
        const timeout = setTimeout(() => 
        {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) 
            {
                setEmailValid(1);
                emailCheckTimeout.current = null;
                return;
            }

            checkEmailAvailability(newEmail);
        }, 500);
    };

    // Reset Email check timer on mount/unmount.
    useEffect(() => 
    {
        return () => 
        {
            if (emailCheckTimeout.current) 
            {
                clearTimeout(emailCheckTimeout.current);
            }
        };
    }, []);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Check email is available
    const checkEmailAvailability = async (emailToCheck: string) =>
    {
        if (!emailToCheck.trim())
        {
            setEmailValid(null);
            return;
        }

        // Don't check if editing existing profile and email hasn't changed
        if (selectedProfile && emailToCheck === selectedProfile.user?.email) 
        {
            setEmailValid(0);
            setIsCheckingEmail(false);
            return;
        }

        setIsCheckingEmail(true);

        try 
        {
            const res = await fetch(`/api/user/check-email?email=${encodeURIComponent(emailToCheck)}`);
            const data = await res.json();

            if (data.success) 
            {
                setEmailValid(data.available ? 0 : 2);
            }
        } 
        catch (error) 
        {
            console.error('Error checking email:', error);
        } 
        finally 
        {
            setIsCheckingEmail(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // PASSWORD CHANGE - check if it is strong.
    const checkPasswordStrength = (pwd: string): { score: number; message: string } => 
    {
        if (!pwd || pwd.length === 0) 
        {
            return { score: null, message: "" };
        }

        if (pwd.length < 8) 
        {
            return { score: 1, message: "Password must be at least 8 characters" };
        }

        const hasUpper = /[A-Z]/.test(pwd);
        const hasLower = /[a-z]/.test(pwd);
        const hasNumber = /[0-9]/.test(pwd);
        const hasSpecial = /[^A-Za-z0-9]/.test(pwd);

        let strength = 0;
        if (pwd.length >= 10) strength++;
        if (pwd.length >= 12) strength++;
        if (hasUpper) strength++;
        if (hasLower) strength++;
        if (hasNumber) strength++;
        if (hasSpecial) strength++;

        if (strength >= 5) 
        {
            return { score: 0, message: "Strong password" };
        }

        if (strength >= 3) 
        {
            return { score: 2, message: "Medium – consider adding numbers or symbols" };
        }

        return { score: 1, message: "Weak – use longer password with variety" };
    };

    const passwordTimeout = useRef<NodeJS.Timeout | null>(null)

    const handlePasswordChange = (value: string) =>
    {
        setPassword(value)

        if (passwordTimeout.current) clearTimeout(passwordTimeout.current)

        passwordTimeout.current = setTimeout(() => {
          if (!value) {
            setPasswordStrength(null)
            setPasswordFeedback('')
            return
          }

          const result = zxcvbn(value, [
            // optional: pass user-specific terms to penalize
            name.trim() || "",
            email.split("@")[0] || "",
            loginName.trim() || "",
            nickname.trim() || "",
            ])

          setPasswordStrength(result.score) // 0–4

          // Build user-friendly message
          let message = "";
          if (result.feedback.warning) 
          {
              message = result.feedback.warning;
          } 
          else if (result.feedback.suggestions.length > 0) 
          {
              message = result.feedback.suggestions[0];
          } 
          else if (result.score >= 3) 
          {
              message = "Looks good!";
          }

          setPasswordFeedback(message);
          // setPasswordFeedback(result.feedback.warning || result.feedback.suggestions?.[0] || '')
        }, 400)
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // EDIT TASK
    // Open Edit Task dialog ────────────────────────────────────────
    const handleTaskRowClick = (task: any) => 
    {
        setSelectedTask(task);
        setTaskName(task.name || "");
        setTaskDescription(task.description || "");
        setTaskHasChanges(false);
        setIsEditTaskDialogOpen(true);
    };

    // Detect changes in task form ────────────────────────────────────────
    useEffect(() => 
    {
        if (!selectedTask) return;

        const nameChanged = taskName.trim() !== (selectedTask.name ?? "").trim();
        const descChanged = taskDescription.trim() !== (selectedTask.description ?? "").trim();

        setTaskHasChanges(nameChanged || descChanged);
    }, [taskName, taskDescription, selectedTask]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ── Save edited task ───────────────────────────────────────────────────────
    const handleTaskSave = async () => 
    {
        if (!selectedTask || !taskHasChanges) return;

        setIsSaving(true);
        try 
        {
            const res = await fetch(`/api/task/${selectedTask.id}`, 
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(
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

          // Optimistic update in profiles list
          setProfiles((prevProfiles) =>
            prevProfiles.map((p) => {
              if (p.id !== selectedProfile?.id) return p;
              return {
                ...p,
                taskProfiles: p.taskProfiles.map((tp: any) =>
                  tp.task.id === updatedTask.id ? { ...tp, task: updatedTask } : tp
                ),
              };
            })
          );

          // Update selected profile view
          setSelectedProfile((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              taskProfiles: prev.taskProfiles.map((tp: any) =>
                tp.task.id === updatedTask.id ? { ...tp, task: updatedTask } : tp
              ),
            };
          });

          toast.success("Task updated successfully");
          setIsEditTaskDialogOpen(false);
          setSelectedTask(null);
        } 
        catch (err: any) 
        {
            toast.error(err.message || "Could not update task");
        } 
        finally 
        {
            setIsSaving(false);
        }
    };

    // ── Cancel task edit ───────────────────────────────────────────────────────
    const handleTaskCancel = () => 
    {
        setIsEditTaskDialogOpen(false);
        setSelectedTask(null);
        setTaskName("");
        setTaskDescription("");
        setTaskHasChanges(false);
    };

    // ── Selected Profile changed ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    useEffect(() => 
    {
        if (selectedProfile) 
        {
            // Details tab
            setName(selectedProfile.name || "");
            setDescription(selectedProfile.description || "");
            
            // Login tab
            setEmail(selectedProfile.user?.email || "");
            setEmailValid(0); // Existing profile email is already valid
            setPassword(""); // Never pre-fill password
            setLoginName(selectedProfile.user?.name || "");
            setNickname(selectedProfile.user?.nickname || "");
            setWorkFunction(selectedProfile.user?.workFunction || "DEVELOPER");
            setRole(selectedProfile.user?.role || "USER");

            // Fetch events for this profile
            fetchEvents(selectedProfile.id);
        }
        else
        {
            setName("");
            setDescription("");
            setEmail("");
            setPassword("");
            setLoginName("");
            setNickname("");
            setWorkFunction("DEVELOPER");
            setRole("USER");
            setEvents([]);
        }
    }, [selectedProfile]);

    // Selected Profile changed.
    useEffect(() => 
    {
        setPassword("");
        setPasswordTouched(false);
    }, [selectedProfile?.id]);

    useEffect(() => 
    {
        if (!selectedProfile)
        {
            setInitialForm(null);
            setHasChanges(false);
            return;
        }

        setInitialForm(
        {
            name        : selectedProfile.name || "",
            description : selectedProfile.description || "",
            email       : selectedProfile.user?.email || "",
            loginName   : selectedProfile.user?.name || "",
            nickname    : selectedProfile.user?.nickname || "",
            role        : selectedProfile.user?.role || "USER",
        });

        setHasChanges(false);
        setPassword(""); // always reset
    }, [selectedProfile]);

    useEffect(() => 
    {
        if (!initialForm) return;

        const changed =
            name.trim()        !== initialForm.name.trim()        ||
            description.trim() !== initialForm.description.trim() ||
            email.trim()       !== initialForm.email.trim()       ||
            loginName.trim()   !== initialForm.loginName.trim()   ||
            nickname.trim()    !== initialForm.nickname.trim()    ||
            role               !== initialForm.role               ||
            passwordTouched;

        setHasChanges(changed);
    }, [
    name,
    description,
    email,
    loginName,
    nickname,
    role,
    password,
    initialForm,
    ]);

    useEffect(() => 
    {
        setCurrentPage(1);
    }, [filterText]);

  const handleRowClick = (profile: any) => 
  {
      setSelectedProfile(profile);
      document.getElementById('edit-form')?.scrollIntoView({ behavior: 'smooth' });
  };

    const handleNewProfile = () => 
    {
        setSelectedProfile(null);
        setName("");
        setDescription("");
        setEmail("");
        setPassword("");
        setLoginName("");
        setNickname("");
        setWorkFunction("DEVELOPER");
        setRole("USER");
        setHasChanges(false);
        setEmailValid(null);
        setIsNewDialogOpen(true);
    };

    const handleCancel = () => 
    {
        if (!selectedProfile) 
        {
            setName("");
            setDescription("");
            setEmail("");
            setPassword("");
            setLoginName("");
            setNickname("");
            setWorkFunction("DEVELOPER");
            setRole("USER");
        } 
        else 
        {
            setName(selectedProfile.name || "");
            setDescription(selectedProfile.description || "");
            setEmail(selectedProfile.user?.email || "");
            setPassword("");
            setLoginName(selectedProfile.user?.name || "");
            setNickname(selectedProfile.user?.nickname || "");
            setWorkFunction(selectedProfile.user?.workFunction || "DEVELOPER");
            setRole(selectedProfile.user?.role || "USER");
        }

        setHasChanges(false);
        setEmailValid(null);
        setIsNewDialogOpen(false);
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // NEW/SAVE PROFILE
    const handleSave = async () => 
    {
        if (!name.trim() || !email.trim()) 
        {
            toast.error("Profile name and email are required");
            return;
        }

        if (!activeOrganization) 
        {
            toast.error("No organization selected");
            return;
        }

        // Validate Email.
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && !emailRegex.test(email)) 
        {
            toast.error("Invalid email");
            return;
        }

        // For new profiles: require strong password
        if (!selectedProfile) 
        {
            const result = zxcvbn(password, [name, email, loginName, nickname]);
            if (result.score < 3)
            {
                toast.error("Password is too weak. Please make it stronger.")
                return
            }
        }

        // For new profiles, require all fields
        if (!selectedProfile) 
        {
            if (!password.trim() || !loginName.trim() || !nickname.trim()) 
            {
                toast.error("All fields are required for new profiles");
                return;
            }
        }

        setIsSaving(true);

        try 
        {
            const isNew = !selectedProfile;
            const url = isNew ? '/api/profile' : `/api/profile/${selectedProfile.id}`;
            const method = isNew ? 'POST' : 'PATCH';

            const body: any = 
            {
                // Profile fields
                name        : name.trim(),
                description : description.trim() || undefined,
                
                // User fields
                email       : email.trim(),
                loginName   : loginName.trim(),
                nickname    : nickname.trim(),
                workFunction,
                role,
            };

            if (isNew) 
            {
                body.organizationId = parseInt(activeOrganization.id);
                body.password = password; // Required for new profiles
            } 
            else if (password.trim()) 
            {
                body.password = password; // Optional for updates
            }

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
                throw new Error(data.error || 'Save failed');
            }

            const updatedProfile = data.data;

            if (isNew)
            {
                setProfiles(prev => [...prev, updatedProfile]);
                setSelectedProfile(null);
                setIsNewDialogOpen(false);

                // Event: profile created
                await createEvent(`Profile created: "${updatedProfile.name}"`, 'HIGH', updatedProfile.id);
            }
            else
            {
                // Capture originals before updating state
                const origName      = selectedProfile.name || "";
                const origDesc      = selectedProfile.description || "";
                const origLoginName = selectedProfile.user?.name || "";
                const origEmail     = selectedProfile.user?.email || "";
                const origNickname  = selectedProfile.user?.nickname || "";
                const origRole      = selectedProfile.user?.role || "USER";

                setProfiles(prev => prev.map(p => p.id === selectedProfile.id ? updatedProfile : p));
                setSelectedProfile(updatedProfile);

                // Events: field changes (LOW importance)
                if (name.trim() !== origName.trim())
                {
                    await createEvent(`Profile name changed from "${origName}" to "${name.trim()}"`, 'LOW', selectedProfile.id);
                }
                if (description.trim() !== origDesc.trim())
                {
                    await createEvent('Profile description changed', 'LOW', selectedProfile.id);
                }
                if (loginName.trim() !== origLoginName.trim())
                {
                    await createEvent(`Login name changed from "${origLoginName}" to "${loginName.trim()}"`, 'LOW', selectedProfile.id);
                }
                if (email.trim() !== origEmail.trim())
                {
                    await createEvent(`Email changed from "${origEmail}" to "${email.trim()}"`, 'LOW', selectedProfile.id);
                }
                if (nickname.trim() !== origNickname.trim())
                {
                    await createEvent(`Nickname changed from "${origNickname}" to "${nickname.trim()}"`, 'LOW', selectedProfile.id);
                }
                // Event: role change (HIGH importance)
                if (role !== origRole)
                {
                    await createEvent(`Role changed from "${origRole}" to "${role}"`, 'HIGH', selectedProfile.id);
                }
            }

            setHasChanges(false);
            setPassword(""); // Clear password after save
            toast.success(isNew ? "Profile created" : "Profile updated");
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
    // DELETE PROFILE
    const handleDelete = async () => 
    {
        if (!profileToDelete) return;

        setIsDeleting(true);

        try 
        {
            const res = await fetch(`/api/profile/${profileToDelete}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
          });

          if (!res.ok) 
          {
              const err = await res.json();
              throw new Error(err.error || 'Failed to delete profile');
          }

          // Capture name before removing from state
          const deletedProfileName = profiles.find(p => p.id === profileToDelete)?.name || 'Unknown';

          setProfiles(prev => prev.filter(p => p.id !== profileToDelete));
          if (selectedProfile?.id === profileToDelete)
          {
              setSelectedProfile(null);
          }

          // Event: profile deleted (linked to organization since profile is gone)
          if (activeOrganization)
          {
              try
              {
                  await fetch('/api/event', {
                      method  : 'POST',
                      headers : { 'Content-Type': 'application/json' },
                      body    : JSON.stringify({
                          message        : `Profile deleted: "${deletedProfileName}"`,
                          importance     : 'HIGH',
                          organizationId : activeOrganization.id,
                      }),
                  });
              }
              catch (error)
              {
                  console.error('Failed to create event:', error);
              }
          }

          toast.success("Profile deleted successfully");
          setProfileToDelete(null);
        } 
        catch (err) 
        {
            console.error("Delete error:", err);
            toast.error("Could not delete profile");
        } 
        finally 
        {
            setIsDeleting(false);
        }
    };

    const filteredProfiles = profiles.filter(profile =>
      profile.name.toLowerCase().includes(filterText.toLowerCase()) ||
      profile.user?.email.toLowerCase().includes(filterText.toLowerCase()) ||
      profile.id.toString().includes(filterText)
    );

    const totalPages = Math.ceil(filteredProfiles.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentProfiles = filteredProfiles.slice(startIndex, endIndex);

    if (!user) 
    {
        return <div>Loading user...</div>;
    }

    if (!activeOrganization) 
    {
        return <div>Please select an organization</div>;
    }

    if (loading) 
    {
        return <div>Loading profiles...</div>;
    }

    const getRoleBadgeStyle = (role: string) => 
    {
        const styles = 
        {
            SUPER_ADMIN : 'bg-[var(--color-user-role-super-admin)]',
            ADMIN       : 'bg-[var(--color-user-role-admin)]',
            USER        : 'bg-[var(--color-user-role-user)]',
        };

        return styles[role as keyof typeof styles] || styles.USER;
    };

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
            <AlertDialogTitle>Remove task from profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the task assignment from this profile (delete the link in TaskProfile).
              The task itself remains in the system and can be assigned to other profiles or organizations.
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

      { /* Delete Profile Alert */ }
      <AlertDialog
        open={profileToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setProfileToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the profile
              "{profiles.find(p => p.id === profileToDelete)?.name || 'this item'}"
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

      { /* New Profile Pop-Up */ }
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Profile</DialogTitle>
            <DialogDescription>
              Enter the profile and login details. All fields are required.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Profile Information</h3>
              
              <div className="grid gap-2">
                <label className="block text-sm">Profile name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter profile name"
                  autoFocus
                />
              </div>

              <div className="grid gap-2">
                <label className="block text-sm">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter profile description"
                  className="min-h-20"
                />
              </div>
            </div>

            <hr />

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Login Information</h3>
              
              <div className="grid gap-2">
                <label className="block text-sm">Email</label>
                <Input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="Enter email"
                    className={`
                        ${emailValid ? 'border-red-500 focus:ring-red-500' : ''}
                        ${!emailValid && email ? 'border-green-500 focus:ring-green-500' : ''}
            `       }
                />
                {isCheckingEmail && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
              {emailValid == 1 && (
                <p className="text-xs text-red-500">Invalid email format</p>
              )}
              {emailValid == 2 && (
                <p className="text-xs text-red-500">This email is already taken</p>
              )}
              {!emailValid && email && (
                <p className="text-xs text-green-500">Email is available</p>
              )}
              </div>

              <div className="grid gap-2 relative">
                <label className="block text-sm">Password</label>
                <Input
                  type="password"
                  name="new-password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onKeyDown={() => setPasswordTouched(true)}
                  onPaste={() => setPasswordTouched(true)}
                  onFocus={(e) => {
                      // Only mark touched if value changes after focus
                      const startValue = e.currentTarget.value;
                      setTimeout(() => {
                          if (e.currentTarget.value !== startValue) {
                              setPasswordTouched(true);
                          }
                      }, 0);
                  }}
                  placeholder="Enter password"
                  className={`
                        ${passwordStrength === 0 ? 'border-red-600 focus:ring-red-600' : ''}
                        ${passwordStrength === 1 ? 'border-orange-600 focus:ring-orange-600' : ''}
                        ${passwordStrength === 2 ? 'border-yellow-600 focus:ring-yellow-600' : ''}
                        ${passwordStrength === 3 ? 'border-green-600 focus:ring-green-600' : ''}
                        ${passwordStrength === 4 ? 'border-emerald-600 focus:ring-emerald-600' : ''}
                      `}
                />
                <div className="mt-2 space-y-1.5">
                  {/* Strength bar */}
                  <div className="h-1.5 w-full bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className={`
                        h-full transition-all duration-300 ease-out
                        ${passwordStrength === null ? "w-0" : ""}
                        ${passwordStrength === 0 ? "w-1/5 bg-red-600" : ""}
                        ${passwordStrength === 1 ? "w-2/5 bg-orange-600" : ""}
                        ${passwordStrength === 2 ? "w-3/5 bg-yellow-500" : ""}
                        ${passwordStrength === 3 ? "w-4/5 bg-green-600" : ""}
                        ${passwordStrength === 4 ? "w-full bg-emerald-600" : ""}
                      `}
                    />
                  </div>

                {/* When empty or not yet evaluated */}
                {!password && (
                  <p className="text-xs text-neutral-500">
                    Use at least 8 characters with a mix of letters, numbers & symbols
                  </p>
                )}
              </div>

                <div className="mt-1 text-xs">
                  {passwordStrength === 0 && <p className="text-red-600">Very weak – easily guessable&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({passwordFeedback})</span></p>}
                  {passwordStrength === 1 && <p className="text-orange-600">Weak&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({passwordFeedback})</span></p>}
                  {passwordStrength === 2 && <p className="text-yellow-600">Okay – could be stronger&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({passwordFeedback})</span></p>}
                  {passwordStrength === 3 && <p className="text-green-600">Strong</p>}
                  {passwordStrength === 4 && <p className="text-emerald-600">Very strong ✓</p>}
                </div>
              </div>

              <div className="grid gap-2">
                <label className="block text-sm">Login Name</label>
                <Input
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  placeholder="Enter login name"
                />
              </div>

              <div className="grid gap-2">
                <label className="block text-sm">Nickname</label>
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Enter nickname"
                />
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="block text-sm">Role</label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      {user?.role === 'SUPER_ADMIN' && (
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button 
                onClick={handleSave} 
                disabled={
                      isSaving ||
                      // ── New profile specific validations ────────────────────────
                    (!selectedProfile && (
                      // Required fields
                      !name.trim() ||
                      !email.trim() ||
                      !loginName.trim() ||
                      !nickname.trim() ||
                      !password.trim() ||
                      // Email must be valid & available
                      emailValid !== 0 ||
                      // Password must be checked and strong enough
                      passwordStrength === null || passwordStrength < 3
                    ))
                  }
              >
              {isSaving ? 'Creating...' : 'Create profile'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Task Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the name and description of the task.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <label className="block text-sm">Task name</label>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Enter task name"
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <label className="block text-sm">Description</label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Enter task description"
                className="min-h-30"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleTaskCancel}
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






      <div className="space-y-8 p-6">
        { /* New Profile Button */ }
        <div className="flex justify-center">
          <Button
            variant="default"
            size="sm"
            onClick={handleNewProfile}
            className="cursor-pointer rounded-none"
          >
            New Profile
          </Button>
        </div>

        { /* Filter Table Input */ }
        <div className="flex justify-end">
          <Input
            placeholder="Filter by name, email or ID..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-sm"
          />
        </div>

        { /* Profile Table */ }
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 text-right">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-28 text-right">Tasks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentProfiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {filterText ? "No profiles match your filter" : "No profiles found"}
                </TableCell>
              </TableRow>
            ) : (
              currentProfiles.map((profile) => (
                <TableRow
                  key={profile.id}
                  className={`
                    cursor-pointer transition-colors
                    ${selectedProfile?.id === profile.id ? "bg-muted/60 hover:bg-muted/80" : "hover:bg-muted/50"}
                  `}
                  onClick={() => handleRowClick(profile)}
                >
                  <TableCell className="w-20 text-right tabular-nums">{profile.id}</TableCell>
                  <TableCell>{profile.name}</TableCell>
                  <TableCell>{profile.user?.email || '-'}</TableCell>
                  <TableCell>
                    <Badge 
                        variant="secondary" 
                        className={`${getRoleBadgeStyle(profile.user?.role || 'USER')} text-xs user-role-badge`}
                    >
                        {profile.user?.role || 'USER'}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-28 text-right tabular-nums">
                    {profile.taskProfiles?.length || 0}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredProfiles.length)} of {filteredProfiles.length} profiles
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

        {selectedProfile && (
          <>
            <div>
              <hr className="my-8" />

              <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full" id="edit-form">
                <div className="relative w-full max-w-300">
                  <TabsList className="w-full bg-transparent border-b border-neutral-700 rounded-none p-0 h-auto grid grid-cols-6">
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                      value="details"
                    >
                      Details
                    </TabsTrigger>
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                      value="login"
                    >
                      Login
                    </TabsTrigger>
                    <TabsTrigger
                      className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                      value="tasks"
                    >
                      Tasks ({selectedProfile.taskProfiles?.length || 0})
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
                      left: activeTab === 'login' ? '16.666%' :
                           activeTab === 'tasks' ? '33.333%' :
                           activeTab === 'audit' ? '50%' :
                           activeTab === 'actions' ? '66.666%' : '0%'
                    }}
                  />
                </div>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-6 max-w-2xl mt-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm mb-2">Profile name</label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter profile name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm mb-2">Description</label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter profile description"
                        className="min-h-30"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Login Tab */}
                <TabsContent value="login" className="space-y-6 max-w-2xl mt-6">
                  <div className="space-y-6">

                    {/* -- Login Name */}
                    <div>
                      <label className="block text-sm mb-2">Login Name</label>
                      <Input
                        value={loginName}
                        onChange={(e) => setLoginName(e.target.value)}
                        placeholder="Enter login name"
                      />
                    </div>

                    {/* -- Email */}
                    <div className="grid gap-2">
                      <label className="block text-sm mb-2">Email</label>
                      <Input
                          type="email"
                          value={email}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          placeholder="Enter email"
                          className={`
                              ${emailValid ? 'border-red-500 focus:ring-red-500' : ''}
                              ${!emailValid && email ? 'border-green-500 focus:ring-green-500' : ''}
                  `       }
                      />
                      {email && (
                        <>
                      {isCheckingEmail && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      {emailValid == 1 && (
                        <p className="text-xs text-red-500">Invalid email format</p>
                      )}
                      {emailValid == 2 && email !== selectedProfile?.user?.email && (
                        <p className="text-xs text-red-500">This email is already taken</p>
                      )}
                      {!emailValid && email !== selectedProfile?.user?.email && (
                        <p className="text-xs text-green-500">Email is available</p>
                      )}
                      </>
                      )}
                    </div>

                    {/* -- Password */}
                    <div className="grid gap-2 relative">
                      <label className="block text-sm mb-2">Password</label>
                      <Input
                        type="password"
                        name="new-password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        onKeyDown={() => setPasswordTouched(true)}
                        onPaste={() => setPasswordTouched(true)}
                        onFocus={(e) => {
                            // Only mark touched if value changes after focus
                            const startValue = e.currentTarget.value;
                            setTimeout(() => {
                                if (e.currentTarget.value !== startValue) {
                                    setPasswordTouched(true);
                                }
                            }, 0);
                        }}
                        placeholder="Leave blank to keep current password"
                        className={`
                              ${passwordStrength === 0 ? 'border-red-600 focus:ring-red-600' : ''}
                              ${passwordStrength === 1 ? 'border-orange-600 focus:ring-orange-600' : ''}
                              ${passwordStrength === 2 ? 'border-yellow-600 focus:ring-yellow-600' : ''}
                              ${passwordStrength === 3 ? 'border-green-600 focus:ring-green-600' : ''}
                              ${passwordStrength === 4 ? 'border-emerald-600 focus:ring-emerald-600' : ''}
                            `}
                      />
                  {/* Strength bar */}
                  <div className="h-1.5 w-full bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className={`
                        h-full transition-all duration-300 ease-out
                        ${passwordStrength === null ? "w-0" : ""}
                        ${passwordStrength === 0 ? "w-1/5 bg-red-600" : ""}
                        ${passwordStrength === 1 ? "w-2/5 bg-orange-600" : ""}
                        ${passwordStrength === 2 ? "w-3/5 bg-yellow-500" : ""}
                        ${passwordStrength === 3 ? "w-4/5 bg-green-600" : ""}
                        ${passwordStrength === 4 ? "w-full bg-emerald-600" : ""}
                      `}
                    />
                  </div>

                        <div className="mt-1 text-xs">
                          {passwordStrength === 0 && <p className="text-red-600">Very weak – easily guessable&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({passwordFeedback})</span></p>}
                          {passwordStrength === 1 && <p className="text-orange-600">Weak&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({passwordFeedback})</span></p>}
                          {passwordStrength === 2 && <p className="text-yellow-600">Okay – could be stronger&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({passwordFeedback})</span></p>}
                          {passwordStrength === 3 && <p className="text-green-600">Strong</p>}
                          {passwordStrength === 4 && <p className="text-emerald-600">Very strong ✓</p>}
                        </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Only enter a password if you want to change it
                      </p>
                    </div>

                    {/* -- Nickname */}
                    <div>
                      <label className="block text-sm mb-2">Nickname</label>
                      <Input
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="Enter nickname"
                      />
                    </div>

                    {/* -- ole */}
                    <div className="grid gap-2">
                        <label className="block text-sm mb-2">Role</label>
                        <Select value={role} onValueChange={setRole}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                              position="popper"
                              side="bottom"
                              sideOffset={4}
                              className="max-h-75 overflow-y-auto"                          
                          >
                            <SelectItem value="USER">User</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            {user?.role === 'SUPER_ADMIN' && (
                              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* Tasks Tab */}
                <TabsContent value="tasks" className="mt-6">
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
                    {selectedProfile.taskProfiles?.length ? (
                        selectedProfile.taskProfiles.map((tp: any) => (
                        <TableRow 
                          key={tp.task.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleTaskRowClick(tp.task)}
                        >
                            <TableCell className="text-right tabular-nums">
                            {tp.task.id}
                            </TableCell>
                            <TableCell>{tp.task.name}</TableCell>
                            <TableCell>{tp.task.description || '-'}</TableCell>
                            <TableCell className="w-32">
                              <Badge variant="secondary" className={`${getStatusBadge(tp.task.status)} px-2 py-1 text-xs status-badge`}>
                                {tp.task.status.replace('_', ' ')}
                              </Badge>
                          </TableCell>
                            <TableCell>
                                <button 
                                    className="hover:text-destructive"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setTaskToRemove(tp.task.id);
                                    }}
                                >
                                    <Trash2 size={16}  className="cursor-pointer" />
                                </button>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell
                            colSpan={4}
                            className="text-center text-muted-foreground"
                        >
                            No tasks assigned to this profile
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* Audit Trail Tab */}
                <TabsContent value="audit" className="mt-6">
                  {loadingEvents ? (
                    <div className="text-center text-muted-foreground py-8">Loading events...</div>
                  ) : events.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No events for this profile</div>
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
                            const startIdx = (eventsCurrentPage - 1) * eventsPerPage;
                            const endIdx = startIdx + eventsPerPage;
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

                      {/* Events Pagination */}
                      {(() => {
                        const totalEventsPages = Math.ceil(events.length / eventsPerPage);
                        const startIdx = (eventsCurrentPage - 1) * eventsPerPage;
                        const endIdx = Math.min(startIdx + eventsPerPage, events.length);

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
                      <h3 className="text-lg font-semibold mb-4">Profile Actions</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Manage this profile with the actions below.
                      </p>
                    </div>

                    <div className="border border-destructive/30 rounded-lg p-4 bg-destructive/5">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-destructive mb-1">Delete Profile</h4>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete this profile and all associated data. This action cannot be undone.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => setProfileToDelete(selectedProfile.id)}
                          className="shrink-0"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Profile
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}

        {selectedProfile && hasChanges && (
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
              disabled={!hasChanges 
                || isSaving 
                || emailValid !== 0
                || ( !!password && (passwordStrength === null || passwordStrength < 3))
              }
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
