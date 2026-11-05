import type { ReactNode } from "react";
import Link from "next/link";
import { GrapheComptes } from "@/components/GrapheComptes";
import { Carte } from "@/components/Carte";
import { CourbeDuCours } from "@/components/CourbeDuCours";
import { CrossSignal } from "@/components/CrossSignal";
import { KpiCard } from "@/components/KpiCard";
import { Majeur, Mosaique, Tuiles } from "@/components/Mosaique";
import { PastilleVariation } from "@/components/PastilleVariation";
import { explainKpis } from "@/lib/domain/explain";
import { tradedSession } from "@/lib/domain/market";
import type { Offer } from "@/lib/domain/types";
import { displayYield } from "@/lib/domain/status";
import { serieDeValorisation } from "@/lib/market/valorisation";
import { daysBetween, margeNettePct, partFondsPropresPct, rentabiliteFondsPropresPct } from "@/lib/finance";
import { fmt, fmtDate, fmtPct, fmtScaled, localIso, pickScale } from "@/lib/format";
import { voletsMasques } from "@/lib/fiche-volets";
import { getT } from "@/i18n/server";
import { GraphesDeValorisation } from "./GraphesDeValorisation";
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

function Bloc({ pane, titre, children, plat = false, fin }: { pane: string; titre: string; children: ReactNode; plat?: boolean; /** Sous la carte, dans la même section : la mention courte du dernier bloc d'un onglet. */ fin?: ReactNode }) {
  return (
    <section className={styles.sec} data-pane={pane}>
      <h3>{titre}</h3>
      <Carte plat={plat}>{children}</Carte>
      {fin}
    </section>
  );
}

