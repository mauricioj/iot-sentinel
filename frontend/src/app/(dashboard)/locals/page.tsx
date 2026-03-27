'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { localsService } from '@/services/locals.service';
import { usePagination } from '@/hooks/use-pagination';
import { Local } from '@/types';

export default function LocalsPage() {
  const router = useRouter();
  const t = useTranslations('Locals');
  const tc = useTranslations('Common');
  const [locals, setLocals] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Local | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', address: '' });
  const pagination = usePagination();

  const fetchLocals = async () => {
    setLoading(true);
    try {
      const res = await localsService.findAll(pagination.page, pagination.limit);
      setLocals(res.data);
      pagination.setTotal(res.meta.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await localsService.create(form);
      setModalOpen(false);
      setForm({ name: '', description: '', address: '' });
      router.push(`/locals/${created._id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await localsService.delete(deleteTarget._id);
      setDeleteTarget(null);
      await fetchLocals();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { key: 'name', header: tc('name') },
    { key: 'description', header: tc('description'), render: (item: Local) => item.description || '-' },
    { key: 'address', header: t('address'), render: (item: Local) => item.address || '-' },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (item: Local) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          aria-label={tc('delete')}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('newLocal')}
        </Button>
      </div>

      {!loading && locals.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={t('emptyTitle')}
          description={t('emptyDesc')}
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('newLocal')}
            </Button>
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={locals}
            loading={loading}
            onRowClick={(item) => router.push(`/locals/${item._id}`)}
          />
          {(pagination.hasNext || pagination.hasPrev) && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {tc('pageOf', { page: pagination.page, pages: pagination.pages })}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={pagination.prev} disabled={!pagination.hasPrev}>
                  {tc('previous')}
                </Button>
                <Button variant="secondary" size="sm" onClick={pagination.next} disabled={!pagination.hasNext}>
                  {tc('next')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('newLocal')}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="name"
            label={tc('name')}
            placeholder={t('namePlaceholder')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            id="description"
            label={tc('description')}
            placeholder={t('descPlaceholder')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            id="address"
            label={t('address')}
            placeholder={t('addressPlaceholder')}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? tc('creating') : tc('create')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteLocal')}
        message={t('deleteLocalConfirm', { name: deleteTarget?.name ?? '' })}
        loading={deleting}
      />
    </div>
  );
}
