/*
# IndoorTrack Schema

1. Overview
IndoorTrack is an indoor asset and device tracking platform. Flespi sends telemetry
to the platform, which stores it and displays devices live on warehouse/site maps.

2. New Tables
- `sites` — physical locations (warehouses, sites) with custom map tile URLs.
  - id (uuid PK)
  - name (text, not null)
  - slug (text, unique, not null) — used in the tile URL path
  - centre_lat (double precision, not null)
  - centre_lng (double precision, not null)
  - width_m (double precision, not null) — site width in metres
  - height_m (double precision, not null) — site height in metres
  - tile_url (text, not null) — Leaflet tile URL template with {z}/{x}/{y}
  - description (text, nullable)
  - created_at (timestamptz, default now())

- `devices` — tracked assets (keys, cages, tools, equipment).
  - id (uuid PK)
  - name (text, not null)
  - ident (text, unique, not null) — IMEI or flespi device ident
  - device_type (text, not null) — e.g. gb100cg
  - site_id (uuid FK → sites.id, nullable)
  - description (text, nullable)
  - status (text, default 'offline') — online | offline | alert | moving | stationary
  - last_seen (timestamptz, nullable)
  - last_lat (double precision, nullable)
  - last_lng (double precision, nullable)
  - last_speed (double precision, nullable)
  - last_direction (double precision, nullable)
  - last_battery_level (double precision, nullable)
  - last_battery_voltage (double precision, nullable)
  - last_temperature (double precision, nullable)
  - created_at (timestamptz, default now())

- `telemetry` — raw + normalized telemetry records from Flespi.
  - id (uuid PK)
  - device_id (uuid FK → devices.id, not null)
  - ident (text, nullable)
  - timestamp (timestamptz, not null, default now())
  - latitude (double precision, nullable)
  - longitude (double precision, nullable)
  - speed (double precision, nullable)
  - direction (double precision, nullable)
  - position_valid (boolean, nullable)
  - battery_voltage (double precision, nullable)
  - battery_level (double precision, nullable)
  - temperature (double precision, nullable)
  - raw_payload (jsonb, not null) — complete original Flespi JSON payload
  - created_at (timestamptz, default now())

- `alerts` — device alerts (offline, low battery, geofence, movement).
  - id (uuid PK)
  - device_id (uuid FK → devices.id, not null)
  - site_id (uuid FK → sites.id, nullable)
  - alert_type (text, not null) — offline | low_battery | entering_site | leaving_site | moving | stationary
  - message (text, nullable)
  - status (text, default 'active') — active | acknowledged
  - created_at (timestamptz, default now())
  - acknowledged_at (timestamptz, nullable)

3. Relationships
- Site → many devices (devices.site_id)
- Device → many telemetry records (telemetry.device_id)
- Device → many alerts (alerts.device_id)

4. Security
- This is a single-tenant app with no sign-in screen, so all policies use
  TO anon, authenticated with USING (true) / WITH CHECK (true) because the
  data is intentionally shared/public for the operator dashboard.
- RLS enabled on all tables.

5. Indexes
- devices.ident (unique)
- devices.site_id
- telemetry.device_id
- telemetry.timestamp
- alerts.device_id
- alerts.status
- alerts.created_at

6. Seed Data
- Demo site "Warehouse Demo" (slug: warehouse-demo)
- Two demo devices: Warehouse Key A, Warehouse Key B
*/

-- SITES
-- USERS (the initial operator workspace is single-tenant; authentication can be added later)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'operator',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_users" ON users;
CREATE POLICY "anon_select_users" ON users FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_users" ON users;
CREATE POLICY "anon_insert_users" ON users FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_users" ON users;
CREATE POLICY "anon_update_users" ON users FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- SITES
CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  centre_lat double precision NOT NULL,
  centre_lng double precision NOT NULL,
  width_m double precision NOT NULL,
  height_m double precision NOT NULL,
  tile_url text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sites" ON sites;
CREATE POLICY "anon_select_sites" ON sites FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sites" ON sites;
CREATE POLICY "anon_insert_sites" ON sites FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sites" ON sites;
CREATE POLICY "anon_update_sites" ON sites FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sites" ON sites;
CREATE POLICY "anon_delete_sites" ON sites FOR DELETE
  TO anon, authenticated USING (true);

-- DEVICES
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ident text UNIQUE NOT NULL,
  device_type text NOT NULL,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  description text,
  status text NOT NULL DEFAULT 'offline',
  last_seen timestamptz,
  last_lat double precision,
  last_lng double precision,
  last_speed double precision,
  last_direction double precision,
  last_battery_level double precision,
  last_battery_voltage double precision,
  last_temperature double precision,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_devices" ON devices;
CREATE POLICY "anon_select_devices" ON devices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_devices" ON devices;
CREATE POLICY "anon_insert_devices" ON devices FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_devices" ON devices;
CREATE POLICY "anon_update_devices" ON devices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_devices" ON devices;
CREATE POLICY "anon_delete_devices" ON devices FOR DELETE
  TO anon, authenticated USING (true);

-- TELEMETRY
CREATE TABLE IF NOT EXISTS telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  ident text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  speed double precision,
  direction double precision,
  position_valid boolean,
  battery_voltage double precision,
  battery_level double precision,
  temperature double precision,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_telemetry" ON telemetry;
CREATE POLICY "anon_select_telemetry" ON telemetry FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_telemetry" ON telemetry;
CREATE POLICY "anon_insert_telemetry" ON telemetry FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_telemetry" ON telemetry;
CREATE POLICY "anon_update_telemetry" ON telemetry FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_telemetry" ON telemetry;
CREATE POLICY "anon_delete_telemetry" ON telemetry FOR DELETE
  TO anon, authenticated USING (true);

-- ALERTS
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  alert_type text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE
  TO anon, authenticated USING (true);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_devices_site_id ON devices(site_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_id ON telemetry(device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- SEED DATA
INSERT INTO sites (name, slug, centre_lat, centre_lng, width_m, height_m, tile_url, description)
SELECT 'Warehouse Demo', 'warehouse-demo', -26.063253867375856, 27.943127248882575, 163, 163,
  'https://wialon-map-overlays.vercel.app/tiles/warehouse-demo/{z}/{x}/{y}.png',
  'Default demo warehouse site for IndoorTrack'
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE slug = 'warehouse-demo');

INSERT INTO devices (name, ident, device_type, site_id, description, status, last_lat, last_lng, last_battery_level, last_temperature)
SELECT 'Warehouse Key A', '867564050700001', 'gb100cg',
  (SELECT id FROM sites WHERE slug = 'warehouse-demo'),
  'Demo warehouse key tracker A', 'offline', -26.063143, 27.943186, 87, 22.5
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE ident = '867564050700001');

INSERT INTO devices (name, ident, device_type, site_id, description, status, last_lat, last_lng, last_battery_level, last_temperature)
SELECT 'Warehouse Key B', '867564050700002', 'gb100cg',
  (SELECT id FROM sites WHERE slug = 'warehouse-demo'),
  'Demo warehouse key tracker B', 'offline', -26.063353, 27.943090, 92, 21.8
WHERE NOT EXISTS (SELECT 1 FROM devices WHERE ident = '867564050700002');
