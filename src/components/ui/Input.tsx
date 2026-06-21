import { cn } from '@/lib/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export default function Input({ label, hint, error, className, id, ...props }: InputProps) {
  const inputId = id || label;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full px-3 py-2 bg-surface border border-border rounded-[var(--radius-button)] text-sm text-foreground',
          'placeholder:text-muted/70',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-red-400 focus:ring-red-200',
          className,
        )}
        {...props}
      />
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
