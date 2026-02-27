// app/(authorized)/asset-files/page.tsx

'use client';

import { useState, useEffect }                  from 'react';
import { useOrganization }                      from '@/context/OrganizationContext';
import { ARTIFACT_TYPE_LABELS, ARTIFACT_TYPES } from '@/lib/constants/artifact-type';
import { File, Trash2, Star, ChevronDown, ChevronUp, ArrowUpDown }      from 'lucide-react';
import { useTranslations }                      from 'next-intl';
import { Button }                               from '@/components/ui/button';
import { Input }                                from '@/components/ui/input';
import { Textarea }                             from '@/components/ui/textarea';
import { Checkbox }                             from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle }  from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast }                                                            from 'sonner';
import { Skeleton }                                                         from '@/components/ui/skeleton';

type FileItem = {
  name        : string;
  relativePath: string;
  size        : number;
  modified    : string;
  mime        : string;
};

export default function ArtifactFilesPage() 
{
    const { activeOrganization } = useOrganization();
    const t  = useTranslations('IncommingFiles');
    const tc = useTranslations('Common');

    const [files, setFiles] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
    const [artifactName, setArtifactName] = useState('');
    const [artifactDesc, setArtifactDesc] = useState('');
    const [artifactType, setArtifactType] = useState('OTHER');
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    
    // Delete file state
    const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Filter
    const [filterText, setFilterText] = useState("");

    // Sorting
    const [sortField, setSortField] = useState<'name' | 'size' | 'modified' | 'starred' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Selection and starring
    const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
    const [starredFilePaths, setStarredFilePaths] = useState<Set<string>>(new Set());

    // Bulk delete
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleteConfirmChecked, setBulkDeleteConfirmChecked] = useState(false);
    const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState("");
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    const fetchFiles = async () => 
    {
        if (!activeOrganization?.id) return;

        setLoading(true);

        try 
        {
            const res = await fetch(`/api/files/upload-dir/${activeOrganization.id}?ts=${Date.now()}`);

            if (!res.ok) 
            {
              console.error('Failed to load files (HTTP)', res.status);
              throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();
            console.log("API Response:", data);

            if (!data.success) 
            {
                console.error('API failure:', data.error);
                throw new Error(data.error || 'API returned failure');
            }

            const fileList = data.data?.files || [];
            console.log("fileList:", fileList);

            if (!Array.isArray(fileList)) 
            {
                console.warn('fileList is not an array:', fileList);
                setFiles([]);
                return;
            }

            setFiles(fileList);

        } 
        catch (err: any) 
        {
            console.error('Fetch error:', err);
            toast.error(t('toast.loadError'));
            setFiles([]);
        } 
        finally {
            setLoading(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH STARRED FILES
    const fetchStarredFiles = async () =>
    {
        if (!activeOrganization?.id) return;
        try
        {
            const res = await fetch(`/api/file-star?organizationId=${activeOrganization.id}`);
            const data = await res.json();
            if (!data.success)
            {
                console.error('Failed to fetch starred files:', data.message);
                return;
            }
            setStarredFilePaths(new Set(data.data || []));
        }
        catch (error)
        {
            console.error('Failed to fetch starred files:', error);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // TOGGLE STAR (API call)
    const toggleStarApi = async (filePath: string) =>
    {
        if (!activeOrganization?.id) return;
        try
        {
            const res = await fetch('/api/file-star', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ organizationId: activeOrganization.id, filePath }),
            });
            const data = await res.json();
            if (!data.success)
            {
                console.error('Failed to toggle star:', data.message);
                toast.error(data.message || t('toast.starError'));
                return;
            }
            setStarredFilePaths(prev => {
                const newSet = new Set(prev);
                if (data.starred) {
                    newSet.add(filePath);
                } else {
                    newSet.delete(filePath);
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
    const toggleStar = (filePath: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        toggleStarApi(filePath);
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SELECTION HELPERS
    const toggleFileSelection = (filePath: string) => {
        setSelectedFilePaths(prev => {
            const newSet = new Set(prev);
            if (newSet.has(filePath)) {
                newSet.delete(filePath);
            } else {
                newSet.add(filePath);
            }
            return newSet;
        });
    };

    const selectAllCurrent = () => {
        setSelectedFilePaths(prev => {
            const newSet = new Set(prev);
            currentFiles.forEach(f => newSet.add(f.relativePath));
            return newSet;
        });
    };

    const deselectAllCurrent = () => {
        setSelectedFilePaths(prev => {
            const newSet = new Set(prev);
            currentFiles.forEach(f => newSet.delete(f.relativePath));
            return newSet;
        });
    };

    const selectStarred = () => {
        setSelectedFilePaths(prev => {
            const newSet = new Set(prev);
            filteredFiles.filter(f => starredFilePaths.has(f.relativePath)).forEach(f => newSet.add(f.relativePath));
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
        if (selectedFilePaths.size === 0) return;
        if (!bulkDeleteConfirmChecked) return;
        if (bulkDeleteConfirmText.toLowerCase() !== getDeleteWord().toLowerCase()) return;

        setIsBulkProcessing(true);
        let successCount = 0;
        let errorCount = 0;

        for (const filePath of selectedFilePaths) {
            try {
                const res = await fetch('/api/files/upload-dir', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        organizationId: activeOrganization?.id,
                        filename: filePath,
                    }),
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
        setSelectedFilePaths(new Set());

        if (successCount > 0) {
            toast.success(t('toast.filesDeleted', { count: successCount }));
            fetchFiles();
        }
        if (errorCount > 0) {
            toast.error(t('toast.filesDeleteFailed', { count: errorCount }));
        }
    };

    // Initial load + Change Organization + Refresh event
    useEffect(() =>
    {
        if (!activeOrganization) return;

        fetchFiles();
        fetchStarredFiles();

        // Listen for refresh event
        const handleRefresh = () =>
        {
            fetchFiles();
            fetchStarredFiles();
        };

        window.addEventListener('refreshPage', handleRefresh);

        return () =>
        {
            window.removeEventListener('refreshPage', handleRefresh);
        };
    }, [activeOrganization?.id]);

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filterText]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Assign file as artifact
    const handleAssign = async () => 
    {
        if (!selectedFile || !artifactName.trim()) 
        {
            toast.error(t('toast.nameRequired'));
            return;
        }

        try 
        {
            const res = await fetch('/api/artifact/from-file', 
            {
                method              : 'POST',
                headers             : { 'Content-Type': 'application/json' },
                body                : JSON.stringify(
                {
                    organizationId  : activeOrganization?.id,
                    filename        : selectedFile.relativePath,
                    name            : artifactName.trim(),
                    description     : artifactDesc.trim() || undefined,
                    type            : artifactType,
                }),
            });

            if (!res.ok) 
            {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create artifact');
            }

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Operation failed');

            toast.success(t('toast.artifactCreated'));
            setFiles((prev) => prev.filter((f) => f.relativePath !== selectedFile.relativePath));
            setSelectedFile(null);
            setAssignDialogOpen(false);
            setArtifactName('');
            setArtifactDesc('');
            setArtifactType('OTHER');
        } 
        catch (err: any) 
        {
            console.error(err);
            toast.error(err.message || t('toast.assignError'));
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Delete file
    const handleDeleteFile = async () => 
    {
        if (!fileToDelete) return;

        setIsDeleting(true);

        try 
        {
            const res = await fetch('/api/files/upload-dir', 
            {
                method  : 'DELETE',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(
                {
                    organizationId  : activeOrganization?.id,
                    filename        : fileToDelete.relativePath,
                }),
            });

            if (!res.ok) 
            {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete file');
            }

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Delete operation failed');

            toast.success(t('toast.fileDeleted'));
            setFiles((prev) => prev.filter((f) => f.relativePath !== fileToDelete.relativePath));
            setFileToDelete(null);
        } 
        catch (err: any) 
        {
            console.error('Delete error:', err);
            toast.error(err.message || 'Could not delete file');
        } 
        finally
        {
            setIsDeleting(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SORTING HELPER
    const handleSort = (field: 'name' | 'size' | 'modified' | 'starred') => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Sortable column header renderer
    const SortableHeader = ({ field, children, className = '' }: { field: 'name' | 'size' | 'modified' | 'starred', children: React.ReactNode, className?: string }) => (
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
    const filteredFiles = files
        .filter(f =>
            f.name.toLowerCase().includes(filterText.toLowerCase()) ||
            f.relativePath.toLowerCase().includes(filterText.toLowerCase())
        )
        .sort((a, b) => {
            if (sortField) {
                let comparison = 0;
                switch (sortField) {
                    case 'name':
                        comparison = a.name.localeCompare(b.name);
                        break;
                    case 'size':
                        comparison = a.size - b.size;
                        break;
                    case 'modified':
                        comparison = new Date(a.modified).getTime() - new Date(b.modified).getTime();
                        break;
                    case 'starred':
                        const aStarred = starredFilePaths.has(a.relativePath) ? 1 : 0;
                        const bStarred = starredFilePaths.has(b.relativePath) ? 1 : 0;
                        comparison = bStarred - aStarred;
                        break;
                }
                return sortDirection === 'asc' ? comparison : -comparison;
            }
            return 0;
        });

    const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentFiles = filteredFiles.slice(startIndex, endIndex);

    // Selection helpers for checkbox state
    const allCurrentSelected = currentFiles.length > 0 && currentFiles.every(f => selectedFilePaths.has(f.relativePath));
    const someCurrentSelected = currentFiles.some(f => selectedFilePaths.has(f.relativePath)) && !allCurrentSelected;

  return (
    <>
      {/* Delete File Alert Dialog */}
      <AlertDialog
        open={fileToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setFileToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogs.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs.deleteDescription', { name: fileToDelete?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tc('buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFile}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('buttons.deleting') : t('buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t('dialogs.bulkDeleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('dialogs.bulkDeleteDescription', { count: selectedFilePaths.size })}
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
              {isBulkProcessing ? tc('buttons.deleting') : t('buttons.deleteFiles', { count: selectedFilePaths.size })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="p-6 space-y-6">

        {/* Filter Input */}
        <div className="flex justify-end">
          <Input
            placeholder={t('placeholders.filterByName')}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="max-w-sm"
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t('empty.noFiles')}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t('empty.noFilesMatch')}
          </div>
        ) : (
          <>
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
                          <DropdownMenuItem onClick={selectStarred}>
                            <Star className="h-4 w-4 mr-2 fill-yellow-400 text-yellow-400" />
                            {tc('selection.starred')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableHead>
                  <SortableHeader field="name">{t('table.filename')}</SortableHeader>
                  <SortableHeader field="size" className="w-32 text-right">{t('table.size')}</SortableHeader>
                  <SortableHeader field="modified" className="w-40 text-right">{t('table.modified')}</SortableHeader>
                  <TableHead className="w-48 text-right">{t('table.actions')}</TableHead>
                  {/* Star column */}
                  <SortableHeader field="starred" className="w-12"><Star className="h-4 w-4" /></SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentFiles.map((file) => (
                  <TableRow
                    key={file.relativePath}
                    className="hover:bg-muted/50"
                    onContextMenu={(e) => {
                      e.preventDefault();
                      toggleStar(file.relativePath);
                    }}
                  >
                    {/* Checkbox cell */}
                    <TableCell className="w-12">
                      <Checkbox
                        checked={selectedFilePaths.has(file.relativePath)}
                        onCheckedChange={() => toggleFileSelection(file.relativePath)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <File size={16} className="text-muted-foreground" />
                        {file.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(file.size / 1024).toFixed(1)} KB
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(file.modified).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFile(file);
                            setArtifactName(file.name);
                            setArtifactDesc('');
                            setArtifactType('OTHER');
                            setAssignDialogOpen(true);
                          }}
                        >
                          {t('buttons.assignAsArtifact')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFileToDelete(file)}
                          className="hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                    {/* Star cell */}
                    <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => toggleStar(file.relativePath, e)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                      >
                        <Star
                          className={`h-4 w-4 ${
                            starredFilePaths.has(file.relativePath)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground hover:text-yellow-400'
                          }`}
                        />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  {t('pagination.showing', { start: startIndex + 1, end: Math.min(endIndex, filteredFiles.length), total: filteredFiles.length })}
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
            {selectedFilePaths.size > 0 && (
              <div className="flex items-center gap-4 mt-4 p-3 bg-muted/50 rounded-lg border">
                <span className="text-sm text-muted-foreground">
                  {t('selection.selectedOf', { selected: selectedFilePaths.size, total: filteredFiles.length })}
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
          </>
        )}

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="sm:max-w-125">
            <DialogHeader>
              <DialogTitle>Assign File as Artifact</DialogTitle>
              <DialogDescription>
                File: <strong>{selectedFile?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Artifact Name</label>
                <Input
                  value={artifactName}
                  onChange={(e) => setArtifactName(e.target.value)}
                  placeholder="Enter artifact name"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={artifactDesc}
                  onChange={(e) => setArtifactDesc(e.target.value)}
                  placeholder="Optional description"
                  className="min-h-25"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={artifactType} onValueChange={setArtifactType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ARTIFACT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {ARTIFACT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={!artifactName.trim()}
              >
                Create Artifact & Move File
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}