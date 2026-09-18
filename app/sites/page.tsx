'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import type { Building, Site } from '@/lib/types';
import { ArrowRight, Building2, Layers3, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type SiteWithBuildings = Site & { buildings: Building[] };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export default function SitesPage() {
  const [sites, setSites] = useState<SiteWithBuildings[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteDialog, setSiteDialog] = useState(false);
  const [buildingDialog, setBuildingDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteWithBuildings | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [buildingSite, setBuildingSite] = useState<SiteWithBuildings | null>(null);
  const [siteForm, setSiteForm] = useState({ name: '', slug: '', centre_lat: '-26.063253867375856', centre_lng: '27.943127248882575', description: '' });
  const [buildingForm, setBuildingForm] = useState({ name: '', description: '' });

  useEffect(() => { fetchSites(); }, []);

  async function fetchSites() {
    setLoading(true);
    const { data, error } = await supabase.from('sites').select('*, buildings(*)').order('name');
    if (error) toast.error(`Could not load sites: ${error.message}`);
    setSites((data || []) as SiteWithBuildings[]);
    setLoading(false);
  }

  function openNewSite() {
    setEditingSite(null);
    setSiteForm({ name: '', slug: '', centre_lat: '-26.063253867375856', centre_lng: '27.943127248882575', description: '' });
    setSiteDialog(true);
  }

  function openEditSite(site: SiteWithBuildings) {
    setEditingSite(site);
    setSiteForm({ name: site.name, slug: site.slug, centre_lat: String(site.centre_lat), centre_lng: String(site.centre_lng), description: site.description || '' });
    setSiteDialog(true);
  }

  async function saveSite() {
    if (!siteForm.name || !siteForm.slug || !siteForm.centre_lat || !siteForm.centre_lng) {
      toast.error('Name, slug, and centre coordinates are required');
      return;
    }
    const payload = { name: siteForm.name, slug: slugify(siteForm.slug), centre_lat: Number(siteForm.centre_lat), centre_lng: Number(siteForm.centre_lng), width_m: 163, height_m: 163, tile_url: '', description: siteForm.description || null };
    const result = editingSite ? await supabase.from('sites').update(payload).eq('id', editingSite.id) : await supabase.from('sites').insert(payload);
    if (result.error) { toast.error(result.error.message); return; }
    toast.success(editingSite ? 'Site updated' : 'Site created');
    setSiteDialog(false);
    fetchSites();
  }

  async function deleteSite() {
    if (!deleteId) return;
    const { error } = await supabase.from('sites').delete().eq('id', deleteId);
    if (error) { toast.error(error.message); return; }
    setDeleteDialog(false);
    setDeleteId(null);
    toast.success('Site deleted');
    fetchSites();
  }

  async function saveBuilding() {
    if (!buildingSite || !buildingForm.name) return;
    const { error } = await supabase.from('buildings').insert({ site_id: buildingSite.id, name: buildingForm.name, description: buildingForm.description || null });
    if (error) { toast.error(error.message); return; }
    toast.success('Building created');
    setBuildingDialog(false);
    setBuildingForm({ name: '', description: '' });
    fetchSites();
  }

  async function deleteBuilding(id: string) {
    const { error } = await supabase.from('buildings').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Building deleted');
    fetchSites();
  }

  return <AppShell><div className="space-y-6 p-6 lg:p-8">
    <PageHeader title="Sites" description="Manage buildings and their indoor floor plans" actions={<Button onClick={openNewSite} className="bg-blue-600 hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" />Add Site</Button>} />
    {loading ? <div className="grid gap-4 md:grid-cols-2"><div className="h-48 animate-pulse rounded-lg bg-slate-100" /><div className="h-48 animate-pulse rounded-lg bg-slate-100" /></div> : sites.length === 0 ? <Card><CardContent className="py-12 text-center"><Building2 className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-sm text-slate-500">No sites yet</p></CardContent></Card> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sites.map((site) => <Card key={site.id} className="overflow-hidden"><div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-400" /><CardContent className="space-y-4 pt-5"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="rounded-lg bg-blue-50 p-3 text-blue-600"><Building2 className="h-5 w-5" /></div><div><h2 className="font-semibold text-slate-900">{site.name}</h2><p className="font-mono text-xs text-slate-400">/{site.slug}</p></div></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => openEditSite(site)}><Pencil className="h-4 w-4 text-slate-500" /></Button><Button variant="ghost" size="icon" onClick={() => { setDeleteId(site.id); setDeleteDialog(true); }}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></div><div className="flex items-center gap-2 text-sm text-slate-500"><MapPin className="h-4 w-4" />{site.centre_lat.toFixed(6)}, {site.centre_lng.toFixed(6)}</div><div className="flex items-center justify-between border-t border-slate-100 pt-3"><span className="flex items-center gap-2 text-sm font-medium text-slate-700"><Layers3 className="h-4 w-4 text-blue-500" />{site.buildings?.length || 0} buildings</span><Button variant="outline" size="sm" onClick={() => { setBuildingSite(site); setBuildingDialog(true); }}><Plus className="mr-1.5 h-3.5 w-3.5" />Building</Button></div><div className="space-y-1">{(site.buildings || []).map((building) => <div key={building.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2"><Link href={`/sites/${building.id}`} className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600"><Building2 className="h-3.5 w-3.5" />{building.name}<ArrowRight className="h-3 w-3" /></Link><Button variant="ghost" size="icon" onClick={() => deleteBuilding(building.id)}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button></div>)}</div></CardContent></Card>)}</div>}
    <Dialog open={siteDialog} onOpenChange={setSiteDialog}><DialogContent><DialogHeader><DialogTitle>{editingSite ? 'Edit Site' : 'Add Site'}</DialogTitle></DialogHeader><div className="space-y-4"><div><Label htmlFor="site-name">Name</Label><Input id="site-name" value={siteForm.name} onChange={(event) => setSiteForm({ ...siteForm, name: event.target.value, slug: editingSite ? siteForm.slug : slugify(event.target.value) })} placeholder="Warehouse Demo" /></div><div><Label htmlFor="site-slug">Slug</Label><Input id="site-slug" value={siteForm.slug} onChange={(event) => setSiteForm({ ...siteForm, slug: slugify(event.target.value) })} /></div><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="site-lat">Centre latitude</Label><Input id="site-lat" type="number" step="any" value={siteForm.centre_lat} onChange={(event) => setSiteForm({ ...siteForm, centre_lat: event.target.value })} /></div><div><Label htmlFor="site-lng">Centre longitude</Label><Input id="site-lng" type="number" step="any" value={siteForm.centre_lng} onChange={(event) => setSiteForm({ ...siteForm, centre_lng: event.target.value })} /></div></div><div><Label htmlFor="site-description">Description</Label><Textarea id="site-description" value={siteForm.description} onChange={(event) => setSiteForm({ ...siteForm, description: event.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setSiteDialog(false)}>Cancel</Button><Button onClick={saveSite} className="bg-blue-600 hover:bg-blue-700">Save Site</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={buildingDialog} onOpenChange={setBuildingDialog}><DialogContent><DialogHeader><DialogTitle>Add Building to {buildingSite?.name}</DialogTitle></DialogHeader><div className="space-y-4"><div><Label htmlFor="building-name">Building name</Label><Input id="building-name" value={buildingForm.name} onChange={(event) => setBuildingForm({ ...buildingForm, name: event.target.value })} placeholder="Building 1" /></div><div><Label htmlFor="building-description">Description</Label><Textarea id="building-description" value={buildingForm.description} onChange={(event) => setBuildingForm({ ...buildingForm, description: event.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setBuildingDialog(false)}>Cancel</Button><Button onClick={saveBuilding} className="bg-blue-600 hover:bg-blue-700">Create Building</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}><DialogContent><DialogHeader><DialogTitle>Delete site?</DialogTitle></DialogHeader><p className="text-sm text-slate-500">This removes the site, its buildings, floors, and assignments.</p><DialogFooter><Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancel</Button><Button variant="destructive" onClick={deleteSite}>Delete</Button></DialogFooter></DialogContent></Dialog>
  </div></AppShell>;
}
