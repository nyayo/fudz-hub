# Fudz Hub: bulk menu import and private order-route map setup

This guide covers the backend and frontend files changed for CSV menu upserts and the Order Detail route map. No mobile source files are changed.

## 1. Deploy the backend bulk-import endpoint first

The frontend now submits each CSV batch to:

```http
POST /api/v1/restaurants/items/bulk/
Authorization: Bearer <access-token>
Content-Type: application/json
```

Example request:

```json
{
  "restaurant": 12,
  "items": [
    {
      "id": 48,
      "title": "Updated dish name",
      "description": "Updated description",
      "category": 7,
      "price": "8500.00",
      "is_available": true,
      "is_featured": false,
      "prep_time_minutes": 18,
      "allergens": "dairy"
    },
    {
      "title": "New menu item",
      "description": "Created from the CSV",
      "category": 7,
      "price": "6000.00",
      "is_available": true,
      "is_featured": false,
      "prep_time_minutes": 12,
      "allergens": ""
    }
  ]
}
```

### How rows are matched

- If a row has an `id`, it updates that item **only if it belongs to the selected restaurant**. An ID can also be used when changing an item’s title.
- If `id` is blank, the API updates an item with the same exact title in that restaurant; otherwise it creates a new item.
- `category` can be a category ID (the dashboard also resolves category names to IDs before upload).
- A request supports up to **500 rows**. The response reports `created`, `updated`, `failed`, and per-row results/errors.
- Restaurant owners and active restaurant managers are restricted to their own restaurant. A platform administrator must supply the selected restaurant ID. The dashboard resolves the current owner/staff restaurant automatically; the admin menu workspace must have a restaurant selected.
- The route uses existing tables and requires **no database migration**.

Apply the backend files from the backend change bundle to the API repository, deploy/restart the API, then apply the frontend files. In the backend project environment, run:

```bash
python -m pytest -q restaurants/tests/test_bulk_upload.py
```

The test command could not run in the editing sandbox because `pytest` is not installed there; the changed Python modules passed a syntax check.

## 2. Configure self-hosted OSRM and map tiles

The route map is intentionally **not connected to a public routing service by default**. It sends no route request until both of these Vite variables are configured. This keeps precise customer coordinates out of public demo routing services.

In the frontend project root, create a local `.env.local` (do not commit it) based on `.env.example` and set:

```dotenv
VITE_OSRM_BASE_URL=https://routing.example.com
VITE_MAP_TILE_URL=https://tiles.example.com/{z}/{x}/{y}.png
VITE_MAP_ATTRIBUTION='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
```

`VITE_OSRM_BASE_URL` is the root URL of your OSRM service; the dashboard appends `/route/v1/driving/...` and requests a full GeoJSON route. `VITE_MAP_TILE_URL` is a Leaflet tile URL template. Set attribution to meet the license/provider requirements for the tile source you actually use. If your tile source is not based on OpenStreetMap, use its required attribution instead.

### Self-host OSRM

