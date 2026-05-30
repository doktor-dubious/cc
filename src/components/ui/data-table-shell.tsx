'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowUpDown, ChevronDown, ChevronUp, Focus, Star } from 'lucide-react';

import { cn }                                                from '@/lib/utils';
import { Button }                                            from '@/components/ui/button';
import { Checkbox }                                          from '@/components/ui/checkbox';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
}                                                            from '@/components/ui/dropdown-menu';
import {
    Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
    PaginationLink, PaginationNext, PaginationPrevious,
}                                                            from '@/components/ui/pagination';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
}                                                            from '@/components/ui/table';

export interface DataColumn<T> {
    key:            string;
    label:          string;
    sortable?:      boolean;
    sortValue?:     (item: T) => string | number;
    width?:         string;
    align?:         'left' | 'right' | 'center';
    cellClassName?: string | ((item: T) => string);
    render:         (item: T) => ReactNode;
}

export type RowType = 'Chat' | 'Evidence' | 'Request';

interface DataTableShellProps<T> {
    items:          T[];
    columns:        DataColumn<T>[];
    rowKey:         (item: T) => string;
    storageKey:     string;
    onRowClick?:    (item: T) => void;
    pageSize?:      number;
    emptyMessage?:  string;
    /**
     * If provided, exposes "Select Chat / Evidence / Requests" entries in the
     * row-selection dropdown menu, each filtering by the value returned for
     * a row. Returning null means the row has no type and won't match.
     */
    typeOf?:        (item: T) => RowType | null;
}

const STARRED_SORT_KEY = '__starred__';
const STORAGE_PREFIX   = 'cc:dataTable:';

function buildPaginationPages(current: number, total: number): (number | 'ellipsis')[]
{
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [1];
    if (current > 3) pages.push('ellipsis');
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
    if (current < total - 2) pages.push('ellipsis');
    pages.push(total);
    return pages;
}

function loadJson<T>(key: string, fallback: T): T
{
    if (typeof window === 'undefined') return fallback;
    try
    {
        const raw = localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    }
    catch { return fallback; }
}

function saveJson(key: string, value: unknown)
{
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* quota exceeded etc. */ }
}

