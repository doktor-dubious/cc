'use client';

// GenerateFromRoadmapDialog
//
// Advisor-facing UI for the Roadmap → Tasks pipeline. Pick a roadmap phase →
// preview the generated task drafts (deterministic baseline, optionally
// LLM-specialized) → edit/deselect → approve & create. Talks to
// /api/task-generation/preview and /api/task-generation/commit. The parent owns
// the trigger button and passes onCommitted() to refresh its task list.

import { useState } from 'react';
import { AlertTriangle, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type Draft = {
  key:              string;
  title:            string;
  description:      string;
  expectedEvidence: string;
  safeguardIds:     string[];
  ownerRole:        string | null;
  steps:            string[];
  source:           'template' | 'derived' | string;
  aiApplied:        boolean;
};

type DraftState = Draft & { include: boolean };

const OWNER_LABELS: Record<string, string> = {
  IT: 'IT',
  MANAGEMENT: 'Management',
  OPERATIONS: 'Operations',
  SECURITY_COMPLIANCE: 'Security / Compliance',
  EXTERNAL_VENDOR: 'External Vendor',
};

export function GenerateFromRoadmapDialog({
  organizationId, open, onOpenChange, onCommitted,
}: {
  organizationId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommitted: () => void;
}) {
  const [phase, setPhase]       = useState<number>(1);
  const [status, setStatus]     = useState<'idle' | 'loading' | 'committing'>('idle');
  const [drafts, setDrafts]     = useState<DraftState[] | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [aiError, setAiError]   = useState<string | null>(null);
  const [notice, setNotice]     = useState<string | null>(null);

  const reset = () => { setDrafts(null); setNotice(null); setAiApplied(false); setAiError(null); setStatus('idle'); };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const generate = async () => {
    if (!organizationId) return;
    setStatus('loading');
    setDrafts(null);
    setNotice(null);
    try {
      const res = await fetch('/api/task-generation/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, phase }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error("Couldn't generate tasks", { description: json.error });
        setStatus('idle');
        return;
      }
      const list: Draft[] = json.data.drafts ?? [];
      setAiApplied(!!json.data.aiApplied);
      setAiError(typeof json.data.aiError === 'string' ? json.data.aiError : null);
      setDrafts(list.map(d => ({ ...d, include: true })));
      if (list.length === 0) setNotice(json.message ?? 'Nothing to generate for this phase.');
    } catch (err) {
      console.error('preview failed', err);
      toast.error("Couldn't generate tasks");
    } finally {
      setStatus(s => (s === 'loading' ? 'idle' : s));
    }
  };

  const patch = (key: string, p: Partial<DraftState>) =>
    setDrafts(prev => prev?.map(d => (d.key === key ? { ...d, ...p } : d)) ?? prev);

  const selected = drafts?.filter(d => d.include) ?? [];

  const commit = async () => {
    if (!organizationId || selected.length === 0) return;
    setStatus('committing');
    try {
      const res = await fetch('/api/task-generation/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          phase,
          drafts: selected.map(d => ({
            title: d.title, description: d.description, expectedEvidence: d.expectedEvidence,
            safeguardIds: d.safeguardIds, ownerRole: d.ownerRole,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Created ${json.data.created} task(s)`, { description: `From roadmap phase ${phase}` });
        onCommitted();
        handleOpenChange(false);
      } else {
        toast.error("Couldn't create tasks", { description: json.error });
        setStatus('idle');
      }
    } catch (err) {
      console.error('commit failed', err);
      toast.error("Couldn't create tasks");
      setStatus('idle');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" /> Generate tasks from roadmap
          </DialogTitle>
          <DialogDescription>
            Turn a roadmap phase&apos;s maturity steps into tasks. Review and edit the drafts before creating them.
          </DialogDescription>
        </DialogHeader>

        {/* Phase picker + generate */}
        <div className="flex items-end gap-3 border-b pb-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phase</label>
            <Select value={String(phase)} onValueChange={v => { setPhase(Number(v)); reset(); }}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map(p => <SelectItem key={p} value={String(p)}>Phase {p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generate} disabled={status === 'loading' || !organizationId} className="cursor-pointer">
            {status === 'loading'
              ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Generating…</>
              : <>Generate preview</>}
          </Button>
          {drafts && drafts.length > 0 && (
            <span className={`ml-auto text-xs inline-flex items-center gap-1.5 ${aiError ? 'text-yellow-600 dark:text-yellow-500' : 'text-muted-foreground'}`}>
              <Sparkles className="w-3.5 h-3.5" />
              {aiApplied ? 'AI-specialized' : aiError ? 'Baseline (AI step failed)' : 'Baseline (no LLM applied)'}
            </span>
          )}
        </div>

        {/* Drafts */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-3">
          {aiError && drafts && drafts.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-500">AI specialisation unavailable</p>
                <p className="text-muted-foreground mt-0.5">{aiError} Showing deterministic baseline tasks below.</p>
              </div>
            </div>
          )}

          {notice && <p className="text-sm text-muted-foreground py-6 text-center">{notice}</p>}

          {drafts?.map(d => (
            <div key={d.key} className={`rounded-lg border p-3 space-y-2 ${d.include ? '' : 'opacity-50'}`}>
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={d.include}
                  onCheckedChange={c => patch(d.key, { include: !!c })}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <Input
                    value={d.title}
                    onChange={e => patch(d.key, { title: e.target.value })}
                    className="font-medium"
                  />
                  <Textarea
                    value={d.description}
                    onChange={e => patch(d.key, { description: e.target.value })}
                    className="min-h-16 resize-y text-sm"
                  />
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Expected evidence</label>
                    <Textarea
                      value={d.expectedEvidence}
                      onChange={e => patch(d.key, { expectedEvidence: e.target.value })}
                      className="min-h-12 resize-y text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {d.safeguardIds.map(sid => (
                      <Badge key={sid} variant="secondary" className="font-mono text-[10px]">{sid}</Badge>
                    ))}
                    {d.ownerRole && (
                      <Badge variant="outline" className="text-[10px]">{OWNER_LABELS[d.ownerRole] ?? d.ownerRole}</Badge>
                    )}
                    <Badge variant={d.aiApplied ? 'default' : 'outline'} className="text-[10px]">
                      {d.aiApplied ? 'AI' : 'Baseline'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {drafts && drafts.length > 0 && (
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">{selected.length} of {drafts.length} selected</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="cursor-pointer">Cancel</Button>
              <Button onClick={commit} disabled={status === 'committing' || selected.length === 0} className="cursor-pointer">
                {status === 'committing'
                  ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Creating…</>
                  : <>Approve &amp; create {selected.length} task{selected.length === 1 ? '' : 's'}</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
