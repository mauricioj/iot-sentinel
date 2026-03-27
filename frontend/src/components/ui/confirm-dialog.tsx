'use client';

import { useTranslations } from 'next-intl';
import { Modal } from './modal';
import { Button } from './button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }: ConfirmDialogProps) {
  const t = useTranslations('ConfirmDialog');
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex items-start gap-3 mb-6">
        <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
        <Button variant="destructive" onClick={onConfirm} disabled={loading}>
          {loading ? t('deleting') : t('delete')}
        </Button>
      </div>
    </Modal>
  );
}
