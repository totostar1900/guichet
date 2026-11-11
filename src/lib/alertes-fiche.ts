import "server-only";
import { repo } from "@/lib/data";
import { cleDeSerie, PLAFOND_SEUILS, valeurSurveillee } from "@/lib/domain/alertes";
import type { Offer } from "@/lib/domain/types";

/** Ce que la cloche d'une fiche montre : la série d'une séance, ou le seuil d'un chiffre, avec ce que le client a déjà armé (planche « Alertes de séance et de seuil »). */
export async function alertesDeLaFiche(o: Offer, userId?: string) {
  const cle = cleDeSerie(o);
  const v = valeurSurveillee(o);
  if (!cle && !v) return undefined;
  const [series, seuils] = userId ? await Promise.all([repo().listSerieFollows(userId).catch(() => []), repo().listThresholdAlerts(userId).catch(() => [])]) : [[], []];
  const actives = seuils.filter((a) => a.state === "active");
  return {
    serie: cle ? { label: cle.label, suivie: series.some((f) => f.country === cle.country && f.kind === cle.kind) } : null,
    seuil: v ? { metric: v.metric, nom: v.nom, valeur: v.valeur, unite: v.unite, actives: actives.filter((a) => a.offerId === o.id).map((a) => ({ id: a.id, sens: a.sens, value: a.value })), plafondAtteint: actives.length >= PLAFOND_SEUILS } : null,
  };
}
