"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Group = { id: string; name: string; layers: { id: string; name: string }[] };

const groups: Group[] = [
  { id:"atribut_jalan", name:"Atribut Jalan", layers:[
  { id:"cermin_jalan",name:"Cermin Jalan"},{id:"kamera_pengawas",name:"Kamera Pengawas"},{id:"lampu_jalan",name:"Lampu Jalan"},{id:"lampu_lalin",name:"Lampu Lalu Lintas"},{id:"rambu_lalin",name:"Rambu Lalu Lintas"}]},
  { id:"bangunan", name:"Bangunan", layers:[{id:"bangunan",name:"Bangunan"},{id:"rusunawa",name:"Rusunawa"},{id:"kawasan_kumuh",name:"Kawasan Kumuh"},{id:"pembangunan_gedung",name:"Pembangunan Gedung"}]},
  { id:"halte", name:"Halte", layers:[{id:"jalur_halte",name:"Jalur Halte Trans"},{id:"titik_halte",name:"Titik Halte"}]},
  { id:"infrastruktur_pendukung", name:"Infrastruktur Pendukung", layers:[{id:"hidran",name:"Hidran"},{id:"rantai_pasok",name:"Rantai Pasok"},{id:"reklame",name:"Reklame"},{id:"titik_bm",name:"Titik Bench Mark"}]},
  { id:"jaringan_drainase", name:"Jaringan Drainase", layers:[{id:"inlet",name:"Inlet"},{id:"manhole_drainase",name:"Manhole Drainase"},{id:"sumur_resapan",name:"Sumur Resapan"},{id:"zona_drainase",name:"Zona Drainase"},{id:"saluran_air_hujan",name:"Saluran Air Hujan"}]},
  { id:"jaringan_fiber_optik", name:"Jaringan Fiber Optik", layers:[{id:"kabel_fiber_optik",name:"Kabel Fiber Optik"},{id:"manhole_fiber_optik",name:"Manhole Fiber Optik"},{id:"tiang_fiber_optik",name:"Tiang Fiber Optik"}]},
  { id:"jaringan_ipal", name:"Jaringan Instalasi Pengolahan Air Limbah", layers:[{id:"manhole_sal",name:"Manhole Saluran Air Limbah"},{id:"pipa_induk",name:"Pipa Induk"},{id:"pipa_glontor",name:"Pipa Glontor"},{id:"pipa_lateral",name:"Pipa Lateral"}]},
  { id:"jaringan_jalan", name:"Jaringan Jalan", layers:[{id:"jalan_kota",name:"Jalan Kota"},{id:"jalan_lingkungan",name:"Jalan Lingkungan"},{id:"jalur_pemandu",name:"Jalur Pemandu"},{id:"jembatan",name:"Jembatan"},{id:"trotoar",name:"Trotoar"}]},
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
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [expanded,setExpanded]=useState<string[]>([]);
  const [checked,setChecked]=useState<string[]>([]);
  const [baseId,setBaseId]=useState("esri");
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
              ["Luas Area", p.luas ? `${p.luas} km²` : null]
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
    <button className="sitijo-sidebar-toggle" onClick={()=>setSidebarOpen(v=>!v)} aria-label="Buka/tutup panel">☰</button>
    <aside className={`sitijo-sidebar ${sidebarOpen?"":"hidden"}`}>
      <div className="sitijo-sidebar-title">Pengaturan Peta</div>
      <div className="sitijo-sidebar-body">
      <div className="sitijo-filter">
        <label className="sitijo-road-toggle">
          <input
            type="checkbox"
            checked={roadEnabled}
            onChange={e => {
              setRoadEnabled(e.target.checked);
              if (!e.target.checked) setRoadSearch("");
            }}
          />
          Aktifkan Fitur Jalan
        </label>

        <h5>Fitur Jalan</h5>

        <input
          list="sitijo-road-list"
          type="text"
          value={roadSearch}
          disabled={!roadEnabled || !checked.includes("jalan_kota") || roadNames.length === 0}
          onChange={e => setRoadSearch(e.target.value)}
          placeholder={
            !roadEnabled
              ? "Aktifkan fitur jalan terlebih dahulu..."
              : !checked.includes("jalan_kota")
              ? "Aktifkan layer Jalan Kota terlebih dahulu..."
              : roadNames.length === 0
              ? "Menunggu data Jalan Kota..."
              : "Cari nama jalan..."
          }
        />

        <datalist id="sitijo-road-list">
          {roadNames.map((name, index) => (
            <option key={`${name}-${index}`} value={name} />
          ))}
        </datalist>

        {roadEnabled && !checked.includes("jalan_kota") && (
          <small className="sitijo-error">
            Aktifkan layer Jalan Kota pada bagian Jaringan Jalan terlebih dahulu.
          </small>
        )}

        {roadEnabled && checked.includes("jalan_kota") && roadNames.length > 0 && (
          <small>{roadNames.length.toLocaleString("id-ID")} nama jalan tersedia</small>
        )}

        {roadEnabled && roadSearch.trim() && !roadNames.some(
          name => name.toLowerCase() === roadSearch.trim().toLowerCase()
        ) && (
          <small className="sitijo-error">
            Nama jalan tidak ditemukan.
          </small>
        )}
      </div>

        <div className="sitijo-filter">
          <h5>Filter Wilayah</h5>
          <select value={kemantren} onChange={e=>{setKemantren(e.target.value);setKelurahan("")}}>
            <option value="">Pilih Kemantren…</option>{Object.keys(wilayah).sort().map(k=><option key={k} value={k}>{k}</option>)}
          </select>
          <select value={kelurahan} disabled={!kemantren} onChange={e=>setKelurahan(e.target.value)}>
            <option value="">Pilih Kelurahan…</option>{(wilayah[kemantren]||[]).sort().map(k=><option key={k} value={k}>{k}</option>)}
          </select>
          {boundaryError&&<small className="sitijo-error">{boundaryError}</small>}
        </div>
        <div className="sitijo-filter">
          <h5>Layer Infrastruktur</h5>
          <div className="sitijo-layer-tree">{groups.map(g=><div key={g.id}>
            <button className="sitijo-layer-class" onClick={()=>setExpanded(v=>v.includes(g.id)?v.filter(x=>x!==g.id):[...v,g.id])}>{expanded.includes(g.id)?"▼":"▶"} {g.name}</button>
            {expanded.includes(g.id)&&<div className="sitijo-layer-sub">{g.layers.map(l=><label key={l.id}><input type="checkbox" checked={checked.includes(l.id)} onChange={e=>toggleLayer(l.id,e.target.checked)}/>{l.name}</label>)}</div>}
          </div>)}</div>
        </div>
      </div>
    </aside>
    <div className="sitijo-layer-loading" style={{display:loadingLayers.length?"block":"none"}}>
      <div className="loading-header"><div className="loading-spinner"/><div><div className="loading-title">Sedang memuat</div><div className="loading-layer">{loadingLayers.join(", ")}</div></div></div>
      <div className="loading-progress"><div className="loading-progress-bar"/></div><div className="loading-count">{loadingLayers.length} layer sedang diproses</div>
    </div>
    <MapContainer center={[-7.7972,110.3688]} zoom={15} minZoom={10} maxZoom={21} zoomControl={false} style={{height:"100%",width:"100%"}}>
      <TileLayer key={selectedBase.id} attribution={selectedBase.attribution} url={selectedBase.url} minZoom={selectedBase.minZoom??0} maxZoom={selectedBase.maxZoom??21} errorTileUrl={selectedBase.id==="ortho"?"/assets/blank.jpg":undefined}/>
      <MapExtras onReady={setMap}/>
      <MapControls onFit={fitAll} onLocate={locate} baseId={baseId} onBaseChange={setBaseId}/>
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

function MapControls({onFit,onLocate,baseId,onBaseChange}:{onFit:()=>void;onLocate:()=>void;baseId:string;onBaseChange:(v:string)=>void}) {
  const map=useMap();
  return <div className="leaflet-top leaflet-right sitijo-map-controls">
    <div className="leaflet-control sitijo-basemap-control">
      <select aria-label="Pilih basemap" value={baseId} onChange={e=>onBaseChange(e.target.value)}>{baseLayers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
    </div>
    <div className="leaflet-control sitijo-control-stack">
    <button
    title="Arah Utara"
    className="sitijo-compass"
    aria-label="Arah Utara"
    >
    <svg
        viewBox="0 0 40 40"
        width="28"
        height="28"
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle
        cx="20"
        cy="20"
        r="17"
        fill="#fff"
        stroke="#64748b"
        strokeWidth="1.5"
        />
        <path
        d="M20 5 L26 23 L20 19 L14 23 Z"
        fill="#dc2626"
        />
        <path
        d="M20 35 L14 17 L20 21 L26 17 Z"
        fill="#64748b"
        />
        <circle cx="20" cy="20" r="2" fill="#fff" />
        <text
        x="20"
        y="11"
        textAnchor="middle"
        fontSize="7"
        fontWeight="bold"
        fill="#dc2626"
        >
        N
        </text>
    </svg>
    </button>
      <button title="Perbesar seluruh layer" onClick={onFit}>⛶</button>
      <button title="Lokasi saya" onClick={onLocate}>◎</button>
      <button title="Zoom in" onClick={()=>map.zoomIn()}>+</button>
      <button title="Zoom out" onClick={()=>map.zoomOut()}>−</button>
    </div>
  </div>;
}
