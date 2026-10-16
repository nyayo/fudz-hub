import { useEffect, useState } from "react";
import L, { type LatLngTuple } from "leaflet";
import { MapPin, Search } from "lucide-react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BaseMapLayer } from "@/components/maps/BaseMapLayer";

const geocoderUrl = (import.meta.env.VITE_GEOCODING_URL ?? "").trim()
  || "https://nominatim.openstreetmap.org/search";
let lastGeocoderRequestAt = 0;

// Default view when no pin is set (Kampala)
const DEFAULT_CENTER: LatLngTuple = [0.3476, 32.5825];
const DEFAULT_ZOOM = 12;
const SELECTED_ZOOM = 15;

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface Props {
  value: LatLngTuple | null;
  onChange: (value: LatLngTuple) => void;
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  initialSearch?: string;
  onAddressFound?: (value: string) => void;
  label?: string;
}

const markerIcon = L.divIcon({
  className: "restaurant-map-marker-icon",
  html: '<span class="restaurant-map-pin" aria-hidden="true"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function MapClickPicker({ onChoose }: { onChoose: (point: LatLngTuple) => void }) {
  useMapEvents({
    click(event) {
      onChoose([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

function FocusSelectedPoint({ value }: { value: LatLngTuple | null }) {
  const map = useMap();
  const latitude = value?.[0];
  const longitude = value?.[1];

  useEffect(() => {
    if (latitude != null && longitude != null) {
      map.flyTo([latitude, longitude], Math.max(map.getZoom(), SELECTED_ZOOM), { duration: 0.55 });
    }
  }, [map, latitude, longitude]);

  return null;
}

export function RestaurantLocationPicker({
  value,
  onChange,
  searchQuery,
  onSearchQueryChange,
  initialSearch = "",
  onAddressFound,
  label = "Find your restaurant",
}: Props) {
  const [localQuery, setLocalQuery] = useState(initialSearch);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const controlled = Boolean(onSearchQueryChange);
  useEffect(() => {
    if (!controlled) setLocalQuery(initialSearch);
  }, [controlled, initialSearch]);
  const query = controlled ? (searchQuery ?? "") : localQuery;
  const setQuery = controlled ? onSearchQueryChange! : setLocalQuery;
  const selectedPoint = value && (value[0] !== 0 || value[1] !== 0) ? value : null;
  const mapCenter: LatLngTuple = selectedPoint ?? DEFAULT_CENTER;

  const findLocation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const search = query.trim();
    if (!search) {
      setMessage("Enter an address, place or landmark to search.");
      setMessageIsError(true);
      return;
    }

    setSearching(true);
    setMessage("");
    try {
      // The public Nominatim endpoint is intentionally queried only on submit (never as autocomplete).
      const delay = Math.max(0, 1100 - (Date.now() - lastGeocoderRequestAt));
      if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay));
      lastGeocoderRequestAt = Date.now();

      const endpoint = new URL(geocoderUrl);
      endpoint.searchParams.set("q", search);
      endpoint.searchParams.set("format", "jsonv2");
      endpoint.searchParams.set("limit", "1");
      // Uncomment to return Ugandan matches only:
      // endpoint.searchParams.set("countrycodes", "ug");
      const response = await fetch(endpoint, {
        credentials: "omit",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Location search returned ${response.status}.`);
      const results = await response.json() as SearchResult[];
      const result = results[0];
      if (!result) throw new Error("No matching place found. Try a nearby street, district or landmark.");

      const latitude = Number(result.lat);
      const longitude = Number(result.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        throw new Error("The location service returned an invalid map point.");
      }
      onChange([latitude, longitude]);
      setQuery(result.display_name || search);
      onAddressFound?.(result.display_name || search);
      setMessage("Place found. Click the map or drag the pin to refine the pickup point.");
      setMessageIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn't find that place. Try again or select it on the map.");
      setMessageIsError(true);
    } finally {
      setSearching(false);
    }
  };

  const handlePinDrag = (event: L.LeafletEvent) => {
    const marker = event.target as L.Marker;
    const point = marker.getLatLng();
    onChange([point.lat, point.lng]);
  };

  return (
    <section className="restaurant-location-picker" aria-label={label}>
      <div className="restaurant-map-picker-heading">
        <div className="restaurant-map-picker-icon"><MapPin size={16} /></div>
        <div>
          <strong>{label}</strong>
          <p>Search an address, then click the map or drag the pin to set the exact pickup point.</p>
        </div>
      </div>

      <form className="restaurant-map-search" onSubmit={findLocation}>
        <label className="sr-only" htmlFor="restaurant-map-search">Address or place to find on the map</label>
        <div className="restaurant-map-search-field">
          <Search size={15} aria-hidden="true" />
          <input
            id="restaurant-map-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Street address, district or landmark"
            autoComplete="street-address"
          />
        </div>
        <button type="submit" className="restaurant-map-search-action" disabled={searching || !query.trim()}>
          {searching ? "Searching…" : "Find on map"}
        </button>
      </form>

      <div className="restaurant-location-map" aria-label="Interactive restaurant map">
        <MapContainer
          center={mapCenter}
          zoom={selectedPoint ? SELECTED_ZOOM : DEFAULT_ZOOM}
          scrollWheelZoom={false}
          className="restaurant-location-map-canvas"
        >
          <BaseMapLayer />
          <MapClickPicker onChoose={onChange} />
          <FocusSelectedPoint value={selectedPoint} />
          {selectedPoint && (
            <Marker position={selectedPoint} icon={markerIcon} draggable eventHandlers={{ dragend: handlePinDrag }} />
          )}
        </MapContainer>
        <div className="restaurant-location-map-hint">Click to place · drag pin to refine</div>
      </div>

      <div className="restaurant-location-feedback" aria-live="polite">
        {selectedPoint
          ? <span className="restaurant-location-coordinates"><MapPin size={13} /> Pin set · {selectedPoint[0].toFixed(6)}, {selectedPoint[1].toFixed(6)}</span>
          : <span className="restaurant-location-unset">Choose a place on the map to continue.</span>}
        {message && <span className={messageIsError ? "restaurant-location-message is-error" : "restaurant-location-message"}>{message}</span>}
      </div>
    </section>
  );
}

