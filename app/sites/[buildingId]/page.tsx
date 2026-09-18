'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import type { Building, CalibrationPoint, Device, Floor, Site } from '@/lib/types';
import { ArrowLeft, Check, MapPin, Pencil, Plus, Save, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

function devicePosition(device: Device, points: CalibrationPoint[]) {
  if (device.last_lat === null || device.last_lng === null || points.length < 2) return null;
  const lngs = points.map((point) => point.longitude);
  const lats = points.map((point) => point.latitude);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  if (maxLng === minLng || maxLat === minLat) return null;
  return {
    left: `${Math.max(0, Math.min(100, ((device.last_lng - minLng) / (maxLng - minLng)) * 100))}%`,
    top: `${Math.max(0, Math.min(100, ((maxLat - device.last_lat) / (maxLat - minLat)) * 100))}%`,
  };
}

export default function BuildingPage() {
  const params = useParams<{ buildingId: string }>();
  const buildingId = params.buildingId;
  const imageRef = useRef<HTMLDivElement>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [floorDialog, setFloorDialog] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [floorForm, setFloorForm] = useState({ name: '', floor_number: '0', image_url: '', calibration_points: [] as CalibrationPoint[] });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [calibration, setCalibration] = useState<CalibrationPoint[]>([]);
  const [pointForm, setPointForm] = useState({ latitude: '', longitude: '' });

  useEffect(() => { loadBuilding(); }, [buildingId]);

  async function loadBuilding() {
    setLoading(true);
    const [buildingResult, floorsResult, devicesResult] = await Promise.all([
      supabase.from('buildings').select('*, site:sites(*)').eq('id', buildingId).single(),
      supabase.from('floors').select('*').eq('building_id', buildingId).order('floor_number'),
      supabase.from('devices').select('*, site:sites(*)').eq('building_id', buildingId).order('name'),
    ]);
    if (buildingResult.error) toast.error(buildingResult.error.message);
    setBuilding(buildingResult.data as Building | null);
    setSite((buildingResult.data as Building & { site?: Site })?.site || null);
    const nextFloors = (floorsResult.data || []) as Floor[];
    setFloors(nextFloors);
    setDevices((devicesResult.data || []) as Device[]);
    if (!selectedFloorId && nextFloors[0]) setSelectedFloorId(nextFloors[0].id);
    setLoading(false);
  }

  const selectedFloor = floors.find((floor) => floor.id === selectedFloorId) || null;
  const onlineCount = devices.filter((device) => device.status === 'online' || device.status === 'moving').length;

  function openNewFloor() {
    setEditingFloor(null);
    setPendingFile(null);
    setCalibration([]);
    setFloorForm({ name: '', floor_number: String(floors.length), image_url: '', calibration_points: [] });
    setFloorDialog(true);
  }

  function openEditFloor(floor: Floor) {
    setEditingFloor(floor);
    setPendingFile(null);
    setCalibration(floor.calibration_points || []);
    setFloorForm({ name: floor.name, floor_number: String(floor.floor_number), image_url: floor.image_url || '', calibration_points: floor.calibration_points || [] });
    setFloorDialog(true);
  }

  async function saveFloor() {
    if (!floorForm.name) { toast.error('Floor name is required'); return; }
    const payload = { building_id: buildingId, name: floorForm.name, floor_number: Number(floorForm.floor_number), image_url: floorForm.image_url || null, calibration_points: calibration };
    const result = editingFloor ? await supabase.from('floors').update(payload).eq('id', editingFloor.id).select().single() : await supabase.from('floors').insert(payload).select().single();
    if (result.error || !result.data) { toast.error(result.error?.message || 'Could not save floor'); return; }
    let savedFloor = result.data as Floor;
    if (pendingFile) {
      const extension = pendingFile.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${buildingId}/${savedFloor.id}.${extension}`;
      const upload = await supabase.storage.from('floor-plans').upload(path, pendingFile, { upsert: true, contentType: pendingFile.type });
      if (upload.error) { toast.error(`Floor saved, image upload failed: ${upload.error.message}`); } else {
        const publicUrl = supabase.storage.from('floor-plans').getPublicUrl(path).data.publicUrl;
        const updated = await supabase.from('floors').update({ image_url: publicUrl }).eq('id', savedFloor.id).select().single();
        if (updated.data) savedFloor = updated.data as Floor;
      }
    }
    toast.success(editingFloor ? 'Floor updated' : 'Floor created');
    setFloorDialog(false);
    setSelectedFloorId(savedFloor.id);
    loadBuilding();
  }

  async function deleteFloor(id: string) {
    const { error } = await supabase.from('floors').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Floor deleted');
    setSelectedFloorId(null);
    loadBuilding();
  }

  function addCalibrationPoint(event: React.MouseEvent<HTMLDivElement>) {
    if (!pointForm.latitude || !pointForm.longitude || !imageRef.current || calibration.length >= 4) return;
    const bounds = imageRef.current.getBoundingClientRect();
    const point = { image_x: ((event.clientX - bounds.left) / bounds.width) * 100, image_y: ((event.clientY - bounds.top) / bounds.height) * 100, latitude: Number(pointForm.latitude), longitude: Number(pointForm.longitude), label: `Point ${calibration.length + 1}` };
    setCalibration([...calibration, point]);
    setPointForm({ latitude: '', longitude: '' });
  }

  async function saveCalibration() {
    if (!selectedFloor || calibration.length < 2) { toast.error('Add at least two calibration points'); return; }
    const { error } = await supabase.from('floors').update({ calibration_points: calibration }).eq('id', selectedFloor.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Calibration saved');
    loadBuilding();
  }

  if (loading) return <AppShell><div className="p-8"><div className="h-12 animate-pulse rounded bg-slate-100" /></div></AppShell>;
  if (!building) return <AppShell><div className="p-8"><p>Building not found.</p></div></AppShell>;

  return <AppShell><div className="space-y-6 p-6 lg:p-8">
    <Link href="/sites" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"><ArrowLeft className="h-4 w-4" />Back to Sites</Link>
    <PageHeader title={building.name} description={site ? `${site.name} · Indoor building management` : 'Indoor building management'} actions={<Button onClick={openNewFloor} className="bg-blue-600 hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" />Add Floor</Button>} />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Floors" value={floors.length} /><Stat label="Devices" value={devices.length} /><Stat label="Online" value={onlineCount} /><Stat label="Alerts" value="—" /></div>
    <div className="flex flex-wrap gap-2">{floors.map((floor) => <Button key={floor.id} variant={selectedFloorId === floor.id ? 'default' : 'outline'} onClick={() => { setSelectedFloorId(floor.id); setCalibration(floor.calibration_points || []); }}>{floor.name}</Button>)}</div>
    {selectedFloor ? <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>{selectedFloor.name}</CardTitle><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => openEditFloor(selectedFloor)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit Floor</Button><Button variant="outline" size="sm" onClick={saveCalibration} disabled={calibration.length < 2}><Save className="mr-1.5 h-3.5 w-3.5" />Save Calibration</Button></div></div></CardHeader><CardContent><div ref={imageRef} onClick={addCalibrationPoint} className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-100">{selectedFloor.image_url ? <img src={selectedFloor.image_url} alt={`${building.name} ${selectedFloor.name} floor plan`} className="max-h-[70vh] max-w-full object-contain" /> : <div className="text-center text-sm text-slate-500"><Upload className="mx-auto mb-2 h-8 w-8 text-slate-400" /><p>Upload a PNG, JPG, or SVG floor plan in Edit Floor.</p></div>}{selectedFloor.image_url && devices.filter((device) => device.floor_id === selectedFloor.id).map((device) => { const position = devicePosition(device, selectedFloor.calibration_points || []); return position ? <button key={device.id} type="button" className="absolute -translate-x-1/2 -translate-y-1/2" style={position} title={device.name}><span className="block h-5 w-5 rounded-full border-2 border-white bg-blue-600 shadow-lg" /><span className="mt-1 block whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white">{device.name}</span></button> : null; })}</div><div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{selectedFloor.calibration_points?.length || 0}/4 calibration points. Device positions use the latest GPS coordinates.</div></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-lg">Floor setup</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Click the plan after entering a latitude and longitude to add calibration points. Use two points minimum; four corners are recommended.</div><div className="grid grid-cols-2 gap-2"><Input placeholder="Latitude" value={pointForm.latitude} onChange={(event) => setPointForm({ ...pointForm, latitude: event.target.value })} /><Input placeholder="Longitude" value={pointForm.longitude} onChange={(event) => setPointForm({ ...pointForm, longitude: event.target.value })} /></div><div className="space-y-2">{calibration.map((point, index) => <div key={`${point.image_x}-${point.image_y}`} className="flex items-center justify-between rounded border border-slate-100 p-2 text-xs"><span><strong>Point {index + 1}</strong> · {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</span><Button variant="ghost" size="icon" onClick={() => setCalibration(calibration.filter((_, pointIndex) => pointIndex !== index))}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button></div>)}</div><div className="border-t border-slate-100 pt-4"><p className="mb-2 text-sm font-medium text-slate-700">Assigned devices</p>{devices.filter((device) => device.floor_id === selectedFloor.id).length === 0 ? <p className="text-xs text-slate-500">No devices assigned to this floor.</p> : devices.filter((device) => device.floor_id === selectedFloor.id).map((device) => <div key={device.id} className="flex items-center justify-between py-1 text-sm"><span>{device.name}</span><Badge variant="outline" className="capitalize">{device.status}</Badge></div>)}</div><Button variant="outline" className="w-full" onClick={() => deleteFloor(selectedFloor.id)}><Trash2 className="mr-2 h-4 w-4 text-red-500" />Delete Floor</Button></CardContent></Card>
    </div> : <Card><CardContent className="py-14 text-center text-sm text-slate-500">Create a floor to add an indoor plan.</CardContent></Card>}
    <Dialog open={floorDialog} onOpenChange={setFloorDialog}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editingFloor ? 'Edit Floor' : 'Add Floor'}</DialogTitle></DialogHeader><div className="space-y-4"><div><Label htmlFor="floor-name">Floor name</Label><Input id="floor-name" value={floorForm.name} onChange={(event) => setFloorForm({ ...floorForm, name: event.target.value })} placeholder="Ground Floor" /></div><div><Label htmlFor="floor-number">Floor number</Label><Input id="floor-number" type="number" value={floorForm.floor_number} onChange={(event) => setFloorForm({ ...floorForm, floor_number: event.target.value })} /></div><div><Label htmlFor="floor-image">Floor plan image</Label><Input id="floor-image" type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={(event) => setPendingFile(event.target.files?.[0] || null)} /><p className="mt-1 text-xs text-slate-400">PNG, JPG, or SVG. The image is stored in Supabase Storage.</p>{floorForm.image_url && !pendingFile && <p className="mt-1 text-xs text-emerald-600">Existing floor plan retained</p>}</div></div><DialogFooter><Button variant="outline" onClick={() => setFloorDialog(false)}>Cancel</Button><Button onClick={saveFloor} className="bg-blue-600 hover:bg-blue-700"><Check className="mr-2 h-4 w-4" />Save Floor</Button></DialogFooter></DialogContent></Dialog>
  </div></AppShell>;
}

function Stat({ label, value }: { label: string; value: number | string }) { return <Card><CardContent className="pt-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p></CardContent></Card>; }
