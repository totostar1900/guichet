import type { ReactNode } from "react";
import Link from "next/link";
import { BarresDeComptes } from "@/components/BarresDeComptes";
import { Carte } from "@/components/Carte";
import { CourbeDuCours } from "@/components/CourbeDuCours";
import { CrossSignal } from "@/components/CrossSignal";
import { KpiCard } from "@/components/KpiCard";
import { Majeur, Mosaique } from "@/components/Mosaique";
import { PastilleVariation } from "@/components/PastilleVariation";
import { explainKpis } from "@/lib/domain/explain";
import { tradedSession } from "@/lib/domain/market";
import type { Offer } from "@/lib/domain/types";
import { displayYield } from "@/lib/domain/status";
import { daysBetween } from "@/lib/finance";
import { fmt, fmtDate, fmtPct, fmtScaled, localIso, pickScale } from "@/lib/format";
import { voletsMasques } from "@/lib/fiche-volets";
import { getT } from "@/i18n/server";
import { IssuerCard } from "./IssuerCard";
import type { FicheData } from "./FicheReading";
import styles from "./page.module.css";
import fa from "./FicheAction.module.css";

/**
 * LA FICHE D'UNE ACTION : DES ENCADRÉS EN RELIEF, DES GRAPHES, DES MOSAÏQUES (9 novembre 2026).
 *
 * Planche validée « 1A · 2B · 3 · 4 · 44 px · le rendement en majeur · Émetteur · cartes » :
 * - chaque section est un TITRE À PLAT puis une carte en relief (`Carte`), 44 px entre deux sections (le groupe « chapitres » de la lecture) ;
 * - un chiffre MAJEUR à la taille dominante, les autres dessous côte à côte, deux par deux (`Mosaique`) ;
 * - les graphes viennent de données déjà en base : la courbe du cours et ses volumes (la cote), les dividendes et les comptes (la fiche de la société) ;
 * - l'Émetteur porte la société : identité, performance financière, actionnaires. Les lignes similaires défilent en cartes (`LignesSimilaires`).
 * Le desk garde la lecture d'avant : cette fiche est celle du client seulement.
 */
const signe = (v: number) => `${v > 0 ? "+" : ""}${fmtPct(v, 2)}`;
const titres = (n: number) => `${fmt(n)} titre${n > 1 ? "s" : ""}`;

function Bloc({ pane, titre, children, plat = false }: { pane: string; titre: string; children: ReactNode; plat?: boolean }) {
  return (
    <section className={styles.sec} data-pane={pane}>
      <h3>{titre}</h3>
      <Carte plat={plat}>{children}</Carte>
    </section>
  );
}

