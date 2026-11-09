"use client";

import { useDates, useT } from "@/i18n/client";
import Link from "next/link";
import { useDensity } from "@/components/Density";
import { LineMenu } from "@/components/mobile/LineMenu";
import { useDeskView, useLineHref } from "@/components/DeskView";
import { SwipeActions } from "@/components/mobile/SwipeActions";
import { BoutonsDeLaCarte, ChevronDeplie, Depliable, Extension, Outils, classePoints, useDepliee } from "@/components/mobile/CarteDepliee";
import { useRef } from "react";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_LABEL } from "@/lib/domain/market";
import { fundYtdPct } from "@/lib/domain/fund-curve";
import { FENETRES, raisonSansFenetre } from "@/lib/domain/fund-perf";
import { useDepuisQuand, useFenetre, useNomFenetre, valeurFenetre } from "./fenetre";
import { fmt, fmtPct } from "@/lib/format";
import type { FundRow } from "./FundsBrowser";
import styles from "@/components/OfferCard.module.css";
import propres from "./FundCard.module.css";

const signed = (v?: number | null) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, 2)}`);
const cls = (v?: number | null) => (v == null ? "" : v > 0 ? styles.up : v < 0 ? styles.down : "");

/**
 * LE DOS DE LA CARTE COMPACTE EST LA CARTE ENTIÈRE.
 *
 * Elle se retournait d'abord pour montrer des FAITS — société de gestion,
 * dépositaire, rythme de VL, ISIN — là où une obligation retourne la sienne
 * pour montrer une DÉMONSTRATION : coupon couru, décaissement, échéancier.
 * Un fonds n'a rien de tel à prouver, et ce dos-là ne valait pas le geste.
 *
 * Ce qui le vaut, c'est l'autre vue. En compacte on ne lit que trois choses ;
 * le retournement rend les quatre chiffres et le pied, c'est-à-dire
 * exactement la vue normale, sans quitter la liste ni changer de réglage.
 * Le corps est donc écrit UNE FOIS et sert aux deux : si l'un change, l'autre
 * change avec lui, et il n'y a pas deux vérités à tenir d'accord.
 *
 * LE CHEVRON ET LE RETOURNEMENT NE PARAISSENT QU'EN COMPACTE. En vue normale
 * il n'y a rien derrière, et annoncer un geste qui ne mène nulle part est
 * pire que de ne rien annoncer.
 *
 * DEUX VUES, DONC :
 *
 *  - COMPACTE : le nom, la catégorie, les douze mois. On parcourt.
 *  - NORMALE, ou le dos de la compacte : qui le gère et à quel rythme, puis
 *    quatre chiffres côte à côte — 1ᵉʳ janvier, douze mois, depuis
 *    l'origine, et la VL.
 *
 * LA VL EST PASSÉE EN DERNIER, et ce n'est pas une question de place. Elle
 * ouvrait la carte comme un grand chiffre, or une valeur liquidative NE SE
 * COMPARE PAS d'un fonds à l'autre : mesurée en production, elle va de 1 188
 * à 1 288 207 FCFA, un facteur mille, et cet écart ne dit rien du placement,
 * seulement du découpage en parts. Ce qui se compare, ce sont les
 * performances. La VL garde sa place parce qu'elle est le prix auquel on
 * souscrit, mais au bout de la bande, avec sa date et son dernier mouvement.
 */
export function FundCard({ r }: { r: FundRow }) {
  const { fmtDate } = useDates();
  const depuisQuand = useDepuisQuand();
  /* Un douze mois vide veut dire deux choses : le fonds n'a pas un an, ou nos
     VL ne remontent pas à un an. La case ne peut pas les confondre. */
  /* La première VL de la courbe est le début réel de la série pour ces
     fonds-là : un fonds dont la série dépasse soixante VS a par construction
     ses douze mois, donc n'arrive jamais ici. */
  /* LA CARTE SUIT LA FENÊTRE CHOISIE comme le tableau et la liste : trois
     vues de la même liste qui ne mesureraient pas la même chose seraient
     trois listes. Le nom de la case change avec elle. */
  const fenetre = useFenetre();
  const noms = useNomFenetre();
  const def = FENETRES.find((f) => f.id === fenetre)!;
  const perf = valeurFenetre(r, fenetre);
  const raison = perf == null ? raisonSansFenetre(def.mois, r.inceptionDate, r.navDate, r.curve?.from) : undefined;
  const t = useT();
  const compact = useDensity() === "compact";
  const href = useLineHref()(r.id);
  const desk = useDeskView();
  const more = useRef<(() => void) | null>(null);
  const { ouvert, basculer, replier, idRegion } = useDepliee();
  const ytd = fundYtdPct(r.curve);
  const menu = { id: r.id, title: r.title, isin: r.isin, kind: "FONDS", sub: `${r.manager} · VL ${fmt(r.nav)} FCFA` };

  const pastille = (
    <span className={`pill ${r.open ? "open" : "quoted"}`}>{t(r.open ? "Souscription ouverte" : "Information")}</span>
  );

  /** Le corps de la vue normale. `dos` : le coin est porté par la tête de la face arrière. */
  const corps = (dos: boolean) => (
    <>
      <div className={`${styles.head} ${dos ? propres.dosTete : ""}`}>
        <div className={styles.fundId}>
          {/* LE TITRE N'EST PAS REDIT DANS L'EXTENSION (1A, 9 novembre 2026) : il est sur la carte. */}
          {!dos && <div className={styles.fundTitle}><Link href={href}>{r.title}</Link></div>}
          {/* DEUX LIGNES SOUS LE NOM, ET LE GESTIONNAIRE D'ABORD.
              Les trois faits tenaient sur une ligne, séparés par des points
              médians : « Actions · Harvest Asset Management · VL hebdomadaire »,
              soit cinquante-six caractères qui passaient à la ligne n'importe
              où selon la longueur du nom de la société. Or ce sont deux choses
              de nature différente. QUI GÈRE est l'engagement : une maison
              répond du fonds, et c'est le nom qu'on reconnaît ou qu'on va
              chercher. CE QUE C'EST et À QUEL RYTHME sont les deux
              caractéristiques du produit, et elles se lisent ensemble.
              Le gestionnaire prend donc sa ligne, seul, et les deux autres la
              suivante, côte à côte. */}
          <div className={propres.sous}>
            <span className={propres.gestion}>{r.manager}</span>
            <span className={propres.traits}>
              <i className={propres.point} data-cat={r.category} aria-hidden="true" />
              {t(FUND_CATEGORY_LABEL[r.category])} · {t(FUND_FREQUENCY_LABEL[r.frequency])}
            </span>
          </div>
        </div>
        {/* LE COIN PORTE L'ÉTAT DANS LES DEUX FACES (4A) : la pastille n'est nulle part ailleurs en vue compacte, elle reste dans l'extension ; le « ··· » reste à la carte seule. */}
        <div className={`${styles.corner} ${dos ? propres.coinDuDos : ""}`}>
          <span className={styles.etat}>
            {dos && <span className={styles.isinCoin}>{r.isin}</span>}
            {pastille}
          </span>
          {!dos && !desk && <LineMenu line={menu} cadence="evenement" openRef={more} />}
        </div>
      </div>
      <div className={styles.facts}>
        <div>
          <span>{t("1ᵉʳ janv.")}</span>
          <b className={cls(ytd)}>{signed(ytd)}</b>
          {ytd == null && <em>{t("année incomplète")}</em>}
        </div>
        <div title={depuisQuand(r, fenetre)}>
          <span>{noms[fenetre]}</span>
          <b className={cls(perf)}>{signed(perf)}</b>
          {/* Trois appels littéraux, et non un ternaire dans t() : le scanner de
              clefs ne voit pas une chaîne qui lui arrive en variable. Le nom de
              la fenêtre, lui, est un paramètre et non la clef. */}
          {/* Le trou passe avant les trois raisons : le fonds est assez
              vieux et nos VL assez longues, il manque juste une VL là où il
              en faudrait une. */}
          {perf == null && r.curve?.trous?.includes(fenetre) && <em>{t("série trouée")}</em>}
          {raison === "jeune" && <em>{t("pas encore {f}", { f: noms[fenetre] })}</em>}
          {raison === "cote-recente" && <em>{t("à la cote depuis moins de {f}", { f: noms[fenetre] })}</em>}
          {raison === "lecture-courte" && <em>{t("VL lues sur moins de {f}", { f: noms[fenetre] })}</em>}
        </div>
        <div>
          <span>{t("Depuis l'origine")}</span>
          <b className={cls(r.perfSinceInceptionPct)}>{signed(r.perfSinceInceptionPct)}</b>
          {r.inceptionDate && <em>{fmtDate(r.inceptionDate)}</em>}
        </div>
        <div>
          <span>{t("VL")}</span>
          <b className={propres.vl}>{fmt(r.nav)}</b>
          <em>
            {fmtDate(r.navDate, false)}
            {r.variationPct != null ? ` · ${signed(r.variationPct)}` : ""}
          </em>
        </div>
      </div>
      <div className={styles.foot}>
        <span className={styles.when}>
          {t("Dépositaire")} {r.depositary}
        </span>
        {/* « Voir la fiche » est dans la rangée de boutons de l'extension. */}
        {!dos && (
          <Link className="btn sm" href={href}>
            {t("Voir la fiche")} →
          </Link>
        )}
      </div>
    </>
  );

  if (!compact)
    return (
      <SwipeActions key="pleine" id={r.id}>
        <article className={styles.card} style={{ ["--card-c" as string]: "var(--info)" }}>
          {corps(false)}
        </article>
      </SwipeActions>
    );

  return (
    <SwipeActions key="compacte" id={r.id} cadence="evenement">
      <Depliable ouvert={ouvert} replier={replier}>
        <article className={`${styles.card} ${propres.compacte}`} style={{ ["--card-c" as string]: "var(--info)" }}>
          <Link href={href} className={propres.cLien}>
            <span className={propres.cNom}>
              <b>{r.title}</b>
              <small>
                <i className={propres.point} data-cat={r.category} aria-hidden="true" />
                {t(FUND_CATEGORY_LABEL[r.category])}
              </small>
            </span>
            <span className={propres.cPerf}>
              <b className={cls(perf)}>{signed(perf)}</b>
              <em>{noms[fenetre]}</em>
            </span>
          </Link>
          <Outils>
            {!desk && <LineMenu line={menu} cadence="evenement" openRef={more} className={classePoints} />}
            <ChevronDeplie ouvert={ouvert} onClick={basculer} idRegion={idRegion} />
          </Outils>
        </article>
        {/* LE DOS EST L'EXTENSION (4A) : tout ce que disait le dos, puis les trois boutons. */}
        <Extension ouvert={ouvert} idRegion={idRegion}>
          <div className={propres.dos}>{corps(true)}</div>
          <BoutonsDeLaCarte id={r.id} href={href} kind="FONDS" cadence="evenement" agir={!desk} />
        </Extension>
      </Depliable>
    </SwipeActions>
  );
}
