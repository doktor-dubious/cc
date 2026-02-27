'use client';

import { useUser }                              from '@/context/UserContext';
import { useOrganization }                      from '@/context/OrganizationContext';
import { useRouter }                            from 'next/navigation';
import { useEffect, useState }                  from 'react';
import { useTranslations }                      from 'next-intl';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ExportMenu } from '@/components/ui/export-menu';
import type { ExportColumn } from '@/lib/export';
import { Star, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function MessagePage()
{
    const user = useUser();
    const { activeOrganization } = useOrganization();
    const router = useRouter();

    const t = useTranslations('Message');
    const tc = useTranslations('Common');

    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Search / Pagination
    const [filterText, setFilterText] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 8;

    // Message modal
    const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

    // Delete
    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Stars, selection, sorting
    const [starredMessageIds, setStarredMessageIds] = useState<Set<string>>(new Set());
    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH MESSAGES
    const fetchMessages = async () =>
    {
        if (!activeOrganization) return;

        try
        {
            const res = await fetch(`/api/message/all?organizationId=${activeOrganization.id}`);
            const data = await res.json();
            if (!data.success)
            {
                throw new Error(data.error || 'Failed to fetch messages');
            }
            setMessages(data.data);
        }
        catch (err: any)
        {
            console.error("Fetch messages error:", err);
            toast.error(t('toast.loadError'));
        }
        finally
        {
            setLoading(false);
        }
    };

    // FETCH STARRED MESSAGES
    const fetchStarredMessages = async () =>
    {
        if (!activeOrganization) return;

        try
        {
            const res = await fetch(`/api/message-star?organizationId=${activeOrganization.id}`);
            const data = await res.json();
            if (data.success)
            {
                setStarredMessageIds(new Set(data.data));
            }
        }
        catch (err)
        {
            console.error("Fetch starred messages error:", err);
        }
    };

    useEffect(() =>
    {
        if (activeOrganization)
        {
            setLoading(true);
            fetchMessages();
            fetchStarredMessages();
        }
    }, [activeOrganization]);

    // Listen for page refresh events
    useEffect(() =>
    {
        const handleRefresh = () => {
            fetchMessages();
            fetchStarredMessages();
        };
        window.addEventListener('refreshPage', handleRefresh);
        return () => window.removeEventListener('refreshPage', handleRefresh);
    }, [activeOrganization]);

    // Reset page when filter changes
    useEffect(() =>
    {
        setCurrentPage(1);
    }, [filterText]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // TOGGLE STAR (API call)
    const toggleStarApi = async (messageId: string) =>
    {
        try
        {
            const res = await fetch('/api/message-star', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId }),
            });
            const data = await res.json();
            if (!data.success)
            {
                console.error('Failed to toggle star:', data.message);
                toast.error(t('toast.starError'));
                return;
            }
            // Update local state based on response
            setStarredMessageIds(prev => {
                const newSet = new Set(prev);
                if (data.starred) {
                    newSet.add(messageId);
                } else {
                    newSet.delete(messageId);
                }
                return newSet;
            });
        }
        catch (err)
        {
            console.error("Toggle star error:", err);
            toast.error(t('toast.starError'));
        }
    };

    const toggleStar = (messageId: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        toggleStarApi(messageId);
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // VIEW MESSAGE
    const handleViewMessage = async (message: any) =>
    {
        setSelectedMessage(message);
        setIsMessageModalOpen(true);

        // Mark as read if unread
        if (!message.isRead)
        {
            try
            {
                await fetch(`/api/message/${message.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isRead: true }),
                });

                setMessages(prev =>
                    prev.map(m => m.id === message.id ? { ...m, isRead: true } : m)
                );
            }
            catch (err)
            {
                console.error("Mark as read error:", err);
            }
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // DELETE MESSAGE
    const handleDelete = async () =>
    {
        if (!messageToDelete) return;

        setIsDeleting(true);

        try
        {
            const res = await fetch(`/api/message/${messageToDelete}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok)
            {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete message');
            }

            const data = await res.json();
            if (!data.success)
            {
                throw new Error(data.error || 'Failed to delete message');
            }

            // Optimistic update
            setMessages(prev => prev.filter(m => m.id !== messageToDelete));

            // Close modal if the deleted message was being viewed
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
            toast.error(err.message || t('toast.deleteError'));
        }
        finally
        {
            setIsDeleting(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SELECTION HELPERS
    const toggleMessageSelection = (messageId: string, e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        setSelectedMessageIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(messageId)) {
                newSet.delete(messageId);
            } else {
                newSet.add(messageId);
            }
            return newSet;
        });
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SORTING
    const handleSort = (key: string) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIcon = (key: string) => {
        if (sortConfig?.key !== key) {
            return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50" />;
        }
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="ml-1 h-3 w-3 inline" />
            : <ArrowDown className="ml-1 h-3 w-3 inline" />;
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FILTER, SORT & PAGINATION
    const filteredMessages = messages
        .filter((message) =>
            message.content.toLowerCase().includes(filterText.toLowerCase()) ||
            (message.task?.name || '').toLowerCase().includes(filterText.toLowerCase()) ||
            (message.sender?.name || '').toLowerCase().includes(filterText.toLowerCase())
        )
        .sort((a, b) => {
            if (!sortConfig) return 0;
            const { key, direction } = sortConfig;
            const multiplier = direction === 'asc' ? 1 : -1;

            if (key === 'message') {
                return multiplier * a.content.localeCompare(b.content);
            }
            if (key === 'task') {
                const aTask = a.task?.name || '';
                const bTask = b.task?.name || '';
                return multiplier * aTask.localeCompare(bTask);
            }
            if (key === 'sender') {
                const aSender = a.type === 'SYSTEM' ? 'System' : (a.sender?.name || 'Unknown');
                const bSender = b.type === 'SYSTEM' ? 'System' : (b.sender?.name || 'Unknown');
                return multiplier * aSender.localeCompare(bSender);
            }
            if (key === 'date') {
                return multiplier * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            }
            if (key === 'star') {
                const aStarred = starredMessageIds.has(a.id) ? 1 : 0;
                const bStarred = starredMessageIds.has(b.id) ? 1 : 0;
                return multiplier * (bStarred - aStarred); // Starred first when ascending
            }
            return 0;
        });

    const totalPages = Math.ceil(filteredMessages.length / perPage);
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    const currentMessages = filteredMessages.slice(startIndex, endIndex);

    // Selection helpers
    const allCurrentSelected = currentMessages.length > 0 && currentMessages.every(m => selectedMessageIds.has(m.id));
    const someCurrentSelected = currentMessages.some(m => selectedMessageIds.has(m.id)) && !allCurrentSelected;

    const selectAllCurrent = () => {
        setSelectedMessageIds(prev => {
            const newSet = new Set(prev);
            currentMessages.forEach(m => newSet.add(m.id));
            return newSet;
        });
    };

    const deselectAllCurrent = () => {
        setSelectedMessageIds(prev => {
            const newSet = new Set(prev);
            currentMessages.forEach(m => newSet.delete(m.id));
            return newSet;
        });
    };

    const selectStarred = () => {
        setSelectedMessageIds(prev => {
            const newSet = new Set(prev);
            filteredMessages.filter(m => starredMessageIds.has(m.id)).forEach(m => newSet.add(m.id));
            return newSet;
        });
    };

    const exportColumns: ExportColumn[] = [
        { header: 'Message', accessor: 'content' },
        { header: 'Task', accessor: (row: any) => row.task?.name || '' },
        { header: 'Sender', accessor: (row: any) => row.sender?.name || 'System' },
        { header: 'Date', accessor: (row: any) => new Date(row.createdAt).toLocaleString() },
        { header: 'Starred', accessor: (row: any) => starredMessageIds.has(row.id) ? 'Yes' : 'No' },
    ];

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // RENDER

    if (!user) return null;

    return (
      <>

{/* View full message modal */}
<Dialog open={isMessageModalOpen} onOpenChange={setIsMessageModalOpen}>
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
        {selectedMessage?.task && (
          <span className="ml-2">— {t('dialogs.taskLabel', { name: selectedMessage.task.name })}</span>
        )}
      </DialogDescription>
    </DialogHeader>
    <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2">
      <p className="text-sm whitespace-pre-wrap">{selectedMessage?.content}</p>
    </div>
    <div className="flex justify-end mt-4">
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          setMessageToDelete(selectedMessage?.id);
        }}
      >
        {t('buttons.delete')}
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* Delete confirmation */}
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
        {t('dialogs.deleteDescription')}
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

      <div className="space-y-8 p-6">

        <div className="flex justify-end gap-2">
          <Input
            placeholder={t('placeholders.filter')}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-sm"
          />
          <ExportMenu data={filteredMessages} columns={exportColumns} filename="messages" />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              {/* Checkbox column with dropdown */}
              <TableHead className="w-12">
                <div className="flex items-center gap-1">
                  <Checkbox
                    checked={allCurrentSelected}
                    ref={(el) => {
                      if (el) (el as any).indeterminate = someCurrentSelected;
                    }}
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
                      <DropdownMenuItem onClick={selectStarred}>
                        <Star className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400" />
                        {tc('selection.starred')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableHead>
              {/* Message column - sortable */}
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('message')}
              >
                {t('table.message')}
                {getSortIcon('message')}
              </TableHead>
              {/* Task column - sortable */}
              <TableHead
                className="w-48 cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('task')}
              >
                {t('table.task')}
                {getSortIcon('task')}
              </TableHead>
              {/* Sender column - sortable */}
              <TableHead
                className="w-40 cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('sender')}
              >
                {t('table.sender')}
                {getSortIcon('sender')}
              </TableHead>
              {/* Date column - sortable */}
              <TableHead
                className="w-44 cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('date')}
              >
                {t('table.date')}
                {getSortIcon('date')}
              </TableHead>
              {/* Star column - sortable */}
              <TableHead
                className="w-12 cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSort('star')}
              >
                {getSortIcon('star')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t('empty.loading')}
                </TableCell>
              </TableRow>
            ) : currentMessages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {filterText ? t('empty.noMessagesMatch') : t('empty.noMessagesFound')}
                </TableCell>
              </TableRow>
            ) : (
              currentMessages.map((message) => (
                <TableRow
                  key={message.id}
                  className={`
                    cursor-pointer transition-colors
                    ${!message.isRead ? "font-semibold" : ""}
                    hover:bg-muted/50
                  `}
                  onClick={() => handleViewMessage(message)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleStar(message.id);
                  }}
                >
                  {/* Checkbox cell */}
                  <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedMessageIds.has(message.id)}
                      onCheckedChange={() => toggleMessageSelection(message.id)}
                    />
                  </TableCell>
                  {/* Message cell */}
                  <TableCell className="max-w-md">
                    <div className="flex items-center gap-2">
                      {!message.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0"></div>
                      )}
                      {message.type === 'SYSTEM' && (
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 shrink-0">
                          {t('badges.system')}
                        </Badge>
                      )}
                      <span className="truncate">{message.content}</span>
                    </div>
                  </TableCell>
                  {/* Task cell */}
                  <TableCell className="w-48 truncate">{message.task?.name || '-'}</TableCell>
                  {/* Sender cell */}
                  <TableCell className="w-40 truncate">
                    {message.type === 'SYSTEM' ? t('badges.system') : (message.sender?.name || 'Unknown')}
                  </TableCell>
                  {/* Date cell */}
                  <TableCell className="w-44 text-muted-foreground text-sm">
                    {new Date(message.createdAt).toLocaleString()}
                  </TableCell>
                  {/* Star cell */}
                  <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => toggleStar(message.id, e)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          starredMessageIds.has(message.id)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground hover:text-yellow-400'
                        }`}
                      />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {t('pagination.showing', { start: startIndex + 1, end: Math.min(endIndex, filteredMessages.length), total: filteredMessages.length })}
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
      </div>
      </>
    );
}
