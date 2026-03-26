'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, Settings as SettingsIcon, Users, Download, Upload, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { api } from '@/services/api';
import { backupService } from '@/services/backup.service';
import { thingTypesService } from '@/services/thing-types.service';
import { useThingTypes } from '@/contexts/thing-types-context';
import { getIconComponent, IconPicker } from '@/components/ui/icon-picker';
import { User, ThingTypeItem } from '@/types';

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

  // Backup state
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPassword, setExportPassword] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Thing Types state
  const { thingTypes, refresh: refreshTypes } = useThingTypes();
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ThingTypeItem | null>(null);
  const [savingType, setSavingType] = useState(false);
  const [deleteTypeTarget, setDeleteTypeTarget] = useState<ThingTypeItem | null>(null);
  const [deletingType, setDeletingType] = useState(false);
  const [typeForm, setTypeForm] = useState({
    name: '', slug: '', icon: 'help-circle', color: '#94a3b8',
    capabilities: { enableChannels: false, enablePortScan: false, enableCredentials: false },
  });

  const fetchSettings = async () => {
    try {
      const data = await api<Record<string, any>>('/api/v1/settings');
      setSettings({
        instanceName: data.instanceName || '',
        language: data.language || 'en-US',
        timezone: data.timezone || 'UTC',
        maxConcurrentScans: data.scanner?.maxConcurrentScans ?? 1,
        cooldownSeconds: data.scanner?.cooldownSeconds ?? 60,
        statusCheckInterval: data.monitor?.statusCheckInterval ?? 300,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api<{ data: User[]; meta: Record<string, number> }>('/api/v1/users');
      setUsers(res.data);
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
        body: JSON.stringify({
          instanceName: settings.instanceName,
          language: settings.language,
          timezone: settings.timezone,
          scanner: {
            maxConcurrentScans: settings.maxConcurrentScans,
            cooldownSeconds: settings.cooldownSeconds,
          },
          monitor: {
            statusCheckInterval: settings.statusCheckInterval,
          },
        }),
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

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);
    setExportMessage(null);
    try {
      const blob = await backupService.exportBackup(exportPassword);
      const filename = `iot-sentinel-backup-${new Date().toISOString().split('T')[0]}.json.gz`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setExportMessage({ type: 'success', text: `Backup exported: ${filename}` });
      setExportPassword('');
    } catch (err) {
      setExportMessage({ type: 'error', text: err instanceof Error ? err.message : 'Export failed' });
    } finally {
      setExporting(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) return;
    setRestoring(true);
    setRestoreMessage(null);
    try {
      const result = await backupService.restore(restoreFile, restorePassword);
      const counts = Object.entries(result.imported).map(([k, v]) => `${k}: ${v}`).join(', ');
      setRestoreMessage({ type: 'success', text: `Restored successfully. ${counts}` });
      setRestoreFile(null);
      setRestorePassword('');
      fetchSettings();
      fetchUsers();
    } catch (err) {
      setRestoreMessage({ type: 'error', text: err instanceof Error ? err.message : 'Restore failed' });
    } finally {
      setRestoring(false);
    }
  };

  // Thing Types handlers
  const handleTypeNameChange = (name: string) => {
    const autoSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setTypeForm({ ...typeForm, name, slug: editingType ? typeForm.slug : autoSlug });
  };

  const openCreateTypeModal = () => {
    setEditingType(null);
    setTypeForm({
      name: '', slug: '', icon: 'help-circle', color: '#94a3b8',
      capabilities: { enableChannels: false, enablePortScan: false, enableCredentials: false },
    });
    setTypeModalOpen(true);
  };

  const openEditTypeModal = (t: ThingTypeItem) => {
    setEditingType(t);
    setTypeForm({
      name: t.name, slug: t.slug, icon: t.icon, color: t.color,
      capabilities: { ...t.capabilities },
    });
    setTypeModalOpen(true);
  };

  const handleCreateOrUpdateType = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingType(true);
    try {
      const payload = {
        name: typeForm.name,
        slug: typeForm.slug,
        icon: typeForm.icon,
        color: typeForm.color,
        capabilities: typeForm.capabilities,
      };
      if (editingType) {
        await thingTypesService.update(editingType._id, payload);
      } else {
        await thingTypesService.create(payload);
      }
      setTypeModalOpen(false);
      await refreshTypes();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingType(false);
    }
  };

  const handleDeleteType = async () => {
    if (!deleteTypeTarget) return;
    setDeletingType(true);
    try {
      await thingTypesService.delete(deleteTypeTarget._id);
      setDeleteTypeTarget(null);
      await refreshTypes();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingType(false);
    }
  };

  const typeColumns = [
    {
      key: 'icon',
      header: 'Icon',
      className: 'w-12',
      render: (item: ThingTypeItem) => {
        const Icon = getIconComponent(item.icon);
        return <Icon className="h-5 w-5" style={{ color: item.color }} />;
      },
    },
    {
      key: 'name',
      header: 'Name',
      render: (item: ThingTypeItem) => (
        <span className="flex items-center gap-2">
          {item.name}
          {item.isSystem && <Badge variant="secondary">system</Badge>}
        </span>
      ),
    },
    {
      key: 'capabilities',
      header: 'Capabilities',
      render: (item: ThingTypeItem) => (
        <span className="flex flex-wrap gap-1">
          {item.capabilities.enableChannels && <Badge variant="secondary">Channels</Badge>}
          {item.capabilities.enablePortScan && <Badge variant="secondary">Port Scan</Badge>}
          {item.capabilities.enableCredentials && <Badge variant="secondary">Credentials</Badge>}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-20',
      render: (item: ThingTypeItem) => (
        <span className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEditTypeModal(item); }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Edit type"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTypeTarget(item); }}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Delete type"
            disabled={item.isSystem}
            title={item.isSystem ? 'System types cannot be deleted' : undefined}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      ),
    },
  ];

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

      {/* Backup section */}
      <Card>
        <CardHeader>
          <CardTitle>Backup</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Export a password-protected backup of all data, or restore from a previous backup.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setExportOpen(true); setExportMessage(null); }}>
              <Download className="h-4 w-4 mr-2" />
              Export Backup
            </Button>
            <Button variant="secondary" onClick={() => { setRestoreOpen(true); setRestoreMessage(null); }}>
              <Upload className="h-4 w-4 mr-2" />
              Restore Backup
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Thing Types section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Thing Types</h2>
          </div>
          <Button onClick={openCreateTypeModal}>
            <Plus className="h-4 w-4 mr-2" />
            Add Type
          </Button>
        </div>

        <DataTable
          columns={typeColumns}
          data={thingTypes}
          loading={false}
        />
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

      {/* Export Backup Modal */}
      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Export Backup">
        <form onSubmit={handleExport} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose a password to protect the backup file. Credentials will be re-encrypted with this password.
          </p>
          <Input
            id="export-password"
            label="Backup Password"
            type="password"
            placeholder="Enter a strong password"
            value={exportPassword}
            onChange={(e) => setExportPassword(e.target.value)}
            required
          />
          {exportMessage && (
            <p className={`text-sm ${exportMessage.type === 'success' ? 'text-success' : 'text-destructive'}`}>
              {exportMessage.text}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setExportOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={exporting || !exportPassword}>
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Restore Backup Modal */}
      <Modal open={restoreOpen} onClose={() => setRestoreOpen(false)} title="Restore Backup">
        <form onSubmit={handleRestore} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a backup file and enter the password used during export. This will replace locals, networks, things, groups, and notification rules.
          </p>
          <div>
            <label htmlFor="restore-file" className="block text-sm font-medium mb-1">Backup File</label>
            <input
              id="restore-file"
              type="file"
              accept=".gz,.json.gz"
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
              required
            />
          </div>
          <Input
            id="restore-password"
            label="Backup Password"
            type="password"
            placeholder="Password used during export"
            value={restorePassword}
            onChange={(e) => setRestorePassword(e.target.value)}
            required
          />
          {restoreMessage && (
            <p className={`text-sm ${restoreMessage.type === 'success' ? 'text-success' : 'text-destructive'}`}>
              {restoreMessage.text}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setRestoreOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={restoring || !restoreFile || !restorePassword}>
              {restoring ? 'Restoring...' : 'Restore'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Thing Type Create/Edit Modal */}
      <Modal
        open={typeModalOpen}
        onClose={() => setTypeModalOpen(false)}
        title={editingType ? 'Edit Thing Type' : 'Create Thing Type'}
      >
        <form onSubmit={handleCreateOrUpdateType} className="space-y-4">
          <Input
            id="type-name"
            label="Name"
            placeholder="e.g. Security Camera"
            value={typeForm.name}
            onChange={(e) => handleTypeNameChange(e.target.value)}
            required
          />
          <Input
            id="type-slug"
            label="Slug"
            placeholder="e.g. security-camera"
            value={typeForm.slug}
            onChange={(e) => setTypeForm({ ...typeForm, slug: e.target.value })}
            required
          />
          <IconPicker
            value={typeForm.icon}
            onChange={(icon) => setTypeForm({ ...typeForm, icon })}
          />
          <div className="space-y-1">
            <label htmlFor="type-color" className="text-sm font-medium text-foreground">Color</label>
            <div className="flex items-center gap-2">
              <input
                id="type-color"
                type="color"
                value={typeForm.color}
                onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                className="h-10 w-12 rounded border border-border bg-input cursor-pointer"
              />
              <Input
                id="type-color-text"
                value={typeForm.color}
                onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-foreground">Capabilities</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={typeForm.capabilities.enableChannels}
                onChange={(e) => setTypeForm({
                  ...typeForm,
                  capabilities: { ...typeForm.capabilities, enableChannels: e.target.checked },
                })}
                className="rounded border-border"
              />
              Enable Channels
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={typeForm.capabilities.enablePortScan}
                onChange={(e) => setTypeForm({
                  ...typeForm,
                  capabilities: { ...typeForm.capabilities, enablePortScan: e.target.checked },
                })}
                className="rounded border-border"
              />
              Enable Port Scan
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={typeForm.capabilities.enableCredentials}
                onChange={(e) => setTypeForm({
                  ...typeForm,
                  capabilities: { ...typeForm.capabilities, enableCredentials: e.target.checked },
                })}
                className="rounded border-border"
              />
              Enable Credentials
            </label>
          </fieldset>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setTypeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingType}>
              {savingType ? 'Saving...' : editingType ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Thing Type Confirmation */}
      <ConfirmDialog
        open={!!deleteTypeTarget}
        onClose={() => setDeleteTypeTarget(null)}
        onConfirm={handleDeleteType}
        title="Delete Thing Type"
        message={`Are you sure you want to delete type "${deleteTypeTarget?.name}"? Things using this type will need to be reassigned.`}
        loading={deletingType}
      />
    </div>
  );
}
