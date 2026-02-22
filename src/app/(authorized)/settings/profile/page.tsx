'use client';

import { useUser } from '@/context/UserContext';
import { useState, useEffect } from 'react';
import { ChevronDown, User } from 'lucide-react';
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useTranslations } from 'next-intl';

export default function SettingsPage()
{
    const user = useUser();
    const t = useTranslations('SettingsProfile');

    const [activeTab, setActiveTab] = useState('Profile');
    const [fullName, setFullName] = useState(user.name);
    const [nickname, setNickname] = useState(user.nickname || '');
    const [workFunction, setWorkFunction] = useState(user.workFunction || '');
    const [preferences, setPreferences] = useState('e.g. when learning new concepts, I find analogies particularly helpful');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Track if any changes have been made
    const [hasChanges, setHasChanges] = useState(false);

    // Check for changes whenever form values update
    useEffect(() => {
        const isChanged =
            fullName !== user.name ||
            nickname !== (user.nickname || '') ||
            workFunction !== (user.workFunction || '');

        setHasChanges(isChanged);
    }, [fullName, nickname, workFunction, user]);

    const tabKeys = ['profile', 'login', 'account', 'settings', 'log'] as const;

    const handleCancel = () => {
        // Reset to original values
        setFullName(user.name);
        setNickname(user.nickname || '');
        setWorkFunction(user.workFunction || '');
        setSaveMessage('');
    };

    const handleSave = async () =>
    {
        setIsSaving(true);
        setSaveMessage('');

        try
        {
            const response = await fetch('/api/user/update',
            {
                method      : 'PATCH',
                headers     : { 'Content-Type': 'application/json', },
                body        : JSON.stringify({
                        fullName,
                        nickname,
                        workFunction,
                }),
            });

            const data = await response.json();

            if (response.ok)
            {
                toast.success(t('toast.accountUpdated'));
                setHasChanges(false);
            }
            else
            {
                toast.error(data.error || t('toast.updateError'));
            }
        }
        catch (error)
        {
            console.error('Error saving profile:', error);
            toast.error(t('toast.saveError'));
        }
        finally
        {
            setIsSaving(false);
        }
    };

    const getInitials = (name: string) =>
    {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();
    };

    return (
<div className="min-h-screen bg-neutral-950 text-neutral-100 flex relative">
    {/* Settings Sidebar */}
    <div className="w-64 border-0 p-4">
        <nav className="space-y-1">
            {tabKeys.map((key) => (
            <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`cursor-pointer w-full text-left px-4 py-2.5 transition-colors ${
                activeTab === key
                    ? 'bg-neutral-800 text-white'
                    : 'text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200'
                }`}
            >
                {t(`tabs.${key}`)}
            </button>
            ))}
        </nav>
    </div>

    {/* Main Content */}
    <div className="flex-1 p-4 max-w-4xl">
        <h1 className="text-2xl font-semibold mb-8">{t('title')}</h1>

        <div className="space-y-6">
            {/* Full Name Section */}
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm text-neutral-400 mb-2">{t('labels.fullName')}</label>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                            {getInitials(fullName)}
                        </div>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Nickname Section */}
                <div>
                    <label className="block text-sm text-neutral-400 mb-2">{t('labels.nickname')}</label>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Work Function Section */}
            <div>
                <label className="block text-sm text-neutral-400 mb-2">{t('labels.workFunction')}</label>
                <div className="relative">
                    <select
                        value={workFunction}
                        onChange={(e) => setWorkFunction(e.target.value)}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 text-neutral-400 appearance-none focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent cursor-pointer"
                    >
                        <option value="">{t('workFunctions.placeholder')}</option>
                        <option value="engineering">{t('workFunctions.engineering')}</option>
                        <option value="design">{t('workFunctions.design')}</option>
                        <option value="product">{t('workFunctions.product')}</option>
                        <option value="marketing">{t('workFunctions.marketing')}</option>
                        <option value="sales">{t('workFunctions.sales')}</option>
                        <option value="research">{t('workFunctions.research')}</option>
                        <option value="education">{t('workFunctions.education')}</option>
                        <option value="other">{t('workFunctions.other')}</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
                </div>
            </div>

            {/* Save Message */}
            {saveMessage && (
                <div className={`text-sm ${saveMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                    {saveMessage}
                </div>
            )}
        </div>
    </div>

    { /* Cancel/Save Button Row */ }
    <div className={`
        fixed
        bottom-0
        left-0
        right-0
        bg-neutral-900
        border-t
        border-neutral-800
        px-6
        py-2
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
            className="
                cursor-pointer
                px-3
                py-2
                text-sm
                text-neutral-300
                border
                border-neutral-700
                bg-neutral-800
                rounded-none
                hover:text-white
                hover:bg-black
                transition-colors
                disabled:opacity-50"
        >
            {t('buttons.cancel')}
        </Button>
        <Button
            onClick={handleSave}
            disabled={isSaving}
            className="
                cursor-pointer
                px-3
                py-2
                text-sm
                bg-white
                text-neutral-900
                rounded-none
                hover:bg-neutral-100
                transition-colors
                disabled:opacity-50
                disabled:cursor-not-allowed
                font-normal"
        >
            {isSaving ? t('buttons.saving') : t('buttons.saveChanges')}
        </Button>
    </div>
</div>
    );
}
