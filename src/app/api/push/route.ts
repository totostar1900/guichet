import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { pushConfigured, sendPush } from "@/lib/notify/push";

/** A signed-in browser registers (POST), tests (PUT) or removes (DELETE) its push subscription. */
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

/**
 * « Envoyer un essai » : une notification vers les appareils de l'appelant.
 *
 * Toute la chaîne est invisible jusqu'au jour où elle sert, et c'est ainsi
 * qu'une clef absente s'est cachée des mois : le bouton accusait le navigateur
 * d'un défaut de configuration. L'essai la rend visible en un geste, et il dit
 * lequel des trois maillons manque, parce qu'ils échouent chacun autrement.
 *
 * Rien n'est écrit au journal des notifications : ce journal dit ce qui est
 * parti AUX CLIENTS, et un diagnostic n'y a pas sa place. Le verdict revient
 * dans la réponse, à celui qui l'a demandé. Le consentement est le clic même.
 */
export async function PUT() {
  const s = await getSession();
  if (!s || s.provider !== "supabase") return NextResponse.json({ error: "Connectez-vous d'abord." }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ error: "Les alertes ne sont pas encore ouvertes ici." }, { status: 503 });
  const subs = await repo().listPushSubscriptions([s.userId]);
  if (!subs.length) return NextResponse.json({ error: "Aucun appareil enregistré : activez les alertes d'abord." }, { status: 400 });

  // Un compte par appareil : un téléphone désinscrit ne doit pas faire croire
  // que la tablette n'a rien reçu.
  let envoyes = 0;
  let echec = "";
  for (const sub of subs) {
    try {
      await sendPush(sub, { title: "Essai d'alerte", body: "Vos alertes fonctionnent sur cet appareil.", url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/`, tag: "essai" });
      envoyes += 1;
    } catch (e) {
      echec = e instanceof Error ? e.message : "échec d'envoi";
    }
  }
  if (!envoyes) return NextResponse.json({ error: `Aucun envoi n'a abouti : ${echec}` }, { status: 502 });
  return NextResponse.json({ ok: true, envoyes, appareils: subs.length });
}

export async function DELETE(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Connectez-vous d'abord." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (body.endpoint) await repo().removePushSubscription(body.endpoint);
  return NextResponse.json({ ok: true });
}
