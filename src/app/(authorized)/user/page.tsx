'use client';

import { useUser }              from '@/context/UserContext';
import { useRouter }            from 'next/navigation';
import { useRef, useEffect, useState }  from 'react';
import { zxcvbn }                         from '@/lib/zxcvbn';
import { Trash2, Star, ChevronDown, ChevronUp, ArrowUpDown, ShieldCheck, ShieldOff, Copy }     from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button }               from "@/components/ui/button";
import { Checkbox }             from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations }      from 'next-intl';

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

import { toast } from "sonner"

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

import { Input } from "@/components/ui/input"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ExportMenu } from '@/components/ui/export-menu';
import type { ExportColumn } from '@/lib/export';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ROLE_OPTIONS = ['USER', 'ADMIN', 'SUPER_ADMIN'] as const;

export default function UserPage()
{
    const user = useUser();
    const router = useRouter();
    const t = useTranslations('User');
    const tc = useTranslations('Common');

    // Data
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    // Detail pane form fields
    const [name, setName] = useState("");
    const [nickname, setNickname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<string>("USER");

    // Create dialog form fields
    const [newName, setNewName] = useState("");
    const [newNickname, setNewNickname] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState<string>("USER");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Change detection & save state
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Dialogs
    const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filter & tabs
    const [filterText, setFilterText] = useState("");
    const [activeTab, setActiveTab] = useState("details");

    // Sorting
    const [sortField, setSortField] = useState<'name' | 'email' | 'role' | 'starred' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Selection and starring
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    const [starredUserIds, setStarredUserIds] = useState<Set<string>>(new Set());

    // Bulk delete
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleteConfirmChecked, setBulkDeleteConfirmChecked] = useState(false);
    const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState("");
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    // Email validation (edit form)
    const [emailValid, setEmailValid]             = useState<number | null>(null);
    const [isCheckingEmail, setIsCheckingEmail]   = useState(false);
    const emailCheckTimeout                       = useRef<NodeJS.Timeout | null>(null);

    // Password strength (edit form)
    const [passwordTouched, setPasswordTouched]   = useState(false);
    const [passwordStrength, setPasswordStrength] = useState<number | null>(null);
    const [passwordFeedback, setPasswordFeedback] = useState<string>("");
    const passwordTimeout                         = useRef<NodeJS.Timeout | null>(null);

    // Email validation (create dialog)
    const [newEmailValid, setNewEmailValid]             = useState<number | null>(null);
    const [isCheckingNewEmail, setIsCheckingNewEmail]   = useState(false);
    const newEmailCheckTimeout                         = useRef<NodeJS.Timeout | null>(null);

    // Password strength (create dialog)
    const [newPasswordStrength, setNewPasswordStrength] = useState<number | null>(null);
    const [newPasswordFeedback, setNewPasswordFeedback] = useState<string>("");
    const newPasswordTimeout                           = useRef<NodeJS.Timeout | null>(null);

    // Login history (sessions)
    const [sessions, setSessions] = useState<any[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sessionsFilter, setSessionsFilter] = useState("");
    const [sessionsCurrentPage, setSessionsCurrentPage] = useState(1);
    const sessionsPerPage = 8;

    // 2FA enable state
    const [twoFaEnabling, setTwoFaEnabling] = useState(false);
    const [twoFaTotpURI, setTwoFaTotpURI] = useState("");
    const [twoFaBackupCodes, setTwoFaBackupCodes] = useState<string[]>([]);
    const [twoFaShowSetup, setTwoFaShowSetup] = useState(false);
    const [twoFaConfirmDialogOpen, setTwoFaConfirmDialogOpen] = useState(false);
    const [twoFaConfirmChecked, setTwoFaConfirmChecked] = useState(false);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH USERS
    const fetchUsers = async () =>
    {
        try
        {
            const res = await fetch('/api/user');
            const data = await res.json();
            if (!data.success)
            {
                console.error('Failed to fetch users:', data.error);
                return;
            }
            setUsers(data.data);
        }
        catch (error)
        {
            console.error('Failed to fetch users:', error);
        }
        finally
        {
            setLoading(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH STARRED USERS
    const fetchStarredUsers = async () =>
    {
        try
        {
            const res = await fetch('/api/user-star');
            const data = await res.json();
            if (!data.success)
            {
                console.error('Failed to fetch starred users:', data.message);
                return;
            }
            setStarredUserIds(new Set(data.data || []));
        }
        catch (error)
        {
            console.error('Failed to fetch starred users:', error);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH SESSIONS FOR SELECTED USER
    const fetchSessions = async (userId: string) =>
    {
        setSessionsLoading(true);
        try
        {
            const res = await fetch(`/api/user/${userId}/sessions`);
            const data = await res.json();
            if (!data.success)
            {
                console.error('Failed to fetch sessions:', data.error);
                setSessions([]);
                return;
            }
            setSessions(data.data || []);
        }
        catch (error)
        {
            console.error('Failed to fetch sessions:', error);
            setSessions([]);
        }
        finally
        {
            setSessionsLoading(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // TOGGLE STAR (API call)
    const toggleStarApi = async (userId: string) =>
    {
        try
        {
            const res = await fetch('/api/user-star', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (!data.success)
            {
                console.error('Failed to toggle star:', data.message);
                toast.error(data.message || t('toast.starError'));
                return;
            }
            setStarredUserIds(prev => {
                const newSet = new Set(prev);
                if (data.starred) {
                    newSet.add(userId);
                } else {
                    newSet.delete(userId);
                }
                return newSet;
            });
        }
        catch (error)
        {
            console.error('Failed to toggle star:', error);
            toast.error(t('toast.starError'));
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // TOGGLE STAR (UI wrapper with event handling)
    const toggleStar = (userId: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        toggleStarApi(userId);
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SELECTION HELPERS
    const toggleUserSelection = (userId: string) => {
        setSelectedUserIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const selectAllCurrent = () => {
        setSelectedUserIds(prev => {
            const newSet = new Set(prev);
            currentUsers.forEach(u => newSet.add(u.id));
            return newSet;
        });
    };

    const deselectAllCurrent = () => {
        setSelectedUserIds(prev => {
            const newSet = new Set(prev);
            currentUsers.forEach(u => newSet.delete(u.id));
            return newSet;
        });
    };

    const selectByRole = (role: string) => {
        setSelectedUserIds(prev => {
            const newSet = new Set(prev);
            filteredUsers.filter(u => u.role === role).forEach(u => newSet.add(u.id));
            return newSet;
        });
    };

    const selectStarred = () => {
        setSelectedUserIds(prev => {
            const newSet = new Set(prev);
            filteredUsers.filter(u => starredUserIds.has(u.id)).forEach(u => newSet.add(u.id));
            return newSet;
        });
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // GET LOCALIZED DELETE WORD
    const getDeleteWord = () => {
        return tc('words.delete') || 'delete';
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // BULK DELETE
    const handleBulkDelete = async () => {
        if (selectedUserIds.size === 0) return;
        if (!bulkDeleteConfirmChecked) return;
        if (bulkDeleteConfirmText.toLowerCase() !== getDeleteWord().toLowerCase()) return;

        setIsBulkProcessing(true);
        let successCount = 0;
        let errorCount = 0;

        for (const userId of selectedUserIds) {
            // Don't delete own account - find the user being deleted and check email
            const userToDelete = users.find(u => u.id === userId);
            if (userToDelete?.email === user?.email) {
                toast.error(t('toast.cannotDeleteSelf'));
                errorCount++;
                continue;
            }
            try {
                const res = await fetch(`/api/user/${userId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                });
                const data = await res.json();
                if (data.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch {
                errorCount++;
            }
        }

        setIsBulkProcessing(false);
        setIsBulkDeleteDialogOpen(false);
        setBulkDeleteConfirmChecked(false);
        setBulkDeleteConfirmText("");
        setSelectedUserIds(new Set());

        if (successCount > 0) {
            toast.success(t('toast.usersDeleted', { count: successCount }));
            fetchUsers();
            if (selectedUser && selectedUserIds.has(selectedUser.id)) {
                setSelectedUser(null);
            }
        }
        if (errorCount > 0) {
            toast.error(t('toast.usersDeleteFailed', { count: errorCount }));
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // PROTECT ROUTE
    useEffect(() =>
    {
        if (!user) return;
        if (user.role !== 'SUPER_ADMIN')
        {
            router.push('/dashboard');
        }
    }, [user, router]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // INITIAL LOAD + REFRESH
    useEffect(() =>
    {
        if (user?.role !== 'SUPER_ADMIN') return;

        fetchUsers();
        fetchStarredUsers();

        const handleRefresh = () => {
            fetchUsers();
            fetchStarredUsers();
        };
        window.addEventListener('refreshPage', handleRefresh);
        return () => window.removeEventListener('refreshPage', handleRefresh);
    }, [user]);

    // Track previous user ID to detect actual user switches
    const prevSelectedUserIdRef = useRef<string | null>(null);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // POPULATE FORM WHEN USER SELECTED
    useEffect(() =>
    {
        const currentId = selectedUser?.id || null;
        const prevId = prevSelectedUserIdRef.current;
        const isNewUser = currentId !== prevId;

        if (selectedUser)
        {
            setName(selectedUser.name || "");
            setNickname(selectedUser.nickname || "");
            setEmail(selectedUser.email || "");
            setRole(selectedUser.role || "USER");
            setPassword(""); // Always clear password
            setEmailValid(0); // Existing email is valid
            setPasswordStrength(null);
            setPasswordFeedback("");
            setPasswordTouched(false);

            // Only reset 2FA state when selecting a DIFFERENT user
            if (isNewUser) {
                setTwoFaShowSetup(false);
                setTwoFaTotpURI("");
                setTwoFaBackupCodes([]);
                setTwoFaConfirmDialogOpen(false);
                setTwoFaConfirmChecked(false);
            }
        }
        else
        {
            setName("");
            setNickname("");
            setEmail("");
            setRole("USER");
            setPassword("");
            setEmailValid(null);
            setPasswordStrength(null);
            setPasswordFeedback("");
            setPasswordTouched(false);
            // Reset 2FA state
            setTwoFaShowSetup(false);
            setTwoFaTotpURI("");
            setTwoFaBackupCodes([]);
            setTwoFaConfirmDialogOpen(false);
            setTwoFaConfirmChecked(false);
        }

        prevSelectedUserIdRef.current = currentId;
    }, [selectedUser]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // CHANGE DETECTION
    useEffect(() =>
    {
        if (!selectedUser)
        {
            setHasChanges(false);
            return;
        }

        const nameChanged     = name.trim() !== (selectedUser.name || "").trim();
        const emailChanged    = email.trim() !== (selectedUser.email || "").trim();
        const roleChanged     = role !== (selectedUser.role || "USER");
        const passwordChanged = password.length > 0;

        setHasChanges(nameChanged || emailChanged || roleChanged || passwordChanged);
    }, [name, email, role, password, selectedUser]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // RESET TO PAGE 1 WHEN FILTER CHANGES
    useEffect(() =>
    {
        setCurrentPage(1);
    }, [filterText]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // CLEANUP TIMEOUTS
    useEffect(() =>
    {
        return () =>
        {
            if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current);
            if (passwordTimeout.current) clearTimeout(passwordTimeout.current);
            if (newEmailCheckTimeout.current) clearTimeout(newEmailCheckTimeout.current);
            if (newPasswordTimeout.current) clearTimeout(newPasswordTimeout.current);
        };
    }, []);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // CHECK EMAIL AVAILABILITY
    const checkEmailAvailability = async (
        emailToCheck : string,
        currentEmail : string | null,
        setValid     : (v: number | null) => void,
        setChecking  : (v: boolean) => void,
    ) =>
    {
        if (!emailToCheck.trim())
        {
            setValid(null);
            return;
        }

        if (currentEmail && emailToCheck === currentEmail)
        {
            setValid(0);
            setChecking(false);
            return;
        }

        setChecking(true);

        try
        {
            const res = await fetch(`/api/user/check-email?email=${encodeURIComponent(emailToCheck)}`);
            const data = await res.json();
            if (data.success)
            {
                setValid(data.available ? 0 : 2);
            }
        }
        catch (error)
        {
            console.error('Error checking email:', error);
        }
        finally
        {
            setChecking(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // EMAIL CHANGE (edit form)
    const handleEmailChange = (newEmail: string) =>
    {
        setEmail(newEmail);

        if (emailCheckTimeout.current)
        {
            clearTimeout(emailCheckTimeout.current);
            emailCheckTimeout.current = null;
        }

        emailCheckTimeout.current = setTimeout(() =>
        {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(newEmail))
            {
                setEmailValid(1);
                return;
            }
            checkEmailAvailability(newEmail, selectedUser?.email || null, setEmailValid, setIsCheckingEmail);
        }, 500);
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // EMAIL CHANGE (create dialog)
    const handleNewEmailChange = (emailValue: string) =>
    {
        setNewEmail(emailValue);

        if (newEmailCheckTimeout.current)
        {
            clearTimeout(newEmailCheckTimeout.current);
            newEmailCheckTimeout.current = null;
        }

        newEmailCheckTimeout.current = setTimeout(() =>
        {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailValue))
            {
                setNewEmailValid(1);
                return;
            }
            checkEmailAvailability(emailValue, null, setNewEmailValid, setIsCheckingNewEmail);
        }, 500);
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // PASSWORD CHANGE (edit form)
    const handlePasswordChange = (value: string) =>
    {
        setPassword(value);
        setPasswordTouched(true);

        if (passwordTimeout.current) clearTimeout(passwordTimeout.current);

        passwordTimeout.current = setTimeout(() =>
        {
            if (!value)
            {
                setPasswordStrength(null);
                setPasswordFeedback('');
                return;
            }

            const result = zxcvbn(value, [
                name.trim() || "",
                email.split("@")[0] || "",
                nickname.trim() || "",
            ]);

            setPasswordStrength(result.score);

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
        }, 400);
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // PASSWORD CHANGE (create dialog)
    const handleNewPasswordChange = (value: string) =>
    {
        setNewPassword(value);

        if (newPasswordTimeout.current) clearTimeout(newPasswordTimeout.current);

        newPasswordTimeout.current = setTimeout(() =>
        {
            if (!value)
            {
                setNewPasswordStrength(null);
                setNewPasswordFeedback('');
                return;
            }

            const result = zxcvbn(value, [
                newName.trim() || "",
                newEmail.split("@")[0] || "",
                newNickname.trim() || "",
            ]);

            setNewPasswordStrength(result.score);

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

            setNewPasswordFeedback(message);
        }, 400);
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ROW CLICK
    const handleRowClick = (u: any) =>
    {
        setSelectedUser(u);
        setActiveTab("details");
        // Reset sessions state and fetch for the new user
        setSessions([]);
        setSessionsFilter("");
        setSessionsCurrentPage(1);
        fetchSessions(u.id);
        document.getElementById('edit-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // NEW USER DIALOG
    const handleNewUser = () =>
    {
        setNewName("");
        setNewNickname("");
        setNewEmail("");
        setNewPassword("");
        setNewRole("USER");
        setNewEmailValid(null);
        setNewPasswordStrength(null);
        setNewPasswordFeedback("");
        setIsNewDialogOpen(true);
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // CREATE USER
    const handleCreate = async () =>
    {
        if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;

        // Require strong password
        const result = zxcvbn(newPassword, [newName, newEmail, newNickname]);
        if (result.score < 3)
        {
            toast.error(t('toast.passwordTooWeak'));
            return;
        }

        setIsSaving(true);

        try
        {
            const res = await fetch('/api/user',
            {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify({
                    name     : newName.trim(),
                    nickname : newNickname.trim(),
                    email    : newEmail.trim(),
                    password : newPassword,
                    role     : newRole,
                }),
            });

            const data = await res.json();

            if (!data.success)
            {
                if (res.status === 409)
                {
                    toast.error(t('toast.emailTaken'));
                }
                else
                {
                    toast.error(data.error || t('toast.saveError'));
                }
                return;
            }

            setUsers(prev => [...prev, data.data]);
            setIsNewDialogOpen(false);
            toast.success(t('toast.userCreated'));
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
    // SAVE (UPDATE) USER
    const handleSave = async () =>
    {
        if (!selectedUser || !name.trim()) return;

        // If password is being changed, require strong password
        if (password.length > 0)
        {
            const result = zxcvbn(password, [name, email, nickname]);
            if (result.score < 3)
            {
                toast.error(t('toast.passwordTooWeak'));
                return;
            }
        }

        setIsSaving(true);

        try
        {
            const body: Record<string, string> = {
                name     : name.trim(),
                nickname : nickname.trim(),
                email    : email.trim(),
                role,
            };

            if (password.length > 0)
            {
                body.password = password;
            }

            const res = await fetch(`/api/user/${selectedUser.id}`,
            {
                method  : 'PATCH',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(body),
            });

            const data = await res.json();

            if (!data.success)
            {
                if (res.status === 409)
                {
                    toast.error(t('toast.emailTaken'));
                }
                else
                {
                    toast.error(data.error || t('toast.saveError'));
                }
                return;
            }

            const updatedUser = data.data;

            setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
            setSelectedUser(updatedUser);
            setHasChanges(false);
            toast.success(t('toast.userUpdated'));
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
    // DELETE USER
    const handleDelete = async () =>
    {
        if (!userToDelete) return;

        setIsDeleting(true);

        try
        {
            const res = await fetch(`/api/user/${userToDelete}`,
            {
                method  : 'DELETE',
                headers : { 'Content-Type': 'application/json' },
            });

            const data = await res.json();

            if (!data.success)
            {
                if (data.error?.includes('own account'))
                {
                    toast.error(t('toast.cannotDeleteSelf'));
                }
                else
                {
                    toast.error(data.error || t('toast.deleteError'));
                }
                return;
            }

            setUsers(prev => prev.filter(u => u.id !== userToDelete));

            if (selectedUser?.id === userToDelete)
            {
                setSelectedUser(null);
            }

            toast.success(t('toast.userDeleted'));
            setUserToDelete(null);
        }
        catch (err)
        {
            console.error(err);
            toast.error(t('toast.deleteError'));
        }
        finally
        {
            setIsDeleting(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SORTING HELPER
    const handleSort = (field: 'name' | 'email' | 'role' | 'starred') => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Sortable column header renderer
    const SortableHeader = ({ field, children, className = '' }: { field: 'name' | 'email' | 'role' | 'starred', children: React.ReactNode, className?: string }) => (
        <TableHead
            className={`cursor-pointer select-none hover:bg-muted/50 ${className}`}
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center gap-1">
                {children}
                {sortField === field ? (
                    sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-30" />
                )}
            </div>
        </TableHead>
    );

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FILTER & PAGINATION
    const filteredUsers = users
        .filter(u =>
            u.name.toLowerCase().includes(filterText.toLowerCase()) ||
            u.email.toLowerCase().includes(filterText.toLowerCase())
        )
        // Sort: by selected column, or default (current user first, then by updatedAt)
        .sort((a, b) => {
            // Current user always on top
            if (user?.email === a.email) return -1;
            if (user?.email === b.email) return 1;

            // If a sort field is selected, use it
            if (sortField) {
                let comparison = 0;
                switch (sortField) {
                    case 'name':
                        comparison = a.name.localeCompare(b.name);
                        break;
                    case 'email':
                        comparison = a.email.localeCompare(b.email);
                        break;
                    case 'role':
                        comparison = a.role.localeCompare(b.role);
                        break;
                    case 'starred':
                        const aStarred = starredUserIds.has(a.id) ? 1 : 0;
                        const bStarred = starredUserIds.has(b.id) ? 1 : 0;
                        comparison = bStarred - aStarred; // Starred first by default
                        break;
                }
                return sortDirection === 'asc' ? comparison : -comparison;
            }

            // Default: sort by updatedAt descending
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            return dateB - dateA;
        });

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentUsers = filteredUsers.slice(startIndex, endIndex);

    // Selection helpers for checkbox state
    const allCurrentSelected = currentUsers.length > 0 && currentUsers.every(u => selectedUserIds.has(u.id));
    const someCurrentSelected = currentUsers.some(u => selectedUserIds.has(u.id)) && !allCurrentSelected;

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ROLE BADGE
    const getRoleBadge = (r: string) =>
    {
        const styles: Record<string, string> = {
            USER        : 'bg-neutral-600',
            ADMIN       : 'bg-blue-700',
            SUPER_ADMIN : 'bg-purple-700',
        };
        return styles[r] || 'bg-neutral-600';
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // EXPORT COLUMNS
    const exportColumns: ExportColumn[] = [
        { header: 'Name', accessor: 'name' },
        { header: 'Email', accessor: 'email' },
        { header: 'Role', accessor: 'role' },
    ];

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SESSION HELPERS
    const parseUserAgent = (ua: string | null): string => {
        if (!ua) return 'Unknown Device';

        // Extract browser
        let browser = 'Unknown';
        if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Edg/')) browser = 'Edge';
        else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';
        else if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Safari')) browser = 'Safari';

        // Extract OS
        let os = 'Unknown';
        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac OS')) os = 'macOS';
        else if (ua.includes('Ubuntu')) os = 'Ubuntu';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

        return `${browser} (${os})`;
    };

    const formatLocation = (session: any): string => {
        const parts = [];
        if (session.city) parts.push(session.city);
        if (session.region) parts.push(session.region);
        if (session.country) parts.push(session.country);
        return parts.length > 0 ? parts.join(', ') : 'Unknown location';
    };

    const formatDateTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    // Filter and paginate sessions
    const filteredSessions = sessions.filter(s => {
        const searchLower = sessionsFilter.toLowerCase();
        const device = parseUserAgent(s.userAgent).toLowerCase();
        const location = formatLocation(s).toLowerCase();
        return device.includes(searchLower) || location.includes(searchLower) || (s.ipAddress || '').toLowerCase().includes(searchLower);
    });

    const sessionsTotalPages = Math.ceil(filteredSessions.length / sessionsPerPage);
    const sessionsStartIndex = (sessionsCurrentPage - 1) * sessionsPerPage;
    const sessionsEndIndex = sessionsStartIndex + sessionsPerPage;
    const currentSessions = filteredSessions.slice(sessionsStartIndex, sessionsEndIndex);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // LOADING STATES
    if (!user) return <div>Loading...</div>;
    if (user.role !== 'SUPER_ADMIN') return null;
    if (loading) return <div>Loading logins...</div>;

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // DOM
    return (
<>

{/* ── Enable 2FA Confirmation Dialog ── */}
<AlertDialog open={twoFaConfirmDialogOpen} onOpenChange={setTwoFaConfirmDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t('dialogs.enable2faTitle')}</AlertDialogTitle>
      <AlertDialogDescription className="space-y-3">
        <p>{t('dialogs.enable2faDescription')}</p>
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 mt-3">
          <p className="text-yellow-200 text-sm">{t('dialogs.enable2faWarning')}</p>
        </div>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <div className="flex items-start gap-3 py-2">
      <Checkbox
        id="enable-2fa-confirm"
        checked={twoFaConfirmChecked}
        onCheckedChange={(checked) => setTwoFaConfirmChecked(!!checked)}
      />
      <label htmlFor="enable-2fa-confirm" className="text-sm cursor-pointer leading-relaxed">
        {t('dialogs.enable2faConfirmCheckbox')}
      </label>
    </div>
    <AlertDialogFooter>
      <AlertDialogCancel>{tc('buttons.cancel')}</AlertDialogCancel>
      <AlertDialogAction
        disabled={!twoFaConfirmChecked || twoFaEnabling}
        onClick={async (e) => {
          e.preventDefault();
          if (!selectedUser) return;
          setTwoFaEnabling(true);
          try {
            const res = await fetch(`/api/user/${selectedUser.id}/enable-2fa`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (data.success) {
              setTwoFaTotpURI(data.data.totpURI);
              setTwoFaBackupCodes(data.data.backupCodes);
              setTwoFaShowSetup(true);
              setUsers(prev => prev.map(u =>
                u.id === selectedUser.id ? { ...u, twoFactorEnabled: true } : u
              ));
              setSelectedUser({ ...selectedUser, twoFactorEnabled: true });
              toast.success(t('toast.twoFactorEnabled'));
              setTwoFaConfirmDialogOpen(false);
            } else {
              toast.error(data.error || t('toast.twoFactorEnableError'));
            }
          } catch (error) {
            console.error('Failed to enable 2FA:', error);
            toast.error(t('toast.twoFactorEnableError'));
          } finally {
            setTwoFaEnabling(false);
          }
        }}
      >
        {twoFaEnabling ? t('buttons.enabling') : t('buttons.enable2FA')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

{/* ── Bulk Delete Dialog ── */}
<Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="text-destructive">{t('dialogs.bulkDeleteTitle')}</DialogTitle>
      <DialogDescription>
        {t('dialogs.bulkDeleteDescription', { count: selectedUserIds.size })}
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
      <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)} disabled={isBulkProcessing}>
        {tc('buttons.cancel')}
      </Button>
      <Button
        variant="destructive"
        onClick={handleBulkDelete}
        disabled={
          isBulkProcessing ||
          !bulkDeleteConfirmChecked ||
          bulkDeleteConfirmText.toLowerCase() !== getDeleteWord().toLowerCase()
        }
      >
        {isBulkProcessing ? tc('buttons.deleting') : t('buttons.deleteUsers', { count: selectedUserIds.size })}
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* ── Delete confirmation ── */}
<AlertDialog
  open={userToDelete !== null}
  onOpenChange={(open) => { if (!open) setUserToDelete(null); }}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t('dialogs.deleteTitle')}</AlertDialogTitle>
      <AlertDialogDescription>
        {t('dialogs.deleteDescription', { name: users.find(u => u.id === userToDelete)?.name || '' })}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isDeleting}>{tc('buttons.cancel')}</AlertDialogCancel>
      <AlertDialogAction
        className="bg-destructive text-white hover:bg-destructive/90"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? t('buttons.deleting') : t('buttons.delete')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

{/* ── Create new user dialog ── */}
<Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>{t('dialogs.createTitle')}</DialogTitle>
      <DialogDescription>{t('dialogs.createDescription')}</DialogDescription>
    </DialogHeader>

    <div className="grid gap-6 py-4">
      <div className="grid gap-2">
        <label className="block text-sm">{t('labels.name')}</label>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('placeholders.enterName')}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <label className="block text-sm">{t('labels.email')}</label>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => handleNewEmailChange(e.target.value)}
          placeholder={t('placeholders.enterEmail')}
          className={`w-full bg-neutral-800 border rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:border-transparent
            ${newEmailValid ? 'border-red-500 focus:ring-red-500' : ''}
            ${!newEmailValid && newEmail ? 'border-green-500 focus:ring-green-500' : ''}
            ${!newEmailValid && !newEmail ? 'border-neutral-700 focus:ring-neutral-600' : ''}
          `}
        />
        {newEmailValid === 1 && (
          <p className="text-xs text-red-500">{t('emailValidation.invalidFormat')}</p>
        )}
        {newEmailValid === 2 && (
          <p className="text-xs text-red-500">{t('emailValidation.alreadyTaken')}</p>
        )}
        {!newEmailValid && newEmail && (
          <p className="text-xs text-green-500">{t('emailValidation.available')}</p>
        )}
      </div>

      <div className="grid gap-2 relative">
        <label className="block text-sm">{t('labels.password')}</label>
        <input
          type="password"
          name="new-password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => handleNewPasswordChange(e.target.value)}
          placeholder={t('placeholders.enterPassword')}
          className={`w-full bg-neutral-800 border rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:border-transparent
            ${newPasswordStrength === 0 ? 'border-red-600 focus:ring-red-600' : ''}
            ${newPasswordStrength === 1 ? 'border-orange-600 focus:ring-orange-600' : ''}
            ${newPasswordStrength === 2 ? 'border-yellow-600 focus:ring-yellow-600' : ''}
            ${newPasswordStrength === 3 ? 'border-green-600 focus:ring-green-600' : ''}
            ${newPasswordStrength === 4 ? 'border-emerald-600 focus:ring-emerald-600' : ''}
            ${newPasswordStrength === null ? 'border-neutral-700 focus:ring-neutral-600' : ''}
          `}
        />
        <div className="mt-2 space-y-1.5">
          <div className="h-1.5 w-full bg-neutral-700 rounded-full overflow-hidden">
            <div
              className={`
                h-full transition-all duration-300 ease-out
                ${newPasswordStrength === null ? "w-0" : ""}
                ${newPasswordStrength === 0 ? "w-1/5 bg-red-600" : ""}
                ${newPasswordStrength === 1 ? "w-2/5 bg-orange-600" : ""}
                ${newPasswordStrength === 2 ? "w-3/5 bg-yellow-500" : ""}
                ${newPasswordStrength === 3 ? "w-4/5 bg-green-600" : ""}
                ${newPasswordStrength === 4 ? "w-full bg-emerald-600" : ""}
              `}
            />
          </div>
          {!newPassword && (
            <p className="text-xs text-neutral-500">{t('password.minLength')}</p>
          )}
        </div>
        <div className="mt-1 text-xs">
          {newPasswordStrength === 0 && <p className="text-red-600">{t('password.veryWeak')}&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({newPasswordFeedback})</span></p>}
          {newPasswordStrength === 1 && <p className="text-orange-600">{t('password.weak')}&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({newPasswordFeedback})</span></p>}
          {newPasswordStrength === 2 && <p className="text-yellow-600">{t('password.okay')}&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({newPasswordFeedback})</span></p>}
          {newPasswordStrength === 3 && <p className="text-green-600">{t('password.strong')}</p>}
          {newPasswordStrength === 4 && <p className="text-emerald-600">{t('password.veryStrong')}</p>}
        </div>
      </div>

      <div className="grid gap-2">
        <label className="block text-sm">{t('labels.role')}</label>
        <Select value={newRole} onValueChange={setNewRole}>
          <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map(r => (
              <SelectItem key={r} value={r}>{t(`roles.${r}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="flex justify-end gap-3">
      <Button
        variant="outline"
        onClick={() => setIsNewDialogOpen(false)}
        disabled={isSaving}
      >
        {tc('buttons.cancel')}
      </Button>
      <Button
        onClick={handleCreate}
        disabled={
          isSaving ||
          !newName.trim() ||
          !newEmail.trim() ||
          !newPassword.trim() ||
          newEmailValid !== 0 ||
          newPasswordStrength === null || newPasswordStrength < 3
        }
      >
        {isSaving ? t('buttons.creating') : t('buttons.createUser')}
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* ── Main content ── */}
<div className="space-y-8 p-6">

    {/* New Login button */}
    <div className="flex justify-center">
        <Button variant="default" size="sm" onClick={handleNewUser}>
            {t('buttons.newUser')}
        </Button>
    </div>

    {/* Filter Input */}
    <div className="flex justify-end gap-2">
        <Input
            placeholder={t('placeholders.filterByNameOrEmail')}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-sm"
        />
        <ExportMenu data={filteredUsers} columns={exportColumns} filename="users" />
    </div>

    {/* Users table */}
    <Table>
        <TableHeader>
            <TableRow>
                {/* Checkbox column with dropdown */}
                <TableHead className="w-12">
                    <div className="flex items-center gap-0.5">
                        <Checkbox
                            checked={allCurrentSelected ? true : someCurrentSelected ? "indeterminate" : false}
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    selectAllCurrent();
                                } else {
                                    deselectAllCurrent();
                                }
                            }}
                        />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 hover:bg-muted rounded">
                                    <ChevronDown className="h-3 w-3" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={selectAllCurrent}>
                                    {tc('selection.selectAll')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => selectByRole('USER')}>
                                    {tc('selection.selectUsers')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => selectByRole('ADMIN')}>
                                    {tc('selection.selectAdmins')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={selectStarred}>
                                    <Star className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400" />
                                    {tc('selection.starred')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TableHead>
                <SortableHeader field="name">{t('labels.name')}</SortableHeader>
                <SortableHeader field="email">{t('labels.email')}</SortableHeader>
                <SortableHeader field="role" className="w-32">{t('labels.role')}</SortableHeader>
                {/* Star column */}
                <SortableHeader field="starred" className="w-12"><Star className="h-4 w-4" /></SortableHeader>
            </TableRow>
        </TableHeader>
        <TableBody>
{currentUsers.length === 0 ? (
            <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {filterText ? t('empty.noUsersMatch') : t('empty.noUsersFound')}
                </TableCell>
            </TableRow>
) : (
    currentUsers.map((u) => (
            <TableRow
                key={u.id}
                className={`
                    cursor-pointer transition-colors
                    ${selectedUser?.id === u.id ? "bg-muted/60 hover:bg-muted/80" : "hover:bg-muted/50"}
                `}
                onClick={() => handleRowClick(u)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    toggleStar(u.id);
                }}
            >
                {/* Checkbox cell */}
                <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        checked={selectedUserIds.has(u.id)}
                        onCheckedChange={() => toggleUserSelection(u.id)}
                    />
                </TableCell>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell className="w-32 text-center">
                    <Badge className={`${getRoleBadge(u.role)} text-white text-xs`}>
                        {t(`roles.${u.role}`)}
                    </Badge>
                </TableCell>
                {/* Star cell */}
                <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={(e) => toggleStar(u.id, e)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                    >
                        <Star
                            className={`h-4 w-4 ${
                                starredUserIds.has(u.id)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground hover:text-yellow-400'
                            }`}
                        />
                    </button>
                </TableCell>
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
            {t('pagination.showingUsers', { start: startIndex + 1, end: Math.min(endIndex, filteredUsers.length), total: filteredUsers.length })}
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

    {/* Bulk Action Bar */}
    {selectedUserIds.size > 0 && (
        <div className="flex items-center gap-4 mt-4 p-3 bg-muted/50 rounded-lg border">
            <span className="text-sm text-muted-foreground">
                {t('selection.selectedOf', { selected: selectedUserIds.size, total: filteredUsers.length })}
            </span>
            <div className="flex items-center gap-1 ml-auto">
                <button
                    onClick={() => { setBulkDeleteConfirmChecked(false); setBulkDeleteConfirmText(""); setIsBulkDeleteDialogOpen(true); }}
                    className="p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded transition-colors cursor-pointer"
                    title={t('buttons.deleteSelected')}
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </div>
    )}

    {/* ── Detail Section with TABS ── */}
{selectedUser && (
    <>
    <div>
        <hr className="my-8" />

        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full" id="edit-form">
            <div className="relative w-full max-w-300">
                <TabsList className="w-full bg-transparent border-b border-neutral-700 rounded-none p-0 h-auto grid grid-cols-3">
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="details"
                    >
                        {t('tabs.details')}
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="loginHistory"
                    >
                        {t('tabs.loginHistory')}
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="actions"
                    >
                        {t('tabs.actions')}
                    </TabsTrigger>
                </TabsList>

                {/* Sliding tab indicator */}
                <div
                    className="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out z-0"
                    style={{
                        width: '33.333%',
                        left: activeTab === 'details' ? '0%' : activeTab === 'loginHistory' ? '33.333%' : '66.666%'
                    }}
                />
            </div>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6 max-w-2xl mt-6">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm mb-2">{t('labels.id')}</label>
                        <Input
                            value={selectedUser?.id?.toString() || ''}
                            disabled
                            className="opacity-60"
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-2">{t('labels.name')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('placeholders.enterName')}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label className="block text-sm mb-2">{t('labels.email')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            placeholder={t('placeholders.enterEmail')}
                            className={`w-full bg-neutral-800 border rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:border-transparent
                                ${emailValid ? 'border-red-500 focus:ring-red-500' : ''}
                                ${!emailValid && email ? 'border-green-500 focus:ring-green-500' : ''}
                                ${!emailValid && !email ? 'border-neutral-700 focus:ring-neutral-600' : ''}
                            `}
                        />
                        {email && (
                          <>
                            {emailValid === 1 && (
                              <p className="text-xs text-red-500">{t('emailValidation.invalidFormat')}</p>
                            )}
                            {emailValid === 2 && email !== selectedUser?.email && (
                              <p className="text-xs text-red-500">{t('emailValidation.alreadyTaken')}</p>
                            )}
                            {!emailValid && email !== selectedUser?.email && (
                              <p className="text-xs text-green-500">{t('emailValidation.available')}</p>
                            )}
                          </>
                        )}
                    </div>
                    <div className="grid gap-2 relative">
                        <label className="block text-sm mb-2">{t('labels.password')}</label>
                        <input
                            type="password"
                            name="new-password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => handlePasswordChange(e.target.value)}
                            placeholder={t('placeholders.enterNewPassword')}
                            className={`w-full bg-neutral-800 border rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:border-transparent
                                ${passwordStrength === 0 ? 'border-red-600 focus:ring-red-600' : ''}
                                ${passwordStrength === 1 ? 'border-orange-600 focus:ring-orange-600' : ''}
                                ${passwordStrength === 2 ? 'border-yellow-600 focus:ring-yellow-600' : ''}
                                ${passwordStrength === 3 ? 'border-green-600 focus:ring-green-600' : ''}
                                ${passwordStrength === 4 ? 'border-emerald-600 focus:ring-emerald-600' : ''}
                                ${passwordStrength === null ? 'border-neutral-700 focus:ring-neutral-600' : ''}
                            `}
                        />
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
                          {passwordStrength === 0 && <p className="text-red-600">{t('password.veryWeak')}&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({passwordFeedback})</span></p>}
                          {passwordStrength === 1 && <p className="text-orange-600">{t('password.weak')}&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({passwordFeedback})</span></p>}
                          {passwordStrength === 2 && <p className="text-yellow-600">{t('password.okay')}&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({passwordFeedback})</span></p>}
                          {passwordStrength === 3 && <p className="text-green-600">{t('password.strong')}</p>}
                          {passwordStrength === 4 && <p className="text-emerald-600">{t('password.veryStrong')}</p>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('password.onlyEnterToChange')}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm mb-2">{t('labels.role')}</label>
                        <Select value={role} onValueChange={setRole}>
                          <SelectTrigger className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map(r => (
                              <SelectItem key={r} value={r}>{t(`roles.${r}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                </div>
            </TabsContent>

            {/* Login History Tab */}
            <TabsContent value="loginHistory" className="mt-6">
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{t('sections.loginHistory')}</h3>
                        <Input
                            placeholder={t('placeholders.filterSessions')}
                            value={sessionsFilter}
                            onChange={(e) => {
                                setSessionsFilter(e.target.value);
                                setSessionsCurrentPage(1);
                            }}
                            className="max-w-sm"
                        />
                    </div>

                    {sessionsLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {tc('loading')}...
                        </div>
                    ) : filteredSessions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {sessionsFilter ? t('empty.noSessionsMatch') : t('empty.noSessions')}
                        </div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('sessionLabels.device')}</TableHead>
                                        <TableHead>{t('sessionLabels.location')}</TableHead>
                                        <TableHead>{t('sessionLabels.created')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentSessions.map((session) => (
                                        <TableRow key={session.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {parseUserAgent(session.userAgent)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {formatLocation(session)}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {formatDateTime(session.createdAt)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {sessionsTotalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-sm text-muted-foreground">
                                        {t('pagination.showingSessions', { start: sessionsStartIndex + 1, end: Math.min(sessionsEndIndex, filteredSessions.length), total: filteredSessions.length })}
                                    </div>
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() => setSessionsCurrentPage(prev => Math.max(prev - 1, 1))}
                                                    className={sessionsCurrentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                />
                                            </PaginationItem>
                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-1">
                                                    {Array.from({ length: sessionsTotalPages }, (_, i) => i + 1).map((page) => (
                                                        <PaginationItem key={page}>
                                                            <PaginationLink
                                                                onClick={() => setSessionsCurrentPage(page)}
                                                                isActive={sessionsCurrentPage === page}
                                                                className="cursor-pointer"
                                                            >
                                                                {page}
                                                            </PaginationLink>
                                                        </PaginationItem>
                                                    ))}
                                                </div>
                                                <PaginationItem>
                                                    <PaginationNext
                                                        onClick={() => setSessionsCurrentPage(prev => Math.min(prev + 1, sessionsTotalPages))}
                                                        className={sessionsCurrentPage === sessionsTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                    />
                                                </PaginationItem>
                                            </div>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="mt-6">
                <div className="space-y-6 max-w-2xl">
                    <div>
                        <h3 className="text-lg font-semibold mb-4">{t('sections.userActions')}</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            {t('sections.userActionsDescription')}
                        </p>
                    </div>

                    {/* Two-Factor Authentication Section */}
                    <div className="border border-neutral-700 rounded-lg p-4">
                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    {selectedUser?.twoFactorEnabled
                                        ? <ShieldCheck className="h-5 w-5 text-green-500" />
                                        : <ShieldOff className="h-5 w-5 text-muted-foreground" />
                                    }
                                    <h4 className="font-medium">{t('sections.twoFactorTitle')}</h4>
                                    {selectedUser?.twoFactorEnabled && (
                                        <span className="text-xs font-medium px-2 py-0.5 bg-green-900/30 text-green-400 border border-green-800 ml-2">
                                            {t('sections.twoFactorEnabled')}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {selectedUser?.twoFactorEnabled
                                        ? t('sections.twoFactorEnabledDescription')
                                        : t('sections.twoFactorDisabledDescription')
                                    }
                                </p>
                            </div>

                            {/* Enable 2FA Button */}
                            {!selectedUser?.twoFactorEnabled && !twoFaShowSetup && (
                                <Button
                                    variant="default"
                                    disabled={twoFaEnabling}
                                    onClick={() => {
                                        setTwoFaConfirmChecked(false);
                                        setTwoFaConfirmDialogOpen(true);
                                    }}
                                    className="shrink-0"
                                >
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    {t('buttons.enable2FA')}
                                </Button>
                            )}

                            {/* Disable 2FA Button */}
                            {selectedUser?.twoFactorEnabled && !twoFaShowSetup && (
                                <Button
                                    variant="outline"
                                    onClick={async () => {
                                        try {
                                            const res = await fetch(`/api/user/${selectedUser.id}/disable-2fa`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                toast.success(t('toast.twoFactorDisabled'));
                                                // Update local state
                                                setUsers(prev => prev.map(u =>
                                                    u.id === selectedUser.id ? { ...u, twoFactorEnabled: false } : u
                                                ));
                                                setSelectedUser({ ...selectedUser, twoFactorEnabled: false });
                                            } else {
                                                toast.error(data.error || t('toast.twoFactorDisableError'));
                                            }
                                        } catch (error) {
                                            console.error('Failed to disable 2FA:', error);
                                            toast.error(t('toast.twoFactorDisableError'));
                                        }
                                    }}
                                    className="shrink-0"
                                >
                                    <ShieldOff className="w-4 h-4 mr-2" />
                                    {t('buttons.disable2FA')}
                                </Button>
                            )}
                        </div>

                        {/* 2FA Setup - QR Code and Backup Codes */}
                        {twoFaShowSetup && (
                            <div className="mt-6 pt-6 border-t border-neutral-700 space-y-6">
                                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                                    <p className="text-sm text-yellow-200">
                                        {t('twoFactor.shareWithUser')}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    {/* QR Code */}
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-3">{t('twoFactor.scanQrCode')}</p>
                                        <div className="bg-white p-4 inline-block rounded">
                                            <QRCodeSVG value={twoFaTotpURI} size={180} />
                                        </div>
                                    </div>

                                    {/* Backup Codes */}
                                    <div>
                                        <p className="text-sm text-muted-foreground mb-3">{t('twoFactor.backupCodes')}</p>
                                        <div className="bg-neutral-800 border border-neutral-700 p-4 font-mono text-sm space-y-1 rounded">
                                            {twoFaBackupCodes.map((code, i) => (
                                                <div key={i} className="text-neutral-200">{code}</div>
                                            ))}
                                        </div>
                                        <Button
                                            onClick={() => {
                                                navigator.clipboard.writeText(twoFaBackupCodes.join('\n'));
                                                toast.success(t('toast.backupCodesCopied'));
                                            }}
                                            variant="outline"
                                            className="mt-3"
                                        >
                                            <Copy className="h-4 w-4 mr-2" />
                                            {t('buttons.copyBackupCodes')}
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => {
                                        setTwoFaShowSetup(false);
                                        setTwoFaTotpURI("");
                                        setTwoFaBackupCodes([]);
                                    }}
                                    variant="default"
                                >
                                    {t('buttons.done')}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="border border-destructive/30 rounded-lg p-4 bg-destructive/5">
                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <h4 className="font-medium text-destructive mb-1">{t('sections.deleteUserTitle')}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {t('sections.deleteUserDescription')}
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={() => setUserToDelete(selectedUser.id)}
                                className="shrink-0 cursor-pointer"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('buttons.deleteUser')}
                            </Button>
                        </div>
                    </div>
                </div>
            </TabsContent>
        </Tabs>
    </div>
    </>
)}

{/* ── Fixed save bar ── */}
{selectedUser && hasChanges && (
  <div className={`
    fixed bottom-0 left-0 right-0
    bg-background border-t border-neutral-800
    px-6 py-3
    flex justify-end items-center gap-3
    transition-transform duration-300 ease-in-out
    ${hasChanges ? 'translate-y-0' : 'translate-y-full'}
  `}>
    <Button
      variant="secondary"
      onClick={() => {
        setName(selectedUser.name || "");
        setNickname(selectedUser.nickname || "");
        setEmail(selectedUser.email || "");
        setRole(selectedUser.role || "USER");
        setPassword("");
        setHasChanges(false);
        setEmailValid(0);
        setPasswordStrength(null);
        setPasswordFeedback("");
        setPasswordTouched(false);
      }}
      disabled={isSaving}
      className="rounded-none"
    >
      {tc('buttons.cancel')}
    </Button>

    <Button
      variant="default"
      onClick={handleSave}
      disabled={
        isSaving
        || !hasChanges
        || emailValid !== 0
        || (!!password && (passwordStrength === null || passwordStrength < 3))
      }
    >
      {isSaving ? tc('buttons.saving') : tc('buttons.saveChanges')}
    </Button>
  </div>
)}

</div>
</>
    );
}
