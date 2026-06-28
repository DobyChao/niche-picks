'use client';

import Button from '@/components/ui/Button';
import Modal, { ModalFooter, ModalHeader } from '@/components/ui/Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'normal';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  variant = 'normal',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel}>
      <ModalHeader title={title} description={message} />
      <ModalFooter>
        <Button variant="secondary" className="flex-1" onClick={onCancel}>
          {cancelText}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          className="flex-1"
          onClick={onConfirm}
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
