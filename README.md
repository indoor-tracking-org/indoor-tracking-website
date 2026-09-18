# IndoorTrack

IndoorTrack is a Next.js indoor asset tracking platform for warehouses and facilities. It uses Supabase for sites, devices, telemetry, and alerts; Leaflet renders each site's custom warehouse tile set; and Flespi telemetry is ingested through a server-side webhook.

## Local setup

1. Copy `.env.example` to `.env.local` and fill in the Supabase values. Keep `SUPABASE_SERVICE_ROLE_KEY` and `FLESPI_TOKEN` server-side.
2. Apply `supabase/migrations/20260918115643_create_indoortrack_schema.sql` to the Supabase project. It creates the schema and seeds the Warehouse Demo site and two demo devices.
3. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/dashboard`. Use **Start Demo Tracking** on the Dashboard or Live Map to generate movement for Warehouse Key A and B around the default warehouse coordinates.

## Flespi webhook

Configure Flespi to POST telemetry to `/api/flespi/webhook`. The handler accepts nested and flattened Flespi fields, stores the complete raw payload, updates the device's latest state, and creates movement/low-battery alerts. When `FLESPI_TOKEN` is set, send it as `Authorization: FlespiToken <token>` or `x-flespi-token`.

## Deployment

The project is compatible with Vercel. Add the variables from `.env.example` to the Vercel project, apply the Supabase migration, and use `npm run build` to verify a production build locally.
