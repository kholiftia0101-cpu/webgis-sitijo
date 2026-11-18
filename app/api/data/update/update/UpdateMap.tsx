"use client";

import { useEffect } from "react";
import { GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";

type Row = Record<string, unknown> & { __geometry?: unknown };

function FitBounds({ data }: { data: FeatureCollection | null }) {
  const map = useMap();
  useEffect(() => {
    if (!data?.features?.length) return;
    const layer = L.geoJSON(data);
    const bounds = layer.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 18 });
  }, [data, map]);
  return null;
}

export default function UpdateMap({ rows, selectedId, primaryKey }: { rows: Row[]; selectedId: string | null; primaryKey: string }) {
  const features: Feature[] = rows.flatMap((row) => {
    if (!row.__geometry || typeof row.__geometry !== "object") return [];
    const properties = Object.fromEntries(Object.entries(row).filter(([key]) => key !== "__geometry").map(([key, value]) => [key, value === null || ["string", "number", "boolean"].includes(typeof value) ? value : JSON.stringify(value)])) as Record<string, string | number | boolean | null>;
    return [{ type: "Feature", geometry: row.__geometry as Geometry, properties } as Feature];
  });
  const data: FeatureCollection = { type: "FeatureCollection", features };
  const selected = selectedId ? features.find((feature) => String(feature.properties?.[primaryKey]) === selectedId) : undefined;
  const selectedData: FeatureCollection | null = selected ? { type: "FeatureCollection", features: [selected] } : null;

  return (
    <div className="ud-map-wrap">
      <MapContainer center={[-7.7972, 110.3688]} zoom={13} scrollWheelZoom className="ud-map">
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <GeoJSON data={data} style={{ color: "#1769aa", weight: 3, opacity: 0.75, fillColor: "#3b82f6", fillOpacity: 0.12 }}
          pointToLayer={(_feature, latlng) => L.circleMarker(latlng, { radius: 5, color: "#1769aa", fillColor: "#60a5fa", fillOpacity: 0.85, weight: 1.5 })} />
        {selectedData && <GeoJSON key={selectedId} data={selectedData} style={{ color: "#e11d48", weight: 6, opacity: 1, fillColor: "#fb7185", fillOpacity: 0.3 }}
          pointToLayer={(_feature, latlng) => L.circleMarker(latlng, { radius: 9, color: "#e11d48", fillColor: "#fb7185", fillOpacity: 1, weight: 3 })} />}
        <FitBounds data={selectedData || data} />
      </MapContainer>
      <div className="ud-map-note">Menampilkan geometri pada halaman data aktif. Pilih baris untuk menyorot fitur.</div>
    </div>
  );
}
