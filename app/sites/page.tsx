'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import type { Site } from '@/lib/types';
import { Plus, Pencil, Trash2, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    centre_lat: '',
    centre_lng: '',
    width_m: '',
    height_m: '',
    tile_url: '',
    description: '',
  });

  useEffect(() => {
    fetchSites();
  }, []);

  async function fetchSites() {
    setLoading(true);
    const { data } = await supabase.from('sites').select('*').order('name');
    setSites(data || []);
    setLoading(false);
  }

  function openAddDialog() {
    setEditingSite(null);
    setFormData({
      name: '',
      slug: '',
      centre_lat: '',
      centre_lng: '',
      width_m: '163',
      height_m: '163',
      tile_url: '',
      description: '',
    });
    setDialogOpen(true);
  }

  function openEditDialog(site: Site) {
    setEditingSite(site);
    setFormData({
      name: site.name,
      slug: site.slug,
      centre_lat: site.centre_lat.toString(),
      centre_lng: site.centre_lng.toString(),
      width_m: site.width_m.toString(),
      height_m: site.height_m.toString(),
      tile_url: site.tile_url,
      description: site.description || '',
    });
    setDialogOpen(true);
  }

  function handleNameChange(name: string) {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingSite ? prev.slug : slugify(name),
    }));
  }

  function autoFillTileUrl() {
    const slug = formData.slug || slugify(formData.name);
    setFormData((prev) => ({
      ...prev,
      tile_url: `https://wialon-map-overlays.vercel.app/tiles/${slug}/{z}/{x}/{y}.png`,
    }));
  }

  async function saveSite() {
    if (!formData.name || !formData.slug || !formData.centre_lat || !formData.centre_lng || !formData.tile_url) {
      toast.error('Name, slug, centre coordinates, and tile URL are required');
      return;
    }

    const payload = {
      name: formData.name,
      slug: formData.slug,
      centre_lat: parseFloat(formData.centre_lat),
      centre_lng: parseFloat(formData.centre_lng),
      width_m: parseFloat(formData.width_m) || 163,
      height_m: parseFloat(formData.height_m) || 163,
      tile_url: formData.tile_url,
      description: formData.description || null,
    };

    if (editingSite) {
      const { error } = await supabase.from('sites').update(payload).eq('id', editingSite.id);
      if (error) {
        toast.error(`Error: ${error.message}`);
        return;
      }
      toast.success('Site updated');
    } else {
      const { error } = await supabase.from('sites').insert(payload);
      if (error) {
        toast.error(`Error: ${error.message}`);
        return;
      }
      toast.success('Site created');
    }

    setDialogOpen(false);
    fetchSites();
  }

  async function deleteSite() {
    if (!deleteId) return;
    const { error } = await supabase.from('sites').delete().eq('id', deleteId);
    if (error) {
      toast.error(`Error: ${error.message}`);
      return;
    }
    toast.success('Site deleted');
    setDeleteId(null);
    fetchSites();
  }

  return (
    <AppShell>
      <div className="space-y-6 p-6 lg:p-8">
        <PageHeader
          title="Sites"
          description="Manage your warehouse and facility sites with custom map tiles"
          actions={
            <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Site
            </Button>
          }
        />

        {/* Site cards */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : sites.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-3 text-sm text-slate-400">No sites found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => (
              <Card key={site.id} className="overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-400" />
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{site.name}</h3>
                        <p className="text-xs text-slate-400 font-mono">/{site.slug}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(site)}>
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(site.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {site.centre_lat.toFixed(6)}, {site.centre_lng.toFixed(6)}
                    </div>
                    <div className="text-slate-500">
                      {site.width_m}m × {site.height_m}m
                    </div>
                    {site.description && (
                      <p className="text-xs text-slate-400 pt-1">{site.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSite ? 'Edit Site' : 'Add Site'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label htmlFor="site-name">Name</Label>
              <Input
                id="site-name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Warehouse Demo"
              />
            </div>
            <div>
              <Label htmlFor="site-slug">Slug</Label>
              <Input
                id="site-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                placeholder="e.g. warehouse-demo"
              />
              <p className="mt-1 text-xs text-slate-400">Used in the tile URL path</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="centre_lat">Centre Latitude</Label>
                <Input
                  id="centre_lat"
                  type="number"
                  step="any"
                  value={formData.centre_lat}
                  onChange={(e) => setFormData({ ...formData, centre_lat: e.target.value })}
                  placeholder="-26.063253"
                />
              </div>
              <div>
                <Label htmlFor="centre_lng">Centre Longitude</Label>
                <Input
                  id="centre_lng"
                  type="number"
                  step="any"
                  value={formData.centre_lng}
                  onChange={(e) => setFormData({ ...formData, centre_lng: e.target.value })}
                  placeholder="27.943127"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="width_m">Width (metres)</Label>
                <Input
                  id="width_m"
                  type="number"
                  step="any"
                  value={formData.width_m}
                  onChange={(e) => setFormData({ ...formData, width_m: e.target.value })}
                  placeholder="163"
                />
              </div>
              <div>
                <Label htmlFor="height_m">Height (metres)</Label>
                <Input
                  id="height_m"
                  type="number"
                  step="any"
                  value={formData.height_m}
                  onChange={(e) => setFormData({ ...formData, height_m: e.target.value })}
                  placeholder="163"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="tile_url">Tile URL</Label>
                <button
                  onClick={autoFillTileUrl}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Auto-fill from slug
                </button>
              </div>
              <Input
                id="tile_url"
                value={formData.tile_url}
                onChange={(e) => setFormData({ ...formData, tile_url: e.target.value })}
                placeholder="https://wialon-map-overlays.vercel.app/tiles/{slug}/{z}/{x}/{y}.png"
              />
              <p className="mt-1 text-xs text-slate-400">
                Use {'{z}/{x}/{y}'} placeholders for Leaflet tile coordinates
              </p>
            </div>
            <div>
              <Label htmlFor="site-desc">Description</Label>
              <Textarea
                id="site-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSite} className="bg-blue-600 hover:bg-blue-700">
              {editingSite ? 'Save Changes' : 'Create Site'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this site?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the site. Devices assigned to it will be unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSite}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
