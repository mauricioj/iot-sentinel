'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Plus, X, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CredentialsReveal } from '@/components/things/credentials-reveal';
import { getIconComponent } from '@/components/ui/icon-picker';
import { useThingTypes } from '@/contexts/thing-types-context';
import { scannerService } from '@/services/scanner.service';
import { thingsService } from '@/services/things.service';
import { networksService } from '@/services/networks.service';
import { groupsService } from '@/services/groups.service';
import { Thing, Network, Group } from '@/types';

export default function ThingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { thingTypes, getBySlug } = useThingTypes();

  const [thing, setThing] = useState<Thing | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [addGroupOpen, setAddGroupOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', type: '', networkId: '', macAddress: '', ipAddress: '',
    vendor: '', os: '', description: '',
    credentials: { username: '', password: '', notes: '' },
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [savingChannel, setSavingChannel] = useState(false);
  const [channelForm, setChannelForm] = useState({
    number: 1, direction: 'output', name: '', type: 'other', description: '',
  });

  const fetchThing = async () => {
    setLoading(true);
    try {
      const data = await thingsService.findById(id);
      setThing(data);
      setEditForm({
        name: data.name,
        type: data.type,
        networkId: data.networkId,
        macAddress: data.macAddress,
        ipAddress: data.ipAddress,
        vendor: data.vendor || '',
        os: data.os || '',
        description: data.description || '',
        credentials: data.credentials || { username: '', password: '', notes: '' },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThing();
    networksService.findAll(1, 100).then((r) => setNetworks(r.data)).catch(console.error);
    groupsService.findAll(1, 100).then((r) => setAllGroups(r.data)).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await thingsService.update(id, editForm);
      setEditOpen(false);
      await fetchThing();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await thingsService.delete(id);
      router.push('/things');
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingChannel(true);
    try {
      const existingChannels = thing?.channels || [];
      const newChannel = { ...channelForm, number: Number(channelForm.number) };
      await thingsService.update(id, { channels: [...existingChannels, newChannel] } as any);
      setChannelModalOpen(false);
      setChannelForm({ number: existingChannels.length + 2, direction: 'output', name: '', type: 'other', description: '' });
      await fetchThing();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingChannel(false);
    }
  };

  const handleRemoveChannel = async (index: number) => {
    try {
      const updatedChannels = (thing?.channels || []).filter((_, i) => i !== index);
      await thingsService.update(id, { channels: updatedChannels } as any);
      await fetchThing();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToGroup = async (groupId: string) => {
    if (!thing) return;
    const current = thing.groupIds || [];
    if (current.includes(groupId)) return;
    try {
      await thingsService.update(id, { groupIds: [...current, groupId] } as any);
      setAddGroupOpen(false);
      await fetchThing();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFromGroup = async (groupId: string) => {
    if (!thing) return;
    const updated = (thing.groupIds || []).filter((gid) => gid !== groupId);
    try {
      await thingsService.update(id, { groupIds: updated } as any);
      await fetchThing();
    } catch (err) {
      console.error(err);
    }
  };

  const typeOptions = thingTypes.map((t) => ({ value: t.slug, label: t.name }));
  const networkOptions = networks.map((n) => ({ value: n._id, label: n.name }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!thing) {
    return <div className="text-center py-12 text-muted-foreground">Thing not found.</div>;
  }

  const thingTypeData = thing ? getBySlug(thing.type) : undefined;

  const handleDeepScan = async () => {
    if (!thing?.networkId) return;
    setScanning(true);
    try {
      await scannerService.discover(thing.networkId, 'deep_scan');
    } catch (err) {
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  const credentials = thing.credentials || { username: '', password: '', notes: '' };
  const assignedGroups = allGroups.filter((g) => (thing.groupIds || []).includes(g._id));
  const availableGroups = allGroups.filter((g) => !(thing.groupIds || []).includes(g._id));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/things')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold flex-1">{thing.name}</h1>
        {thingTypeData?.capabilities.enablePortScan && (
          <Button variant="secondary" size="sm" onClick={handleDeepScan} disabled={scanning}>
            {scanning ? 'Scanning...' : <><Search className="h-4 w-4 mr-1" /> Deep Scan</>}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Device Info</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Name</p>
            <p className="font-medium mt-1">{thing.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium mt-1">{thing.type || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <div className="mt-1"><StatusBadge status={thing.status} /></div>
          </div>
          <div>
            <p className="text-muted-foreground">IP Address</p>
            <p className="font-medium mt-1 font-mono">{thing.ipAddress || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">MAC Address</p>
            <p className="font-medium mt-1 font-mono">{thing.macAddress || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Hostname</p>
            <p className="font-medium mt-1">{thing.hostname || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Vendor</p>
            <p className="font-medium mt-1">{thing.vendor || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">OS</p>
            <p className="font-medium mt-1">{thing.os || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Seen</p>
            <p className="font-medium mt-1">
              {thing.lastSeenAt ? new Date(thing.lastSeenAt).toLocaleString() : '-'}
            </p>
          </div>
          {thing.description && (
            <div className="col-span-full border-t border-border pt-3 mt-2">
              <p className="text-muted-foreground">Description</p>
              <p className="font-medium mt-1">{thing.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Groups Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Groups</CardTitle>
            {availableGroups.length > 0 && (
              <div className="relative">
                <Button size="sm" variant="secondary" onClick={() => setAddGroupOpen(!addGroupOpen)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add to Group
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
                {addGroupOpen && (
                  <div className="absolute right-0 top-full mt-1 z-10 min-w-48 rounded-lg border border-border bg-card shadow-lg">
                    {availableGroups.map((g) => {
                      const GIcon = getIconComponent(g.icon);
                      return (
                        <button
                          key={g._id}
                          type="button"
                          onClick={() => handleAddToGroup(g._id)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                        >
                          <GIcon className="h-4 w-4" style={{ color: g.color || '#6366f1' }} />
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {assignedGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Not assigned to any group yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assignedGroups.map((group) => {
                const GIcon = getIconComponent(group.icon);
                return (
                  <span
                    key={group._id}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm border"
                    style={{ borderColor: group.color || '#6366f1' }}
                  >
                    <GIcon className="h-4 w-4" style={{ color: group.color || '#6366f1' }} />
                    <span>{group.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromGroup(group._id)}
                      className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                      title={`Remove from ${group.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channels Section */}
      {thingTypeData?.capabilities.enableChannels !== false && <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Channels</CardTitle>
            <Button size="sm" onClick={() => {
              setChannelForm({
                number: (thing.channels?.length || 0) + 1,
                direction: 'output', name: '', type: 'other', description: '',
              });
              setChannelModalOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-1" />
              Add Channel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(!thing.channels || thing.channels.length === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No channels configured. Add channels for multi-output devices like PLCs.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Direction</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {thing.channels.map((ch, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono">{ch.number}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          ch.direction === 'output' ? 'bg-primary/20 text-primary' :
                          ch.direction === 'input' ? 'bg-success/20 text-success' :
                          'bg-warning/20 text-warning'
                        }`}>
                          {ch.direction}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{ch.name || '-'}</td>
                      <td className="px-4 py-3">{ch.type || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{ch.description || '-'}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRemoveChannel(i)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove channel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>}

      {/* Ports Section */}
      {thing.ports && thing.ports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Open Ports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Port</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Protocol</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Service</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Version</th>
                  </tr>
                </thead>
                <tbody>
                  {thing.ports.map((p, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono">{p.port}</td>
                      <td className="px-4 py-3">{p.protocol}</td>
                      <td className="px-4 py-3">{p.service || '-'}</td>
                      <td className="px-4 py-3">{p.version || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credentials Section */}
      {thingTypeData?.capabilities.enableCredentials !== false && (
        <Card>
          <CardContent>
            <CredentialsReveal credentials={credentials} />
          </CardContent>
        </Card>
      )}

      {/* Metadata Section */}
      {thing.metadata && Object.keys(thing.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted/30 rounded p-3 overflow-x-auto">
              {JSON.stringify(thing.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Thing">
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            id="edit-name"
            label="Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />
          <Select
            id="edit-type"
            label="Type"
            options={typeOptions}
            value={editForm.type}
            onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
          />
          <Select
            id="edit-network"
            label="Network"
            options={networkOptions}
            value={editForm.networkId}
            onChange={(e) => setEditForm({ ...editForm, networkId: e.target.value })}
          />
          <Input
            id="edit-mac"
            label="MAC Address"
            value={editForm.macAddress}
            onChange={(e) => setEditForm({ ...editForm, macAddress: e.target.value })}
          />
          <Input
            id="edit-ip"
            label="IP Address"
            value={editForm.ipAddress}
            onChange={(e) => setEditForm({ ...editForm, ipAddress: e.target.value })}
          />
          <Input
            id="edit-vendor"
            label="Vendor"
            placeholder="e.g., Hikvision"
            value={editForm.vendor}
            onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })}
          />
          <Input
            id="edit-os"
            label="OS"
            placeholder="e.g., Linux 5.4"
            value={editForm.os}
            onChange={(e) => setEditForm({ ...editForm, os: e.target.value })}
          />
          <Input
            id="edit-description"
            label="Description"
            placeholder="e.g., Front door IP camera"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
          <div className="border-t border-border pt-3">
            <p className="text-sm font-medium mb-2">Credentials</p>
            <div className="space-y-2">
              <Input
                id="edit-username"
                label="Username"
                value={editForm.credentials.username}
                onChange={(e) => setEditForm({ ...editForm, credentials: { ...editForm.credentials, username: e.target.value } })}
              />
              <Input
                id="edit-password"
                label="Password"
                type="password"
                value={editForm.credentials.password}
                onChange={(e) => setEditForm({ ...editForm, credentials: { ...editForm.credentials, password: e.target.value } })}
              />
              <Input
                id="edit-notes"
                label="Notes"
                value={editForm.credentials.notes}
                onChange={(e) => setEditForm({ ...editForm, credentials: { ...editForm.credentials, notes: e.target.value } })}
              />
            </div>
          </div>
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
        title="Delete Thing"
        message={`Are you sure you want to delete "${thing.name}"? This action cannot be undone.`}
        loading={deleting}
      />

      {/* Add Channel Modal */}
      <Modal open={channelModalOpen} onClose={() => setChannelModalOpen(false)} title="Add Channel">
        <form onSubmit={handleAddChannel} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="ch-number"
              label="Channel #"
              type="number"
              value={String(channelForm.number)}
              onChange={(e) => setChannelForm({ ...channelForm, number: Number(e.target.value) })}
              required
            />
            <Select
              id="ch-direction"
              label="Direction"
              options={[
                { value: 'input', label: 'Input' },
                { value: 'output', label: 'Output' },
                { value: 'bidirectional', label: 'Bidirectional' },
              ]}
              value={channelForm.direction}
              onChange={(e) => setChannelForm({ ...channelForm, direction: e.target.value })}
            />
          </div>
          <Input
            id="ch-name"
            label="Name"
            placeholder="e.g., Lamp Hall, Motor Gate"
            value={channelForm.name}
            onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
            required
          />
          <Select
            id="ch-type"
            label="Type"
            options={[
              { value: 'light', label: 'Light' },
              { value: 'motor', label: 'Motor' },
              { value: 'sensor', label: 'Sensor' },
              { value: 'relay', label: 'Relay' },
              { value: 'camera', label: 'Camera' },
              { value: 'port', label: 'Port' },
              { value: 'other', label: 'Other' },
            ]}
            value={channelForm.type}
            onChange={(e) => setChannelForm({ ...channelForm, type: e.target.value })}
          />
          <Input
            id="ch-description"
            label="Description (optional)"
            placeholder="e.g., Controls the garage door"
            value={channelForm.description}
            onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setChannelModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingChannel}>
              {savingChannel ? 'Adding...' : 'Add Channel'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
