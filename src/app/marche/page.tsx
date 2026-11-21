import Link from "next/link";
import { IndexPulse } from "@/components/IndexPulse";
import { COMPANY } from "@/lib/config";
import { fmt, fmtDate, fmtPct, money } from "@/lib/format";
import { dernierMouvement } from "@/lib/market/echanges";
import { indexPageData } from "@/lib/market/index-data";
import { quarters, quarterNote } from "@/lib/market/index-quarter";
import { aLaUne, publishedNews, titreLu } from "@/lib/news";
import { loadCompanies, loadLessons } from "@/lib/reference";
import { repo } from "@/lib/data";
import { vueClient } from "@/lib/market/adjudications-client";
import { familyLabel, offerFamily } from "@/lib/domain/status";
import { ChoisirDeuxLignes } from "./ChoisirDeuxLignes";
import { getLang, getT } from "@/i18n/server";
import styles from "./page.module.css";
import { Glissement } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import { TitreDeBloc } from "@/components/TitreDeBloc";

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
  const [data, companies, actualites, lecons, offres, resultats] = await Promise.all([
    indexPageData(),
    loadCompanies().catch(() => []),
    publishedNews().catch(() => []),
    loadLessons().catch(() => []),
    repo().listOffers().catch(() => []),
    repo().listAuctionResults({ limit: 400 }).catch(() => []),
  ]);
  /* La dernière séance close : une ligne, tirée de la même projection que la rubrique (jamais d'autre champ que ceux du communiqué). */
  const derniereAdj = vueClient(resultats)[0];
  const { weights, nameOf, histories } = data;
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
  /* QUAND CHAQUE LIGNE A BOUGÉ (« dernierMouvement » plus bas) : l'indice bouge sur 70 des 271 séances lues, et une action garde son cours dans 95 % d'entre elles ; la variation du jour n'affichait que des zéros. La carte « Ce qui s'est échangé » est partie (21 novembre 2026) ; son lien vers les séances est au pied de la carte de l'indice. */
  /* Trois lignes, pas cinq : au-delà, on recopie la table qu'on voulait
     retirer. Les trois premières pèsent l'essentiel, et la phrase le dit. */
  const tete = weights.slice(0, 3);
  const partDeTete = tete.reduce((a, w) => a + w.weightTotal, 0);
  const bougeLe = (mnemo: string) => dernierMouvement(histories.find((h) => h.w.mnemo === mnemo)?.quotes ?? []);
  /* L'ÉCLAIRAGE, LU DANS LE RÉFÉRENTIEL ET NON RECOPIÉ. Le desk peut
     réécrire une leçon par « Référentiel » : une tuile qui porterait sa propre
     phrase d'accroche dirait autre chose que la page qu'elle ouvre dès la
     première correction. Absent — leçon retirée du référentiel — la section ne
     paraît pas, plutôt que de s'excuser. */
  const lecon = lecons.find((l) => l.key === "indice-bvmac");
  /* LES LIGNES QU'ON PEUT METTRE EN FACE L'UNE DE L'AUTRE : celles que
     « /comparer » accepte, c'est-à-dire le catalogue moins ce qui est caché.
     Le filtre est écrit ici comme là-bas, et c'est le même. */
  const comparables = offres
    .filter((o) => !o.hidden)
    .map((o) => ({ id: o.id, titre: o.title, famille: familyLabel(offerFamily(o)) }));

  return (
    <Glissement>
      {/* UNE PILE : l'espace entre les cartes vient du jeton des sections, et d'aucune marge (ETALON.md § 8). */}
      <div className="pile">
        {/* ─── LE SOMMAIRE DU TÉLÉPHONE EST PARTI, le 1er novembre 2026 ──────
            Il posait les six pages de la famille en tuiles muettes AVANT le
            sur-titre et le titre : relevé au navigateur à 390 px, 712 px de
            liste statique sur une page de 1 482, soit la moitié de la page
            avant qu'elle se nomme.
            Et il redisait ce qui suit. Les notes, les actualités, l'indice,
            les sociétés ont chacune leur section en dessous, avec un chiffre
            qui bouge ; la tuile, elle, ne portait qu'un nom. « Une tuile
            statique qui répète une section vivante est du bruit » — c'est la
            règle que cette page avait déjà écrite pour sa bande de pied, et
            qui vaut en tête comme au pied.
            LES DEUX QUI N'AVAIENT PAS DE SECTION EN ONT UNE MAINTENANT :
            l'éclairage et la comparaison, plus bas. Aucune porte ne se ferme.
            Sur l'écran large la liste était déjà masquée par la feuille : la
            colonne de gauche porte la famille. */}
        {/* LA PROVENANCE DES CHIFFRES DESCEND SOUS LE TITRE (21 novembre 2026, planche « Cohérence des pages », 2A) : une racine n'a pas de surtitre, et Marché était la seule. La ligne reste, rien n'est retiré. */}
        <EnTete
          titre={t("Le marché")}
          phrase={
            <>
              {t("La Bourse de l'Afrique Centrale, séance après séance : l'indice, les sociétés cotées, les adjudications et les notes de marché.")}
              <span className={styles.provenance}>{`BVMAC · ${t("Bourse des Valeurs Mobilières de l'Afrique Centrale")}`}</span>
            </>
          }
        />

        {/* L'EN-TÊTE DE LA MAISON, ET SA FLÈCHE AU MÊME ENDROIT QUE LES AUTRES.
            Relevé le 1er novembre 2026 : quatre sections portaient leur lien
            en haut à droite, dans « panel-h », et l'indice portait les siens
            EN BAS, au milieu de ses chiffres, après « douze mois ». Deux
            grammaires sur une page de cinq cartes, et c'est la plus voyante
            qui faisait exception.
            « IndexPulse » savait déjà rendre cet en-tête — la page d'arrivée
            s'en sert — et cette page ne le lui demandait pas. Le second lien
            de sa carte, « comment le lire », descend dans la section de
            l'éclairage, qui est faite pour lui : une carte, une flèche. */}
        <IndexPulse entete={{ lien: { href: "/indice", mot: t("L'indice") } }} liens={false} seances={{ href: "/indice#seances", mot: t("Les séances") }} />

        {/* TROIS LIGNES, ET NON SEPT. Les sept sociétés paraissaient sur quatre
            pages avec quatre jeux de colonnes : l'indice donne le capital global
            et la liquidité, les sociétés la séance et l'année, cette page-ci
            l'activité et le dernier mouvement, et l'éclairage les redessine. Qui
            cherche « le poids de BHC » avait trois réponses. La porte en montre
            trois, celles qui pèsent, et la liste vit à un seul endroit. */}
        {weights.length > 0 && (
          <section className={styles.bloc} id="societes">
            <TitreDeBloc titre="Les sociétés cotées" href="/societes" tout="Toutes" />
            <div className="panel">
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
              {t("Ces trois-là pèsent {p} de la capitalisation, {c} FCFA au total dont {f} de flottant coté.", { p: fmtPct(partDeTete, 1), c: money(capTotal), f: money(capFloat) })}
            </p>
          </div>
          </section>
        )}

        {derniereAdj && (
          <section className={styles.bloc} id="adjudications">
            <TitreDeBloc titre="Les résultats d'adjudications" href="/marche/adjudications" tout="Voir tout" />
            <div className="panel">
            <div className={styles.apercu}>
              <Link href="/marche/adjudications">
                <b>
                  {derniereAdj.country} · {derniereAdj.instrument} {t(derniereAdj.tenor)}
                </b>
                <span>{fmtDate(derniereAdj.sessionOn, false)}</span>
                {(derniereAdj.instrument === "BTA" ? derniereAdj.rateAvg : derniereAdj.priceAvg) != null && (
                  <i>{fmtPct((derniereAdj.instrument === "BTA" ? derniereAdj.rateAvg : derniereAdj.priceAvg) as number, 2)}</i>
                )}
              </Link>
            </div>
            <p className={styles.note}>{t("Ce que les Trésors ont obtenu, tel que leur communiqué le publie.")}</p>
          </div>
          </section>
        )}

        <section className={styles.bloc} id="notes">
            <TitreDeBloc titre={derniere ? "La dernière note" : "Les notes de marché"} href="/indice/notes" tout="Toutes les notes" />
            <div className="panel">
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
        </div>
          </section>

        {/* ─── L'ÉCLAIRAGE, ET CE QU'ON Y APPREND ───────────────────────────
            Il n'avait, sur cette page, qu'une tuile muette dans le sommaire
            du téléphone et un « comment le lire → » au bas de la carte de
            l'indice — qui disparaît avec elle les jours sans bulletin. Une
            leçon n'a pas de chiffre qui bouge : ce qui la rend vivante, c'est
            ce qu'elle contient, et cela se lit dans le référentiel plutôt que
            de se recopier ici. Le desk réécrit la leçon, la tuile suit. */}
        {lecon && (
          <section className={styles.bloc} id="eclairage">
            <TitreDeBloc titre="L'éclairage" href="/info/indice-bvmac" tout="Comment le lire" />
            <div className="panel">
            <div className={styles.lecon}>
              <b>{t(lecon.title)}</b>
              <p>{t(lecon.intro)}</p>
              {/* LA QUESTION PLUTÔT QU'UN RÉSUMÉ. Un résumé de leçon rend la
                  leçon inutile ou la trahit ; la question qu'elle pose, elle,
                  donne envie de l'ouvrir et ne répond à rien. Elle vient du
                  quiz de la leçon : une seule écriture, et elle suit le desk. */}
              <p className={styles.question}>{t(lecon.quiz.q)}</p>
              <span className={styles.meta}>
                {t("{n} min de lecture", { n: lecon.minutes })}
                {lecon.terms.length > 0 ? ` · ${t("{n} termes expliqués", { n: lecon.terms.length })}` : ""}
              </span>
            </div>
          </div>
          </section>
        )}

        {/* ─── COMPARER DEUX LIGNES ──────────────────────────────────────────
            Deux listes déroulantes, et aucune paire proposée : voir la note
            de « ChoisirDeuxLignes ». Sous deux lignes au catalogue il n'y a
            rien à comparer, et la section ne paraît pas. */}
        {comparables.length >= 2 && (
          <section className={styles.bloc} id="comparer">
            <TitreDeBloc titre="Comparer deux lignes" href="/comparer" tout="Voir plus" />
            <div className="panel">
            <ChoisirDeuxLignes lignes={comparables} />
            <p className={styles.note}>{t("Rendement, échéance, ticket et calcul de référence côte à côte, avec l'indice en repère.")}</p>
          </div>
          </section>
        )}

        {/* LES ACTUALITÉS NE PARAISSENT QUE S'IL Y EN A. Une rubrique vide en
            tête de siège apprend à ne plus l'ouvrir ; cinq dépêches reçues et
            relues, non publiées, ne sont pas une actualité. */}
        {une && (
          <section className={styles.bloc} id="actualites">
            <TitreDeBloc titre="À la une" href="/actualites" tout="Toutes les actualités" />
            <div className="panel">
            <div className={styles.apercu}>
              <Link href="/actualites">
                <b>{une.source}</b>
                <span>{titreLu(une, lang, t)}</span>
                <em>{une.publishedAt ? fmtDate(une.publishedAt.slice(0, 10), false) : ""}</em>
              </Link>
            </div>
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
          {t("Guichet montre l'indice tel qu'il est publié, séance après séance ; il n'en construit pas et ne mesure personne contre lui.")}{" "}
          {/* Le pli « Données et méthode » de /indice est retiré (8 novembre 2026, décision du dirigeant) : plus d'ancre « #lecture » à viser. */}
          {t("Calculs {c}.", { c: COMPANY.legalName })}
        </p>
      </div>
    </Glissement>
  );
}
