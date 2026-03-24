'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CredentialsReveal } from '@/components/things/credentials-reveal';
import { thingsService } from '@/services/things.service';
import { networksService } from '@/services/networks.service';
import { Thing, Network } from '@/types';

const THING_TYPES = [
  'router', 'switch', 'access_point', 'server', 'workstation', 'printer',
  'camera', 'sensor', 'iot_device', 'smart_tv', 'nas', 'firewall', 'other',
];

export default function ThingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [thing, setThing] = useState<Thing | null>(null);
  const [loading, setLoading] = useState(true);
  const [networks, setNetworks] = useState<Network[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', type: '', networkId: '', macAddress: '', ipAddress: '',
    credentials: { username: '', password: '', notes: '' },
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const typeOptions = THING_TYPES.map((t) => ({ value: t, label: t.replace('_', ' ') }));
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

  const credentials = thing.credentials || { username: '', password: '', notes: '' };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/things')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold flex-1">{thing.name}</h1>
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
            <p className="text-muted-foreground">Last Seen</p>
            <p className="font-medium mt-1">
              {thing.lastSeenAt ? new Date(thing.lastSeenAt).toLocaleString() : '-'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Channels Section */}
      {thing.channels && thing.channels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Number</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Direction</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {thing.channels.map((ch, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">{ch.number}</td>
                      <td className="px-4 py-3">{ch.direction}</td>
                      <td className="px-4 py-3">{ch.name || '-'}</td>
                      <td className="px-4 py-3">{ch.type || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
      <Card>
        <CardContent>
          <CredentialsReveal credentials={credentials} />
        </CardContent>
      </Card>

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
    </div>
  );
}
