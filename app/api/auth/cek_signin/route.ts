
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Konfigurasi Supabase belum lengkap.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function redirectToSignin(
  request: NextRequest,
  error: string
) {
  return NextResponse.redirect(
    new URL(`/signin?error=${error}`, request.url),
    303
  );
}

function safeRedirect(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }

  return value;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const username = String(
      formData.get("username") || ""
    ).trim();

    const password = String(
      formData.get("password") || ""
    );

    const remember =
      formData.get("remember") === "on";

    const redirectPath = safeRedirect(
      formData.get("redirect")?.toString() || "/peta"
    );

    if (!username || !password) {
      return redirectToSignin(request, "empty");
    }

    const supabase = getSupabase();

    // Cari akun berdasarkan username
    const { data: user, error } = await supabase
      .from("users")
      .select("username, password, unit")
      .eq("username", username)
      .maybeSingle();

    if (error) {
  console.error("Supabase login diagnostic:", {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });

  return redirectToSignin(request, "database");
}

    if (!user) {
      return redirectToSignin(request, "username");
    }

    // Verifikasi password hash PHP
    const passwordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordValid) {
      return redirectToSignin(request, "password");
    }

    // Buat session login
    await createSession(
      {
        username: user.username,
        unit: user.unit || "guest",
      },
      remember
    );

    return NextResponse.redirect(
      new URL(redirectPath, request.url),
      303
    );

  } catch (error) {
    console.error("Signin server error:", error);

    return redirectToSignin(request, "server");
  }
}
