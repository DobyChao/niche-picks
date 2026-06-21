'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/cn';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export default function Modal({
  open,
  onClose,
  children,
  className,
  maxWidth = 'sm',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2c2416]/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'bg-surface rounded-[var(--radius-modal)] shadow-[var(--shadow-elevated)] w-full overflow-hidden',
          maxWidthClasses[maxWidth],
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

interface ModalHeaderProps {
  title: string;
  description?: string;
}

export function ModalHeader({ title, description }: ModalHeaderProps) {
  return (
    <div className="px-6 py-5 border-b border-border">
      <h3 className="text-lg font-semibold text-foreground font-serif">{title}</h3>
      {description && <p className="mt-2 text-sm text-muted leading-relaxed">{description}</p>}
    </div>
  );
}

interface ModalFooterProps {
  children: React.ReactNode;
}

export function ModalFooter({ children }: ModalFooterProps) {
  return <div className="flex gap-3 px-6 pb-5 pt-2">{children}</div>;
}
