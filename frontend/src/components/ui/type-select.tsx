'use client';

import { useState, useRef, useEffect } from 'react';
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = thingTypes.find((t) => t.slug === value);

  function getDisplayName(item: { slug: string; name: string; isSystem?: boolean }) {
    return item.isSystem && tTypes.has(item.slug) ? tTypes(item.slug as never) : item.name;
  }

  return (
    <div className="space-y-1" ref={ref}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary',
        )}
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
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-auto min-w-[200px] overflow-auto rounded border border-border bg-card shadow-lg">
          {thingTypes.map((item) => {
            const Icon = getIconComponent(item.icon);
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => { onChange(item.slug); setOpen(false); }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors',
                  item.slug === value && 'bg-muted',
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
