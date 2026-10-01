import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/data";
import { ingererCourriel, lireRfc822 } from "@/lib/intake/courriel";
import { direLeRefus } from "@/lib/intake/refus";
import { brutDuCourriel, resendWebhookConfigured, signatureValide } from "@/lib/intake/webhook-resend";

/**
 * Le courrier entrant par Resend : « email.received » → Messages et À valider.
 *
 * POURQUOI UNE SECONDE PORTE. L'autre route attend un jeton `Bearer` qu'un
 * Worker pose lui-même ; Resend signe à sa façon, avec trois en-têtes Svix. Ce
 * sont deux preuves d'identité différentes pour le même courrier, alors la
 * preuve se fait ici et le traitement est celui de `intake/courriel.ts`, partagé.
 *
 * LE REFUS SE DIT. Un jeton désaccordé sur l'autre route échouait en silence :
 * aucune trace, et le desk voyait seulement que rien n'arrivait, pendant des
 * semaines s'il le fallait. C'est le même motif que la clef VAPID absente, qui
 * s'est cachée des mois parce que l'écran accusait le navigateur. Ici chaque
 * refus écrit une ligne au flux : un désaccord se voit le jour même.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface EvenementResend {
  type?: string;
  data?: { email_id?: string; from?: string; subject?: string };
}

export async function POST(req: NextRequest) {
  if (!resendWebhookConfigured()) return NextResponse.json({ error: "RESEND_WEBHOOK_SECRET ou RESEND_API_KEY absente" }, { status: 503 });

  // Le corps BRUT, avant toute analyse : re-sérialiser le JSON déplacerait un
  // espace et la signature ne tomberait plus.
  const corps = await req.text();
  const signee = signatureValide(corps, { id: req.headers.get("svix-id"), timestamp: req.headers.get("svix-timestamp"), signature: req.headers.get("svix-signature") });
  if (!signee) {
    await direLeRefus("Courrier entrant <b>refusé</b> : signature Resend invalide ou périmée");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const ev = JSON.parse(corps) as EvenementResend;
  // Resend enverra d'autres événements sur la même adresse : on acquitte sans
  // rien faire, sinon il réessaie en boucle ce qu'on ne traite pas.
  if (ev.type !== "email.received") return NextResponse.json({ ok: true, ignore: ev.type ?? "inconnu" });
  const id = ev.data?.email_id;
  if (!id) return NextResponse.json({ ok: true, ignore: "sans identifiant" });

  try {
    const mail = await lireRfc822(await brutDuCourriel(id));
    const issue = await ingererCourriel(mail);
    return NextResponse.json({ ok: true, ...issue });
  } catch (e) {
    // Un courriel perdu en silence est le défaut qu'on vient de fermer : la
    // panne se nomme, avec l'expéditeur, pour que le desk sache quoi redemander.
    const quoi = e instanceof Error ? e.message : "échec inconnu";
    await repo()
      .logEvent({ kind: "system", html: `Courrier de ${ev.data?.from ?? "expéditeur inconnu"} <b>non traité</b> : ${quoi}` })
      .catch(() => undefined);
    return NextResponse.json({ ok: false, error: quoi }, { status: 502 });
  }
}
