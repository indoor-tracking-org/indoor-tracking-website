'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Device } from '@/lib/types';

interface LiveMapProps {
  devices: Device[];
  selectedDeviceId: string | null;
  onSelectDevice: (id: string) => void;
  autoFit?: boolean;
}

function createDeviceIcon(status: string, name: string, isSelected: boolean): L.DivIcon {
  const colors: Record<string, string> = {
    online: '#10b981',
    offline: '#94a3b8',
    alert: '#ef4444',
    moving: '#3b82f6',
    stationary: '#f59e0b',
  };
  const color = colors[status] || '#94a3b8';
  const size = isSelected ? 18 : 14;
  const ringSize = isSelected ? 36 : 28;

  return L.divIcon({
    className: 'indoortrack-marker',
    html: `
      <div style="position: relative; width: ${ringSize}px; height: ${ringSize}px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: ${ringSize}px;
          height: ${ringSize}px;
          border-radius: 50%;
          background: ${color}33;
          border: 2px solid ${color};
          ${isSelected ? 'animation: pulse 1.5s ease-in-out infinite;' : ''}
        "></div>
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          z-index: 1;
        "></div>
        <div style="position:absolute; top:${ringSize + 2}px; left:50%; transform:translateX(-50%); white-space:nowrap; background:#0f172a; color:white; border-radius:4px; padding:2px 5px; font-size:10px; font-weight:600;">${name}</div>
      </div>
    `,
    iconSize: [ringSize, ringSize],
    iconAnchor: [ringSize / 2, ringSize / 2],
  });
}

export function LiveMap({ devices, selectedDeviceId, onSelectDevice, autoFit = true }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const centre: [number, number] = [-26.063253867375856, 27.943127248882575];

    const map = L.map(containerRef.current, {
      center: centre,
      zoom: 13,
      minZoom: 2,
      maxZoom: 21,
      zoomControl: true,
      attributionControl: true,
    });

    mapRef.current = map;

    // Add a subtle background
    containerRef.current.style.background = '#1e293b';

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Always use a normal geographic basemap. Indoor floor plans belong to Sites.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing tile layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    });
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;
  }, []);

  // Update device markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(markersRef.current.keys());
    const currentIds = new Set(devices.map((d) => d.id));

    // Remove markers for devices no longer in list
    existingIds.forEach((id) => {
      if (!currentIds.has(id)) {
        const marker = markersRef.current.get(id);
        if (marker) {
          map.removeLayer(marker);
          markersRef.current.delete(id);
        }
      }
    });

    // Add or update markers
    devices.forEach((device) => {
      if (device.last_lat === null || device.last_lng === null) return;

      const latlng: [number, number] = [device.last_lat, device.last_lng];
      const isSelected = device.id === selectedDeviceId;
      const icon = createDeviceIcon(device.status, device.name, isSelected);

      const existing = markersRef.current.get(device.id);
      if (existing) {
        existing.setLatLng(latlng);
        existing.setIcon(icon);
      } else {
        const marker = L.marker(latlng, { icon });
        marker.on('click', () => onSelectDevice(device.id));
        marker.bindTooltip(
          `<div style="font-weight:600;">${device.name}</div><div style="font-size:11px;opacity:0.8;">${device.status}</div>`,
          { direction: 'top', offset: [0, -14] }
        );
        marker.addTo(map);
        markersRef.current.set(device.id, marker);
      }
    });

    // Auto-fit to show all markers if requested
    if (autoFit && devices.length > 0) {
      const validDevices = devices.filter((d) => d.last_lat !== null && d.last_lng !== null);
      if (validDevices.length === 1) {
        map.setView([validDevices[0].last_lat!, validDevices[0].last_lng!], 16);
      } else if (validDevices.length > 1) {
        const bounds = L.latLngBounds(
          validDevices.map((d) => [d.last_lat!, d.last_lng!])
        );
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 21 });
      }
    }

    const selectedDevice = devices.find((device) => device.id === selectedDeviceId);
    if (selectedDevice?.last_lat !== null && selectedDevice?.last_lng !== null && selectedDevice) {
      map.setView([selectedDevice.last_lat, selectedDevice.last_lng], Math.max(map.getZoom(), 21));
    }
  }, [devices, selectedDeviceId, onSelectDevice, autoFit]);

  return <div ref={containerRef} className="h-full w-full" />;
}
