// app/(authorized)/asset-files/page.tsx

'use client';

import { useState, useEffect }                  from 'react';
import { useOrganization }                      from '@/context/OrganizationContext';
import { ARTIFACT_TYPE_LABELS, ARTIFACT_TYPES } from '@/lib/constants/artifact-type';
import { File, Trash2, Star, ChevronDown, ChevronUp, ArrowUpDown, Focus, HardDrive, Cloud, FileInput } from 'lucide-react';
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

type FileSource = 'local' | 's3';

type FileItem = {
  name        : string;
  relativePath: string;
  size        : number;
  modified    : string;
  mime        : string;
  source      : FileSource;
  s3Key?      : string; // S3 object key for S3 files
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
    const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Filter
    const [filterText, setFilterText] = useState("");

    // Sorting - default to date descending (newest first)
    const [sortField, setSortField] = useState<'name' | 'size' | 'modified' | 'starred' | 'source' | null>('modified');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Selection and starring
    const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
    const [starredFilePaths, setStarredFilePaths] = useState<Set<string>>(new Set());
    const [showOnlySelected, setShowOnlySelected] = useState(false);

    // Bulk delete
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleteConfirmChecked, setBulkDeleteConfirmChecked] = useState(false);
    const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState("");
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    // Guess artifact type based on MIME type
    const guessArtifactType = (mimeType: string): string => {
        const mime = mimeType.toLowerCase();

        // PDF
        if (mime === 'application/pdf') return 'PDF';

        // Excel / Spreadsheets
        if (mime.includes('spreadsheet') ||
            mime.includes('excel') ||
            mime === 'application/vnd.ms-excel' ||
            mime === 'text/csv') return 'EXCEL';

        // Images
        if (mime.startsWith('image/')) return 'IMAGE';

        // Video
        if (mime.startsWith('video/')) return 'VIDEO';

        // Audio
        if (mime.startsWith('audio/')) return 'AUDIO';

        // Presentations
        if (mime.includes('presentation') ||
            mime.includes('powerpoint')) return 'PRESENTATION';

        // Archives
        if (mime === 'application/zip' ||
            mime === 'application/x-rar-compressed' ||
            mime === 'application/x-7z-compressed' ||
            mime === 'application/gzip' ||
            mime === 'application/x-tar') return 'ARCHIVE';

        // Source code / text
        if (mime === 'application/json' ||
            mime === 'application/javascript' ||
            mime === 'application/xml' ||
            mime === 'text/html' ||
            mime === 'text/css' ||
            mime === 'text/javascript') return 'SOURCE_CODE';

        // Data files
        if (mime === 'application/sql' ||
            mime === 'text/csv') return 'DATA';

        // Word documents
        if (mime.includes('word') ||
            mime === 'application/msword' ||
            mime === 'text/plain' ||
            mime === 'text/rtf') return 'DOCUMENT';

        return 'OTHER';
    };

    const fetchFiles = async () =>
    {
        if (!activeOrganization?.id) return;

        setLoading(true);

        try
        {
            // Fetch local files and S3 files in parallel
            const [localRes, s3Res] = await Promise.all([
                fetch(`/api/files/upload-dir/${activeOrganization.id}?ts=${Date.now()}`),
                fetch(`/api/files/s3?organizationId=${activeOrganization.id}&ts=${Date.now()}`),
            ]);

            const allFiles: FileItem[] = [];

            // Process local files
            if (localRes.ok) {
                const localData = await localRes.json();
                if (localData.success && Array.isArray(localData.data?.files)) {
                    const localFiles = localData.data.files.map((f: any) => ({
                        ...f,
                        source: 'local' as FileSource,
                    }));
                    allFiles.push(...localFiles);
                }
            }

            // Process S3 files
            if (s3Res.ok) {
                const s3Data = await s3Res.json();
                if (s3Data.success && Array.isArray(s3Data.data?.files)) {
                    const s3Files = s3Data.data.files.map((f: any) => ({
                        name: f.name,
                        relativePath: f.key, // Use S3 key as relativePath for consistency
                        size: f.size,
                        modified: f.modified,
                        mime: f.mime,
                        source: 's3' as FileSource,
                        s3Key: f.key,
                    }));
                    allFiles.push(...s3Files);
                }
            }

            setFiles(allFiles);

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
    // BULK DELETE (handles both local and S3)
    const handleBulkDelete = async () => {
        if (selectedFilePaths.size === 0) return;
        if (!bulkDeleteConfirmChecked) return;
        if (bulkDeleteConfirmText.toLowerCase() !== getDeleteWord().toLowerCase()) return;

        setIsBulkProcessing(true);
        let successCount = 0;
        let errorCount = 0;

        for (const filePath of selectedFilePaths) {
            try {
                // Find the file to determine its source
                const file = files.find(f => f.relativePath === filePath);
                if (!file) {
                    errorCount++;
                    continue;
                }

                let res: Response;

                if (file.source === 's3') {
                    // Delete from S3
                    res = await fetch('/api/files/s3', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            organizationId: activeOrganization?.id,
                            key: file.s3Key,
                        }),
                    });
                } else {
                    // Delete from local filesystem
                    res = await fetch('/api/files/upload-dir', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            organizationId: activeOrganization?.id,
                            filename: filePath,
                        }),
                    });
                }

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
        setShowOnlySelected(false);

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

    // Auto-disable "show only selected" filter when selection is emptied
    useEffect(() => {
        if (showOnlySelected && selectedFilePaths.size === 0) {
            setShowOnlySelected(false);
        }
    }, [selectedFilePaths, showOnlySelected]);

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
                    filename        : selectedFile.name,
                    name            : artifactName.trim(),
                    description     : artifactDesc.trim() || undefined,
                    type            : artifactType,
                    source          : selectedFile.source,
                    s3Key           : selectedFile.s3Key,
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
    // Delete file (handles both local and S3)
    const handleDeleteFile = async () =>
    {
        if (!fileToDelete) return;
        if (!deleteConfirmChecked) return;
        if (deleteConfirmText.toLowerCase() !== getDeleteWord().toLowerCase()) return;

        setIsDeleting(true);

        try
        {
            let res: Response;

            if (fileToDelete.source === 's3') {
                // Delete from S3
                res = await fetch('/api/files/s3', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        organizationId: activeOrganization?.id,
                        key: fileToDelete.s3Key,
                    }),
                });
            } else {
                // Delete from local filesystem
                res = await fetch('/api/files/upload-dir', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        organizationId: activeOrganization?.id,
                        filename: fileToDelete.relativePath,
                    }),
                });
            }

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
            setDeleteConfirmChecked(false);
            setDeleteConfirmText("");
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
    const handleSort = (field: 'name' | 'size' | 'modified' | 'starred' | 'source') => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Sortable column header renderer
    const SortableHeader = ({ field, children, className = '', align }: { field: 'name' | 'size' | 'modified' | 'starred' | 'source', children: React.ReactNode, className?: string, align?: 'left' | 'right' }) => (
        <TableHead
            className={`cursor-pointer select-none hover:bg-muted/50 ${className}`}
            onClick={() => handleSort(field)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
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
            (f.name.toLowerCase().includes(filterText.toLowerCase()) ||
            f.relativePath.toLowerCase().includes(filterText.toLowerCase())) &&
            (!showOnlySelected || selectedFilePaths.has(f.relativePath))
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
                    case 'source':
                        comparison = a.source.localeCompare(b.source);
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
      <Dialog
        open={fileToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setFileToDelete(null);
            setDeleteConfirmChecked(false);
            setDeleteConfirmText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t('dialogs.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('dialogs.deleteDescription', { name: fileToDelete?.name || '' })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 border border-destructive/30 rounded-lg bg-destructive/5">
              <Checkbox
                id="delete-confirm"
                checked={deleteConfirmChecked}
                onCheckedChange={(checked) => setDeleteConfirmChecked(!!checked)}
              />
              <label htmlFor="delete-confirm" className="text-sm cursor-pointer">
                {t('dialogs.deleteConfirmCheckbox')}
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-sm">
                {t('dialogs.deleteTypeWord', { word: getDeleteWord() })}
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={getDeleteWord()}
                className={deleteConfirmText.toLowerCase() === getDeleteWord().toLowerCase() ? 'border-green-500' : ''}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setFileToDelete(null)} disabled={isDeleting}>
              {tc('buttons.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFile}
              disabled={
                isDeleting ||
                !deleteConfirmChecked ||
                deleteConfirmText.toLowerCase() !== getDeleteWord().toLowerCase()
              }
            >
              {isDeleting ? t('buttons.deleting') : t('buttons.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  {/* Source icon column */}
                  <SortableHeader field="source" className="w-12"><Cloud className="h-4 w-4" /></SortableHeader>
                  <SortableHeader field="name">{t('table.filename')}</SortableHeader>
                  <SortableHeader field="size" className="w-32" align="right">{t('table.size')}</SortableHeader>
                  <SortableHeader field="modified" className="w-40" align="right">{t('table.date')}</SortableHeader>
                  <TableHead className="w-20 text-right">{t('table.actions')}</TableHead>
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
                    {/* Source icon cell */}
                    <TableCell className="w-12">
                      <span title={file.source === 's3' ? 'Amazon S3' : 'Local filesystem'}>
                        {file.source === 's3' ? (
                          <Cloud size={16} className="text-blue-500" />
                        ) : (
                          <HardDrive size={16} className="text-muted-foreground" />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <File size={16} className="text-muted-foreground" />
                        {file.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(file.modified).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-transparent"
                          title={t('buttons.assignAsArtifact')}
                          onClick={() => {
                            setSelectedFile(file);
                            setArtifactName(file.name);
                            setArtifactDesc('');
                            setArtifactType(guessArtifactType(file.mime));
                            setAssignDialogOpen(true);
                          }}
                        >
                          <FileInput size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-transparent"
                          title={t('buttons.delete')}
                          onClick={() => setFileToDelete(file)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                    {/* Star cell */}
                    <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => toggleStar(file.relativePath, e)}
                        className="p-1 cursor-pointer hover:bg-muted rounded transition-colors"
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
                    onClick={() => setShowOnlySelected(!showOnlySelected)}
                    className={`p-1.5 rounded transition-colors cursor-pointer ${
                      showOnlySelected
                        ? 'bg-primary/20 text-primary hover:bg-primary/30'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                    title={showOnlySelected ? "Show All Files" : "Show Only Selected Files"}
                  >
                    <Focus className="h-4 w-4" />
                  </button>
                  <div className="w-px h-4 bg-border mx-1" />
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