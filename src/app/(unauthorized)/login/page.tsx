'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { loginUser }              from '@/app/actions/authorization';
import { useRouter }              from 'next/navigation';

// UI components.
import { Label }                  from "@/components/ui/label"
import { Moon, Sun, Mail, Lock }  from "lucide-react"
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

import { InputIcon }              from '@/components/ui/cc/input-icon'
import { InputPassword }          from '@/components/ui/cc/input-password'
import { ButtonAnimatedLink }     from '@/components/ui/cc/button-animated-underline'

const Login = () =>
{
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState('');
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) =>
    {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);

        const result = await loginUser(formData);

        if (result.success === false)
        {
            setError(result.msg || "Invalid email or password. Please try again.");
        }
        else
        {
            router.push('/dashboard');
        }

        setLoading(false);
    };

    const { theme, setTheme } = useTheme();

    // Wait for client mount to avoid SSR mismatch
    useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted)
    {
        return 
          <Button variant="outline" size="icon" className="absolute top-4 right-4" disabled>
            <div className="h-5 w-5" />
          </Button>
    }

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

    <Button
        variant="outline"
        size="icon"
        className="absolute top-4 right-4"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        { theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
        ) }
    </Button>

    <Card className="border-gray-600 rounded-none">
      <CardHeader className="text-center">
        <CardTitle className="font-playfair font-light text-3xl md:text-4xl text-orange-500 mb-4">Compliance<br />Circle</CardTitle>
        <CardDescription>
          XX Login to access Compliance Circle
        </CardDescription>
      </CardHeader>
      <form id="login-form" onSubmit={handleEmailSubmit} className="space-y-4">
        <CardContent>
          <div className="flex flex-col gap-6">

            { /* Email */ }
            <div className="grid gap-2">
              <Label htmlFor="email">Login with</Label>
              <InputIcon
                  id="email"
                  icon={Mail}
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  className="rounded-none"
              />
            </div>
            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <InputPassword
                  id="password"
                  icon={Lock}
                  placeholder="Enter your password"
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
              {loading ? "Logging in..." : "Login"}
          </Button>

          <p className="text-xs text-center mt-6">
            By continuing, you agree to our&nbsp; 
              <ButtonAnimatedLink href="/terms-of-service" className="cursor-pointer text-xs p-0 h-auto font-normal">Terms of Service</ButtonAnimatedLink>
              &nbsp;and&nbsp;
              <ButtonAnimatedLink href="/privacy-policy" className="cursor-pointer text-xs p-0 h-auto font-normal">Privacy Policy</ButtonAnimatedLink>.
          </p>
        </CardFooter>
      </form>
    </Card>
  </div>
</div>
  );
}

export default Login;