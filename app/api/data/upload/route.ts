
import { NextRequest, NextResponse } from "next/server";
import { Pool, type PoolClient } from "pg";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GlobalWithPool = typeof globalThis & {
  sitijoUploadPool?: Pool;
};

type LayerConfig = {
  table: string;
  geom?: string;
};

function getPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL belum diatur.");
  }

  const root = globalThis as GlobalWithPool;

  if (!root.sitijoUploadPool) {
    root.sitijoUploadPool = new Pool({
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

  return root.sitijoUploadPool;
}

// =====================================================
// PEMETAAN LAYER KE TABEL DATABASE
// Disamakan dengan API Download Data.
// =====================================================

const LAYERS: Record<string, LayerConfig> = {
  cermin_jalan: { table: "cermin_jalan", geom: "geom" },
  kamera_pengawas: { table: "kamera_pengawas", geom: "geom" },
  lampu_jalan: { table: "lampu_jalan", geom: "geom" },
  lampu_lalin: { table: "lampu_lalu_lintas", geom: "geom" },
  rambu_lalin: { table: "rambu_lalu_lintas", geom: "geom" },

  titik_halte: { table: "titik_halte", geom: "geom" },
  jalur_halte: { table: "jalur_halte_trans", geom: "geom" },

  tegangan_menengah: { table: "tegangan_menengah" },
  tegangan_rendah: { table: "tegangan_rendah" },
  rumah_kabel: { table: "rumah_kabel", geom: "geom" },
  tiang_listrik: { table: "tiang_listrik", geom: "geom" },
  trafo_listrik: { table: "trafo_listrik", geom: "geom" },

  hidran: { table: "hidran", geom: "geom" },
  rantai_pasok: { table: "rantai_pasok" },
  reklame: { table: "reklame", geom: "geom" },
  titik_bm: { table: "titik_bench_mark", geom: "geom" },

  manhole_sal: { table: "manhole_sal" },
  pipa_glontor: { table: "pipa_glontor" },
  pipa_induk: { table: "pipa_induk" },
  pipa_lateral: { table: "pipa_lateral" },

  jaringan_pdam: { table: "jaringan_pdam" },
  sungai: { table: "sungai" },

  inlet: { table: "inlet", geom: "geom" },
  saluran_air_hujan: { table: "saluran_air_hujan", geom: "geom" },
  manhole_drainase: { table: "manhole_drainase", geom: "geom" },
  sumur_resapan: { table: "sumur_resapan" },
  zona_drainase: { table: "zona_drainase" },

  kabel_fiber_optik: { table: "kabel_fo" },
  manhole_fiber_optik: { table: "manhole_fo" },
  tiang_fiber_optik: { table: "tiang_fiber_optik", geom: "geom" },

  jalur_pemandu: { table: "jalur_pemandu", geom: "geom" },
  jalan_kota: { table: "jalan_kota", geom: "geom" },
  jembatan: { table: "jembatan", geom: "geom" },
  jalan_inspeksi: { table: "jalan_inspeksi", geom: "geom" },
  jalan_lingkungan: { table: "jalan_lingkungan", geom: "geom" },
  trotoar: { table: "trotoar", geom: "geom" },

  kawasan_kumuh: { table: "kawasan_kumuh", geom: "geom" },
  pembangunan_gedung: { table: "pembangunan_gedung", geom: "geom" },
  talud_sungai: { table: "talud_sungai", geom: "geom" },
};

// =====================================================
// KELAS DAN SUBKELAS
// =====================================================

const GROUPS: Record<string, string[]> = {
  atribut_jalan: [
    "cermin_jalan",
    "kamera_pengawas",
    "lampu_jalan",
    "lampu_lalin",
    "rambu_lalin",
  ],
  halte: ["titik_halte", "jalur_halte"],
  infrastruktur_pendukung: [
    "hidran",
    "rantai_pasok",
    "reklame",
    "titik_bm",
    "kawasan_kumuh",
    "pembangunan_gedung",
  ],
  jaringan_drainase: [
    "inlet",
    "saluran_air_hujan",
    "manhole_drainase",
    "sumur_resapan",
    "zona_drainase",
  ],
  jaringan_fiber_optik: [
    "kabel_fiber_optik",
    "manhole_fiber_optik",
    "tiang_fiber_optik",
  ],
  jaringan_ipal: [
    "manhole_sal",
    "pipa_glontor",
    "pipa_induk",
    "pipa_lateral",
  ],
  jaringan_jalan: [
    "jalan_kota",
    "jalan_lingkungan",
    "jalan_inspeksi",
    "jalur_pemandu",
    "jembatan",
    "trotoar",
  ],
  jaringan_listrik: [
    "tegangan_menengah",
    "tegangan_rendah",
    "rumah_kabel",
    "tiang_listrik",
    "trafo_listrik",
  ],
  jaringan_pdam: ["jaringan_pdam"],
  sungai: ["sungai", "talud_sungai"],
};

const ALLOWED_GEOMETRIES = new Set([
  "POINT",
  "MULTIPOINT",
  "LINESTRING",
  "MULTILINESTRING",
  "POLYGON",
  "MULTIPOLYGON",
]);

const quoteIdent = (value: string) =>
  `"${value.replaceAll('"', '""')}"`;

const errorJson = (message: string, status = 400) =>
  NextResponse.json(
    { status: "error", message },
    { status }
  );

// =====================================================
// POST UPLOAD GEOJSON
// =====================================================

export async function POST(request: NextRequest) {
  const user = await getSession();

  if (!user) {
    return errorJson(
      "Sesi berakhir. Silakan masuk kembali.",
      401
    );
  }

  let client: PoolClient | undefined;
  let transactionStarted = false;

  try {
    const formData = await request.formData();

    const kelas = String(formData.get("kelas") || "").trim();
    const subkelas = String(formData.get("subkelas") || "").trim();
    const file = formData.get("geojson_file");

    if (!kelas || !subkelas) {
      return errorJson("Kelas dan subkelas wajib dipilih.");
    }

    // Pastikan subkelas benar-benar berada di dalam kelas tersebut.
    if (!GROUPS[kelas]?.includes(subkelas)) {
      return errorJson(
        "Kombinasi kelas dan subkelas tidak valid."
      );
    }

    const config = LAYERS[subkelas];

    if (!config) {
      return errorJson("Subkelas tidak diizinkan.");
    }

    if (!(file instanceof File)) {
      return errorJson("File GeoJSON belum diunggah.");
    }

    if (!file.name.toLowerCase().endsWith(".geojson")) {
      return errorJson("File harus berformat .geojson.");
    }

    if (file.size === 0) {
      return errorJson("File GeoJSON kosong.");
    }

    const MAX_FILE_SIZE = 30 * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE) {
      return errorJson(
        "Ukuran file maksimal 30 MB."
      );
    }

    // -------------------------------------------------
    // BACA GEOJSON
    // -------------------------------------------------

    const fileText = await file.text();

    let geojson: unknown;

    try {
      geojson = JSON.parse(fileText);
    } catch {
      return errorJson("Isi file bukan JSON yang valid.");
    }

    if (
      !geojson ||
      typeof geojson !== "object" ||
      (geojson as { type?: string }).type !== "FeatureCollection" ||
      !Array.isArray(
        (geojson as { features?: unknown }).features
      )
    ) {
      return errorJson(
        "Format harus berupa GeoJSON FeatureCollection."
      );
    }

    const features = (
      geojson as {
        features: Array<{
          type?: string;
          geometry?: {
            type?: string;
            coordinates?: unknown;
          } | null;
          properties?: Record<string, unknown> | null;
        }>;
      }
    ).features;

    if (features.length === 0) {
      return errorJson("GeoJSON tidak memiliki fitur.");
    }

    if (features.length > 10000) {
      return errorJson(
        "Maksimal 10.000 fitur dalam satu kali upload."
      );
    }

    // -------------------------------------------------
    // KONEKSI DATABASE
    // -------------------------------------------------

    client = await getPool().connect();

    const databaseTable = config.table;
    const tableName = quoteIdent(databaseTable);

    // -------------------------------------------------
    // PERIKSA TABEL DAN KOLOM
    // -------------------------------------------------

    const columnResult = await client.query(
      `SELECT
         column_name,
         udt_name,
         is_generated,
         is_identity
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
       ORDER BY ordinal_position`,
      [databaseTable]
    );

    const columns = columnResult.rows as Array<{
      column_name: string;
      udt_name: string;
      is_generated: string;
      is_identity: string;
    }>;

    if (!columns.length) {
      return errorJson(
        `Tabel database "${databaseTable}" tidak ditemukan.`,
        404
      );
    }

    const columnMap = new Map(
      columns.map((column) => [
        column.column_name.toLowerCase(),
        column,
      ])
    );

    // -------------------------------------------------
    // DETEKSI KOLOM GEOMETRI
    // -------------------------------------------------

    let geometryColumn: string | undefined;

    if (config.geom) {
      geometryColumn = columns.find(
        (column) => column.column_name === config.geom
      )?.column_name;

      if (!geometryColumn) {
        return errorJson(
          `Kolom geometri "${config.geom}" tidak ditemukan.`,
          422
        );
      }
    } else {
      geometryColumn = columns.find(
        (column) =>
          column.udt_name === "geometry" ||
          ["geom", "geometri", "geometry"].includes(
            column.column_name.toLowerCase()
          )
      )?.column_name;
    }

    if (!geometryColumn) {
      return errorJson(
        `Kolom geometri tabel "${databaseTable}" tidak ditemukan.`,
        422
      );
    }

    const geometryIdent = quoteIdent(geometryColumn);

    // -------------------------------------------------
    // VALIDASI SEMUA FITUR SEBELUM INSERT
    // -------------------------------------------------

    const geometryTypes = new Set<string>();

    for (let index = 0; index < features.length; index++) {
      const feature = features[index];

      if (
        !feature ||
        feature.type !== "Feature" ||
        !feature.geometry ||
        typeof feature.geometry !== "object"
      ) {
        return errorJson(
          `Fitur ke-${index + 1} tidak memiliki geometri yang valid.`
        );
      }

      const geometryType = String(
        feature.geometry.type || ""
      ).toUpperCase();

      if (!ALLOWED_GEOMETRIES.has(geometryType)) {
        return errorJson(
          `Tipe geometri fitur ke-${index + 1} tidak didukung: ${geometryType || "kosong"}.`
        );
      }

      if (
        !Array.isArray(feature.geometry.coordinates) ||
        feature.geometry.coordinates.length === 0
      ) {
        return errorJson(
          `Koordinat geometri fitur ke-${index + 1} kosong.`
        );
      }

      geometryTypes.add(geometryType);

      if (
        feature.properties !== undefined &&
        feature.properties !== null &&
        (
          typeof feature.properties !== "object" ||
          Array.isArray(feature.properties)
        )
      ) {
        return errorJson(
          `Atribut fitur ke-${index + 1} tidak valid.`
        );
      }
    }

    // -------------------------------------------------
    // SIAPKAN INSERT
    // -------------------------------------------------

    const insertColumns = columns.filter((column) => {
      const name = column.column_name.toLowerCase();

      return (
        name !== geometryColumn!.toLowerCase() &&
        name !== "id" &&
        column.is_generated === "NEVER" &&
        column.is_identity !== "YES"
      );
    });

    const username =
      (user as Record<string, unknown>).username ??
      (user as Record<string, unknown>).email ??
      (user as Record<string, unknown>).id ??
      "unknown";

    let insertedCount = 0;

    await client.query("BEGIN");
    transactionStarted = true;

    for (let index = 0; index < features.length; index++) {
      const feature = features[index];
      const properties = feature.properties || {};

      const insertNames: string[] = [];
      const placeholders: string[] = [];
      const values: unknown[] = [];

      // Atribut yang cocok dengan kolom database.
      for (const [key, value] of Object.entries(properties)) {
        const column = columnMap.get(key.toLowerCase());

        if (!column) continue;

        const columnName = column.column_name;
        const lowerName = columnName.toLowerCase();

        // ID dan kolom geometri tidak dimasukkan sebagai atribut.
        if (
          lowerName === "id" ||
          lowerName === geometryColumn.toLowerCase()
        ) {
          continue;
        }

        // Jangan menulis kolom generated atau identity.
        if (
          column.is_generated !== "NEVER" ||
          column.is_identity === "YES"
        ) {
          continue;
        }

        insertNames.push(quoteIdent(columnName));

        values.push(
          value !== null &&
          typeof value === "object"
            ? JSON.stringify(value)
            : value
        );

        placeholders.push(`$${values.length}`);
      }

      // GeoJSON memakai koordinat longitude, latitude (EPSG:4326).
      values.push(JSON.stringify(feature.geometry));

      const geometryPlaceholder = `$${values.length}`;

      insertNames.push(geometryIdent);

      placeholders.push(
        `ST_SetSRID(ST_GeomFromGeoJSON(${geometryPlaceholder}), 4326)`
      );

      const sql = `
        INSERT INTO public.${tableName}
          (${insertNames.join(", ")})
        VALUES
          (${placeholders.join(", ")})
      `;

      try {
        await client.query(sql, values);
        insertedCount++;
      } catch (error) {
        const detail =
          error instanceof Error
            ? error.message
            : "Kesalahan database.";

        throw new Error(
          `Gagal menyimpan fitur ke-${index + 1}: ${detail}`
        );
      }
    }

    // -------------------------------------------------
    // CATAT LOG UPLOAD
    // -------------------------------------------------

    const logCheck = await client.query(
      `SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = 'log_upload'
       LIMIT 1`
    );

    if (logCheck.rowCount) {
      await client.query(
        `INSERT INTO public.log_upload
          (
            username,
            kelas,
            subkelas,
            jumlah_data,
            jenis_geometri,
            waktu_upload
          )
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          String(username),
          kelas,
          subkelas,
          insertedCount,
          Array.from(geometryTypes).join(", "),
        ]
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      status: "success",
      message: `Berhasil menambahkan ${insertedCount} fitur ke tabel "${databaseTable}".`,
      kelas,
      subkelas,
      databaseTable,
      jumlah_data: insertedCount,
      jenis_geometri: Array.from(geometryTypes),
    });
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Rollback upload gagal:", rollbackError);
      }
    }

    console.error("Tambah Data API error:", error);

    return errorJson(
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat mengunggah data.",
      500
    );
  } finally {
    client?.release();
  }
}
