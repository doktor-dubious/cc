'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

type GapNavigationProps = {
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  currentIndex: number;
  totalItems: number;
};

export function GapNavigation({
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  currentIndex,
  totalItems,
}: GapNavigationProps) {
  const t = useTranslations('GapReport');

  return (
    <div className="flex items-center justify-between border-t pt-4 mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="gap-2"
      >
        <ChevronLeft className="w-4 h-4" />
        {t('navigation.previous')}
      </Button>

      <span className="text-sm text-muted-foreground">
        {currentIndex + 1} / {totalItems}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!hasNext}
        className="gap-2"
      >
        {t('navigation.next')}
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
