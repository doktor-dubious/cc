'use client';

import { useState, useMemo }            from 'react';
import { useSearchParams, useRouter }   from 'next/navigation';
import { useTranslations }              from 'next-intl';
import { ArrowLeft }                    from 'lucide-react';
import { Button }                       from '@/components/ui/button';
import { getControlById }               from '@/lib/constants/cis-controls';
import type { Safeguard }               from '@/lib/constants/cis-controls';

type IG = 'ig1' | 'ig2' | 'ig3';

const IG_KEYS: IG[] = ['ig1', 'ig2', 'ig3'];

const IG_LABELS: Record<IG, string> = { ig1: 'IG1', ig2: 'IG2', ig3: 'IG3' };
const IG_FULL_LABELS: Record<IG, string> = { ig1: 'Implementation Group 1', ig2: 'Implementation Group 2', ig3: 'Implementation Group 3' };

const TABLE_COLUMN_KEYS = ['asset', 'function', 'frequency', 'status', 'priority', 'likelihood', 'impact', 'owner'] as const;
const TABLE_COLUMNS = TABLE_COLUMN_KEYS.map((k) => k.charAt(0).toUpperCase() + k.slice(1));

export default function CISSafeguardsPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const t            = useTranslations('CISSafeguards');
  const controlId    = parseInt(searchParams.get('control') || '1', 10);
  const control      = getControlById(controlId);

  const [activeIG, setActiveIG] = useState<IG>('ig1');
  const [selectedSafeguard, setSelectedSafeguard] = useState<Safeguard | null>(null);

  // Filter safeguards that have content for the selected IG
  const filteredSafeguards = useMemo(() => {
    if (!control) return [];
    return control.safeguards.filter((s) => {
      const ig = s[activeIG];
      return ig.scope && ig.scope !== 'N/A';
    });
  }, [control, activeIG]);

  if (!control) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Control not found.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">

      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => router.push('/cis/controls')}
      >
        <ArrowLeft size={16} />
        Back to Controls
      </Button>

      {/* Control header */}
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">
          Control {control.id}: {control.title}
        </h1>

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Overview</h2>
          <p className="text-sm leading-relaxed">{control.definition}</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Purpose</h2>
          <p className="text-sm leading-relaxed">{control.purpose}</p>
        </div>
      </div>

      {/* IG buttons */}
      <div className="flex gap-3">
        {(['ig1', 'ig2', 'ig3'] as IG[]).map((ig) => (
          <Button
            key={ig}
            variant={activeIG === ig ? 'default' : 'outline'}
            onClick={() => setActiveIG(ig)}
            title={IG_FULL_LABELS[ig]}
          >
            {IG_LABELS[ig]}
          </Button>
        ))}
      </div>

      {/* Safeguards table */}
      {filteredSafeguards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No safeguards defined for {IG_FULL_LABELS[activeIG]} in this control.
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 whitespace-nowrap min-w-50">Safeguard</th>
                {TABLE_COLUMNS.map((col) => (
                  <th key={col} className="text-left p-3 whitespace-nowrap min-w-25">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSafeguards.map((safeguard) => (
                <tr
                  key={safeguard.id}
                  className={`border-t hover:bg-muted/50 cursor-pointer ${selectedSafeguard?.id === safeguard.id ? 'bg-muted/50' : ''}`}
                  onClick={() => setSelectedSafeguard(selectedSafeguard?.id === safeguard.id ? null : safeguard)}
                >
                  <td className="p-3">
                    <div className="font-medium">{safeguard.id} – {safeguard.title}</div>
                  </td>
                  {TABLE_COLUMNS.map((col) => (
                    <td key={col} className="p-3 text-muted-foreground text-sm">–</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail section below table */}
      {selectedSafeguard && (
        <div className="border rounded-lg p-6 bg-muted/30 space-y-4 max-w-3xl">
          <h3 className="text-lg font-semibold">{selectedSafeguard.id} – {selectedSafeguard.title}</h3>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Definition</p>
            <p className="text-sm">{selectedSafeguard.definition}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Purpose</p>
            <p className="text-sm">{selectedSafeguard.purpose}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Why</p>
            <p className="text-sm">{selectedSafeguard.why}</p>
          </div>

          <hr />

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Scope</p>
            <p className="text-sm">{selectedSafeguard[activeIG].scope}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Approach</p>
            <p className="text-sm">{selectedSafeguard[activeIG].approach}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Example</p>
            <p className="text-sm">{selectedSafeguard[activeIG].example}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Resources</p>
            <p className="text-sm">{selectedSafeguard[activeIG].resources}</p>
          </div>
        </div>
      )}
    </div>
  );
}
