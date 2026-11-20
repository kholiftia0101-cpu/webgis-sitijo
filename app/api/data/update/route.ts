import { NextRequest, NextResponse } from "next/server";
import { Pool, type PoolClient } from "pg";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GlobalWithPool = typeof globalThis & { sitijoUpdatePool?: Pool };

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL belum diatur di environment variables.");
  const root = globalThis as GlobalWithPool;
  if (!root.sitijoUpdatePool) {
    root.sitijoUpdatePool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
        ? undefined
        : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    });
  }
  return root.sitijoUpdatePool!;
}

const GROUPS = [
  { id:"bangunan", label: "Bangunan", tables: ["kawasan_kumuh","pembangunan_gedung"] },
  { id: "atribut_jalan", label: "Atribut Jalan", tables: ["cermin_jalan", "kamera_pengawas", "lampu_jalan", "lampu_lalin", "rambu_lalin"] },
  { id: "halte", label: "Halte", tables: ["titik_halte", "jalur_halte"] },
  { id: "infrastruktur_pendukung", label: "Infrastruktur Pendukung", tables: ["hidran", "rantai_pasok", "reklame", "titik_bm"] },
  { id: "jaringan_drainase", label: "Jaringan Drainase", tables: ["inlet", "manhole_drainase", "sumur_resapan", "zona_drainase","saluran_air_hujan"] },
  { id: "jaringan_fiber_optik", label: "Jaringan Fiber Optik", tables: ["kabel_fo", "manhole_fo", "tiang_fo"] },
  { id: "jaringan_ipal", label: "Jaringan Instalasi Pengolahan Air Limbah", tables: ["manhole_sal", "pipa_glontor", "pipa_induk", "pipa_lateral"] },
  { id: "jaringan_jalan", label: "Jaringan Jalan", tables: ["jalan_kota", "jalan_lingkungan", "jalur_pemandu", "jembatan", "trotoar","jalan_inspeksi"] },
  { id: "jaringan_listrik", label: "Jaringan Listrik", tables: ["tegangan_menengah", "tegangan_rendah", "rumah_kabel", "tiang_listrik", "trafo_listrik"] },
  { id: "jaringan_pdam", label: "Jaringan PDAM", tables: ["jaringan_pdam"] },
  { id: "sungai", label: "Sungai", tables: ["sungai","talud_sungai"] },
] as const;

const LABELS: Record<string, string> = {
  cermin_jalan: "Cermin Jalan", kamera_pengawas: "Kamera Pengawas", lampu_jalan: "Lampu Jalan", lampu_lalin: "Lampu Lalu Lintas", rambu_lalin: "Rambu Lalu Lintas",
  titik_halte: "Titik Halte", jalur_halte: "Jalur Halte Trans", hidran: "Hidran", rantai_pasok: "Rantai Pasok", reklame: "Reklame", titik_bm: "Titik Bench Mark",
  inlet: "Inlet", manhole_drainase: "Manhole Drainase", sumur_resapan: "Sumur Resapan", zona_drainase: "Zona Drainase", kabel_fo: "Kabel Fiber Optik", manhole_fo: "Manhole Fiber Optik", tiang_fo: "Tiang Fiber Optik",
  manhole_sal: "Manhole Saluran Air Limbah", pipa_glontor: "Pipa Glontor", pipa_induk: "Pipa Induk", pipa_lateral: "Pipa Lateral", jalan_kota: "Jalan Kota", jalan_lingkungan: "Jalan Lingkungan", jalur_pemandu: "Jalur Pemandu", jembatan: "Jembatan", trotoar: "Trotoar",
  tegangan_menengah: "Jaringan Kabel Listrik Tegangan Menengah", tegangan_rendah: "Jaringan Kabel Listrik Tegangan Rendah", rumah_kabel: "Rumah Kabel", tiang_listrik: "Tiang Listrik", trafo_listrik: "Trafo Listrik", jaringan_pdam: "Jaringan PDAM", sungai: "Sungai",
};

