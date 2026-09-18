'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import {
  formatRelativeTime,
  formatSpeed,
  formatDirection,
  formatBattery,
  formatTemperature,
  formatCoord,
  statusBgColor,
  statusColor,
} from '@/lib/format';
import type { Device, Site } from '@/lib/types';
import {
  Search,
  Smartphone,
  X,
  Battery,
  Thermometer,
  Navigation,
  Gauge,
  MapPin,
  Clock,
  Play,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';

const LiveMap = dynamic(
  () => import('@/components/live-map').then((module) => module.LiveMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-slate-800" /> }
);

export default function LiveMapPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [demoActive, setDemoActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const [siteRes, devRes] = await Promise.all([
        supabase.from('sites').select('*').order('name'),
        supabase.from('devices').select('*, site:sites(*)').order('name'),
      ]);
      setSites(siteRes.data || []);
      setDevices(devRes.data || []);
      if (siteRes.data && siteRes.data.length > 0) {
        setSelectedSiteId(siteRes.data[0].id);
      }
      setLoading(false);
    }
    init();
  }, []);

  // Poll for device updates
  useEffect(() => {
    if (!demoActive) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('devices')
        .select('*, site:sites(*)')
        .order('name');
      if (data) setDevices(data);
    }, 3000);
    return () => clearInterval(interval);
  }, [demoActive]);

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || null;
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || null;

  const filteredDevices = devices.filter((d) => {
    if (selectedSiteId && d.site_id !== selectedSiteId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.ident.toLowerCase().includes(q) ||
        d.device_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSelectDevice = useCallback((id: string) => {
    setSelectedDeviceId(id);
  }, []);

  async function toggleDemo() {
    if (demoActive) {
      await fetch('/api/demo/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      setDemoActive(false);
      toast.success('Demo tracking stopped');
    } else {
      setDemoActive(true);
      toast.success('Demo tracking started');
      const interval = setInterval(async () => {
        await fetch('/api/demo/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'tick' }),
        });
      }, 3000);
      (window as unknown as { _demoMapInterval?: ReturnType<typeof setInterval> })._demoMapInterval = interval;
    }
  }

  useEffect(() => {
    return () => {
      const interval = (window as unknown as { _demoMapInterval?: ReturnType<typeof setInterval> })._demoMapInterval;
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <AppShell>
      <div className="flex h-screen">
        {/* Map area */}
        <div className="relative flex-1">
          <LiveMap
            site={selectedSite}
            devices={filteredDevices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={handleSelectDevice}
          />

          {/* Floating top controls */}
          <div className="pointer-events-none absolute left-4 top-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-2">
            <div className="pointer-events-auto flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
              <span className="text-sm font-semibold text-slate-700">Live Map</span>
              {selectedSite && (
                <Badge variant="outline" className="border-slate-200 text-slate-600">
                  {selectedSite.name}
                </Badge>
              )}
            </div>
            <div className="pointer-events-auto flex items-center gap-2">
              <Button
                onClick={toggleDemo}
                size="sm"
                variant={demoActive ? 'destructive' : 'default'}
                className={demoActive ? '' : 'bg-blue-600 hover:bg-blue-700'}
              >
                {demoActive ? (
                  <>
                    <Square className="mr-1.5 h-3.5 w-3.5" />
                    Stop Demo
                  </>
                ) : (
                  <>
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    Start Demo
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex w-80 flex-col border-l border-slate-200 bg-white xl:w-96">
          {/* Site selector */}
          <div className="border-b border-slate-200 p-4">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Site</label>
            <div className="flex flex-wrap gap-1.5">
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => setSelectedSiteId(site.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedSiteId === site.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {site.name}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="border-b border-slate-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search devices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Device list */}
          <ScrollArea className="flex-1">
            <div className="space-y-1 p-2">
              {loading ? (
                <div className="space-y-2 p-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
                  ))}
                </div>
              ) : filteredDevices.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No devices found</p>
              ) : (
                filteredDevices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => setSelectedDeviceId(device.id)}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                      selectedDeviceId === device.id
                        ? 'bg-blue-50 ring-1 ring-blue-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                        <Smartphone className="h-4 w-4 text-slate-500" />
                      </div>
                      <div
                        className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white ${statusColor(
                          device.status
                        )}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{device.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {device.ident} · {formatRelativeTime(device.last_seen)}
                      </p>
                    </div>
                    <Badge variant="outline" className={`capitalize text-[10px] ${statusBgColor(device.status)}`}>
                      {device.status}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Device detail panel */}
          {selectedDevice && (
            <div className="border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between p-4 pb-2">
                <h3 className="font-semibold text-slate-900">{selectedDevice.name}</h3>
                <button
                  onClick={() => setSelectedDeviceId(null)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[50vh] overflow-y-auto px-4 pb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <DetailItem label="Ident / IMEI" value={selectedDevice.ident} />
                  <DetailItem label="Type" value={selectedDevice.device_type} />
                  <DetailItem label="Status" value={selectedDevice.status} />
                  <DetailItem label="Last Seen" value={formatRelativeTime(selectedDevice.last_seen)} />
                  <DetailItem
                    label="Latitude"
                    value={formatCoord(selectedDevice.last_lat)}
                    icon={MapPin}
                  />
                  <DetailItem
                    label="Longitude"
                    value={formatCoord(selectedDevice.last_lng)}
                    icon={MapPin}
                  />
                  <DetailItem
                    label="Speed"
                    value={formatSpeed(selectedDevice.last_speed)}
                    icon={Gauge}
                  />
                  <DetailItem
                    label="Direction"
                    value={formatDirection(selectedDevice.last_direction)}
                    icon={Navigation}
                  />
                  <DetailItem
                    label="Battery"
                    value={formatBattery(selectedDevice.last_battery_level)}
                    icon={Battery}
                  />
                  <DetailItem
                    label="Temperature"
                    value={formatTemperature(selectedDevice.last_temperature)}
                    icon={Thermometer}
                  />
                </div>
                {selectedDevice.site && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedDevice.site.name}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function DetailItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof MapPin;
}) {
  return (
    <div className="rounded-lg bg-white p-2.5 border border-slate-100">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-slate-800">
        {Icon && <Icon className="h-3 w-3 text-slate-400" />}
        {value}
      </p>
    </div>
  );
}
