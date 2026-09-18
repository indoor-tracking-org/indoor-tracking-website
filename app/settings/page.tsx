'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Bell, Database, KeyRound, Map, Save, Server } from 'lucide-react';

const defaultTileUrl = 'https://wialon-map-overlays.vercel.app/tiles/{slug}/{z}/{x}/{y}.png';

export default function SettingsPage() {
  const [tileUrl, setTileUrl] = useState(defaultTileUrl);
  const [refreshSeconds, setRefreshSeconds] = useState('3');

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from('settings').select('key, value').in('key', ['map', 'application']);
      (data || []).forEach((setting) => {
        const value = setting.value as { tileUrl?: string; refreshSeconds?: number };
        if (setting.key === 'map' && value.tileUrl) setTileUrl(value.tileUrl);
        if (setting.key === 'application' && value.refreshSeconds) setRefreshSeconds(String(value.refreshSeconds));
      });
    }
    loadSettings();
  }, []);

  async function saveSettings() {
    const results = await Promise.all([
      supabase.from('settings').upsert({ key: 'map', value: { tileUrl } }, { onConflict: 'key' }),
      supabase.from('settings').upsert({ key: 'application', value: { refreshSeconds: Number(refreshSeconds) } }, { onConflict: 'key' }),
    ]);
    const error = results.find((result) => result.error)?.error;
    if (error) { toast.error(`Could not save settings: ${error.message}`); return; }
    toast.success('Preferences saved');
  }

  return (
    <AppShell>
      <div className="max-w-4xl space-y-6 p-6 lg:p-8">
        <PageHeader title="Settings" description="Configure integrations and tracking preferences" />
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><KeyRound className="h-5 w-5 text-blue-600" />Flespi configuration</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-start gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"><Server className="mt-0.5 h-4 w-4 shrink-0" /><span>Flespi credentials are read only by the server from <strong>FLESPI_TOKEN</strong>. They are never sent to browser code.</span></div><div className="grid gap-3 sm:grid-cols-2"><SettingValue label="Webhook endpoint" value="/api/flespi/webhook" /><SettingValue label="Authentication" value="Server environment variable" /></div></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Map className="h-5 w-5 text-blue-600" />Map settings</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="tile-url">Default tile URL template</Label><Input id="tile-url" className="mt-1.5" value={tileUrl} onChange={(event) => setTileUrl(event.target.value)} /><p className="mt-1 text-xs text-slate-400">Sites can override this template. Use a site slug and Leaflet {'{z}/{x}/{y}'} placeholders.</p></div></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Bell className="h-5 w-5 text-blue-600" />Application settings</CardTitle></CardHeader><CardContent className="space-y-4"><div className="max-w-xs"><Label htmlFor="refresh-seconds">Live map refresh interval (seconds)</Label><Input id="refresh-seconds" type="number" min="1" max="60" className="mt-1.5" value={refreshSeconds} onChange={(event) => setRefreshSeconds(event.target.value)} /></div><div className="flex items-center gap-2 text-sm text-slate-500"><Database className="h-4 w-4" />Database: <Badge variant="outline">Supabase environment</Badge></div><Button onClick={saveSettings} className="bg-blue-600 hover:bg-blue-700"><Save className="mr-2 h-4 w-4" />Save preferences</Button></CardContent></Card>
      </div>
    </AppShell>
  );
}

function SettingValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-100 bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-mono text-sm text-slate-800">{value}</p></div>;
}
