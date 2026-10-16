import { useEffect } from "react";
import L from "leaflet";
import { TileLayer, useMap } from "react-leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "@maplibre/maplibre-gl-leaflet";

maplibregl.setWorkerUrl(workerUrl);
(window as any).maplibregl = { ...maplibregl };

// If the worker still fails to load, apply the explicit worker URL fix here
// (see the previous message), e.g. maplibregl.setWorkerUrl(workerUrl).

export const mapStyleUrl = (import.meta.env.VITE_MAP_STYLE_URL ?? "").trim()
  || "https://tiles.openfreemap.org/styles/liberty";

// Optional raster override. If set, it is used instead of the vector style.
export const rasterTileUrl = (import.meta.env.VITE_MAP_TILE_URL ?? "").trim();

export const mapAttribution = import.meta.env.VITE_MAP_ATTRIBUTION?.trim()
  || '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> &copy; OpenMapTiles Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

function VectorLayer({ style, attribution }: { style: string; attribution: string }) {
  const map = useMap();

  useEffect(() => {
    const layer = (L as any).maplibreGL({ style, attribution });
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, style, attribution]);

  return null;
}

export function BaseMapLayer() {
  return rasterTileUrl
    ? <TileLayer url={rasterTileUrl} attribution={mapAttribution} maxZoom={19} />
    : <VectorLayer style={mapStyleUrl} attribution={mapAttribution} />;
}