// Diambil dari pemetaan primary key pada update_proses.php versi lama.
const PRIMARY_KEYS: Record<string, string> = {
  cermin_jalan: "id", kamera_pengawas: "id", lampu_jalan: "id", lampu_lalin: "id", rantai_pasok: "id", rambu_lalin: "id", reklame: "id_reklame", titik_bm: "id", hidran: "id", sumur_resapan: "id", inlet: "id", zona_drainase: "id", manhole_drainase: "id", manhole_fo: "id", tiang_fo: "id", kabel_fo: "id", manhole_sal: "id", pipa_glontor: "id", pipa_induk: "id", pipa_lateral: "id", jalan_kota: "id_jalan", jalan_lingkungan: "id_jalan", jalur_pemandu: "id", jembatan: "id", trotoar: "id_trotoar", rumah_kabel: "id", tegangan_menengah: "id_tm", tegangan_rendah: "id_tr", tiang_listrik: "id", trafo_listrik: "id", jaringan_pdam: "id_pdam", titik_halte: "id", jalur_halte: "id", sungai: "id",
};

const ALLOWED_TABLES = new Set<string>(GROUPS.flatMap((group) => [...group.tables]));
const quoteIdent = (value: string) => `"${value.replaceAll('"', '""')}"`;
const jsonError = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

async function requireUser() {
  const user = await getSession();
  return user;
}

async function getColumns(client: PoolClient, table: string) {
  const result = await client.query(
    `SELECT column_name, data_type, udt_name, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position`,
    [table],
  );
  return result.rows as Array<{ column_name: string; data_type: string; udt_name: string; is_nullable: string; column_default: string | null }>;
}

