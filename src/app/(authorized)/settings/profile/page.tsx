'use client';

import { useUser }              from '@/context/UserContext';
import { useRef, useEffect, useState }  from 'react';
import { zxcvbn }               from '@/lib/zxcvbn';
import { ShieldCheck, ShieldOff, Copy } from 'lucide-react';
import { QRCodeSVG }            from 'qrcode.react';
import { Button }               from "@/components/ui/button";
import { Checkbox }             from "@/components/ui/checkbox";
import { useTranslations }      from 'next-intl';
import { toast }                from "sonner";
import { Input }                from "@/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ProfileSettingsPage()
{
    const user = useUser();
    const t = useTranslations('User');
    const tc = useTranslations('Common');

    // Form fields
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Change detection & save state
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Tab state
    const [activeTab, setActiveTab] = useState("details");

    // Password strength
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState<number | null>(null);
    const [passwordFeedback, setPasswordFeedback] = useState<string>("");
    const passwordTimeout = useRef<NodeJS.Timeout | null>(null);

    // Login history (sessions)
    const [sessions, setSessions] = useState<any[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);
    const [sessionsFilter, setSessionsFilter] = useState("");
    const [sessionsCurrentPage, setSessionsCurrentPage] = useState(1);
    const sessionsPerPage = 8;

    // 2FA state
    const [twoFaEnabling, setTwoFaEnabling] = useState(false);
    const [twoFaTotpURI, setTwoFaTotpURI] = useState("");
    const [twoFaBackupCodes, setTwoFaBackupCodes] = useState<string[]>([]);
    const [twoFaShowSetup, setTwoFaShowSetup] = useState(false);
    const [twoFaConfirmDialogOpen, setTwoFaConfirmDialogOpen] = useState(false);
    const [twoFaConfirmChecked, setTwoFaConfirmChecked] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // FETCH SESSIONS FOR CURRENT USER
    const fetchSessions = async () =>
    {
        if (!user?.id) return;

        setSessionsLoading(true);
        try
        {
            const res = await fetch(`/api/user/${user.id}/sessions`);
            const data = await res.json();
            if (!data.success)
            {
                console.error('Failed to fetch sessions:', data.error);
                setSessions([]);
                return;
            }
            setSessions(data.data || []);
        }
        catch (error)
        {
            console.error('Failed to fetch sessions:', error);
            setSessions([]);
        }
        finally
        {
            setSessionsLoading(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // INITIAL LOAD
    useEffect(() =>
    {
        if (user)
        {
            setName(user.name || "");
            setEmail(user.email || "");
            setTwoFactorEnabled(user.twoFactorEnabled || false);
            fetchSessions();
        }
    }, [user]);

    // Listen for page refresh events
    useEffect(() =>
    {
        const handleRefresh = () => {
            fetchSessions();
        };
        window.addEventListener('refreshPage', handleRefresh);
        return () => window.removeEventListener('refreshPage', handleRefresh);
    }, [user]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // CHANGE DETECTION
    useEffect(() =>
    {
        if (!user)
        {
            setHasChanges(false);
            return;
        }

        const nameChanged     = name.trim() !== (user.name || "").trim();
        const passwordChanged = password.length > 0;

        setHasChanges(nameChanged || passwordChanged);
    }, [name, password, user]);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // CLEANUP TIMEOUTS
    useEffect(() =>
    {
        return () =>
        {
            if (passwordTimeout.current) clearTimeout(passwordTimeout.current);
        };
    }, []);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // PASSWORD CHANGE
    const handlePasswordChange = (value: string) =>
    {
        setPassword(value);
        setPasswordTouched(true);

        if (passwordTimeout.current) clearTimeout(passwordTimeout.current);

        passwordTimeout.current = setTimeout(() =>
        {
            if (!value)
            {
                setPasswordStrength(null);
                setPasswordFeedback('');
                return;
            }

            const result = zxcvbn(value, [
                name.trim() || "",
                email.split("@")[0] || "",
            ]);

            setPasswordStrength(result.score);

            let message = "";
            if (result.feedback.warning)
            {
                message = result.feedback.warning;
            }
            else if (result.feedback.suggestions.length > 0)
            {
                message = result.feedback.suggestions[0];
            }
            else if (result.score >= 3)
            {
                message = "Looks good!";
            }

            setPasswordFeedback(message);
        }, 400);
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SAVE PROFILE
    const handleSave = async () =>
    {
        if (!user || !name.trim()) return;

        // If password is being changed, require strong password
        if (password.length > 0)
        {
            const result = zxcvbn(password, [name, email]);
            if (result.score < 3)
            {
                toast.error(t('toast.passwordTooWeak'));
                return;
            }
        }

        setIsSaving(true);

        try
        {
            const body: Record<string, string> = {
                name: name.trim(),
            };

            if (password.length > 0)
            {
                body.password = password;
            }

            const res = await fetch(`/api/user/${user.id}`,
            {
                method  : 'PATCH',
                headers : { 'Content-Type': 'application/json' },
                body    : JSON.stringify(body),
            });

            const data = await res.json();

            if (!data.success)
            {
                toast.error(data.error || t('toast.saveError'));
                return;
            }

            setHasChanges(false);
            setPassword("");
            setPasswordStrength(null);
            setPasswordFeedback("");
            setPasswordTouched(false);
            toast.success(t('toast.userUpdated'));
        }
        catch (err)
        {
            console.error(err);
            toast.error(t('toast.saveError'));
        }
        finally
        {
            setIsSaving(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // SESSION HELPERS
    const parseUserAgent = (ua: string | null): string => {
        if (!ua) return 'Unknown Device';

        let browser = 'Unknown';
        if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Edg/')) browser = 'Edge';
        else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';
        else if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Safari')) browser = 'Safari';

        let os = 'Unknown';
        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac OS')) os = 'macOS';
        else if (ua.includes('Ubuntu')) os = 'Ubuntu';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

        return `${browser} (${os})`;
    };

    const formatLocation = (session: any): string => {
        const parts = [];
        if (session.city) parts.push(session.city);
        if (session.region) parts.push(session.region);
        if (session.country) parts.push(session.country);
        return parts.length > 0 ? parts.join(', ') : 'Unknown location';
    };

    const formatDateTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    // Filter and paginate sessions
    const filteredSessions = sessions.filter(s => {
        const searchLower = sessionsFilter.toLowerCase();
        const device = parseUserAgent(s.userAgent).toLowerCase();
        const location = formatLocation(s).toLowerCase();
        return device.includes(searchLower) || location.includes(searchLower) || (s.ipAddress || '').toLowerCase().includes(searchLower);
    });

    const sessionsTotalPages = Math.ceil(filteredSessions.length / sessionsPerPage);
    const sessionsStartIndex = (sessionsCurrentPage - 1) * sessionsPerPage;
    const sessionsEndIndex = sessionsStartIndex + sessionsPerPage;
    const currentSessions = filteredSessions.slice(sessionsStartIndex, sessionsEndIndex);

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // LOADING STATE
    if (!user) return <div>Loading...</div>;

    // ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // DOM
    return (
<>

{/* ── Enable 2FA Confirmation Dialog ── */}
<AlertDialog open={twoFaConfirmDialogOpen} onOpenChange={setTwoFaConfirmDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>{t('dialogs.enable2faTitle')}</AlertDialogTitle>
      <AlertDialogDescription className="space-y-3">
        <p>{t('dialogs.enable2faDescription')}</p>
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 mt-3">
          <p className="text-yellow-200 text-sm">{t('dialogs.enable2faWarning')}</p>
        </div>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <div className="flex items-start gap-3 py-2">
      <Checkbox
        id="enable-2fa-confirm"
        checked={twoFaConfirmChecked}
        onCheckedChange={(checked) => setTwoFaConfirmChecked(!!checked)}
      />
      <label htmlFor="enable-2fa-confirm" className="text-sm cursor-pointer leading-relaxed">
        {t('dialogs.enable2faConfirmCheckbox')}
      </label>
    </div>
    <AlertDialogFooter>
      <AlertDialogCancel>{tc('buttons.cancel')}</AlertDialogCancel>
      <AlertDialogAction
        disabled={!twoFaConfirmChecked || twoFaEnabling}
        onClick={async (e) => {
          e.preventDefault();
          if (!user) return;
          setTwoFaEnabling(true);
          try {
            const res = await fetch(`/api/user/${user.id}/enable-2fa`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (data.success) {
              setTwoFaTotpURI(data.data.totpURI);
              setTwoFaBackupCodes(data.data.backupCodes);
              setTwoFaShowSetup(true);
              setTwoFactorEnabled(true);
              toast.success(t('toast.twoFactorEnabled'));
              setTwoFaConfirmDialogOpen(false);
            } else {
              toast.error(data.error || t('toast.twoFactorEnableError'));
            }
          } catch (error) {
            console.error('Failed to enable 2FA:', error);
            toast.error(t('toast.twoFactorEnableError'));
          } finally {
            setTwoFaEnabling(false);
          }
        }}
      >
        {twoFaEnabling ? t('buttons.enabling') : t('buttons.enable2FA')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

<div className="space-y-8 p-6">
    <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="relative w-full max-w-300">
            <TabsList className="w-full bg-transparent border-b border-neutral-700 rounded-none p-0 h-auto grid grid-cols-3">
                <TabsTrigger
                    className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                    value="details"
                >
                    {t('tabs.details')}
                </TabsTrigger>
                <TabsTrigger
                    className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                    value="loginHistory"
                >
                    {t('tabs.loginHistory')}
                </TabsTrigger>
                <TabsTrigger
                    className="bg-transparent! rounded-none border-b-2 border-r-0 border-l-0 border-t-0 border-transparent data-[state=active]:bg-transparent relative z-10"
                    value="twoFactor"
                >
                    {t('sections.twoFactorTitle')}
                </TabsTrigger>
            </TabsList>

            {/* Sliding tab indicator */}
            <div
                className="absolute bottom-0 h-0.5 bg-white transition-all duration-300 ease-in-out z-0"
                style={{
                    width: '33.333%',
                    left: activeTab === 'details' ? '0%' : activeTab === 'loginHistory' ? '33.333%' : '66.666%'
                }}
            />
        </div>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6 max-w-2xl mt-6">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm mb-2">{t('labels.name')}</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('placeholders.enterName')}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
                    />
                </div>
                <div>
                    <label className="block text-sm mb-2">{t('labels.email')}</label>
                    <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-none px-4 py-2.5 opacity-60"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        {t('labels.emailCannotBeChanged')}
                    </p>
                </div>
                <div className="grid gap-2 relative">
                    <label className="block text-sm mb-2">{t('labels.password')}</label>
                    <input
                        type="password"
                        name="new-password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder={t('placeholders.enterNewPassword')}
                        className={`w-full bg-neutral-800 border rounded-none px-4 py-2.5 focus:outline-none focus:ring-2 focus:border-transparent
                            ${passwordStrength === 0 ? 'border-red-600 focus:ring-red-600' : ''}
                            ${passwordStrength === 1 ? 'border-orange-600 focus:ring-orange-600' : ''}
                            ${passwordStrength === 2 ? 'border-yellow-600 focus:ring-yellow-600' : ''}
                            ${passwordStrength === 3 ? 'border-green-600 focus:ring-green-600' : ''}
                            ${passwordStrength === 4 ? 'border-emerald-600 focus:ring-emerald-600' : ''}
                            ${passwordStrength === null ? 'border-neutral-700 focus:ring-neutral-600' : ''}
                        `}
                    />
                    <div className="h-1.5 w-full bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={`
                          h-full transition-all duration-300 ease-out
                          ${passwordStrength === null ? "w-0" : ""}
                          ${passwordStrength === 0 ? "w-1/5 bg-red-600" : ""}
                          ${passwordStrength === 1 ? "w-2/5 bg-orange-600" : ""}
                          ${passwordStrength === 2 ? "w-3/5 bg-yellow-500" : ""}
                          ${passwordStrength === 3 ? "w-4/5 bg-green-600" : ""}
                          ${passwordStrength === 4 ? "w-full bg-emerald-600" : ""}
                        `}
                      />
                    </div>
                    <div className="mt-1 text-xs">
                      {passwordStrength === 0 && <p className="text-red-600">{t('password.veryWeak')}&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({passwordFeedback})</span></p>}
                      {passwordStrength === 1 && <p className="text-orange-600">{t('password.weak')}&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({passwordFeedback})</span></p>}
                      {passwordStrength === 2 && <p className="text-yellow-600">{t('password.okay')}&nbsp;&nbsp;&nbsp;<span className="text-muted-foreground mt-1">({passwordFeedback})</span></p>}
                      {passwordStrength === 3 && <p className="text-green-600">{t('password.strong')}</p>}
                      {passwordStrength === 4 && <p className="text-emerald-600">{t('password.veryStrong')}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('password.onlyEnterToChange')}
                    </p>
                </div>
            </div>
        </TabsContent>

        {/* Login History Tab */}
        <TabsContent value="loginHistory" className="mt-6">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{t('sections.loginHistory')}</h3>
                    <Input
                        placeholder={t('placeholders.filterSessions')}
                        value={sessionsFilter}
                        onChange={(e) => {
                            setSessionsFilter(e.target.value);
                            setSessionsCurrentPage(1);
                        }}
                        className="max-w-sm"
                    />
                </div>

                {sessionsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {tc('loading')}...
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {sessionsFilter ? t('empty.noSessionsMatch') : t('empty.noSessions')}
                    </div>
                ) : (
                    <>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('sessionLabels.device')}</TableHead>
                                    <TableHead>{t('sessionLabels.location')}</TableHead>
                                    <TableHead>{t('sessionLabels.created')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentSessions.map((session) => (
                                    <TableRow key={session.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {parseUserAgent(session.userAgent)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatLocation(session)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatDateTime(session.createdAt)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {sessionsTotalPages > 1 && (
                            <div className="flex items-center justify-between mt-4">
                                <div className="text-sm text-muted-foreground">
                                    {t('pagination.showingSessions', { start: sessionsStartIndex + 1, end: Math.min(sessionsEndIndex, filteredSessions.length), total: filteredSessions.length })}
                                </div>
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => setSessionsCurrentPage(prev => Math.max(prev - 1, 1))}
                                                className={sessionsCurrentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                        </PaginationItem>
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                {Array.from({ length: sessionsTotalPages }, (_, i) => i + 1).map((page) => (
                                                    <PaginationItem key={page}>
                                                        <PaginationLink
                                                            onClick={() => setSessionsCurrentPage(page)}
                                                            isActive={sessionsCurrentPage === page}
                                                            className="cursor-pointer"
                                                        >
                                                            {page}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ))}
                                            </div>
                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() => setSessionsCurrentPage(prev => Math.min(prev + 1, sessionsTotalPages))}
                                                    className={sessionsCurrentPage === sessionsTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                />
                                            </PaginationItem>
                                        </div>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </>
                )}
            </div>
        </TabsContent>

        {/* 2FA Tab */}
        <TabsContent value="twoFactor" className="mt-6">
            <div className="space-y-6 max-w-2xl">
                {/* Two-Factor Authentication Section */}
                <div className="border border-neutral-700 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                {twoFactorEnabled
                                    ? <ShieldCheck className="h-5 w-5 text-green-500" />
                                    : <ShieldOff className="h-5 w-5 text-muted-foreground" />
                                }
                                <h4 className="font-medium">{t('sections.twoFactorTitle')}</h4>
                                {twoFactorEnabled && (
                                    <span className="text-xs font-medium px-2 py-0.5 bg-green-900/30 text-green-400 border border-green-800 ml-2">
                                        {t('sections.twoFactorEnabled')}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {twoFactorEnabled
                                    ? t('sections.twoFactorEnabledDescription')
                                    : t('sections.twoFactorDisabledDescription')
                                }
                            </p>
                        </div>

                        {/* Enable 2FA Button */}
                        {!twoFactorEnabled && !twoFaShowSetup && (
                            <Button
                                variant="default"
                                disabled={twoFaEnabling}
                                onClick={() => {
                                    setTwoFaConfirmChecked(false);
                                    setTwoFaConfirmDialogOpen(true);
                                }}
                                className="shrink-0"
                            >
                                <ShieldCheck className="w-4 h-4 mr-2" />
                                {t('buttons.enable2FA')}
                            </Button>
                        )}

                        {/* Disable 2FA Button */}
                        {twoFactorEnabled && !twoFaShowSetup && (
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    try {
                                        const res = await fetch(`/api/user/${user.id}/disable-2fa`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            toast.success(t('toast.twoFactorDisabled'));
                                            setTwoFactorEnabled(false);
                                        } else {
                                            toast.error(data.error || t('toast.twoFactorDisableError'));
                                        }
                                    } catch (error) {
                                        console.error('Failed to disable 2FA:', error);
                                        toast.error(t('toast.twoFactorDisableError'));
                                    }
                                }}
                                className="shrink-0"
                            >
                                <ShieldOff className="w-4 h-4 mr-2" />
                                {t('buttons.disable2FA')}
                            </Button>
                        )}
                    </div>

                    {/* 2FA Setup - QR Code and Backup Codes */}
                    {twoFaShowSetup && (
                        <div className="mt-6 pt-6 border-t border-neutral-700 space-y-6">
                            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                                <p className="text-sm text-yellow-200">
                                    {t('twoFactor.saveBackupCodes')}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* QR Code */}
                                <div>
                                    <p className="text-sm text-muted-foreground mb-3">{t('twoFactor.scanQrCode')}</p>
                                    <div className="bg-white p-4 inline-block rounded">
                                        <QRCodeSVG value={twoFaTotpURI} size={180} />
                                    </div>
                                </div>

                                {/* Backup Codes */}
                                <div>
                                    <p className="text-sm text-muted-foreground mb-3">{t('twoFactor.backupCodes')}</p>
                                    <div className="bg-neutral-800 border border-neutral-700 p-4 font-mono text-sm space-y-1 rounded">
                                        {twoFaBackupCodes.map((code, i) => (
                                            <div key={i} className="text-neutral-200">{code}</div>
                                        ))}
                                    </div>
                                    <Button
                                        onClick={() => {
                                            navigator.clipboard.writeText(twoFaBackupCodes.join('\n'));
                                            toast.success(t('toast.backupCodesCopied'));
                                        }}
                                        variant="outline"
                                        className="mt-3"
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        {t('buttons.copyBackupCodes')}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                onClick={() => {
                                    setTwoFaShowSetup(false);
                                    setTwoFaTotpURI("");
                                    setTwoFaBackupCodes([]);
                                }}
                                variant="default"
                            >
                                {t('buttons.done')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </TabsContent>
    </Tabs>
</div>

{/* ── Fixed save bar ── */}
{hasChanges && (
  <div className={`
    fixed bottom-0 left-0 right-0
    bg-background border-t border-neutral-800
    px-6 py-3
    flex justify-end items-center gap-3
    transition-transform duration-300 ease-in-out
    ${hasChanges ? 'translate-y-0' : 'translate-y-full'}
  `}>
    <Button
      variant="secondary"
      onClick={() => {
        setName(user.name || "");
        setPassword("");
        setHasChanges(false);
        setPasswordStrength(null);
        setPasswordFeedback("");
        setPasswordTouched(false);
      }}
      disabled={isSaving}
      className="rounded-none"
    >
      {tc('buttons.cancel')}
    </Button>

    <Button
      variant="default"
      onClick={handleSave}
      disabled={
        isSaving
        || !hasChanges
        || (!!password && (passwordStrength === null || passwordStrength < 3))
      }
    >
      {isSaving ? tc('buttons.saving') : tc('buttons.saveChanges')}
    </Button>
  </div>
)}

</>
    );
}
