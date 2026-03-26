'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/services/api';
import { statusHistoryService } from '@/services/status-history.service';
import { DashboardStats } from '@/types';
import { Box, Wifi, WifiOff, CheckCircle, Search, Activity } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [uptime, setUptime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<DashboardStats>('/api/v1/dashboard/stats')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
    statusHistoryService.getAverageUptime('24h')
      .then((data) => setUptime(data.averageUptimePercent))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const cards = [
    { title: 'Total Things', value: stats?.things.total ?? 0, icon: Box, color: 'text-primary' },
    { title: 'Registered', value: stats?.things.registered ?? 0, icon: CheckCircle, color: 'text-primary' },
    { title: 'Online', value: stats?.things.online ?? 0, icon: Wifi, color: 'text-success' },
    { title: 'Offline', value: stats?.things.offline ?? 0, icon: WifiOff, color: 'text-destructive' },
    { title: 'Discovered', value: stats?.things.discovered ?? 0, icon: Search, color: 'text-muted-foreground' },
    { title: 'Avg Uptime', value: uptime !== null ? `${uptime}%` : '-', icon: Activity, color: 'text-primary' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
              </div>
              <card.icon className={`h-8 w-8 ${card.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
