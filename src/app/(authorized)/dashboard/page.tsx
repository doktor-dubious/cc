'use client';

import { useUser }          from '@/context/UserContext';
import { useRouter }        from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useTranslations }  from 'next-intl';
import { format, formatDistanceToNow } from 'date-fns';

import { Badge }            from '@/components/ui/badge';
import { Input }            from '@/components/ui/input';
import { Button }           from '@/components/ui/button';
import { ExportMenu }       from '@/components/ui/export-menu';
import type { ExportColumn } from '@/lib/export';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ChevronLeft, ChevronRight, Mail, ListTodo, FolderOpen, Search, ClipboardList } from 'lucide-react';

interface DashboardMessage {
  id: string;
  content: string;
  isRead: boolean;
  type: string;
  createdAt: string;
  sender: { name: string } | null;
  task: {
    id: string;
    name: string;
    organization: { id: string; name: string } | null;
  };
}

interface DashboardTask {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startAt: string | null;
  endAt: string | null;
  organization: { id: string; name: string } | null;
}

interface IncomingFileGroup {
  organizationId: string;
  organizationName: string;
  files: { name: string; size: number; modifiedAt: string }[];
}

interface FlatFile {
  name: string;
  size: number;
  modifiedAt: string;
  organizationName: string;
  organizationId: string;
}

interface DashboardEvent {
  id: string;
  message: string;
  importance: string | null;
  createdAt: string;
  user: { name: string } | null;
  organization: { id: string; name: string } | null;
  task: { id: string; name: string } | null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getUrgency(task: DashboardTask): { label: string; variant: 'destructive' | 'default' | 'secondary' | 'outline' } {
  if (!task.endAt) {
    return task.status === 'OPEN'
      ? { label: 'Open', variant: 'default' }
      : { label: 'Not Started', variant: 'secondary' };
  }

  const now = Date.now();
  const end = new Date(task.endAt).getTime();

  if (now >= end) {
    return { label: 'Overdue', variant: 'destructive' };
  }

  if (task.startAt) {
    const start = new Date(task.startAt).getTime();
    const total = end - start;
    const remaining = end - now;
    if (total > 0 && remaining <= total * 0.1) {
      return { label: 'Due Soon', variant: 'destructive' };
    }
  }

  return task.status === 'OPEN'
    ? { label: 'Open', variant: 'default' }
    : { label: 'Not Started', variant: 'secondary' };
}

// Pagination footer component
function PaginationFooter({ page, setPage, total, perPage }: { page: number; setPage: (fn: (p: number) => number) => void; total: number; perPage: number }) {
  if (total <= perPage) return null;
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
      <span>{(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}</span>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page * perPage >= total} onClick={() => setPage(p => p + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useUser();
  const router = useRouter();
  const t = useTranslations('Dashboard');

  const [messages, setMessages] = useState<DashboardMessage[]>([]);
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [incomingFiles, setIncomingFiles] = useState<IncomingFileGroup[]>([]);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [messagesPage, setMessagesPage] = useState(1);
  const [tasksPage, setTasksPage] = useState(1);
  const [filesPage, setFilesPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);
  const perPage = 10;

  const [messagesFilter, setMessagesFilter] = useState("");
  const [tasksFilter, setTasksFilter] = useState("");
  const [filesFilter, setFilesFilter] = useState("");
  const [eventsFilter, setEventsFilter] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const data = await res.json();
        if (data.success) {
          setMessages(data.data.messages || []);
          setTasks(data.data.tasks || []);
          setIncomingFiles(data.data.incomingFiles || []);
          setEvents(data.data.events || []);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();

    const handleRefresh = () => fetchDashboard();
    window.addEventListener('refreshPage', handleRefresh);
    return () => window.removeEventListener('refreshPage', handleRefresh);
  }, []);

  // Reset pages when filters change
  useEffect(() => { setMessagesPage(1); }, [messagesFilter]);
  useEffect(() => { setTasksPage(1); }, [tasksFilter]);
  useEffect(() => { setFilesPage(1); }, [filesFilter]);
  useEffect(() => { setEventsPage(1); }, [eventsFilter]);

  const filteredMessages = useMemo(() => {
    const q = messagesFilter.toLowerCase();
    if (!q) return messages;
    return messages.filter(m =>
      m.content.toLowerCase().includes(q) ||
      m.task.name.toLowerCase().includes(q) ||
      (m.sender?.name || '').toLowerCase().includes(q) ||
      (m.task.organization?.name || '').toLowerCase().includes(q)
    );
  }, [messages, messagesFilter]);

  const filteredTasks = useMemo(() => {
    const q = tasksFilter.toLowerCase();
    if (!q) return tasks;
    return tasks.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.organization?.name || '').toLowerCase().includes(q)
    );
  }, [tasks, tasksFilter]);

