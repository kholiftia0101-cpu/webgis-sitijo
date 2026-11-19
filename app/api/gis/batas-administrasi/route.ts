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
    ssl: { rejectUnauthorized: false },
    max: 5,
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

    const result = await pool.query(`

    SELECT
        kelurah_id,
        kelurahan,
        kecamatan,
        SUM(luas) AS luas,
        SUM(luas_ha) AS luas_ha,
        ST_AsGeoJSON(
            ST_Multi(ST_Union(geom)),
            6
        )::json AS geometry
    FROM batas_administrasi_rw
    WHERE geom IS NOT NULL
    GROUP BY
        kelurah_id,
        kelurahan,
        kecamatan
    ORDER BY kelurahan;

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
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
