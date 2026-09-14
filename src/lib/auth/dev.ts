import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Session } from "./types";

/**
 * Development session: a signed cookie, no external service.
 * Used only when Supabase is not configured. Never enable in production.
 */
export const DEV_COOKIE = "guichet_dev_session";
const secret = () => process.env.AUTH_SECRET ?? "guichet-dev-secret-change-me";

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeDevSession(s: Session): string {
  const payload = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeDevSession(value: string | undefined): Session | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    return s.provider === "dev" ? s : null;
  } catch {
    return null;
  }
}

export async function readDevSession(): Promise<Session | null> {
  const jar = await cookies();
  return decodeDevSession(jar.get(DEV_COOKIE)?.value);
}

export async function writeDevSession(s: Session): Promise<void> {
  const jar = await cookies();
  jar.set(DEV_COOKIE, encodeDevSession(s), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function clearDevSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(DEV_COOKIE);
}
