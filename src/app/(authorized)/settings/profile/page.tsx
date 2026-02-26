'use client';

import { useUser } from '@/context/UserContext';
import { useState, useEffect } from 'react';
import { ChevronDown, ShieldCheck, ShieldOff, Copy } from 'lucide-react';
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth-client';
import { QRCodeSVG } from 'qrcode.react';

export default function SettingsPage()
{
    const user = useUser();
    const t = useTranslations('SettingsProfile');

    const [activeTab, setActiveTab] = useState('profile');
    const [fullName, setFullName] = useState(user.name);
    const [nickname, setNickname] = useState(user.nickname || '');
    const [workFunction, setWorkFunction] = useState(user.workFunction || '');
    const [preferences, setPreferences] = useState('e.g. when learning new concepts, I find analogies particularly helpful');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Track if any changes have been made
    const [hasChanges, setHasChanges] = useState(false);

    // 2FA state
    const [twoFaStep, setTwoFaStep] = useState<'idle' | 'password' | 'qr' | 'verify'>('idle');
    const [twoFaPassword, setTwoFaPassword] = useState('');
    const [totpURI, setTotpURI] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [twoFaCode, setTwoFaCode] = useState('');
    const [twoFaError, setTwoFaError] = useState<string | null>(null);
    const [twoFaLoading, setTwoFaLoading] = useState(false);
    const [showBackupCodes, setShowBackupCodes] = useState(false);
    const [disablePassword, setDisablePassword] = useState('');
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);

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

    // 2FA handlers
    const handleEnableTwoFa = async () =>
    {
        setTwoFaError(null);
        setTwoFaLoading(true);

        try
        {
            const { data, error } = await authClient.twoFactor.enable({
                password: twoFaPassword,
            });

            if (error)
            {
                setTwoFaError(error.message || t('twoFactor.errors.enableFailed'));
                setTwoFaLoading(false);
                return;
            }

            setTotpURI(data.totpURI);
            setBackupCodes(data.backupCodes);
            setTwoFaStep('qr');
        }
        catch
        {
            setTwoFaError(t('twoFactor.errors.enableFailed'));
        }
        finally
        {
            setTwoFaLoading(false);
        }
    };

    const handleVerifyTwoFa = async () =>
    {
        setTwoFaError(null);
        setTwoFaLoading(true);

        try
        {
            const { error } = await authClient.twoFactor.verifyTotp({
                code: twoFaCode,
            });

            if (error)
            {
                setTwoFaError(error.message || t('twoFactor.errors.invalidCode'));
                setTwoFaLoading(false);
                return;
            }

            toast.success(t('twoFactor.toast.enabled'));
            user.twoFactorEnabled = true;
            setTwoFaStep('idle');
            setTwoFaPassword('');
            setTwoFaCode('');
            setTotpURI('');
        }
        catch
        {
            setTwoFaError(t('twoFactor.errors.verifyFailed'));
        }
        finally
        {
            setTwoFaLoading(false);
        }
    };

    const handleDisableTwoFa = async () =>
    {
        setTwoFaError(null);
        setTwoFaLoading(true);

        try
        {
            const { error } = await authClient.twoFactor.disable({
                password: disablePassword,
            });

            if (error)
            {
                setTwoFaError(error.message || t('twoFactor.errors.disableFailed'));
                setTwoFaLoading(false);
                return;
            }

            toast.success(t('twoFactor.toast.disabled'));
            user.twoFactorEnabled = false;
            setShowDisableConfirm(false);
            setDisablePassword('');
        }
        catch
        {
            setTwoFaError(t('twoFactor.errors.disableFailed'));
        }
        finally
        {
            setTwoFaLoading(false);
        }
    };

    const handleRegenerateBackupCodes = async () =>
    {
        setTwoFaError(null);
        setTwoFaLoading(true);

        try
        {
            const { data, error } = await authClient.twoFactor.generateBackupCodes({
                password: twoFaPassword,
            });

            if (error)
            {
                setTwoFaError(error.message || t('twoFactor.errors.regenerateFailed'));
                setTwoFaLoading(false);
                return;
            }

            setBackupCodes(data.backupCodes);
            setShowBackupCodes(true);
            toast.success(t('twoFactor.toast.backupCodesRegenerated'));
        }
        catch
        {
            setTwoFaError(t('twoFactor.errors.regenerateFailed'));
        }
        finally
        {
            setTwoFaLoading(false);
        }
    };

    const copyBackupCodes = () =>
    {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        toast.success(t('twoFactor.toast.backupCodesCopied'));
    };

    const resetTwoFaState = () =>
    {
        setTwoFaStep('idle');
        setTwoFaPassword('');
        setTwoFaCode('');
        setTotpURI('');
        setBackupCodes([]);
        setTwoFaError(null);
        setShowBackupCodes(false);
        setShowDisableConfirm(false);
        setDisablePassword('');
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

        {/* Profile Tab */}
        {activeTab === 'profile' && (
        <div className="space-y-6">
            {/* Full Name Section */}
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm text-neutral-400 mb-2">{t('labels.fullName')}</label>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-medium shrink-0">
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
        )}

        {/* Account Tab — Two-Factor Authentication */}
        {activeTab === 'account' && (
        <div className="space-y-6">
            <div className="border border-neutral-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {user.twoFactorEnabled
                            ? <ShieldCheck className="h-6 w-6 text-green-500" />
                            : <ShieldOff className="h-6 w-6 text-neutral-500" />
                        }
                        <div>
                            <h2 className="text-lg font-medium">{t('twoFactor.title')}</h2>
                            <p className="text-sm text-neutral-400">{t('twoFactor.description')}</p>
                        </div>
                    </div>
                    {user.twoFactorEnabled && (
                        <span className="text-xs font-medium px-2 py-1 bg-green-900/30 text-green-400 border border-green-800">
                            {t('twoFactor.enabled')}
                        </span>
                    )}
                </div>

                {/* 2FA Not Enabled — Setup Flow */}
                {!user.twoFactorEnabled && twoFaStep === 'idle' && (
                    <div className="mt-4">
                        <p className="text-sm text-neutral-400 mb-4">{t('twoFactor.setupDescription')}</p>
                        <Button
                            variant="default"
                            onClick={() => setTwoFaStep('password')}
                            className="cursor-pointer rounded-none select-none"
                        >
                            {t('twoFactor.enableButton')}
                        </Button>
                    </div>
                )}

                {/* Step 1: Enter password */}
                {!user.twoFactorEnabled && twoFaStep === 'password' && (
                    <div className="mt-4 space-y-4">
                        <p className="text-sm text-neutral-400">{t('twoFactor.enterPassword')}</p>
                        <input
                            type="password"
                            value={twoFaPassword}
                            onChange={(e) => setTwoFaPassword(e.target.value)}
                            placeholder={t('twoFactor.passwordPlaceholder')}
                            className="w-full max-w-sm bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                            autoFocus
                        />
                        {twoFaError && <p className="text-sm text-red-400">{twoFaError}</p>}
                        <div className="flex gap-3">
                            <Button
                                onClick={handleEnableTwoFa}
                                disabled={twoFaLoading || !twoFaPassword}
                                className="cursor-pointer rounded-none bg-white text-neutral-900 hover:bg-neutral-100"
                            >
                                {twoFaLoading ? t('twoFactor.loading') : t('twoFactor.continue')}
                            </Button>
                            <Button
                                onClick={resetTwoFaState}
                                variant="outline"
                                className="cursor-pointer rounded-none border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800"
                            >
                                {t('twoFactor.cancel')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: QR Code + Backup Codes */}
                {!user.twoFactorEnabled && twoFaStep === 'qr' && (
                    <div className="mt-4 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            {/* QR Code */}
                            <div>
                                <p className="text-sm text-neutral-400 mb-3">{t('twoFactor.scanQrCode')}</p>
                                <div className="bg-white p-4 inline-block">
                                    <QRCodeSVG value={totpURI} size={180} />
                                </div>
                            </div>

                            {/* Backup Codes */}
                            <div>
                                <p className="text-sm text-neutral-400 mb-3">{t('twoFactor.saveBackupCodes')}</p>
                                <div className="bg-neutral-800 border border-neutral-700 p-4 font-mono text-sm space-y-1">
                                    {backupCodes.map((code, i) => (
                                        <div key={i} className="text-neutral-200">{code}</div>
                                    ))}
                                </div>
                                <Button
                                    onClick={copyBackupCodes}
                                    variant="outline"
                                    className="cursor-pointer rounded-none border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800 mt-3"
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    {t('twoFactor.copyBackupCodes')}
                                </Button>
                            </div>
                        </div>

                        <Button
                            onClick={() => { setTwoFaStep('verify'); setTwoFaError(null); }}
                            className="cursor-pointer rounded-none bg-white text-neutral-900 hover:bg-neutral-100"
                        >
                            {t('twoFactor.continue')}
                        </Button>
                    </div>
                )}

                {/* Step 3: Verify code */}
                {!user.twoFactorEnabled && twoFaStep === 'verify' && (
                    <div className="mt-4 space-y-4">
                        <p className="text-sm text-neutral-400">{t('twoFactor.enterVerificationCode')}</p>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={twoFaCode}
                            onChange={(e) => setTwoFaCode(e.target.value)}
                            placeholder={t('twoFactor.codePlaceholder')}
                            className="w-full max-w-sm bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                            autoFocus
                        />
                        {twoFaError && <p className="text-sm text-red-400">{twoFaError}</p>}
                        <div className="flex gap-3">
                            <Button
                                onClick={handleVerifyTwoFa}
                                disabled={twoFaLoading || twoFaCode.length !== 6}
                                className="cursor-pointer rounded-none bg-white text-neutral-900 hover:bg-neutral-100"
                            >
                                {twoFaLoading ? t('twoFactor.loading') : t('twoFactor.verify')}
                            </Button>
                            <Button
                                onClick={resetTwoFaState}
                                variant="outline"
                                className="cursor-pointer rounded-none border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800"
                            >
                                {t('twoFactor.cancel')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* 2FA Enabled — Management */}
                {user.twoFactorEnabled && !showDisableConfirm && (
                    <div className="mt-4 space-y-4">
                        {/* Regenerate Backup Codes */}
                        {!showBackupCodes ? (
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <p className="text-sm text-neutral-300">{t('twoFactor.regenerateDescription')}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="password"
                                        value={twoFaPassword}
                                        onChange={(e) => setTwoFaPassword(e.target.value)}
                                        placeholder={t('twoFactor.passwordPlaceholder')}
                                        className="bg-neutral-800 border border-neutral-700 rounded-none px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                                    />
                                    <Button
                                        onClick={handleRegenerateBackupCodes}
                                        disabled={twoFaLoading || !twoFaPassword}
                                        variant="outline"
                                        className="cursor-pointer rounded-none border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800"
                                    >
                                        {t('twoFactor.regenerateBackupCodes')}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-neutral-400">{t('twoFactor.newBackupCodes')}</p>
                                <div className="bg-neutral-800 border border-neutral-700 p-4 font-mono text-sm space-y-1">
                                    {backupCodes.map((code, i) => (
                                        <div key={i} className="text-neutral-200">{code}</div>
                                    ))}
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        onClick={copyBackupCodes}
                                        variant="outline"
                                        className="cursor-pointer rounded-none border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800"
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        {t('twoFactor.copyBackupCodes')}
                                    </Button>
                                    <Button
                                        onClick={() => { setShowBackupCodes(false); setTwoFaPassword(''); setBackupCodes([]); }}
                                        variant="outline"
                                        className="cursor-pointer rounded-none border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800"
                                    >
                                        {t('twoFactor.done')}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {twoFaError && <p className="text-sm text-red-400">{twoFaError}</p>}

                        {/* Disable 2FA */}
                        <div className="border-t border-neutral-700 pt-4 mt-4">
                            <Button
                                onClick={() => setShowDisableConfirm(true)}
                                variant="outline"
                                className="cursor-pointer rounded-none border-red-800 text-red-400 hover:text-red-300 hover:bg-red-950"
                            >
                                {t('twoFactor.disableButton')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Disable 2FA Confirmation */}
                {user.twoFactorEnabled && showDisableConfirm && (
                    <div className="mt-4 space-y-4">
                        <p className="text-sm text-red-400">{t('twoFactor.disableWarning')}</p>
                        <input
                            type="password"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            placeholder={t('twoFactor.passwordPlaceholder')}
                            className="w-full max-w-sm bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                            autoFocus
                        />
                        {twoFaError && <p className="text-sm text-red-400">{twoFaError}</p>}
                        <div className="flex gap-3">
                            <Button
                                onClick={handleDisableTwoFa}
                                disabled={twoFaLoading || !disablePassword}
                                className="cursor-pointer rounded-none bg-red-600 text-white hover:bg-red-700"
                            >
                                {twoFaLoading ? t('twoFactor.loading') : t('twoFactor.confirmDisable')}
                            </Button>
                            <Button
                                onClick={() => { setShowDisableConfirm(false); setDisablePassword(''); setTwoFaError(null); }}
                                variant="outline"
                                className="cursor-pointer rounded-none border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-800"
                            >
                                {t('twoFactor.cancel')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
        )}
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
