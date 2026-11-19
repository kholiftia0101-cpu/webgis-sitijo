
import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const globalForPg = globalThis as typeof globalThis & {
  pgPool?: Pool;
};

const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "DATABASE_URL belum diatur di .env.local" },
        { status: 500 }
      );
    }

    // Mengambil seluruh polygon RW secara terpisah
    const result = await pool.query(`
      SELECT
        id,
        nama,
        fcode,
        srs_id,
        kdcpum,
        kdepum,
        kdpkab,
        kdppum,
        luaswh,
        tipadm,
        kecamatan,
        kelurahan,
        perimeter,
        luas,
        luas_ha,,
        ST_AsGeoJSON(geom, 6)::json AS geometry
      FROM public.batas_administrasi_kelurahan
      WHERE geom IS NOT NULL
      ORDER BY
        kelurahan,
    `);

    // Mengubah hasil query menjadi GeoJSON FeatureCollection
    const features = result.rows.map((row) => {
      const { geometry, ...properties } = row;

      return {
        type: "Feature",
        geometry,
        properties,
      };
    });

    return NextResponse.json({
      type: "FeatureCollection",
      features,
    });
  } catch (error) {
    console.error("Batas administrasi error:", error);

    return NextResponse.json(
      {
        error: "Gagal mengambil batas administrasi.",
        detail:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
