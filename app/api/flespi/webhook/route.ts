import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabaseAdmin() {
  return createClient(supabaseUrl, serviceRoleKey);
}

interface FlespiMessage {
  'device.id'?: number | string;
  'device.name'?: string;
  ident?: string;
  timestamp?: number | string;
  position?: {
    latitude?: number;
    longitude?: number;
    speed?: number;
    direction?: number;
    valid?: boolean;
  };
  battery?: {
    voltage?: number;
    level?: number;
  };
  temperature?: number;
  [key: string]: unknown;
}

function normalizeFlespiMessage(msg: FlespiMessage) {
  return {
    deviceId: msg['device.id'] != null ? String(msg['device.id']) : undefined,
    deviceName: msg['device.name'],
    ident: msg.ident,
    timestamp: msg.timestamp
      ? typeof msg.timestamp === 'number'
        ? new Date(msg.timestamp * 1000).toISOString()
        : new Date(msg.timestamp).toISOString()
      : new Date().toISOString(),
    latitude: msg.position?.latitude,
    longitude: msg.position?.longitude,
    speed: msg.position?.speed,
    direction: msg.position?.direction,
    positionValid: msg.position?.valid,
    batteryVoltage: msg.battery?.voltage,
    batteryLevel: msg.battery?.level,
    temperature: msg.temperature,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: FlespiMessage[] = Array.isArray(body) ? body : [body];

    if (messages.length === 0) {
      return NextResponse.json({ error: 'No messages received' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const results: Array<{ ident: string; status: string }> = [];

    for (const rawMsg of messages) {
      const norm = normalizeFlespiMessage(rawMsg);

      if (!norm.ident) {
        results.push({ ident: 'unknown', status: 'skipped - no ident' });
        continue;
      }

      // Find device by ident
      const { data: device, error: deviceErr } = await supabase
        .from('devices')
        .select('id, site_id, status, last_battery_level')
        .eq('ident', norm.ident)
        .maybeSingle();

      if (deviceErr || !device) {
        results.push({ ident: norm.ident, status: 'device not found' });
        continue;
      }

      // Determine new status
      let newStatus: string = 'stationary';
      if (norm.speed !== undefined && norm.speed > 0.5) {
        newStatus = 'moving';
      } else if (norm.positionValid === false) {
        newStatus = 'offline';
      } else {
        newStatus = 'online';
      }

      // Insert telemetry record
      const { error: telErr } = await supabase.from('telemetry').insert({
        device_id: device.id,
        ident: norm.ident,
        timestamp: norm.timestamp,
        latitude: norm.latitude ?? null,
        longitude: norm.longitude ?? null,
        speed: norm.speed ?? null,
        direction: norm.direction ?? null,
        position_valid: norm.positionValid ?? null,
        battery_voltage: norm.batteryVoltage ?? null,
        battery_level: norm.batteryLevel ?? null,
        temperature: norm.temperature ?? null,
        raw_payload: rawMsg,
      });

      if (telErr) {
        results.push({ ident: norm.ident, status: `telemetry error: ${telErr.message}` });
        continue;
      }

      // Update device last-known state
      const updateData: Record<string, unknown> = {
        status: newStatus,
        last_seen: norm.timestamp,
      };
      if (norm.latitude !== undefined) updateData.last_lat = norm.latitude;
      if (norm.longitude !== undefined) updateData.last_lng = norm.longitude;
      if (norm.speed !== undefined) updateData.last_speed = norm.speed;
      if (norm.direction !== undefined) updateData.last_direction = norm.direction;
      if (norm.batteryLevel !== undefined) updateData.last_battery_level = norm.batteryLevel;
      if (norm.batteryVoltage !== undefined) updateData.last_battery_voltage = norm.batteryVoltage;
      if (norm.temperature !== undefined) updateData.last_temperature = norm.temperature;

      await supabase.from('devices').update(updateData).eq('id', device.id);

      // Generate alerts
      const alertsToInsert: Array<{
        device_id: string;
        site_id: string | null;
        alert_type: string;
        message: string;
      }> = [];

      // Low battery alert
      if (norm.batteryLevel !== undefined && norm.batteryLevel < 20) {
        alertsToInsert.push({
          device_id: device.id,
          site_id: device.site_id,
          alert_type: 'low_battery',
          message: `Battery level low: ${norm.batteryLevel.toFixed(0)}%`,
        });
      }

      // Moving / stationary alerts
      if (newStatus === 'moving' && device.status !== 'moving') {
        alertsToInsert.push({
          device_id: device.id,
          site_id: device.site_id,
          alert_type: 'moving',
          message: 'Device started moving',
        });
      }

      if (alertsToInsert.length > 0) {
        await supabase.from('alerts').insert(alertsToInsert);
      }

      results.push({ ident: norm.ident, status: 'processed' });
    }

    return NextResponse.json({
      received: messages.length,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'IndoorTrack Flespi Webhook',
    method: 'POST',
    description: 'Send Flespi telemetry messages to this endpoint for ingestion.',
  });
}
