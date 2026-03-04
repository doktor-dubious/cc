'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const CMMI_LEVELS = [
  { level: 1, label: 'Initial / Ad Hoc' },
  { level: 2, label: 'Managed / Basic' },
  { level: 3, label: 'Defined / Documented' },
  { level: 4, label: 'Measured / Controlled' },
  { level: 5, label: 'Optimized / Continuous Improvement' },
] as const;

type GapCmmiSelectorProps = {
  label: string;
  value: number;
  onChange: (level: number) => void;
  className?: string;
  minLevel?: number;
};

export function GapCmmiSelector({ label, value, onChange, className, minLevel = 1 }: GapCmmiSelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-1">
        {CMMI_LEVELS.map((cmmi) => {
          const isActive = value === cmmi.level;
          const isDisabled = cmmi.level < minLevel;
          return (
            <button
              key={cmmi.level}
              onClick={() => !isDisabled && onChange(cmmi.level)}
              disabled={isDisabled}
              className={cn(
                'relative flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isDisabled
                  ? 'opacity-30 cursor-not-allowed'
                  : 'cursor-pointer',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : !isDisabled && 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="shrink-0">L{cmmi.level}</span>
              <motion.span
                initial={false}
                animate={{
                  width: isActive ? 'auto' : 0,
                  opacity: isActive ? 1 : 0,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
                className="overflow-hidden whitespace-nowrap text-xs"
              >
                {cmmi.label}
              </motion.span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type GapCmmiGroupProps = {
  currentCmmi: number;
  targetCmmi: number;
  onChange: (current: number, target: number) => void;
};

export function GapCmmiGroup({
  currentCmmi,
  targetCmmi,
  onChange,
}: GapCmmiGroupProps) {
  const t = useTranslations('GapReport');
  const gap = targetCmmi - currentCmmi;

  // Handle current CMMI change - if new value is higher than target, update target too
  const handleCurrentChange = (level: number) => {
    if (level > targetCmmi) {
      onChange(level, level);
    } else {
      onChange(level, targetCmmi);
    }
  };

  // Handle target CMMI change - ensure it's not lower than current
  const handleTargetChange = (level: number) => {
    if (level >= currentCmmi) {
      onChange(currentCmmi, level);
    }
  };

  return (
    <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 space-y-4">
      <GapCmmiSelector
        label={t('cmmi.currentCmmi')}
        value={currentCmmi}
        onChange={handleCurrentChange}
      />

      <GapCmmiSelector
        label={t('cmmi.targetCmmi')}
        value={targetCmmi}
        onChange={handleTargetChange}
        minLevel={currentCmmi}
      />

      <div className="pt-2 border-t border-neutral-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('cmmi.gap')}
          </span>
          <span className={cn(
            'text-lg font-semibold tabular-nums',
            gap > 0 ? 'text-yellow-500' : gap < 0 ? 'text-red-500' : 'text-green-500'
          )}>
            {gap > 0 ? '+' : ''}{gap}
          </span>
        </div>
      </div>
    </div>
  );
}
