import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { Poignee } from "@/components/desk/Poignee";
import { requireDesk } from "@/lib/auth";
import { repo } from "@/lib/data";
import { getT } from "@/i18n/server";
import { confirmable, etatSeance, thin } from "@/lib/market/auction-results";
import { auctionYield } from "@/lib/market/yield";
import { auctionReadingAvailable } from "@/lib/market/auction-extract";
import { cribler } from "@/lib/market/anomalies";
import { Anomalies, type LigneAnomalie } from "./Anomalies";
import { ConfirmerEnLot } from "./ConfirmerEnLot";
import { ResultForm } from "./ResultForm";
import { SessionList, type LigneSeance } from "./SessionList";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/**
 * Les adjudications de la zone, séance par séance.
 *
 * Le taux d'un bon sort de l'enchère. Le chiffre que le Guichet affiche avant
 * une séance est donc une indication, et une indication se fonde sur la dernière
 * séance comparable : sans mémoire de ce qui s'est payé, elle se fonde sur une
 * intuition. Cet écran est cette mémoire, et la BEAC la publie pour les six
 * Trésors, pas seulement pour les lignes que nous distribuons.
 *
 * Deux piles, et la séparation est le sujet de la page. Le robot dépose ce qu'il
 * sait de la séance, qui est son identité, et laisse les chiffres vides parce
 * qu'ils sont à l'intérieur d'un scan. Une personne les relève, et c'est
 * seulement à partir de sa confirmation que le taux fonde quoi que ce soit : une
 * faute de lecture devenue référence se propagerait sans bruit à toutes les
 * offres suivantes.
 */
export default async function AdjudicationsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  await requireDesk("/desk/adjudications");
  const t = await getT();
  const sp = await searchParams;
  const r = repo();
  const all = await r.listAuctionResults({ limit: 300 });
  const aRelire = all.filter((x) => !x.confirmedBy);
  const relues = all.filter((x) => x.confirmedBy);
  const selected = sp.s ? all.find((x) => x.id === sp.s) : aRelire[0];
  // La liste ne reçoit que ce qu'elle affiche : deux cent quarante-neuf séances
  // entières traverseraient le réseau pour trois colonnes.
  const lignes: LigneSeance[] = all.map((x) => ({
    id: x.id,
    on: x.sessionOn,
    pays: x.country,
    instrument: x.instrument,
    tenor: x.tenor,
    code: x.codeEmission,
    etat: etatSeance(x),
    mince: thin(x),
  }));
  const offer = selected?.offerId ? await r.getOffer(selected.offerId) : undefined;

  /**
   * Ce que le lot signerait vraiment, compté avant de l'annoncer.
   *
   * Recevables, parce qu'une séance sans chiffre ni code sera refusée et ne
   * doit pas gonfler le nombre du bouton. Muettes, parce qu'une fourchette se
   * signe et ne donne aucun rendement. Et les points de courbe, qui sont la
   * seule raison de signer : une ligne, un point, l'échéance faisant foi.
   */
  /**
   * Le crible, mis en mots ici.
   *
   * Une anomalie voyage en clef et paramètres pour que la phrase se traduise ;
   * elle se résout donc au dernier moment, et le client ne reçoit que du texte.
   */
  const crible = cribler(all);
  const parId = new Map(all.map((x) => [x.id, x]));
  const anomalies: LigneAnomalie[] = crible.restent.map((a) => ({
    id: a.id,
    quand: a.quand,
    pays: a.pays,
    instrument: a.instrument,
    tenor: a.tenor,
    code: parId.get(a.id)?.codeEmission,
    dit: t(a.quoi.key, a.quoi.params),
    verifier: a.verifier,
    confirmee: a.gravite === "confirmee",
  }));

  const lotBta = aRelire.filter((x) => x.instrument === "BTA" && !confirmable(x) && x.codeEmission);
  const avecRdt = lotBta.filter((x) => auctionYield(x));
  const cle = (x: (typeof all)[number]) => `${x.country}|${x.maturityOn ?? x.tenor}`;
  const deja = new Set(relues.filter((x) => auctionYield(x)).map(cle));
  const pointsGagnes = new Set(avecRdt.map(cle).filter((k) => !deja.has(k))).size;

  return (
    <>
      <DeskNav current="/desk/adjudications" badges={{ "/desk/adjudications": aRelire.length }} />

      <div className={styles.page}>
        <aside className={styles.list} aria-label={t("Séances")}>
          <p className={styles.blurb}>
            {t("Ce que le marché a payé, séance par séance. Le robot dépose l'identité de la séance, une personne en relève les chiffres sur le communiqué.")}{" "}
            <Link href="/desk/adjudications/tableau">{t("Voir la table")} →</Link>
          </p>
          <Anomalies lignes={anomalies} vues={crible.vues} courante={selected?.id} />
          <ConfirmerEnLot instrument="BTA" enAttente={lotBta.length} muettes={lotBta.length - avecRdt.length} pointsGagnes={pointsGagnes} />
          <SessionList rows={lignes} current={selected?.id} />
        </aside>

        <Poignee variable="--liste" min={240} max={520} memoire="adj.liste" libelle="Régler la largeur de la liste" />

        <div className={styles.main}>
          {selected ? (
            <ResultForm key={selected.id} r={selected} offerTitle={offer?.title} canRead={auctionReadingAvailable()} />
          ) : (
            <div className="empty">
              {t("Aucune séance. Le robot BEAC en dépose une dès qu'un Trésor publie ses résultats.")}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
