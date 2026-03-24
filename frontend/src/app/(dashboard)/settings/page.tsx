'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Settings as SettingsIcon, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { api } from '@/services/api';
import { User } from '@/types';

interface AppSettings {
  instanceName: string;
  language: string;
  timezone: string;
  maxConcurrentScans: number;
  cooldownSeconds: number;
  statusCheckInterval: number;
}

const LANGUAGE_OPTIONS = [
  { value: 'pt-BR', label: 'Portuguese (pt-BR)' },
  { value: 'en-US', label: 'English (en-US)' },
];

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'America/Chicago', label: 'America/Chicago' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Paris', label: 'Europe/Paris' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney' },
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'viewer', label: 'Viewer' },
];

const DEFAULT_SETTINGS: AppSettings = {
  instanceName: '',
  language: 'en-US',
  timezone: 'UTC',
  maxConcurrentScans: 3,
  cooldownSeconds: 60,
  statusCheckInterval: 30,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'viewer' });

  const fetchSettings = async () => {
    try {
      const data = await api<Record<string, unknown>>('/api/v1/settings');
      setSettings({
        instanceName: (data.instanceName as string) || '',
        language: (data.language as string) || 'en-US',
        timezone: (data.timezone as string) || 'UTC',
        maxConcurrentScans: (data.maxConcurrentScans as number) ?? 3,
        cooldownSeconds: (data.cooldownSeconds as number) ?? 60,
        statusCheckInterval: (data.statusCheckInterval as number) ?? 30,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await api<User[]>('/api/v1/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await api('/api/v1/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      setSaveMessage({ type: 'success', text: 'Settings saved successfully.' });
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);
    try {
      await api('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(userForm),
      });
      setModalOpen(false);
      setUserForm({ username: '', password: '', role: 'viewer' });
      await fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/v1/users/${deleteTarget._id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const userColumns = [
    { key: 'username', header: 'Username' },
    {
      key: 'role',
      header: 'Role',
      render: (item: User) => (
        <Badge variant={item.role === 'admin' ? 'default' : 'secondary'}>
          {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (item: User) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Delete user"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Instance Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Instance Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <Input
              id="instance-name"
              label="Instance Name"
              placeholder="My IoT Sentinel"
              value={settings.instanceName}
              onChange={(e) => setSettings({ ...settings, instanceName: e.target.value })}
            />
            <Select
              id="language"
              label="Language"
              options={LANGUAGE_OPTIONS}
              value={settings.language}
              onChange={(e) => setSettings({ ...settings, language: e.target.value })}
            />
            <Select
              id="timezone"
              label="Timezone"
              options={TIMEZONE_OPTIONS}
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Scanner Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Scanner Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <Input
              id="max-concurrent-scans"
              label="Max Concurrent Scans"
              type="number"
              min={1}
              max={20}
              value={settings.maxConcurrentScans}
              onChange={(e) => setSettings({ ...settings, maxConcurrentScans: Number(e.target.value) })}
            />
            <Input
              id="cooldown-seconds"
              label="Cooldown (seconds)"
              type="number"
              min={0}
              value={settings.cooldownSeconds}
              onChange={(e) => setSettings({ ...settings, cooldownSeconds: Number(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Monitor Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Monitor Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <Input
              id="status-check-interval"
              label="Status Check Interval (seconds)"
              type="number"
              min={5}
              value={settings.statusCheckInterval}
              onChange={(e) => setSettings({ ...settings, statusCheckInterval: Number(e.target.value) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        {saveMessage && (
          <p className={`text-sm ${saveMessage.type === 'success' ? 'text-success' : 'text-destructive'}`}>
            {saveMessage.text}
          </p>
        )}
      </div>

      {/* Users section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Users</h2>
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        <DataTable
          columns={userColumns}
          data={users}
          loading={loadingUsers}
        />
      </div>

      {/* Add User Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add User">
        <form onSubmit={handleAddUser} className="space-y-4">
          <Input
            id="user-username"
            label="Username"
            placeholder="john.doe"
            value={userForm.username}
            onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
            required
          />
          <Input
            id="user-password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
            required
          />
          <Select
            id="user-role"
            label="Role"
            options={ROLE_OPTIONS}
            value={userForm.role}
            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={addingUser}>
              {addingUser ? 'Adding...' : 'Add User'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete user "${deleteTarget?.username}"? This action cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
