'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter }              from 'next/navigation';
import { authClient }             from '@/lib/auth-client';

import { Label }                  from "@/components/ui/label"
import { Moon, Sun, ShieldCheck } from "lucide-react"
import { useTheme }               from "next-themes"
import { Button }                 from "@/components/ui/button"
import { Input }                  from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { useTranslations } from 'next-intl';

export default function TwoFactorPage()
{
    const [code, setCode] = useState('');
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [trustDevice, setTrustDevice] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const t = useTranslations('TwoFactorPage');

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleVerify = async (e: FormEvent<HTMLFormElement>) =>
    {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try
        {
            if (useBackupCode)
            {
                const { error } = await authClient.twoFactor.verifyBackupCode({
                    code,
                    trustDevice,
                });

                if (error)
                {
                    setError(error.message || t('errors.invalidBackupCode'));
                    setLoading(false);
                    return;
                }
            }
            else
            {
                const { error } = await authClient.twoFactor.verifyTotp({
                    code,
                    trustDevice,
                });

                if (error)
                {
                    setError(error.message || t('errors.invalidCode'));
                    setLoading(false);
                    return;
                }
            }

            router.push('/dashboard');
        }
        catch
        {
            setError(t('errors.verificationFailed'));
            setLoading(false);
        }
    };

    if (!mounted)
    {
        return (
            <Button variant="outline" size="icon" className="absolute top-4 right-4" disabled>
                <div className="h-5 w-5" />
            </Button>
        );
    }

    return (
<div className="min-h-screen flex items-center justify-center px-4 relative
                bg-cover bg-center bg-no-repeat bg-fixed
                bg-[url('/compliance-circle-login-background-light.jpg')]
                dark:bg-[url('/compliance-circle-login-background-dark.jpg')]">

    {/* Logo */}
    <div className="absolute top-4 left-4 z-20">
        <img
            src="/compliance-circle-logo.png"
            alt="Compliance Circle Logo"
            className="h-20 w-auto"
        />
    </div>

    <div className="w-full max-w-md">

        {/* Theme toggle */}
        <div className="absolute top-4 right-4">
            <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
                {theme === "dark" ? (
                    <Sun className="h-5 w-5" />
                ) : (
                    <Moon className="h-5 w-5" />
                )}
            </Button>
        </div>

        <Card className="border-gray-600 rounded-none">
            <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                    <ShieldCheck className="h-12 w-12 text-orange-500" />
                </div>
                <CardTitle className="text-xl">{t('title')}</CardTitle>
                <CardDescription>
                    {useBackupCode ? t('backupCodeDescription') : t('description')}
                </CardDescription>
            </CardHeader>

            <form onSubmit={handleVerify} className="space-y-4">
                <CardContent>
                    <div className="flex flex-col gap-4">
                        {/* Code input */}
                        <div className="grid gap-2">
                            <Label htmlFor="code">
                                {useBackupCode ? t('backupCodePlaceholder') : t('codePlaceholder')}
                            </Label>
                            <Input
                                id="code"
                                type="text"
                                inputMode={useBackupCode ? "text" : "numeric"}
                                maxLength={useBackupCode ? 20 : 6}
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder={useBackupCode ? t('backupCodePlaceholder') : t('codePlaceholder')}
                                autoComplete="one-time-code"
                                autoFocus
                                required
                                className="rounded-none text-center text-2xl tracking-[0.5em] font-mono"
                            />
                        </div>

                        {/* Trust device checkbox */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={trustDevice}
                                onChange={(e) => setTrustDevice(e.target.checked)}
                                className="rounded border-neutral-600"
                            />
                            <span className="text-sm text-muted-foreground">{t('trustDevice')}</span>
                        </label>

                        {/* Error message */}
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex-col gap-3">
                    <Button
                        type="submit"
                        disabled={loading || !code.trim()}
                        className="cursor-pointer rounded-none w-full"
                    >
                        {loading ? t('verifying') : t('verifyButton')}
                    </Button>

                    {/* Toggle backup code / authenticator */}
                    <button
                        type="button"
                        className="text-sm text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                        onClick={() => {
                            setUseBackupCode(!useBackupCode);
                            setCode('');
                            setError(null);
                        }}
                    >
                        {useBackupCode ? t('useAuthenticator') : t('useBackupCode')}
                    </button>
                </CardFooter>
            </form>
        </Card>
    </div>
</div>
    );
}
