import Link from "next/link";
import { IndexPulse } from "@/components/IndexPulse";
import { MarketStrip } from "@/components/MarketStrip";
import { COMPANY } from "@/lib/config";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import { dernierMouvement, echangesDeLaSeance } from "@/lib/market/echanges";
import { indexPageData } from "@/lib/market/index-data";
import { quarters, quarterNote } from "@/lib/market/index-quarter";
import { publishedNews } from "@/lib/news";
import { loadCompanies } from "@/lib/reference";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Le marché" };

/**
 * Le marché : la porte d'entrée de l'environnement BVMAC.
 *
 * L'indice, les sept sociétés cotées, les notes trimestrielles et de quoi
 * comprendre. Les actualités n'y sont pas : elles couvrent cinq rubriques,
 * dont la BVMAC n'est qu'une, et gardent leur propre page. Rien n'est
 * produit ici : chaque
 * section montre ce qui existe déjà et mène à sa page. La page de l'indice
 * n'était rattachée à aucun onglet ; c'est cette porte qui manquait.
 */
export default async function MarchePage() {
  const t = await getT();
  const [data, companies, actualites] = await Promise.all([indexPageData(), loadCompanies().catch(() => []), publishedNews().catch(() => [])]);
  const { weights, nameOf, lastBulletin, histories, trading } = data;
  const notes = quarters(data);
  /* La dernière note se calcule de « data », déjà en main : aucune lecture de
     plus. Les actualités, elles, vivent ailleurs, d'où la seule requête que
     cette page ajoute, et elle ne sert qu'à savoir s'il y a quelque chose. */
  const derniere = notes.length > 0 ? await quarterNote(undefined, data) : undefined;
  const aLaUne = actualites[0];
  const capTotal = weights.reduce((s, w) => s + w.capTotal, 0);
  const capFloat = weights.reduce((s, w) => s + w.capFloat, 0);
  /**
   * CE QUI S'EST ÉCHANGÉ, ET QUAND CHAQUE LIGNE A BOUGÉ.
   *
   * L'indice bouge sur 70 des 271 séances lues, et une action garde son cours
   * dans 95 % d'entre elles : une page qui ne montre que la variation du jour
   * n'affiche que des zéros, trois fois sur quatre. Les deux lectures qui
   * suivent sont dans la base depuis le premier jour et ne paraissaient nulle
   * part. Elles ne coûtent aucune lecture de plus : « indexPageData » les
   * portait déjà.
   */
  const ech = lastBulletin ? echangesDeLaSeance(trading, lastBulletin.sessionDate, weights.length) : undefined;
  /* Trois lignes, pas cinq : au-delà, on recopie la table qu'on voulait
     retirer. Les trois premières pèsent l'essentiel, et la phrase le dit. */
  const tete = weights.slice(0, 3);
  const partDeTete = tete.reduce((a, w) => a + w.weightTotal, 0);
  const bougeLe = (mnemo: string) => dernierMouvement(histories.find((h) => h.w.mnemo === mnemo)?.quotes ?? []);

  return (
    <>
      <header className={styles.head}>
        <div className="eyebrow">BVMAC · {t("Bourse des Valeurs Mobilières de l'Afrique Centrale")}</div>
        <h1 className="display">{t("Le marché")}</h1>
        <p className={styles.lead}>
          {t("Ce que la Bourse publie à chaque séance, et ce que nous en lisons : l'indice, les sociétés cotées, et les notes que nous en tirons.")}
          {lastBulletin ? ` ${t("Dernier bulletin lu : n° {n} du {d}.", { n: String(lastBulletin.number), d: fmtDate(lastBulletin.sessionDate) })}` : ""}
        </p>
      </header>

      <IndexPulse />

      {ech && lastBulletin && (
        <section className="panel" id="echanges">
          <div className="panel-h">
            <h2>{t("Ce qui s'est échangé")}</h2>
            <Link className="btn sm ghost" href="/indice">
              {t("Séance par séance")} →
            </Link>
          </div>
          <div className={styles.ech}>
            <div>
              <b>
                {ech.lignes}
                <small> / {ech.cotees}</small>
              </b>
              <span>{t("lignes servies le {d}", { d: fmtDate(lastBulletin.sessionDate, false) })}</span>
            </div>
            <div>
              <b>{fmt(ech.transactions)}</b>
              <span>{t("transactions")}</span>
            </div>
            <div>
              <b>{money(ech.montant)}</b>
              <span>{t("FCFA échangés")}</span>
            </div>
          </div>
          <p className={styles.note}>
            {ech.servies.length > 0 ? `${ech.servies.map((x) => `${x.mnemo} ${fmt(x.titres)}`).join(" · ")}. ` : `${t("Aucun titre n'a changé de mains ce jour-là.")} `}
            {ech.part != null &&
              t("Cette séance pèse {p} des trente derniers jours, qui ont vu {m} FCFA s'échanger en {n} séances.", {
                p: fmtPct(ech.part, 0),
                m: money(ech.fenetreMontant),
                n: ech.fenetreSeances,
              })}
          </p>
        </section>
      )}

      {/* TROIS LIGNES, ET NON SEPT. Les sept sociétés paraissaient sur quatre
          pages avec quatre jeux de colonnes : l'indice donne le capital global
          et la liquidité, les sociétés la séance et l'année, cette page-ci
          l'activité et le dernier mouvement, et la leçon les redessine. Qui
          cherche « le poids de BHC » avait trois réponses. La porte en montre
          trois, celles qui pèsent, et la liste vit à un seul endroit. */}
      {weights.length > 0 && (
        <section className="panel" id="societes">
          <div className="panel-h">
            <h2>{t("Les sociétés")}</h2>
            <Link className="btn sm ghost" href="/societes">
              {t("Les {n} sociétés", { n: weights.length })} →
            </Link>
          </div>
          <div className={styles.apercu}>
            {tete.map((w) => {
              const c = companies.find((x) => x.mnemo === w.mnemo);
              const bouge = bougeLe(w.mnemo);
              return (
                <Link key={w.mnemo} href={`/societes/${w.mnemo.toLowerCase()}`}>
                  <b>{w.mnemo}</b>
                  <span>{c?.shortName ?? nameOf(w.mnemo)}</span>
                  <i>
                    {fmt(w.close)} · {fmtPct(w.weightTotal, 1)}
                  </i>
                  {/* La date du dernier mouvement, et non la variation du jour :
                      sur cette cote, sept séances sur dix sont plates. */}
                  <em>{bouge ? fmtDate(bouge, false) : "—"}</em>
                </Link>
              );
            })}
          </div>
          <p className={styles.note}>
            {t("Ces trois-là pèsent {p} de la capitalisation, {c} FCFA au total dont {f} de flottant coté.", { p: fmtPct(partDeTete, 1), c: money(capTotal), f: money(capFloat) })}{" "}
            {t("Les {n} autres, et toutes les colonnes, sur leur page.", { n: weights.length - tete.length })}
          </p>
        </section>
      )}

      <section className="panel" id="notes">
          <div className="panel-h">
            <h2>{t(derniere ? "La dernière note" : "Les notes de marché")}</h2>
            <Link className="btn sm ghost" href="/indice/notes">
              {t("Toutes les notes")} →
            </Link>
          </div>
          {derniere ? (
            <div className={styles.apercu}>
              <Link href={`/indice/note/${derniere.quarter.key.toLowerCase()}`}>
                <b>{t(derniere.quarter.q === 1 ? "1er trimestre {y}" : "{n}e trimestre {y}", { n: derniere.quarter.q, y: derniere.quarter.year })}</b>
                <span>
                  {fmtDate(derniere.quarter.from, false)} {t("au")} {fmtDate(derniere.quarter.to, false)}
                </span>
                <i className={derniere.ret > 0 ? styles.hausse : derniere.ret < 0 ? styles.baisse : undefined}>{`${derniere.ret > 0 ? "+" : ""}${fmtPct(derniere.ret, 2)}`}</i>
              </Link>
            </div>
          ) : (
            <div className="empty">{t("La première note paraîtra à la fin du premier trimestre entièrement lu.")}</div>
          )}
        {/* Une annonce, pas un sommaire : le sommaire est dans la note. */}
        <p className={styles.note}>{t("Le pouls du trimestre, en une page.")}</p>
      </section>

      {/* LES ACTUALITÉS NE PARAISSENT QUE S'IL Y EN A. Une rubrique vide en
          tête de siège apprend à ne plus l'ouvrir ; cinq dépêches reçues et
          relues, non publiées, ne sont pas une actualité. */}
      {aLaUne && (
        <section className="panel" id="actualites">
          <div className="panel-h">
            <h2>{t("À la une")}</h2>
            <Link className="btn sm ghost" href="/actualites">
              {t("Toutes les actualités")} →
            </Link>
          </div>
          <div className={styles.apercu}>
            <Link href="/actualites">
              <b>{aLaUne.source}</b>
              <span>{aLaUne.title}</span>
              <em>{aLaUne.publishedAt ? fmtDate(aLaUne.publishedAt.slice(0, 10), false) : ""}</em>
            </Link>
          </div>
        </section>
      )}

      {/* TROIS LIENS NE FONT PAS UN PANNEAU. « Comprendre » en occupait un
          quart de page, pour trois destinations dont la pulsation portait déjà
          l'une. Ils tiennent au pied, avec la source. */}
      <p className={styles.source}>
        <Link href="/info/indice-bvmac">{t("Comment lire l'indice")}</Link> · <Link href="/comparer">{t("Comparer deux lignes")}</Link> · <Link href="/indice#donnees">{t("Ce que publie le bulletin")}</Link>
        <br />
        {t("L'indice se lit dans le bulletin officiel de la cote, séance après séance. Le Guichet le montre tel qu'il est publié ; il n'en construit pas et ne mesure personne contre lui.")}{" "}
        {t("Source : bulletin officiel de la cote de la BVMAC, lu à chaque parution ; calculs {c}.", { c: COMPANY.legalName })}
      </p>

      <MarketStrip current="marche" />
    </>
  );
}
