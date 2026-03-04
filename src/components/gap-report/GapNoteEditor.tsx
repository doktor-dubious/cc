'use client';

import { useState, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';

type GapNoteEditorInnerProps = {
  initialContent: string;
  onSave: (content: string) => Promise<void>;
};

function GapNoteEditorInner({ initialContent, onSave }: GapNoteEditorInnerProps) {
  const t = useTranslations('GapReport');
  const [content, setContent] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleSave = useCallback(async (newContent: string) => {
    setSaveStatus('saving');
    try {
      await onSave(newContent);
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save note:', error);
      setSaveStatus('error');
    }
  }, [onSave]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setSaveStatus('idle');

    // Clear any existing debounce timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce timer
    debounceRef.current = setTimeout(() => {
      handleSave(newContent);
    }, 1000);
  };

  // Format time ago
  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return t('noteStatus.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('noteStatus.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    return t('noteStatus.hoursAgo', { count: hours });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('labels.notes')}
        </label>
        <span className="text-xs text-muted-foreground">
          {saveStatus === 'saving' && t('noteStatus.saving')}
          {saveStatus === 'saved' && lastSaved && t('noteStatus.saved', { time: formatTimeAgo(lastSaved) })}
          {saveStatus === 'error' && <span className="text-red-500">{t('noteStatus.error')}</span>}
        </span>
      </div>
      <Textarea
        value={content}
        onChange={handleChange}
        placeholder={t('placeholders.notes')}
        className="min-h-24 resize-y"
      />
    </div>
  );
}

type GapNoteEditorProps = {
  itemId: string;
  itemType: 'control' | 'safeguard';
  initialContent: string;
  onSave: (content: string) => Promise<void>;
};

// Wrapper that uses key to reset state when item changes
export function GapNoteEditor({ itemId, itemType, initialContent, onSave }: GapNoteEditorProps) {
  return (
    <GapNoteEditorInner
      key={`${itemType}:${itemId}`}
      initialContent={initialContent}
      onSave={onSave}
    />
  );
}
