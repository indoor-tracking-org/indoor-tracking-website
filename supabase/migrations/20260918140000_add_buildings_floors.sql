-- IndoorTrack indoor building and floor-plan model
CREATE TABLE IF NOT EXISTS buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS floors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name text NOT NULL,
  floor_number integer NOT NULL DEFAULT 0,
  image_url text,
  image_width integer,
  image_height integer,
  calibration_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE (building_id, floor_number)
);

ALTER TABLE devices ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES buildings(id) ON DELETE SET NULL;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS floor_id uuid REFERENCES floors(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_buildings" ON buildings;
CREATE POLICY "anon_all_buildings" ON buildings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_floors" ON floors;
CREATE POLICY "anon_all_floors" ON floors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_all_settings" ON settings;
CREATE POLICY "anon_all_settings" ON settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_buildings_site_id ON buildings(site_id);
CREATE INDEX IF NOT EXISTS idx_floors_building_id ON floors(building_id);
CREATE INDEX IF NOT EXISTS idx_devices_building_id ON devices(building_id);
CREATE INDEX IF NOT EXISTS idx_devices_floor_id ON devices(floor_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('floor-plans', 'floor-plans', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "public_read_floor_plans" ON storage.objects;
CREATE POLICY "public_read_floor_plans" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'floor-plans');
DROP POLICY IF EXISTS "public_upload_floor_plans" ON storage.objects;
CREATE POLICY "public_upload_floor_plans" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'floor-plans');
DROP POLICY IF EXISTS "public_update_floor_plans" ON storage.objects;
CREATE POLICY "public_update_floor_plans" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'floor-plans') WITH CHECK (bucket_id = 'floor-plans');
DROP POLICY IF EXISTS "public_delete_floor_plans" ON storage.objects;
CREATE POLICY "public_delete_floor_plans" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'floor-plans');

INSERT INTO buildings (site_id, name, description)
SELECT id, 'Building 1', 'Demo warehouse building'
FROM sites
WHERE slug = 'warehouse-demo'
  AND NOT EXISTS (SELECT 1 FROM buildings WHERE site_id = sites.id AND name = 'Building 1');

INSERT INTO floors (building_id, name, floor_number)
SELECT buildings.id, floor_data.name, floor_data.floor_number
FROM buildings
CROSS JOIN (VALUES ('Ground Floor', 0), ('Floor 1', 1), ('Floor 2', 2)) AS floor_data(name, floor_number)
WHERE buildings.name = 'Building 1'
  AND NOT EXISTS (
    SELECT 1 FROM floors
    WHERE floors.building_id = buildings.id AND floors.floor_number = floor_data.floor_number
  );

UPDATE devices
SET building_id = buildings.id,
    floor_id = floors.id
FROM buildings
JOIN floors ON floors.building_id = buildings.id AND floors.floor_number = 0
WHERE buildings.name = 'Building 1'
  AND devices.ident = '867564050700001'
  AND devices.site_id = buildings.site_id;

UPDATE devices
SET building_id = buildings.id,
    floor_id = floors.id
FROM buildings
JOIN floors ON floors.building_id = buildings.id AND floors.floor_number = 1
WHERE buildings.name = 'Building 1'
  AND devices.ident = '867564050700002'
  AND devices.site_id = buildings.site_id;
