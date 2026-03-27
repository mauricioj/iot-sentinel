'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  title: string;
  variant: ToastVariant;
  exiting?: boolean;
}

interface ToastContextType {
  toast: (opts: { title: string; variant?: ToastVariant }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 0;

const config: Record<ToastVariant, { icon: typeof CheckCircle2; borderColor: string; iconColor: string }> = {
  success: { icon: CheckCircle2, borderColor: 'border-l-success', iconColor: 'text-success' },
  error: { icon: XCircle, borderColor: 'border-l-destructive', iconColor: 'text-destructive' },
  info: { icon: Info, borderColor: 'border-l-primary', iconColor: 'text-primary' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const toast = useCallback(({ title, variant = 'success' }: { title: string; variant?: ToastVariant }) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, title, variant }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => {
          const { icon: Icon, borderColor, iconColor } = config[t.variant];
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border border-border border-l-4 bg-card p-4 shadow-lg',
                borderColor,
                t.exiting ? 'animate-[fadeOut_200ms_ease-in_forwards]' : 'animate-[slideInRight_200ms_ease-out]',
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconColor)} />
              <p className="text-sm text-foreground flex-1">{t.title}</p>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