export function DataTableShell<T>({
    items,
    columns,
    rowKey,
    storageKey,
    onRowClick,
    pageSize    = 10,
    emptyMessage = 'No items.',
    typeOf,
}: DataTableShellProps<T>)
{
    const starredStorageKey = `${STORAGE_PREFIX}${storageKey}:starred`;

    const [starredIds,       setStarredIds]       = useState<Set<string>>(() => new Set(loadJson<string[]>(starredStorageKey, [])));
    const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());
    const [showOnlySelected, setShowOnlySelected] = useState(false);
    const [sortField,        setSortField]        = useState<string | null>(null);
    const [sortDir,          setSortDir]          = useState<'asc' | 'desc'>('asc');
    const [currentPage,      setCurrentPage]      = useState(1);

    // Persist starred set
    useEffect(() => { saveJson(starredStorageKey, Array.from(starredIds)); },
        [starredIds, starredStorageKey]);

    // Filter only honors "show only selected" while there's something selected,
    // so deselecting the last row doesn't leave the user with an empty table.
    const effectiveShowOnlySelected = showOnlySelected && selectedIds.size > 0;

    const filtered = useMemo(() =>
    {
        let list = effectiveShowOnlySelected
            ? items.filter(item => selectedIds.has(rowKey(item)))
            : items;

        if (sortField)
        {
            const col = columns.find(c => c.key === sortField);
            if (sortField === STARRED_SORT_KEY)
            {
                list = [...list].sort((a, b) =>
                {
                    const va = starredIds.has(rowKey(a)) ? 1 : 0;
                    const vb = starredIds.has(rowKey(b)) ? 1 : 0;
                    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
                    return sortDir === 'asc' ? cmp : -cmp;
                });
            }
            else if (col?.sortValue)
            {
                list = [...list].sort((a, b) =>
                {
                    const va = col.sortValue!(a);
                    const vb = col.sortValue!(b);
                    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
                    return sortDir === 'asc' ? cmp : -cmp;
                });
            }
        }
        return list;
    }, [items, columns, sortField, sortDir, effectiveShowOnlySelected, selectedIds, starredIds, rowKey]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage   = Math.min(currentPage, totalPages);
    const pageItems  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    const allPageSelected  = pageItems.length > 0 && pageItems.every(i => selectedIds.has(rowKey(i)));
    const somePageSelected = pageItems.some(i => selectedIds.has(rowKey(i)));

    function handleSort(field: string)
    {
        if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortField(field); setSortDir('asc'); }
    }

    function handleHeaderCheckbox()
    {
        if (allPageSelected)
        {
            setSelectedIds(prev =>
            {
                const n = new Set(prev);
                pageItems.forEach(i => n.delete(rowKey(i)));
                return n;
            });
        }
        else
        {
            setSelectedIds(prev =>
            {
                const n = new Set(prev);
                pageItems.forEach(i => n.add(rowKey(i)));
                return n;
            });
        }
    }

    function handleRowCheckbox(id: string, checked: boolean)
    {
        setSelectedIds(prev =>
        {
            const n = new Set(prev);
            if (checked) n.add(id); else n.delete(id);
            return n;
        });
    }

    function handleStar(id: string)
    {
        setStarredIds(prev =>
        {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id); else n.add(id);
            return n;
        });
    }

    if (items.length === 0)
    {
        return <p className="text-muted-foreground text-sm">{emptyMessage}</p>;
    }

    const isStarSortActive = sortField === STARRED_SORT_KEY;

    return (
        <div className="rounded-lg border bg-panel">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12 pl-4">
                            <div className="flex items-center gap-0.5">
                                <Checkbox
                                    checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
                                    onCheckedChange={handleHeaderCheckbox}
                                    aria-label="Select rows on this page"
                                />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            type="button"
                                            className="h-5 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                            aria-label="Selection menu"
                                        >
                                            <ChevronDown className="h-3 w-3" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                        <DropdownMenuItem
                                            onClick={() => setSelectedIds(new Set(items.map(rowKey)))}
                                        >
                                            Select all
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setSelectedIds(
                                                new Set(items.filter(i => starredIds.has(rowKey(i))).map(rowKey))
                                            )}
                                        >
                                            Starred
                                        </DropdownMenuItem>
                                        {typeOf && (
                                            <>
                                                <DropdownMenuItem
                                                    onClick={() => setSelectedIds(
                                                        new Set(items.filter(i => typeOf(i) === 'Chat').map(rowKey))
                                                    )}
                                                >
                                                    Select Chat
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => setSelectedIds(
                                                        new Set(items.filter(i => typeOf(i) === 'Evidence').map(rowKey))
                                                    )}
                                                >
                                                    Select Evidence
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => setSelectedIds(
                                                        new Set(items.filter(i => typeOf(i) === 'Request').map(rowKey))
                                                    )}
                                                >
                                                    Select Requests
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </TableHead>

                        {columns.map(col =>
                        {
                            const active = sortField === col.key;
                            return (
                                <TableHead
                                    key={col.key}
                                    className={cn(
                                        col.width,
                                        col.align === 'right'  && 'text-right',
                                        col.align === 'center' && 'text-center',
                                    )}
                                >
                                    {col.sortable ? (
                                        <button
                                            type="button"
                                            onClick={() => handleSort(col.key)}
                                            className={cn(
                                                'flex items-center gap-1 font-medium hover:text-foreground transition-colors cursor-pointer',
                                                col.align === 'right'  && 'ml-auto',
                                                col.align === 'center' && 'mx-auto',
                                            )}
                                        >
                                            {col.label}
                                            {active ? (
                                                sortDir === 'asc'
                                                    ? <ChevronUp className="h-3 w-3" />
                                                    : <ChevronDown className="h-3 w-3" />
                                            ) : (
                                                <ArrowUpDown className="h-3 w-3 opacity-40" />
                                            )}
                                        </button>
                                    ) : col.label}
                                </TableHead>
                            );
                        })}

                        <TableHead className="w-10 text-center">
                            <button
                                type="button"
                                onClick={() => handleSort(STARRED_SORT_KEY)}
                                className="flex items-center gap-1 font-medium hover:text-foreground transition-colors mx-auto cursor-pointer"
                                aria-label="Sort by starred"
                            >
                                <Star className={cn('h-4 w-4', !isStarSortActive && 'opacity-40')} />
                                {isStarSortActive && (
                                    sortDir === 'asc'
                                        ? <ChevronUp className="h-3 w-3" />
                                        : <ChevronDown className="h-3 w-3" />
                                )}
                            </button>
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {pageItems.map(item =>
                    {
                        const id = rowKey(item);
                        return (
                            <TableRow
                                key={id}
                                className={cn(onRowClick && 'cursor-pointer')}
                                onClick={() => onRowClick?.(item)}
                                onContextMenu={(e) => { e.preventDefault(); handleStar(id); }}
                            >
                                <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                        checked={selectedIds.has(id)}
                                        onCheckedChange={(c) => handleRowCheckbox(id, !!c)}
                                        aria-label="Select row"
                                    />
                                </TableCell>

                                {columns.map(col => (
                                    <TableCell
                                        key={col.key}
                                        className={cn(
                                            col.align === 'right'  && 'text-right',
                                            col.align === 'center' && 'text-center',
                                            typeof col.cellClassName === 'function'
                                                ? col.cellClassName(item)
                                                : col.cellClassName,
                                        )}
                                    >
                                        {col.render(item)}
                                    </TableCell>
                                ))}

                                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        onClick={() => handleStar(id)}
                                        className="hover:text-amber-400 transition-colors cursor-pointer"
                                        aria-label={starredIds.has(id) ? 'Unstar row' : 'Star row'}
                                    >
                                        <Star
                                            className={cn(
                                                'h-4 w-4',
                                                starredIds.has(id)
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'text-muted-foreground',
                                            )}
                                        />
                                    </button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {filtered.length > 0 && (
                <div className="flex items-center justify-between px-4 py-1.5 border-t">
                    <span className="text-xs text-muted-foreground">
                        Showing {(safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
                    </span>
                    {totalPages > 1 && (
                        <Pagination className="w-auto mx-0">
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => { if (safePage > 1) setCurrentPage(safePage - 1); }}
                                        aria-disabled={safePage === 1}
                                        className={cn(safePage === 1
                                            ? 'pointer-events-none opacity-50'
                                            : 'cursor-pointer')}
                                    />
                                </PaginationItem>
                                {buildPaginationPages(safePage, totalPages).map((p, i) =>
                                    p === 'ellipsis' ? (
                                        <PaginationItem key={`e${i}`}>
                                            <PaginationEllipsis />
                                        </PaginationItem>
                                    ) : (
                                        <PaginationItem key={p}>
                                            <PaginationLink
                                                isActive={safePage === p}
                                                onClick={() => setCurrentPage(p)}
                                                className="cursor-pointer"
                                            >
                                                {p}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ),
                                )}
                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() => { if (safePage < totalPages) setCurrentPage(safePage + 1); }}
                                        aria-disabled={safePage === totalPages}
                                        className={cn(safePage === totalPages
                                            ? 'pointer-events-none opacity-50'
                                            : 'cursor-pointer')}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    )}
                </div>
            )}

            {selectedIds.size > 0 && (
                <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30">
                    <span className="text-xs text-muted-foreground">
                        {selectedIds.size} selected of {filtered.length} total
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs cursor-pointer"
                        onClick={() => setShowOnlySelected(v => !v)}
                    >
                        <Focus className={cn('h-3.5 w-3.5', showOnlySelected && 'text-primary')} />
                        {showOnlySelected ? 'Show all' : 'Show only selected'}
                    </Button>
                </div>
            )}
        </div>
    );
}
