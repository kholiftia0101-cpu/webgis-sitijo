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
  batas_administrasi_kota:{table:"batas_administrasi_kota",geom:"geom"}, batas_administrasi_kemantren:{table:"batas_administrasi_kemantren",geom:"geom"}, batas_administrasi_kelurahan:{table:"batas_administrasi_kelurahan",geom:"geom"}, batas_administrasi_kampung:{table:"batas_administrasi_kampung",geom:"geom"}, batas_administrasi_rw:{table:"batas_administrasi_rw",geom:"geom"},
  titik_halte:{table:"titik_halte",geom:"geom"}, jalur_halte:{table:"jalur_halte_trans",geom:"geom"}, tegangan_menengah:{table:"tegangan_menengah"}, tegangan_rendah:{table:"tegangan_rendah"}, rumah_kabel:{table:"rumah_kabel",geom:"geom"}, tiang_listrik:{table:"tiang_listrik",geom:"geom"}, trafo_listrik:{table:"trafo_listrik",geom:"geom"},
  hidran:{table:"hidran",geom:"geom"}, rantai_pasok:{table:"rantai_pasok"}, reklame:{table:"reklame",geom:"geom"}, titik_bm:{table:"titik_bench_mark",geom:"geom"}, manhole_sal:{table:"manhole_sal"}, pipa_glontor:{table:"pipa_glontor"}, pipa_induk:{table:"pipa_induk"}, pipa_lateral:{table:"pipa_lateral"}, jaringan_pdam:{table:"jaringan_pdam"}, sungai:{table:"sungai"},
  inlet:{table:"inlet",geom:"geom"}, saluran_air_hujan:{table:"saluran_air_hujan",geom:"geom"}, manhole_drainase:{table:"manhole_drainase",geom:"geom"}, sumur_resapan:{table:"sumur_resapan"}, zona_drainase:{table:"zona_drainase"}, kabel_fiber_optik:{table:"kabel_fo"}, manhole_fiber_optik:{table:"manhole_fo"}, tiang_fiber_optik:{table:"tiang_fiber_optik",geom:"geom"},
  jalur_pemandu:{table:"jalur_pemandu"}, jalan_kota:{table:"jalan_kota"}, jembatan:{table:"jembatan"}, jalan_inspeksi:{table:"jalan_inspeksi",geom:"geom"}, jalan_lingkungan:{table:"jalan_lingkungan"}, trotoar:{table:"trotoar"},
  kawasan_kumuh:{table:"kawasan_kumuh",geom:"geom"}, pembangunan_gedung:{table:"pembangunan_gedung",geom:"geom"}, talud_sungai:{table:"talud_sungai",geom:"geom"}, high_mes_tower:{table:"high_mes_tower",geom:"geom"},papan_tanah_negara:{table:"papan_tanah_negara",geom:"geom"},rumija:{table:"rumija",geom:"geom"}
};

