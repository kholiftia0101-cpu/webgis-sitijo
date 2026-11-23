"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Group = { id: string; name: string; layers: { id: string; name: string }[] };

const groups: Group[] = [
  { id:"atribut_jalan", name:"Atribut Jalan", layers:[{ id:"cermin_jalan",name:"Cermin Jalan"},{ id:"high_mes_tower",name:"High Mes Tower"}, {id:"kamera_pengawas",name:"Kamera Pengawas"},{id:"lampu_jalan",name:"Lampu Jalan"},{id:"lampu_lalin",name:"Lampu Lalu Lintas"},{id:"rambu_lalin",name:"Rambu Lalu Lintas"}]},
  { id:"bangunan", name:"Bangunan", layers:[{ id:"bangunan",name:"Bangunan"},{ id:"kawasan_kumuh",name:"Kawasan Kumuh"}, { id:"pembangunan_gedung",name:"Pembangunan Gedung"}, {id:"rusunawa",name:"Rusunawa"}]},
  { id:"batas_administrasi1", name:"Batas Administrasi", layers:[{ id:"batas_administrasi_kota",name:"Kota"},{ id:"batas_administrasi_kemantren",name:"Kemantren"}, {id:"batas_administrasi_kelurahan",name:"Kelurahan"},{id:"batas_administrasi_kampung",name:"Kampung"},{id:"batas_administrasi_rw",name:"RW"}]},
  { id:"infrastruktur_pendukung", name:"Infrastruktur Pendukung", layers:[{id:"hidran",name:"Hidran"},{id:"papan_tanah_negara",name:"Papan Tanah Negara"}, {id:"rantai_pasok",name:"Rantai Pasok"},{id:"reklame",name:"Reklame"},{id:"titik_bm",name:"Titik Bench Mark"}]},
  { id:"jaringan_drainase", name:"Jaringan Drainase", layers:[{id:"inlet",name:"Inlet"},{id:"manhole_drainase",name:"Manhole Drainase"},{id:"sumur_resapan",name:"Sumur Resapan"},{id:"zona_drainase",name:"Zona Drainase"},{id:"saluran_air_hujan",name:"Saluran Air Hujan"}]},
  { id:"jaringan_fiber_optik", name:"Jaringan Fiber Optik", layers:[{id:"kabel_fiber_optik",name:"Kabel Fiber Optik"},{id:"manhole_fiber_optik",name:"Manhole Fiber Optik"},{id:"tiang_fiber_optik",name:"Tiang Fiber Optik"}]},
  { id:"jaringan_ipal", name:"Jaringan Instalasi Pengolahan Air Limbah", layers:[{id:"manhole_sal",name:"Manhole Saluran Air Limbah"},{id:"pipa_induk",name:"Pipa Induk"},{id:"pipa_glontor",name:"Pipa Glontor"},{id:"pipa_lateral",name:"Pipa Lateral"}]},
  { id:"jaringan_jalan", name:"Jaringan Jalan", layers:[{id:"jalan_kota",name:"Jalan Kota"},{id:"jalan_lingkungan",name:"Jalan Lingkungan"},{id:"jalan_inspeksi",name:"Jalan Inspeksi"},{id:"jalur_pemandu",name:"Jalur Pemandu"},{id:"jembatan",name:"Jembatan"},{id:"rumija",name:"Rumija"},{id:"trotoar",name:"Trotoar"}]},
  { id:"jaringan_listrik", name:"Jaringan Listrik", layers:[{id:"tegangan_menengah",name:"Jaringan Kabel Listrik Tegangan Menengah"},{id:"tegangan_rendah",name:"Jaringan Kabel Listrik Tegangan Rendah"},{id:"rumah_kabel",name:"Rumah Kabel"},{id:"tiang_listrik",name:"Tiang Listrik"},{id:"trafo_listrik",name:"Trafo Listrik"}]},
  { id:"jaringan_pdam", name:"Jaringan Perusahaan Daerah Air Minum", layers:[{id:"jaringan_pdam",name:"Jaringan Perusahaan Daerah Air Minum"}]},
  { id:"sungai", name:"Sungai", layers:[{id:"sungai",name:"Sungai"},{id:"talud_sungai",name:"Talud Sungai"}]},
];

