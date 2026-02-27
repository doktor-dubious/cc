'use client';

import { useUser }                              from '@/context/UserContext';
import { useOrganization }                      from '@/context/OrganizationContext';
import { useRouter }                            from 'next/navigation';
import { useEffect, useState }                  from 'react';

import { useTranslations } from 'next-intl';
import { ExternalLink, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ExportMenu } from '@/components/ui/export-menu';
import type { ExportColumn } from '@/lib/export';

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

export default function AuditTrailPage()
{
    const user = useUser();
    const { activeOrganization } = useOrganization();
    const router = useRouter();
    const t = useTranslations('AuditTrail');
    const tc = useTranslations('Common');

    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Search / Pagination
    const [filterText, setFilterText] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 8;

    // Sorting
    const [sortField, setSortField] = useState<'date' | 'user' | 'importance' | 'message' | 'entity' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // IMPORTANCE BADGE
    const getEventImportanceBadge = (importance: string) =>
    {
        const styles =
        {
            LOW     : 'bg-[var(--color-event-low)]',
            MIDDLE  : 'bg-[var(--color-event-middle)]',
            HIGH    : 'bg-[var(--color-event-high)]',
        };
        return styles[importance as keyof typeof styles] || '';
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // DETERMINE ENTITY TYPE & NAME
    const getEntityInfo = (event: any): { type: string; name: string; route: string } | null =>
    {
        if (event.task)
        {
            return { type: t('entityTypes.task'), name: event.task.name, route: '/task' };
        }
        if (event.organization)
        {
            return { type: t('entityTypes.organization'), name: event.organization.name, route: '/organization' };
        }
        if (event.profile)
        {
            return { type: t('entityTypes.profile'), name: event.profile.name, route: '/profile' };
        }
        if (event.artifact)
        {
            return { type: t('entityTypes.artifact'), name: event.artifact.name, route: '/asset' };
        }
        return null;
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH EVENTS
    const fetchEvents = async () =>
    {
        if (!activeOrganization) return;

        try
        {
            const res = await fetch(`/api/event/all?organizationId=${activeOrganization.id}`);
            const data = await res.json();
            if (!data.success)
            {
                throw new Error(data.error || 'Failed to fetch events');
            }
            setEvents(data.data);
        }
        catch (err: any)
        {
            console.error("Fetch events error:", err);
            toast.error(t('toast.loadError'));
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
            fetchEvents();
        }
    }, [activeOrganization]);

    // Listen for page refresh events
    useEffect(() =>
    {
        const handleRefresh = () => fetchEvents();
        window.addEventListener('refreshPage', handleRefresh);
        return () => window.removeEventListener('refreshPage', handleRefresh);
    }, [activeOrganization]);

    // Reset page when filter changes
    useEffect(() =>
    {
        setCurrentPage(1);
    }, [filterText]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SORTING HELPER
    const handleSort = (field: 'date' | 'user' | 'importance' | 'message' | 'entity') => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Helper to get entity name for sorting
    const getEntityName = (event: any): string => {
        return event.task?.name || event.organization?.name || event.profile?.name || event.artifact?.name || '';
    };

    // Importance order for sorting
    const importanceOrder: Record<string, number> = { LOW: 1, MIDDLE: 2, HIGH: 3 };

    // Sortable column header renderer
    const SortableHeader = ({ field, children, className = '' }: { field: 'date' | 'user' | 'importance' | 'message' | 'entity', children: React.ReactNode, className?: string }) => (
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
    const filteredEvents = events
        .filter((event) => {
            const search = filterText.toLowerCase();
            return (
                event.message.toLowerCase().includes(search) ||
                (event.user?.name || '').toLowerCase().includes(search) ||
                (event.task?.name || '').toLowerCase().includes(search) ||
                (event.organization?.name || '').toLowerCase().includes(search) ||
                (event.profile?.name || '').toLowerCase().includes(search) ||
                (event.artifact?.name || '').toLowerCase().includes(search) ||
                (event.importance || '').toLowerCase().includes(search)
            );
        })
        .sort((a, b) => {
            if (sortField) {
                let comparison = 0;
                switch (sortField) {
                    case 'date':
                        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                        break;
                    case 'user':
                        comparison = (a.user?.name || 'System').localeCompare(b.user?.name || 'System');
                        break;
                    case 'importance':
                        comparison = (importanceOrder[a.importance] || 0) - (importanceOrder[b.importance] || 0);
                        break;
                    case 'message':
                        comparison = a.message.localeCompare(b.message);
                        break;
                    case 'entity':
                        comparison = getEntityName(a).localeCompare(getEntityName(b));
                        break;
                }
                return sortDirection === 'asc' ? comparison : -comparison;
            }
            // Default: sort by date descending (most recent first)
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

    const totalPages = Math.ceil(filteredEvents.length / perPage);
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    const currentEvents = filteredEvents.slice(startIndex, endIndex);

    const exportColumns: ExportColumn[] = [
        { header: 'Date', accessor: (row: any) => new Date(row.createdAt).toLocaleString() },
        { header: 'User', accessor: (row: any) => row.user?.name || 'System' },
        { header: 'Importance', accessor: (row: any) => row.importance || '' },
        { header: 'Message', accessor: 'message' },
        { header: 'Entity', accessor: (row: any) => row.task?.name || row.organization?.name || row.profile?.name || row.artifact?.name || '' },
    ];

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // RENDER

    if (!user) return null;

    return (
      <div className="space-y-8 p-6">

        <div className="flex justify-end gap-2">
          <Input
            placeholder={t('placeholders.filter')}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-sm"
          />
          <ExportMenu data={filteredEvents} columns={exportColumns} filename="audit-trail" />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="date" className="w-44">{tc('table.date')}</SortableHeader>
              <SortableHeader field="user" className="w-36">{tc('table.user')}</SortableHeader>
              <SortableHeader field="importance" className="w-28">{tc('table.importance')}</SortableHeader>
              <SortableHeader field="message">{tc('table.message')}</SortableHeader>
              <SortableHeader field="entity" className="w-48">{t('table.entity')}</SortableHeader>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t('empty.loading')}
                </TableCell>
              </TableRow>
            ) : currentEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {filterText ? t('empty.noEventsMatch') : t('empty.noEventsFound')}
                </TableCell>
              </TableRow>
            ) : (
              currentEvents.map((event: any) =>
              {
                const entity = getEntityInfo(event);

                return (
                  <TableRow key={event.id}>
                    <TableCell className="w-44 text-xs">
                      {new Date(event.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="w-36">
                      {event.user?.name || 'System'}
                    </TableCell>
                    <TableCell className="w-28">
                      {event.importance ? (
                        <Badge variant="secondary" className={`${getEventImportanceBadge(event.importance)} px-2 py-1 text-xs audit-event-badge`}>
                          {event.importance.replace('_', ' ')}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>{event.message}</TableCell>
                    <TableCell className="w-48">
                      {entity ? (
                        <span className="text-sm">
                          <span className="text-muted-foreground">{entity.type}:</span>{' '}
                          {entity.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="w-16">
                      {entity && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => router.push(entity.route)}
                          title={t('table.goTo', { type: entity.type })}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              {t('pagination.showing', { start: startIndex + 1, end: Math.min(endIndex, filteredEvents.length), total: filteredEvents.length })}
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
    );
}
