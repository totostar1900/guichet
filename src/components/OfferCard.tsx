"use client";

import { useSuivi } from "@/lib/ui/suivi";
import { useT } from "@/i18n/client";
import Link from "next/link";
import type { Offer } from "@/lib/domain/types";
import type { OfferSummary } from "@/lib/domain/summary";
import { LineIdentity } from "./LineIdentity";
import { LineMenu } from "./mobile/LineMenu";
import { useDeskView, useLineHref } from "./DeskView";
import { SwipeActions } from "./mobile/SwipeActions";
import { useRef } from "react";
import { famVars } from "@/lib/registry";
import { useDensity } from "./Density";
import { lieuDe } from "@/lib/domain/sections";
import { MiniCourbe } from "./MiniCourbe";
import { issuerZone } from "@/data/issuer-registry";
import { Drapeau } from "./Drapeau";
import styles from "./OfferCard.module.css";

export const Turn = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
    <path d="M18 3v4h-4M6 21v-4h4" />
  </svg>
);

/**
 * One number, three facts, one action. The « ··· » sits in the corner by
 * the status, « Voir la fiche » at the foot; on the phone the card pulls
 * left for « Déclarer » and « Me rappeler », and turns over (a pull to the
 * right) to show the four figures of the list, the ISIN and the closing.
 *
 * COMPACTE (le réglage du téléphone) : l'émetteur, sa promesse en gris, et à
 * droite le seul chiffre en avant avec son origine sous lui. Elle portait
 * jusqu'au 4 octobre 2026 une phrase de 89 caractères dans une place qui en
 * laisse 33, et le lecteur voyait « actuariel annuel brut au cours 9… » : les
 * qualificatifs passaient, « aucun échange relevé » et « coupon 6,60 % »
 * tombaient dans les points de suspension. Les trois champs courts viennent du
 * résumé, qui les compose avec l'heure du serveur (domain/carte-compacte.ts).
 *
 * LA PASTILLE DE STATUT DESCEND dans la ligne grise et ne remonte que
 * lorsqu'elle annonce un événement, une clôture proche : elle disait « Cotée »
 * sur presque toutes les cartes, et ce coin est la place la plus chère de
 * l'écran. LE « ··· » ET LE RETOURNEMENT RESTENT, dans une colonne à eux :
 * « Suivre » ne se fait nulle part ailleurs, et en compacte le dos est le seul
 * endroit où vivent les quatre autres chiffres.
 */
/**
 * LA CLOCHE DIT QU'UNE ALERTE EST ARMÉE, et elle manquait.
 *
 * On arme une alerte en tirant la carte vers la gauche, puis on relâche : le
 * mot « Alerte armée » passe une seconde et demie, et la carte redevient
 * exactement ce qu'elle était. Rien, ensuite, ne distingue une ligne surveillée
 * d'une autre — ni dans la liste, ni au retour sur la page. Le lecteur qui
 * doute retire son alerte pour voir, ou en pose une seconde.
 *
 * La cloche est donc dans le coin, AVANT la pastille d'état : l'état de la
 * séance se lit en dernier parce qu'il appartient au marché, l'alerte en
 * premier parce qu'elle appartient au lecteur.
 */
function Cloche() {
  const t = useT();
  return (
    <span className={styles.cloche} title={t("Alerte armée")} aria-label={t("Alerte armée")} role="img">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z M10 20h4" />
      </svg>
    </span>
  );
}

/**
 * UN MONTANT EN FRANCS, LE « FCFA » RÉDUIT (4 novembre 2026) : « abréger dividende, réduire FCFA sur les deux montants ». Sur la carte
 * compacte d'une action, « Div. 2 500 FCFA » et « cours 90 000 FCFA » gardent le chiffre en tête et l'unité en petit.
 */
function Montant({ etiquette, n }: { etiquette: string; n: string }) {
  return (
    <>
      {etiquette} {n}
      <i className={styles.fcfa}>FCFA</i>
    </>
  );
}

/**
 * LE PRIX D'UNE ACTION EN AVANT, SA VARIATION SUR TROIS MOIS À CÔTÉ (6 novembre 2026, choix 1·1 et 3·1 de la planche).
 *
 * Aucune application de référence ne met le rendement d'un dividende en gros sur une action : le prix domine, la variation est son satellite (couleur,
 * flèche, PÉRIODE ÉCRITE), le dividende est une case de la grille. Les obligations, bons, fonds et adjudications gardent leur chiffre en avant.
 */
