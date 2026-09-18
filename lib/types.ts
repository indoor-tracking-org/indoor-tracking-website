export type DeviceStatus = 'online' | 'offline' | 'alert' | 'moving' | 'stationary';

export type AlertType =
  | 'offline'
  | 'low_battery'
  | 'entering_site'
  | 'leaving_site'
  | 'moving'
  | 'stationary';

export type AlertStatus = 'active' | 'acknowledged';

export interface Site {
  id: string;
  name: string;
  slug: string;
  centre_lat: number;
  centre_lng: number;
  width_m: number;
  height_m: number;
  tile_url: string;
  description: string | null;
  created_at: string;
  buildings?: Building[];
}

export interface Building {
  id: string;
  site_id: string;
  name: string;
  description: string | null;
  created_at: string;
  floors?: Floor[];
}

export interface Floor {
  id: string;
  building_id: string;
  name: string;
  floor_number: number;
  image_url: string | null;
  image_width: number | null;
  image_height: number | null;
  calibration_points: CalibrationPoint[];
  created_at: string;
}

export interface CalibrationPoint {
  image_x: number;
  image_y: number;
  latitude: number;
  longitude: number;
  label?: string;
}

export interface Device {
  id: string;
  name: string;
  ident: string;
  device_type: string;
  site_id: string | null;
  description: string | null;
  status: DeviceStatus;
  last_seen: string | null;
  last_lat: number | null;
  last_lng: number | null;
  last_speed: number | null;
  last_direction: number | null;
  last_battery_level: number | null;
  last_battery_voltage: number | null;
  last_temperature: number | null;
  created_at: string;
  site?: Site | null;
  building_id: string | null;
  floor_id: string | null;
  building?: Building | null;
  floor?: Floor | null;
}

export interface Telemetry {
  id: string;
  device_id: string;
  ident: string | null;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  direction: number | null;
  position_valid: boolean | null;
  battery_voltage: number | null;
  battery_level: number | null;
  temperature: number | null;
  raw_payload: Record<string, unknown>;
  created_at: string;
}

export interface Alert {
  id: string;
  device_id: string;
  site_id: string | null;
  alert_type: AlertType;
  message: string | null;
  status: AlertStatus;
  created_at: string;
  acknowledged_at: string | null;
  device?: Device | null;
  site?: Site | null;
}

export interface FlespiTelemetryInput {
  device_id?: string;
  ident?: string;
  device_name?: string;
  timestamp?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
  direction?: number;
  position_valid?: boolean;
  battery_voltage?: number;
  battery_level?: number;
  temperature?: number;
  raw: Record<string, unknown>;
}
