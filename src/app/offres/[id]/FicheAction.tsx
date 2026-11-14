import type { ReactNode } from "react";
import Link from "next/link";
import { GrapheComptes } from "@/components/GrapheComptes";
import { Carte } from "@/components/Carte";
import { CourbeDuCours } from "@/components/CourbeDuCours";
import { CrossSignal } from "@/components/CrossSignal";
import { Majeur, Mosaique, Tuiles } from "@/components/Mosaique";
import { explainKpis } from "@/lib/domain/explain";
import type { Offer } from "@/lib/domain/types";
import { displayYield } from "@/lib/domain/status";
import { serieDeValorisation } from "@/lib/market/valorisation";
import { indexSeries } from "@/lib/market/index";
import { dividendeBrut } from "@/lib/market/dividende-brut";
import { SEUIL_SANS_SEANCE, contreLIndice, dividendesVerses, reperes52Semaines } from "@/lib/market/fiche-action";
import { daysBetween, margeNettePct, partFondsPropresPct, rendementDividendePct, rentabiliteFondsPropresPct } from "@/lib/finance";
import { fmt, fmtDate, fmtPct, fmtScaled, localIso, pickScale } from "@/lib/format";
import { voletsMasques } from "@/lib/fiche-volets";
import { getT } from "@/i18n/server";
import { GraphesDeValorisation } from "./GraphesDeValorisation";
import { SeancesDeLAction } from "./SeancesDeLAction";
import { Info } from "@/components/Info";
import { actionnariatTotal } from "@/lib/domain/actionnariat";
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

