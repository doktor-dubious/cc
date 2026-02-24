'use client';

import { useUser }              from '@/context/UserContext';
import { useRouter }            from 'next/navigation';
import { useEffect, useState }  from 'react';
import { Trash2 }               from 'lucide-react';
import { Button }               from "@/components/ui/button";
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

        const handleRefresh = () => fetchUsers();
        window.addEventListener('refreshPage', handleRefresh);
        return () => window.removeEventListener('refreshPage', handleRefresh);
    }, [user]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // POPULATE FORM WHEN USER SELECTED
    useEffect(() =>
    {
        if (selectedUser)
        {
            setName(selectedUser.name || "");
            setNickname(selectedUser.nickname || "");
            setEmail(selectedUser.email || "");
            setRole(selectedUser.role || "USER");
            setPassword(""); // Always clear password
        }
        else
        {
            setName("");
            setNickname("");
            setEmail("");
            setRole("USER");
            setPassword("");
        }
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
        const nicknameChanged = nickname.trim() !== (selectedUser.nickname || "").trim();
        const emailChanged    = email.trim() !== (selectedUser.email || "").trim();
        const roleChanged     = role !== (selectedUser.role || "USER");
        const passwordChanged = password.length > 0;

        setHasChanges(nameChanged || nicknameChanged || emailChanged || roleChanged || passwordChanged);
    }, [name, nickname, email, role, password, selectedUser]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // RESET TO PAGE 1 WHEN FILTER CHANGES
    useEffect(() =>
    {
        setCurrentPage(1);
    }, [filterText]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // ROW CLICK
    const handleRowClick = (u: any) =>
    {
        setSelectedUser(u);
        setActiveTab("details");
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
        setIsNewDialogOpen(true);
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // CREATE USER
    const handleCreate = async () =>
    {
        if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) return;

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
    // FILTER & PAGINATION
    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(filterText.toLowerCase()) ||
        u.nickname?.toLowerCase().includes(filterText.toLowerCase()) ||
        u.email.toLowerCase().includes(filterText.toLowerCase())
    );

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentUsers = filteredUsers.slice(startIndex, endIndex);

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
        { header: 'Nickname', accessor: 'nickname' },
        { header: 'Email', accessor: 'email' },
        { header: 'Role', accessor: 'role' },
    ];

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // LOADING STATES
    if (!user) return <div>Loading...</div>;
    if (user.role !== 'SUPER_ADMIN') return null;
    if (loading) return <div>Loading logins...</div>;

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // DOM
    return (
<>

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
        <label className="block text-sm">{t('labels.nickname')}</label>
        <input
          type="text"
          value={newNickname}
          onChange={(e) => setNewNickname(e.target.value)}
          placeholder={t('placeholders.enterNickname')}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
        />
      </div>

      <div className="grid gap-2">
        <label className="block text-sm">{t('labels.email')}</label>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder={t('placeholders.enterEmail')}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
        />
      </div>

      <div className="grid gap-2">
        <label className="block text-sm">{t('labels.password')}</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={t('placeholders.enterPassword')}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
        />
      </div>

      <div className="grid gap-2">
        <label className="block text-sm">{t('labels.role')}</label>
        <Select value={newRole} onValueChange={setNewRole}>
          <SelectTrigger className="bg-neutral-800 border border-neutral-700 rounded-none">
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
        disabled={!newName.trim() || !newEmail.trim() || !newPassword.trim() || isSaving}
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
                <TableHead>{t('labels.name')}</TableHead>
                <TableHead>{t('labels.nickname')}</TableHead>
                <TableHead>{t('labels.email')}</TableHead>
                <TableHead className="w-32 text-center">{t('labels.role')}</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
{currentUsers.length === 0 ? (
            <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
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
            >
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.nickname}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell className="w-32 text-center">
                    <Badge className={`${getRoleBadge(u.role)} text-white text-xs`}>
                        {t(`roles.${u.role}`)}
                    </Badge>
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

    {/* ── Detail Section with TABS ── */}
{selectedUser && (
    <>
    <div>
        <hr className="my-8" />

        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full" id="edit-form">
            <div className="relative w-full">
                <TabsList className="w-full bg-transparent border-b border-neutral-700 rounded-none p-0 h-auto grid grid-cols-2">
                    <TabsTrigger
                        className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                        value="details"
                    >
                        {t('tabs.details')}
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
                    className="absolute bottom-0 h-0.5 bg-primary transition-all duration-200 ease-in-out"
                    style={{
                        width: '50%',
                        left: activeTab === 'details' ? '0%' : '50%'
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
                    <div>
                        <label className="block text-sm mb-2">{t('labels.nickname')}</label>
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder={t('placeholders.enterNickname')}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-2">{t('labels.email')}</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('placeholders.enterEmail')}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-2">{t('labels.newPassword')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('placeholders.enterNewPassword')}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm mb-2">{t('labels.role')}</label>
                        <Select value={role} onValueChange={setRole}>
                          <SelectTrigger className="bg-neutral-800 border border-neutral-700 rounded-none">
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

            {/* Actions Tab */}
            <TabsContent value="actions" className="mt-6">
                <div className="space-y-6 max-w-2xl">
                    <div>
                        <h3 className="text-lg font-semibold mb-4">{t('sections.userActions')}</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            {t('sections.userActionsDescription')}
                        </p>
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
                                className="shrink-0"
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
      }}
      disabled={isSaving}
      className="rounded-none"
    >
      {tc('buttons.cancel')}
    </Button>

    <Button
      variant="default"
      onClick={handleSave}
      disabled={isSaving || !hasChanges}
    >
      {isSaving ? tc('buttons.saving') : tc('buttons.saveChanges')}
    </Button>
  </div>
)}

</div>
</>
    );
}