const baseLayers = [
  {id:"esri",name:"ESRI World Imagery",url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",attribution:"Tiles © Esri"},
  {id:"topo",name:"ESRI World Topographic",url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",attribution:"Tiles © Esri — Source: Esri, USGS, NOAA"},
  {id:"street",name:"ESRI World Street Map",url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",attribution:"Tiles © Esri, HERE, Garmin, OpenStreetMap contributors"},
  {id:"osm",name:"Open Street Map",url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",attribution:"© OpenStreetMap contributors"},
  {id:"ortho",name:"Orthophoto 2023",url:"https://sitijo.wuaze.com/assets/ortho/{z}/{x}/{y}.png",attribution:"© Orthophoto 2023",minZoom:17,maxZoom:20},
];

function CoordinateControl() {
  const [position,setPosition] = useState("Lat: - , Lng: -");
  useMapEvents({mousemove(e){setPosition(`Lat: ${e.latlng.lat.toFixed(6)}, Lng: ${e.latlng.lng.toFixed(6)}`)}});
  return <div className="coords-info">{position}</div>;
}
function MapExtras({ onReady }: {onReady:(map:L.Map)=>void}) {
  const map=useMap();
  useEffect(()=>{onReady(map);return ()=>{onReady(null as unknown as L.Map)}},[map,onReady]);
  return <CoordinateControl/>;
}
function escapeHtml(value: unknown) {
  return String(value ?? "-").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c] || c));
}

export default function MapClient() {
  const [sidebarOpen,setSidebarOpen]=useState(true);
  const [expanded,setExpanded]=useState<string[]>([]);
  const [checked,setChecked]=useState<string[]>([]);
  const [baseId,setBaseId]=useState("esri");
  const [basemapOpen,setBasemapOpen]=useState(false);
  const [kemantren,setKemantren]=useState("");
  const [kelurahan,setKelurahan]=useState("");
  const [roadEnabled,setRoadEnabled]=useState(false);
  const [roadSearch,setRoadSearch]=useState("");
  // Data nama jalan diambil dari cache layer Jalan Kota yang sama.
  const [roadFeatures, setRoadFeatures] = useState<GeoJSON.Feature[]>([]);
  const [loading,setLoading]=useState(true);
  const [loadingLayers,setLoadingLayers]=useState<string[]>([]);
  const [boundaryData,setBoundaryData]=useState<GeoJSON.FeatureCollection|null>(null);
  const [boundaryError,setBoundaryError]=useState("");
  const [map,setMap]=useState<L.Map|null>(null);
  const boundaryLayer=useRef<L.GeoJSON|null>(null);
  const activeLayerRef = useRef<Record<string, L.Layer>>({});
  // Cache data GeoJSON
  const dataCacheRef = useRef<Record<string, GeoJSON.FeatureCollection>>({});
  // Menyimpan request yang sedang berjalan
  const pendingRequestsRef = useRef<Record<string, Promise<GeoJSON.FeatureCollection>>>({});
  // Menyimpan status checkbox terbaru
  const checkedRef = useRef<string[]>([]);
    const selectedBase=useMemo(()=>baseLayers.find(x=>x.id===baseId)!,[baseId]);


    const wilayah = useMemo(() => {
      const result: Record<string, string[]> = {};
    
      for (const f of boundaryData?.features ?? []) {
        const p = (f.properties || {}) as Record<string, string>;
        const kem = p.kemantren;
        const kel = p.kelurahan;
    
        if (kem && kel) {
          result[kem] ||= [];
          if (!result[kem].includes(kel)) {
            result[kem].push(kel);
          }
        }
      }
    
      return result;
    }, [boundaryData]);
    
    // Mengambil data batas administrasi
    useEffect(() => {
      let alive = true;
    
      fetch("/api/gis/batas-administrasi", { cache: "no-store" })
        .then(async r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then(data => {
          if (alive) setBoundaryData(data);
        })
        .catch(e => {
          if (alive) {
            setBoundaryError(`Batas administrasi belum terhubung (${e.message}).`);
          }
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    
      return () => {
        alive = false;
      };
    }, []);
    
    // Mengatur batas administrasi, filter wilayah, dan popup
    useEffect(() => {
      if (!map || !boundaryData) return;
    
      const features = boundaryData.features.filter(f => {
        const p = (f.properties || {}) as Record<string, string>;
    
        return (
          (!kemantren || p.kemantren === kemantren) &&
          (!kelurahan || p.kelurahan === kelurahan)
        );
      });
    
      // Hapus layer batas sebelumnya
      boundaryLayer.current?.remove();
    
      // Jika filter tidak menghasilkan data, jangan tampilkan layer kosong
      if (!features.length) {
        boundaryLayer.current = null;
        return;
      }
    
      const layer = L.geoJSON(
        {
          type: "FeatureCollection",
          features
        } as GeoJSON.FeatureCollection,
        {
          // Style batas kelurahan
          style: () => ({
            color: "#fa2b66",
            weight: 2.5,
            opacity: 1,
            dashArray: "12",
            fillOpacity: 0
          }),
    
          // Popup informasi batas administrasi
          onEachFeature: (feature, featureLayer) => {
            const p = (feature.properties || {}) as Record<string, unknown>;
    
            const rows = [
              ["Kemantren", p.kecamatan],
              ["Kelurahan", p.kelurahan],
              ["Luas Area", p.luas_ha ? `${p.luas_ha} ha` : null]
            ];
    
            featureLayer.bindPopup(
              `<table class="sitijo-popup">
                ${rows.map(([k, v]) =>
                  `<tr><td><b>${escapeHtml(k)}</b></td><td>: ${escapeHtml(v)}</td></tr>`
                ).join("")}
              </table>`
            );
          }
        }
      ).addTo(map);
    
      boundaryLayer.current = layer;
    
      // Zoom otomatis ketika filter wilayah digunakan
      if (kemantren || kelurahan) {
        try {
          map.fitBounds(layer.getBounds(), {
            padding: [30, 30]
          });
        } catch {}
      }
    
      return () => {
        layer.remove();
      };
    
    }, [map, boundaryData, kemantren, kelurahan]);
    
    // Mengatur visibilitas layer infrastruktur
    useEffect(() => {
      if (!map) return;
    
      const layers = activeLayerRef.current;
    
      for (const id of Object.keys(layers)) {
        if (checked.includes(id)) {
          if (!map.hasLayer(layers[id])) {
            map.addLayer(layers[id]);
          }
        } else if (map.hasLayer(layers[id])) {
          map.removeLayer(layers[id]);
        }
      }
    }, [map, checked]);

  // Daftar nama jalan hanya berasal dari layer Jalan Kota.
  const roadNames = useMemo(() => {
    return Array.from(
      new Set(
        roadFeatures
          .map(feature => String(feature.properties?.nama_jalan || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "id"));
  }, [roadFeatures]);

  // Label dan highlight dipasang langsung pada geometri layer Jalan Kota,
  // bukan membuat GeoJSON layer baru.
  useEffect(() => {
    if (!map) return;

    const roadLayer = activeLayerRef.current["jalan_kota"] as L.GeoJSON | undefined;
    if (!roadLayer) return;

    const roadLayerIsActive =
      checked.includes("jalan_kota") && map.hasLayer(roadLayer);
    const showLabels = roadEnabled && roadLayerIsActive;
    const searchText = roadSearch.trim().toLocaleLowerCase("id");
    const matchedLayers: L.Layer[] = [];

    roadLayer.eachLayer((child: L.Layer) => {
      const roadFeatureLayer = child as L.Layer & {
        feature?: GeoJSON.Feature;
        bindTooltip?: (content: string, options?: L.TooltipOptions) => L.Layer;
        unbindTooltip?: () => L.Layer;
        setStyle?: (style: L.PathOptions) => L.Layer;
      };
      const feature = roadFeatureLayer.feature;
      const properties = (feature?.properties || {}) as Record<string, unknown>;
      const name = String(properties.nama_jalan || "").trim();
      const featureStyle = (feature as (GeoJSON.Feature & { style?: L.PathOptions }) | undefined)?.style;
      const baseStyle = (properties.style as L.PathOptions | undefined) || featureStyle || {
        color: "#f39c12", weight: 3, opacity: 1,
      };

      if (showLabels && name && typeof roadFeatureLayer.bindTooltip === "function") {
        roadFeatureLayer.unbindTooltip?.();
        roadFeatureLayer.bindTooltip(name, {
          permanent: true, direction: "center",
          className: "sitijo-road-label", opacity: 0.95,
        });
      } else if (typeof roadFeatureLayer.unbindTooltip === "function") {
        roadFeatureLayer.unbindTooltip();
      }

      const isMatch = showLabels && !!searchText &&
        name.toLocaleLowerCase("id") === searchText;

      if (isMatch) {
        matchedLayers.push(roadFeatureLayer);
        if (typeof roadFeatureLayer.setStyle === "function") {
          roadFeatureLayer.setStyle({
            color: "#ff1744", weight: 7, opacity: 1,
            fillColor: "#ff1744", fillOpacity: 0.25,
          });
        }
      } else if (typeof roadFeatureLayer.setStyle === "function") {
        roadFeatureLayer.setStyle(baseStyle as L.PathOptions);
      }
    });

    if (showLabels && searchText && matchedLayers.length > 0) {
      const bounds = L.featureGroup(matchedLayers).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 19, animate: true });
      }
    }
  }, [map, checked, roadEnabled, roadSearch, roadFeatures]);

  const toggleLayer = async (id: string, on: boolean) => {
    // Perbarui status checkbox secara langsung
    const nextChecked = on
      ? [...checkedRef.current.filter(x => x !== id), id]
      : checkedRef.current.filter(x => x !== id);

    checkedRef.current = nextChecked;
    setChecked(nextChecked);

    // Jika dimatikan, cukup hapus dari peta.
    // Instance dan data tetap disimpan di cache.
    if (!on) {
      const existingLayer = activeLayerRef.current[id];

      if (map && existingLayer && map.hasLayer(existingLayer)) {
        map.removeLayer(existingLayer);
      }
      return;
    }

    // Jika layer sudah pernah dibuat, gunakan kembali.
    const existingLayer = activeLayerRef.current[id];

    if (existingLayer) {
      if (map && !map.hasLayer(existingLayer)) {
        existingLayer.addTo(map);
      }
      return;
    }
    // Tampilkan indikator loading.
    setLoadingLayers(old =>
      old.includes(id) ? old : [...old, id]
    );

    try {
      let data = dataCacheRef.current[id];

      // Ambil data hanya jika belum ada di cache.
      if (!data) {
        if (!pendingRequestsRef.current[id]) {
          pendingRequestsRef.current[id] = fetch(
            `/api/gis/utilitas?layer=${encodeURIComponent(id)}`,
            { cache: "no-store" }
          ).then(async response => {
            if (!response.ok) {
              const error = await response.json().catch(() => ({}));
              throw new Error(error.detail || error.error || `HTTP ${response.status}`);
            }

            return response.json();
          });
        }

        data = await pendingRequestsRef.current[id];

        // Simpan data GeoJSON.
        dataCacheRef.current[id] = data;
      }

      // Gunakan data Jalan Kota yang sama untuk autocomplete; tidak ada fetch kedua.
      if (id === "jalan_kota") {
        setRoadFeatures(data.features || []);
      }

      // Jangan membuat layer baru jika sudah dibuat
      // oleh request lain yang berjalan bersamaan.
      if (activeLayerRef.current[id]) {
        const existing = activeLayerRef.current[id];

        if (
          map &&
          checkedRef.current.includes(id) &&
          !map.hasLayer(existing)
        ) {
          existing.addTo(map);
        }

        return;
      }

      if (!data?.features) {
        throw new Error("Format GeoJSON tidak memiliki features.");
      }

      // Buat satu instance Leaflet untuk layer ini.
      const geo = L.geoJSON(data, {
        style: (feature) => {
          const properties = (feature?.properties || {}) as Record<string, unknown>;
          const featureStyle = (feature as (GeoJSON.Feature & { style?: L.PathOptions }) | undefined)?.style;
          return (properties.style as L.PathOptions | undefined) ||
            featureStyle ||
            { color: "#555", weight: 2 };
        },

        pointToLayer: (feature, latlng) => {
          const properties = (feature.properties || {}) as Record<string, unknown>;
          const featureStyle = (feature as GeoJSON.Feature & { style?: Record<string, unknown> }).style;
          const st = (properties.style as Record<string, unknown> | undefined) || featureStyle;

          if (st?.marker) {
            return L.marker(latlng, {
              icon: L.icon({
                iconUrl: String(st.marker),
                iconSize: (st.size as [number, number] | undefined) || [24, 24],
              }),
            });
          }

          return L.circleMarker(latlng, {
            radius: 5,
            color: String(st?.color || "#444"),
          });
        },

        onEachFeature: (feature, layer) => {
          const props = feature.properties || {};

          const rows = Object.entries(props)
            .filter(([key]) => key !== "style")
            .map(([key, value]) =>
              `<tr><td><b>${escapeHtml(key)}</b></td><td>: ${escapeHtml(value)}</td></tr>`
            )
            .join("");

          layer.bindPopup(
            `<table class="sitijo-popup">${rows}</table>`
          );
        },
      });

      // Simpan instance agar tidak dibuat ulang.
      activeLayerRef.current[id] = geo;

      // Tambahkan hanya jika checkbox masih aktif.
      if (map && checkedRef.current.includes(id)) {
        geo.addTo(map);
      }

    } catch (error) {
      console.error(`Layer ${id} gagal dimuat:`, error);

      // Batalkan status checkbox jika gagal.
      checkedRef.current = checkedRef.current.filter(x => x !== id);
      setChecked(checkedRef.current);

    } finally {
      delete pendingRequestsRef.current[id];

      setLoadingLayers(old => old.filter(x => x !== id));
    }
  };


  const fitAll=()=>{
    if(!map)return;
    const bounds=L.latLngBounds([]);
    let count=0;
    map.eachLayer(layer=>{
      try {
        if (layer instanceof L.FeatureGroup) {
          const layerBounds = layer.getBounds();
          if (layerBounds.isValid()) {
            bounds.extend(layerBounds);
            count++;
          }
        } else if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
          bounds.extend(layer.getLatLng());
          count++;
        }
      } catch {}
    });
    if(bounds.isValid() && count)map.fitBounds(bounds,{padding:[20,20]});
    else window.alert("Tidak ada data untuk ditampilkan.");
  };
  const locate=()=>{if(!map)return;if(!navigator.geolocation){window.alert("Browser tidak mendukung lokasi.");return}navigator.geolocation.getCurrentPosition(pos=>map.setView([pos.coords.latitude,pos.coords.longitude],17),()=>window.alert("Lokasi tidak dapat diakses."))};

  const getLegendSwatch = (id: string) => {
  const feature = dataCacheRef.current[id]?.features?.[0];

  const style = (feature?.properties as Record<string, unknown> | undefined)
    ?.style as Record<string, unknown> | undefined;

  if (!style) {
    return (
      <span className="legend-swatch" />
    );
  }

  const isPoint = style.radius !== undefined;
  const hasFill = style.fillColor !== undefined;

  if (isPoint) {
    return (
      <span
        className="legend-swatch-point"
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: String(style.fillColor || style.color || "#555"),
          border: `${Number(style.weight || 1)}px solid ${String(style.color || "#555")}`,
          opacity: Number(style.fillOpacity ?? style.opacity ?? 1),
        }}
      />
    );
  }

  if (hasFill) {
    return (
      <span
        className="legend-swatch-polygon"
        style={{
          backgroundColor: String(style.fillColor),
          border: `${Number(style.weight || 1)}px solid ${String(style.color || "#555")}`,
          opacity: Number(style.fillOpacity ?? 1),
        }}
      />
    );
  }

  return (
    <span
      className="legend-swatch-line"
      style={{
        borderTop: `${Number(style.weight || 2)}px ${
          style.dashArray ? "dashed" : "solid"
        } ${String(style.color || "#555")}`,
        opacity: Number(style.opacity ?? 1),
      }}
    />
  );
};
  return <div className="sitijo-map-shell">
    <style>{`
      .sitijo-road-label {
        background: rgba(255,255,255,.92); border: 1px solid #f39c12;
        border-radius: 4px; color: #17365d; font-size: 10px;
        font-weight: 700; padding: 2px 5px;
        box-shadow: 0 1px 4px rgba(0,0,0,.25); white-space: nowrap;
      }
      .sitijo-road-label::before { display: none; }
    `}</style>
    {loading&&<div className="sitijo-loading-overlay"><div className="loading-box"><div className="loader"/><h2>Sedang memuat peta...</h2><p>Menyiapkan data peta, mohon tunggu sebentar.</p></div></div>}
    <style>{`
      .sitijo-modern-toolbar{position:absolute;z-index:1000;left:14px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:7px;padding:7px;background:rgba(255,255,255,.92);border:1px solid rgba(226,232,240,.8);border-radius:18px;box-shadow:0 8px 28px rgba(15,35,70,.12);backdrop-filter:blur(14px)}
      .sitijo-modern-toolbar button{width:42px;height:42px;border:0;background:transparent;border-radius:13px;color:#64748b;display:grid;place-items:center;cursor:pointer;transition:.18s}
      .sitijo-modern-toolbar button:hover,.sitijo-modern-toolbar button.active{background:#eaf3ff;color:#1479f8}
      .sitijo-modern-toolbar svg{width:21px;height:21px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .sitijo-modern-panel{position:absolute;z-index:999;left:72px;top:16px;bottom:16px;width:350px;max-width:calc(100vw - 90px);border-radius:20px;background:rgba(255,255,255,.95);border:1px solid rgba(255,255,255,.8);box-shadow:0 12px 40px rgba(16,35,65,.16);backdrop-filter:blur(18px);overflow:hidden;display:flex;flex-direction:column;color:#18365f}
      .sitijo-modern-head{display:flex;align-items:center;justify-content:space-between;padding:17px 18px;border-bottom:1px solid #edf1f6;font-weight:700;font-size:15px}
      .sitijo-modern-head button{border:0;background:#f1f6ff;color:#2675dd;border-radius:10px;width:32px;height:32px;cursor:pointer}
      .sitijo-modern-body{padding:14px 16px 20px;overflow:auto}
      .sitijo-modern-section{margin-bottom:17px}
      .sitijo-modern-label{font-size:10px;font-weight:800;letter-spacing:.09em;color:#8b9bb1;margin:0 0 9px}
      .sitijo-modern-panel select,.sitijo-modern-panel input[list]{width:100%;height:38px;border:1px solid #e2eaf3;background:#f8fafc;border-radius:11px;padding:0 11px;color:#344963;outline:none;margin-bottom:7px;font-size:12px}
      .sitijo-modern-panel .sitijo-road-toggle{display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:8px}
      .sitijo-modern-panel h5{font-size:12px;color:#64748b;margin:8px 0}
      .sitijo-modern-tree>div{border-bottom:1px solid #f0f3f7}
      .sitijo-modern-class{width:100%;display:flex;align-items:center;gap:9px;padding:11px 7px;border:0;background:transparent;color:#334b68;font-size:12px;font-weight:650;text-align:left;cursor:pointer}
      .sitijo-modern-class:hover{background:#f7faff;border-radius:10px}
      .sitijo-modern-count{margin-left:auto;background:#eef5ff;color:#3478d4;border-radius:20px;padding:3px 8px;font-size:10px}
      .sitijo-modern-sub{padding:2px 8px 9px 16px;background:#f8fafc;border-radius:12px;margin-bottom:7px}
      .sitijo-modern-sub label{display:flex;align-items:center;gap:9px;padding:7px 3px;font-size:12px;color:#475569}
      .sitijo-modern-sub input{accent-color:#1685f5}
      .sitijo-basemap-pop{position:absolute;z-index:1000;right:42px;top:16px;width:300px;padding:12px;background:rgba(255,255,255,.96);border:1px solid #e8eef6;border-radius:18px;box-shadow:0 12px 35px rgba(15,35,70,.18);backdrop-filter:blur(16px)}
      .sitijo-basemap-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}
      .sitijo-basemap-card{border:1px solid #e5ebf3;background:#fff;border-radius:12px;padding:7px;text-align:left;cursor:pointer;color:#344963;font-size:11px;transition:.18s}
      .sitijo-basemap-card:hover{transform:translateY(-2px);border-color:#93c5fd}
      .sitijo-basemap-card.selected{border:2px solid #1685f5;background:#f3f8ff}
      .sitijo-basemap-preview{height:65px;border-radius:8px;margin-bottom:6px;background-size:cover;background-position:center}
      .sitijo-basemap-trigger{width:48px;height:48px;border:1px solid #dbe7f5;border-radius:15px;background:#fff;color:#1479f8;box-shadow:0 6px 20px rgba(20,60,100,.13);cursor:pointer;display:grid;place-items:center}
      .sitijo-basemap-trigger svg{width:23px;height:23px}
      .sitijo-map-controls{display:flex!important;flex-direction:column!important;align-items:flex-end!important;gap:10px!important;margin:12px 12px 0 0!important}
      .sitijo-map-controls .leaflet-control{float:none!important;margin:0!important}
      .sitijo-modern-control{display:flex!important;flex-direction:column!important;gap:7px!important;padding:6px!important;background:rgba(255,255,255,.94)!important;border:1px solid #dce8f8!important;border-radius:17px!important;box-shadow:0 8px 24px rgba(20,70,130,.13)!important;backdrop-filter:blur(12px)}
      .sitijo-modern-control button{width:44px!important;height:44px!important;display:grid!important;place-items:center!important;padding:0!important;margin:0!important;border-radius:13px!important;background:#fff!important;border:1px solid #e2edfc!important;color:#1685f5!important;box-shadow:none!important;font-size:0!important;cursor:pointer!important;transition:background .16s,border-color .16s,transform .16s!important}
      .sitijo-modern-control button:hover{color:#1685f5!important;background:#eaf3ff!important;border-color:#b8d7ff!important;transform:translateY(-1px)}
      .sitijo-modern-control button svg{width:22px!important;height:22px!important;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
      .sitijo-modern-control .sitijo-compass svg{width:26px!important;height:26px!important}
      .sitijo-control-dock{display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px;background:rgba(255,255,255,.95);border:1px solid #dce8f8;border-radius:11px;box-shadow:0 5px 16px rgba(20,70,130,.13);backdrop-filter:blur(10px)}
      .sitijo-control-dock .sitijo-modern-control{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;gap:3px!important;border-radius:0!important}
      .sitijo-control-dock .sitijo-modern-control button,.sitijo-control-dock .sitijo-basemap-trigger{width:32px!important;height:32px!important;min-width:32px!important;border-radius:9px!important;border:1px solid #e2edfc!important;background:#fff!important;color:#1685f5!important}
      .sitijo-control-dock button svg{width:16px!important;height:16px!important}
      .sitijo-control-dock .sitijo-modern-control .sitijo-compass svg{width:18px!important;height:18px!important}
      .sitijo-control-dock .sitijo-basemap-trigger{display:grid!important;place-items:center!important;padding:0!important;cursor:pointer;transition:.16s!important}
      .sitijo-control-dock .sitijo-basemap-trigger svg{width:16px!important;height:16px!important}
      .sitijo-control-dock:after{content:"";width:14px;height:1px;background:#e7effa;margin:1px 0}
      .sitijo-basemap-trigger:hover{background:#eaf3ff!important;border-color:#b8d7ff!important}
      .sitijo-map-controls{gap:0!important;margin:8px 8px 0 0!important}
      .sitijo-control-dock button:hover{background:#eaf3ff!important;border-color:#b8d7ff!important}
      @media(max-width:600px){.sitijo-modern-panel{left:66px;width:calc(100vw - 82px);top:10px;bottom:10px}.sitijo-basemap-pop{right:66px;width:min(280px,calc(100vw - 80px))}}
    `}</style>
    <div className="sitijo-modern-toolbar">
      <button className={sidebarOpen?"active":""} title="Layer" onClick={()=>setSidebarOpen(v=>!v)}><svg viewBox="0 0 24 24"><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="m3 12 9 4 9-4M3 17l9 4 9-4"/></svg></button>
      <button title="Update Data"><svg viewBox="0 0 24 24"><path d="M20 7v5h-5"/><path d="M4 17a8 8 0 0 0 13-5M4 7v5h5"/><path d="M20 17A8 8 0 0 0 7 5"/></svg></button>
      <button title="Tambah Data"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg></button>
      <button title="Unduhan"><svg viewBox="0 0 24 24"><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 17v3h16v-3"/></svg></button>
    </div>
    {sidebarOpen&&<aside className="sitijo-modern-panel">
      <div className="sitijo-modern-head"><span>✦ Pengaturan Peta</span><button title="Tutup panel" onClick={()=>setSidebarOpen(false)}>×</button></div>
      <div className="sitijo-modern-body">
        <div className="sitijo-modern-section">
          <p className="sitijo-modern-label">FILTER WILAYAH</p>
          <select value={kemantren} onChange={e=>{setKemantren(e.target.value);setKelurahan("")}}>
            <option value="">Pilih Kemantren...</option>{Object.keys(wilayah).sort().map(k=><option key={k} value={k}>{k}</option>)}
          </select>
          <select value={kelurahan} disabled={!kemantren} onChange={e=>setKelurahan(e.target.value)}>
            <option value="">Pilih Kelurahan...</option>{(wilayah[kemantren]||[]).sort().map(k=><option key={k} value={k}>{k}</option>)}
          </select>
          {boundaryError&&<small className="sitijo-error">{boundaryError}</small>}
        </div>
        <div className="sitijo-modern-section">
          <p className="sitijo-modern-label">LAYER INFRASTRUKTUR</p>
          <label className="sitijo-road-toggle"><input type="checkbox" checked={roadEnabled} onChange={e=>{setRoadEnabled(e.target.checked);if(!e.target.checked)setRoadSearch("")}}/> Aktifkan fitur jalan</label>
          <input list="sitijo-road-list" value={roadSearch} disabled={!roadEnabled||!checked.includes("jalan_kota")||roadNames.length===0} onChange={e=>setRoadSearch(e.target.value)} placeholder={!roadEnabled?"Aktifkan fitur jalan...":!checked.includes("jalan_kota")?"Aktifkan layer Jalan Kota...":"Cari nama jalan..."}/>
          <datalist id="sitijo-road-list">{roadNames.map((name,index)=><option key={`${name}-${index}`} value={name}/>)}</datalist>
          {roadEnabled&&!checked.includes("jalan_kota")&&<small className="sitijo-error">Aktifkan layer Jalan Kota terlebih dahulu.</small>}
          <div className="sitijo-modern-tree">{groups.map(g=><div key={g.id}>
            <button className="sitijo-modern-class" onClick={()=>setExpanded(v=>v.includes(g.id)?v.filter(x=>x!==g.id):[...v,g.id])}>
              <span>{expanded.includes(g.id)?"⌄":"›"}</span>{g.name}<span className="sitijo-modern-count">{g.layers.filter(l=>checked.includes(l.id)).length||g.layers.length}</span>
            </button>
            {expanded.includes(g.id)&&<div className="sitijo-modern-sub">{g.layers.map(l=><label key={l.id}><input type="checkbox" checked={checked.includes(l.id)} onChange={e=>toggleLayer(l.id,e.target.checked)}/>{l.name}</label>)}</div>}
          </div>)}</div>
        </div>
      </div>
    </aside>}
    <div className="sitijo-layer-loading" style={{display:loadingLayers.length?"block":"none"}}>
      <div className="loading-header"><div className="loading-spinner"/><div><div className="loading-title">Sedang memuat</div><div className="loading-layer">{loadingLayers.join(", ")}</div></div></div>
      <div className="loading-progress"><div className="loading-progress-bar"/></div><div className="loading-count">{loadingLayers.length} layer sedang diproses</div>
    </div>
    <MapContainer center={[-7.7972,110.3688]} zoom={15} minZoom={10} maxZoom={21} zoomControl={false} style={{height:"100%",width:"100%"}}>
      <TileLayer key={selectedBase.id} attribution={selectedBase.attribution} url={selectedBase.url} minZoom={selectedBase.minZoom??0} maxZoom={selectedBase.maxZoom??21} errorTileUrl={selectedBase.id==="ortho"?"/assets/blank.jpg":undefined}/>
      <MapExtras onReady={setMap}/>
      <MapControls onFit={fitAll} onLocate={locate} baseId={baseId} onBaseChange={setBaseId} basemapOpen={basemapOpen} onBasemapToggle={()=>setBasemapOpen(v=>!v)}/>
    </MapContainer>
    <div className="sitijo-status">{checked.length} layer dipilih</div>
    <div className="sitijo-legend">
  <strong>Legenda</strong>

  <div className="legend-content">
    {checked.length ? (
      checked.map(id => (
        <div key={id}>
          {getLegendSwatch(id)}
          {groups.flatMap(g => g.layers).find(x => x.id === id)?.name || id}
        </div>
      ))
    ) : (
      <i>Tidak ada layer aktif</i>
    )}

    <div>
      <span
        className="legend-swatch-line"
        style={{
          borderTop: "2.5px dashed #fa2b66",
        }}
      />
      Batas Kelurahan
    </div>
  </div>
</div>
  </div>;
}

