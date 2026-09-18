'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Map,
  Smartphone,
  Building2,
  History,
  Bell,
  FileBarChart,
  Settings,
  Radar,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Live Map', href: '/live-map', icon: Map },
  { label: 'Devices', href: '/devices', icon: Smartphone },
  { label: 'Sites', href: '/sites', icon: Building2 },
  { label: 'History', href: '/history', icon: History },
  { label: 'Alerts', href: '/alerts', icon: Bell },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col bg-slate-900 text-slate-300 border-r border-slate-800">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-800 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20">
          <Radar className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-bold text-white tracking-tight">IndoorTrack</span>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Asset Tracking</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-700 text-sm font-semibold text-white">
            IT
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">Operator</p>
            <p className="text-xs text-slate-500 truncate">admin@indoortrack.io</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
