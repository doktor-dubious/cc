'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Check, Circle, Lock } from 'lucide-react';
import { XIcon, type XIconHandle } from '@/components/animate-ui/icons/x';
import { PlusIcon, type PlusIconHandle } from '@/components/animate-ui/icons/plus';

export type TimelineStepStatus = 'completed' | 'current' | 'upcoming' | 'locked' | 'inactive';

export type TimelineStep = {
  id: string;
  title: string;
  description: string;
  status: TimelineStepStatus;
  icon?: React.ReactNode;
};

interface WorkflowTimelineProps {
  steps: TimelineStep[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function WorkflowTimeline({
  steps,
  orientation = 'vertical',
  className,
}: WorkflowTimelineProps) {
  const isVertical = orientation === 'vertical';

  return (
    <div
      className={cn(
        'relative',
        isVertical ? 'flex flex-col' : 'flex flex-row items-start justify-between',
        className
      )}
    >
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step.id}
            className={cn(
              'relative',
              isVertical
                ? 'flex gap-6 pb-12 last:pb-0'
                : 'flex flex-col items-center flex-1'
            )}
          >
            {/* Connector Line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute bg-muted',
                  isVertical
                    ? 'left-[19px] top-10 w-0.5 h-[calc(100%-2.5rem)]'
                    : 'top-5 left-[calc(50%+1.5rem)] h-0.5 w-[calc(100%-3rem)]',
                  step.status === 'completed' && 'bg-foreground'
                )}
              />
            )}

            {/* Step Indicator */}
            <div
              className={cn(
                'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                step.status === 'completed' &&
                  'border-foreground bg-foreground text-background',
                step.status === 'current' &&
                  'border-foreground bg-background text-foreground shadow-lg shadow-foreground/25',
                step.status === 'upcoming' &&
                  'border-muted bg-background text-muted-foreground',
                step.status === 'locked' &&
                  'border-muted bg-muted text-muted-foreground'
              )}
            >
              {step.status === 'completed' ? (
                <Check className="h-5 w-5" />
              ) : step.status === 'locked' ? (
                <Lock className="h-4 w-4" />
              ) : step.icon ? (
                step.icon
              ) : (
                <Circle className="h-3 w-3 fill-current" />
              )}
            </div>

            {/* Step Content */}
            <div
              className={cn(
                'flex flex-col',
                isVertical ? 'flex-1' : 'mt-4 items-center text-center px-2'
              )}
            >
              <h3
                className={cn(
                  'font-semibold text-lg',
                  step.status === 'completed' && 'text-foreground',
                  step.status === 'current' && 'text-foreground',
                  step.status === 'upcoming' && 'text-muted-foreground',
                  step.status === 'locked' && 'text-muted-foreground'
                )}
              >
                {step.title}
              </h3>
              <p
                className={cn(
                  'mt-1 text-sm',
                  step.status === 'locked'
                    ? 'text-muted-foreground/60'
                    : 'text-muted-foreground'
                )}
              >
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TimelineStepCardProps {
  step: TimelineStep;
  stepNumber: number;
  isLast?: boolean;
  children?: React.ReactNode;
  className?: string;
  isAdaptMode?: boolean;
  isActive?: boolean;
  onToggle?: () => void;
  onSelect?: () => void;
}

export function TimelineStepCard({
  step,
  stepNumber,
  isLast = false,
  children,
  className,
  isAdaptMode = false,
  isActive = true,
  onToggle,
  onSelect,
}: TimelineStepCardProps) {
  const effectiveStatus = !isActive ? 'inactive' : step.status;
  const xIconRef = useRef<XIconHandle>(null);
  const plusIconRef = useRef<PlusIconHandle>(null);

  const handleButtonMouseEnter = () => {
    if (isActive) {
      xIconRef.current?.startAnimation();
    } else {
      plusIconRef.current?.startAnimation();
    }
  };

  const handleButtonMouseLeave = () => {
    if (isActive) {
      xIconRef.current?.stopAnimation();
    } else {
      plusIconRef.current?.stopAnimation();
    }
  };

  return (
    <div className={cn('relative flex gap-6', !isLast && 'pb-12', className)}>
      {/* Connector Line */}
      {!isLast && (
        <div
          className={cn(
            'absolute left-[19px] top-12 w-0.5 h-[calc(100%-3rem)] bg-muted',
            effectiveStatus === 'completed' && 'bg-foreground'
          )}
        />
      )}

      {/* Step Indicator */}
      <div
        onClick={() => !isAdaptMode && isActive && onSelect?.()}
        className={cn(
          'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-semibold text-sm transition-all',
          effectiveStatus === 'completed' &&
            'border-foreground bg-foreground text-background',
          effectiveStatus === 'current' &&
            'border-foreground bg-background text-foreground shadow-lg shadow-foreground/25 ring-4 ring-foreground/10',
          effectiveStatus === 'upcoming' &&
            'border-muted-foreground/30 bg-background text-muted-foreground',
          effectiveStatus === 'locked' &&
            'border-muted bg-muted text-muted-foreground',
          effectiveStatus === 'inactive' &&
            'border-dashed border-muted-foreground/30 bg-background text-muted-foreground/50',
          !isAdaptMode && isActive && effectiveStatus !== 'locked' && 'cursor-pointer hover:ring-2 hover:ring-foreground/20'
        )}
      >
        {effectiveStatus === 'completed' ? (
          <Check className="h-5 w-5" />
        ) : effectiveStatus === 'locked' ? (
          <Lock className="h-4 w-4" />
        ) : step.icon ? (
          step.icon
        ) : (
          stepNumber
        )}
      </div>

      {/* Step Content */}
      <div className="flex-1 pt-0.5">
        <div
          onClick={() => !isAdaptMode && isActive && onSelect?.()}
          className={cn(
            'relative rounded-lg border p-6 transition-all',
            effectiveStatus === 'current' &&
              'border-foreground/30 bg-foreground/5 shadow-sm',
            effectiveStatus === 'completed' && 'border-muted bg-muted/30',
            effectiveStatus === 'upcoming' && 'border-muted hover:border-foreground/20 hover:bg-foreground/5',
            effectiveStatus === 'locked' && 'border-muted bg-muted/20 opacity-60',
            effectiveStatus === 'inactive' && 'border-dashed border-muted-foreground/30 bg-muted/10 opacity-50',
            !isAdaptMode && isActive && effectiveStatus !== 'current' && 'cursor-pointer'
          )}
        >
          {/* Adapt mode toggle button */}
          {isAdaptMode && onToggle && (
            <button
              onClick={onToggle}
              onMouseEnter={handleButtonMouseEnter}
              onMouseLeave={handleButtonMouseLeave}
              className={cn(
                'absolute top-2 right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded border-2 transition-all hover:scale-105',
                'border-foreground/50 bg-foreground/10 text-foreground hover:bg-foreground/20'
              )}
              title={isActive ? 'Remove step' : 'Add step'}
            >
              {isActive ? (
                <XIcon ref={xIconRef} size={16} />
              ) : (
                <PlusIcon ref={plusIconRef} size={16} />
              )}
            </button>
          )}
          <h3
            className={cn(
              'font-semibold text-xl',
              effectiveStatus === 'locked' && 'text-muted-foreground',
              effectiveStatus === 'inactive' && 'text-muted-foreground line-through'
            )}
          >
            {step.title}
          </h3>
          <p
            className={cn(
              'mt-2 text-muted-foreground',
              effectiveStatus === 'locked' && 'text-muted-foreground/60',
              effectiveStatus === 'inactive' && 'text-muted-foreground/40'
            )}
          >
            {step.description}
          </p>
          {children && !isAdaptMode && isActive && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </div>
  );
}
