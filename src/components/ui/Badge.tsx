import { cn } from '@/lib/cn';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'muted';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-primary-muted text-primary',
  primary: 'bg-primary text-white',
  success: 'bg-success-muted text-success',
  warning: 'bg-warning-muted text-warning',
  muted: 'bg-background text-muted border border-border',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
