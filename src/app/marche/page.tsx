import Link from "next/link";
import { Rubriques } from "@/components/mobile/Rubriques";
import { MARKET_PAGES } from "@/lib/market/pages";
import { IndexPulse } from "@/components/IndexPulse";
import { COMPANY } from "@/lib/config";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import { dernierMouvement, echangesDeLaSeance } from "@/lib/market/echanges";
import { indexPageData } from "@/lib/market/index-data";
import { quarters, quarterNote } from "@/lib/market/index-quarter";
import { aLaUne, publishedNews, titreLu } from "@/lib/news";
import { loadCompanies } from "@/lib/reference";
import { getLang, getT } from "@/i18n/server";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";

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
  const [t, lang] = await Promise.all([getT(), getLang()]);
  const [data, companies, actualites] = await Promise.all([indexPageData(), loadCompanies().catch(() => []), publishedNews().catch(() => [])]);
  const { weights, nameOf, lastBulletin, histories, trading } = data;
  const notes = quarters(data);
  /* La dernière note se calcule de « data », déjà en main : aucune lecture de
     plus. Les actualités, elles, vivent ailleurs, d'où la seule requête que
     cette page ajoute, et elle ne sert qu'à savoir s'il y a quelque chose. */
  const derniere = notes.length > 0 ? await quarterNote(undefined, data) : undefined;
  /* LE MÊME ARTICLE QUE « /actualites », et c'était le défaut : cette page
     prenait le plus récent pendant que la page des actualités montrait celui
     que le desk a épinglé. « À la une » changeait d'article d'une page à
     l'autre. */
  const une = aLaUne(actualites);
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
    <Glissement>
      <>
        {/* LE SOMMAIRE DU TÉLÉPHONE, et le reste de la page sur l'écran large.
            « Le marché » est déjà la porte d'entrée de l'environnement BVMAC :
            rien n'y est produit, chaque section montre ce qui existe et mène à
            sa page. Sur un écran large cela se parcourt d'un coup d'œil ; sur
            un téléphone, c'est un mur qu'il faut descendre pour atteindre la
            troisième porte. Les rubriques la donnent en une liste, et le reste
            se lit ensuite, à sa place.
            Le choix se fait en CSS et non en JavaScript : mesurer la largeur au
            montage ferait rendre au serveur un arrangement et au navigateur
            l'autre. */}
        <div className={styles.sommaire}>
          <Rubriques items={MARKET_PAGES.filter((p) => p.href !== "/marche").map((p) => ({ href: p.href, nom: t(p.label), quoi: t(p.hint) }))} />
        </div>
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
            l'activité et le dernier mouvement, et l'éclairage les redessine. Qui
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
        {une && (
          <section className="panel" id="actualites">
            <div className="panel-h">
              <h2>{t("À la une")}</h2>
              <Link className="btn sm ghost" href="/actualites">
                {t("Toutes les actualités")} →
              </Link>
            </div>
            <div className={styles.apercu}>
              <Link href="/actualites">
                <b>{une.source}</b>
                <span>{titreLu(une, lang, t)}</span>
                <em>{une.publishedAt ? fmtDate(une.publishedAt.slice(0, 10), false) : ""}</em>
              </Link>
            </div>
          </section>
        )}

        {/* LE RÉCAPITULATIF DU PIED EST PARTI, le 24 octobre 2026, et il ne
            manque rien.

            Il portait trois liens — « Comment lire l'indice », « Comparer deux
            lignes », « Ce que publie le bulletin » — et le relevé du même jour
            montre que la page menait DÉJÀ aux trois : au téléphone, les
            pastilles du rail à y 60 et le sommaire à y 115-659 ; sur grand
            écran, la colonne. Au mot près pour l'un d'eux, « Comparer deux
            lignes », écrit deux fois sur la même page. La famille du marché s'y
            lisait donc trois fois en 1 363 px.

            C'est la leçon que « MarketStrip » avait déjà tirée pour le client,
            et qui est restée à moitié appliquée : une bande de pied qui
            répète la famille est du bruit une fois les pastilles posées. Son
            autre moitié tient toujours, et c'est elle qu'on garde : UN LIEN
            DANS UNE PHRASE PORTE SA RAISON. « Ce que publie le bulletin »
            n'était cité nulle part ailleurs ; il reste donc, seul, contre la
            phrase qui dit pourquoi on le suivrait, et non dans une rangée. Il
            reste aussi une phrase entière, et non trois morceaux cousus autour
            d'un lien : ici la chaîne française EST la clé, et un fragment qui
            commence par une virgule se traduit faux.

            « MarketStrip » est partie avec : elle rend « null » hors du desk
            depuis le 5 octobre, et cette page ne la sert jamais autrement. */}
        <p className={styles.source}>
          {t("L'indice se lit dans le bulletin officiel de la cote, séance après séance. Guichet le montre tel qu'il est publié ; il n'en construit pas et ne mesure personne contre lui.")}{" "}
          <Link href="/indice#donnees">{t("Ce que le bulletin publie, champ par champ")}</Link>.{" "}
          {t("Source : bulletin officiel de la cote de la BVMAC, lu à chaque parution ; calculs {c}.", { c: COMPANY.legalName })}
        </p>
      </>
    </Glissement>
  );
}
