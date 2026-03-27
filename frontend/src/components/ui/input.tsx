import { InputHTMLAttributes, forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const errorDescId = id ? `${id}-error` : undefined;
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorDescId : undefined}
            className={cn(
              'flex h-10 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive focus:ring-destructive pr-10',
              className,
            )}
            {...props}
          />
          {error && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
          )}
        </div>
        {error && <p id={errorDescId} className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
