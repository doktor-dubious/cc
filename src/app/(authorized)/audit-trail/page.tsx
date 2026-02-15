'use client';

import { useUser }                              from '@/context/UserContext';
import { useOrganization }                      from '@/context/OrganizationContext';
import { useRouter }                            from 'next/navigation';
import { useEffect, useState }                  from 'react';

import { ExternalLink } from 'lucide-react';
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

export default function AuditTrailPage()
{
    const user = useUser();
    const { activeOrganization } = useOrganization();
    const router = useRouter();

    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Search / Pagination
    const [filterText, setFilterText] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 8;

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
            return { type: 'Task', name: event.task.name, route: '/task' };
        }
        if (event.organization)
        {
            return { type: 'Organization', name: event.organization.name, route: '/organization' };
        }
        if (event.profile)
        {
            return { type: 'Profile', name: event.profile.name, route: '/profile' };
        }
        if (event.artifact)
        {
            return { type: 'Artifact', name: event.artifact.name, route: '/asset' };
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
            toast.error("Could not load events");
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
    // FILTER & PAGINATION
    const filteredEvents = events.filter((event) =>
    {
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
    });

    const totalPages = Math.ceil(filteredEvents.length / perPage);
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    const currentEvents = filteredEvents.slice(startIndex, endIndex);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // RENDER

    if (!user) return null;

    return (
      <div className="space-y-8 p-6">

        <div className="flex justify-end">
          <Input
            placeholder="Filter by message, user, entity or importance..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-sm"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 text-right">ID</TableHead>
              <TableHead className="w-44">Date</TableHead>
              <TableHead className="w-36">User</TableHead>
              <TableHead className="w-28">Importance</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-48">Entity</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading events...
                </TableCell>
              </TableRow>
            ) : currentEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {filterText ? "No events match your filter" : "No events found"}
                </TableCell>
              </TableRow>
            ) : (
              currentEvents.map((event: any) =>
              {
                const entity = getEntityInfo(event);

                return (
                  <TableRow key={event.id}>
                    <TableCell className="w-20 text-right tabular-nums">{event.id}</TableCell>
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
                          title={`Go to ${entity.type}`}
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
              Showing {startIndex + 1} to {Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length} events
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
