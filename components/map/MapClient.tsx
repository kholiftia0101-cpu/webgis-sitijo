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
          <div className="sitijo-redesign-section-title">⌖ Filter Wilayah</div>
          <div className="sitijo-redesign-filter-row"><label>Kemantren</label><select value={kemantren} onChange={e=>{setKemantren(e.target.value);setKelurahan("")}}>
            <option value="">Pilih Kemantren…</option>{Object.keys(wilayah).sort().map(k=><option key={k} value={k}>{k}</option>)}
          </select></div>
          <div className="sitijo-redesign-filter-row"><label>Kelurahan</label><select value={kelurahan} disabled={!kemantren} onChange={e=>setKelurahan(e.target.value)}>
            <option value="">Pilih Kelurahan…</option>{(wilayah[kemantren]||[]).sort().map(k=><option key={k} value={k}>{k}</option>)}
          </select></div>
          {boundaryError&&<small className="sitijo-error">{boundaryError}</small>}
        </div>
        <div className="sitijo-filter">
          <div className="sitijo-redesign-section-title">▱ Layer Infrastruktur</div>
          <div className="sitijo-layer-tree">{groups.map(g=><div className="sitijo-redesign-group" key={g.id}>
            <button className="sitijo-redesign-group-btn" onClick={()=>setExpanded(v=>v.includes(g.id)?v.filter(x=>x!==g.id):[...v,g.id])}>
              <span>▱</span><span>{g.name}</span><span className="group-count">{g.layers.length}</span><span className="group-arrow">{expanded.includes(g.id)?"⌃":"⌄"}</span>
            </button>
            {expanded.includes(g.id)&&<div className="sitijo-redesign-layer-list">{g.layers.map(l=><label className="sitijo-redesign-layer-row" key={l.id}>
              <input type="checkbox" checked={checked.includes(l.id)} onChange={e=>toggleLayer(l.id,e.target.checked)}/><span className="sitijo-redesign-switch"/><span>{l.name}</span>
            </label>)}</div>}
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
    <div className="sitijo-status sitijo-redesign-status"><span>▱</span>{checked.length} layer aktif <span>⌄</span></div>
    <div className="sitijo-legend sitijo-redesign-legend">
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
  const previews:Record<string,string> = {
    esri:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/17095/26430",
    topo:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/15/17095/26430",
    street:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/15/17095/26430",
    osm:"https://tile.openstreetmap.org/15/26430/17095.png",
    ortho:"https://sitijo.wuaze.com/assets/ortho/15/26430/17095.png"
  };
  const shortNames:Record<string,string>={esri:"ESRI World Imagery",topo:"ESRI World Topographic",street:"ESRI World Street Map",osm:"Open Street Map",ortho:"Orthophoto 2023"};
  return <>
    <div className="sitijo-redesign-basemap">
      <div className="sitijo-redesign-basemap-title"><span>▱</span> Basemap</div>
      <div className="sitijo-redesign-basemap-grid">
        {baseLayers.map(x=><button key={x.id} type="button" className={`sitijo-redesign-basemap-card ${baseId===x.id?"selected":""}`} onClick={()=>onBaseChange(x.id)} aria-pressed={baseId===x.id}>
          {baseId===x.id&&<span className="sitijo-redesign-basemap-check">✓</span>}
          <img src={previews[x.id]} alt={shortNames[x.id]} loading="lazy" />
          <span>{shortNames[x.id]}</span>
        </button>)}
      </div>
    </div>
    <div className="leaflet-top leaflet-right sitijo-map-controls">
      <div className="sitijo-redesign-controls">
        <button title="Arah Utara" className="sitijo-compass" aria-label="Arah Utara">
          <svg viewBox="0 0 40 40" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="17" fill="#fff" stroke="#64748b" strokeWidth="1.5"/>
            <path d="M20 5 L26 23 L20 19 L14 23 Z" fill="#dc2626"/>
            <path d="M20 35 L14 17 L20 21 L26 17 Z" fill="#64748b"/>
            <circle cx="20" cy="20" r="2" fill="#fff"/>
            <text x="20" y="11" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#dc2626">N</text>
          </svg>
        </button>
        <button title="Perbesar seluruh layer" onClick={onFit}>⛶</button>
        <button title="Lokasi saya" onClick={onLocate}>◎</button>
        <button title="Zoom in" onClick={()=>map.zoomIn()}>+</button>
        <button title="Zoom out" onClick={()=>map.zoomOut()}>−</button>
      </div>
    </div>
  </>;
}