async function getGeometryColumn(client: PoolClient, table: string) {
  const result = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
        AND (udt_name = 'geometry' OR column_name IN ('geometri', 'geom', 'geometry'))
      ORDER BY CASE column_name WHEN 'geometri' THEN 0 WHEN 'geom' THEN 1 WHEN 'geometry' THEN 2 ELSE 3 END
      LIMIT 1`,
    [table],
  );
  return result.rows[0]?.column_name as string | undefined;
}

async function writeAccessLog(client: PoolClient, user: { username: string; unit: string }, action: string, detail: string, request: NextRequest) {
  // Log akses bersifat tambahan: kegagalan tabel log_akses tidak membatalkan perubahan data.
  await client.query("SAVEPOINT sitijo_access_log");
  try {
    await client.query(
      `INSERT INTO public.log_akses (username, unit, menu, aksi, keterangan, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.username, user.unit, "update", action, detail, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "", request.headers.get("user-agent") || ""],
    );
    await client.query("RELEASE SAVEPOINT sitijo_access_log");
  } catch (error) {
    await client.query("ROLLBACK TO SAVEPOINT sitijo_access_log");
    await client.query("RELEASE SAVEPOINT sitijo_access_log");
    console.warn("Log akses tidak tersimpan:", error instanceof Error ? error.message : error);
  }
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  if (!user) return jsonError("Sesi berakhir. Silakan masuk kembali.", 401);

  const table = request.nextUrl.searchParams.get("table") || "";
  if (!table) return NextResponse.json({ groups: GROUPS, labels: LABELS });
  if (!ALLOWED_TABLES.has(table)) return jsonError("Subkelas tidak diizinkan.", 400);

  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(10, Number(request.nextUrl.searchParams.get("limit") || 25)));
  const search = (request.nextUrl.searchParams.get("search") || "").trim().slice(0, 120);
  const offset = (page - 1) * limit;
  const client = await getPool().connect();

  try {
    const columns = await getColumns(client, table);
    if (!columns.length) return jsonError(`Tabel public.${table} tidak ditemukan.`, 404);
    const pk = PRIMARY_KEYS[table];
    if (!pk || !columns.some((column) => column.column_name === pk)) return jsonError(`Primary key ${table} belum sesuai dengan struktur database.`, 500);
    const geometryColumn = await getGeometryColumn(client, table);
    const editableColumns = columns.filter((column) =>
      column.column_name !== pk &&
      !["geometri", "geom", "geometry", "geojson"].includes(column.column_name.toLowerCase()) &&
      !column.column_default?.toLowerCase().startsWith("nextval(") &&
      column.udt_name !== "geometry" &&
      column.udt_name !== "geography" &&
      column.udt_name !== "jsonb" &&
      column.udt_name !== "json"
    );

    const searchable = columns.filter((column) => !["geometri", "geom", "geometry"].includes(column.column_name.toLowerCase()) && ["text", "character varying", "character", "integer", "bigint", "numeric"].includes(column.data_type));
    const whereParts: string[] = [];
    const params: unknown[] = [];
    if (search) {
      const term = `%${search}%`;
      const expressions = searchable.map((column) => {
        params.push(term);
        return `CAST(${quoteIdent(column.column_name)} AS TEXT) ILIKE $${params.length}`;
      });
      if (expressions.length) whereParts.push(`(${expressions.join(" OR ")})`);
    }
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
    const count = await client.query(`SELECT COUNT(*)::int AS total FROM public.${quoteIdent(table)} ${whereSql}`, params);
    const total = Number(count.rows[0]?.total || 0);

    const selectFields = columns.filter((column) => column.column_name !== geometryColumn).map((column) => quoteIdent(column.column_name));
    if (geometryColumn) selectFields.push(`ST_AsGeoJSON(${quoteIdent(geometryColumn)}) AS "__geometry"`);
    const rowParams = [...params, limit, offset];
    const rowsResult = await client.query(
      `SELECT ${selectFields.join(", ")} FROM public.${quoteIdent(table)} ${whereSql}
       ORDER BY ${quoteIdent(pk)}::text LIMIT $${rowParams.length - 1} OFFSET $${rowParams.length}`,
      rowParams,
    );
    const rows = rowsResult.rows.map((row) => {
      const { __geometry, ...properties } = row;
      let geometry: unknown = null;
      if (typeof __geometry === "string") {
        try { geometry = JSON.parse(__geometry); } catch { geometry = null; }
      } else if (__geometry && typeof __geometry === "object") geometry = __geometry;
      return { ...properties, __geometry: geometry };
    });

    return NextResponse.json({
      table,
      label: LABELS[table] || table,
      primaryKey: pk,
      columns: columns.map((column) => ({ name: column.column_name, type: column.data_type, editable: editableColumns.some((item) => item.column_name === column.column_name) })),
      rows,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      geometryColumn: geometryColumn || null,
    });
  } catch (error) {
    console.error("GET update data error:", error);
    return jsonError("Gagal mengambil data. Periksa koneksi database dan struktur tabel.", 500);
  } finally {
    client.release();
  }
}

