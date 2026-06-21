import { cn } from '@/lib/cn';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export default function Textarea({ label, hint, error, className, id, ...props }: TextareaProps) {
  const textareaId = id || label;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          'w-full px-3 py-2 bg-surface border border-border rounded-[var(--radius-button)] text-sm text-foreground',
          'placeholder:text-muted/70 resize-none',
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
