'use client';

import { useUser }                              from '@/context/UserContext';
import { useOrganization }                      from '@/context/OrganizationContext';
import { useRouter }                            from 'next/navigation';
import { useEffect, useState }                  from 'react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

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

export default function MessagePage()
{
    const user = useUser();
    const { activeOrganization } = useOrganization();
    const router = useRouter();

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
    const [messageToDelete, setMessageToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
            toast.error("Could not load messages");
        }
        finally
        {
            setLoading(false);
        }
    };

    useEffect(() =>
    {
        if (activeOrganization)
        {
            setLoading(true);
            fetchMessages();
        }
    }, [activeOrganization]);

    // Listen for page refresh events
    useEffect(() =>
    {
        const handleRefresh = () => fetchMessages();
        window.addEventListener('refreshPage', handleRefresh);
        return () => window.removeEventListener('refreshPage', handleRefresh);
    }, [activeOrganization]);

    // Reset page when filter changes
    useEffect(() =>
    {
        setCurrentPage(1);
    }, [filterText]);

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

            toast.success("Message deleted successfully");
            setMessageToDelete(null);
        }
        catch (err: any)
        {
            console.error("Delete message error:", err);
            toast.error(err.message || "Could not delete message");
        }
        finally
        {
            setIsDeleting(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FILTER & PAGINATION
    const filteredMessages = messages.filter((message) =>
        message.content.toLowerCase().includes(filterText.toLowerCase()) ||
        (message.task?.name || '').toLowerCase().includes(filterText.toLowerCase()) ||
        (message.sender?.name || '').toLowerCase().includes(filterText.toLowerCase())
    );

    const totalPages = Math.ceil(filteredMessages.length / perPage);
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    const currentMessages = filteredMessages.slice(startIndex, endIndex);

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
            System
          </Badge>
        ) : (
          <span>Message from {selectedMessage?.sender?.name || 'Unknown User'}</span>
        )}
      </DialogTitle>
      <DialogDescription>
        {selectedMessage && new Date(selectedMessage.createdAt).toLocaleString()}
        {selectedMessage?.task && (
          <span className="ml-2">— Task: {selectedMessage.task.name}</span>
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
        Delete
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
      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete this message.
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

      <div className="space-y-8 p-6">

        <div className="flex justify-end">
          <Input
            placeholder="Filter by message, task or sender..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 text-right">ID</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-48">Task</TableHead>
              <TableHead className="w-40">Sender</TableHead>
              <TableHead className="w-44">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading messages...
                </TableCell>
              </TableRow>
            ) : currentMessages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {filterText ? "No messages match your filter" : "No messages found"}
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
                >
                  <TableCell className="w-20 text-right tabular-nums">{message.id}</TableCell>
                  <TableCell className="max-w-md">
                    <div className="flex items-center gap-2">
                      {!message.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0"></div>
                      )}
                      {message.type === 'SYSTEM' && (
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 shrink-0">
                          System
                        </Badge>
                      )}
                      <span className="truncate">{message.content}</span>
                    </div>
                  </TableCell>
                  <TableCell className="w-48 truncate">{message.task?.name || '-'}</TableCell>
                  <TableCell className="w-40 truncate">
                    {message.type === 'SYSTEM' ? 'System' : (message.sender?.name || 'Unknown')}
                  </TableCell>
                  <TableCell className="w-44 text-muted-foreground text-sm">
                    {new Date(message.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredMessages.length)} of {filteredMessages.length} messages
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
