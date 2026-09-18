'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import {
  formatDateTime,
  formatSpeed,
  formatDirection,
  formatBattery,
} from '@/lib/format';
import type { Device, Site, Telemetry } from '@/lib/types';
import L from 'leaflet';
import { Play, Pause, SkipBack, SkipForward, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function HistoryPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const trackLineRef = useRef<L.Polyline | null>(null);
  const playbackMarkerRef = useRef<L.Marker | null>(null);
  const pointMarkersRef = useRef<L.CircleMarker[]>([]);

  useEffect(() => {
    async function init() {
      const [devRes, siteRes] = await Promise.all([
        supabase.from('devices').select('*, site:sites(*)').order('name'),
        supabase.from('sites').select('*').order('name'),
      ]);
      setDevices(devRes.data || []);
      setSites(siteRes.data || []);
    }
    init();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [-26.063253867375856, 27.943127248882575],
      zoom: 20,
      minZoom: 17,
      maxZoom: 23,
      zoomControl: true,
      attributionControl: false,
    });
    mapRef.current = map;
    containerRef.current.style.background = '#1e293b';

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update tile layer when site changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    const site = sites.find((s) => s.id === selectedSiteId);
    if (site) {
      tileLayerRef.current = L.tileLayer(site.tile_url, {
        minZoom: 17,
        maxZoom: 23,
        maxNativeZoom: 22,
        tileSize: 256,
        detectRetina: true,
      }).addTo(map);
      map.setView([site.centre_lat, site.centre_lng], 20);
    }
  }, [selectedSiteId, sites]);

  // Render track
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing
    if (trackLineRef.current) {
      map.removeLayer(trackLineRef.current);
      trackLineRef.current = null;
    }
    if (playbackMarkerRef.current) {
      map.removeLayer(playbackMarkerRef.current);
      playbackMarkerRef.current = null;
    }
    pointMarkersRef.current.forEach((m) => map.removeLayer(m));
    pointMarkersRef.current = [];

    const validPoints = telemetry.filter(
      (t) => t.latitude !== null && t.longitude !== null
    );
    if (validPoints.length === 0) return;

    // Draw track line
    const latlngs = validPoints.map((t) => [t.latitude!, t.longitude!]) as [number, number][];
    trackLineRef.current = L.polyline(latlngs, {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.7,
    }).addTo(map);

    // Draw point markers
    validPoints.forEach((point) => {
      const marker = L.circleMarker([point.latitude!, point.longitude!], {
        radius: 4,
        color: '#1e40af',
        fillColor: '#3b82f6',
        fillOpacity: 0.8,
        weight: 1,
      }).addTo(map);

      marker.bindPopup(
        `<div style="min-width: 160px;">
          <div style="font-weight:600; margin-bottom:4px;">${formatDateTime(point.timestamp)}</div>
          <div style="font-size:11px; color:#666;">Lat: ${point.latitude?.toFixed(6)}</div>
          <div style="font-size:11px; color:#666;">Lng: ${point.longitude?.toFixed(6)}</div>
          <div style="font-size:11px; color:#666;">Speed: ${formatSpeed(point.speed)}</div>
          <div style="font-size:11px; color:#666;">Direction: ${formatDirection(point.direction)}</div>
          <div style="font-size:11px; color:#666;">Battery: ${formatBattery(point.battery_level)}</div>
        </div>`
      );
      pointMarkersRef.current.push(marker);
    });

    // Fit bounds
    if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 21 });
    }

    setPlaybackIndex(0);
  }, [telemetry]);

  // Playback marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || telemetry.length === 0) return;

    const validPoints = telemetry.filter(
      (t) => t.latitude !== null && t.longitude !== null
    );
    if (validPoints.length === 0) return;

    const point = validPoints[Math.min(playbackIndex, validPoints.length - 1)];
    if (!point) return;

    if (playbackMarkerRef.current) {
      playbackMarkerRef.current.setLatLng([point.latitude!, point.longitude!]);
    } else {
      playbackMarkerRef.current = L.marker([point.latitude!, point.longitude!], {
        icon: L.divIcon({
          className: 'playback-marker',
          html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).addTo(map);
    }
  }, [playbackIndex, telemetry]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;
    const validPoints = telemetry.filter(
      (t) => t.latitude !== null && t.longitude !== null
    );
    if (validPoints.length === 0) return;

    const interval = setInterval(() => {
      setPlaybackIndex((prev) => {
        if (prev >= validPoints.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, telemetry]);

  async function searchTrack() {
    if (!selectedDeviceId) {
      toast.error('Please select a device');
      return;
    }

    setLoading(true);
    setHasSearched(true);

    let query = supabase
      .from('telemetry')
      .select('*')
      .eq('device_id', selectedDeviceId)
      .order('timestamp', { ascending: true });

    if (startDate) {
      query = query.gte('timestamp', new Date(startDate).toISOString());
    }
    if (endDate) {
      query = query.lte('timestamp', new Date(endDate + 'T23:59:59').toISOString());
    }
    query = query.limit(500);

    const { data, error } = await query;
    if (error) {
      toast.error(`Error: ${error.message}`);
      setLoading(false);
      return;
    }

    setTelemetry(data || []);
    setLoading(false);
    if (data && data.length === 0) {
      toast.info('No telemetry records found for the selected criteria');
    } else {
      toast.success(`Found ${data?.length || 0} telemetry points`);
    }
  }

  const validPoints = telemetry.filter(
    (t) => t.latitude !== null && t.longitude !== null
  );
  const currentPoint = validPoints[Math.min(playbackIndex, validPoints.length - 1)];

  return (
    <AppShell>
      <div className="flex h-screen flex-col">
        <div className="space-y-4 p-6 lg:p-8 pb-4">
          <PageHeader
            title="History"
            description="View historical GPS tracks and telemetry for your devices"
          />

          {/* Search controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <Label className="mb-1.5 block">Device</Label>
                  <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Site</Label>
                  <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={searchTrack}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? 'Searching...' : 'Show Track'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map + telemetry panel */}
        <div className="flex flex-1 gap-4 px-6 lg:px-8 pb-6 min-h-0">
          <div className="relative flex-1 rounded-lg overflow-hidden border border-slate-200">
            <div ref={containerRef} className="h-full w-full" />
            {hasSearched && telemetry.length > 0 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-3 rounded-lg bg-white/95 px-4 py-2 shadow-lg backdrop-blur">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPlaybackIndex(0)}
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setIsPlaying(!isPlaying)}
                  size="icon"
                  className="rounded-full bg-blue-600 hover:bg-blue-700"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPlaybackIndex(validPoints.length - 1)}
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-slate-600 min-w-[80px]">
                  {playbackIndex + 1} / {validPoints.length}
                </span>
              </div>
            )}
          </div>

          {/* Telemetry info panel */}
          <div className="w-72 shrink-0">
            <Card className="h-full">
              <CardContent className="pt-6">
                <h3 className="mb-3 font-semibold text-slate-900">Telemetry Point</h3>
                {currentPoint ? (
                  <div className="space-y-2 text-sm">
                    <InfoRow icon={Clock} label="Time" value={formatDateTime(currentPoint.timestamp)} />
                    <InfoRow icon={MapPin} label="Latitude" value={currentPoint.latitude?.toFixed(6) || '—'} />
                    <InfoRow icon={MapPin} label="Longitude" value={currentPoint.longitude?.toFixed(6) || '—'} />
                    <InfoRow label="Speed" value={formatSpeed(currentPoint.speed)} />
                    <InfoRow label="Direction" value={formatDirection(currentPoint.direction)} />
                    <InfoRow label="Battery" value={formatBattery(currentPoint.battery_level)} />
                    <InfoRow label="Temperature" value={currentPoint.temperature?.toFixed(1) + '°C' || '—'} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    {hasSearched
                      ? 'No telemetry points found'
                      : 'Select a device and date range, then click Show Track'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-xs text-slate-500 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}
