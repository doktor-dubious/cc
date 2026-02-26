'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter }              from 'next/navigation';
import { authClient }             from '@/lib/auth-client';

// UI components.
import { Label }                  from "@/components/ui/label"
import { Moon, Sun, Mail, Lock, ChevronDown }  from "lucide-react"
import { useTheme }               from "next-themes"
import { Button }                 from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { InputIcon }              from '@/components/ui/cc/input-icon'
import { InputPassword }          from '@/components/ui/cc/input-password'
import { ButtonAnimatedLink }     from '@/components/ui/cc/button-animated-underline'

import { useLocale, useTranslations } from 'next-intl';
import { locales, localeConfig, type Locale } from '@/i18n/locales';
import { setLocale } from '@/app/actions/locale';

const Login = () =>
{
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState('');
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('LoginPage');

    const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) =>
    {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { error, data } = await authClient.signIn.email({
            email,
            password,
        });

        if (error)
        {
            setError(error.message || "Invalid email or password. Please try again.");
            setLoading(false);
        }
        else if (!(data as any)?.twoFactorRedirect)
        {
            // Only navigate if not being redirected to 2FA
            // (the twoFactorClient plugin handles the redirect via onTwoFactorRedirect)
            router.push('/dashboard');
        }
    };

    const { theme, setTheme } = useTheme();

    // Wait for client mount to avoid SSR mismatch
    useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted)
    {
        return (
          <Button variant="outline" size="icon" className="absolute top-4 right-4" disabled>
            <div className="h-5 w-5" />
          </Button>
        );
    }

    const CurrentFlag = localeConfig[locale as Locale]?.flag;

    return (
<div className="min-h-screen flex items-center justify-center px-4 relative
                bg-cover bg-center bg-no-repeat bg-fixed
                bg-[url('/compliance-circle-login-background-light.jpg')]
                dark:bg-[url('/compliance-circle-login-background-dark.jpg')]" >

  { /* logo */ }
  <div className="absolute top-4 left-4 z-20">
    <img
      src="/compliance-circle-logo.png"
      alt="Compliance Circle Logo"
      className="h-20 w-auto"
    />
  </div>

  <div className="w-full max-w-md">

    {/* Top-right controls: language dropdown + theme toggle */}
    <div className="absolute top-4 right-4 flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="cursor-pointer gap-2 px-3">
            {CurrentFlag && <CurrentFlag className="w-5 h-3.5" />}
            <span className="text-xs">{localeConfig[locale as Locale]?.label}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {locales.map((code) => {
            const { label, flag: Flag } = localeConfig[code];
            return (
              <DropdownMenuItem
                key={code}
                className={`cursor-pointer gap-2 group/lang ${locale === code ? 'font-bold' : ''}`}
                onClick={async () => { await setLocale(code); router.refresh(); }}
              >
                <Flag className="w-4 h-3 grayscale transition-[filter] duration-200 group-hover/lang:grayscale-0" />
                {label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          { theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
          ) }
      </Button>
    </div>

    <Card className="border-gray-600 rounded-none">
      <CardHeader className="text-center">
        <CardTitle className="font-playfair font-light text-3xl md:text-4xl text-orange-500 mb-4">Compliance<br />Circle</CardTitle>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <form id="login-form" onSubmit={handleEmailSubmit} className="space-y-4">
        <CardContent>
          <div className="flex flex-col gap-6">

            { /* Email */ }
            <div className="grid gap-2">
              <Label htmlFor="email">{t('loginWith')}</Label>
              <InputIcon
                  id="email"
                  icon={Mail}
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  className="rounded-none"
              />
            </div>
            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="password">{t('password')}</Label>
              <InputPassword
                  id="password"
                  icon={Lock}
                  placeholder={t('passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="rounded-none"
              />

              {/* Error message displayed right under the password field */}
              {error && (
              <p className="text-sm text-destructive mt-2">
                  {error}
              </p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            type="submit"
            disabled={loading}
            className="cursor-pointer rounded-none w-full">
              {loading ? t('loggingIn') : t('loginButton')}
          </Button>

          {/* Social sign-in divider */}
          <div className="relative w-full my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted-foreground/25" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">{t('orContinueWith')}</span>
            </div>
          </div>

          {/* Social sign-in buttons */}
          <div className="flex gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              className="cursor-pointer rounded-none flex-1"
              onClick={() => {
                setLoading(true);
                authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' });
              }}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {t('google')}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={loading}
              className="cursor-pointer rounded-none flex-1"
              onClick={() => {
                setLoading(true);
                authClient.signIn.social({ provider: 'microsoft', callbackURL: '/dashboard' });
              }}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 23 23">
                <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
                <rect x="12" y="1" width="10" height="10" fill="#7fba00"/>
                <rect x="1" y="12" width="10" height="10" fill="#00a4ef"/>
                <rect x="12" y="12" width="10" height="10" fill="#ffb900"/>
              </svg>
              {t('microsoft')}
            </Button>
          </div>

          <p className="text-xs text-center mt-6">
            {t('termsNotice')}&nbsp;
              <ButtonAnimatedLink href="/terms-of-service" className="cursor-pointer text-xs p-0 h-auto font-normal">{t('termsOfService')}</ButtonAnimatedLink>
              &nbsp;{t('and')}&nbsp;
              <ButtonAnimatedLink href="/privacy-policy" className="cursor-pointer text-xs p-0 h-auto font-normal">{t('privacyPolicy')}</ButtonAnimatedLink>.
          </p>
        </CardFooter>
      </form>
    </Card>
  </div>
</div>
  );
}

export default Login;
