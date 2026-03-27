'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Pencil, Trash2, Box, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { IconPicker, getIconComponent } from '@/components/ui/icon-picker';
import { groupsService } from '@/services/groups.service';
import { thingsService } from '@/services/things.service';
import { Group, Thing } from '@/types';

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const t = useTranslations('GroupDetail');
  const tc = useTranslations('Common');

  const [group, setGroup] = useState<Group | null>(null);
  const [things, setThings] = useState<Thing[]>([]);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [loadingThings, setLoadingThings] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', icon: '', color: '#6366f1', description: '' });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // Assign things modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [allThings, setAllThings] = useState<Thing[]>([]);
  const [loadingAllThings, setLoadingAllThings] = useState(false);
  const [selectedThingIds, setSelectedThingIds] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');

  const fetchGroup = async () => {
    setLoadingGroup(true);
    try {
      const data = await groupsService.findById(id);
      setGroup(data);
      setEditForm({ name: data.name, icon: data.icon || '', color: data.color || '#6366f1', description: data.description || '' });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setLoadingGroup(false);
    }
  };

  const fetchThings = async () => {
    setLoadingThings(true);
    try {
      const res = await groupsService.getThings(id);
      setThings(res.data);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setLoadingThings(false);
    }
  };

  useEffect(() => {
    fetchGroup();
    fetchThings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await groupsService.update(id, editForm);
      setEditOpen(false);
      toast({ title: t('groupUpdated'), variant: 'success' });
      await fetchGroup();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await groupsService.delete(id);
      toast({ title: t('groupDeleted'), variant: 'success' });
      router.push('/groups');
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
      setDeleting(false);
    }
  };

  const openAssignModal = async () => {
    setAssignOpen(true);
    setSelectedThingIds(new Set());
    setAssignSearch('');
    setLoadingAllThings(true);
    try {
      const res = await thingsService.findAll({ page: '1', limit: '200', registrationStatus: 'registered' });
      // Filter out things already in this group
      const currentIds = new Set(things.map((t) => t._id));
      setAllThings(res.data.filter((t) => !currentIds.has(t._id)));
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setLoadingAllThings(false);
    }
  };

  const toggleThingSelection = (thingId: string) => {
    setSelectedThingIds((prev) => {
      const next = new Set(prev);
      if (next.has(thingId)) next.delete(thingId);
      else next.add(thingId);
      return next;
    });
  };

  const handleAssignThings = async () => {
    if (selectedThingIds.size === 0) return;
    setAssigning(true);
    try {
      await Promise.all(
        Array.from(selectedThingIds).map(async (thingId) => {
          const thing = allThings.find((t) => t._id === thingId);
          if (!thing) return;
          const currentGroups = thing.groupIds || [];
          if (!currentGroups.includes(id)) {
            await thingsService.update(thingId, { groupIds: [...currentGroups, id] } as any);
          }
        }),
      );
      setAssignOpen(false);
      toast({ title: t('thingsAssigned'), variant: 'success' });
      await fetchThings();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setAssigning(false);
    }
  };

  const filteredAssignThings = allThings.filter((t) => {
    if (!assignSearch) return true;
    const q = assignSearch.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.ipAddress || '').includes(q) || (t.macAddress || '').toLowerCase().includes(q);
  });

  const thingColumns = [
    { key: 'name', header: tc('name') },
    { key: 'type', header: tc('type'), render: (thing: Thing) => thing.type || '-' },
    { key: 'ipAddress', header: t('ipAddress'), render: (thing: Thing) => thing.ipAddress || '-' },
    { key: 'macAddress', header: t('macAddress'), render: (thing: Thing) => thing.macAddress || '-' },
    {
      key: 'status',
      header: tc('status'),
      render: (thing: Thing) => <StatusBadge registrationStatus={thing.registrationStatus} healthStatus={thing.healthStatus} />,
    },
  ];

  if (loadingGroup) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!group) {
    return <div className="text-center py-12 text-muted-foreground">{t('notFound')}</div>;
  }

  const GroupIcon = getIconComponent(group.icon);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/groups')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {tc('back')}
        </Button>
        <GroupIcon className="h-6 w-6" style={{ color: group.color || '#6366f1' }} />
        <h1 className="text-2xl font-bold flex-1">{group.name}</h1>
        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-1" />
          {tc('edit')}
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4 mr-1" />
          {tc('delete')}
        </Button>
      </div>

      {/* Group Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('groupInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{tc('name')}</p>
            <p className="font-medium mt-1">{group.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('icon')}</p>
            <div className="flex items-center gap-2 mt-1">
              <GroupIcon className="h-5 w-5" style={{ color: group.color || '#6366f1' }} />
              <span className="font-mono">{group.icon || '-'}</span>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">{t('color')}</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="h-4 w-4 rounded-full border border-border"
                style={{ backgroundColor: group.color || '#6366f1' }}
              />
              <span className="font-mono">{group.color || '-'}</span>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">{tc('description')}</p>
            <p className="font-medium mt-1">{group.description || '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Things in Group */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('thingsInGroup')}</h2>
          <Button size="sm" onClick={openAssignModal}>
            <Plus className="h-4 w-4 mr-1" />
            {t('assignThings')}
          </Button>
        </div>
        {!loadingThings && things.length === 0 ? (
          <EmptyState
            icon={Box}
            title={t('emptyTitle')}
            description={t('emptyDesc')}
          />
        ) : (
          <DataTable
            columns={thingColumns}
            data={things}
            loading={loadingThings}
            onRowClick={(item) => router.push(`/things/${item._id}`)}
          />
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('editGroup')} isDirty={
        editForm.name !== (group?.name ?? '') ||
        editForm.icon !== (group?.icon ?? '') ||
        editForm.color !== (group?.color ?? '#6366f1') ||
        editForm.description !== (group?.description ?? '')
      }>
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            id="edit-group-name"
            label={tc('name')}
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <IconPicker
            value={editForm.icon}
            onChange={(icon) => setEditForm({ ...editForm, icon })}
          />
          <div className="space-y-1">
            <label htmlFor="edit-group-color" className="text-sm font-medium text-foreground">{t('color')}</label>
            <div className="flex items-center gap-3">
              <input
                id="edit-group-color"
                type="color"
                value={editForm.color}
                onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                className="h-10 w-14 rounded border border-border bg-input cursor-pointer"
              />
              <Input
                placeholder="#6366f1"
                value={editForm.color}
                onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <Input
            id="edit-group-description"
            label={tc('description')}
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {tc('save')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('deleteGroup')}
        message={t('deleteGroupConfirm', { name: group?.name ?? '' })}
        loading={deleting}
      />

      {/* Assign Things Modal */}
      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title={t('assignThings')} isDirty={selectedThingIds.size > 0}>
        <div className="space-y-4">
          <Input
            id="assign-search"
            placeholder={t('searchThings')}
            value={assignSearch}
            onChange={(e) => setAssignSearch(e.target.value)}
          />
          <div className="max-h-72 overflow-y-auto rounded border border-border">
            {loadingAllThings ? (
              <div className="flex items-center justify-center h-20">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredAssignThings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t('noAvailableThings')}</p>
            ) : (
              filteredAssignThings.map((thing) => (
                <label
                  key={thing._id}
                  className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedThingIds.has(thing._id)}
                    onChange={() => toggleThingSelection(thing._id)}
                    className="rounded border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{thing.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{thing.ipAddress || thing.macAddress || '-'}</p>
                  </div>
                  <StatusBadge registrationStatus={thing.registrationStatus} healthStatus={thing.healthStatus} />
                </label>
              ))
            )}
          </div>
          {selectedThingIds.size > 0 && (
            <p className="text-xs text-muted-foreground">{t('selectedCount', { count: selectedThingIds.size })}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAssignOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleAssignThings} loading={assigning} disabled={selectedThingIds.size === 0}>
              {t('assignThings')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
