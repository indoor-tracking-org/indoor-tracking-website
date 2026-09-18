import type { DeviceStatus } from './types';

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function statusColor(status: DeviceStatus): string {
  switch (status) {
    case 'online':
      return 'bg-emerald-500';
    case 'offline':
      return 'bg-slate-400';
    case 'alert':
      return 'bg-red-500';
    case 'moving':
      return 'bg-blue-500';
    case 'stationary':
      return 'bg-amber-500';
    default:
      return 'bg-slate-400';
  }
}

export function statusTextColor(status: DeviceStatus): string {
  switch (status) {
    case 'online':
      return 'text-emerald-600';
    case 'offline':
      return 'text-slate-500';
    case 'alert':
      return 'text-red-600';
    case 'moving':
      return 'text-blue-600';
    case 'stationary':
      return 'text-amber-600';
    default:
      return 'text-slate-500';
  }
}

export function statusBgColor(status: DeviceStatus): string {
  switch (status) {
    case 'online':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'offline':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'alert':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'moving':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'stationary':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

export function formatSpeed(speed: number | null): string {
  if (speed === null || speed === undefined) return '—';
  return `${speed.toFixed(1)} km/h`;
}

export function formatDirection(direction: number | null): string {
  if (direction === null || direction === undefined) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(direction / 45) % 8;
  return `${dirs[idx]} (${direction.toFixed(0)}°)`;
}

export function formatBattery(level: number | null): string {
  if (level === null || level === undefined) return '—';
  return `${level.toFixed(0)}%`;
}

export function formatTemperature(temp: number | null): string {
  if (temp === null || temp === undefined) return '—';
  return `${temp.toFixed(1)}°C`;
}

export function formatCoord(val: number | null): string {
  if (val === null || val === undefined) return '—';
  return val.toFixed(6);
}
