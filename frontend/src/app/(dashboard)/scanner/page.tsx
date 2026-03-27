'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { scannerService, ScanJob } from '@/services/scanner.service';
import { networksService } from '@/services/networks.service';
import { usePagination } from '@/hooks/use-pagination';
import { Network } from '@/types';

type StatusVariant = 'secondary' | 'warning' | 'success' | 'destructive';

function statusVariant(status: ScanJob['status']): StatusVariant {
  const map: Record<ScanJob['status'], StatusVariant> = {
    queued: 'secondary',
    running: 'warning',
    completed: 'success',
    failed: 'destructive',
  };
  return map[status];
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

export default function ScannerPage() {
  const t = useTranslations('Scanner');
  const tc = useTranslations('Common');
  const { toast } = useToast();

  const SCAN_TYPES = [
    { value: 'discovery', label: t('typeDiscovery') },
    { value: 'status_check', label: t('typeStatusCheck') },
    { value: 'deep_scan', label: t('typeDeepScan') },
  ];

  const [networks, setNetworks] = useState<Network[]>([]);
  const [networkId, setNetworkId] = useState('');
  const [scanType, setScanType] = useState('discovery');
  const [scanning, setScanning] = useState(false);

  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const pagination = usePagination();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch networks on mount
  useEffect(() => {
    networksService.findAll(1, 100).then((r) => {
      setNetworks(r.data);
      if (r.data.length > 0) setNetworkId(r.data[0]._id);
    }).catch(() => toast({ title: t('scanFailed'), variant: 'error' }));
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await scannerService.findAll(pagination.page, pagination.limit);
      setJobs(res.data);
      pagination.setTotal(res.meta.total);
    } catch {
      toast({ title: t('scanFailed'), variant: 'error' });
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    setLoadingJobs(true);
    fetchJobs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  // Auto-refresh when jobs are queued/running
  useEffect(() => {
    const hasActiveJobs = jobs.some((j) => j.status === 'queued' || j.status === 'running');

    if (hasActiveJobs) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          fetchJobs();
        }, 5000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  const handleStartScan = async () => {
    if (!networkId) {
      toast({ title: t('selectNetworkError'), variant: 'error' });
      return;
    }
    setScanning(true);
    try {
      await scannerService.discover(networkId, scanType);
      toast({ title: t('scanQueued') });
      setLoadingJobs(true);
      await fetchJobs();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : t('scanFailed'), variant: 'error' });
    } finally {
      setScanning(false);
    }
  };

  const networkOptions = [
    { value: '', label: t('selectNetwork') },
    ...networks.map((n) => ({ value: n._id, label: n.name })),
  ];

  const scanTypeMap: Record<string, string> = {
    discovery: t('typeDiscovery'),
    status_check: t('typeStatusCheck'),
    deep_scan: t('typeDeepScan'),
  };

  const jobStatusMap: Record<string, string> = {
    queued: t('jobStatusQueued'),
    running: t('jobStatusRunning'),
    completed: t('jobStatusCompleted'),
    failed: t('jobStatusFailed'),
  };

  const triggeredByMap: Record<string, string> = {
    user: t('triggeredByUser'),
    scheduler: t('triggeredByScheduler'),
    system: t('triggeredBySystem'),
  };

  const columns = [
    {
      key: 'type',
      header: tc('type'),
      render: (item: ScanJob) => (
        <span>{scanTypeMap[item.type] || item.type}</span>
      ),
    },
    {
      key: 'status',
      header: tc('status'),
      render: (item: ScanJob) => (
        <Badge variant={statusVariant(item.status)}>
          {jobStatusMap[item.status] || item.status}
        </Badge>
      ),
    },
    {
      key: 'triggeredBy',
      header: t('triggeredBy'),
      render: (item: ScanJob) => (
        <span>{triggeredByMap[item.triggeredBy] || item.triggeredBy}</span>
      ),
    },
    {
      key: 'startedAt',
      header: t('started'),
      render: (item: ScanJob) => formatDate(item.startedAt),
    },
    {
      key: 'completedAt',
      header: t('completed'),
      render: (item: ScanJob) => formatDate(item.completedAt),
    },
    {
      key: 'results',
      header: t('results'),
      render: (item: ScanJob) => {
        const count = Array.isArray(item.results) ? item.results.length : 0;
        if (item.status !== 'completed') return '-';
        return t('hostsFound', { count });
      },
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* New Scan card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('newScan')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-64">
              <Select
                id="scan-network"
                label={t('network')}
                options={networkOptions}
                value={networkId}
                onChange={(e) => setNetworkId(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Select
                id="scan-type"
                label={t('scanType')}
                options={SCAN_TYPES}
                value={scanType}
                onChange={(e) => setScanType(e.target.value)}
              />
            </div>
            <Button onClick={handleStartScan} disabled={!networkId} loading={scanning}>
              <Scan className="h-4 w-4 mr-2" />
              {t('startScan')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Job History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{t('jobHistory')}</h2>
        {!loadingJobs && jobs.length === 0 ? (
          <EmptyState
            icon={Scan}
            title={t('emptyTitle')}
            description={t('emptyDesc')}
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={jobs}
              loading={loadingJobs}
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
      </div>
    </div>
  );
}
