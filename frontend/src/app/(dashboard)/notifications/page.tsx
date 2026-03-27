'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, Plus, Trash2, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { DataTable } from '@/components/ui/data-table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import {
  notificationsService,
  NotificationItem,
  NotificationRule,
} from '@/services/notifications.service';
import { localsService } from '@/services/locals.service';
import { networksService } from '@/services/networks.service';
import { thingsService } from '@/services/things.service';
import { groupsService } from '@/services/groups.service';
import { usePagination } from '@/hooks/use-pagination';

const TYPE_BADGE_COLORS: Record<string, string> = {
  thing_offline: 'bg-destructive/10 text-destructive',
  thing_online: 'bg-green-500/10 text-green-600',
  new_discovery: 'bg-primary/10 text-primary',
  scan_failed: 'bg-yellow-500/10 text-yellow-600',
};

export default function NotificationsPage() {
  const t = useTranslations('Notifications');
  const tc = useTranslations('Common');
  const { toast } = useToast();

  const CONDITIONS = [
    { value: 'status_change', label: t('conditionStatusChange'), targetTypes: ['thing', 'group'], needsThreshold: false },
    { value: 'offline_duration', label: t('conditionOfflineDuration'), targetTypes: ['thing', 'group'], needsThreshold: true },
    { value: 'new_discovery', label: t('conditionNewDevice'), targetTypes: ['network', 'local'], needsThreshold: false },
  ];
  const [activeTab, setActiveTab] = useState<'notifications' | 'rules'>('notifications');

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const notifPagination = usePagination();

  // Rules state
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);
  const rulesPagination = usePagination();
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [savingRule, setSavingRule] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NotificationRule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    targetType: 'thing',
    targetId: '',
    condition: 'status_change',
    threshold: 300,
    channels: ['in_app'],
    enabled: true,
  });
  const [targetOptions, setTargetOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await notificationsService.findAll(notifPagination.page, notifPagination.limit);
      setNotifications(res.data);
      notifPagination.setTotal(res.meta.total);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setLoadingNotifs(false);
    }
  };

  const fetchRules = async () => {
    setLoadingRules(true);
    try {
      const res = await notificationsService.findAllRules(rulesPagination.page, rulesPagination.limit);
      setRules(res.data);
      rulesPagination.setTotal(res.meta.total);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setLoadingRules(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifPagination.page]);

  useEffect(() => {
    fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesPagination.page]);

  const selectedCondition = CONDITIONS.find((c) => c.value === ruleForm.condition);
  const validTargetTypes = selectedCondition?.targetTypes || [];
  const needsThreshold = selectedCondition?.needsThreshold || false;

  // Reset targetType when condition changes and current type is invalid
  useEffect(() => {
    if (validTargetTypes.length > 0 && !validTargetTypes.includes(ruleForm.targetType)) {
      setRuleForm((prev) => ({ ...prev, targetType: validTargetTypes[0], targetId: '' }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleForm.condition]);

  // Load target options when targetType changes
  useEffect(() => {
    const loadTargets = async () => {
      setLoadingTargets(true);
      try {
        let options: { value: string; label: string }[] = [];
        switch (ruleForm.targetType) {
          case 'thing': {
            const res = await thingsService.findAll({ page: '1', limit: '100' });
            options = res.data.map((t) => ({ value: t._id, label: `${t.name} (${t.ipAddress || t.macAddress || 'no IP'})` }));
            break;
          }
          case 'group': {
            const res = await groupsService.findAll(1, 100);
            options = res.data.map((g) => ({ value: g._id, label: g.name }));
            break;
          }
          case 'network': {
            const res = await networksService.findAll(1, 100);
            options = res.data.map((n) => ({ value: n._id, label: `${n.name} (${n.cidr})` }));
            break;
          }
          case 'local': {
            const res = await localsService.findAll(1, 100);
            options = res.data.map((l) => ({ value: l._id, label: l.name }));
            break;
          }
        }
        setTargetOptions(options);
      } catch (err) {
        toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
      } finally {
        setLoadingTargets(false);
      }
    };
    if (ruleModalOpen && ruleForm.targetType) {
      loadTargets();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleForm.targetType, ruleModalOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast({ title: t('markAllReadSuccess'), variant: 'success' });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRule(true);
    try {
      if (editingRule) {
        await notificationsService.updateRule(editingRule._id, ruleForm);
        toast({ title: t('ruleUpdated'), variant: 'success' });
      } else {
        await notificationsService.createRule(ruleForm);
        toast({ title: t('ruleCreated'), variant: 'success' });
      }
      setRuleModalOpen(false);
      setEditingRule(null);
      setRuleForm({
        name: '',
        targetType: 'thing',
        targetId: '',
        condition: 'status_change',
        threshold: 300,
        channels: ['in_app'],
        enabled: true,
      });
      await fetchRules();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setSavingRule(false);
    }
  };

  const handleEditRule = (rule: NotificationRule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      targetType: rule.targetType || 'thing',
      targetId: rule.targetId || '',
      condition: rule.condition,
      threshold: rule.threshold,
      channels: rule.channels,
      enabled: rule.enabled,
    });
    setRuleModalOpen(true);
  };

  const handleOpenNewRule = () => {
    setEditingRule(null);
    setRuleForm({
      name: '',
      targetType: 'thing',
      targetId: '',
      condition: 'status_change',
      threshold: 300,
      channels: ['in_app'],
      enabled: true,
    });
    setRuleModalOpen(true);
  };

  const handleDeleteRule = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await notificationsService.deleteRule(deleteTarget._id);
      setDeleteTarget(null);
      toast({ title: t('ruleDeleted'), variant: 'success' });
      await fetchRules();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : tc('error'), variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const ruleColumns = [
    { key: 'name', header: tc('name') },
    { key: 'targetType', header: t('targetType') },
    { key: 'condition', header: t('condition') },
    {
      key: 'threshold',
      header: t('threshold'),
      render: (item: NotificationRule) => `${item.threshold}s`,
    },
    {
      key: 'enabled',
      header: t('enabled'),
      render: (item: NotificationRule) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            item.enabled
              ? 'bg-green-500/10 text-green-600'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {item.enabled ? tc('yes') : tc('no')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-20',
      render: (item: NotificationRule) => (
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleEditRule(item); }}
            className="p-1 text-muted-foreground hover:text-primary transition-colors"
            aria-label={t('editRule')}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            aria-label={t('deleteRule')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'notifications'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('tabNotifications')}
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'rules'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('tabRules')}
        </button>
      </div>

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div>
          {unreadCount > 0 && (
            <div className="flex justify-end mb-4">
              <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
                <Check className="h-4 w-4 mr-2" />
                {t('markAllRead')}
              </Button>
            </div>
          )}

          {!loadingNotifs && notifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={t('emptyTitle')}
              description={t('emptyDesc')}
            />
          ) : (
            <div className="space-y-2">
              {loadingNotifs ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                  {tc('loading')}
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    onClick={() => !n.read && handleMarkAsRead(n._id)}
                    className={`flex items-start gap-4 rounded-lg border border-border p-4 transition-colors ${
                      !n.read
                        ? 'bg-primary/5 cursor-pointer hover:bg-primary/10'
                        : 'bg-card'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            TYPE_BADGE_COLORS[n.type] ?? 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {n.type.replace(/_/g, ' ')}
                        </span>
                        {!n.read && (
                          <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-foreground">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {(notifPagination.hasNext || notifPagination.hasPrev) && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    {tc('pageOf', { page: notifPagination.page, pages: notifPagination.pages })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={notifPagination.prev}
                      disabled={!notifPagination.hasPrev}
                    >
                      {tc('previous')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={notifPagination.next}
                      disabled={!notifPagination.hasNext}
                    >
                      {tc('next')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={handleOpenNewRule}>
              <Plus className="h-4 w-4 mr-2" />
              {t('newRule')}
            </Button>
          </div>

          {!loadingRules && rules.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={t('rulesEmptyTitle')}
              description={t('rulesEmptyDesc')}
              action={
                <Button onClick={handleOpenNewRule}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('newRule')}
                </Button>
              }
            />
          ) : (
            <>
              <DataTable columns={ruleColumns} data={rules} loading={loadingRules} />
              {(rulesPagination.hasNext || rulesPagination.hasPrev) && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {tc('pageOf', { page: rulesPagination.page, pages: rulesPagination.pages })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={rulesPagination.prev}
                      disabled={!rulesPagination.hasPrev}
                    >
                      {tc('previous')}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={rulesPagination.next}
                      disabled={!rulesPagination.hasNext}
                    >
                      {tc('next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Create Rule Modal */}
      <Modal open={ruleModalOpen} onClose={() => { setRuleModalOpen(false); setEditingRule(null); }} title={editingRule ? t('editRuleTitle') : t('newRuleTitle')} isDirty={ruleForm.name.trim().length > 0}>
        <form onSubmit={handleSaveRule} className="space-y-4">
          <Input
            id="rule-name"
            label={tc('name')}
            placeholder={t('ruleNamePlaceholder')}
            value={ruleForm.name}
            onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="condition">
              {t('condition')}
            </label>
            <select
              id="condition"
              value={ruleForm.condition}
              onChange={(e) => setRuleForm({ ...ruleForm, condition: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {ruleForm.condition === 'new_discovery'
                ? t('helpNewDevice')
                : ruleForm.condition === 'offline_duration'
                ? t('helpOfflineDuration')
                : t('helpStatusChange')}
            </p>
          </div>

          {validTargetTypes.length > 0 && (
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="targetType">
                  {t('targetType')}
                </label>
                <select
                  id="targetType"
                  value={ruleForm.targetType}
                  onChange={(e) => setRuleForm({ ...ruleForm, targetType: e.target.value, targetId: '' })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {validTargetTypes.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="targetId">
                  {t('target')} {ruleForm.condition === 'new_discovery' ? `(${tc('optional')})` : ''}
                </label>
                <select
                  id="targetId"
                  value={ruleForm.targetId}
                  onChange={(e) => setRuleForm({ ...ruleForm, targetId: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  disabled={loadingTargets}
                >
                  <option value="">
                    {loadingTargets
                      ? t('targetLoading')
                      : ruleForm.condition === 'new_discovery'
                      ? t('targetAll')
                      : t('targetSelect', { type: ruleForm.targetType ?? '' })}
                  </option>
                  {targetOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {needsThreshold && (
            <Input
              id="threshold"
              label={t('thresholdSeconds')}
              type="number"
              placeholder={t('thresholdPlaceholder')}
              value={String(ruleForm.threshold)}
              onChange={(e) =>
                setRuleForm({ ...ruleForm, threshold: parseInt(e.target.value, 10) || 0 })
              }
            />
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{t('channelsLabel')}</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={ruleForm.channels.includes('in_app')}
                onChange={(e) => {
                  const channels = e.target.checked
                    ? [...ruleForm.channels, 'in_app']
                    : ruleForm.channels.filter((c) => c !== 'in_app');
                  setRuleForm({ ...ruleForm, channels });
                }}
                className="rounded"
              />
              {t('inApp')}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setRuleModalOpen(false); setEditingRule(null); }}>
              {tc('cancel')}
            </Button>
            <Button type="submit" loading={savingRule}>
              {editingRule ? t('saveChanges') : tc('create')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteRule}
        title={t('deleteRuleTitle')}
        message={t('deleteRuleConfirm', { name: deleteTarget?.name ?? '' })}
        loading={deleting}
      />
    </div>
  );
}
