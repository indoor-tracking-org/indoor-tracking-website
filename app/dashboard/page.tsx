'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { formatRelativeTime, statusBgColor } from '@/lib/format';
import type { Device, Alert, Site, Telemetry } from '@/lib/types';
import {
  Smartphone,
  Wifi,
  WifiOff,
  Bell,
  Building2,
  Activity,
  Play,
  Square,
  Radar,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [recentTelemetry, setRecentTelemetry] = useState<Array<Telemetry & { device: Device | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [demoActive, setDemoActive] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [devRes, alertRes, siteRes, telRes] = await Promise.all([
      supabase.from('devices').select('*, site:sites(*)').order('created_at', { ascending: true }),
      supabase
        .from('alerts')
        .select('*, device:devices(*), site:sites(*)')
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('sites').select('*'),
      supabase
        .from('telemetry')
        .select('*, device:devices(*)')
        .order('created_at', { ascending: false })
        .limit(15),
    ]);

    setDevices(devRes.data || []);
    setAlerts(alertRes.data || []);
    setSites(siteRes.data || []);
    setRecentTelemetry(telRes.data || []);
    setLoading(false);
  }

  const onlineCount = devices.filter((d) => d.status === 'online' || d.status === 'moving').length;
  const offlineCount = devices.filter((d) => d.status === 'offline' || d.status === 'stationary').length;
  const activeAlerts = alerts.filter((a) => a.status === 'active').length;

  async function toggleDemo() {
    if (demoActive) {
      await fetch('/api/demo/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      setDemoActive(false);
      toast.success('Demo tracking stopped');
      fetchData();
      return;
    }

    setDemoActive(true);
    toast.success('Demo tracking started — devices are now moving');

    // Start a polling loop
    const interval = setInterval(async () => {
      await fetch('/api/demo/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tick' }),
      });
      fetchData();
    }, 3000);

    // Store interval id for cleanup
    (window as unknown as { __demoInterval?: ReturnType<typeof setInterval> }).__demoInterval = interval;
  }

  useEffect(() => {
    return () => {
      const interval = (window as unknown as { __demoInterval?: ReturnType<typeof setInterval> }).__demoInterval;
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <AppShell>
      <div className="space-y-6 p-6 lg:p-8">
        <PageHeader
          title="Dashboard"
          description="Real-time overview of your indoor tracking fleet"
          actions={
            <Button
              onClick={toggleDemo}
              variant={demoActive ? 'destructive' : 'default'}
              className={demoActive ? '' : 'bg-blue-600 hover:bg-blue-700'}
            >
              {demoActive ? (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  Stop Demo
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Demo Tracking
                </>
              )}
            </Button>
          }
        />

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard label="Total Devices" value={devices.length} icon={Smartphone} accent="blue" />
          <StatCard label="Online" value={onlineCount} icon={Wifi} accent="emerald" sublabel="Active now" />
          <StatCard label="Offline" value={offlineCount} icon={WifiOff} accent="slate" />
          <StatCard label="Active Alerts" value={activeAlerts} icon={Bell} accent="red" />
          <StatCard label="Total Sites" value={sites.length} icon={Building2} accent="cyan" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recently seen devices */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Radar className="h-5 w-5 text-blue-500" />
                Recently Seen Devices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
                  ))}
                </div>
              ) : devices.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No devices found</p>
              ) : (
                <div className="space-y-2">
                  {devices.slice(0, 6).map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                          <Smartphone className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{device.name}</p>
                          <p className="text-xs text-slate-400">
                            {device.ident} · {device.device_type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-slate-400">{formatRelativeTime(device.last_seen)}</p>
                          <p className="text-xs text-slate-400">
                            {device.last_lat?.toFixed(5)}, {device.last_lng?.toFixed(5)}
                          </p>
                        </div>
                        <Badge variant="outline" className={`capitalize ${statusBgColor(device.status)}`}>
                          {device.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-emerald-500" />
                Activity Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTelemetry.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No recent activity</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {recentTelemetry.map((tel) => (
                    <div key={tel.id} className="flex gap-3 text-sm">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-700 truncate">
                          {tel.device?.name || tel.ident || 'Unknown device'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatRelativeTime(tel.created_at)} ·{' '}
                          {tel.latitude?.toFixed(5)}, {tel.longitude?.toFixed(5)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
