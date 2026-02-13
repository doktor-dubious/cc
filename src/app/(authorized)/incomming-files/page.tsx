// app/(authorized)/asset-files/page.tsx

'use client';

import { useState, useEffect }                  from 'react';
import { useOrganization }                      from '@/context/OrganizationContext';
import { ARTIFACT_TYPE_LABELS, ARTIFACT_TYPES } from '@/lib/constants/artifact-type';
import { File, Check, X, Trash2 }               from 'lucide-react';
import { Button }                               from '@/components/ui/button';
import { Input }                                from '@/components/ui/input';
import { Textarea }                             from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Dialog, DialogContent, DialogHeader, DialogDescription, DialogTitle, DialogTrigger }  from '@/components/ui/dialog';
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
            toast.error('Could not load files from upload directory');
            setFiles([]);
        } 
        finally {
            setLoading(false);
        }
    };

    // Initial load + Change Organization + Refresh event
    useEffect(() => 
    {
        fetchFiles(); // Initial load

        // Listen for refresh event
        const handleRefresh = () => 
        {
            fetchFiles();
        };

        window.addEventListener('refreshPage', handleRefresh);
        // console.log("Event listener added for refreshPage");

        return () => 
        {
            // console.log("Cleaning up event listener");
            window.removeEventListener('refreshPage', handleRefresh);
        };
    }, [activeOrganization?.id]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // Assign file as artifact
    const handleAssign = async () => 
    {
        if (!selectedFile || !artifactName.trim()) 
        {
            toast.error('Name is required');
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
                    organizationId  : parseInt(activeOrganization?.id),
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

            toast.success('Artifact created and file moved');
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
            toast.error(err.message || 'Could not assign file');
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
                    organizationId  : parseInt(activeOrganization?.id),
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

            toast.success('File deleted successfully');
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
            <AlertDialogTitle>Delete File?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{fileToDelete?.name}</strong>?
              <br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFile}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-6 space-y-6">

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No files found in the upload directory
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">Filename</th>
                  <th className="text-right p-3 w-32">Size</th>
                  <th className="text-right p-3 w-40">Modified</th>
                  <th className="text-right p-3 w-48">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.relativePath} className="border-t hover:bg-muted/50">
                    <td className="p-3 flex items-center gap-2">
                      <File size={16} className="text-muted-foreground" />
                      {file.name}
                    </td>
                    <td className="text-right p-3 tabular-nums">
                      {(file.size / 1024).toFixed(1)} KB
                    </td>
                    <td className="text-right p-3 text-muted-foreground">
                      {new Date(file.modified).toLocaleString()}
                    </td>
                    <td className="text-right p-3">
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
                          Assign as Artifact
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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