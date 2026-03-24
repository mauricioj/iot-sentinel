'use client';

import { useEffect, useState, useRef } from 'react';
import { Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { scannerService, ScanJob } from '@/services/scanner.service';
import { networksService } from '@/services/networks.service';
import { usePagination } from '@/hooks/use-pagination';
import { Network } from '@/types';

const SCAN_TYPES = [
  { value: 'discovery', label: 'Discovery' },
  { value: 'status_check', label: 'Status Check' },
  { value: 'deep_scan', label: 'Deep Scan' },
];

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
  const [networks, setNetworks] = useState<Network[]>([]);
  const [networkId, setNetworkId] = useState('');
  const [scanType, setScanType] = useState('discovery');
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const pagination = usePagination();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch networks on mount
  useEffect(() => {
    networksService.findAll(1, 100).then((r) => {
      setNetworks(r.data);
      if (r.data.length > 0) setNetworkId(r.data[0]._id);
    }).catch(console.error);
  }, []);

  const fetchJobs = async () => {
    try {
      const res = await scannerService.findAll(pagination.page, pagination.limit);
      setJobs(res.data);
      pagination.setTotal(res.meta.total);
    } catch (err) {
      console.error(err);
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
      setScanMessage({ type: 'error', text: 'Please select a network.' });
      return;
    }
    setScanning(true);
    setScanMessage(null);
    try {
      await scannerService.discover(networkId, scanType);
      setScanMessage({ type: 'success', text: 'Scan job queued successfully.' });
      setLoadingJobs(true);
      await fetchJobs();
    } catch (err) {
      setScanMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to start scan.' });
    } finally {
      setScanning(false);
    }
  };

  const networkOptions = [
    { value: '', label: 'Select a network' },
    ...networks.map((n) => ({ value: n._id, label: n.name })),
  ];

  const columns = [
    {
      key: 'type',
      header: 'Type',
      render: (item: ScanJob) => (
        <span className="capitalize">{item.type.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: ScanJob) => (
        <Badge variant={statusVariant(item.status)}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'triggeredBy',
      header: 'Triggered By',
      render: (item: ScanJob) => (
        <span className="capitalize">{item.triggeredBy}</span>
      ),
    },
    {
      key: 'startedAt',
      header: 'Started',
      render: (item: ScanJob) => formatDate(item.startedAt),
    },
    {
      key: 'completedAt',
      header: 'Completed',
      render: (item: ScanJob) => formatDate(item.completedAt),
    },
    {
      key: 'results',
      header: 'Results',
      render: (item: ScanJob) => {
        const count = Array.isArray(item.results) ? item.results.length : 0;
        if (item.status !== 'completed') return '-';
        return `${count} host${count !== 1 ? 's' : ''} found`;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Scanner</h1>

      {/* New Scan card */}
      <Card>
        <CardHeader>
          <CardTitle>New Scan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-64">
              <Select
                id="scan-network"
                label="Network"
                options={networkOptions}
                value={networkId}
                onChange={(e) => setNetworkId(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Select
                id="scan-type"
                label="Scan Type"
                options={SCAN_TYPES}
                value={scanType}
                onChange={(e) => setScanType(e.target.value)}
              />
            </div>
            <Button onClick={handleStartScan} disabled={scanning || !networkId}>
              <Scan className="h-4 w-4 mr-2" />
              {scanning ? 'Starting...' : 'Start Scan'}
            </Button>
          </div>
          {scanMessage && (
            <p className={`mt-3 text-sm ${scanMessage.type === 'success' ? 'text-success' : 'text-destructive'}`}>
              {scanMessage.text}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Job History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Job History</h2>
        {!loadingJobs && jobs.length === 0 ? (
          <EmptyState
            icon={Scan}
            title="No scan jobs yet"
            description="Start a scan above to see job history here."
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
      </div>
    </div>
  );
}