function MapControls({onFit,onLocate,baseId,onBaseChange,basemapOpen,onBasemapToggle}:{onFit:()=>void;onLocate:()=>void;baseId:string;onBaseChange:(v:string)=>void;basemapOpen:boolean;onBasemapToggle:()=>void}) {
  const map=useMap();
  const previews:Record<string,string> = {
    esri:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/10/510/510",
    topo:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/10/510/510",
    street:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/10/510/510",
    osm:"https://tile.openstreetmap.org/10/510/510",
    ortho:"https://sitijo.wuaze.com/assets/ortho/17/65432/65432.png"
  };
  return <>
    <div className="leaflet-top leaflet-right sitijo-map-controls">
      <div className="leaflet-control sitijo-control-dock">
        <button className="sitijo-basemap-trigger" title="Pilih basemap" aria-label="Pilih basemap" onClick={onBasemapToggle}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="m3 12 9 4 9-4M3 17l9 4 9-4"/></svg></button>
        <div className="leaflet-control sitijo-modern-control">
        <button title="Arah Utara" className="sitijo-compass" aria-label="Arah Utara"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" stroke="#bfdbfe" strokeWidth="1.5"/><path d="M20 5 26 22 20 19 14 22Z" fill="#1685f5" stroke="#1685f5"/><path d="M20 35 14 18 20 21 26 18Z" fill="#60a5fa" stroke="#60a5fa"/><circle cx="20" cy="20" r="2.4" fill="#fff" stroke="#1685f5"/></svg></button>
        <button title="Perbesar seluruh layer" aria-label="Perbesar seluruh layer" onClick={onFit}><svg viewBox="0 0 24 24"><path d="m4 8 4-4M4 4h4M4 4v4M20 8l-4-4M20 4h-4M20 4v4M4 16l4 4M4 20h4M4 20v-4M20 16l-4 4M20 20h-4M20 20v-4"/><path d="M8 10h8v4H8z"/></svg></button>
        <button title="Fullscreen" aria-label="Fullscreen" onClick={()=>{const el=map.getContainer();if(!document.fullscreenElement){el.requestFullscreen?.()}else{document.exitFullscreen?.()}}}><svg viewBox="0 0 24 24"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/></svg></button>
        <button title="Lokasi saya" aria-label="Lokasi saya" onClick={onLocate}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg></button>
        <button title="Zoom in" aria-label="Zoom in" onClick={()=>map.zoomIn()}><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
        <button title="Zoom out" aria-label="Zoom out" onClick={()=>map.zoomOut()}><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>
        </div>
      </div>
    </div>
    {basemapOpen&&<div className="sitijo-basemap-pop">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9,fontSize:13,fontWeight:700,color:"#294563"}}><span>Basemap</span><button onClick={onBasemapToggle} style={{border:0,background:"#f1f5f9",borderRadius:8,width:25,height:25,cursor:"pointer"}}>×</button></div>
      <div className="sitijo-basemap-grid">{baseLayers.map(layer=><button key={layer.id} className={`sitijo-basemap-card ${baseId===layer.id?"selected":""}`} onClick={()=>{onBaseChange(layer.id);onBasemapToggle()}}>
        <div className="sitijo-basemap-preview" style={{backgroundImage:`url(${previews[layer.id]})`}}/>
        {layer.name.replace("ESRI World ","ESRI ")}
      </button>)}</div>
    </div>}
  </>;
}