export async function FicheAction({ o, data, base, noteBulle }: { o: Offer; data: FicheData; base: string; /** « Chiffres de référence ⓘ · Essayer le simulateur → », rangée au pied de la simulation. */ noteBulle: ReactNode }) {
  const t = await getT();
  const now = new Date();
  const { company, quotes, variation3m, facing, stamp, profile, others, issuer } = data;
  const dy = displayYield(o);
  const yTxt = dy.pct != null ? `${dy.approx ? "≈ " : ""}${fmtPct(dy.pct, 2)}` : "—";
  const explains = explainKpis(o, now);
  const age = o.priceSince ? daysBetween(o.priceSince, localIso(now)) : 0;
  const dernier = quotes[0];
  const tradee = quotes.find(tradedSession);
  const points = [...quotes].reverse().map((q) => ({ d: q.sessionDate, c: q.close, v: q.volumeTraded }));
  const comparer = `${base}/comparer?a=${o.id}`;

  const tuilesCles: [string, string][] = [];
  if (o.dividendPerShare) tuilesCles.push([t("Dividende brut"), `${fmt(o.dividendPerShare)} FCFA`]);
  if (company?.freeFloatPct) tuilesCles.push([t("Flottant"), fmtPct(company.freeFloatPct, 2)]);
  if (company?.ipoPrice) tuilesCles.push([t("Prix d'introduction"), `${fmt(company.ipoPrice)} FCFA`]);
  if (company?.listedOn) tuilesCles.push([t("Cotée depuis"), fmtDate(company.listedOn)]);

  const ref = o.ask ?? o.lastPrice ?? 0;
  const n = 100;
  const divAttendu = o.dividendPerShare ? n * o.dividendPerShare : 0;
  const divs = (company?.figures ?? []).filter((f) => typeof f.dividendPerShare === "number");
  const dernierDiv = divs[divs.length - 1];
  const precedents = divs.slice(0, -1).reverse().slice(0, 3).map((f): [string, string] => [t("Exercice {y}", { y: String(f.year) }), `${fmt(f.dividendPerShare as number)} FCFA`]);
  const comptes = company?.figures ?? [];
  const dernierCompte = comptes[comptes.length - 1];
  const echelle = pickScale(comptes.flatMap((f) => [f.revenue, f.netIncome, f.totalAssets, f.equity]));
  const lienSociete = profile?.href ?? (company ? `/societes/${company.mnemo.toLowerCase()}` : undefined);
  const initiales = (company?.shortName ?? o.issuer).replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const emetteur = !voletsMasques(o).includes("emetteur");

  return (
    <>
      {/* ESSENTIEL : le cours et sa courbe, les chiffres clés, la dernière séance, la cotation. */}
      <Bloc pane="essentiel" titre={t("Cours")}>
        <Majeur
          etiquette={o.lastPriceOn ? t("Dernier cours · {d}", { d: fmtDate(o.lastPriceOn) }) : t("Dernier cours")}
          valeur={o.lastPrice != null ? fmt(o.lastPrice) : "—"}
          unite="FCFA"
          sous={
            <>
              {variation3m && <PastilleVariation v={variation3m.pct} periode={t("3 mois")} />}
              {age >= 1 && <span className={fa.age}> {t("même cours depuis {n} jours", { n: age })}</span>}
            </>
          }
        />
        {points.length > 1 && <CourbeDuCours points={points} introduction={company?.listedOn} />}
        {o.priceSource !== "boc" && <p className={fa.note}>{t(stamp)}</p>}
      </Bloc>

      <Bloc pane="essentiel" titre={t("Chiffres clés")}>
        <Mosaique majeur={<KpiCard forme="heros" label="Rendement du dernier dividende" value={yTxt} gold explain={explains[0]} compareHref={comparer} coach="hero" />} tuiles={tuilesCles} />
        <CrossSignal o={o} facing={facing} />
      </Bloc>

      {dernier && (
        <Bloc pane="essentiel" titre={t("Dernière séance")}>
          <Mosaique
            majeur={<Majeur etiquette={t("Clôture · {d}", { d: fmtDate(dernier.sessionDate) })} valeur={fmt(dernier.close)} unite="FCFA" sous={<PastilleVariation v={dernier.variationPct} periode={t("séance")} />} />}
            tuiles={[
              [t("Dernière transaction"), tradee ? `${fmtDate(tradee.sessionDate)}${tradee.volumeTraded > 0 ? ` · ${titres(tradee.volumeTraded)}` : ""}` : t("aucune sur {n} séances", { n: String(quotes.length) })],
              [t("Seuils de séance"), `${fmt(dernier.thresholdLow)} – ${fmt(dernier.thresholdHigh)}`],
              [t("Volume échangé"), `${titres(dernier.volumeTraded)} · ${fmt(dernier.valueTraded)} FCFA`],
              [t("Référence prochaine séance"), `${fmt(dernier.referenceNext)} FCFA`],
            ]}
          />
        </Bloc>
      )}

      <Bloc pane="essentiel" titre={t("Cotation et règlement")}>
        <Mosaique
          majeur={<Majeur etiquette={t("Règlement")} valeur={`T+${o.settlementDays ?? 3}`} />}
          tuiles={[
            [t("Marché"), o.market ?? "—"],
            [t("Cotation"), t("continue, jours ouvrés")],
          ]}
        />
        <p className={fa.texte}>{t(o.blurb)}</p>
      </Bloc>

      {/* CHIFFRES : la simulation, l'évolution du cours, les dernières séances, les dividendes. */}
      <Bloc pane="chiffres" titre={t(`Pour ${n} actions au cours vendeur`)}>
        <Mosaique
          majeur={<Majeur etiquette={t("À décaisser")} valeur={fmt(n * ref)} unite="FCFA" sous={t("{n} actions au cours vendeur", { n: fmt(n) })} />}
          tuiles={[[t("Cours vendeur"), `${fmt(ref)} FCFA`], ...(divAttendu ? ([[t("Dividende annuel attendu, s'il est maintenu"), `${fmt(divAttendu)} FCFA`]] as [string, string][]) : [])]}
        />
        {noteBulle}
      </Bloc>

      {points.length > 1 && (
        <Bloc pane="chiffres" titre={t("Évolution du cours")}>
          <CourbeDuCours points={points} introduction={company?.listedOn} hauteur={150} />
          <p className={fa.note}>{t("Ces cours ne préjugent pas du prix auquel votre ordre sera exécuté.")}</p>
        </Bloc>
      )}

      {quotes.length > 0 && (
        <Bloc pane="chiffres" titre={t("Dernières séances")}>
          <table className={fa.seances}>
            <thead>
              <tr>
                <th>{t("Séance")}</th>
                <th>{t("Clôture")}</th>
                <th>{t("Var.")}</th>
                <th>{t("Volume")}</th>
              </tr>
            </thead>
            <tbody>
              {quotes.slice(0, 5).map((q) => (
                <tr key={q.sessionDate}>
                  <td>{fmtDate(q.sessionDate)}</td>
                  <td>{fmt(q.close)}</td>
                  <td className={q.variationPct < 0 ? fa.baisse : q.variationPct > 0 ? fa.hausse : undefined}>{signe(q.variationPct)}</td>
                  <td>{fmt(q.volumeTraded)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {quotes.length > 5 && (
            <details className={fa.plus}>
              <summary>{t("Voir les {n} séances", { n: Math.min(quotes.length, 40) })}</summary>
              <table className={fa.seances}>
                <tbody>
                  {quotes.slice(5, 40).map((q) => (
                    <tr key={q.sessionDate}>
                      <td>{fmtDate(q.sessionDate)}</td>
                      <td>{fmt(q.close)}</td>
                      <td className={q.variationPct < 0 ? fa.baisse : q.variationPct > 0 ? fa.hausse : undefined}>{signe(q.variationPct)}</td>
                      <td>{fmt(q.volumeTraded)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </Bloc>
      )}

      {dernierDiv && (
        <Bloc pane="chiffres" titre={t("Dividendes")}>
          <Mosaique
            majeur={
              <>
                <Majeur etiquette={t("Dernier dividende · exercice {y}", { y: String(dernierDiv.year) })} valeur={fmt(dernierDiv.dividendPerShare as number)} unite={t("FCFA par action")} />
                <BarresDeComptes annees={divs.map((f) => String(f.year))} series={[{ nom: t("Dividende brut par action"), valeurs: divs.map((f) => f.dividendPerShare as number), teinte: "or" }]} resume={divs.map((f) => `${f.year} : ${fmt(f.dividendPerShare as number)} FCFA`).join(", ")} />
              </>
            }
            tuiles={[[t("Rendement"), yTxt], ...precedents]}
          />
        </Bloc>
      )}

      {/* DOCUMENTS : des rangées à plat dans une carte. */}
      <section className={styles.sec} data-pane="docs">
        <h3>{t("Documents")}</h3>
        <Carte plat>
          {o.documents.length === 0 ? (
            <div className={fa.vide}>
              <b>{t("Aucun document pour le moment")}</b>
              <span>{t("Le communiqué des résultats s'y range dès qu'il est publié.")}</span>
            </div>
          ) : (
            <div className={fa.rangees}>
              {o.documents.map((d, i) => {
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
          )}
        </Carte>
      </section>

      {/* ÉMETTEUR : la société (identité, performance financière, actionnaires). */}
      {emetteur && (
        <>
          <Bloc pane="emetteur" titre={t("L'émetteur")}>
            {company ? (
              <>
                <Mosaique
                  majeur={
                    <div className={fa.identite}>
                      <span className={fa.avatar} aria-hidden="true">
                        {initiales}
                      </span>
                      <div>
                        <b>{company.shortName}</b>
                        <small>
                          {t("Société")} · {t(o.countryName)} · BVMAC
                        </small>
                      </div>
                    </div>
                  }
                  tuiles={[
                    [t("Siège"), company.city],
                    [t("Cotée depuis"), fmtDate(company.listedOn)],
                    [t("Capital social"), `${fmtScaled(company.shareCapital, 1e9, 1)} Md FCFA`],
                  ]}
                />
                <p className={fa.texte}>{t(company.activity)}</p>
                {lienSociete && (
                  <Link href={lienSociete} className={fa.lien}>
                    {t("Analyse complète : comptes certifiés, ratios, dividendes")} →
                  </Link>
                )}
              </>
            ) : (
              <IssuerCard profile={profile} o={o} others={others} company={company} issuer={issuer} />
            )}
          </Bloc>

          {company && others.length > 0 && (
            <Bloc pane="emetteur" titre={t("Ses autres lignes à Guichet")}>
              <IssuerCard profile={profile} o={o} others={others} company={company} issuer={issuer} lignesSeulement />
            </Bloc>
          )}

          {dernierCompte && (
            <Bloc pane="emetteur" titre={t("Performance financière")}>
              <Mosaique
                majeur={
                  <>
                    <Majeur etiquette={t("Résultat net · {y}", { y: String(dernierCompte.year) })} valeur={fmtScaled(dernierCompte.netIncome, echelle.div, 1)} unite={echelle.short} />
                    <BarresDeComptes
                      annees={comptes.map((f) => String(f.year))}
                      series={[
                        { nom: t(dernierCompte.revenueLabel), valeurs: comptes.map((f) => f.revenue / echelle.div), teinte: "or" },
                        { nom: t("Résultat net"), valeurs: comptes.map((f) => f.netIncome / echelle.div), teinte: "bleu" },
                      ]}
                      resume={comptes.map((f) => `${f.year} : ${fmtScaled(f.revenue, echelle.div, 1)} / ${fmtScaled(f.netIncome, echelle.div, 1)} ${echelle.short}`).join(" ; ")}
                    />
                  </>
                }
                tuiles={[
                  [t(dernierCompte.revenueLabel), `${fmtScaled(dernierCompte.revenue, echelle.div, 1)} ${echelle.short}`],
                  [t("Total bilan"), `${fmtScaled(dernierCompte.totalAssets, echelle.div, 1)} ${echelle.short}`],
                  [t("Capitaux propres"), `${fmtScaled(dernierCompte.equity, echelle.div, 1)} ${echelle.short}`],
                ]}
              />
              <p className={fa.note}>{t("Exercices clos au 31/12 · norme {n}", { n: dernierCompte.standard })}</p>
            </Bloc>
          )}

          {company && company.coreShareholders.length > 0 && (
            <Bloc pane="emetteur" titre={t("Actionnaires")}>
              <ul className={fa.actionnaires}>
                {company.coreShareholders.map((a) => (
                  <li key={a.name}>
                    <span>{a.name}</span>
                    <b>{fmtPct(a.pct, 2)}</b>
                    <i style={{ width: `${(a.pct / company.coreShareholders[0].pct) * 100}%` }} />
                  </li>
                ))}
              </ul>
            </Bloc>
          )}
        </>
      )}
    </>
  );
}
