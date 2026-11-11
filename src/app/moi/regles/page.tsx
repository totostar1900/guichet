import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { fmt, fmtDate, localIso } from "@/lib/format";
import { nextRun, STANDING_STATE_LABEL } from "@/lib/domain/standing";
import { paiementDeLEpargne } from "@/lib/domain/mandat";
import { prochaineEcheance } from "@/lib/domain/prelevement";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Ce qui part tout seul") };
}

/**
 * « CE QUI PART TOUT SEUL » : CE QUI EST DÉJÀ EN PLACE (10 novembre 2026, planche « Les mouvements d'argent », 2B).
 *
 * Un prélèvement mensuel, une épargne programmée et un réinvestissement de coupons sont trois règles automatiques, qui vivaient dans trois pages sans vue commune : « qu'est-ce qui part ce mois-ci ? » n'avait pas de réponse en un endroit.
 * La page les rassemble avec leur état et leur prochaine date ; chaque ligne mène à la page où elle se gère (modifier, arrêter) : aucune écriture ici, donc rien à auditer. Ce que l'on peut FAIRE est sur la page sœur « Mon argent » (2A).
 */
export default async function ReglesPage() {
  const t = await getT();
  const s = await requireSession("/moi/regles");
  const r = repo();
  const [mandats, standing, offers] = await Promise.all([r.listMandats(s.userId).catch(() => []), r.listStandingOrders(s.userId).catch(() => []), r.listOffers().catch(() => [])]);
  const aujourdHui = localIso(new Date());
  const titre = (id: string) => offers.find((o) => o.id === id)?.title ?? id;

  const prelevements = mandats.filter((m) => m.state !== "revoque").map((m) => {
    /* Un mandat d'épargne prend le jour, la prochaine échéance et le fonds de l'épargne qu'il paie (audit « signature du mandat d'une épargne », 11 novembre 2026). */
    const epargne = m.standingId ? standing.find((x) => x.id === m.standingId) : undefined;
    const jour = m.dayOfMonth ?? epargne?.dayOfMonth;
    const prochain = m.signedAt && m.state === "actif" ? (m.dayOfMonth ? prochaineEcheance(m.dayOfMonth, aujourdHui) : epargne ? (nextRun(epargne, aujourdHui) ?? undefined) : undefined) : undefined;
    const etat = !m.signedAt ? t("à signer") : m.state === "suspendu" ? t("arrêté") : t("actif");
    return {
      id: m.id,
      nom: m.objet === "provision" ? t("Prélèvement vers ma provision") : epargne ? t("Prélèvement vers {f}", { f: titre(epargne.offerId) }) : t("Prélèvement vers mon épargne programmée"),
      dit: [t("{m} FCFA", { m: fmt(m.amount) }), jour ? t("le {j} de chaque mois", { j: String(jour) }) : undefined, prochain ? t("prochain le {d}", { d: fmtDate(prochain, false) }) : undefined].filter(Boolean).join(" · "),
      etat,
      actif: Boolean(m.signedAt) && m.state === "actif",
    };
  });
  const epargnes = standing
    .filter((x) => x.source === "virement" && (x.state === "active" || x.state === "suspendue"))
    .map((x) => {
      const prochain = nextRun(x, aujourdHui);
      return {
        id: x.id,
        nom: t("Épargne vers {f}", { f: titre(x.offerId) }),
        dit: [t("{m} FCFA", { m: fmt(x.amount) }), t("le {j} de chaque mois", { j: String(x.dayOfMonth) }), prochain ? t("prochain le {d}", { d: fmtDate(prochain, false) }) : undefined].filter(Boolean).join(" · "),
        /* Une épargne dont le mandat attend sa signature n'est pas « active » : rien ne sera prélevé. */
        etat: x.state === "active" && paiementDeLEpargne(x.id, mandats) === "mandat_a_signer" ? t("En attente du mandat") : t(STANDING_STATE_LABEL[x.state]),
        actif: x.state === "active" && paiementDeLEpargne(x.id, mandats) !== "mandat_a_signer",
      };
    });
  const reinvest = standing
    .filter((x) => x.source === "encaissements" && x.state === "active")
    .map((x) => ({ id: x.id, nom: t("Coupons replacés vers {f}", { f: titre(x.offerId) }), dit: t("Chaque coupon reçu est replacé automatiquement."), etat: t("Active"), actif: true }));

  const sections = [
    { cle: "prelevements", titre: t("Prélèvements"), lignes: prelevements, href: "/moi/prelevements?de=regles", vide: t("Aucun prélèvement en place."), ajouter: t("Autoriser un prélèvement") },
    { cle: "epargnes", titre: t("Épargnes programmées"), lignes: epargnes, href: "/moi/epargne", vide: t("Aucune épargne en place."), ajouter: t("Programmer une épargne") },
    { cle: "coupons", titre: t("Réinvestissement des coupons"), lignes: reinvest, href: "/moi/reinvestir", vide: t("Rien en place."), ajouter: t("Réinvestir mes coupons") },
  ];
  const total = sections.reduce((n, x) => n + x.lignes.filter((l) => l.actif).length, 0);

  return (
    <Glissement>
      <div className={`pile ${styles.page}`}>
        <EnTete
          surTitre={t("Mon argent chez nous")}
          titre={t("Ce qui part tout seul")}
          phrase={total === 0 ? t("Rien ne part tout seul pour l'instant.") : total === 1 ? t("Une règle automatique est en place.") : t("{n} règles automatiques sont en place.", { n: String(total) })}
        />
        {sections.map((x) => (
          <section key={x.cle} className={styles.groupe} aria-label={x.titre}>
            <h2 className={styles.titre}>{x.titre}</h2>
            {x.lignes.length > 0 ? (
              <div className={styles.lignes}>
                {x.lignes.map((l) => (
                  <Link key={l.id} href={x.href} className={styles.ligne}>
                    <span>
                      <b>{l.nom}</b>
                      <small>{l.dit}</small>
                    </span>
                    <em className={l.actif ? styles.actif : styles.autre}>{l.etat}</em>
                  </Link>
                ))}
              </div>
            ) : (
              <p className={styles.vide}>{x.vide}</p>
            )}
            <Link href={x.href} className={styles.ajouter}>
              {x.lignes.length > 0 ? t("Gérer") : x.ajouter} →
            </Link>
          </section>
        ))}
        <Link href="/moi/argent" className={styles.pied}>
          {t("Mon argent : verser, retirer, placer")} →
        </Link>
      </div>
    </Glissement>
  );
}
