import { useEffect, useState } from "react";
import L, { type LatLngTuple } from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BaseMapLayer } from "@/components/maps/BaseMapLayer";

const routingBase = (import.meta.env.VITE_OSRM_BASE_URL ?? "").trim().replace(/\/+$/, "");
// The base map now has a built-in default style, so only routing needs configuring.
const configured = Boolean(routingBase);

type RouteState = "unconfigured" | "loading" | "ready" | "fallback";

interface Props {
  origin: LatLngTuple;
  destination: LatLngTuple;
}

interface OsrmResponse {
  code?: string;
  routes?: Array<{
    geometry?: {
      type?: string;
      coordinates?: Array<[number, number]>;
    };
  }>;
}

function FitRouteBounds({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions), { padding: [28, 28], maxZoom: 15 });
    }
  }, [map, positions]);
  return null;
}

export function OrderRouteMap({ origin, destination }: Props) {
  const [routePoints, setRoutePoints] = useState<LatLngTuple[]>([origin, destination]);
  const [routeState, setRouteState] = useState<RouteState>(configured ? "loading" : "unconfigured");
  const [originLat, originLng] = origin;
  const [destinationLat, destinationLng] = destination;
  const center: LatLngTuple = [
    (originLat + destinationLat) / 2,
    (originLng + destinationLng) / 2,
  ];

  useEffect(() => {
    if (!configured) {
      setRoutePoints([[originLat, originLng], [destinationLat, destinationLng]]);
      setRouteState("unconfigured");
      return;
    }

    const controller = new AbortController();
    setRoutePoints([[originLat, originLng], [destinationLat, destinationLng]]);
    setRouteState("loading");

    const loadRoute = async () => {
      try {
        const coordinates = `${originLng},${originLat};${destinationLng},${destinationLat}`;
        const url = `${routingBase}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
        const response = await fetch(url, {
          signal: controller.signal,
          credentials: "omit",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`Routing service returned ${response.status}`);
        const result = await response.json() as OsrmResponse;
        const coordinatesList = result.code === "Ok" ? result.routes?.[0]?.geometry?.coordinates : undefined;
        if (!coordinatesList || coordinatesList.length < 2) throw new Error("No road route found");

        const points = coordinatesList.map(([longitude, latitude]) => [latitude, longitude] as LatLngTuple);
        if (points.some(([latitude, longitude]) => !Number.isFinite(latitude) || !Number.isFinite(longitude))) {
          throw new Error("Routing service returned invalid coordinates");
        }
        setRoutePoints(points);
        setRouteState("ready");
      } catch {
        if (controller.signal.aborted) return;
        setRoutePoints([[originLat, originLng], [destinationLat, destinationLng]]);
        setRouteState("fallback");
      }
    };

    void loadRoute();
    return () => controller.abort();
  }, [originLat, originLng, destinationLat, destinationLng]);

  if (!configured) {
    return (
      <div className="order-route-map-placeholder" role="status">
        <strong>Map service needs setup</strong>
        <span>Configure <code>VITE_OSRM_BASE_URL</code> to show the private road route.</span>
      </div>
    );
  }

  return (
    <div className="order-route-map">
      <MapContainer
        center={center}
        zoom={11}
        scrollWheelZoom={false}
        className="order-route-map-canvas"
      >
        <BaseMapLayer />
        <FitRouteBounds positions={routePoints} />
        <Polyline
          positions={routePoints}
          pathOptions={{ color: "#FF6B00", weight: 5, opacity: 0.9, lineCap: "round", lineJoin: "round" }}
        />
        <CircleMarker
          center={origin}
          radius={9}
          pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#3B1F6B", fillOpacity: 1 }}
        >
          <Tooltip direction="top" offset={[0, -7]} permanent>Restaurant</Tooltip>
        </CircleMarker>
        <CircleMarker
          center={destination}
          radius={9}
          pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#B84A00", fillOpacity: 1 }}
        >
          <Tooltip direction="top" offset={[0, -7]} permanent>Customer</Tooltip>
        </CircleMarker>
      </MapContainer>
      <div className={`order-route-map-status is-${routeState}`} role="status" aria-live="polite">
        {routeState === "loading" && "Calculating driving route…"}
        {routeState === "ready" && "Driving route"}
        {routeState === "fallback" && "Road route unavailable; showing a direct line."}
      </div>
    </div>
  );
}
