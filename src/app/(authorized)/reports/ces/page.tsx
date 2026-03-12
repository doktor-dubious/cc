'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, FileText, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useOrganization } from '@/context/OrganizationContext';
import type { ThirdPartyCompanyObj } from '@/lib/database/third-party';

export default function CesPage() {
  const t      = useTranslations('CES');
  const router = useRouter();
  const { activeOrganization } = useOrganization();

  const [companies, setCompanies]   = useState<ThirdPartyCompanyObj[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ThirdPartyCompanyObj | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCompanies = useCallback(async () => {
    if (!activeOrganization) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const res  = await fetch(`/api/third-party?organizationId=${activeOrganization.id}`);
      const data = await res.json();
      if (data.success) setCompanies(data.data);
    }
    catch (err) { console.error('Failed to load companies:', err); }
    finally { setIsLoading(false); }
  }, [activeOrganization]);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res  = await fetch(`/api/third-party/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(t('page.deleteSuccess'));
        setCompanies(prev => prev.filter(c => c.id !== deleteTarget.id));
      } else {
        toast.error(t('page.deleteError'));
      }
    }
    catch { toast.error(t('page.deleteError')); }
    finally { setIsDeleting(false); setDeleteTarget(null); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{t('page.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('page.subtitle')}</p>
        </div>
        <Button onClick={() => router.push('/reports/ces/wizard')} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('page.newCompany')}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">Loading...</div>
      ) : companies.length === 0 ? (
        <div className="border rounded-lg p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">{t('page.noCompanies')}</p>
          <p className="text-sm mt-1">{t('page.noCompaniesDescription')}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/reports/ces/wizard')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('page.newCompany')}
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-sm">{t('table.name')}</th>
                <th className="text-right px-4 py-3 font-medium text-sm">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {companies.map(company => (
                <tr key={company.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-sm">{company.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => router.push(`/reports/ces/report?id=${company.id}`)}
                        className="p-1.5 rounded hover:bg-muted cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
                        title={t('page.viewReport')}
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => router.push(`/reports/ces/wizard?id=${company.id}`)}
                        className="p-1.5 rounded hover:bg-muted cursor-pointer transition-colors text-muted-foreground hover:text-foreground"
                        title={t('page.edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(company)}
                        className="p-1.5 rounded hover:bg-muted cursor-pointer transition-colors text-muted-foreground hover:text-destructive"
                        title={t('page.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('page.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('page.deleteConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