function Variation({ pct, court = false }: { pct: number; court?: boolean }) {
  const t = useT();
  const sens = pct > 0.05 ? "hausse" : pct < -0.05 ? "baisse" : "";
  const flèche = sens === "hausse" ? "▲ " : sens === "baisse" ? "▼ " : "";
  const signe = sens === "hausse" ? "+" : sens === "baisse" ? "−" : "";
  return (
    <span className={styles.variation}>
      <em className={`${styles.variationNb} ${sens === "hausse" ? styles.hausseC : sens === "baisse" ? styles.baisseC : ""}`}>
        {flèche}
        {signe}
        {Math.abs(pct).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
      </em>
      <span className={styles.periode}> · {court ? t("3 mois") : t("sur 3 mois")}</span>
    </span>
  );
}

/** La grille d'une action dont le prix est en avant : le dividende, son rendement, depuis quand le cours n'a pas bougé (le ticket redit le cours, sauf lot supérieur à un). */
const faitsAction = (s: OfferSummary): [string, string, string?][] => {
  const trouve = (cle: string) => s.facts.find(([k]) => k === cle);
  const out: [string, string, string?][] = [];
  const div = trouve("Dividende");
  if (div) out.push([div[0], div[1], div[2]]);
  if (s.hero && s.hero !== "—") out.push(["Rendement", s.hero, "du dividende"]);
  const cours = trouve("Cours");
  const age = cours?.[2];
  const ticket = trouve("Ticket min.");
  if (age) out.push(["Cours inchangé depuis", age]);
  /* Le ticket ne reste que s'il dit autre chose que le prix : pour une action à l'unité il le redit mot pour mot (« 90 000 FCFA » deux fois sur la même carte). */
  else if (ticket && ticket[1] !== cours?.[1]) out.push([ticket[0], ticket[1], ticket[2]]);
  return out;
};

/** « 90 000 FCFA » → le nombre, et l'unité réduite. */
const prixDe = (s: OfferSummary): { nombre: string; unite: boolean } | null => {
  const c = s.facts.find(([k]) => k === "Cours")?.[1];
  if (!c || c === "—") return null;
  return { nombre: c.replace(/\s*FCFA$/, ""), unite: /FCFA$/.test(c) };
};

export function OfferCard({ o, s, suivi = false, courbe }: { o: Offer; s: OfferSummary; suivi?: boolean; /** Le petit graphe sur trois mois d'une action : la forme du cours, avec sa variation. */ courbe?: { serie: number[]; variationPct: number } }) {
  const href = useLineHref()(o.id);
  const desk = useDeskView();
  const t = useT();
  const compact = useDensity() === "compact";
  const estAction = o.kind === "MARCHE" && o.instrument === "action";
  const prix = estAction ? prixDe(s) : null;
  const avecCoupon = (o.kind === "OTA" || o.kind === "APE") && s.coupon !== "—";
  // « Clôture · jeu. 15 oct. 17 h 00 » on the card's foot; a listed line reads « cotation continue ».
  const continuous = s.deadline === "continue";
  const when = continuous ? t("cotation continue") : t(s.deadline);
  const whenLabel = continuous || !when ? null : <em className={styles.whenLabel}>{t("Clôture")}</em>;
  const more = useRef<(() => void) | null>(null);
  const turn = useRef<(() => void) | null>(null);
  const [suiviEtat] = useSuivi(o.id, suivi);
  const menu = { id: o.id, title: o.title, isin: o.isin, sub: `${s.subtitle} · ${s.hero} ${s.heroUnit ?? ""}`.trim() };
  /** Le corps de la vue détaillée. `dos` : le coin est porté par la tête de la face arrière. */
  const corps = (dos: boolean) => (
    <>
          <div className={`${styles.head} ${dos ? styles.dosTete : ""}`}>
            <LineIdentity o={o} s={s} href={dos ? undefined : href} size="lg" isin={false} />
            {!dos && (
              <div className={styles.corner} data-coach="titres-etat">
                <span className={styles.etat}>
                  {suiviEtat && <Cloche />}
                  <span className={`pill ${s.statusClass}`}>{s.countdown ? s.countdown : t(s.status)}</span>
                </span>
                {!desk && <LineMenu line={menu} watching={suivi} cadence={lieuDe(o) === "adjudications" ? "quotidien" : "evenement"} openRef={more} />}
              </div>
            )}
          </div>
          {estAction && prix ? (
            <div className={styles.bigAction} data-coach="titres-prix">
              <div className={styles.prixCol}>
                <b className={styles.prix}>
                  {prix.nombre}
                  {prix.unite && <i className={styles.fcfa}>FCFA</i>}
                </b>
                {courbe && <Variation pct={courbe.variationPct} />}
              </div>
              {courbe && (
                <span className={styles.courbe}>
                  <MiniCourbe serie={courbe.serie} />
                </span>
              )}
            </div>
          ) : (
          <div className={`${styles.big} ${avecCoupon ? styles.duo : ""}`} data-coach="titres-prix">
              {/* LE COUPON À LA TAILLE DU RENDEMENT (7 novembre 2026, choix 1b A) : ce que l'État verse, puis ce que vous gagnez au prix servi. Sorti de la grille. */}
              {avecCoupon && (
                <span className={styles.chiffre}>
                  <b className={styles.coupon}>{s.coupon}</b>
                  <small>{t("coupon")}</small>
                </span>
              )}
              <span className={avecCoupon ? styles.chiffre : styles.contenu}>
              <b className={s.gold ? styles.taux : ""}>{s.hero}</b>
              <small>{t(s.heroSub)}</small>
              </span>
              {/* LE GRAPHE À DROITE DU CHIFFRE EN AVANT (option A de la planche du 4 novembre) : le dividende reste le chiffre en avant, la
                  forme du cours sur trois mois dit le reste, avec sa variation. La carte ne grandit pas. */}
              {courbe && (
                <span className={styles.courbe}>
                  <MiniCourbe serie={courbe.serie} />
                  <em className={`${styles.pctCourbe} ${courbe.variationPct > 0.05 ? styles.hausseC : courbe.variationPct < -0.05 ? styles.baisseC : ""}`}>
                    {courbe.variationPct > 0.05 ? "+" : courbe.variationPct < -0.05 ? "−" : ""}
                    {Math.abs(courbe.variationPct).toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
                  </em>
                </span>
              )}
              <span className={styles.whenC}>
                {whenLabel}
                {when}
              </span>
            </div>
          )}
          <div className={styles.facts} data-coach="titres-grille">
            {(estAction && prix ? faitsAction(s) : avecCoupon ? s.facts.filter(([k]) => k !== "Coupon") : s.facts).map(([k, v, note]) => (
              <div key={k}>
                <span>{t(k)}</span>
                <b>{v}</b>
                {note && <em>{t(note)}</em>}
              </div>
            ))}
          </div>
          <div className={styles.foot} data-coach="titres-pied">
            {/* L'ISIN DESCEND AU PIED, en face de « Voir la fiche ». Il ne sert
                qu'à passer un ordre en banque, jamais à reconnaître une ligne :
                sa place est au bas de la carte, là où l'on agit, et non dans la
                ligne grise, où il coupait la lecture entre l'émetteur et le
                chiffre. Le pied avait la place depuis que « cotation continue »
                en est parti. */}
            <span className={styles.footIsin}>{o.isin}</span>
            {/* « Cotation continue » se lisait ici ET dans la ligne grise sous
                le titre, à quatre lignes d'écart. Le pied ne garde que ce qui
                presse : la clôture d'une séance. Une ligne cotée n'en a pas. */}
            {!continuous && (
              <span className={styles.when}>
                {whenLabel}
                {when}
              </span>
            )}
            <Link className="btn sm" href={href}>
              {t("Voir la fiche")} →
            </Link>
          </div>
    </>
  );
  const detaillee = () => (
        <article data-coach="titres-carte" className={`${styles.card} ${s.past ? styles.past : ""}`} style={{ ["--card-c" as string]: `var(--fam-${s.family}, ${famVars(s.family)["--fam-c"] ?? "var(--line-2)"})` }}>
      {corps(false)}
    </article>
  );
  const cadence = lieuDe(o) === "adjudications" ? "quotidien" : "evenement";
  /* PAS DE DOS EN VUE DÉTAILLÉE (6 novembre 2026) : la carte détaillée est déjà tout ce qu'on peut en dire. Sans dos, ni chevron à gauche ni icône de
     retournement. En vue compacte, le dos EST la carte détaillée, comme sur les fonds. */
  if (!compact) {
    return (
      <SwipeActions key="pleine" id={o.id} cadence={cadence} suivi={suivi}>
        {detaillee()}
      </SwipeActions>
    );
  }
  return (
    <SwipeActions
      key="compacte"
      id={o.id}
      turnRef={turn}
      /* Une seance se rappelle chaque jour jusqu a sa cloture, une ligne cotee
         se suit a chaque changement : deux marches, deux cadences. */
      cadence={cadence}
      suivi={suivi}
      backHead={
        <div className={styles.corner}>
          <span className={styles.etat}>
            {suiviEtat && <Cloche />}
            <span className={`pill ${s.statusClass}`}>{s.countdown ? s.countdown : t(s.status)}</span>
          </span>
          {/* LE DOS N'A PLUS SON ICÔNE DE RETOURNEMENT : elle proposait un
              geste que le glissement fait déjà, et la bascule n'existe que
              sous 760 px, où le doigt est toujours disponible. Le « ··· »
              reste, lui : aucun geste ne l'ouvre. */}
          <button type="button" className={styles.dotsBack} onClick={() => more.current?.()} aria-label={t("Plus d'actions")}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          {/* L'ICÔNE DE RETOURNEMENT EST REVENUE AU DOS (5 novembre 2026), sous le « ··· » : le glissement ne se devine pas, et sur le dos on cherche d'abord comment revenir. */}
          <button type="button" className={styles.flipBtn} onClick={() => turn.current?.()} aria-label={t("Retourner la carte")} title={t("Retourner la carte")}>
            <Turn />
          </button>
        </div>
      }
      back={<div className={styles.dos}>{corps(true)}</div>}
    >
        <article data-coach="titres-carte" className={`${styles.card} ${styles.compact} ${s.past ? styles.past : ""}`} style={{ ["--card-c" as string]: `var(--fam-${s.family}, ${famVars(s.family)["--fam-c"] ?? "var(--line-2)"})` }}>
          <Link href={href} className={styles.cLink}>
            <span className={styles.cId}>
              <b className={styles.cCode}>{issuerZone(o) !== "CEMAC" && <Drapeau pays={o.country} largeur={17} />} {s.code}</b>
              <small className={styles.cSub}>{s.countdown ? <em className={styles.cClose}>{t("clôture dans {d}", { d: s.countdown })}</em> : estAction && prix && s.hero !== "—" ? `${t("Div.")} ${s.hero}` : s.promesse.key === "Dividende {n} FCFA" ? <Montant etiquette={t("Div.")} n={String(s.promesse.params?.n ?? "")} /> : t(s.promesse.key, s.promesse.params)}</small>
            </span>
            {/* LE GRAPHE D'ÉVOLUTION DU TITRE, AU MILIEU DE LA TUILE (4 novembre 2026) : entre le nom et le chiffre, la forme du cours sur
                trois mois. Seules les actions en ont un. */}
            {courbe && <MiniCourbe serie={courbe.serie} largeur={76} hauteur={28} />}
            <span className={styles.cNum} data-coach="titres-chiffre">
              {estAction && prix ? (
                <>
                  <b>
                    {prix.nombre}
                    {prix.unite && <i className={styles.fcfa}>FCFA</i>}
                  </b>
                  {courbe && (
                    <small>
                      <Variation pct={courbe.variationPct} court />
                    </small>
                  )}
                </>
              ) : (
                <>
              <b className={s.gold ? styles.taux : ""}>{s.hero}</b>
              <small>{s.origine.key === "cours {n} FCFA" ? <Montant etiquette={t("cours")} n={String(s.origine.params?.n ?? "")} /> : t(s.origine.key, s.origine.params)}</small>
                </>
              )}
            </span>
          </Link>
          <span className={styles.cTools}>
            {!desk && <LineMenu line={menu} watching={suivi} cadence={lieuDe(o) === "adjudications" ? "quotidien" : "evenement"} openRef={more} className={styles.cDots} />}
            <button type="button" data-coach="titres-retourner" className={styles.cFlip} onClick={() => turn.current?.()} aria-label={t("Retourner la carte")} title={t("Retourner la carte")}>
              <Turn />
            </button>
          </span>
        </article>
    </SwipeActions>
  );
}
