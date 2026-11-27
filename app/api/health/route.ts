
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json({
        ok: false,
        step: "environment",
        urlExists: !!url,
        keyExists: !!key,
        message: "Environment Supabase belum lengkap",
      });
    }

    const supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    if (error) {
      console.error("SUPABASE HEALTH ERROR:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      return NextResponse.json({
        ok: false,
        step: "database",
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }

    return NextResponse.json({
      ok: true,
      step: "database",
      message: "Koneksi Supabase berhasil",
      rowsFound: data.length,
    });
  } catch (error) {
    console.error("HEALTH CHECK ERROR:", error);

    return NextResponse.json({
      ok: false,
      step: "server",
      message: "Terjadi kesalahan server",
    });
  }
}
