'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { groupsService } from '@/services/groups.service';
import { Group, Thing } from '@/types';

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [things, setThings] = useState<Thing[]>([]);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [loadingThings, setLoadingThings] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', icon: '', color: '#6366f1', description: '' });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchGroup = async () => {
    setLoadingGroup(true);
    try {
      const data = await groupsService.findById(id);
      setGroup(data);
      setEditForm({ name: data.name, icon: data.icon || '', color: data.color || '#6366f1', description: data.description || '' });
    } catch (err) {
      console.error(err);
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
      console.error(err);
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
      await fetchGroup();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await groupsService.delete(id);
      router.push('/groups');
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  const thingColumns = [
    { key: 'name', header: 'Name' },
    { key: 'type', header: 'Type', render: (t: Thing) => t.type || '-' },
    { key: 'ipAddress', header: 'IP Address', render: (t: Thing) => t.ipAddress || '-' },
    { key: 'macAddress', header: 'MAC Address', render: (t: Thing) => t.macAddress || '-' },
    {
      key: 'status',
      header: 'Status',
      render: (t: Thing) => <StatusBadge status={t.status} />,
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
    return <div className="text-center py-12 text-muted-foreground">Group not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/groups')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold flex-1">{group.name}</h1>
        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>

      {/* Group Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Group Info</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium mt-1">{group.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Icon</p>
            <p className="font-medium mt-1 font-mono">{group.icon || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Color</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="h-4 w-4 rounded-full border border-border"
                style={{ backgroundColor: group.color || '#6366f1' }}
              />
              <span className="font-mono">{group.color || '-'}</span>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Description</p>
            <p className="font-medium mt-1">{group.description || '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Things in Group */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Things in this Group</h2>
        {!loadingThings && things.length === 0 ? (
          <EmptyState
            icon={Box}
            title="No things in this group"
            description="Assign devices to this group from the Things page."
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
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Group">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            id="edit-group-name"
            label="Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />
          <Input
            id="edit-group-icon"
            label="Icon name"
            placeholder="camera"
            value={editForm.icon}
            onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
          />
          <div className="space-y-1">
            <label htmlFor="edit-group-color" className="text-sm font-medium text-foreground">Color</label>
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
            label="Description"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Group"
        message={`Are you sure you want to delete "${group.name}"? This action cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
