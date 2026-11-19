import { NextRequest, NextResponse } from "next/server";
import { Pool, type PoolClient } from "pg";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GlobalWithPool = typeof globalThis & {
  sitijoDownloadPool?: Pool;
};

type LayerConfig = {
  table: string;
  geom?: string;
  range?: [string, number, number];
};

function getPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL belum diatur.");
  }

  const root = globalThis as GlobalWithPool;

  if (!root.sitijoDownloadPool) {
    root.sitijoDownloadPool = new Pool({
      connectionString,
      ssl:
        connectionString.includes("localhost") ||
        connectionString.includes("127.0.0.1")
          ? undefined
          : { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    });
  }

  return root.sitijoDownloadPool;
}

// =====================================================
// MAPPING LAYER -> TABEL DATABASE DAN KOLOM GEOMETRI
// Key merupakan nama layer yang digunakan frontend.
// =====================================================

const LAYERS: Record<string, LayerConfig> = {
  // Atribut Jalan
  cermin_jalan: { table: "cermin_jalan", geom: "geom" },
  kamera_pengawas: { table: "kamera_pengawas", geom: "geom" },
  lampu_jalan: { table: "lampu_jalan", geom: "geom" },
  lampu_lalin: { table: "lampu_lalu_lintas", geom: "geom" },
  rambu_lalin: { table: "rambu_lalu_lintas", geom: "geom" },

  // Halte
  titik_halte: { table: "titik_halte", geom: "geom" },
  jalur_halte: { table: "jalur_halte_trans", geom: "geom" },

  // Jaringan Listrik
  tegangan_menengah: { table: "tegangan_menengah" },
  tegangan_rendah: { table: "tegangan_rendah" },
  rumah_kabel: { table: "rumah_kabel", geom: "geom" },
  tiang_listrik: { table: "tiang_listrik", geom: "geom" },
  trafo_listrik: { table: "trafo_listrik", geom: "geom" },

  // Infrastruktur Pendukung
  hidran: { table: "hidran", geom: "geom" },
  rantai_pasok: { table: "rantai_pasok" },
  reklame: { table: "reklame", geom: "geom" },
  titik_bm: { table: "titik_bench_mark", geom: "geom" },

  // Jaringan IPAL
  manhole_sal: { table: "manhole_sal" },
  pipa_glontor: { table: "pipa_glontor" },
  pipa_induk: { table: "pipa_induk" },
  pipa_lateral: { table: "pipa_lateral" },

  // PDAM dan Sungai
  jaringan_pdam: { table: "jaringan_pdam" },
  sungai: { table: "sungai" },
  talud_sungai: { table: "talud_sungai", geom: "geom" },

  // Drainase
  inlet: { table: "inlet", geom: "geom" },
  saluran_air_hujan: { table: "saluran_air_hujan", geom: "geom" },
  manhole_drainase: { table: "manhole_drainase", geom: "geom" },
  sumur_resapan: { table: "sumur_resapan" },
  zona_drainase: { table: "zona_drainase" },

  // Fiber Optik
  kabel_fiber_optik: { table: "kabel_fo" },
  manhole_fiber_optik: { table: "manhole_fo" },
  tiang_fiber_optik: { table: "tiang_fiber_optik", geom: "geom" },

  // Jaringan Jalan
  jalur_pemandu: { table: "jalur_pemandu" },
  jalan_kota: { table: "jalan_kota" },
  jembatan: { table: "jembatan" },
  jalan_inspeksi: { table: "jalan_inspeksi", geom: "geom" },
  jalan_lingkungan: { table: "jalan_lingkungan" },
  trotoar: { table: "trotoar" },

  // Bangunan
  kawasan_kumuh: { table: "kawasan_kumuh", geom: "geom" },
  pembangunan_gedung: { table: "pembangunan_gedung", geom: "geom" },
};

// =====================================================
// KELOMPOK KELAS DAN SUBKELAS
// =====================================================