1. Download an OpenStreetMap `.osm.pbf` extract covering your service area, for example from [Geofabrik](https://download.geofabrik.de/).
2. Follow the official [OSRM backend Docker quick start](https://github.com/Project-OSRM/osrm-backend). The standard car-profile/MLD flow is:

   ```bash
   docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
     osrm-extract -p /opt/car.lua /data/region.osm.pbf
   docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
     osrm-partition /data/region.osrm
   docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
     osrm-customize /data/region.osrm
   docker run -t -i -p 5000:5000 -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend \
     osrm-routed --algorithm mld /data/region.osrm
   ```

   Replace `region.osm.pbf` with the downloaded filename. For production, pin a tested OSRM image version, put the service behind HTTPS, and keep the regional data refreshed. A same-origin reverse proxy is a good way to avoid browser CORS setup; otherwise allow `GET` and `OPTIONS` only from the deployed dashboard origin.
3. Verify the service from a trusted network using a test coordinate route before exposing it. The browser request is shaped like:

   ```text
   {VITE_OSRM_BASE_URL}/route/v1/driving/{restaurant-lon},{restaurant-lat};{customer-lon},{customer-lat}?overview=full&geometries=geojson
   ```

### Provide map tiles

OSRM calculates the road route; it does **not** serve map tiles. Configure a tile endpoint separately. For stricter privacy, host tiles under your control or select a provider whose data-use terms are appropriate for delivery locations. Self-hosting tiles is a separate, resource-intensive service; see [Switch2OSM’s tile-server guide](https://switch2osm.org/serving-tiles/).

The map displays the configured tile attribution. If using OSM-derived tiles, show clear OpenStreetMap attribution. Do not use the public OSM tile service as a private delivery-map backend: its [tile policy](https://operations.osmfoundation.org/policies/tiles/) says not to submit personal/confidential data, prohibits bulk/prefetch tile downloads, and requires attribution and caching compliance. A third-party tile host can also infer approximate map areas from its tile requests; use self-hosted tiles if that is not acceptable.

### Build and verify the frontend

Vite embeds `VITE_*` values at build time. After setting `.env.local`, rebuild/redeploy the frontend:

```bash
npm install
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

When either `VITE_OSRM_BASE_URL` or `VITE_MAP_TILE_URL` is unset, Order Detail displays a setup notice and makes no route request. If a configured OSRM service is temporarily unavailable, the map displays the two endpoints with a direct-line fallback. The route appears only when the order API includes valid restaurant `pickup_location` and customer dropoff coordinates.

Leaflet’s map and line rendering use the standard [Leaflet quick-start pattern](https://leafletjs.com/examples/quick-start/); OSRM’s route endpoint and GeoJSON options are documented in the [OSRM HTTP API reference](https://project-osrm.org/docs/v5.5.1/api/).

## 3. Restaurant onboarding and map-selected pickup points

Restaurant owners start at `/login`, verify their email with the existing one-time code flow, and complete the restaurant application on the auth page. The application uses Leaflet: search an address/place, then click the map or drag the pin to refine the pickup point. The browser sends WGS84 `latitude` and `longitude`; the existing GIS `RestaurantProfile.location` field stores them as a PostGIS point in longitude/latitude order. No schema migration is required.

Apply the backend `users/serializers.py` update before deploying the frontend: it accepts and validates the selected point and writes it to the restaurant profile. The platform-admin restaurant directory also uses the same picker when correcting a saved location. Set `VITE_MAP_TILE_URL` and `VITE_MAP_ATTRIBUTION` to the tile endpoint and attribution chosen for your deployment. The picker falls back to the standard OSM tile URL for local/low-volume use when the tile URL is unset; the order route map remains unconfigured until its OSRM and tile endpoints are set.

Place search runs only after a user submits the address field (no autocomplete). If `VITE_GEOCODING_URL` is set, it must point to a Nominatim-compatible search endpoint; otherwise the picker calls public OpenStreetMap Nominatim. That public geocoder and tile service are not intended as high-volume production infrastructure. Use a managed geocoder or a server-side proxy plus your selected/self-hosted tiles for production traffic, and review each provider's attribution, caching and usage rules.

## 4. Registration verification window

The API now accepts registration only while the supplied email or phone has an unexpired OTP-verification record. For a new account, successful OTP verification opens a 30-minute registration window; creating the account consumes that proof, and requesting a fresh OTP invalidates earlier verified proofs. The existing email/phone OTP response shapes are unchanged, and OTP proof adds no request field or database migration. However, `/register/` now requires valid `latitude` and `longitude` when `user_type` is `restaurant`. No mobile source was changed here; any mobile or other client that creates restaurant accounts through this endpoint must also provide the selected WGS84 coordinates. In the API environment, run `python -m pytest -q users/tests/test_serializers.py` after applying `users/serializers.py`, `users/views.py` and `users/tests/test_serializers.py`.

## 5. Analytics completeness

The Analytics page follows the orders API's newest-first pagination until it has loaded the selected date range, including the page that crosses the range boundary. This avoids both the old three-page undercount and unnecessary retrieval of older history. If a needed page fails, the page labels figures as incomplete and offers a retry.


## ZIP+CSV menu images

The dashboard accepts the existing CSV format and, for image imports, a ZIP containing **exactly one CSV** plus the image files referenced by it. The optional `image` column contains one path per item, relative to the ZIP root, such as `images/margherita.jpg`. Keep the CSV category values as category names or IDs as before. JPG, JPEG, PNG and WebP are supported; each referenced image must be no larger than 8 MB. Current browser-side safeguards limit the ZIP to 50 MB, extracted contents to 100 MB, the CSV to 2 MB and the import to 500 rows.

After the existing bulk upsert returns each item's ID, the dashboard uploads its image through the existing per-item image endpoint. Rows that fail to import do not receive image uploads; image-upload errors are reported separately. When updating an existing item, the image is **added** to its image gallery, not used to replace existing images. No new API endpoint or database migration is required for this frontend flow.
