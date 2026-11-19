import { NextRequest, NextResponse } from "next/server";
import { Pool, type PoolClient } from "pg";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GlobalWithPool = typeof globalThis & { sitijoDownloadPool?: Pool };

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum diatur.");

  const root = globalThis as GlobalWithPool;
  if (!root.sitijoDownloadPool) {
    root.sitijoDownloadPool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ||
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

const GROUPS = [
  {
    id: "atribut_jalan",
    label: "Atribut Jalan",
    tables: ["cermin_jalan", "kamera_pengawas", "lampu_jalan", "lampu_lalin", "rambu_lalin"],
  },
  { id: "halte", label: "Halte", tables: ["titik_halte", "jalur_halte"] },
  {
    id: "infrastruktur_pendukung",
    label: "Infrastruktur Pendukung",
    tables: ["hidran", "rantai_pasok", "reklame", "titik_bm"],
  },
  {
    id: "jaringan_drainase",
    label: "Jaringan Drainase",
    tables: ["inlet", "manhole_drainase", "sumur_resapan", "zona_drainase"],
  },
  {
    id: "jaringan_fiber_optik",
    label: "Jaringan Fiber Optik",
    tables: ["kabel_fo", "manhole_fo", "tiang_fo"],
  },
  {
    id: "jaringan_ipal",
    label: "Jaringan Instalasi Pengolahan Air Limbah",
    tables: ["manhole_sal", "pipa_glontor", "pipa_induk", "pipa_lateral"],
  },
  {
    id: "jaringan_jalan",
    label: "Jaringan Jalan",
    tables: ["jalan_kota", "jalan_lingkungan", "jalur_pemandu", "jembatan", "trotoar"],
  },
  {
    id: "jaringan_listrik",
    label: "Jaringan Listrik",
    tables: ["tegangan_menengah", "tegangan_rendah", "rumah_kabel", "tiang_listrik", "trafo_listrik"],
  },
  { id: "jaringan_pdam", label: "Jaringan PDAM", tables: ["jaringan_pdam"] },
  { id: "sungai", label: "Sungai", tables: ["sungai"] },
] as const;

const LABELS: Record<string, string> = {
  cermin_jalan: "Cermin Jalan",
  kamera_pengawas: "Kamera Pengawas",
  lampu_jalan: "Lampu Jalan",
  lampu_lalin: "Lampu Lalu Lintas",
  rambu_lalin: "Rambu Lalu Lintas",
  titik_halte: "Titik Halte",
  jalur_halte: "Jalur Halte Trans",
  hidran: "Hidran",
  rantai_pasok: "Rantai Pasok",
  reklame: "Reklame",
  titik_bm: "Titik Bench Mark",
  inlet: "Inlet",
  manhole_drainase: "Manhole Drainase",
  sumur_resapan: "Sumur Resapan",
  zona_drainase: "Zona Drainase",
  kabel_fo: "Kabel Fiber Optik",
  manhole_fo: "Manhole Fiber Optik",
  tiang_fo: "Tiang Fiber Optik",
  manhole_sal: "Manhole Saluran Air Limbah",
  pipa_glontor: "Pipa Glontor",
  pipa_induk: "Pipa Induk",
  pipa_lateral: "Pipa Lateral",
  jalan_kota: "Jalan Kota",
  jalan_lingkungan: "Jalan Lingkungan",
  jalur_pemandu: "Jalur Pemandu",
  jembatan: "Jembatan",
  trotoar: "Trotoar",
  tegangan_menengah: "Jaringan Kabel Listrik Tegangan Menengah",
  tegangan_rendah: "Jaringan Kabel Listrik Tegangan Rendah",
  rumah_kabel: "Rumah Kabel",
  tiang_listrik: "Tiang Listrik",
  trafo_listrik: "Trafo Listrik",
  jaringan_pdam: "Jaringan PDAM",
  sungai: "Sungai",
};

const ALLOWED_TABLES = new Set<string>(
  GROUPS.flatMap((group) => [...group.tables]),
);

const quoteIdent = (value: string) =>
  `"${value.replaceAll('"', '""')}"`;

const errorJson = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user) {
    return errorJson("Sesi berakhir. Silakan masuk kembali.", 401);
  }

  const table = request.nextUrl.searchParams.get("table") || "";

  if (!table) {
    return NextResponse.json({ groups: GROUPS, labels: LABELS });
  }

  if (!ALLOWED_TABLES.has(table)) {
    return errorJson("Subkelas tidak diizinkan.", 400);
  }

  let client: PoolClient | undefined;

  try {
    client = await getPool().connect();

    const columnsResult = await client.query(
      `SELECT column_name, udt_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
       ORDER BY ordinal_position`,
      [table],
    );

    const columns = columnsResult.rows as Array<{
      column_name: string;
      udt_name: string;
    }>;

    if (!columns.length) {
      return errorJson(`Tabel ${table} tidak ditemukan.`, 404);
    }

    const geometryColumn = columns.find(
      (column) =>
        column.udt_name === "geometry" ||
        ["geometri", "geom", "geometry"].includes(
          column.column_name.toLowerCase(),
        ),
    )?.column_name;

    if (!geometryColumn) {
      return errorJson(
        `Kolom geometri tidak ditemukan pada tabel ${table}.`,
        422,
      );
    }

    const geom = quoteIdent(geometryColumn);
    const tableName = quoteIdent(table);

    const metadataResult = await client.query(
      `SELECT
         COALESCE(
           (SELECT ST_SRID(${geom})
            FROM public.${tableName}
            WHERE ${geom} IS NOT NULL
            LIMIT 1),
           0
         ) AS srid`,
    );

    const srid = Number(metadataResult.rows[0]?.srid || 0);

    let crsWkt: string | null = null;

    if (srid > 0) {
      const crsResult = await client.query(
        `SELECT srtext
         FROM public.spatial_ref_sys
         WHERE srid = $1
         LIMIT 1`,
        [srid],
      );
      crsWkt = crsResult.rows[0]?.srtext || null;
    }

    const result = await client.query(
      `SELECT
         ST_AsGeoJSON(${geom}, 8)::json AS geometry,
         to_jsonb(t) - $1::text AS properties
       FROM public.${tableName} t
       WHERE ${geom} IS NOT NULL`,
      [geometryColumn],
    );

    const features = result.rows.map((row) => ({
      type: "Feature",
      geometry: row.geometry,
      properties: row.properties || {},
    }));

    return NextResponse.json(
      {
        type: "FeatureCollection",
        table,
        label: LABELS[table] || table,
        total: features.length,
        srid,
        crsWkt,
        features,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Download data error:", error);
    return errorJson(
      "Gagal mengambil data dari database. Periksa koneksi dan struktur tabel.",
      500,
    );
  } finally {
    client?.release();
  }
}