const GROUPS = [
  {
    id: "bangunan",
    label: "Bangunan",
    tables: [
      "kawasan_kumuh",
      "pembangunan_gedung",
    ],
  },
  {
    id: "atribut_jalan",
    label: "Atribut Jalan",
    tables: [
      "cermin_jalan",
      "kamera_pengawas",
      "lampu_jalan",
      "lampu_lalin",
      "rambu_lalin",
    ],
  },
  {
    id: "halte",
    label: "Halte",
    tables: ["titik_halte", "jalur_halte"],
  },
  {
    id: "infrastruktur_pendukung",
    label: "Infrastruktur Pendukung",
    tables: [
      "hidran",
      "rantai_pasok",
      "reklame",
      "titik_bm",
    ],
  },
  {
    id: "jaringan_drainase",
    label: "Jaringan Drainase",
    tables: [
      "inlet",
      "saluran_air_hujan",
      "manhole_drainase",
      "sumur_resapan",
      "zona_drainase",
    ],
  },
  {
    id: "jaringan_fiber_optik",
    label: "Jaringan Fiber Optik",
    tables: [
      "kabel_fiber_optik",
      "manhole_fiber_optik",
      "tiang_fiber_optik",
    ],
  },
  {
    id: "jaringan_ipal",
    label: "Jaringan Instalasi Pengolahan Air Limbah",
    tables: [
      "manhole_sal",
      "pipa_glontor",
      "pipa_induk",
      "pipa_lateral",
    ],
  },
  {
    id: "jaringan_jalan",
    label: "Jaringan Jalan",
    tables: [
      "jalan_kota",
      "jalan_lingkungan",
      "jalan_inspeksi",
      "jalur_pemandu",
      "jembatan",
      "trotoar",
    ],
  },
  {
    id: "jaringan_listrik",
    label: "Jaringan Listrik",
    tables: [
      "tegangan_menengah",
      "tegangan_rendah",
      "rumah_kabel",
      "tiang_listrik",
      "trafo_listrik",
    ],
  },
  {
    id: "jaringan_pdam",
    label: "Jaringan PDAM",
    tables: ["jaringan_pdam"],
  },
  {
    id: "sungai",
    label: "Sungai",
    tables: ["sungai", "talud_sungai"],
  },
] as const;

// =====================================================
// LABEL SUBKELAS
// =====================================================

const LABELS: Record<string, string> = {
  cermin_jalan: "Cermin Jalan",
  kamera_pengawas: "Kamera Pengawas",
  lampu_jalan: "Lampu Jalan",
  lampu_lalin: "Lampu Lalu Lintas",
  rambu_lalin: "Rambu Lalu Lintas",

  titik_halte: "Titik Halte",
  jalur_halte: "Jalur Halte Trans",

  tegangan_menengah: "Jaringan Kabel Listrik Tegangan Menengah",
  tegangan_rendah: "Jaringan Kabel Listrik Tegangan Rendah",
  rumah_kabel: "Rumah Kabel",
  tiang_listrik: "Tiang Listrik",
  trafo_listrik: "Trafo Listrik",

  hidran: "Hidran",
  rantai_pasok: "Rantai Pasok",
  reklame: "Reklame",
  titik_bm: "Titik Bench Mark",
  kawasan_kumuh: "Kawasan Kumuh",
  pembangunan_gedung: "Pembangunan Gedung",

  manhole_sal: "Manhole Saluran Air Limbah",
  pipa_glontor: "Pipa Glontor",
  pipa_induk: "Pipa Induk",
  pipa_lateral: "Pipa Lateral",

  jaringan_pdam: "Jaringan PDAM",
  sungai: "Sungai",
  talud_sungai: "Talud Sungai",

  inlet: "Inlet",
  saluran_air_hujan: "Saluran Air Hujan",
  manhole_drainase: "Manhole Drainase",
  sumur_resapan: "Sumur Resapan",
  zona_drainase: "Zona Drainase",

  kabel_fiber_optik: "Kabel Fiber Optik",
  manhole_fiber_optik: "Manhole Fiber Optik",
  tiang_fiber_optik: "Tiang Fiber Optik",

  jalur_pemandu: "Jalur Pemandu",
  jalan_kota: "Jalan Kota",
  jalan_inspeksi: "Jalan Inspeksi",
  jalan_lingkungan: "Jalan Lingkungan",
  jembatan: "Jembatan",
  trotoar: "Trotoar",
};

// =====================================================
// VALIDASI ALLOWLIST
// =====================================================

const ALLOWED_TABLES = new Set<string>(
  Object.keys(LAYERS)
);

const quoteIdent = (value: string) =>
  `"${value.replaceAll('"', '""')}"`;

const errorJson = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

// =====================================================
// DETEKSI KOLOM GEOMETRI
// =====================================================

