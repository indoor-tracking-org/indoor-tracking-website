'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { formatDateTime, formatBattery, formatSpeed } from '@/lib/format';
import type { Device, Telemetry } from '@/lib/types';
import { Activity, Battery, Clock3, Gauge, Route } from 'lucide-react';

type TelemetryWithDevice = Telemetry & { device: Device | null };

function distanceBetween(first: Telemetry, second: Telemetry): number {
  if (first.latitude === null || first.longitude === null || second.latitude === null || second.longitude === null) return 0;
  const earthRadius = 6371;
  const latitudeDelta = (second.latitude - first.latitude) * Math.PI / 180;
  const longitudeDelta = (second.longitude - first.longitude) * Math.PI / 180;
  const latitude = first.latitude * Math.PI / 180;
  const nextLatitude = second.latitude * Math.PI / 180;
  const value = Math.sin(latitudeDelta / 2) ** 2 + Math.sin(longitudeDelta / 2) ** 2 * Math.cos(latitude) * Math.cos(nextLatitude);
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export default function ReportsPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryWithDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReport() {
      const [devicesResult, telemetryResult] = await Promise.all([
        supabase.from('devices').select('*').order('name'),
        supabase.from('telemetry').select('*, device:devices(*)').order('timestamp', { ascending: false }).limit(500),
      ]);
      setDevices(devicesResult.data || []);
      setTelemetry((telemetryResult.data || []) as TelemetryWithDevice[]);
      setLoading(false);
    }
    loadReport();
  }, []);

  const selectedTelemetry = telemetry.filter((point) => selectedDeviceId === 'all' || point.device_id === selectedDeviceId);
  const orderedPoints = [...selectedTelemetry].sort((first, second) => first.timestamp.localeCompare(second.timestamp));
  const distance = orderedPoints.slice(1).reduce((total, point, index) => total + distanceBetween(orderedPoints[index], point), 0);
  const movingPoints = selectedTelemetry.filter((point) => (point.speed || 0) > 0.5).length;
  const averageBattery = selectedTelemetry.length ? selectedTelemetry.reduce((total, point) => total + (point.battery_level || 0), 0) / selectedTelemetry.length : null;

  return (
    <AppShell>
      <div className="space-y-6 p-6 lg:p-8">
        <PageHeader title="Reports" description="A concise view of fleet activity, distance, and battery history" />
        <Card><CardContent className="pt-6"><Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}><SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Select device" /></SelectTrigger><SelectContent><SelectItem value="all">All devices</SelectItem>{devices.map((device) => <SelectItem key={device.id} value={device.id}>{device.name}</SelectItem>)}</SelectContent></Select></CardContent></Card>
        {loading ? <div className="h-32 animate-pulse rounded-lg bg-slate-100" /> : <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReportStat icon={Activity} label="Telemetry points" value={selectedTelemetry.length.toString()} />
            <ReportStat icon={Route} label="Distance travelled" value={`${distance.toFixed(2)} km`} />
            <ReportStat icon={Gauge} label="Moving points" value={movingPoints.toString()} />
            <ReportStat icon={Battery} label="Average battery" value={averageBattery === null ? '—' : formatBattery(averageBattery)} />
          </div>
          <Card><CardHeader><CardTitle className="text-lg">Telemetry history</CardTitle></CardHeader><CardContent>{selectedTelemetry.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No telemetry recorded yet. Start demo tracking or connect Flespi.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs uppercase tracking-wide text-slate-400"><th className="pb-3">Time</th><th className="pb-3">Device</th><th className="pb-3">Speed</th><th className="pb-3">Battery</th><th className="pb-3">Position</th></tr></thead><tbody>{selectedTelemetry.slice(0, 20).map((point) => <tr key={point.id} className="border-b border-slate-100 last:border-0"><td className="py-3 text-slate-600">{formatDateTime(point.timestamp)}</td><td className="py-3 font-medium text-slate-800">{point.device?.name || point.ident || 'Unknown'}</td><td className="py-3 text-slate-600">{formatSpeed(point.speed)}</td><td className="py-3 text-slate-600">{formatBattery(point.battery_level)}</td><td className="py-3 font-mono text-xs text-slate-500">{point.latitude?.toFixed(5) || '—'}, {point.longitude?.toFixed(5) || '—'}</td></tr>)}</tbody></table></div>}</CardContent></Card>
          <Card><CardContent className="flex items-start gap-3 pt-6 text-sm text-slate-500"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />Online/offline duration becomes available as telemetry history grows; current status is shown on Devices and Live Map.</CardContent></Card>
        </>}
      </div>
    </AppShell>
  );
}

function ReportStat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return <Card><CardContent className="flex items-center gap-3 pt-6"><div className="rounded-lg bg-blue-50 p-2.5 text-blue-600"><Icon className="h-5 w-5" /></div><div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-slate-900">{value}</p></div></CardContent></Card>;
}
