'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil, Settings as SettingsIcon, Users, Download, Upload, Cpu, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
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
  const t = useTranslations('Settings');
  const tc = useTranslations('Common');
  const tTypes = useTranslations('ThingTypes');
  const router = useRouter();
  const { toast } = useToast();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoring, setRestoring] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<'general' | 'thing-types' | 'users' | 'backup'>('general');

  const tabs = [
    { key: 'general' as const, label: t('tabGeneral'), icon: SettingsIcon },
    { key: 'thing-types' as const, label: t('tabThingTypes'), icon: Cpu },
    { key: 'users' as const, label: t('tabUsers'), icon: Users },
    { key: 'backup' as const, label: t('tabBackup'), icon: Database },
  ];

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
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api<{ data: User[]; meta: Record<string, number> }>('/api/v1/users');
      setUsers(res.data);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
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
      document.cookie = `locale=${settings.language};path=/;max-age=31536000`;
      router.refresh();
      toast({ title: t('settingsSaved') });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('settingsSaveFailed'), variant: 'error' });
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
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
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
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);
    try {
      const blob = await backupService.exportBackup(exportPassword);
      const filename = `iot-sentinel-backup-${new Date().toISOString().split('T')[0]}.json.gz`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `Backup exported: ${filename}` });
      setExportPassword('');
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Export failed', variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile) return;
    setRestoring(true);
    try {
      const result = await backupService.restore(restoreFile, restorePassword);
      const counts = Object.entries(result.imported).map(([k, v]) => `${k}: ${v}`).join(', ');
      toast({ title: `Restored successfully. ${counts}` });
      setRestoreFile(null);
      setRestorePassword('');
      fetchSettings();
      fetchUsers();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Restore failed', variant: 'error' });
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

  const openEditTypeModal = (tt: ThingTypeItem) => {
    setEditingType(tt);
    setTypeForm({
      name: tt.name, slug: tt.slug, icon: tt.icon, color: tt.color,
      capabilities: { ...tt.capabilities },
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
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
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
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setDeletingType(false);
    }
  };

  const typeColumns = [
    {
      key: 'icon',
      header: t('icon'),
      className: 'w-12',
      render: (item: ThingTypeItem) => {
        const Icon = getIconComponent(item.icon);
        return <Icon className="h-5 w-5" style={{ color: item.color }} />;
      },
    },
    {
      key: 'name',
      header: tc('name'),
      render: (item: ThingTypeItem) => {
        const displayName = item.isSystem && tTypes.has(item.slug) ? tTypes(item.slug as never) : item.name;
        return (
          <span className="flex items-center gap-2">
            {displayName}
            {item.isSystem && <Badge variant="secondary">{t('system')}</Badge>}
          </span>
        );
      },
    },
    {
      key: 'capabilities',
      header: t('capabilities'),
      render: (item: ThingTypeItem) => (
        <span className="flex flex-wrap gap-1">
          {item.capabilities.enableChannels && <Badge variant="secondary">{t('channels')}</Badge>}
          {item.capabilities.enablePortScan && <Badge variant="secondary">{t('portScan')}</Badge>}
          {item.capabilities.enableCredentials && <Badge variant="secondary">{t('credentials')}</Badge>}
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
            aria-label={t('editType')}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTypeTarget(item); }}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={t('deleteType')}
            disabled={item.isSystem}
            title={item.isSystem ? t('systemNoDelete') : undefined}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      ),
    },
  ];

  const userColumns = [
    { key: 'username', header: t('username') },
    {
      key: 'role',
      header: t('role'),
      render: (item: User) => (
        <Badge variant={item.role === 'admin' ? 'default' : 'secondary'}>
          {item.role === 'admin' ? t('admin') : t('viewer')}
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
          aria-label={t('deleteUser')}
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
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                <CardTitle>{t('instanceSettings')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <Input
                  id="instance-name"
                  label={t('instanceName')}
                  placeholder={t('instanceNamePlaceholder')}
                  value={settings.instanceName}
                  onChange={(e) => setSettings({ ...settings, instanceName: e.target.value })}
                />
                <Select
                  id="language"
                  label={t('language')}
                  options={LANGUAGE_OPTIONS}
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                />
                <Select
                  id="timezone"
                  label={t('timezone')}
                  options={TIMEZONE_OPTIONS}
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('scannerSettings')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <Input
                  id="max-concurrent-scans"
                  label={t('maxConcurrentScans')}
                  type="number"
                  min={1}
                  max={20}
                  value={settings.maxConcurrentScans}
                  onChange={(e) => setSettings({ ...settings, maxConcurrentScans: Number(e.target.value) })}
                />
                <Input
                  id="cooldown-seconds"
                  label={t('cooldownSeconds')}
                  type="number"
                  min={0}
                  value={settings.cooldownSeconds}
                  onChange={(e) => setSettings({ ...settings, cooldownSeconds: Number(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('monitorSettings')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <Input
                  id="status-check-interval"
                  label={t('statusCheckInterval')}
                  type="number"
                  min={5}
                  value={settings.statusCheckInterval}
                  onChange={(e) => setSettings({ ...settings, statusCheckInterval: Number(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-4">
            <Button onClick={handleSaveSettings} loading={saving}>
              {t('saveSettings')}
            </Button>
          </div>
        </>
      )}

      {/* Thing Types Tab */}
      {activeTab === 'thing-types' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t('thingTypesDesc')}
            </p>
            <Button onClick={openCreateTypeModal}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addType')}
            </Button>
          </div>

          <DataTable
            columns={typeColumns}
            data={thingTypes}
            loading={false}
          />
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t('usersDesc')}
            </p>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('addUser')}
            </Button>
          </div>

          <DataTable
            columns={userColumns}
            data={users}
            loading={loadingUsers}
          />
        </>
      )}

      {/* Backup Tab */}
      {activeTab === 'backup' && (
        <Card>
          <CardHeader>
            <CardTitle>{t('backupRestore')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('backupDesc')}
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setExportOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                {t('exportBackup')}
              </Button>
              <Button variant="secondary" onClick={() => setRestoreOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                {t('restoreBackup')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add User Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('addUser')} isDirty={userForm.username !== '' || userForm.password !== ''}>
        <form onSubmit={handleAddUser} className="space-y-4">
          <Input
            id="user-username"
            label={t('username')}
            placeholder={t('usernamePlaceholder')}
            value={userForm.username}
            onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
          />
          <Input
            id="user-password"
            label={t('password')}
            type="password"
            placeholder="••••••••"
            value={userForm.password}
            onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
          />
          <Select
            id="user-role"
            label={t('role')}
            options={ROLE_OPTIONS}
            value={userForm.role}
            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" loading={addingUser}>
              {t('addUser')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
        title={t('deleteUser')}
        message={t('deleteUserConfirm', { name: deleteTarget?.username ?? '' })}
        loading={deleting}
      />

      {/* Export Backup Modal */}
      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title={t('exportTitle')} isDirty={exportPassword !== ''}>
        <form onSubmit={handleExport} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('exportDesc')}
          </p>
          <Input
            id="export-password"
            label={t('backupPassword')}
            type="password"
            placeholder={t('exportPasswordPlaceholder')}
            value={exportPassword}
            onChange={(e) => setExportPassword(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setExportOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" loading={exporting} disabled={!exportPassword}>
              {t('export')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Restore Backup Modal */}
      <Modal open={restoreOpen} onClose={() => setRestoreOpen(false)} title={t('restoreTitle')} isDirty={restorePassword !== '' || restoreFile !== null}>
        <form onSubmit={handleRestore} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('restoreDesc')}
          </p>
          <div>
            <label htmlFor="restore-file" className="block text-sm font-medium mb-1">{t('backupFile')}</label>
            <input
              id="restore-file"
              type="file"
              accept=".gz,.json.gz"
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
            />
          </div>
          <Input
            id="restore-password"
            label={t('backupPassword')}
            type="password"
            placeholder={t('restorePasswordPlaceholder')}
            value={restorePassword}
            onChange={(e) => setRestorePassword(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setRestoreOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" loading={restoring} disabled={!restoreFile || !restorePassword}>
              {t('restoreBackup')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Thing Type Create/Edit Modal */}
      <Modal
        open={typeModalOpen}
        onClose={() => setTypeModalOpen(false)}
        title={editingType ? t('editThingType') : t('createThingType')}
        isDirty={typeForm.name !== ''}
      >
        <form onSubmit={handleCreateOrUpdateType} className="space-y-4">
          <Input
            id="type-name"
            label={t('typeName')}
            placeholder={t('typeNamePlaceholder')}
            value={typeForm.name}
            onChange={(e) => handleTypeNameChange(e.target.value)}
            disabled={!!editingType?.isSystem}
          />
          <Input
            id="type-slug"
            label={t('typeSlug')}
            placeholder={t('typeSlugPlaceholder')}
            value={typeForm.slug}
            onChange={(e) => setTypeForm({ ...typeForm, slug: e.target.value })}
            disabled={!!editingType?.isSystem}
          />
          <IconPicker
            value={typeForm.icon}
            onChange={(icon) => setTypeForm({ ...typeForm, icon })}
          />
          <div className="space-y-1">
            <label htmlFor="type-color" className="text-sm font-medium text-foreground">{t('typeColor')}</label>
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
            <legend className="text-sm font-medium text-foreground">{t('typeCapabilities')}</legend>
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
              {t('enableChannels')}
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
              {t('enablePortScan')}
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
              {t('enableCredentials')}
            </label>
          </fieldset>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setTypeModalOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" loading={savingType}>
              {editingType ? tc('update') : tc('create')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Thing Type Confirmation */}
      <ConfirmDialog
        open={!!deleteTypeTarget}
        onClose={() => setDeleteTypeTarget(null)}
        onConfirm={handleDeleteType}
        title={t('deleteThingType')}
        message={t('deleteThingTypeConfirm', { name: deleteTypeTarget?.name ?? '' })}
        loading={deletingType}
      />
    </div>
  );
}
