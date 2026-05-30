'use client';

import { useEffect, useRef, useState }                              from 'react';
import { useUser }                                                  from '@/context/UserContext';
import { Badge }                                                    from '@/components/ui/badge';
import { Button }                                                   from '@/components/ui/button';
import { Separator }                                                from '@/components/ui/separator';
import { Textarea }                                                 from '@/components/ui/textarea';
import { DataTableShell, type DataColumn }                          from '@/components/ui/data-table-shell';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent }                                    from '@/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput }             from '@/components/ui/input-group';
import { Paperclip, Send }                                          from 'lucide-react';
import { toast }                                                    from 'sonner';
import { MaximizeIcon }                                             from '@/components/animate-ui/icons/maximize';
import { XIcon }                                                    from '@/components/animate-ui/icons/x';
import { AnimateIcon }                                              from '@/components/animate-ui/icons/icon';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProfileRef {
    id: string;
    name: string;
}

interface ArtifactRef {
    id: string;
    name: string;
    originalName: string | null;
    mimeType: string | null;
    size: string | null;
    createdAt: string;
}

interface TaskMessage {
    id: string;
    content: string;
    type: string;
    origin: string;
    assetName: string | null;
    requestType: string | null;
    isRead: boolean;
    createdAt: string;
    sender: { id: string; name: string } | null;
}

interface TaskRef {
    id: string;
    name: string;
    description: string | null;
    expectedEvidence: string | null;
    status: string;
    endAt: string | null;
    organization: { id: string; name: string } | null;
    taskProfiles: { profile: ProfileRef }[];
    taskArtifacts: { artifact: ArtifactRef }[];
    messages: TaskMessage[];
}

interface AttentionMessage {
    id: string;
    content: string;
    type: 'NOTE' | 'REPLY' | 'REQUEST';
    origin: 'USER' | 'SYSTEM';
    assetName: string | null;
    requestType: string | null;
    replyId: string | null;
    replyTo: string | null;
    createdAt: string;
    sender: { id: string; name: string; email: string } | null;
    replyToProfile: ProfileRef | null;
    task: TaskRef;
}

interface PendingEvidence {
    id: string;
    taskId: string;
    artifactId: string | null;
    approved: boolean;
    createdAt: string;
    artifact: ArtifactRef | null;
    createdBy: ProfileRef;
    messages: { id: string; content: string; createdAt: string; sender: { id: string; name: string; email: string } | null }[];
    task: TaskRef;
}

