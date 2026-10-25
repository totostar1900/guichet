import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { repo } from "@/lib/data";
import { cashPosition } from "@/lib/domain/cash";
import { positionsFrom } from "@/lib/positions";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import { Rubriques } from "@/components/mobile/Rubriques";
import { estMonetaire } from "./monetaire";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { EnBref } from "@/components/EnBref";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("Votre provision") };
}

/**
 * LE DOMICILE DU SOLDE, ET RIEN QUE LE SOLDE.
 *
 * Le disponible se lisait en trois endroits sans avoir d'adresse ; il en a
 * une depuis le 9 octobre 2026. Cette page-là disait alors le solde PUIS ce
 * qu'on en fait, en quatre encadrés numérotés empilés — et c'est cette
 * seconde moitié qui est partie le 24 octobre.
 *
 * CE QU'ELLE PORTAIT, MESURÉ AU TÉLÉPHONE : 2 518 px, trois écrans, et sur le
 * même écran le motif du virement, le bénéficiaire, la banque, le RIB, quatre
 * boutons « copier », un champ de montant pour placer, un second pour se
 * faire virer. Garnir un compte, souscrire un fonds et demander un virement
 * n'ont en commun que le solde qu'ils déplacent : trois gestes sans rapport.
 *
 * CE QUI RESTE EST LA RÉPONSE : le total, la barre qui le partage, les deux
 * états, et ce qui est placé en parts — hors du total, parce qu'une somme
 * devenue titres n'est plus un solde, mais la taire ferait voir un disponible
 * fondu sans raison visible.
 *
 * LE QUATRIÈME ENCADRÉ N'ÉTAIT PAS UN GESTE. « Régler un ordre » portait
 * l'étiquette « sans vous » et ne proposait aucune action : c'était la seule
 * chose de la page qu'on ne pouvait pas faire. Il EXPLIQUAIT le mis de côté,
 * et il est donc remonté dans ce bloc, sous le chiffre qu'il explique, avec
 * les ordres qui retiennent la somme.
 *
 * LES DEUX MOUVEMENTS D'ARGENT PRENNENT DEUX PASTILLES, au pied. Faire entrer
 * et faire sortir sont les deux gestes pour lesquels on vient ; chacune porte
 * son mot sous le rond, parce qu'un rond muet est un menu et non un sommaire.
 * Ils quittent la liste des bandes, où ils auraient été dits deux fois.
 * Placer, lui, y reste : la somme ne sort pas, elle devient des parts.
 */
