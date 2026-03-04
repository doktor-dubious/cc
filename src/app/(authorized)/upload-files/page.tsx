'use client';

import { useState }            from 'react';
import { useOrganization }     from '@/context/OrganizationContext';
import { useTranslations }     from 'next-intl';
import { useUploadFiles }      from '@better-upload/client';
import { UploadDropzone }      from '@/components/ui/upload-dropzone';
import { toast }               from 'sonner';
import { CheckCircle2, XCircle, FileIcon, Trash2 } from 'lucide-react';
import { Button }              from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
}                              from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
}                              from '@/components/ui/alert-dialog';

type UploadedFile = {
    name: string;
    size: number;
    key: string;
    uploadedAt: Date;
    status: 'success' | 'error';
    error?: string;
};

export default function UploadFilesPage() {
    const { activeOrganization } = useOrganization();
    const t  = useTranslations('UploadFiles');
    const tc = useTranslations('Common');

    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [fileToDelete, setFileToDelete]   = useState<UploadedFile | null>(null);

    const { control } = useUploadFiles({
        route: 'artifacts',
        api: '/api/upload',
        onUploadBegin: ({ files }) => {
            toast.info(t('uploadStarted', { count: files.length }));
        },
        onUploadSettle: ({ files, failedFiles }) => {
            // Add successful uploads
            const successful = files.map((file) => ({
                name: file.raw.name,
                size: file.raw.size,
                key: file.objectInfo?.key || '',
                uploadedAt: new Date(),
                status: 'success' as const,
            }));

            // Add failed uploads
            const failed = failedFiles.map((file) => ({
                name: file.raw.name,
                size: file.raw.size,
                key: '',
                uploadedAt: new Date(),
                status: 'error' as const,
                error: file.error?.message || t('uploadFailed'),
            }));

            setUploadedFiles((prev) => [...successful, ...failed, ...prev]);

            if (files.length > 0) {
                toast.success(t('uploadSuccess', { count: files.length }));
            }
            if (failedFiles.length > 0) {
                toast.error(t('uploadError', { count: failedFiles.length }));
            }
        },
        onError: (error) => {
            toast.error(error.message || t('uploadFailed'));
        },
    });

    const handleDeleteFromList = (file: UploadedFile) => {
        setUploadedFiles((prev) => prev.filter((f) => f !== file));
        setFileToDelete(null);
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    };

    // ── No organization selected ─────────────────────────────────────────────
    if (!activeOrganization) {
        return (
            <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">{tc('loading.selectOrganization')}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl py-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                <p className="text-muted-foreground mt-1">
                    {t('description', { organization: activeOrganization.name })}
                </p>
            </div>

            {/* Upload Dropzone */}
            <div className="mb-8">
                <UploadDropzone
                    control={control}
                    metadata={{ organizationId: activeOrganization.id }}
                    description={{
                        maxFiles: 10,
                        maxFileSize: '50MB',
                        fileTypes: 'PDF, Word, Excel, Images, Archives',
                    }}
                />
            </div>

            {/* Upload Status */}
            {control.isPending && (
                <div className="bg-muted mb-6 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-sm">{t('uploading')}</span>
                    </div>
                </div>
            )}

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
                <div>
                    <h2 className="mb-4 text-lg font-semibold">{t('recentUploads')}</h2>
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12"></TableHead>
                                    <TableHead>{tc('table.name')}</TableHead>
                                    <TableHead className="w-24">{t('size')}</TableHead>
                                    <TableHead className="w-32">{tc('table.status')}</TableHead>
                                    <TableHead className="w-16"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {uploadedFiles.map((file, index) => (
                                    <TableRow key={`${file.name}-${index}`}>
                                        <TableCell>
                                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div>
                                                <p className="truncate max-w-xs">{file.name}</p>
                                                {file.error && (
                                                    <p className="text-xs text-destructive">{file.error}</p>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatFileSize(file.size)}
                                        </TableCell>
                                        <TableCell>
                                            {file.status === 'success' ? (
                                                <span className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    {t('statusSuccess')}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-destructive">
                                                    <XCircle className="h-4 w-4" />
                                                    {t('statusFailed')}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setFileToDelete(file)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('removeFromList')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('removeFromListDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tc('buttons.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => fileToDelete && handleDeleteFromList(fileToDelete)}>
                            {t('remove')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