export async function PATCH(request: NextRequest) {
  const user = await requireUser();
  if (!user) return jsonError("Sesi berakhir. Silakan masuk kembali.", 401);
  let body: { table?: string; id?: string | number; values?: Record<string, unknown> };
  try { body = await request.json(); } catch { return jsonError("Format permintaan tidak valid."); }
  const table = String(body.table || "");
  const id = body.id;
  const values = body.values;
  if (!ALLOWED_TABLES.has(table)) return jsonError("Subkelas tidak diizinkan.");
  if (id === undefined || id === null || String(id).trim() === "") return jsonError("ID data tidak ditemukan.");
  if (!values || typeof values !== "object" || Array.isArray(values)) return jsonError("Tidak ada atribut yang dikirim.");

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const columns = await getColumns(client, table);
    const pk = PRIMARY_KEYS[table];
    if (!columns.some((column) => column.column_name === pk)) throw new Error(`Primary key ${pk} tidak ditemukan.`);
    const geometryColumn = await getGeometryColumn(client, table);
    const allowed = new Set(columns.filter((column) => column.column_name !== pk && column.column_name !== geometryColumn && !["geometri", "geom", "geometry"].includes(column.column_name.toLowerCase()) && !column.column_default?.toLowerCase().startsWith("nextval(") && column.udt_name !== "json" && column.udt_name !== "jsonb").map((column) => column.column_name));
    const entries = Object.entries(values).filter(([key, value]) => allowed.has(key) && (value === null || ["string", "number", "boolean"].includes(typeof value)));
    if (!entries.length) throw new Error("Tidak ada atribut yang dapat diperbarui.");
    const setSql = entries.map(([key], index) => `${quoteIdent(key)} = $${index + 1}`).join(", ");
    const params = entries.map(([, value]) => value);
    params.push(String(id));
    const updated = await client.query(
      `UPDATE public.${quoteIdent(table)} SET ${setSql} WHERE ${quoteIdent(pk)}::text = $${params.length} RETURNING ${quoteIdent(pk)}::text AS id`,
      params,
    );
    if (!updated.rowCount) throw new Error("Data tidak ditemukan atau tidak berubah.");
    await writeAccessLog(client, user, "Update", `Mengubah data ID ${id} di ${table}. Kolom: ${entries.map(([key]) => key).join(", ")}`, request);
    await client.query("COMMIT");
    return NextResponse.json({ success: true, message: "Data berhasil diperbarui." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("PATCH update data error:", error);
    return jsonError(error instanceof Error ? error.message : "Gagal memperbarui data.", 400);
  } finally { client.release(); }
}

export async function DELETE(request: NextRequest) {
  const user = await requireUser();
  if (!user) return jsonError("Sesi berakhir. Silakan masuk kembali.", 401);
  let body: { table?: string; id?: string | number; nama_penghapus?: string; unit_penghapus?: string; alasan_penghapusan?: string };
  try { body = await request.json(); } catch { return jsonError("Format permintaan tidak valid."); }
  const table = String(body.table || "");
  const id = body.id;
  const name = String(body.nama_penghapus || "").trim();
  const unit = String(body.unit_penghapus || "").trim();
  const reason = String(body.alasan_penghapusan || "").trim();
  if (!ALLOWED_TABLES.has(table)) return jsonError("Subkelas tidak diizinkan.");
  if (id === undefined || id === null || String(id).trim() === "") return jsonError("ID data tidak ditemukan.");
  if (!name || !unit || !reason) return jsonError("Nama, unit/bidang, dan alasan penghapusan wajib diisi.");

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const columns = await getColumns(client, table);
    const pk = PRIMARY_KEYS[table];
    if (!columns.some((column) => column.column_name === pk)) throw new Error(`Primary key ${pk} tidak ditemukan.`);
    const removed = await client.query(
      `DELETE FROM public.${quoteIdent(table)} WHERE ${quoteIdent(pk)}::text = $1 RETURNING ${quoteIdent(pk)}::text AS id`,
      [String(id)],
    );
    if (!removed.rowCount) throw new Error("Data tidak ditemukan atau sudah dihapus.");
    await client.query(
      `INSERT INTO public.log_penghapusan (
         subkelas,
         id_data,
         nama_penghapus,
         unit_penghapus,
         alasan_penghapusan,
         waktu
       )
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [table, String(id), name, unit, reason],
    );
    await writeAccessLog(client, user, "Hapus", `Menghapus data ID ${id} dari ${table}. Nama: ${name}. Unit: ${unit}. Alasan: ${reason}`, request);
    await client.query("COMMIT");
    return NextResponse.json({ success: true, message: "Data berhasil dihapus dan alasan penghapusan telah dicatat." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("DELETE update data error:", error);
    const message = error instanceof Error ? error.message : "Gagal menghapus data.";
    if (/foreign key/i.test(message)) return jsonError("Data tidak dapat dihapus karena masih digunakan oleh data lain.", 409);
    if (/permission denied/i.test(message)) return jsonError("Database tidak memberikan izin untuk menghapus data.", 403);
    if (/log_penghapusan/i.test(message)) return jsonError("Penghapusan dibatalkan karena tabel log_penghapusan belum tersedia atau strukturnya berbeda.", 500);
    return jsonError(message, 400);
  } finally { client.release(); }
}
