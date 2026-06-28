import { cn } from '@/lib/cn';

type ToastVariant = 'success' | 'error' | 'info';

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-success-muted border-success/20 text-success',
  error: 'bg-red-50 border-red-200 text-red-700',
  info: 'bg-primary-muted border-primary/20 text-primary',
};

interface ToastProps {
  children: React.ReactNode;
  variant?: ToastVariant;
  className?: string;
}

export default function Toast({ children, variant = 'info', className }: ToastProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-[var(--radius-button)] border text-sm',
        variantClasses[variant],
        className,
      )}
      role="status"
    >
      {children}
    </div>
  );
}