async function getGeometryColumn(
  client: PoolClient,
  tableName: string,
  configuredGeom?: string
): Promise<string | null> {
  const result = await client.query(
    `SELECT column_name, udt_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName]
  );

  const columns = result.rows as Array<{
    column_name: string;
    udt_name: string;
  }>;

  if (!columns.length) {
    return null;
  }

  if (configuredGeom) {
    const exists = columns.some(
      (column) => column.column_name === configuredGeom
    );

    if (!exists) {
      throw new Error(
        `Kolom geometri "${configuredGeom}" tidak ditemukan pada tabel "${tableName}".`
      );
    }

    return configuredGeom;
  }

  const geometryColumn = columns.find(
    (column) =>
      column.udt_name === "geometry" ||
      ["geometri", "geom", "geometry"].includes(
        column.column_name.toLowerCase()
      )
  );

  return geometryColumn?.column_name || null;
}

// =====================================================
// API GET
// =====================================================

export async function GET(request: NextRequest) {
  const user = await getSession();

  if (!user) {
    return errorJson(
      "Sesi berakhir. Silakan masuk kembali.",
      401
    );
  }

  const layerKey =
    request.nextUrl.searchParams.get("table") || "";

  // Request daftar kelas dan subkelas
  if (!layerKey) {
    return NextResponse.json({
      groups: GROUPS,
      labels: LABELS,
    });
  }

  // Validasi key layer
  if (!ALLOWED_TABLES.has(layerKey)) {
    return errorJson("Subkelas tidak diizinkan.", 400);
  }

  const config = LAYERS[layerKey];

  const databaseTable = config.table;

  let client: PoolClient | undefined;

  try {
    client = await getPool().connect();

    const tableName = quoteIdent(databaseTable);

    // Pastikan tabel tersedia dan temukan kolom geometri
    const geometryColumn = await getGeometryColumn(
      client,
      databaseTable,
      config.geom
    );

    if (!geometryColumn) {
      return errorJson(
        `Kolom geometri tidak ditemukan pada tabel ${databaseTable}.`,
        422
      );
    }

    const geom = quoteIdent(geometryColumn);

    // -------------------------------------------------
    // AMBIL SRID
    // -------------------------------------------------

    const metadataResult = await client.query(
      `SELECT
         COALESCE(
           (
             SELECT ST_SRID(${geom})
             FROM public.${tableName}
             WHERE ${geom} IS NOT NULL
             LIMIT 1
           ),
           0
         ) AS srid`
    );

    const srid = Number(
      metadataResult.rows[0]?.srid || 0
    );

    // -------------------------------------------------
    // AMBIL WKT DARI SPATIAL_REF_SYS
    // Schema Supabase: extensions
    // -------------------------------------------------

    let crsWkt: string | null = null;

    if (srid > 0) {
      try {
        const crsResult = await client.query(
          `SELECT srtext
           FROM extensions.spatial_ref_sys
           WHERE srid = $1
           LIMIT 1`,
          [srid]
        );

        crsWkt = crsResult.rows[0]?.srtext || null;
      } catch (error) {
        console.warn(
          `Referensi CRS SRID ${srid} tidak dapat dibaca:`,
          error
        );

        // Ekspor GeoJSON tetap dapat dilanjutkan.
        crsWkt = null;
      }
    }

    // -------------------------------------------------
    // AMBIL DATA GEOMETRI DAN ATRIBUT
    // -------------------------------------------------

    const result = await client.query(
      `SELECT
         ST_AsGeoJSON(${geom}, 8)::json AS geometry,
         to_jsonb(t) - $1::text AS properties
       FROM public.${tableName} t
       WHERE ${geom} IS NOT NULL`,
      [geometryColumn]
    );

    const features = result.rows.map((row) => ({
      type: "Feature" as const,
      geometry: row.geometry,
      properties: row.properties || {},
    }));

    // -------------------------------------------------
    // RESPONSE GEOJSON
    // -------------------------------------------------

    return NextResponse.json(
      {
        type: "FeatureCollection",
        table: layerKey,
        databaseTable,
        label: LABELS[layerKey] || layerKey,
        total: features.length,
        srid,
        crsWkt,
        features,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      `Download data error [${layerKey} -> ${databaseTable}]:`,
      error
    );

    return errorJson(
      error instanceof Error
        ? `Gagal mengambil data ${LABELS[layerKey] || layerKey}: ${error.message}`
        : "Gagal mengambil data dari database.",
      500
    );
  } finally {
    client?.release();
  }
}