function Bloc({ pane, titre, children, plat = false, fin, info }: { pane: string; titre: string; children: ReactNode; plat?: boolean; /** Sous la carte, dans la même section : la mention courte du dernier bloc d'un onglet. */ fin?: ReactNode; /** Le « i » du titre : ce que la section dit, en une bulle au milieu de l'écran (§ 8.9). */ info?: string }) {
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

const signe = (v: number) => `${v > 0 ? "+" : ""}${fmtPct(v, 2)}`;

export async function FicheAction({ o, data }: { o: Offer; data: FicheData }) {
  const t = await getT();
  const now = new Date();
  const { company, quotes, bulletins, facing, stamp, profile, others, issuer } = data;
  const dy = displayYield(o);
  /* UN SEUL COURS, UNE SEULE DATE (6 novembre 2026, planche « 1A ») : le cours est la clôture de la dernière séance publiée, datée ; le dernier échange est écrit à part dans « Séances ». Le rendement du dividende se lit sur ce même cours : la page de la société et la fiche donnent le même chiffre. */
  const cloture = quotes[0] && (!o.lastPriceOn || quotes[0].sessionDate >= o.lastPriceOn) ? quotes[0] : undefined;
  const cours = cloture ? cloture.close : o.lastPrice;
  const coursLe = cloture ? cloture.sessionDate : o.lastPriceOn;
  /* LE DIVIDENDE BRUT, celui que la société publie (14 novembre 2026) : le bulletin porte parfois le montant net de retenue, et la fiche écrit « brut ». */
  const dividendeAffiche = (quotes[0] ? dividendeBrut(quotes[0], company?.figures) : undefined) ?? o.dividendPerShare;
  const rendementRef = cloture ? rendementDividendePct(dividendeAffiche, cloture.close) : null;
  const yTxt = rendementRef != null ? fmtPct(rendementRef, 2) : dy.pct != null ? `${dy.approx ? "≈ " : ""}${fmtPct(dy.pct, 2)}` : "—";
  /* UN SEUL « i » POUR LES CHIFFRES CLÉS (9 novembre 2026) : la section dit ce qu'elle montre ET comment se calcule le rendement (le « ? » du chiffre est parti). */
  const calcul = explainKpis(dividendeAffiche ? { ...o, dividendPerShare: dividendeAffiche } : o, now)[0];
  const infoChiffresCles = [
    t("Le rendement du dernier dividende (dividende brut ÷ cours), puis les faits qui l'accompagnent."),
    ...(calcul ? ["", `${t(calcul.title)} :`, ...calcul.lines.map(([k, v]) => `• ${t(k)} : ${t(v)}`), ...calcul.caveats.map((c) => t(c))] : []),
  ].join("\n");
  const age = o.priceSince ? daysBetween(o.priceSince, localIso(now)) : 0;
  const dernier = quotes[0];
  const points = [...quotes].reverse().map((q) => ({ d: q.sessionDate, c: q.close, v: q.volumeTraded, val: q.valueTraded }));
  /* TROIS LECTURES EN PLUS (14 novembre 2026, planche 1A) : elles s'ajoutent au cours, aux chiffres clés et aux séances, sans en remplacer aucun. */
  const joursSansSeance = dernier ? daysBetween(dernier.sessionDate, localIso(now)) : 0;
  const reperes = reperes52Semaines(points.map((p) => ({ d: p.d, c: p.c, v: p.v })));
  const contre = contreLIndice(points.map((p) => ({ d: p.d, c: p.c, v: p.v })), indexSeries(bulletins));
  const versements = company ? dividendesVerses(company.figures, quotes) : [];
  /* LES BULLETINS DE LA COTE NE SONT PLUS DES DOCUMENTS de l'action (9 novembre 2026) : ce sont des pièces de la bourse, pas de la société. */
  const documents = o.documents.filter((d) => !/^bulletin\b/i.test(d.name));
  const mention = <p className={fa.mention}>{t("Communication à caractère promotionnel. Risque de perte en capital.")}</p>;

  const tuilesCles: [string, string][] = [];
  if (dividendeAffiche) tuilesCles.push([t("Dividende brut"), `${fmt(dividendeAffiche)} FCFA`]);
  if (company?.freeFloatPct) tuilesCles.push([t("Flottant"), fmtPct(company.freeFloatPct, 2)]);
  if (company?.ipoPrice) tuilesCles.push([t("Prix d'introduction"), `${fmt(company.ipoPrice)} FCFA`]);
  if (company?.listedOn) tuilesCles.push([t("Cotée depuis"), fmtDate(company.listedOn)]);

  const comptes = company?.figures ?? [];
  /* LE RENDEMENT DE CHAQUE DIVIDENDE se lit AU COURS ACTUEL : ce que chacun donnerait en achetant aujourd'hui (nos cotations ne remontent pas à chaque exercice). */
  const coursActuel = dernier?.close ?? o.lastPrice ?? 0;
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
  const valorisation = company && comptes.length > 0 ? serieDeValorisation([...quotes].reverse().map((q) => ({ d: q.sessionDate, c: q.close, titres: q.sharesTotal, flottants: q.sharesFloat, valeur: q.valueTraded })), comptes.map((f) => ({ year: f.year, netIncome: f.netIncome, equity: f.equity, dividendPerShare: f.dividendPerShare, publieLe: f.publieLe, publieLeDesk: f.publieLeDesk })), { titres: company.sharesTotal, flottants: company.sharesFloat }) : [];
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
      <Bloc pane="essentiel" titre={t("Cours")} info={t("Le dernier cours de clôture, et sa courbe. La variation écrite est celle de la période choisie, dividendes non compris. Sur ce marché beaucoup de séances n'ont aucun échange : une courbe plate veut dire « pas d'échange », pas « stable ».")}>
        <Majeur
          etiquette={coursLe ? t("Cours · clôture {d}", { d: fmtDate(coursLe) }) : t("Dernier cours")}
          valeur={cours != null ? fmt(cours) : "—"}
          unite="FCFA"
          sous={age >= 1 && (!cloture || cloture.close === o.lastPrice) ? <span className={fa.age}>{t("même cours depuis {n} jours", { n: age })}</span> : undefined}
        />
        {points.length > 1 && <CourbeDuCours points={points} />}
        {joursSansSeance >= SEUIL_SANS_SEANCE && dernier && <p className={fa.note}>{t("Aucune séance publiée depuis {n} jours : ce cours est celui de la clôture du {d}.", { n: String(joursSansSeance), d: fmtDate(dernier.sessionDate) })}</p>}
        {reperes && (
          <Tuiles
            tuiles={[
              [t("Plus bas · 52 semaines"), `${fmt(reperes.bas)} FCFA`],
              [t("Plus haut · 52 semaines"), `${fmt(reperes.haut)} FCFA`],
            ]}
          />
        )}
        {o.priceSource !== "boc" && <p className={fa.note}>{t(stamp)}</p>}
      </Bloc>

      <Bloc pane="essentiel" titre={t("Chiffres clés")} info={infoChiffresCles}>
        <Mosaique majeur={<Majeur etiquette={t("Rendement du dernier dividende")} valeur={yTxt} or />} tuiles={tuilesCles} />
        <CrossSignal o={o} facing={facing} />
      </Bloc>

      {versements.length > 0 && (
        <Bloc pane="essentiel" titre={t("Dividendes versés")} info={t("Le dividende brut par action que la société publie pour chaque exercice, et la date de paiement lue sur le bulletin de la bourse. La date de détachement n'est pas publiée dans les bulletins : elle n'est donc pas écrite.")}>
          <table className={fa.seances}>
            <thead>
              <tr>
                <th>{t("Exercice")}</th>
                <th>{t("Payé le")}</th>
                <th>{t("Brut par action")}</th>
              </tr>
            </thead>
            <tbody>
              {versements.map((v) => (
                <tr key={v.exercice}>
                  <td>{v.exercice}</td>
                  <td>{v.brut == null ? "" : v.payeLe ? fmtDate(v.payeLe) : <span className={fa.age}>{t("non publié")}</span>}</td>
                  <td>{v.brut == null ? <span className={fa.age}>{t("aucun dividende")}</span> : `${fmt(v.brut)} FCFA`}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={fa.note}>{t("Montants bruts, avant retenue. Un dividende passé ne préjuge pas des suivants.")}</p>
        </Bloc>
      )}

      {dernier && (
        <Bloc pane="essentiel" titre={t("Séances")} info={t("La dernière séance de cotation : clôture, seuils de variation permis, volume échangé et référence de la prochaine séance. Le tableau liste les cinq dernières séances.")}>
          <SeancesDeLAction quotes={quotes} />
        </Bloc>
      )}

      {contre.length > 0 && (
        <Bloc pane="essentiel" titre={t("Contre l'indice")} info={t("La variation des clôtures de l'action et celle de l'indice de la place (BVMAC All Share) sur la même période, dividendes non compris. L'écart est la différence, en points de pourcentage : positif, l'action a monté plus que l'indice. L'indice bouge peu sur ce marché : un écart ne dit pas à lui seul si l'action est chère ou bon marché.")}>
          <table className={fa.seances}>
            <thead>
              <tr>
                <th>{t("Période")}</th>
                <th>{t("Cette action")}</th>
                <th>{t("Indice")}</th>
                <th>{t("Écart")}</th>
              </tr>
            </thead>
            <tbody>
              {contre.map((l) => (
                <tr key={l.cle}>
                  <td>{t(l.libelle)}</td>
                  <td>{signe(l.titrePct)}</td>
                  <td>{signe(l.indicePct)}</td>
                  <td className={l.ecartPts < 0 ? fa.baisse : l.ecartPts > 0 ? fa.hausse : undefined}>
                    {l.ecartPts > 0 ? "+" : ""}
                    {l.ecartPts.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {t("pts")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={fa.note}>{t("Variation des clôtures, dividendes non compris. Les séances passées ne préjugent pas des suivantes.")}</p>
        </Bloc>
      )}

      <Bloc pane="essentiel" titre={t("Cotation et règlement")} info={t("Où et comment l'action se négocie : la bourse, le mode de cotation et le délai de règlement (T+3 : le règlement a lieu trois jours ouvrés après la négociation).")}>
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
        <h3>
          {t("Documents")}
          <Info text={t("Les pièces publiées sur cette action.")} label={t("Documents")} />
        </h3>
        <Carte plat>
          {documents.length === 0 ? (
            <div className={fa.vide}>
              <b>{t("Aucun document pour le moment")}</b>
              <span>{t("Le communiqué des résultats s'y range dès qu'il est publié.")}</span>
            </div>
          ) : (
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
          )}
        </Carte>
        {mention}
      </section>

      {/* ÉMETTEUR : la société — identité, performance financière à deux axes, rapports, bilan, dividendes, actionnaires. */}
      {emetteur && (
        <>
          <Bloc pane="emetteur" titre={t("L'émetteur")} fin={fin("identite")} info={t("La société qui a émis l'action : son siège, la date de cotation, son capital et son activité.")}>
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
            <Bloc pane="emetteur" titre={t("Ses autres lignes à Guichet")} fin={fin("lignes")} info={t("Les autres lignes de cet émetteur proposées à Guichet, rangées par échéance.")}>
              <IssuerCard profile={profile} o={o} others={others} company={company} issuer={issuer} lignesSeulement />
            </Bloc>
          )}

          {dernierCompte && (
            <Bloc pane="emetteur" titre={t("Performance financière")} fin={fin("perf")} info={t("Le chiffre d'affaires (ou les produits) et le résultat net de chaque exercice, sur deux axes : celui de gauche pour le chiffre d'affaires, celui de droite pour le résultat net, beaucoup plus petit.")}>
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
              {comptes.some((f) => f.netIncome > f.revenue) && <p className={fa.note}>{t("Le résultat net dépasse le chiffre d'affaires publié sur au moins un exercice : à lire avec prudence.")}</p>}
            </Bloc>
          )}

          {rapportsLisibles && (
            <Bloc pane="emetteur" titre={t("Marge et rentabilité")} fin={fin("rapports")} info={t("La rentabilité des fonds propres (résultat net ÷ capitaux propres) et la marge nette (résultat net ÷ chiffre d'affaires). Une marge n'est tracée que si tous les exercices la permettent.")}>
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
            <Bloc pane="emetteur" titre={t("Bilan et capitaux propres")} fin={fin("bilan")} info={t("Le total du bilan et les capitaux propres, et la part des fonds propres dans le bilan (courbe, axe de droite) : plus elle est haute, plus la société se finance par ses propres moyens.")}>
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
            <Bloc pane="emetteur" titre={t("Dividende par action")} fin={fin("dividende")} info={t("Le dividende brut versé par action pour chaque exercice, tel que la société le publie, et le rendement que chacun donnerait au cours actuel (courbe, axe de droite). Un dividende n'est pas garanti : il peut baisser ou ne pas être versé.")}>
              <Majeur etiquette={t("Dernier dividende · exercice {y}", { y: String(dernierDiv.year) })} valeur={fmt(dernierDiv.dividendPerShare as number)} unite={t("FCFA par action")} sous={`${t("Rendement")} ${yTxt}`} />
              <GrapheComptes
                annees={annees}
                unite="FCFA"
                barres={[{ nom: t("Dividende brut par action"), valeurs: dividendes, teinte: "or" }]}
                droit={{ unite: "%", lignes: [{ nom: t("Rendement au cours actuel"), valeurs: dividendes.map((d) => { const r = rendementDividendePct(d, coursActuel); return r == null ? null : Math.round(r * 100) / 100; }), teinte: "bleu" }] }}
                resume={comptes.map((f, j) => `${f.year} : ${dividendes[j] == null ? t("aucun dividende") : `${fmt(dividendes[j] as number)} FCFA`}`).join(" ; ")}
              />
              {nominalDivise && <p className={fa.note}>{t("Le dernier dividende est écrit après division du nominal : les exercices précédents ne lui sont pas comparables.")}</p>}
            </Bloc>
          )}

          {valorisation.length >= 2 && <GraphesDeValorisation serie={valorisation} resultatAuDessusDuChiffreDAffaires={comptes.some((f) => f.netIncome > f.revenue)} fin={fin("valorisation")} />}

          {company && company.coreShareholders.length > 0 && (
            <Bloc pane="emetteur" titre={t("Actionnaires")} fin={fin("actionnaires")}>
              <ul className={fa.actionnaires}>
                {actionnariatTotal(company.coreShareholders, t("Flottant et autres")).map((a, _, tous) => (
                  <li key={a.name}>
                    <span>{a.name}</span>
                    <b>{fmtPct(a.pct, 2)}</b>
                    <i style={{ width: `${(a.pct / Math.max(...tous.map((x) => x.pct))) * 100}%` }} />
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
