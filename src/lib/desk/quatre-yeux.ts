import "server-only";
import { audit } from "@/lib/audit";
import { isResponsable, type Session } from "@/lib/auth/types";
import { repo } from "@/lib/data";

/**
 * QUATRE YEUX : DEUX PERSONNES, PAS DEUX RÔLES.
 *
 * Le contrôle existait et ne s'appliquait pas à ceux qui en avaient le plus
 * besoin. Chaque geste sensible se gardait ainsi :
 *
 *     if (reason && !isResponsable(desk)) { …proposer à un responsable… }
 *
 * Un responsable passait donc TOUJOURS seul, quelle que soit la sensibilité
 * du geste. Avec un desk de deux responsables, le contrôle ne se déclenchait
 * jamais : la file d'approbations restait vide, et tout le monde croyait le
 * contrôle en place. Audité le 26 septembre 2026, laissé en l'état sur
 * décision de la maison, repris le 10 octobre.
 *
 * LA RÈGLE EST MAINTENANT CELLE DE LA FILE : « la personne qui propose ne
 * peut pas approuver » (voir decideApprovalAction). Elle ne regarde pas le
 * rôle, elle regarde la personne. Un responsable propose donc comme les
 * autres, et c'est un AUTRE responsable qui écrit.
 *
 * ET QUAND IL N'Y A PERSONNE D'AUTRE ? Un contrôle à quatre yeux dans une
 * maison qui n'a qu'un responsable est un contrôle impossible, pas un
 * contrôle à inventer. Le geste passe, et il SE DIT : audit dédié, ligne au
 * journal du desk, et compteur en Santé. C'est la doctrine des pannes
 * muettes appliquée à un contrôle : un comportement voulu doit se dire aussi,
 * sinon personne ne sait qu'il a eu lieu.
 *
 * Ce qui ne change pas : un opérateur ne passe jamais seul, même s'il n'y a
 * aucun responsable en poste. Sa proposition attend, et c'est juste : le
 * contrôle manquant est alors un problème d'effectif, pas une permission.
 */
export type VerdictQuatreYeux =
  /** Rien de sensible : la main de la personne suffit. */
  | { quoi: "passe" }
  /** Ça part en file d'approbation, et quelqu'un d'autre écrira. */
  | { quoi: "attend"; raison: string }
  /** Personne d'autre ne peut approuver : ça passe, et ça se dit. */
  | { quoi: "seul"; raison: string; motif: string };

/** Le geste de `desk` doit-il attendre un second regard ? `reason` est la raison de sensibilité, ou rien. */
export async function quatreYeux(desk: Session, reason: string | undefined | null): Promise<VerdictQuatreYeux> {
  if (!reason) return { quoi: "passe" };
  if (!isResponsable(desk)) return { quoi: "attend", raison: reason };
  /* Qui d'autre pourrait approuver ? La file exige un responsable, et interdit
     à celui qui propose d'approuver : il faut donc un SECOND responsable. */
  /* On compare les NOMS, comme la file : elle refuse l'approbation quand
     « a.requestedBy === me.name ». Comparer ici par identifiant et là par nom
     donnerait deux réponses différentes à la même question, et c'est la pire
     des deux erreurs possibles. */
  const staff = await repo().listStaff().catch(() => []);
  const autres = staff.filter((m) => m.role === "responsable" && m.name !== desk.name);
  if (autres.length > 0) return { quoi: "attend", raison: reason };
  return { quoi: "seul", raison: reason, motif: "aucun autre responsable en poste" };
}

/**
 * Dire le geste passé sans contrôle : c'est tout ce qui sépare une exception
 * assumée d'un trou. Le journal du desk le montre le jour même, l'audit le
 * garde, et Santé le compte (contrôle « quatre-yeux »).
 */
export async function direLeGestePasseSeul(desk: Session, quoi: string, entityId: string, raison: string, motif: string): Promise<void> {
  await audit("quatre_yeux.seul", "quatre-yeux", entityId, { after: { quoi, par: desk.name, motif }, reason: `${quoi} sans second regard : ${raison} · ${motif}` });
  await repo().logEvent({ kind: "desk", html: `<b>${quoi}</b> : passé sans second regard (${motif}) · ${raison} · par ${desk.name}` });
}
