"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { repo } from "@/lib/data";
import { noter } from "@/lib/journal";
import { cleDeSerie, PLAFOND_SEUILS, valeurSurveillee, type SensDeSeuil } from "@/lib/domain/alertes";

/**
 * LES ALERTES DE MARCHÉ, ÉCRITES PAR LE CLIENT (planche « Alertes de séance et de seuil », 1B et 2A).
 *
 * Aucune n'engage d'argent : ce sont des préférences de message. Elles passent pourtant par « audit » (avant, après) comme toute écriture du client sur son dossier, et par le journal des gestes.
 */
export type AlerteResult = { ok: true; message: string } | { ok: false; error: string };

const rafraichir = (offerId?: string) => {
  if (offerId) revalidatePath(`/offres/${offerId}`);
  revalidatePath("/moi/suivies");
};

/** Suivre, ou ne plus suivre, la série d'une séance : le même Trésor et le même instrument, toutes durées. */
export async function suivreLaSerie(offerId: string, on: boolean): Promise<AlerteResult & { suivie?: boolean }> {
  const s = await getSession();
  if (!s) return { ok: false, error: "Connectez-vous pour être prévenu de la prochaine séance." };
  const r = repo();
  const o = await r.getOffer(offerId);
  const cle = o ? cleDeSerie(o) : null;
  if (!o || !cle) return { ok: false, error: "Cette ligne n'est pas une séance : il n'y a pas de série à suivre." };
  if (on) {
    const f = await r.addSerieFollow(s.userId, cle);
    await audit("serie.suivre", "serie", f.id, { after: { country: f.country, kind: f.kind } });
    await noter("serie.suivie", { objet: cle.label, detail: o.title });
  } else {
    const siens = await r.listSerieFollows(s.userId);
    const f = siens.find((x) => x.country === cle.country && x.kind === cle.kind);
    if (f) {
      await r.removeSerieFollow(s.userId, f.id);
      await audit("serie.arreter", "serie", f.id, { before: { country: f.country, kind: f.kind } });
      await noter("serie.delaissee", { objet: cle.label });
    }
  }
  rafraichir(offerId);
  return { ok: true, suivie: on, message: cle.label };
}

export async function arreterLaSerie(id: string): Promise<AlerteResult> {
  const s = await getSession();
  if (!s) return { ok: false, error: "Connectez-vous d'abord." };
  const r = repo();
  const f = (await r.listSerieFollows(s.userId)).find((x) => x.id === id);
  if (!f) return { ok: false, error: "Cette série n'est plus suivie." };
  await r.removeSerieFollow(s.userId, id);
  await audit("serie.arreter", "serie", id, { before: { country: f.country, kind: f.kind } });
  await noter("serie.delaissee", { objet: f.label });
  rafraichir();
  return { ok: true, message: f.label };
}

/** Le nombre, écrit comme le client l'écrit : « 85 000 », « 6,5 ». */
const nombre = (texte: string): number => Number(texte.replace(/[\s  ]/g, "").replace(",", "."));

/** Armer un seuil : au-dessus ou en dessous d'une valeur, sur le chiffre que la ligne porte (cours, rendement ou valeur liquidative). */
export async function armerUnSeuil(offerId: string, sens: SensDeSeuil, texte: string): Promise<AlerteResult> {
  const s = await getSession();
  if (!s) return { ok: false, error: "Connectez-vous pour armer une alerte." };
  if (sens !== "au_dessus" && sens !== "en_dessous") return { ok: false, error: "Choisissez si l'alerte se déclenche au-dessus ou en dessous." };
  const valeur = nombre(texte);
  if (!Number.isFinite(valeur) || valeur <= 0) return { ok: false, error: "Indiquez le niveau à surveiller, en chiffres." };
  const r = repo();
  const o = await r.getOffer(offerId);
  const v = o ? valeurSurveillee(o) : null;
  if (!o || !v) return { ok: false, error: "Cette ligne n'a pas de chiffre à surveiller." };
  const siennes = (await r.listThresholdAlerts(s.userId)).filter((a) => a.state === "active");
  if (siennes.length >= PLAFOND_SEUILS) return { ok: false, error: "Vous avez déjà 10 alertes de seuil actives : annulez-en une avant d'en armer une autre." };
  if (siennes.some((a) => a.offerId === offerId && a.metric === v.metric && a.sens === sens && a.value === valeur)) return { ok: false, error: "Cette alerte est déjà armée." };
  const a = await r.addThresholdAlert({ userId: s.userId, offerId, metric: v.metric, sens, value: valeur });
  await audit("seuil.armer", "seuil", a.id, { after: { offerId, metric: a.metric, sens: a.sens, value: a.value } });
  await noter("seuil.arme", { objet: offerId, detail: `${a.sens} ${a.value}` });
  rafraichir(offerId);
  return { ok: true, message: o.title };
}

export async function annulerUnSeuil(id: string): Promise<AlerteResult> {
  const s = await getSession();
  if (!s) return { ok: false, error: "Connectez-vous d'abord." };
  const r = repo();
  const a = (await r.listThresholdAlerts(s.userId)).find((x) => x.id === id);
  if (!a) return { ok: false, error: "Cette alerte n'existe plus." };
  await r.updateThresholdAlert(id, { state: "annulee" });
  await audit("seuil.annuler", "seuil", id, { before: { state: a.state }, after: { state: "annulee" } });
  await noter("seuil.annule", { objet: a.offerId });
  rafraichir(a.offerId);
  return { ok: true, message: a.offerId };
}

/** Remettre un seuil déclenché : la même alerte, de nouveau active. Si le chiffre est encore au-delà du niveau, elle sonnera au prochain passage du robot. */
export async function remettreUnSeuil(id: string): Promise<AlerteResult> {
  const s = await getSession();
  if (!s) return { ok: false, error: "Connectez-vous d'abord." };
  const r = repo();
  const toutes = await r.listThresholdAlerts(s.userId);
  const a = toutes.find((x) => x.id === id);
  if (!a) return { ok: false, error: "Cette alerte n'existe plus." };
  if (toutes.filter((x) => x.state === "active").length >= PLAFOND_SEUILS) return { ok: false, error: "Vous avez déjà 10 alertes de seuil actives : annulez-en une avant de la remettre." };
  await r.updateThresholdAlert(id, { state: "active", firedAt: undefined, firedValue: undefined });
  await audit("seuil.remettre", "seuil", id, { before: { state: a.state }, after: { state: "active" } });
  await noter("seuil.remis", { objet: a.offerId });
  rafraichir(a.offerId);
  return { ok: true, message: a.offerId };
}
