'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Plus, Network, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { localsService } from '@/services/locals.service';
import { networksService } from '@/services/networks.service';
import { Local, Network as NetworkType } from '@/types';

export default function LocalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const t = useTranslations('LocalDetail');
  const tc = useTranslations('Common');

  const [local, setLocal] = useState<Local | null>(null);
  const [networks, setNetworks] = useState<NetworkType[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [loadingNetworks, setLoadingNetworks] = useState(true);

  const [addNetworkOpen, setAddNetworkOpen] = useState(false);
  const [savingNetwork, setSavingNetwork] = useState(false);
  const [networkForm, setNetworkForm] = useState({ name: '', cidr: '', gateway: '', vlanId: '', description: '' });

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', address: '' });

  const [deleteLocalOpen, setDeleteLocalOpen] = useState(false);
  const [deletingLocal, setDeletingLocal] = useState(false);

  const [deleteNetworkTarget, setDeleteNetworkTarget] = useState<NetworkType | null>(null);
  const [deletingNetwork, setDeletingNetwork] = useState(false);

  const [editNetworkOpen, setEditNetworkOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<NetworkType | null>(null);
  const [savingEditNetwork, setSavingEditNetwork] = useState(false);
  const [editNetworkForm, setEditNetworkForm] = useState({ name: '', cidr: '', gateway: '', vlanId: '', description: '' });

  const fetchLocal = async () => {
    setLoadingLocal(true);
    try {
      const data = await localsService.findById(id);
      setLocal(data);
      setEditForm({ name: data.name, description: data.description, address: data.address });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLocal(false);
    }
  };

  const fetchNetworks = async () => {
    setLoadingNetworks(true);
    try {
      const res = await networksService.findByLocal(id);
      setNetworks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNetworks(false);
    }
  };

  useEffect(() => {
    fetchLocal();
    fetchNetworks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await localsService.update(id, editForm);
      setEditOpen(false);
      await fetchLocal();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocal = async () => {
    setDeletingLocal(true);
    try {
      await localsService.delete(id);
      router.push('/locals');
    } catch (err) {
      console.error(err);
      setDeletingLocal(false);
    }
  };

  const handleAddNetwork = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNetwork(true);
    try {
      await networksService.create(id, {
        name: networkForm.name,
        cidr: networkForm.cidr,
        gateway: networkForm.gateway,
        vlanId: networkForm.vlanId ? Number(networkForm.vlanId) : null,
        description: networkForm.description,
      });
      setAddNetworkOpen(false);
      setNetworkForm({ name: '', cidr: '', gateway: '', vlanId: '', description: '' });
      await fetchNetworks();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNetwork(false);
    }
  };

  const openEditNetwork = (n: NetworkType) => {
    setEditingNetwork(n);
    setEditNetworkForm({
      name: n.name,
      cidr: n.cidr,
      gateway: n.gateway || '',
      vlanId: n.vlanId != null ? String(n.vlanId) : '',
      description: n.description || '',
    });
    setEditNetworkOpen(true);
  };

  const handleEditNetwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNetwork) return;
    setSavingEditNetwork(true);
    try {
      await networksService.update(editingNetwork._id, {
        name: editNetworkForm.name,
        cidr: editNetworkForm.cidr,
        gateway: editNetworkForm.gateway,
        vlanId: editNetworkForm.vlanId ? Number(editNetworkForm.vlanId) : null,
        description: editNetworkForm.description,
      });
      setEditNetworkOpen(false);
      setEditingNetwork(null);
      await fetchNetworks();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEditNetwork(false);
    }
  };

  const handleDeleteNetwork = async () => {
    if (!deleteNetworkTarget) return;
    setDeletingNetwork(true);
    try {
      await networksService.delete(deleteNetworkTarget._id);
      setDeleteNetworkTarget(null);
      await fetchNetworks();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingNetwork(false);
    }
  };

  const networkColumns = [
    { key: 'name', header: tc('name') },
    { key: 'cidr', header: t('cidr') },
    { key: 'gateway', header: t('gateway'), render: (n: NetworkType) => n.gateway || '-' },
    { key: 'vlanId', header: t('vlanId'), render: (n: NetworkType) => n.vlanId ?? '-' },
    { key: 'description', header: tc('description'), render: (n: NetworkType) => n.description || '-' },
    {
      key: 'actions',
      header: '',
      className: 'w-20',
      render: (n: NetworkType) => (
        <span className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEditNetwork(n); }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t('editNetworkLabel')}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteNetworkTarget(n); }}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            aria-label={t('deleteNetworkLabel')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      ),
    },
  ];

  if (loadingLocal) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!local) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Local not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/locals')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {tc('back')}
        </Button>
        <h1 className="text-2xl font-bold flex-1">{local.name}</h1>
        <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-1" />
          {tc('edit')}
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setDeleteLocalOpen(true)}>
          <Trash2 className="h-4 w-4 mr-1" />
          {tc('delete')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('localInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{tc('name')}</p>
            <p className="font-medium mt-1">{local.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{tc('description')}</p>
            <p className="font-medium mt-1">{local.description || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('address')}</p>
            <p className="font-medium mt-1">{local.address || '-'}</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('networks')}</h2>
          <Button size="sm" onClick={() => setAddNetworkOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('addNetwork')}
          </Button>
        </div>

        {!loadingNetworks && networks.length === 0 ? (
          <EmptyState
            icon={Network}
            title={t('emptyNetworks')}
            description={t('emptyNetworksDesc')}
            action={
              <Button size="sm" onClick={() => setAddNetworkOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('addNetwork')}
              </Button>
            }
          />
        ) : (
          <DataTable
            columns={networkColumns}
            data={networks}
            loading={loadingNetworks}
          />
        )}
      </div>

      {/* Edit Local Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('editLocal')}>
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            id="edit-name"
            label={tc('name')}
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            required
          />
          <Input
            id="edit-description"
            label={tc('description')}
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
          <Input
            id="edit-address"
            label={t('address')}
            value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? tc('saving') : tc('save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Network Modal */}
      <Modal open={addNetworkOpen} onClose={() => setAddNetworkOpen(false)} title={t('addNetwork')}>
        <form onSubmit={handleAddNetwork} className="space-y-4">
          <Input
            id="net-name"
            label={tc('name')}
            placeholder={t('networkNamePlaceholder')}
            value={networkForm.name}
            onChange={(e) => setNetworkForm({ ...networkForm, name: e.target.value })}
            required
          />
          <Input
            id="net-cidr"
            label={t('cidr')}
            placeholder={t('cidrPlaceholder')}
            value={networkForm.cidr}
            onChange={(e) => setNetworkForm({ ...networkForm, cidr: e.target.value })}
            required
          />
          <Input
            id="net-gateway"
            label={t('gateway')}
            placeholder={t('gatewayPlaceholder')}
            value={networkForm.gateway}
            onChange={(e) => setNetworkForm({ ...networkForm, gateway: e.target.value })}
          />
          <Input
            id="net-vlan"
            label={t('vlanId')}
            placeholder={t('vlanPlaceholder')}
            type="number"
            value={networkForm.vlanId}
            onChange={(e) => setNetworkForm({ ...networkForm, vlanId: e.target.value })}
          />
          <Input
            id="net-description"
            label={tc('description')}
            placeholder={t('descPlaceholder')}
            value={networkForm.description}
            onChange={(e) => setNetworkForm({ ...networkForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAddNetworkOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={savingNetwork}>
              {savingNetwork ? tc('adding') : t('addNetwork')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Network Modal */}
      <Modal open={editNetworkOpen} onClose={() => setEditNetworkOpen(false)} title={t('editNetwork')}>
        <form onSubmit={handleEditNetwork} className="space-y-4">
          <Input
            id="edit-net-name"
            label={tc('name')}
            value={editNetworkForm.name}
            onChange={(e) => setEditNetworkForm({ ...editNetworkForm, name: e.target.value })}
            required
          />
          <Input
            id="edit-net-cidr"
            label={t('cidr')}
            placeholder={t('cidrPlaceholder')}
            value={editNetworkForm.cidr}
            onChange={(e) => setEditNetworkForm({ ...editNetworkForm, cidr: e.target.value })}
            required
          />
          <Input
            id="edit-net-gateway"
            label={t('gateway')}
            placeholder={t('gatewayPlaceholder')}
            value={editNetworkForm.gateway}
            onChange={(e) => setEditNetworkForm({ ...editNetworkForm, gateway: e.target.value })}
          />
          <Input
            id="edit-net-vlan"
            label={t('vlanId')}
            placeholder={t('vlanPlaceholder')}
            type="number"
            value={editNetworkForm.vlanId}
            onChange={(e) => setEditNetworkForm({ ...editNetworkForm, vlanId: e.target.value })}
          />
          <Input
            id="edit-net-description"
            label={tc('description')}
            value={editNetworkForm.description}
            onChange={(e) => setEditNetworkForm({ ...editNetworkForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditNetworkOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={savingEditNetwork}>
              {savingEditNetwork ? tc('saving') : tc('save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Local Confirm */}
      <ConfirmDialog
        open={deleteLocalOpen}
        onClose={() => setDeleteLocalOpen(false)}
        onConfirm={handleDeleteLocal}
        title={t('deleteLocal')}
        message={t('deleteLocalConfirm', { name: local?.name ?? '' })}
        loading={deletingLocal}
      />

      {/* Delete Network Confirm */}
      <ConfirmDialog
        open={!!deleteNetworkTarget}
        onClose={() => setDeleteNetworkTarget(null)}
        onConfirm={handleDeleteNetwork}
        title={t('deleteNetwork')}
        message={t('deleteNetworkConfirm', { name: deleteNetworkTarget?.name ?? '' })}
        loading={deletingNetwork}
      />
    </div>
  );
}
