'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Layers, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { IconPicker, getIconComponent } from '@/components/ui/icon-picker';
import { groupsService } from '@/services/groups.service';
import { Group } from '@/types';

export default function GroupsPage() {
  const router = useRouter();
  const t = useTranslations('Groups');
  const tc = useTranslations('Common');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '', color: '#6366f1', description: '' });
  const { toast } = useToast();

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await groupsService.findAll(1, 100);
      setGroups(res.data);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await groupsService.create(form);
      setModalOpen(false);
      setForm({ name: '', icon: '', color: '#6366f1', description: '' });
      toast({ title: t('groupCreated'), variant: 'success' });
      await fetchGroups();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await groupsService.delete(deleteTarget._id);
      setDeleteTarget(null);
      toast({ title: t('groupDeleted'), variant: 'success' });
      await fetchGroups();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('newGroup')}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={t('emptyTitle')}
          description={t('emptyDesc')}
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('newGroup')}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups.map((group) => {
            const GroupIcon = getIconComponent(group.icon);
            return (
              <div
                key={group._id}
                onClick={() => router.push(`/groups/${group._id}`)}
                className="relative rounded-lg border border-border bg-card p-5 cursor-pointer hover:bg-accent/30 transition-colors group"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(group); }}
                  className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  aria-label={t('deleteGroupLabel')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: group.color || '#6366f1' }}
                  />
                  <GroupIcon className="h-6 w-6" style={{ color: group.color || '#6366f1' }} />
                  <span className="text-base font-semibold truncate">{group.name}</span>
                </div>
                {group.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('newGroup')} isDirty={form.name.trim().length > 0}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="group-name"
            label={tc('name')}
            placeholder={t('namePlaceholder')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <IconPicker
            value={form.icon}
            onChange={(icon) => setForm({ ...form, icon })}
          />
          <div className="space-y-1">
            <label htmlFor="group-color" className="text-sm font-medium text-foreground">{t('color')}</label>
            <div className="flex items-center gap-3">
              <input
                id="group-color"
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-10 w-14 rounded border border-border bg-input cursor-pointer"
              />
              <Input
                placeholder={t('colorPlaceholder')}
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <Input
            id="group-description"
            label={tc('description')}
            placeholder={t('descPlaceholder')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {tc('create')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('deleteGroup')}
        message={t('deleteGroupConfirm', { name: deleteTarget?.name ?? '' })}
        loading={deleting}
      />
    </div>
  );
}
