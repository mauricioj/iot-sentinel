'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  isDirty?: boolean;
}

export function Modal({ open, onClose, title, children, className, isDirty }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [showDirtyConfirm, setShowDirtyConfirm] = useState(false);
  const t = useTranslations('Modal');

  const handleClose = () => {
    if (isDirty) {
      setShowDirtyConfirm(true);
    } else {
      onClose();
    }
  };

  const handleDiscard = () => {
    setShowDirtyConfirm(false);
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setShowDirtyConfirm(false);
      return;
    }

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open, isDirty]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
      onClick={(e) => { if (e.target === overlayRef.current) handleClose(); }}
    >
      <div className={cn(
        'w-full max-w-lg rounded-lg border border-border bg-card p-6 animate-[scaleIn_150ms_ease-out]',
        className,
      )}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={handleClose}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {showDirtyConfirm && (
          <div className="mb-4 rounded border border-warning/30 bg-warning/10 p-3">
            <p className="text-sm text-foreground mb-2">{t('unsavedChanges')}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDirtyConfirm(false)}
                className="px-3 py-1.5 text-sm font-medium rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                {t('keepEditing')}
              </button>
              <button
                onClick={handleDiscard}
                className="px-3 py-1.5 text-sm font-medium rounded bg-destructive text-white hover:bg-destructive/90 transition-colors cursor-pointer"
              >
                {t('discard')}
              </button>
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
