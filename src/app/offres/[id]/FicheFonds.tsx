import type { ReactNode } from "react";
import { Carte } from "@/components/Carte";
import { CourbeDeLaVL } from "@/components/CourbeDeLaVL";
import { Info } from "@/components/Info";
import { Majeur, Mosaique } from "@/components/Mosaique";
import { PastilleVariation } from "@/components/PastilleVariation";
import { FUND_CATEGORY_LABEL, FUND_FREQUENCY_ADJ } from "@/lib/domain/market";
import { fundAnnualPct } from "@/lib/domain/fund-perf";
import type { Offer } from "@/lib/domain/types";
import { estUnBulletin } from "@/lib/fiche-volets";
import { fmt, fmtDate, fmtPct } from "@/lib/format";
import { getT } from "@/i18n/server";
import { IssuerCard } from "./IssuerCard";
import type { FicheData } from "./FicheReading";
import styles from "./page.module.css";
import fa from "./FicheAction.module.css";

/**
 * LA FICHE D'UN FONDS, CALQUÉE SUR CELLE D'UN TITRE (10 novembre 2026, planche « 1A · 2B · 3A · 4A »).
 *
 * Même langue que la fiche d'une action : titre à plat puis carte en relief, 44 px entre deux sections (le groupe « chapitres »), un chiffre majeur et des tuiles.
 * Trois onglets, comme Titres : Essentiel · Documents · Société de gestion (la société tient la place de l'émetteur).
 * L'Essentiel enchaîne : la valeur liquidative et sa courbe (une courbe, trois mesures, une liste de périodes), les chiffres clés, « Investir », puis les lignes
 * similaires et le pied de la page. Rien du barème du desk n'est montré ; les frais du fonds (entrée et sortie) restent écrits. Le desk garde la lecture d'avant.
 */
const signe = (v: number) => `${v > 0 ? "+" : ""}${fmtPct(v, 2)}`;

function Bloc({ pane, titre, children, plat = false, fin, info }: { pane: string; titre: string; children: ReactNode; plat?: boolean; fin?: ReactNode; info?: string }) {
  return (
    <section className={styles.sec} data-pane={pane}>
      <h3>
        {titre}
        {info && <Info text={info} label={titre} />}
      </h3>
      <Carte plat={plat}>{children}</Carte>
      {fin}
    </section>
  );
}