type AttentionItem =
    | { kind: 'message'; data: AttentionMessage }
    | { kind: 'evidence'; data: PendingEvidence };

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string
{
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatDate(dateStr: string | null): string
{
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusLabel(status: string): string
{
    switch (status)
    {
        case 'NOT_STARTED': return 'Not started';
        case 'OPEN':        return 'In progress';
        case 'COMPLETED':   return 'Completed';
        case 'CLOSED':      return 'Closed';
        default:            return status;
    }
}

function statusBadgeClass(status: string): string
{
    const styles: Record<string, string> = {
        NOT_STARTED : 'bg-[var(--color-status-not-started)]',
        OPEN        : 'bg-[var(--color-status-open)]',
        COMPLETED   : 'bg-[var(--color-status-completed)]',
        CLOSED      : 'bg-[var(--color-status-closed)]',
    };
    return styles[status] || '';
}

function attentionTypeLabel(item: AttentionItem): 'Evidence' | 'Chat' | 'Request'
{
    if (item.kind === 'evidence') return 'Evidence';
    if (item.data.type === 'REQUEST') return 'Request';
    return 'Chat';
}

function attentionTypeDisplayLabel(item: AttentionItem): string
{
    if (item.kind === 'evidence') return 'Evidence';
    if (item.kind === 'message' && item.data.type === 'REQUEST')
    {
        switch (item.data.requestType)
        {
            case 'CLOSE':     return 'Close Request';
            case 'PAUSE':     return 'Pause Request';
            case 'POSTPONE':  return 'Postponement Request';
            case 'REOPEN':    return 'Reopen Request';
            default:          return 'Request';
        }
    }
    return 'Chat';
}

function attentionTypeBadgeClass(type: 'Evidence' | 'Chat' | 'Request'): string
{
    switch (type)
    {
        case 'Evidence': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30';
        case 'Chat':     return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30';
        case 'Request':  return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30';
    }
}

function actionLabel(type: 'Evidence' | 'Chat' | 'Request'): string
{
    return type === 'Chat' ? 'Reply' : 'Review';
}

// Classify a task by the type of its most recent message.
// Tasks with no messages default to "Chat" so they remain selectable in the
// "Select Chat" dropdown filter.
function taskTypeFromMessages(task: TaskRef): 'Chat' | 'Evidence' | 'Request'
{
    const sorted = [...task.messages].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const latest = sorted[0];
    if (!latest)                            return 'Chat';
    if (latest.type === 'REQUEST')          return 'Request';
    if (latest.type.startsWith('EVIDENCE')) return 'Evidence';
    return 'Chat';
}

// ── Table column configs ─────────────────────────────────────────────────────

type AttentionRow = { latest: AttentionItem; count: number };

function attentionRowKey({ latest }: AttentionRow): string
{
    return `${latest.data.task.id}:${attentionTypeLabel(latest)}`;
}

const attentionColumns: DataColumn<AttentionRow>[] = [
    {
        key:           'client',
        label:         'Client',
        sortable:      true,
        width:         'w-48',
        sortValue:     ({ latest }) => latest.data.task.organization?.name?.toLowerCase() ?? '',
        cellClassName: 'text-blue-600 dark:text-blue-400 font-medium',
        render:        ({ latest }) => latest.data.task.organization?.name || '-',
    },
    {
        key:       'type',
        label:     'Type',
        sortable:  true,
        width:     'w-28',
        sortValue: ({ latest }) => attentionTypeLabel(latest),
        render:    ({ latest, count }) =>
        {
            const type         = attentionTypeLabel(latest);
            const displayLabel = attentionTypeDisplayLabel(latest);
            return (
                <div className="relative inline-flex">
                    <Badge variant="outline" className={`text-xs ${attentionTypeBadgeClass(type)}`}>
                        {displayLabel}
                    </Badge>
                    {count > 1 && (
                        <Badge variant="destructive" className="absolute -top-2 -right-3 h-5 px-2 text-xs">
                            {count}
                        </Badge>
                    )}
                </div>
            );
        },
    },
    {
        key:           'task',
        label:         'Task',
        sortable:      true,
        sortValue:     ({ latest }) => latest.data.task.name.toLowerCase(),
        cellClassName: 'text-muted-foreground truncate max-w-md',
        render:        ({ latest }) => latest.data.task.name,
    },
    {
        key:           'lastActivity',
        label:         'Last Activity',
        sortable:      true,
        width:         'w-36',
        sortValue:     ({ latest }) => new Date(latest.data.createdAt).getTime(),
        cellClassName: 'text-muted-foreground text-sm',
        render:        ({ latest }) => timeAgo(latest.data.createdAt),
    },
];

function buildTaskColumns(opts: { dueDateClass: string }): DataColumn<TaskRef>[]
{
    return [
        {
            key:           'client',
            label:         'Client',
            sortable:      true,
            width:         'w-48',
            sortValue:     (task) => task.organization?.name?.toLowerCase() ?? '',
            cellClassName: 'text-blue-600 dark:text-blue-400 font-medium',
            render:        (task) => task.organization?.name || '-',
        },
        {
            key:       'type',
            label:     'Type',
            sortable:  true,
            width:     'w-28',
            sortValue: (task) => taskTypeFromMessages(task),
            render:    (task) =>
            {
                const type = taskTypeFromMessages(task);
                return (
                    <Badge variant="outline" className={`text-xs ${attentionTypeBadgeClass(type)}`}>
                        {type}
                    </Badge>
                );
            },
        },
        {
            key:       'task',
            label:     'Task',
            sortable:  true,
            sortValue: (task) => task.name.toLowerCase(),
            render:    (task) => task.name,
        },
        {
            key:           'dueDate',
            label:         'Due Date',
            sortable:      true,
            width:         'w-36',
            sortValue:     (task) => task.endAt ? new Date(task.endAt).getTime() : 0,
            cellClassName: opts.dueDateClass,
            render:        (task) => formatDate(task.endAt),
        },
        {
            key:       'status',
            label:     'Status',
            sortable:  true,
            width:     'w-32',
            sortValue: (task) => task.status,
            render:    (task) => (
                <Badge variant="outline" className="text-xs">{statusLabel(task.status)}</Badge>
            ),
        },
    ];
}

const overdueColumns = buildTaskColumns({ dueDateClass: 'text-red-600 dark:text-red-400 font-medium' });
const dueSoonColumns = buildTaskColumns({ dueDateClass: 'font-medium' });

// ── Chat Bubbles ──────────────────────────────────────────────────────────────

function ChatBubbles({ messages, currentUserId }: { messages: TaskMessage[]; currentUserId: string })
{
    return (
        <>
            {messages.map((msg) =>
            {
                const isMe = msg.sender?.id === currentUserId;
                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div className={`
                                px-3 py-2 text-sm
                                ${isMe
                                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
                                    : 'bg-muted text-foreground rounded-2xl rounded-bl-sm'
                                }
                            `}>
                                {msg.content}
                            </div>
                            <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                <span className="text-[10px] text-muted-foreground">
                                    {msg.origin === 'SYSTEM' ? 'System' : (msg.sender?.name || 'Unknown')}
                                </span>
                                <span className="text-[10px] text-muted-foreground">{timeAgo(msg.createdAt)}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </>
    );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

function TaskDrawer({
    open,
    onOpenChange,
    task,
    attentionItem,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: TaskRef | null;
    attentionItem: AttentionItem | null;
})
{
    const user = useUser();
    const [responseNote, setResponseNote] = useState('');
    const [submitting, setSubmitting]     = useState(false);
    const [expanded, setExpanded]         = useState(false);
    const [localMessages, setLocalMessages] = useState<TaskMessage[]>([]);
    const chatRef = useRef<HTMLDivElement>(null);

    // Sync local messages from task prop when drawer opens or task changes
    useEffect(() => {
        if (task) setLocalMessages(task.messages);
    }, [task, open]);

    useEffect(() => { if (!open) { setResponseNote(''); setExpanded(false); } }, [open]);

    // Auto-scroll chat to bottom when messages change
    useEffect(() => {
        const el = chatRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [localMessages]);


    if (!task) return null;

    const profiles    = task.taskProfiles.map(tp => tp.profile);
    const orgName     = task.organization?.name || '-';
    const typeLabel   = attentionItem ? attentionTypeLabel(attentionItem) : null;

    // Evidence-specific data
    const evidenceData = attentionItem?.kind === 'evidence' ? attentionItem.data : null;
    const evidenceArtifact = evidenceData?.artifact || null;
    const evidenceMessage = evidenceData?.messages?.[0] || null;

    // Request-specific data
    const requestMessage = attentionItem?.kind === 'message' && attentionItem.data.type === 'REQUEST' ? attentionItem.data : null;
    const requestType = requestMessage?.requestType as 'CLOSE' | 'PAUSE' | 'POSTPONE' | 'REOPEN' | null;

    const requestTitle = requestType ? {
        CLOSE: `Close request for "${task.name}"`,
        PAUSE: `Pause request for "${task.name}"`,
        POSTPONE: `Postpone request for "${task.name}"`,
        REOPEN: `Reopen request for "${task.name}"`,
    }[requestType] : task.name;

    const requestApproveLabel = requestType ? {
        CLOSE: 'Approve closing',
        PAUSE: 'Approve pausing',
        POSTPONE: 'Approve postponing',
        REOPEN: 'Approve reopening',
    }[requestType] : 'Approve';

    const handleMarkAsRead = async () =>
    {
        setSubmitting(true);
        try
        {
            const unread = localMessages.filter(m => !m.isRead);
            await Promise.all(unread.map(m =>
                fetch(`/api/message/${m.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isRead: true }),
                })
            ));
            setLocalMessages(prev => prev.map(m => ({ ...m, isRead: true })));
            toast.success('Messages marked as read');
            onOpenChange(false);
        }
        catch
        {
            toast.error('Failed to mark as read');
        }
        finally
        {
            setSubmitting(false);
        }
    };

    const handleSend = async () =>
    {
        if (!responseNote.trim()) return;
        setSubmitting(true);
        try
        {
            const res = await fetch('/api/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: task.id,
                    content: responseNote.trim(),
                    origin: 'USER',
                    type: 'REPLY',
                    isRead: true,
                }),
            });

            const data = await res.json();
            if (data.success && data.data) {
                setLocalMessages(prev => [...prev, data.data]);
            }

            toast.success('Message sent');
            setResponseNote('');
        }
        catch
        {
            toast.error('Failed to send');
        }
        finally
        {
            setSubmitting(false);
        }
    };

    const handleEvidenceAction = async (action: 'approve' | 'request_changes') =>
    {
        if (!evidenceData) return;
        setSubmitting(true);
        try
        {
            const messageType = action === 'approve' ? 'EVIDENCE_APPROVED' : 'EVIDENCE_CHANGES';
            const content = responseNote.trim() || (action === 'request_changes' ? 'Changes requested.' : 'Approved.');

            await fetch('/api/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: task.id,
                    content,
                    origin: 'USER',
                    type: messageType,
                    evidenceId: evidenceData.id,
                }),
            });

            toast.success(action === 'approve' ? 'Approved' : 'Changes requested');
            onOpenChange(false);
        }
        catch
        {
            toast.error('Action failed');
        }
        finally
        {
            setSubmitting(false);
        }
    };

    const handleRequestAction = async (action: 'approve' | 'request_changes') =>
    {
        if (!requestMessage) return;
        setSubmitting(true);
        try
        {
            // Mark the request message as read
            await fetch(`/api/message/${requestMessage.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isRead: true }),
            });

            // Update task status if approving close or reopen
            if (action === 'approve' && (requestType === 'CLOSE' || requestType === 'REOPEN'))
            {
                const newStatus = requestType === 'CLOSE' ? 'CLOSED' : 'OPEN';
                await fetch(`/api/task/${task.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus }),
                });
            }

            // Post a reply message
            const content = responseNote.trim() || (action === 'approve' ? `${requestApproveLabel}.` : 'Changes requested.');
            await fetch('/api/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: task.id,
                    content,
                    origin: 'USER',
                    type: 'REPLY',
                    isRead: true,
                    replyId: requestMessage.id,
                }),
            });

            toast.success(action === 'approve' ? requestApproveLabel : 'Changes requested');
            onOpenChange(false);
        }
        catch
        {
            toast.error('Action failed');
        }
        finally
        {
            setSubmitting(false);
        }
    };

    const currentUserId = user?.id || '';

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="text-lg">{typeLabel === 'Request' ? requestTitle : task.name}</SheetTitle>
                        <SheetDescription>{orgName}</SheetDescription>
                    </SheetHeader>

                    <div className="px-4 pb-6 flex flex-col gap-6">
                        {/* ── Meta ─────────────────────────────────────────────── */}
                        <div className="grid grid-cols-2 gap-y-3 text-sm">
                            <div>
                                <span className="text-muted-foreground">Owner</span>
                                <p className="font-medium">{profiles.map(p => p.name).join(', ') || '-'}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Status</span>
                                <div className="mt-0.5">
                                    <Badge className={`text-xs text-white ${statusBadgeClass(task.status)}`}>{statusLabel(task.status)}</Badge>
                                </div>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Due date</span>
                                <p className={`font-medium ${task.endAt && new Date(task.endAt) < new Date() ? 'text-red-600 dark:text-red-400' : ''}`}>
                                    {formatDate(task.endAt)}
                                </p>
                            </div>
                        </div>

                        {/* ── Task Requirements ────────────────────────────────── */}
                        {(task.description || task.expectedEvidence) && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="font-semibold mb-3">Task Requirements</h3>
                                    <div className="space-y-3 text-sm">
                                        {task.description && (
                                            <p className="text-foreground">{task.description}</p>
                                        )}
                                        {task.expectedEvidence && (
                                            <p className="text-foreground">{task.expectedEvidence}</p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── Evidence (only for ASSET type) ───────────────────── */}
                        {typeLabel === 'Evidence' && (
                            <>
                                <Separator />
                                <div>
                                    <h3 className="font-semibold mb-3">Evidence</h3>
                                    <div className="rounded-lg border p-4">
                                        <div className="flex items-start gap-3">
                                            <Paperclip className="size-5 text-muted-foreground mt-1 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                {evidenceArtifact ? (
                                                    <>
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="font-medium">{evidenceArtifact.originalName || evidenceArtifact.name}</p>
                                                            <a
                                                                href={`/api/artifact/${evidenceArtifact.id}/preview`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 dark:text-blue-400 hover:underline text-sm shrink-0"
                                                            >
                                                                View
                                                            </a>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Uploaded {timeAgo(evidenceArtifact.createdAt)}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="font-medium">Evidence submitted</p>
                                                )}
                                                {evidenceMessage?.content && (
                                                    <p className="text-sm italic text-muted-foreground mt-2">
                                                        &quot;{evidenceMessage.content}&quot;
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── Convo (Chat only) ─────────────────────────────────── */}
                        {typeLabel === 'Chat' && (
                            <>
                                <Separator />
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold">Convo</h3>
                                        {localMessages.length > 0 && (
                                            <AnimateIcon animateOnHover>
                                                <MaximizeIcon
                                                    size={16}
                                                    className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                                    onClick={() => setExpanded(true)}
                                                />
                                            </AnimateIcon>
                                        )}
                                    </div>

                                    {/* Chat bubbles */}
                                    <div ref={chatRef} className="max-h-64 overflow-y-auto rounded-lg border p-3 bg-muted/10 space-y-3">
                                        {localMessages.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                                        ) : (
                                            <ChatBubbles messages={localMessages} currentUserId={currentUserId} />
                                        )}
                                    </div>

                                    {/* Inline reply */}
                                    <InputGroup className="mt-3 h-auto">
                                        <Textarea
                                            data-slot="input-group-control"
                                            className="min-h-20 flex-1 resize-none rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
                                            placeholder="Type a message..."
                                            value={responseNote}
                                            onChange={(e) => setResponseNote(e.target.value)}
                                        />
                                        <InputGroupAddon align="inline-end">
                                            <Send
                                                size={16}
                                                className={`cursor-pointer transition-colors ${submitting || !responseNote.trim() ? 'text-muted-foreground/30 pointer-events-none' : 'text-muted-foreground hover:text-foreground'}`}
                                                onClick={handleSend}
                                            />
                                        </InputGroupAddon>
                                    </InputGroup>

                                    {/* Mark as read */}
                                    <Button
                                        variant="default"
                                        className="w-full mt-3"
                                        disabled={submitting}
                                        onClick={handleMarkAsRead}
                                    >
                                        Mark message(s) as read
                                    </Button>
                                </div>
                            </>
                        )}

                        {/* ── Convo + Actions (Request only) ──────────────────────── */}
                        {typeLabel === 'Request' && (
                            <>
                                <Separator />
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold">Convo</h3>
                                        {localMessages.length > 0 && (
                                            <AnimateIcon animateOnHover>
                                                <MaximizeIcon
                                                    size={16}
                                                    className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                                    onClick={() => setExpanded(true)}
                                                />
                                            </AnimateIcon>
                                        )}
                                    </div>

                                    {/* Chat bubbles */}
                                    <div ref={chatRef} className="max-h-64 overflow-y-auto rounded-lg border p-3 bg-muted/10 space-y-3">
                                        {localMessages.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                                        ) : (
                                            <ChatBubbles messages={localMessages} currentUserId={currentUserId} />
                                        )}
                                    </div>

                                    {/* Inline reply */}
                                    <InputGroup className="mt-3 h-auto">
                                        <Textarea
                                            data-slot="input-group-control"
                                            className="min-h-20 flex-1 resize-none rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
                                            placeholder="Type a message..."
                                            value={responseNote}
                                            onChange={(e) => setResponseNote(e.target.value)}
                                        />
                                        <InputGroupAddon align="inline-end">
                                            <Send
                                                size={16}
                                                className={`cursor-pointer transition-colors ${submitting || !responseNote.trim() ? 'text-muted-foreground/30 pointer-events-none' : 'text-muted-foreground hover:text-foreground'}`}
                                                onClick={handleSend}
                                            />
                                        </InputGroupAddon>
                                    </InputGroup>

                                    {/* Request actions */}
                                    <div className="flex flex-col gap-2 mt-3">
                                        <Button
                                            variant="default"
                                            className="w-full"
                                            disabled={submitting}
                                            onClick={() => handleRequestAction('approve')}
                                        >
                                            {requestApproveLabel}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            disabled={submitting}
                                            onClick={() => handleRequestAction('request_changes')}
                                        >
                                            Request changes
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── Message input (Evidence only) ───────────────────────── */}
                        {typeLabel === 'Evidence' && (
                            <>
                                <Separator />
                                <Textarea
                                    className="min-h-20 resize-none"
                                    placeholder="Type a message..."
                                    value={responseNote}
                                    onChange={(e) => setResponseNote(e.target.value)}
                                />
                            </>
                        )}

                        {/* ── Actions (Evidence only) ────────────────────────────── */}
                        {typeLabel === 'Evidence' && <div className="flex flex-col gap-2 mt-2">
                            <Button
                                className="w-full"
                                disabled={submitting}
                                onClick={() => handleEvidenceAction('approve')}
                            >
                                Approve
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                disabled={submitting}
                                onClick={() => handleEvidenceAction('request_changes')}
                            >
                                Request changes
                            </Button>
                        </div>}
                    </div>
                </SheetContent>
            </Sheet>

            {/* ── Expanded Chat Modal ────────────────────────────────────────── */}
            <Dialog open={expanded} onOpenChange={setExpanded}>
                <DialogContent showCloseButton={false} className="max-w-2xl h-[80vh] flex flex-col p-0">
                    <div className="flex items-center justify-between px-6 py-4 border-b">
                        <div>
                            <h2 className="text-lg font-semibold">{task.name}</h2>
                            <p className="text-sm text-muted-foreground">{orgName}</p>
                        </div>
                        <AnimateIcon animateOnHover>
                            <XIcon
                                size={16}
                                className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                onClick={() => setExpanded(false)}
                            />
                        </AnimateIcon>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                        <ChatBubbles messages={localMessages} currentUserId={currentUserId} />
                    </div>
                    <div className="px-6 py-4 border-t">
                        <InputGroup className="h-auto">
                            <Textarea
                                data-slot="input-group-control"
                                className="min-h-20 flex-1 resize-none rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
                                placeholder="Type a message..."
                                value={responseNote}
                                onChange={(e) => setResponseNote(e.target.value)}
                            />
                            <InputGroupAddon align="inline-end">
                                <Send
                                    size={16}
                                    className={`cursor-pointer transition-colors ${submitting || !responseNote.trim() ? 'text-muted-foreground/30 pointer-events-none' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={handleSend}
                                />
                            </InputGroupAddon>
                        </InputGroup>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePage()
{
    const user = useUser();

    const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
    const [overdueTasks, setOverdueTasks]     = useState<TaskRef[]>([]);
    const [dueSoonTasks, setDueSoonTasks]     = useState<TaskRef[]>([]);
    const [loading, setLoading]               = useState(true);

    // Drawer state
    const [drawerOpen, setDrawerOpen]                   = useState(false);
    const [selectedTask, setSelectedTask]               = useState<TaskRef | null>(null);
    const [selectedItem, setSelectedItem]               = useState<AttentionItem | null>(null);

    const fetchData = async () =>
    {
        try
        {
            const res = await fetch('/api/action-center');
            const json = await res.json();
            if (json.success)
            {
                const messages: AttentionItem[] = (json.data.attentionMessages || []).map(
                    (m: AttentionMessage) => ({ kind: 'message' as const, data: m })
                );
                const evidence: AttentionItem[] = (json.data.pendingEvidence || []).map(
                    (e: PendingEvidence) => ({ kind: 'evidence' as const, data: e })
                );
                setAttentionItems([...messages, ...evidence]);
                setOverdueTasks(json.data.overdueTasks);
                setDueSoonTasks(json.data.dueSoonTasks);
            }
        }
        catch (error)
        {
            console.error('Failed to fetch action center data:', error);
        }
        finally
        {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAttentionClick = (item: AttentionItem) =>
    {
        const task = item.kind === 'message' ? item.data.task : item.data.task;
        setSelectedTask(task);
        setSelectedItem(item);
        setDrawerOpen(true);
    };

    // Open the drawer in the type-appropriate mode (Chat/Request/Evidence)
    // based on the row's classified type. First try to reuse an existing
    // AttentionItem (so Evidence rows wired to a real PendingEvidence record
    // get the full approve/reject UI); otherwise synthesize a minimal
    // message-kind item from the task's own messages so the drawer still
    // opens in Chat or Request mode. Evidence with no backing PendingEvidence
    // falls back to Chat — the evidence id needed for approve/reject isn't
    // reconstructable from TaskRef alone.
    const findExistingAttentionItem = (
        taskId: string,
        type: 'Chat' | 'Evidence' | 'Request',
    ): AttentionItem | null =>
    {
        const matches = attentionItems.filter(it =>
        {
            const itTaskId = it.kind === 'message' ? it.data.task.id : it.data.task.id;
            return itTaskId === taskId && attentionTypeLabel(it) === type;
        });
        if (matches.length === 0) return null;
        return matches.sort((a, b) =>
        {
            const aDate = a.kind === 'message' ? a.data.createdAt : a.data.createdAt;
            const bDate = b.kind === 'message' ? b.data.createdAt : b.data.createdAt;
            return new Date(bDate).getTime() - new Date(aDate).getTime();
        })[0];
    };

    const synthesizeAttentionItem = (
        task: TaskRef,
        type: 'Chat' | 'Evidence' | 'Request',
    ): AttentionItem | null =>
    {
        const sorted = [...task.messages].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const candidate = type === 'Request'
            ? sorted.find(m => m.type === 'REQUEST')
            : sorted[0];
        if (!candidate) return null;
        return {
            kind: 'message',
            data: {
                id:             candidate.id,
                content:        candidate.content,
                type:           candidate.type as 'NOTE' | 'REPLY' | 'REQUEST',
                origin:         candidate.origin as 'USER' | 'SYSTEM',
                assetName:      candidate.assetName,
                requestType:    candidate.requestType,
                replyId:        null,
                replyTo:        null,
                createdAt:      candidate.createdAt,
                sender:         candidate.sender ? { ...candidate.sender, email: '' } : null,
                replyToProfile: null,
                task,
            },
        };
    };

    const handleTaskClick = (task: TaskRef) =>
    {
        const type = taskTypeFromMessages(task);
        const item = findExistingAttentionItem(task.id, type) ?? synthesizeAttentionItem(task, type);
        setSelectedTask(task);
        setSelectedItem(item);
        setDrawerOpen(true);
    };

    const handleDrawerClose = (open: boolean) =>
    {
        setDrawerOpen(open);
        if (!open) fetchData();
    };

    // Group attention items by task, keeping only the latest per task
    const groupedAttentionItems = (() => {
        const groups = new Map<string, { latest: AttentionItem; count: number }>();
        for (const item of attentionItems) {
            const taskId = item.kind === 'message' ? item.data.task.id : item.data.task.id;
            const typeCategory = attentionTypeLabel(item); // Chat, Request, or Evidence
            const key = `${taskId}:${typeCategory}`;
            const createdAt = item.kind === 'message' ? item.data.createdAt : item.data.createdAt;
            const existing = groups.get(key);
            if (!existing) {
                groups.set(key, { latest: item, count: 1 });
            } else {
                existing.count++;
                const existingDate = existing.latest.kind === 'message'
                    ? existing.latest.data.createdAt : existing.latest.data.createdAt;
                if (new Date(createdAt) > new Date(existingDate)) {
                    existing.latest = item;
                }
            }
        }
        return Array.from(groups.values());
    })();

    if (!user) return null;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-10">
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div>
                <h1 className="text-2xl font-bold">Action Center</h1>
                <p className="text-muted-foreground mt-1">Overview of all items requiring your attention</p>
            </div>

            {/* ── Needs Attention ───────────────────────────────────────────── */}
            <section>
                <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-semibold">Needs Attention</h2>
                    {groupedAttentionItems.length > 0 && (
                        <Badge variant="destructive" className="h-5 px-2 text-xs">{groupedAttentionItems.length}</Badge>
                    )}
                </div>

                {loading ? (
                    <p className="text-muted-foreground text-sm">Loading...</p>
                ) : (
                    <DataTableShell
                        items={groupedAttentionItems}
                        columns={attentionColumns}
                        rowKey={attentionRowKey}
                        storageKey="home:needs-attention"
                        onRowClick={({ latest }) => handleAttentionClick(latest)}
                        emptyMessage="Nothing needs attention right now."
                        typeOf={({ latest }) => attentionTypeLabel(latest)}
                    />
                )}
            </section>

            {/* ── Overdue ──────────────────────────────────────────────────── */}
            <section>
                <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-semibold">Overdue</h2>
                    {overdueTasks.length > 0 && (
                        <Badge variant="destructive" className="h-5 px-2 text-xs">{overdueTasks.length}</Badge>
                    )}
                </div>

                {loading ? (
                    <p className="text-muted-foreground text-sm">Loading...</p>
                ) : (
                    <DataTableShell
                        items={overdueTasks}
                        columns={overdueColumns}
                        rowKey={(task) => task.id}
                        storageKey="home:overdue"
                        onRowClick={handleTaskClick}
                        emptyMessage="No overdue tasks."
                        typeOf={taskTypeFromMessages}
                    />
                )}
            </section>

            {/* ── Due Soon ─────────────────────────────────────────────────── */}
            <section>
                <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-semibold">Due Soon</h2>
                    {dueSoonTasks.length > 0 && (
                        <Badge variant="destructive" className="h-5 px-2 text-xs">{dueSoonTasks.length}</Badge>
                    )}
                </div>

                {loading ? (
                    <p className="text-muted-foreground text-sm">Loading...</p>
                ) : (
                    <DataTableShell
                        items={dueSoonTasks}
                        columns={dueSoonColumns}
                        rowKey={(task) => task.id}
                        storageKey="home:due-soon"
                        onRowClick={handleTaskClick}
                        emptyMessage="No tasks due soon."
                        typeOf={taskTypeFromMessages}
                    />
                )}
            </section>

            {/* ── Drawer ───────────────────────────────────────────────────── */}
            <TaskDrawer
                open={drawerOpen}
                onOpenChange={handleDrawerClose}
                task={selectedTask}
                attentionItem={selectedItem}
            />
        </div>
    );
}