const styles: Record<string, object> = {
  cermin_jalan:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#374151",fillOpacity:1,opacity:1}, kamera_pengawas:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#6B7280",fillOpacity:1,opacity:1}, lampu_jalan:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#B8B094",fillOpacity:1,opacity:1}, lampu_lalin:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#D1D5DB",fillOpacity:1,opacity:1}, rambu_lalin:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#9CA3AF",fillOpacity:1,opacity:1},
 batas_administrasi_kota:{color:"#B6FF00",weight:2.8,opacity:1,fillOpacity:0},batas_administrasi_kemantren:{color:"#DFFF00",weight:2,opacity:1,fillOpacity:0},batas_administrasi_kelurahan:{color:"#FFD000",weight:1.5,opacity:1,fillOpacity:0},batas_administrasi_kampung:{color:"#FFAA00",weight:1.1,opacity:0.95,fillOpacity:0,dashArray:"5,4"},batas_administrasi_rw:{color:"#FF7A00",weight:0.9,opacity:0.9,fillOpacity:0,dashArray:"2,4"},
  bangunan:{color:"#FFFFFF",weight:0.7,fillColor:"yellow",fillOpacity:0.25,opacity:1},kawasan_kumuh:{color:"#FFFFFF",weight:0.7,fillColor:"#A8433E",fillOpacity:0.7,opacity:1}, pembangunan_gedung:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#E08A78",fillOpacity:1,opacity:1},
  jalur_halte:{color:"#FF69B4",weight:2,opacity:1}, titik_halte:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#F000C8",fillOpacity:1,opacity:1},
  hidran:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#00FFAB",fillOpacity:1,opacity:1}, rantai_pasok:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#c8ff00",fillOpacity:1,opacity:1}, reklame:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#B8F1B0",fillOpacity:1,opacity:1}, titik_bm:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#3E3FCBF",fillOpacity:1,opacity:1},
  inlet:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#1565C0",fillOpacity:1,opacity:1}, manhole_drainase:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#197F9D",fillOpacity:1,opacity:1}, sumur_resapan:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#2699B5",fillOpacity:1,opacity:1}, zona_drainase:{color:"#0D477A",weight:0.7,opacity:1}, saluran_air_hujan:{color:"#00A6B2",weight:2,opacity:1},
  kabel_fiber_optik:{color:"#8E24AA",weight:2,opacity:1}, manhole_fiber_optik:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#AB47BC",fillOpacity:1,opacity:1}, tiang_fiber_optik:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#6A1B9A",fillOpacity:1,opacity:1},
  manhole_sal:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#7B3545",fillOpacity:1,opacity:1}, pipa_induk:{color:"#A34252",weight:2,opacity:1}, pipa_glontor:{color:"#C16A70",weight:2,opacity:1}, pipa_lateral:{color:"#8F4A58",weight:2,opacity:1},
  jalan_inspeksi:{color:"#e67e22",weight:2,opacity:.9}, jalan_kota:{color:"#f39c12",weight:3}, jalan_lingkungan:{color:"#f1c40f",weight:2},
  trotoar:{color:"#9b59b6",weight:2}, jalur_pemandu:{color:"#fbff00",weight:2}, jembatan:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#e74c3c",fillOpacity:1,opacity:1},
  tegangan_menengah:{color:"#A16207",weight:2,opacity:1}, tegangan_rendah:{color:"#EAB308",weight:2,opacity:1}, rumah_kabel:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#7C8B42",fillOpacity:1,opacity:1}, tiang_listrik:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#D97706",fillOpacity:1,opacity:1}, trafo_listrik:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#B59B35",fillOpacity:1,opacity:1},
  jaringan_pdam:{color:"#00cfd1",weight:2}, 
  sungai:{color:"#35c2ff",weight:2}, talud_sungai:{color:"#D4E600",weight:2,opacity:1},
  high_mes_tower:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#FF0059",fillOpacity:1,opacity:1},
  papan_tanah_negara:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#00BFFF",fillOpacity:1,opacity:1},
  rumija:{radius:5,color:"#FFFFFF",weight:0.7,fillColor:"#7300FF",fillOpacity:1,opacity:1}
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

      type BuildingFeature = {
        type: "Feature";
        geometry: unknown;
        properties?: Record<string, unknown> | null;
        [key: string]: unknown;
      };

      type BuildingCollection = {
        type: "FeatureCollection";
        features: BuildingFeature[];
      };

      const buildingData =
        (await response.json()) as BuildingCollection;

      if (
        buildingData.type !== "FeatureCollection" ||
        !Array.isArray(buildingData.features)
      ) {
        throw new Error(
          "Format GeoJSON bangunan dari R2 tidak valid."
        );
      }

      buildingData.features = buildingData.features.map(
        (feature) => ({
          ...feature,
          properties: {
            ...(feature.properties ?? {}),
            style: styles.bangunan,
          },
        })
      );

      return NextResponse.json(buildingData);
    }

    const config = LAYERS[layer];
    if (!config) return NextResponse.json({error:`Layer '${layer}' tidak dikenal.`},{status:404});
    const geom = config.geom || "geometri";
    const sql = `SELECT ST_AsGeoJSON(${geom},6)::json AS geometry, (to_jsonb(t)-'${geom}') || jsonb_build_object('style',$1::jsonb) AS properties FROM public."${config.table}" t WHERE ${geom} IS NOT NULL`;
    const result = await pool.query(sql,[JSON.stringify(styles[layer] || {color:"#C44E52",weight:2,fillOpacity:.25})]);
    return NextResponse.json(featureCollection(result.rows));
  } catch (error) {
    console.error(`GIS layer ${layer} error:`,error);
    return NextResponse.json({error:`Gagal mengambil layer ${layer}.`,detail:error instanceof Error?error.message:"Unknown error"},{status:500});
  }
}
