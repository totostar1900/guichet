import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";

/** A signed-in browser registers (POST) or removes (DELETE) its push subscription. */
const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(10), auth: z.string().min(5) }),
});

export async function POST(req: NextRequest) {
  const s = await getSession();
  if (!s || s.provider !== "supabase") return NextResponse.json({ error: "Connectez-vous d'abord." }, { status: 401 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Abonnement invalide." }, { status: 400 });
  await repo().savePushSubscription({ userId: s.userId, endpoint: p.data.endpoint, keys: p.data.keys, userAgent: req.headers.get("user-agent")?.slice(0, 200) ?? undefined });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Connectez-vous d'abord." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (body.endpoint) await repo().removePushSubscription(body.endpoint);
  return NextResponse.json({ ok: true });
}
