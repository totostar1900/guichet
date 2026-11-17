import Link from "next/link";
import { repo } from "@/lib/data";
import { cashPosition } from "@/lib/domain/cash";
import { positionsFrom } from "@/lib/positions";
import { getT } from "@/i18n/server";
import { fmt, fmtDate } from "@/lib/format";
import { estMonetaire } from "./monetaire";
import styles from "./page.module.css";

/**
 * LE SOLDE DE LA PROVISION, HAUT DE « MON ARGENT » (16 novembre 2026, planche « Mon argent », 1A).
 *
 * La page « Ma provision » a disparu : son solde, ses deux états, les ordres qui retiennent la somme et ce qui est placé en parts sont ici, en tête de Mon argent, sous leurs trois gestes
 * (verser, placer, retirer). L'ancienne adresse redirige. Le bloc garde sa doctrine d'origine : le total, la barre qui le partage, les deux états ; ce qui est placé en parts reste
 * hors du total, parce qu'une somme devenue titres n'est plus un solde.
 */
export async function SoldeDeLaProvision({ userId }: { userId: string }) {
  const t = await getT();
  const r = repo();
  const [cash, intents, offers] = await Promise.all([r.listCash(userId).catch(() => []), r.listIntents(), r.listOffers()]);
  const mine = intents.filter((i) => i.clientId === userId);
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
            <Link href="/moi/ordres">{t("Mes ordres")} →</Link>
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
  );
}