  // Flatten files for filtering and pagination
  const allFiles = useMemo<FlatFile[]>(() => {
    return incomingFiles.flatMap(g =>
      g.files.map(f => ({
        ...f,
        organizationName: g.organizationName,
        organizationId: g.organizationId,
      }))
    );
  }, [incomingFiles]);

  const filteredFiles = useMemo(() => {
    const q = filesFilter.toLowerCase();
    if (!q) return allFiles;
    return allFiles.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.organizationName.toLowerCase().includes(q)
    );
  }, [allFiles, filesFilter]);

  const filteredEvents = useMemo(() => {
    const q = eventsFilter.toLowerCase();
    if (!q) return events;
    return events.filter(e =>
      e.message.toLowerCase().includes(q) ||
      (e.user?.name || '').toLowerCase().includes(q) ||
      (e.organization?.name || '').toLowerCase().includes(q) ||
      (e.task?.name || '').toLowerCase().includes(q) ||
      (e.importance || '').toLowerCase().includes(q)
    );
  }, [events, eventsFilter]);

  const unreadCount = messages.filter(m => !m.isRead).length;

  // ── Export column definitions ────────────────────────────────────────────
  const messageExportColumns: ExportColumn[] = [
    { header: 'From', accessor: (row: any) => row.type === 'SYSTEM' ? 'System' : (row.sender?.name || '') },
    { header: 'Message', accessor: 'content' },
    { header: 'Task', accessor: (row: any) => row.task.name },
    { header: 'Organization', accessor: (row: any) => row.task.organization?.name || '' },
    { header: 'Time', accessor: (row: any) => new Date(row.createdAt).toLocaleString() },
  ];

  const taskExportColumns: ExportColumn[] = [
    { header: 'Task', accessor: 'name' },
    { header: 'Organization', accessor: (row: any) => row.organization?.name || '' },
    { header: 'Status', accessor: 'status' },
    { header: 'Due', accessor: (row: any) => row.endAt ? new Date(row.endAt).toLocaleDateString() : '' },
  ];

  const fileExportColumns: ExportColumn[] = [
    { header: 'File', accessor: 'name' },
    { header: 'Organization', accessor: 'organizationName' },
    { header: 'Size', accessor: (row: any) => formatFileSize(row.size) },
    { header: 'Modified', accessor: (row: any) => new Date(row.modifiedAt).toLocaleString() },
  ];

  const eventExportColumns: ExportColumn[] = [
    { header: 'User', accessor: (row: any) => row.user?.name || 'System' },
    { header: 'Event', accessor: 'message' },
    { header: 'Importance', accessor: (row: any) => row.importance || '' },
    { header: 'Time', accessor: (row: any) => new Date(row.createdAt).toLocaleString() },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">{t('welcome', { name: user.name })}</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{t('welcome', { name: user.name })}</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ─── Messages ──────────────────────────────────────────────────── */}
        <div className="border rounded-lg">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Messages</h2>
            <div className="ml-auto flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs h-5 px-2">
                  {unreadCount} unread
                </Badge>
              )}
              <ExportMenu data={filteredMessages} columns={messageExportColumns} filename="dashboard-messages" />
            </div>
          </div>
          <div className="px-4 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter messages..."
                value={messagesFilter}
                onChange={(e) => setMessagesFilter(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          {filteredMessages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {messagesFilter ? 'No matching messages' : 'No messages'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">From</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-36">Task</TableHead>
                    <TableHead className="w-28">Org</TableHead>
                    <TableHead className="w-24 text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.slice((messagesPage - 1) * perPage, messagesPage * perPage).map(msg => (
                    <TableRow
                      key={msg.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${!msg.isRead ? 'font-medium bg-muted/20' : ''}`}
                      onClick={() => router.push(`/task?id=${msg.task.id}`)}
                    >
                      <TableCell className="text-sm">
                        {msg.type === 'SYSTEM' ? (
                          <span className="text-muted-foreground italic">System</span>
                        ) : (
                          msg.sender?.name || '—'
                        )}
                      </TableCell>
                      <TableCell className="text-sm max-w-0">
                        <div className="truncate">{msg.content}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="truncate">{msg.task.name}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {msg.task.organization?.name || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationFooter page={messagesPage} setPage={setMessagesPage} total={filteredMessages.length} perPage={perPage} />
            </>
          )}
        </div>

        {/* ─── Tasks ─────────────────────────────────────────────────────── */}
        <div className="border rounded-lg">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <ListTodo className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Active Tasks</h2>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="text-xs h-5 px-2">
                {tasks.length}
              </Badge>
              <ExportMenu data={filteredTasks} columns={taskExportColumns} filename="dashboard-tasks" />
            </div>
          </div>
          <div className="px-4 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter tasks..."
                value={tasksFilter}
                onChange={(e) => setTasksFilter(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          {filteredTasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {tasksFilter ? 'No matching tasks' : 'No active tasks'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead className="w-28">Org</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-24 text-right">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.slice((tasksPage - 1) * perPage, tasksPage * perPage).map(task => {
                    const urgency = getUrgency(task);
                    return (
                      <TableRow
                        key={task.id}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => router.push(`/task?id=${task.id}`)}
                      >
                        <TableCell className="text-sm max-w-0">
                          <div className="truncate font-medium">{task.name}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {task.organization?.name || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={urgency.variant} className="text-xs">
                            {urgency.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap">
                          {task.endAt ? format(new Date(task.endAt), 'MMM d') : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <PaginationFooter page={tasksPage} setPage={setTasksPage} total={filteredTasks.length} perPage={perPage} />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ─── Incoming Files ──────────────────────────────────────────────── */}
        <div className="border rounded-lg">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Incoming Files</h2>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="text-xs h-5 px-2">
                {allFiles.length}
              </Badge>
              <ExportMenu data={filteredFiles} columns={fileExportColumns} filename="dashboard-files" />
            </div>
          </div>
          <div className="px-4 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter files..."
                value={filesFilter}
                onChange={(e) => setFilesFilter(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          {filteredFiles.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {filesFilter ? 'No matching files' : 'No incoming files'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead className="w-32">Organization</TableHead>
                    <TableHead className="w-24 text-right">Size</TableHead>
                    <TableHead className="w-36 text-right">Modified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiles.slice((filesPage - 1) * perPage, filesPage * perPage).map(file => (
                    <TableRow
                      key={`${file.organizationId}-${file.name}`}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => router.push('/incomming-files')}
                    >
                      <TableCell className="text-sm">{file.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{file.organizationName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">{formatFileSize(file.size)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right">
                        {formatDistanceToNow(new Date(file.modifiedAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationFooter page={filesPage} setPage={setFilesPage} total={filteredFiles.length} perPage={perPage} />
            </>
          )}
        </div>

        {/* ─── Audit Trail ─────────────────────────────────────────────────── */}
        <div className="border rounded-lg">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <ClipboardList className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Audit Trail</h2>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="text-xs h-5 px-2">
                {events.length}
              </Badge>
              <ExportMenu data={filteredEvents} columns={eventExportColumns} filename="dashboard-audit-trail" />
            </div>
          </div>
          <div className="px-4 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter events..."
                value={eventsFilter}
                onChange={(e) => setEventsFilter(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          {filteredEvents.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {eventsFilter ? 'No matching events' : 'No audit events'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">User</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead className="w-24">Importance</TableHead>
                    <TableHead className="w-24 text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.slice((eventsPage - 1) * perPage, eventsPage * perPage).map(event => (
                    <TableRow
                      key={event.id}
                      className={`transition-colors hover:bg-muted/50 ${event.task ? 'cursor-pointer' : ''}`}
                      onClick={() => event.task && router.push(`/task?id=${event.task.id}`)}
                    >
                      <TableCell className="text-sm">
                        {event.user?.name || 'System'}
                      </TableCell>
                      <TableCell className="text-sm max-w-0">
                        <div className="truncate">{event.message}</div>
                      </TableCell>
                      <TableCell>
                        {event.importance ? (
                          <Badge
                            variant={event.importance === 'HIGH' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {event.importance}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap">
                        {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationFooter page={eventsPage} setPage={setEventsPage} total={filteredEvents.length} perPage={perPage} />
            </>
          )}
        </div>

      </div>
    </div>
  );
}
