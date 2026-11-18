
"use client";

import dynamic from "next/dynamic";

const MapClient = dynamic(
  () => import("@/components/map/MapClient"),
  {
    ssr: false,
    loading: () => (
      <div className="map-loading">
        Menyiapkan peta...
      </div>
    ),
  }
);

export default function MapClientLoader() {
  return <MapClient />;
}
