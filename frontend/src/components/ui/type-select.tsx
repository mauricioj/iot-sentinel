'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/utils/cn';
import { getIconComponent } from './icon-picker';
import { useThingTypes } from '@/contexts/thing-types-context';

interface TypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  id?: string;
}

export function TypeSelect({ value, onChange, label, placeholder, id }: TypeSelectProps) {
  const { thingTypes } = useThingTypes();
  const tTypes = useTranslations('ThingTypes');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      const idx = thingTypes.findIndex((t) => t.slug === value);
      setHighlightIndex(idx >= 0 ? idx : 0);
    }
  }, [open, value, thingTypes]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || highlightIndex < 0 || !listRef.current) return;
    const items = listRef.current.children;
    if (items[highlightIndex]) {
      (items[highlightIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex, open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((prev) => (prev + 1) % thingTypes.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((prev) => (prev - 1 + thingTypes.length) % thingTypes.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < thingTypes.length) {
          onChange(thingTypes[highlightIndex].slug);
          setOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  }, [open, highlightIndex, thingTypes, onChange]);

  const selected = thingTypes.find((t) => t.slug === value);

  function getDisplayName(item: { slug: string; name: string; isSystem?: boolean }) {
    return item.isSystem && tTypes.has(item.slug) ? tTypes(item.slug as never) : item.name;
  }

  return (
    <div className="space-y-1 relative" ref={ref}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded border border-border bg-input px-3 py-2 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {selected ? (
          <span className="flex items-center gap-2">
            {(() => {
              const Icon = getIconComponent(selected.icon);
              return <Icon className="h-4 w-4 shrink-0" style={{ color: selected.color }} />;
            })()}
            {getDisplayName(selected)}
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded border border-border bg-card shadow-lg"
        >
          {thingTypes.map((item, index) => {
            const Icon = getIconComponent(item.icon);
            return (
              <button
                key={item.slug}
                type="button"
                role="option"
                aria-selected={item.slug === value}
                onClick={() => { onChange(item.slug); setOpen(false); }}
                onMouseEnter={() => setHighlightIndex(index)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer',
                  index === highlightIndex && 'bg-muted',
                  item.slug === value && index !== highlightIndex && 'bg-muted/50',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: item.color }} />
                {getDisplayName(item)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
