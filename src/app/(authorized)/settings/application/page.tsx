'use client';

import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Settings, RefreshCw } from 'lucide-react';
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ApplicationSettingsPage()
{
    const user = useUser();
    const router = useRouter();

    // Redirect if not SUPER_ADMIN
    useEffect(() => {
        if (user.role !== 'SUPER_ADMIN') {
            toast.error('Access denied. SUPER_ADMIN role required.');
            router.push('/dashboard');
        }
    }, [user.role, router]);

    const [settingsId, setSettingsId] = useState<number | null>(null);
    const [applicationName, setApplicationName] = useState('');
    const [homeDirectory, setHomeDirectory] = useState('');
    const [pollingInterval, setPollingInterval] = useState(30000);

    const [originalValues, setOriginalValues] = useState({
        applicationName: '',
        homeDirectory: '',
        pollingInterval: 30000
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Fetch current settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();

                if (res.ok && data.success && data.data) {
                    const settings = data.data;

                    setSettingsId(settings.id);
                    setApplicationName(settings.applicationName || '');
                    setHomeDirectory(settings.homeDirectory || '');
                    setPollingInterval(settings.pollingInterval || 30000);

                    setOriginalValues({
                        applicationName: settings.applicationName || '',
                        homeDirectory: settings.homeDirectory || '',
                        pollingInterval: settings.pollingInterval || 30000
                    });
                } else {
                    toast.error('Failed to load settings');
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
                toast.error('Error loading settings');
            } finally {
                setIsLoading(false);
            }
        };

        if (user.role === 'SUPER_ADMIN') {
            fetchSettings();
        } else {
            // Not a SUPER_ADMIN, stop loading
            setIsLoading(false);
        }
    }, [user.role]);

    // Check for changes
    useEffect(() => {
        const isChanged =
            applicationName !== originalValues.applicationName ||
            homeDirectory !== originalValues.homeDirectory ||
            pollingInterval !== originalValues.pollingInterval;

        setHasChanges(isChanged);
    }, [applicationName, homeDirectory, pollingInterval, originalValues]);

    const handleCancel = () => {
        setApplicationName(originalValues.applicationName);
        setHomeDirectory(originalValues.homeDirectory);
        setPollingInterval(originalValues.pollingInterval);
    };

    const handleSave = async () => {
        if (!settingsId) {
            toast.error('Settings ID not found');
            return;
        }

        // Validate polling interval
        if (pollingInterval < 1000) {
            toast.error('Polling interval must be at least 1000ms (1 second)');
            return;
        }

        setIsSaving(true);

        try {
            const response = await fetch('/api/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: settingsId,
                    applicationName,
                    homeDirectory,
                    pollingInterval
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Settings updated successfully');
                setOriginalValues({
                    applicationName,
                    homeDirectory,
                    pollingInterval
                });
                setHasChanges(false);

                // Trigger a page refresh to apply new settings
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                toast.error(data.message || 'Failed to update settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('An error occurred while saving');
        } finally {
            setIsSaving(false);
        }
    };

    // Don't render for non-SUPER_ADMIN users
    if (user.role !== 'SUPER_ADMIN') {
        return null;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Loading settings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex relative">
            {/* Settings Sidebar */}
            <div className="w-64 border-r border-border p-4">
                <nav className="space-y-1">
                    <div className="px-4 py-2.5 bg-muted text-foreground flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        <span>Application</span>
                    </div>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-2xl font-semibold mb-2">Application Settings</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage global application settings. Changes will apply to all users.
                    </p>
                </div>

                <div className="space-y-6">
                    {/* Application Name */}
                    <div>
                        <Label htmlFor="applicationName" className="block text-sm mb-2">
                            Application Name
                        </Label>
                        <Input
                            id="applicationName"
                            type="text"
                            value={applicationName}
                            onChange={(e) => setApplicationName(e.target.value)}
                            placeholder="e.g., Compliance Circle"
                            className="max-w-md"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            The name displayed throughout the application
                        </p>
                    </div>

                    {/* Home Directory */}
                    <div>
                        <Label htmlFor="homeDirectory" className="block text-sm mb-2">
                            Home Directory
                        </Label>
                        <Input
                            id="homeDirectory"
                            type="text"
                            value={homeDirectory}
                            onChange={(e) => setHomeDirectory(e.target.value)}
                            placeholder="e.g., /home/compliance"
                            className="max-w-md"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Base directory for application files and data
                        </p>
                    </div>

                    {/* Polling Interval */}
                    <div>
                        <Label htmlFor="pollingInterval" className="block text-sm mb-2">
                            Polling Interval (milliseconds)
                        </Label>
                        <div className="flex items-center gap-4">
                            <Input
                                id="pollingInterval"
                                type="number"
                                min="1000"
                                step="1000"
                                value={pollingInterval}
                                onChange={(e) => setPollingInterval(parseInt(e.target.value, 10) || 1000)}
                                placeholder="30000"
                                className="max-w-xs"
                            />
                            <span className="text-sm text-muted-foreground">
                                = {(pollingInterval / 1000).toFixed(1)} seconds
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            How often the application automatically refreshes data (minimum 1000ms)
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 max-w-2xl">
                        <div className="flex gap-3">
                            <Settings className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                            <div className="text-sm space-y-1">
                                <p className="font-medium text-blue-400">Settings Information</p>
                                <p className="text-muted-foreground">
                                    These settings affect all users. The polling interval controls how frequently
                                    the application checks for new messages, tasks, and other updates. Lower values
                                    provide more real-time updates but increase server load.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save/Cancel Button Row */}
            <div className={`
                fixed
                bottom-0
                left-0
                right-0
                bg-background
                border-t
                border-border
                px-6
                py-3
                flex
                justify-end
                gap-3
                transition-transform
                duration-500
                ease-in-out
                ${hasChanges ? 'translate-y-0' : 'translate-y-full'}
            `}>
                <Button
                    onClick={handleCancel}
                    disabled={isSaving}
                    variant="outline"
                    className="rounded-none"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="rounded-none"
                >
                    {isSaving ? 'Saving...' : 'Save changes'}
                </Button>
            </div>
        </div>
    );
}
