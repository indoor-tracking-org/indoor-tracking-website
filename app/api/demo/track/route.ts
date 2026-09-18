import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabaseAdmin() {
  return createClient(supabaseUrl, serviceRoleKey);
}

// Demo tracking: moves two devices around the warehouse centre in a realistic pattern
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body as { action?: 'start' | 'stop' | 'tick' };

    const supabase = getSupabaseAdmin();

    // Fetch the demo site
    const { data: site } = await supabase
      .from('sites')
      .select('id, centre_lat, centre_lng, width_m, height_m')
      .eq('slug', 'warehouse-demo')
      .maybeSingle();

    if (!site) {
      return NextResponse.json({ error: 'Demo site not found' }, { status: 404 });
    }

    // Fetch demo devices
    const { data: devices } = await supabase
      .from('devices')
      .select('id, ident, name, last_lat, last_lng')
      .in('ident', ['867564050700001', '867564050700002']);

    if (!devices || devices.length === 0) {
      return NextResponse.json({ error: 'No demo devices found' }, { status: 404 });
    }

    if (action === 'stop') {
      // Set devices to stationary
      for (const dev of devices) {
        await supabase
          .from('devices')
          .update({ status: 'stationary' })
          .eq('id', dev.id);
      }
      return NextResponse.json({ status: 'stopped' });
    }

    // Generate a tick of movement for each device
    const now = new Date();
    const centreLat = site.centre_lat;
    const centreLng = site.centre_lng;
    // ~163m area → approx 0.00147 degrees latitude
    const radius = 0.0008;
    const results: Array<{ ident: string; lat: number; lng: number }> = [];

    for (let i = 0; i < devices.length; i++) {
      const dev = devices[i];
      const phase = (now.getTime() / 10000 + i * Math.PI) % (2 * Math.PI);
      const lat = centreLat + Math.sin(phase) * radius + (Math.random() - 0.5) * 0.00005;
      const lng = centreLng + Math.cos(phase) * radius + (Math.random() - 0.5) * 0.00005;
      const speed = 2 + Math.random() * 3;
      const direction = (phase * 180) / Math.PI;
      const battery = 80 + Math.random() * 20;
      const temperature = 21 + Math.random() * 3;

      // Insert telemetry
      await supabase.from('telemetry').insert({
        device_id: dev.id,
        ident: dev.ident,
        timestamp: now.toISOString(),
        latitude: lat,
        longitude: lng,
        speed,
        direction,
        position_valid: true,
        battery_level: battery,
        battery_voltage: 3.7 + Math.random() * 0.3,
        temperature,
        raw_payload: { demo: true, device: dev.name, timestamp: now.toISOString() },
      });

      // Update device
      await supabase
        .from('devices')
        .update({
          status: 'moving',
          last_seen: now.toISOString(),
          last_lat: lat,
          last_lng: lng,
          last_speed: speed,
          last_direction: direction,
          last_battery_level: battery,
          last_battery_voltage: 3.7 + Math.random() * 0.3,
          last_temperature: temperature,
        })
        .eq('id', dev.id);

      results.push({ ident: dev.ident, lat, lng });
    }

    return NextResponse.json({
      status: 'ticked',
      devices: results,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