export async function FicheAction({ o, data, base, noteBulle }: { o: Offer; data: FicheData; base: string; /** « Chiffres de référence ⓘ · Essayer le simulateur → », rangée au pied de la simulation. */ noteBulle: ReactNode }) {
  const t = await getT();
  const now = new Date();
  const { company, quotes, facing, stamp, profile, others, issuer } = data;
  const dy = displayYield(o);
  const yTxt = dy.pct != null ? `${dy.approx ? "≈ " : ""}${fmtPct(dy.pct, 2)}` : "—";
  const explains = explainKpis(o, now);
  const age = o.priceSince ? daysBetween(o.priceSince, localIso(now)) : 0;
  const dernier = quotes[0];
  const tradee = quotes.find(tradedSession);
  const points = [...quotes].reverse().map((q) => ({ d: q.sessionDate, c: q.close, v: q.volumeTraded }));
  const comparer = `${base}/comparer?a=${o.id}`;
  const mention = <p className={fa.mention}>{t("Communication à caractère promotionnel. Risque de perte en capital.")}</p>;

  const tuilesCles: [string, string][] = [];
  if (o.dividendPerShare) tuilesCles.push([t("Dividende brut"), `${fmt(o.dividendPerShare)} FCFA`]);
  if (company?.freeFloatPct) tuilesCles.push([t("Flottant"), fmtPct(company.freeFloatPct, 2)]);
  if (company?.ipoPrice) tuilesCles.push([t("Prix d'introduction"), `${fmt(company.ipoPrice)} FCFA`]);
  if (company?.listedOn) tuilesCles.push([t("Cotée depuis"), fmtDate(company.listedOn)]);

  const ref = o.ask ?? o.lastPrice ?? 0;
  const n = 100;
  const divAttendu = o.dividendPerShare ? n * o.dividendPerShare : 0;
  const comptes = company?.figures ?? [];
  const dernierCompte = comptes[comptes.length - 1];
  const annees = comptes.map((f) => String(f.year));
  const echelleBilan = pickScale(comptes.flatMap((f) => [f.revenue, f.totalAssets, f.equity]));
  const echelleResultat = pickScale(comptes.map((f) => f.netIncome));
  const sur = (v: number, e: { div: number }) => Math.round((v / e.div) * 100) / 100;
  const marges = comptes.map((f) => margeNettePct(f.netIncome, f.revenue));
  const rentabilites = comptes.map((f) => rentabiliteFondsPropresPct(f.netIncome, f.equity));
  const parts = comptes.map((f) => partFondsPropresPct(f.equity, f.totalAssets));
  const arrondi = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10);
  /* UNE MARGE N'EST TRACÉE QUE SI TOUS LES EXERCICES LA PERMETTENT : une série trouée (BHC publie un résultat net supérieur à son chiffre d'affaires certaines années) laisserait des points isolés qui se liraient comme des mesures comparables. */
  const margesFiables = marges.length >= 2 && marges.every((v) => v != null);
  const rapportsLisibles = margesFiables || rentabilites.filter((v) => v != null).length >= 2;
  const dividendes = comptes.map((f) => (typeof f.dividendPerShare === "number" ? f.dividendPerShare : null));
  const dernierDiv = [...comptes].reverse().find((f) => typeof f.dividendPerShare === "number");
  /* LA VALORISATION : la capitalisation et ses rapports, séance par séance, tirés des cotations (nombre de titres de chaque séance) et des comptes. */
  const valorisation = company && comptes.length > 0 ? serieDeValorisation([...quotes].reverse().map((q) => ({ d: q.sessionDate, c: q.close, titres: q.sharesTotal, flottants: q.sharesFloat })), comptes.map((f) => ({ year: f.year, netIncome: f.netIncome, equity: f.equity, dividendPerShare: f.dividendPerShare })), { titres: company.sharesTotal, flottants: company.sharesFloat }) : [];
  const nominalDivise = comptes.some((f) => /division du nominal/i.test(f.source));
  const lienSociete = profile?.href ?? (company ? `/societes/${company.mnemo.toLowerCase()}` : undefined);
  const initiales = (company?.shortName ?? o.issuer).replace(/[^A-Za-zÀ-ÿ0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const emetteur = !voletsMasques(o).includes("emetteur");
  /* LA MENTION COURTE SE RANGE SOUS LA DERNIÈRE SECTION QUI EXISTE de l'onglet : une section de plus ne doit pas la laisser en route. */
  const presentes = ["identite", company && others.length > 0 ? "lignes" : "", dernierCompte ? "perf" : "", rapportsLisibles ? "rapports" : "", dernierCompte && parts.some((v) => v != null) ? "bilan" : "", dernierDiv ? "dividende" : "", valorisation.length >= 2 ? "valorisation" : "", company && company.coreShareholders.length > 0 ? "actionnaires" : ""].filter(Boolean);
  const derniere = presentes[presentes.length - 1];
  const fin = (cle: string) => (derniere === cle ? mention : undefined);

  return (
    <>
      {/* ESSENTIEL (Chiffres y est regroupé, 9 novembre 2026) : le cours et sa courbe, les chiffres clés, les séances, la simulation, la cotation. */}
      <Bloc pane="essentiel" titre={t("Cours")}>
        <Majeur
          etiquette={o.lastPriceOn ? t("Dernier cours · {d}", { d: fmtDate(o.lastPriceOn) }) : t("Dernier cours")}
          valeur={o.lastPrice != null ? fmt(o.lastPrice) : "—"}
          unite="FCFA"
          sous={age >= 1 ? <span className={fa.age}>{t("même cours depuis {n} jours", { n: age })}</span> : undefined}
        />
        {points.length > 1 && <CourbeDuCours points={points} />}
        {o.priceSource !== "boc" && <p className={fa.note}>{t(stamp)}</p>}
      </Bloc>

      <Bloc pane="essentiel" titre={t("Chiffres clés")}>
        <Mosaique majeur={<KpiCard forme="heros" label="Rendement du dernier dividende" value={yTxt} gold explain={explains[0]} compareHref={comparer} coach="hero" />} tuiles={tuilesCles} />
        <CrossSignal o={o} facing={facing} />
      </Bloc>

      {dernier && (
        <Bloc pane="essentiel" titre={t("Séances")}>
          <Mosaique
            majeur={<Majeur etiquette={t("Clôture · {d}", { d: fmtDate(dernier.sessionDate) })} valeur={fmt(dernier.close)} unite="FCFA" sous={<PastilleVariation v={dernier.variationPct} periode={t("séance")} />} />}
            tuiles={[
              [t("Dernière transaction"), tradee ? `${fmtDate(tradee.sessionDate)}${tradee.volumeTraded > 0 ? ` · ${titres(tradee.volumeTraded)}` : ""}` : t("aucune sur {n} séances", { n: String(quotes.length) })],
              [t("Seuils de séance"), `${fmt(dernier.thresholdLow)} – ${fmt(dernier.thresholdHigh)}`],
              [t("Volume échangé"), `${titres(dernier.volumeTraded)} · ${fmt(dernier.valueTraded)} FCFA`],
              [t("Référence prochaine séance"), `${fmt(dernier.referenceNext)} FCFA`],
            ]}
          />
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
          <p className={fa.note}>{t("Ces cours ne préjugent pas du prix auquel votre ordre sera exécuté.")}</p>
        </Bloc>
      )}

      <Bloc pane="essentiel" titre={t(`Pour ${n} actions au cours vendeur`)}>
        <Mosaique
          majeur={<Majeur etiquette={t("À décaisser")} valeur={fmt(n * ref)} unite="FCFA" sous={t("{n} actions au cours vendeur", { n: fmt(n) })} />}
          tuiles={[[t("Cours vendeur"), `${fmt(ref)} FCFA`], ...(divAttendu ? ([[t("Dividende annuel attendu, s'il est maintenu"), `${fmt(divAttendu)} FCFA`]] as [string, string][]) : [])]}
        />
        {noteBulle}
      </Bloc>

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

      {/* DOCUMENTS : des rangées à plat dans une carte, la mention courte dessous (le pied de trois liens n'est que dans l'Essentiel). */}
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
        {mention}
      </section>

      {/* ÉMETTEUR : la société — identité, performance financière à deux axes, rapports, bilan, dividendes, actionnaires. */}
      {emetteur && (
        <>
          <Bloc pane="emetteur" titre={t("L'émetteur")} fin={fin("identite")}>
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
                          {t("Société")} · {t(o.countryName)}
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
            <Bloc pane="emetteur" titre={t("Ses autres lignes à Guichet")} fin={fin("lignes")}>
              <IssuerCard profile={profile} o={o} others={others} company={company} issuer={issuer} lignesSeulement />
            </Bloc>
          )}

          {dernierCompte && (
            <Bloc pane="emetteur" titre={t("Performance financière")} fin={fin("perf")}>
              <Majeur etiquette={t("Résultat net · {y}", { y: String(dernierCompte.year) })} valeur={fmtScaled(dernierCompte.netIncome, echelleResultat.div, 1)} unite={echelleResultat.short} />
              <GrapheComptes
                annees={annees}
                unite={echelleBilan.short}
                barres={[{ nom: t(dernierCompte.revenueLabel), valeurs: comptes.map((f) => sur(f.revenue, echelleBilan)), teinte: "or" }]}
                droit={{ unite: echelleResultat.short, lignes: [{ nom: t("Résultat net"), valeurs: comptes.map((f) => sur(f.netIncome, echelleResultat)), teinte: "bleu" }] }}
                resume={comptes.map((f) => `${f.year} : ${fmtScaled(f.revenue, echelleBilan.div, 1)} ${echelleBilan.short} / ${fmtScaled(f.netIncome, echelleResultat.div, 1)} ${echelleResultat.short}`).join(" ; ")}
              />
              <Tuiles
                tuiles={[
                  [t(dernierCompte.revenueLabel), `${fmtScaled(dernierCompte.revenue, echelleBilan.div, 1)} ${echelleBilan.short}`],
                  [t("Total bilan"), `${fmtScaled(dernierCompte.totalAssets, echelleBilan.div, 1)} ${echelleBilan.short}`],
                  [t("Capitaux propres"), `${fmtScaled(dernierCompte.equity, echelleBilan.div, 1)} ${echelleBilan.short}`],
                ]}
              />
              <p className={fa.note}>{t("Exercices clos au 31/12 · norme {n}", { n: dernierCompte.standard })}</p>
            </Bloc>
          )}

          {rapportsLisibles && (
            <Bloc pane="emetteur" titre={t("Marge et rentabilité")} fin={fin("rapports")}>
              <GrapheComptes
                annees={annees}
                unite="%"
                lignes={[
                  { nom: t("Rentabilité des fonds propres"), valeurs: rentabilites.map(arrondi), teinte: "or" },
                  ...(margesFiables ? [{ nom: t("Marge nette"), valeurs: marges.map(arrondi), teinte: "bleu" as const }] : []),
                ]}
                resume={comptes.map((f, j) => `${f.year} : ${rentabilites[j] == null ? "—" : fmtPct(rentabilites[j] as number, 1)}`).join(" ; ")}
              />
              {!margesFiables && <p className={fa.note}>{t("Marge nette non affichée : le résultat net dépasse le chiffre d'affaires publié.")}</p>}
            </Bloc>
          )}

          {dernierCompte && parts.some((v) => v != null) && (
            <Bloc pane="emetteur" titre={t("Bilan et capitaux propres")} fin={fin("bilan")}>
              <Majeur etiquette={t("Capitaux propres / total bilan · {y}", { y: String(dernierCompte.year) })} valeur={fmtPct(parts[parts.length - 1] ?? 0, 1)} />
              <GrapheComptes
                annees={annees}
                unite={echelleBilan.short}
                barres={[
                  { nom: t("Total bilan"), valeurs: comptes.map((f) => sur(f.totalAssets, echelleBilan)), teinte: "or" },
                  { nom: t("Capitaux propres"), valeurs: comptes.map((f) => sur(f.equity, echelleBilan)), teinte: "or-doux" },
                ]}
                droit={{ unite: "%", lignes: [{ nom: t("Part des fonds propres"), valeurs: parts.map(arrondi), teinte: "bleu" }] }}
                resume={comptes.map((f, j) => `${f.year} : ${fmtScaled(f.totalAssets, echelleBilan.div, 1)} / ${fmtScaled(f.equity, echelleBilan.div, 1)} ${echelleBilan.short}, ${parts[j] == null ? "—" : fmtPct(parts[j] as number, 1)}`).join(" ; ")}
              />
            </Bloc>
          )}

          {dernierDiv && (
            <Bloc pane="emetteur" titre={t("Dividende par action")} fin={fin("dividende")}>
              <Majeur etiquette={t("Dernier dividende · exercice {y}", { y: String(dernierDiv.year) })} valeur={fmt(dernierDiv.dividendPerShare as number)} unite={t("FCFA par action")} sous={`${t("Rendement")} ${yTxt}`} />
              <GrapheComptes annees={annees} unite="FCFA" barres={[{ nom: t("Dividende brut par action"), valeurs: dividendes, teinte: "or" }]} resume={comptes.map((f, j) => `${f.year} : ${dividendes[j] == null ? t("aucun dividende") : `${fmt(dividendes[j] as number)} FCFA`}`).join(" ; ")} />
              {nominalDivise && <p className={fa.note}>{t("Le dernier dividende est écrit après division du nominal : les exercices précédents ne lui sont pas comparables.")}</p>}
            </Bloc>
          )}

          {valorisation.length >= 2 && <GraphesDeValorisation serie={valorisation} resultatAuDessusDuChiffreDAffaires={comptes.some((f) => f.netIncome > f.revenue)} fin={fin("valorisation")} />}

          {company && company.coreShareholders.length > 0 && (
            <Bloc pane="emetteur" titre={t("Actionnaires")} fin={fin("actionnaires")}>
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
