'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { formatRelativeTime, statusBgColor } from '@/lib/format';
import type { Device, Site, DeviceStatus } from '@/lib/types';
import { Plus, Search, Pencil, Trash2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    ident: '',
    device_type: '',
    site_id: '',
    description: '',
    status: 'offline' as DeviceStatus,
  last_lat: '',
    last_lng: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [devRes, siteRes] = await Promise.all([
      supabase.from('devices').select('*, site:sites(*)').order('name'),
      supabase.from('sites').select('*').order('name'),
    ]);
    setDevices(devRes.data || []);
    setSites(siteRes.data || []);
    setLoading(false);
  }

  const filteredDevices = devices.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (siteFilter !== 'all' && d.site_id !== siteFilter) return false;
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

  function openAddDialog() {
    setEditingDevice(null);
    setFormData({
      name: '',
      ident: '',
      device_type: '',
      site_id: sites[0]?.id || '',
      description: '',
      status: 'offline',
      last_lat: '',
      last_lng: '',
    });
    setDialogOpen(true);
  }

  function openEditDialog(device: Device) {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      ident: device.ident,
      device_type: device.device_type,
      site_id: device.site_id || '',
      description: device.description || '',
      status: device.status,
      last_lat: device.last_lat?.toString() || '',
      last_lng: device.last_lng?.toString() || '',
    });
    setDialogOpen(true);
  }

  async function saveDevice() {
    if (!formData.name || !formData.ident || !formData.device_type) {
      toast.error('Name, Ident/IMEI, and Device type are required');
      return;
    }

    const payload = {
      name: formData.name,
      ident: formData.ident,
      device_type: formData.device_type,
      site_id: formData.site_id || null,
      description: formData.description || null,
      status: formData.status,
      last_lat: formData.last_lat ? parseFloat(formData.last_lat) : null,
      last_lng: formData.last_lng ? parseFloat(formData.last_lng) : null,
    };

    if (editingDevice) {
      const { error } = await supabase
        .from('devices')
        .update(payload)
        .eq('id', editingDevice.id);
      if (error) {
        toast.error(`Error: ${error.message}`);
        return;
      }
      toast.success('Device updated');
    } else {
      const { error } = await supabase.from('devices').insert(payload);
      if (error) {
        toast.error(`Error: ${error.message}`);
        return;
      }
      toast.success('Device added');
    }

    setDialogOpen(false);
    fetchData();
  }

  async function deleteDevice() {
    if (!deleteId) return;
    const { error } = await supabase.from('devices').delete().eq('id', deleteId);
    if (error) {
      toast.error(`Error: ${error.message}`);
      return;
    }
    toast.success('Device deleted');
    setDeleteId(null);
    fetchData();
  }

  return (
    <AppShell>
      <div className="space-y-6 p-6 lg:p-8">
        <PageHeader
          title="Devices"
          description="Manage your tracked assets and equipment"
          actions={
            <Button onClick={openAddDialog} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Device
            </Button>
          }
        />

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by name, IMEI, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="alert">Alert</SelectItem>
                  <SelectItem value="moving">Moving</SelectItem>
                  <SelectItem value="stationary">Stationary</SelectItem>
                </SelectContent>
              </Select>
              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
                ))}
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="py-12 text-center">
                <Smartphone className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-3 text-sm text-slate-400">No devices found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Ident / IMEI</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium text-slate-900">{device.name}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">{device.ident}</TableCell>
                      <TableCell className="text-slate-600">{device.device_type}</TableCell>
                      <TableCell className="text-slate-600">
                        {device.site?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`capitalize ${statusBgColor(device.status)}`}>
                          {device.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {formatRelativeTime(device.last_seen)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(device)}
                          >
                            <Pencil className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(device.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDevice ? 'Edit Device' : 'Add Device'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Warehouse Key A"
              />
            </div>
            <div>
              <Label htmlFor="ident">Ident / IMEI</Label>
              <Input
                id="ident"
                value={formData.ident}
                onChange={(e) => setFormData({ ...formData, ident: e.target.value })}
                placeholder="e.g. 867564050700001"
              />
            </div>
            <div>
              <Label htmlFor="device_type">Device Type</Label>
              <Input
                id="device_type"
                value={formData.device_type}
                onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                placeholder="e.g. gb100cg"
              />
            </div>
            <div>
              <Label htmlFor="site">Site</Label>
              <Select
                value={formData.site_id}
                onValueChange={(v) => setFormData({ ...formData, site_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="last_lat">Latitude</Label>
                <Input
                  id="last_lat"
                  value={formData.last_lat}
                  onChange={(e) => setFormData({ ...formData, last_lat: e.target.value })}
                  placeholder="-26.063143"
                />
              </div>
              <div>
                <Label htmlFor="last_lng">Longitude</Label>
                <Input
                  id="last_lng"
                  value={formData.last_lng}
                  onChange={(e) => setFormData({ ...formData, last_lng: e.target.value })}
                  placeholder="27.943186"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
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
            <Button onClick={saveDevice} className="bg-blue-600 hover:bg-blue-700">
              {editingDevice ? 'Save Changes' : 'Add Device'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the device and all its telemetry and alert records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteDevice}
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
