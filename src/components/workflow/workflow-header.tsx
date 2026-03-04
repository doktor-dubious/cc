'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WorkflowHeaderProps {
  title: string;
  subtitle?: string;
  backUrl?: string;
}

export function WorkflowHeader({
  title,
  subtitle,
  backUrl = '/workflows/customer-onboarding',
}: WorkflowHeaderProps) {
  const router = useRouter();
  const tc = useTranslations('Common');

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(backUrl)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc('navigation.previous')}
        </Button>
        <div className="h-6 w-px bg-border" />
        <div>
          <h1 className="text-sm font-medium">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}
