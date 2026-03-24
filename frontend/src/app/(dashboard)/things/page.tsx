'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Box, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { thingsService } from '@/services/things.service';
import { networksService } from '@/services/networks.service';
import { groupsService } from '@/services/groups.service';
import { usePagination } from '@/hooks/use-pagination';
import { Thing, Network, Group } from '@/types';

const THING_TYPES = [
  'router', 'switch', 'access_point', 'server', 'workstation', 'printer',
  'camera', 'sensor', 'iot_device', 'smart_tv', 'nas', 'firewall', 'other',
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'discovered', label: 'Discovered' },
];

export default function ThingsPage() {
  const router = useRouter();
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

  const [form, setForm] = useState({
    name: '', type: 'other', networkId: '', macAddress: '', ipAddress: '',
    credentials: { username: '', password: '', notes: '' },
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
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      if (networkFilter) params.networkId = networkFilter;
      if (groupFilter) params.groupId = groupFilter;

      const res = await thingsService.findAll(params);
      setThings(res.data);
      pagination.setTotal(res.meta.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, debouncedSearch, statusFilter, networkFilter, groupFilter]);

  useEffect(() => {
    fetchThings();
  }, [fetchThings]);

  useEffect(() => {
    networksService.findAll(1, 100).then((r) => setNetworks(r.data)).catch(console.error);
    groupsService.findAll(1, 100).then((r) => setGroups(r.data)).catch(console.error);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await thingsService.create(form);
      setModalOpen(false);
      setForm({ name: '', type: 'other', networkId: '', macAddress: '', ipAddress: '', credentials: { username: '', password: '', notes: '' } });
      await fetchThings();
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
      await thingsService.delete(deleteTarget._id);
      setDeleteTarget(null);
      await fetchThings();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const networkOptions = [
    { value: '', label: 'All networks' },
    ...networks.map((n) => ({ value: n._id, label: n.name })),
  ];

  const groupOptions = [
    { value: '', label: 'All groups' },
    ...groups.map((g) => ({ value: g._id, label: g.name })),
  ];

  const typeOptions = [
    { value: '', label: 'Select type' },
    ...THING_TYPES.map((t) => ({ value: t, label: t.replace('_', ' ') })),
  ];

  const networkSelectOptions = [
    { value: '', label: 'Select network' },
    ...networks.map((n) => ({ value: n._id, label: n.name })),
  ];

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'type', header: 'Type', render: (item: Thing) => item.type || '-' },
    { key: 'ipAddress', header: 'IP Address', render: (item: Thing) => item.ipAddress || '-' },
    { key: 'macAddress', header: 'MAC Address', render: (item: Thing) => item.macAddress || '-' },
    {
      key: 'status',
      header: 'Status',
      render: (item: Thing) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (item: Thing) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Things</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Thing
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search things..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
        <Select
          options={STATUS_OPTIONS}
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
          title="No things found"
          description="Add your first IoT device or adjust the filters."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Thing
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
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={pagination.prev} disabled={!pagination.hasPrev}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" onClick={pagination.next} disabled={!pagination.hasNext}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Thing Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Thing">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="thing-name"
            label="Name"
            placeholder="My Router"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Select
            id="thing-type"
            label="Type"
            options={typeOptions}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
          <Select
            id="thing-network"
            label="Network"
            options={networkSelectOptions}
            value={form.networkId}
            onChange={(e) => setForm({ ...form, networkId: e.target.value })}
          />
          <Input
            id="thing-mac"
            label="MAC Address"
            placeholder="AA:BB:CC:DD:EE:FF"
            value={form.macAddress}
            onChange={(e) => setForm({ ...form, macAddress: e.target.value })}
          />
          <Input
            id="thing-ip"
            label="IP Address"
            placeholder="192.168.1.100"
            value={form.ipAddress}
            onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
          />
          <div className="border-t border-border pt-3">
            <p className="text-sm font-medium mb-2">Credentials (optional)</p>
            <div className="space-y-2">
              <Input
                id="thing-username"
                label="Username"
                value={form.credentials.username}
                onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, username: e.target.value } })}
              />
              <Input
                id="thing-password"
                label="Password"
                type="password"
                value={form.credentials.password}
                onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, password: e.target.value } })}
              />
              <Input
                id="thing-notes"
                label="Notes"
                value={form.credentials.notes}
                onChange={(e) => setForm({ ...form, credentials: { ...form.credentials, notes: e.target.value } })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Thing"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
