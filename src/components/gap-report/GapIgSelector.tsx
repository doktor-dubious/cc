'use client';

import { Badge } from '@/components/ui/badge';

type GapIgSelectorProps = {
  value: number;
  onChange: (ig: number) => void;
  disabled?: boolean;
};

const IG_COLORS: Record<number, string> = {
  1: '#5D664D',
  2: '#335c8c',
  3: '#ad423f',
};

export function GapIgSelector({ value, onChange, disabled }: GapIgSelectorProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3].map((igValue) => {
        const isActive = value === igValue;
        return (
          <Badge
            key={igValue}
            className={`text-xs cursor-pointer transition-all border-0 ${
              isActive
                ? 'text-white ring-1 ring-white ring-offset-1 ring-offset-neutral-900'
                : 'text-white/70 opacity-40 hover:opacity-70'
            } ${disabled ? 'cursor-not-allowed' : ''}`}
            style={{ backgroundColor: IG_COLORS[igValue] }}
            onClick={() => !disabled && onChange(igValue)}
          >
            IG{igValue}
          </Badge>
        );
      })}
    </div>
  );
}
