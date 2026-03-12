'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    Plus,
    LogOut,
    Loader2,
    Users,
} from 'lucide-react';
import { RocketIcon } from '@/components/animate-ui/icons/rocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
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

export default function ThirdPartyRiskExposurePage() {
    const t  = useTranslations('Workflow.thirdPartyRiskExposure');
    const tw = useTranslations('Workflow.customerOnboarding');
    const tc = useTranslations('Common');
    const router = useRouter();
    const { activeOrganization } = useOrganization();

    const [thirdParties, setThirdParties]     = useState<ThirdPartyCompanyObj[]>([]);
    const [isLoading, setIsLoading]           = useState(false);
    const [showExitDialog, setShowExitDialog] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newName, setNewName]               = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [isCreating, setIsCreating]         = useState(false);

    const loadThirdParties = useCallback(async () => {
        if (!activeOrganization?.id) return;
        setIsLoading(true);
        try {
            const res  = await fetch(`/api/third-party?organizationId=${activeOrganization.id}`);
            const json = await res.json();
            if (json.success) setThirdParties(json.data ?? []);
        } catch {
            // silently fail
        } finally {
            setIsLoading(false);
        }
    }, [activeOrganization?.id]);

    useEffect(() => { loadThirdParties(); }, [loadThirdParties]);

    const handleCreate = async () => {
        if (!activeOrganization?.id || !newName.trim()) return;
        setIsCreating(true);
        try {
            const res  = await fetch('/api/third-party', {
                method  : 'POST',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify({
                    organizationId : activeOrganization.id,
                    name           : newName.trim(),
                    description    : newDescription.trim() || null,
                }),
            });
            const json = await res.json();
            if (json.success) {
                setShowCreateDialog(false);
                setNewName('');
                setNewDescription('');
                // Go straight to onboarding wizard for the newly created company
                router.push(`/workflows/customer-onboarding/third-party-risk-exposure/${json.data.id}`);
            }
        } catch {
            // silently fail
        } finally {
            setIsCreating(false);
        }
    };

    const openCreateDialog = () => {
        setNewName('');
        setNewDescription('');
        setShowCreateDialog(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <RocketIcon size={20} />
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-semibold">{t('title')}</h1>
                            {activeOrganization && (
                                <>
                                    <div className="h-5 w-px bg-border" />
                                    <span className="text-base text-muted-foreground">
                                        {activeOrganization.name}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowExitDialog(true)}
                        className="gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        {tc('navigation.exit')}
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-12">
                <div className="mx-auto max-w-5xl">
                    {/* Intro */}
                    <div className="mb-10 text-center">
                        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
                        <p className="mt-4 text-lg text-muted-foreground">{t('description')}</p>
                    </div>

                    {/* Add button */}
                    <div className="flex justify-end mb-6">
                        <Button onClick={openCreateDialog} className="gap-2">
                            <Plus className="h-4 w-4" />
                            {t('addNew')}
                        </Button>
                    </div>

                    {/* Third-party cards */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : thirdParties.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 p-12 text-center">
                            <Users className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40" />
                            <p className="font-medium text-muted-foreground">{t('noThirdParties')}</p>
                            <p className="mt-1 text-sm text-muted-foreground/60">{t('noThirdPartiesHint')}</p>
                            <Button onClick={openCreateDialog} variant="outline" className="mt-6 gap-2">
                                <Plus className="h-4 w-4" />
                                {t('addNew')}
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                            {thirdParties.map((tp) => (
                                <div
                                    key={tp.id}
                                    className="flex flex-col gap-4 rounded-lg border border-muted bg-card p-5"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                                            <Building2 className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-base leading-tight">{tp.name}</p>
                                            {tp.description && (
                                                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                                                    {tp.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => router.push(
                                            `/workflows/customer-onboarding/third-party-risk-exposure/${tp.id}`
                                        )}
                                        className="mt-auto w-full gap-2"
                                    >
                                        {t('onboard')}
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="mt-12 flex items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/workflows/customer-onboarding')}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t('backToWorkflow')}
                        </Button>
                        <Button
                            onClick={() => router.push('/workflows/customer-onboarding/cis-analysis')}
                            className="gap-2"
                        >
                            {t('continueToRiskProfile')}
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </main>

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('createDialog.title')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="tp-name">{t('createDialog.nameLabel')}</Label>
                            <Input
                                id="tp-name"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder={t('createDialog.namePlaceholder')}
                                onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) handleCreate(); }}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="tp-desc">{t('createDialog.descriptionLabel')}</Label>
                            <Textarea
                                id="tp-desc"
                                value={newDescription}
                                onChange={e => setNewDescription(e.target.value)}
                                placeholder={t('createDialog.descriptionPlaceholder')}
                                rows={3}
                                className="resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isCreating}>
                            {t('createDialog.cancel')}
                        </Button>
                        <Button onClick={handleCreate} disabled={!newName.trim() || isCreating} className="gap-2">
                            {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t('createDialog.create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Exit Dialog */}
            <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tw('exitDialog.title')}</AlertDialogTitle>
                        <AlertDialogDescription>{tw('exitDialog.description')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tc('buttons.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.push('/home')}>
                            {tc('navigation.exit')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
