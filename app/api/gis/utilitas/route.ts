import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const globalForPg = globalThis as typeof globalThis & { pgPool?: Pool };
const pool = globalForPg.pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});
if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

// Nama layer -> tabel/kolom geometri. Seluruh identifier berasal dari allowlist ini.
const LAYERS: Record<string, { table: string; geom?: string; range?: [string, number, number] }> = {
  cermin_jalan:{table:"cermin_jalan",geom:"geom"}, kamera_pengawas:{table:"kamera_pengawas",geom:"geom"}, lampu_jalan:{table:"lampu_jalan",geom:"geom"}, lampu_lalin:{table:"lampu_lalu_lintas",geom:"geom"}, rambu_lalin:{table:"rambu_lalu_lintas",geom:"geom"},
  titik_halte:{table:"titik_halte",geom:"geom"}, jalur_halte:{table:"jalur_halte_trans",geom:"geom"}, tegangan_menengah:{table:"tegangan_menengah"}, tegangan_rendah:{table:"tegangan_rendah"}, rumah_kabel:{table:"rumah_kabel",geom:"geom"}, tiang_listrik:{table:"tiang_listrik",geom:"geom"}, trafo_listrik:{table:"trafo_listrik",geom:"geom"},
  hidran:{table:"hidran",geom:"geom"}, rantai_pasok:{table:"rantai_pasok"}, reklame:{table:"reklame",geom:"geom"}, titik_bm:{table:"titik_bench_mark",geom:"geom"}, manhole_sal:{table:"manhole_sal"}, pipa_glontor:{table:"pipa_glontor"}, pipa_induk:{table:"pipa_induk"}, pipa_lateral:{table:"pipa_lateral"}, jaringan_pdam:{table:"jaringan_pdam"}, sungai:{table:"sungai"},
  inlet:{table:"inlet",geom:"geom"}, manhole_drainase:{table:"manhole_drainase",geom:"geom"}, sumur_resapan:{table:"sumur_resapan"}, zona_drainase:{table:"zona_drainase"}, kabel_fiber_optik:{table:"kabel_fo"}, manhole_fiber_optik:{table:"manhole_fo"}, tiang_fiber_optik:{table:"tiang_fiber_optik",geom:"geom"},
  jalur_pemandu:{table:"jalur_pemandu"}, jalan_kota:{table:"jalan_kota"}, jembatan:{table:"jembatan"}, jalan_inspeksi:{table:"jalan_inspeksi",geom:"geom"}, jalan_lingkungan:{table:"jalan_lingkungan"}, trotoar:{table:"trotoar"},
  kawasan_kumuh:{table:"kawasan_kumuh"}, pembangunan_gedung:{table:"pembangunan_gedung"}, talud_sungai:{table:"talud_sungai"},
};

const styles: Record<string, object> = {
  cermin_jalan:{radius:5,color:"#64748b",fillColor:"#64748b",fillOpacity:1,opacity:0},
  kamera_pengawas:{radius:5,color:"#8b5cf6",fillColor:"#8b5cf6",fillOpacity:1,opacity:0},
  lampu_jalan:{radius:5,color:"#facc15",fillColor:"#facc15",fillOpacity:1,opacity:0},
  lampu_lalin:{radius:5,color:"#ef4444",fillColor:"#ef4444",fillOpacity:1,opacity:0},
  rambu_lalin:{radius:5,color:"#06b6d4",fillColor:"#06b6d4",fillOpacity:1,opacity:0},jalan_inspeksi:{color:"#e67e22",weight:2.5,opacity:.9}, jalan_kota:{color:"#f39c12",weight:3}, jalan_lingkungan:{color:"#f1c40f",weight:2},
  trotoar:{color:"#9b59b6",weight:2}, jalur_pemandu:{color:"#fbff00",weight:2}, jembatan:{radius:5,color:"#e74c3c",fillColor:"#e74c3c",fillOpacity:1,opacity:0},
  kabel_fiber_optik:{color:"#d946ef",weight:2}, jaringan_pdam:{color:"#00cfd1",weight:2}, sungai:{color:"#35c2ff",weight:2},
  pipa_glontor:{color:"#19a880",weight:2}, pipa_induk:{color:"#5691a8",weight:2}, pipa_lateral:{color:"#028ebd",weight:2},
  bangunan:{color:"#c0392b",weight:1,fillColor:"#e57373",fillOpacity:.45}, kawasan_kumuh:{color:"#e67e22",weight:2,fillColor:"#f39c12",fillOpacity:.2},
  pembangunan_gedung:{color:"#16a34a",weight:2,fillColor:"#22c55e",fillOpacity:.35}, talud_sungai:{color:"#64748b",weight:2},
};

function featureCollection(rows: Array<{ geometry: unknown; properties: Record<string, unknown> }>) {
  return { type:"FeatureCollection", features: rows.filter(r=>r.geometry).map(r=>({type:"Feature",geometry:r.geometry,properties:r.properties})) };
}

export async function GET(req: NextRequest) {
  if (!process.env.DATABASE_URL) return NextResponse.json({error:"DATABASE_URL belum diatur."},{status:500});
  const { searchParams } = new URL(req.url);
  const layer = searchParams.get("layer") || "";
  if (!layer) return NextResponse.json({error:"Parameter layer wajib diisi."},{status:400});
  try {
    if (layer === "bangunan") {
      const response = await fetch(
        "https://sitijo-assets.ruli-andaru.workers.dev/gis/bangunan.geojson",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Gagal mengambil GeoJSON bangunan dari R2: HTTP ${response.status}`
        );
      }

      const data = await response.json();

      if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
        throw new Error("Format GeoJSON bangunan dari R2 tidak valid.");
      }

      return NextResponse.json(data);
    }
    const config = LAYERS[layer];
    if (!config) return NextResponse.json({error:`Layer '${layer}' tidak dikenal.`},{status:404});
    const geom = config.geom || "geometri";
    const sql = `SELECT ST_AsGeoJSON(${geom},6)::json AS geometry, (to_jsonb(t)-'${geom}') || jsonb_build_object('style',$1::jsonb) AS properties FROM public."${config.table}" t WHERE ${geom} IS NOT NULL`;
    const result = await pool.query(sql,[JSON.stringify(styles[layer] || {color:"#555",weight:2,fillOpacity:.25})]);
    return NextResponse.json(featureCollection(result.rows));
  } catch (error) {
    console.error(`GIS layer ${layer} error:`,error);
    return NextResponse.json({error:`Gagal mengambil layer ${layer}.`,detail:error instanceof Error?error.message:"Unknown error"},{status:500});
  }
}
