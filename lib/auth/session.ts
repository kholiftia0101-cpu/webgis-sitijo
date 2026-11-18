
import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export type SessionUser = {
  username: string;
  unit: string;
};

const SESSION_COOKIE = "sitijo_session";
const REMEMBER_COOKIE = "remember_user";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET belum diatur atau minimal 32 karakter."
    );
  }

  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

function createToken(
  user: SessionUser,
  expiresAt: number
): string {
  const payload = Buffer.from(
    JSON.stringify({ user, expiresAt })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string): SessionUser | null {
  try {
    const [payload, signature] = token.split(".");

    if (!payload || !signature) return null;

    const expected = sign(payload);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (
      !decoded.user?.username ||
      !decoded.expiresAt ||
      decoded.expiresAt <= Date.now()
    ) {
      return null;
    }

    return {
      username: decoded.user.username,
      unit: decoded.user.unit || "guest",
    };
  } catch {
    return null;
  }
}

export async function createSession(
  user: SessionUser,
  remember = false
): Promise<void> {
  const cookieStore = await cookies();

  const duration = remember
    ? 7 * 24 * 60 * 60 * 1000
    : 12 * 60 * 60 * 1000;

  const expiresAt = Date.now() + duration;

  cookieStore.set(
    SESSION_COOKIE,
    createToken(user, expiresAt),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(expiresAt),
    }
  );

  if (remember) {
    cookieStore.set(REMEMBER_COOKIE, user.username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
  } else {
    cookieStore.delete(REMEMBER_COOKIE);
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  return verifyToken(token);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(REMEMBER_COOKIE);
}