export default async function ProvisionPage() {
  const t = await getT();
  const s = await requireSession("/moi/provision");
  const r = repo();
  const [cash, intents, offers] = await Promise.all([r.listCash(s.userId).catch(() => []), r.listIntents(), r.listOffers()]);
  const mine = intents.filter((i) => i.clientId === s.userId);
  const poche = cashPosition(cash, mine);
  const reserves = mine
    .filter((i) => i.coveredAt && i.state !== "reglee" && i.state !== "annulee" && i.state !== "non_servie")
    .map((i) => ({ i, titre: offers.find((o) => o.id === i.offerId)?.title ?? i.offerId }));

  /* CE QUI EST DÉJÀ PLACÉ, lu des positions et non d'un compteur à part : le
     même argent compté deux fois serait le défaut de la maison. */
  const placees = positionsFrom(mine, offers).filter((p) => p.offer.kind === "FONDS" && estMonetaire(p.offer.title, p.offer.fund?.category));
  const place = placees.reduce((somme, p) => somme + (p.marketValue ?? p.nominalAmount ?? 0), 0);

  const dernierMouvement = cash.length ? cash.reduce((d, e) => (e.at > d ? e.at : d), cash[0].at) : undefined;

  /* La barre ne se peint que s'il y a quelque chose à partager : à solde nul,
     deux parts de zéro donneraient une barre vide qui ressemble à une panne. */
  const partage = poche.balance > 0;

  return (
    <Glissement>
      <div className={styles.wrap}>
        <EnTete
          retour={{ href: "/", mot: t("Tableau de bord") }}
          surTitre={t("Votre argent chez nous")}
          titre={t("Votre provision")}
          phrase={t(
            "Ce que vous laissez ici règle vos ordres sans attendre un virement. Elle n'est jamais obligatoire : vous pouvez payer chaque ordre au coup par coup. Elle reste votre argent, sur un compte séparé de celui de la maison.",
          )}
          aCote={<EnBref cles={["provision"]} titre="La provision en bref" />}
        />

        <section className={styles.solde}>
          <div className={styles.soldeTete}>
            <div>
              <span className={styles.quoi}>{t("Ce que la maison vous doit")}</span>
              <b className={styles.grand}>
                {fmt(Math.round(poche.balance))} <small>FCFA</small>
              </b>
            </div>
            {dernierMouvement && <div className={styles.depuis}>{t("dernier mouvement le {d}", { d: fmtDate(dernierMouvement, false) })}</div>}
          </div>

          {partage && (
            <div className={styles.barre} aria-hidden="true">
              <i className={styles.part1} style={{ flex: Math.max(0, poche.idle) }} />
              <i className={styles.part2} style={{ flex: Math.max(0, poche.balance - poche.idle) }} />
            </div>
          )}

          <div className={styles.etats}>
            <div className={styles.etat}>
              <span className={styles.cle}>
                <i className={`${styles.puce} ${styles.part1}`} /> {t("Disponible")}
              </span>
              <b className={styles.valeur}>{fmt(Math.round(poche.idle))} FCFA</b>
              <p>{t("Pour votre prochain ordre, ou à reprendre quand vous voulez.")}</p>
            </div>
            <div className={styles.etat}>
              <span className={styles.cle}>
                <i className={`${styles.puce} ${styles.part2}`} /> {t("Mis de côté")}
              </span>
              <b className={styles.valeur}>{fmt(Math.round(poche.balance - poche.idle))} FCFA</b>
              {/* L'EXPLICATION DU « SANS VOUS », à sa place : sous le chiffre
                  qu'elle explique, et non dans un quatrième encadré à mille
                  quatre cents pixels de là. */}
              <p>{t("Par vos ordres signés. Vous n'avez rien à virer : le montant est retenu ici à la signature, et ce qui n'est pas consommé revient le jour où le résultat est connu.")}</p>
              {/* UN MONTANT RÉSERVÉ SANS SON ORDRE EST UNE RETENUE INEXPLIQUÉE.
                  C'est le seul endroit où le client peut vérifier que son argent
                  n'est pas immobilisé par une opération qu'il a oubliée. */}
              {reserves.length > 0 && (
                <ul className={styles.reserves}>
                  {reserves.map(({ i, titre }) => (
                    <li key={i.id}>
                      <Link href={`/moi/ordres/${i.id}`}>
                        <span>
                          <b>{titre}</b>
                          <small>
                            {t("Ordre")} <span className="mono">{i.ref}</span> · {t("signé le {d}", { d: fmtDate(i.signedAt ?? i.coveredAt!, false) })}
                          </small>
                        </span>
                        <b className={styles.montant}>{fmt(Math.round(i.coveredAmount ?? 0))}</b>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {/* L'ANCRE « /#ordres-en-cours » EST MORTE depuis que la page
                  d'accueil a cessé de déplier le relevé : la racine perdait le
                  fragment, et le client atterrissait en haut de son
                  portefeuille. La liste existe. */}
              <div className={styles.gestesDeLEtat}>
                <Link href="/moi/ordres">{t("Vos ordres en cours")} →</Link>
              </div>
            </div>
          </div>

          {place > 0 && (
            <div className={styles.horsSolde}>
              <span>
                <b>{t("{m} FCFA placés", { m: fmt(Math.round(place)) })}</b> {t("en parts de {f}, inscrites à votre nom.", { f: placees[0].offer.title })}
              </span>
              <span>
                {t("Hors de ce solde : c'est une ligne de votre portefeuille.")} <Link href={`/offres/${placees[0].offer.id}`}>{t("La voir")} →</Link>
              </span>
            </div>
          )}
        </section>

        <Rubriques
          items={[
            { href: "/moi/provision/placer", nom: t("La faire travailler"), quoi: t("En parts d'un fonds monétaire, inscrites à votre nom") },
            { href: "/moi/performance#operations", nom: t("D'où vient ce solde"), quoi: t("Chaque mouvement au journal, à sa date de valeur") },
            { href: "/moi/tarifs", nom: t("Ce que cela coûte"), quoi: t("Rien : ni la tenue, ni le virement de retour") },
          ]}
        />

        {/* LES DEUX SENS DU ROBINET, en pastilles : c'est pour eux qu'on vient.
            Le mot est sous le rond et non dans un « aria-label » seul — un
            dessin qu'il faut deviner coûte un essai, et un essai sur un geste
            d'argent coûte la confiance. */}
        <nav className={styles.pastilles} aria-label={t("Faire entrer ou sortir de l'argent")}>
          <Link href="/moi/provision/alimenter" className={styles.pastille}>
            <span className={`${styles.rond} ${styles.rondPlein}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            {/* LE VERBE DE LA PAGE D'ARRIVÉE, et non celui de la maison : elle
                s'appelle « Approvisionner votre compte » depuis le 25 octobre
                2026, et un rond qui annoncerait « Alimenter » coûterait un
                essai pour savoir si l'on est au bon endroit. */}
            <b>{t("Approvisionner")}</b>
          </Link>
          <Link href="/moi/provision/reprendre" className={styles.pastille}>
            <span className={styles.rond}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M6 13l6 6 6-6" />
              </svg>
            </span>
            <b>{t("Reprendre")}</b>
          </Link>
        </nav>
      </div>
    </Glissement>
  );
}
