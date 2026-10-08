"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { attenteAvantRenvoi, empreinte, nouveauCode, verifier } from "@/lib/signature/code";
import { ordreSignable } from "@/lib/domain/intent";
import type { Intent } from "@/lib/domain/types";

export type OrdreResult = { ok: true; message?: string; code?: string } | { ok: false; error: string };

const chemin = (id: string) => `/moi/ordres/${id}`;

/** L'ordre du client, et lui seul : une signature ne se donne pas pour autrui. */
async function monOrdre(id: string): Promise<{ intent: Intent; userId: string } | null> {
  const s = await requireSession(chemin(id));
  const intent = (await repo().listIntents()).find((i) => i.id === id);
  if (!intent || intent.clientId !== s.userId) return null;
  return { intent, userId: s.userId };
}


export async function envoyerCodeOrdreAction(_p: OrdreResult | null, form: FormData): Promise<OrdreResult> {
  const id = String(form.get("id") ?? "");
  const mien = await monOrdre(id);
  if (!mien) return { ok: false, error: "Ordre introuvable." };
  const { intent, userId } = mien;
  if (intent.signedAt) return { ok: false, error: "Cet ordre est déjà signé." };
  if (!ordreSignable(intent)) return { ok: false, error: "Cet ordre ne se signe plus ici : le desk l'a déjà pris en main." };
  const attente = attenteAvantRenvoi(intent.pendingCodeAt);
  if (attente) return { ok: false, error: `Un code vient de partir. Attendez ${attente} secondes avant d'en demander un autre.` };

  const r = repo();
  const file = await r.getClientFileByUser(userId);
  if (!file) return { ok: false, error: "Dossier introuvable." };
  const { canalDuCode, nommerCanal } = await import("@/lib/kyc/canal");
  const canal = await canalDuCode(userId, file);
  const code = nouveauCode();
  const { notifyCode } = await import("@/lib/kyc/notify");
  const envoi = await notifyCode(file, code, canal);
  /* L'ancien code n'est remplacé que si le nouveau est bien parti : un envoi
     refusé brûlerait celui que le client a peut-être sous les yeux. */
  if (envoi.via === "echec") return { ok: false, error: `Le code n'a pas pu partir vers ${envoi.to} : ${envoi.raison}. Réessayez dans un instant.` };
  await r.updateIntent(intent.id, { pendingCodeHash: empreinte(code), pendingCodeAt: new Date().toISOString(), pendingCodeTries: 0, pendingCodeTo: canal?.to });
  revalidatePath(chemin(id));
  if (envoi.via === "demo") return { ok: true, message: "Mode démonstration : le code s'affiche ci-dessous.", code };
  return { ok: true, message: `Code envoyé par ${nommerCanal(canal)}.` };
}

export async function signerOrdreAction(_p: OrdreResult | null, form: FormData): Promise<OrdreResult> {
  const id = String(form.get("id") ?? "");
  const mien = await monOrdre(id);
  if (!mien) return { ok: false, error: "Ordre introuvable." };
  const { intent } = mien;
  if (intent.signedAt) return { ok: true, message: "Cet ordre est déjà signé." };
  if (!ordreSignable(intent)) return { ok: false, error: "Cet ordre ne se signe plus ici : le desk l'a déjà pris en main." };

  const verdict = verifier(String(form.get("code") ?? ""), { hash: intent.pendingCodeHash, at: intent.pendingCodeAt, tries: intent.pendingCodeTries, to: intent.pendingCodeTo });
  const r = repo();
  if (!verdict.ok) {
    if (verdict.essais !== (intent.pendingCodeTries ?? 0)) {
      await r.updateIntent(intent.id, { pendingCodeTries: verdict.essais });
      revalidatePath(chemin(id));
    }
    return { ok: false, error: verdict.erreur };
  }

  /* Le document se produit MAINTENANT, parce que c'est maintenant qu'il est
     signé : il porte donc la signature, au lieu d'un bloc vide que le desk
     cocherait plus tard. Le code consommé disparaît, il ne se rejoue pas. */
  const { generateForIntent } = await import("@/lib/documents/generate");
  const doc = await generateForIntent(intent.type === "rachat" ? "cession" : "bulletin", intent.id);
  await r.updateIntent(intent.id, {
    signedAt: new Date().toISOString(),
    signedMethod: "code à usage unique",
    signedTo: intent.pendingCodeTo,
    orderDocId: doc.id,
    pendingCodeHash: undefined,
    pendingCodeAt: undefined,
    pendingCodeTries: 0,
    pendingCodeTo: undefined,
  });
  await r.logEvent({ kind: "intent", intentId: intent.id, html: `<b>Ordre signé</b> par ${intent.clientName} · ${intent.ref} · ${doc.number}` });
  revalidatePath(chemin(id));
  revalidatePath("/desk");
  return { ok: true, message: "Ordre signé. Votre exemplaire est dans vos documents." };
}
