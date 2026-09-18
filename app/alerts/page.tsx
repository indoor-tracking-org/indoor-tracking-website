'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { formatDateTime, statusBgColor } from '@/lib/format';
import type { Alert, Device, Site } from '@/lib/types';
import { Bell, Check, Clock, MapPin, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

type AlertWithRelations = Alert & { device: Device | null; site: Site | null };

const alertLabels: Record<string, string> = {
  offline: 'Device Offline',
  low_battery: 'Low Battery',
  entering_site: 'Entering Site',
  leaving_site: 'Leaving Site',
  moving: 'Moving',
  stationary: 'Stationary',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertWithRelations[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function fetchAlerts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('alerts')
      .select('*, device:devices(*), site:sites(*)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) toast.error(`Could not load alerts: ${error.message}`);
    setAlerts((data || []) as AlertWithRelations[]);
    setLoading(false);
  }

  async function acknowledgeAlert(id: string) {
    const { error } = await supabase
      .from('alerts')
      .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error(`Could not acknowledge alert: ${error.message}`);
      return;
    }
    setAlerts((current) => current.map((alert) =>
      alert.id === id ? { ...alert, status: 'acknowledged', acknowledged_at: new Date().toISOString() } : alert
    ));
    toast.success('Alert acknowledged');
  }

  const visibleAlerts = filter === 'all' ? alerts : alerts.filter((alert) => alert.status === filter);
  const activeCount = alerts.filter((alert) => alert.status === 'active').length;

  return (
    <AppShell>
      <div className="space-y-6 p-6 lg:p-8">
        <PageHeader
          title="Alerts"
          description="Monitor and acknowledge device and site events"
          actions={<Badge className="bg-red-50 text-red-700 hover:bg-red-50">{activeCount} active</Badge>}
        />
        <Card>
          <CardContent className="pt-6">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All alerts</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-slate-100" />)}</div>
            ) : visibleAlerts.length === 0 ? (
              <div className="py-12 text-center"><Bell className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm text-slate-500">No alerts in this view</p></div>
            ) : (
              <div className="space-y-2">
                {visibleAlerts.map((alert) => (
                  <div key={alert.id} className="flex flex-col gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`mt-0.5 rounded-lg p-2 ${alert.status === 'active' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}><Bell className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><p className="font-medium text-slate-900">{alertLabels[alert.alert_type] || alert.alert_type}</p><Badge variant="outline" className={alert.status === 'active' ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500'}>{alert.status}</Badge></div>
                        <p className="mt-1 text-sm text-slate-500">{alert.message || 'Tracking event detected'}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400"><span className="flex items-center gap-1"><Smartphone className="h-3 w-3" />{alert.device?.name || 'Unknown device'}</span><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{alert.site?.name || 'Unassigned'}</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDateTime(alert.created_at)}</span></div>
                      </div>
                    </div>
                    {alert.status === 'active' && <Button variant="outline" size="sm" onClick={() => acknowledgeAlert(alert.id)}><Check className="mr-1.5 h-4 w-4" />Acknowledge</Button>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