export async function FicheFonds({ o, data }: { o: Offer; data: FicheData }) {
  const t = await getT();
  const f = o.fund;
  if (!f) return null;
  const now = new Date();
  const { navs, btaBenchmark, others, profile, company, issuer, gestionnaire } = data;
  const series = [...navs].reverse().map((n) => ({ date: n.navDate, nav: n.nav, variationPct: n.variationPct, perfSinceInceptionPct: n.perfSinceInceptionPct, bulletinNo: n.bulletinNo }));
  const annuel = fundAnnualPct(f, now);
  const perf = f.perf1yPct != null ? { etiquette: t("Performance sur 12 mois"), v: f.perf1yPct } : { etiquette: f.inceptionDate ? t("Depuis l'origine ({d})", { d: fmtDate(f.inceptionDate) }) : t("Depuis l'origine"), v: f.perfSinceInceptionPct };
  const mention = <p className={fa.mention}>{t("Communication à caractère promotionnel. Risque de perte en capital.")}</p>;
  const documents = o.documents.filter((d) => !estUnBulletin(d));
  const initiales = f.manager.replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  /* CHIFFRES CLÉS (planche 2B, sans les droits d'entrée) : le chiffre du bulletin en majeur avec sa date, l'annualisé depuis la création DATÉ en tuile, puis les faits du fonds. La période choisie, elle, vit dans « Évolution » avec ses dates. */
  const tuilesCles: [string, string][] = [];
  if (annuel != null && f.inceptionDate) tuilesCles.push([t("Rendement annualisé depuis le {d}", { d: fmtDate(f.inceptionDate) }), signe(annuel)]);
  tuilesCles.push([t("Catégorie"), t(FUND_CATEGORY_LABEL[f.category])]);
  if (FUND_FREQUENCY_ADJ[f.frequency]) tuilesCles.push([t("Fréquence de la VL"), t(FUND_FREQUENCY_ADJ[f.frequency])]);
  if (f.exitFeePct > 0) tuilesCles.push([t("Frais du fonds à la sortie"), fmtPct(f.exitFeePct, 2)]);

  /* SIÈGE ET AGRÉMENT : saisis au desk, jamais inventés. Une tuile sans valeur n'est pas écrite. */
  const tuilesGestion: [string, string][] = [];
  if (gestionnaire?.siege) tuilesGestion.push([t("Siège"), gestionnaire.siege]);
  if (gestionnaire?.agrementNo) tuilesGestion.push([t("N° d'agrément"), gestionnaire.agrementNo]);
  if (gestionnaire?.agrementDate) tuilesGestion.push([t("Date d'agrément"), fmtDate(gestionnaire.agrementDate)]);
  tuilesGestion.push([t("Dépositaire"), f.depositary]);
  if (f.cutoff) tuilesGestion.push([t("Centralisation"), f.cutoff]);
  tuilesGestion.push([t("Fréquence de la VL"), FUND_FREQUENCY_ADJ[f.frequency] ? t(FUND_FREQUENCY_ADJ[f.frequency]) : "—"]);

  return (
    <>
      {/* ESSENTIEL : la VL et sa courbe, les chiffres clés, « Investir ». */}
      <Bloc pane="essentiel" titre={t("Évolution")} info={t("La valeur liquidative du fonds et sa courbe. Un commutateur choisit ce que la courbe mesure : la valeur, le rendement annualisé ou ce que vaudraient 1 000 000 FCFA placés ; le chiffre du haut suit ce choix. La période se choisit dans la liste : la performance et l'annualisée des tuiles sont calculées sur nos VL publiées entre les deux dates écrites sous la courbe. Les performances passées ne préjugent pas des performances futures.")}>
        {series.length > 1 ? <CourbeDeLaVL series={series} benchmark={btaBenchmark} /> : <Majeur etiquette={t("Dernière VL · {d}", { d: fmtDate(f.navDate) })} valeur={fmt(f.nav)} unite="FCFA" sous={f.variationPct != null ? <PastilleVariation v={f.variationPct} periode={t("dernière VL")} /> : undefined} />}
      </Bloc>

      <Bloc pane="essentiel" titre={t("Chiffres clés")} info={t("La performance du fonds sur douze mois, telle que le bulletin la publie, puis les faits qui l'accompagnent. Le rendement annualisé ramène à un an la performance depuis la création, pour comparer deux fonds d'âges différents ; il ne paraît qu'au-delà de six mois de vie. Chiffres bruts, avant droits d'entrée et de sortie et fiscalité.")}>
        <Mosaique majeur={<Majeur etiquette={perf.etiquette} valeur={signe(perf.v)} or sous={f.perf1yPct != null ? t("sur les 12 mois jusqu'au {d} · chiffre du bulletin", { d: fmtDate(f.navDate) }) : t("chiffre du bulletin, jusqu'au {d}", { d: fmtDate(f.navDate) })} />} tuiles={tuilesCles} deux />
      </Bloc>

      {/* DOCUMENTS : des rangées à plat dans une carte, comme une action. */}
      {documents.length > 0 && (
      <section className={styles.sec} data-pane="docs">
        <h3>
          {t("Documents")}
          <Info text={t("Les pièces publiées sur ce fonds.")} label={t("Documents")} />
        </h3>
        <Carte plat>
          <div className={fa.rangees}>
            {documents.map((d, i) => {
              const href = d.url ?? (d.fileKey ? `/offres/${o.id}/doc/${i}` : undefined);
              if (!href) return null;
              return (
                <a key={`${d.name}-${i}`} className={fa.rangee} href={href} target="_blank" rel="noreferrer">
                  <span>
                    <b>{t(d.name)}</b>
                    <small>{d.meta}</small>
                  </span>
                  <i aria-hidden="true">↗</i>
                </a>
              );
            })}
          </div>
        </Carte>
        {mention}
      </section>
      )}

      {/* SOCIÉTÉ DE GESTION : tient la place de l'émetteur. Ses autres fonds, rangés, dessous. */}
      <Bloc pane="emetteur" titre={t("Société de gestion")} fin={others.length === 0 ? mention : undefined} info={t("La société qui gère le fonds, son dépositaire, et le moment jusqu'où un ordre est pris pour la prochaine valeur liquidative.")}>
        <Mosaique
          majeur={
            <div className={fa.identite}>
              <span className={fa.avatar} aria-hidden="true">
                {initiales}
              </span>
              <div>
                <b>{f.manager}</b>
                <small>
                  {t("Société de gestion")} · {t(o.countryName)}
                </small>
              </div>
            </div>
          }
          tuiles={tuilesGestion}
          deux
        />
      </Bloc>
      {others.length > 0 && (
        <Bloc pane="emetteur" titre={t("Ses autres lignes à Guichet")} fin={mention} info={t("Les autres lignes de cette société de gestion proposées à Guichet.")}>
          <IssuerCard profile={profile} o={o} others={others} company={company} issuer={issuer} lignesSeulement />
        </Bloc>
      )}
    </>
  );
}
