'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Box, Trash2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { TypeSelect } from '@/components/ui/type-select';
import { getIconComponent } from '@/components/ui/icon-picker';
import { thingsService } from '@/services/things.service';
import { networksService } from '@/services/networks.service';
import { groupsService } from '@/services/groups.service';
import { usePagination } from '@/hooks/use-pagination';
import { useThingTypes } from '@/contexts/thing-types-context';
import { Thing, Network, Group } from '@/types';

export default function ThingsPage() {
  const router = useRouter();
  const t = useTranslations('Things');
  const tc = useTranslations('Common');
  const { thingTypes } = useThingTypes();
  const { toast } = useToast();
  const [things, setThings] = useState<Thing[]>([]);
  const [loading, setLoading] = useState(true);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [networkFilter, setNetworkFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Thing | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteDiscoveredOpen, setDeleteDiscoveredOpen] = useState(false);
  const [deletingDiscovered, setDeletingDiscovered] = useState(false);

  const [form, setForm] = useState({
    name: '', type: 'other', networkId: '', macAddress: '', ipAddress: '',
  });

  const pagination = usePagination();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchThings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(pagination.page),
        limit: String(pagination.limit),
      };
      if (debouncedSearch) params.q = debouncedSearch;
      if (statusFilter === 'discovered' || statusFilter === 'registered') {
        params.registrationStatus = statusFilter;
      } else if (statusFilter) {
        params.healthStatus = statusFilter;
      }
      if (networkFilter) params.networkId = networkFilter;
      if (groupFilter) params.groupId = groupFilter;

      const res = await thingsService.findAll(params);
      setThings(res.data);
      pagination.setTotal(res.meta.total);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, debouncedSearch, statusFilter, networkFilter, groupFilter]);

  useEffect(() => {
    fetchThings();
  }, [fetchThings]);

  useEffect(() => {
    networksService.findAll(1, 100).then((r) => setNetworks(r.data)).catch((err) => toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' }));
    groupsService.findAll(1, 100).then((r) => setGroups(r.data)).catch((err) => toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' }));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Strip empty strings so backend doesn't receive invalid ObjectIds
      const payload: Record<string, unknown> = { name: form.name };
      if (form.type) payload.type = form.type;
      if (form.networkId) payload.networkId = form.networkId;
      if (form.macAddress) payload.macAddress = form.macAddress;
      if (form.ipAddress) payload.ipAddress = form.ipAddress;

      const created = await thingsService.create(payload as Partial<Thing>);
      setModalOpen(false);
      setForm({ name: '', type: 'other', networkId: '', macAddress: '', ipAddress: '' });
      toast({ title: t('thingCreated'), variant: 'success' });
      router.push(`/things/${created._id}`);
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
      await thingsService.delete(deleteTarget._id);
      setDeleteTarget(null);
      toast({ title: t('thingDeleted'), variant: 'success' });
      await fetchThings();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteDiscovered = async () => {
    setDeletingDiscovered(true);
    try {
      await thingsService.deleteDiscovered();
      setDeleteDiscoveredOpen(false);
      toast({ title: t('discoveredDeleted'), variant: 'success' });
      await fetchThings();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setDeletingDiscovered(false);
    }
  };

  const statusOptions = [
    { value: '', label: t('allStatuses') },
    { value: 'discovered', label: t('discovered') },
    { value: 'registered', label: t('registered') },
    { value: 'online', label: t('online') },
    { value: 'offline', label: t('offline') },
    { value: 'unknown', label: t('unknown') },
  ];

  const networkOptions = [
    { value: '', label: t('allNetworks') },
    ...networks.map((n) => ({ value: n._id, label: n.name })),
  ];

  const groupOptions = [
    { value: '', label: t('allGroups') },
    ...groups.map((g) => ({ value: g._id, label: g.name })),
  ];

  const typeOptions = [
    { value: '', label: t('selectType') },
    ...thingTypes.map((tt) => ({ value: tt.slug, label: tt.name })),
  ];

  const networkSelectOptions = [
    { value: '', label: t('selectNetwork') },
    ...networks.map((n) => ({ value: n._id, label: n.name })),
  ];

  const columns = [
    {
      key: 'name',
      header: tc('name'),
      render: (item: Thing) => {
        const tt = thingTypes.find((typ) => typ.slug === item.type);
        const Icon = getIconComponent(tt?.icon || 'help-circle');
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0" style={{ color: tt?.color || '#94a3b8' }} />
            <span>{item.name}</span>
          </div>
        );
      },
    },
    { key: 'ipAddress', header: t('ipAddress'), render: (item: Thing) => item.ipAddress || '-' },
    { key: 'macAddress', header: t('macAddress'), render: (item: Thing) => item.macAddress || '-' },
    { key: 'vendor', header: t('vendor'), render: (item: Thing) => item.vendor || '-' },
    {
      key: 'status',
      header: tc('status'),
      render: (item: Thing) => <StatusBadge registrationStatus={item.registrationStatus} healthStatus={item.healthStatus} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (item: Thing) => (
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
        <div className="flex gap-2">
          <Button variant="destructive" onClick={() => setDeleteDiscoveredOpen(true)}>
            <XCircle className="h-4 w-4 mr-2" />
            {t('deleteDiscovered')}
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('newThing')}
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-44"
        />
        <Select
          options={networkOptions}
          value={networkFilter}
          onChange={(e) => setNetworkFilter(e.target.value)}
          className="w-44"
        />
        <Select
          options={groupOptions}
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          className="w-44"
        />
      </div>

      {!loading && things.length === 0 ? (
        <EmptyState
          icon={Box}
          title={t('emptyTitle')}
          description={t('emptyDesc')}
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('newThing')}
            </Button>
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={things}
            loading={loading}
            onRowClick={(item) => router.push(`/things/${item._id}`)}
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

      {/* Create Thing Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('newThing')} isDirty={form.name !== '' || form.macAddress !== ''}>
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="thing-name"
            label={tc('name')}
            placeholder={t('namePlaceholder')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TypeSelect
            id="thing-type"
            label={tc('type')}
            placeholder={t('selectType')}
            value={form.type}
            onChange={(value) => setForm({ ...form, type: value })}
          />
          <Select
            id="thing-network"
            label={t('network')}
            options={networkSelectOptions}
            value={form.networkId}
            onChange={(e) => setForm({ ...form, networkId: e.target.value })}
          />
          <Input
            id="thing-mac"
            label={t('macAddress')}
            placeholder={t('macPlaceholder')}
            value={form.macAddress}
            onChange={(e) => setForm({ ...form, macAddress: e.target.value })}
          />
          <Input
            id="thing-ip"
            label={t('ipAddress')}
            placeholder={t('ipPlaceholder')}
            value={form.ipAddress}
            onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
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
        title={t('deleteThing')}
        message={t('deleteThingConfirm', { name: deleteTarget?.name ?? '' })}
        loading={deleting}
      />

      <ConfirmDialog
        open={deleteDiscoveredOpen}
        onClose={() => setDeleteDiscoveredOpen(false)}
        onConfirm={handleDeleteDiscovered}
        title={t('deleteAllDiscovered')}
        message={t('deleteAllDiscoveredConfirm')}
        loading={deletingDiscovered}
      />
    </div>
  );
}
