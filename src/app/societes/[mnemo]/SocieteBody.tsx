import Link from "next/link";
import { RelatedNews } from "@/components/RelatedNews";
import { notFound } from "next/navigation";
import { BarChart, LineChart, ShareBar } from "@/components/Charts";
import { companyByMnemo } from "@/lib/reference";
import { repo } from "@/lib/data";
import { analyse, PERIODS, periodComment, periodFrom, pricePeriod } from "@/lib/companies/analysis";
import { IndexVsShare } from "@/components/IndexVsShare";
import { floatRotation, indexSeries, indexWeights } from "@/lib/market/index";
import { COUNTRY_CODE } from "@/lib/domain/summary";
import { Info, Term } from "@/components/Info";
import type { TermKey } from "@/lib/glossary";
import { fmt, fmtDate, fmtPct, fmtScaled, fmtUnits, pickScale } from "@/lib/format";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";
import { MarketStrip } from "@/components/MarketStrip";
import { LienRetour } from "@/components/mobile/Glissement";
import { EnTete } from "@/components/EnTete";
import type { ReactNode } from "react";
import { FichePanes, FicheSegments } from "@/components/mobile/FichePanes";
import { GrapheComptes } from "@/components/GrapheComptes";
import { Majeur, Mosaique } from "@/components/Mosaique";
import { GraphesDeValorisation } from "@/app/offres/[id]/GraphesDeValorisation";
import { SeancesDeLAction } from "@/app/offres/[id]/SeancesDeLAction";
import { IssuerCard } from "@/app/offres/[id]/IssuerCard";
import { loadIssuerRegistry } from "@/lib/reference";
import { issuerKey, resolveIssuer } from "@/data/issuer-registry";
import { serieDeValorisation } from "@/lib/market/valorisation";
import { margeNettePct, partFondsPropresPct, rendementDividendePct, rentabiliteFondsPropresPct } from "@/lib/finance";
import { summarize } from "@/lib/domain/summary";
import { VOLETS_SOCIETE } from "@/lib/ui/volets-societe";


type Props = { params: Promise<{ mnemo: string }>; searchParams: Promise<{ p?: string; depuis?: string }> };


const RATIO_TERM: Record<string, TermKey> = { per: "per", yield: "rendement_dividende", payout: "payout", margin: "marge_nette", roe: "roe", pb: "price_to_book", float: "flottant" };
const DOC_LABEL: Record<string, string> = { fiche: "Fiche signalétique", etats_ohada: "États financiers OHADA", etats_ifrs: "États financiers IFRS", rapport_gestion: "Rapport de gestion", rapport_semestriel: "Rapport semestriel", note_information: "Note d'information", autre: "Document" };

/**
 * La fiche d'une société cotée, une seule fois.
 *
 * Les mêmes chiffres des deux côtés ; « mode » ne change que les liens qui
 * sortent, et retire l'appel à l'ordre : le desk lit ici, il enregistre
 * ailleurs.
 */
export async function SocieteBody({ params, searchParams, mode = "client" }: Props & { mode?: "client" | "desk" }) {
  const desk = mode === "desk";
  const base = desk ? "/desk" : "";
  const t = await getT();
  const [{ mnemo }, sp] = await Promise.all([params, searchParams]);
  const c = await companyByMnemo(mnemo);
  if (!c) notFound();
  const p = PERIODS.some(([k]) => k === sp.p) ? (sp.p as string) : "ytd";
  const r = repo();
  const history = (await r.listQuotes(c.isin, 2000)).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
  const quote = history[history.length - 1];
  const a = analyse(c, quote);
  const from = periodFrom(p);
  const slice = history.filter((q) => q.sessionDate >= from);
  const period = pricePeriod(slice);
  const signed = (v?: number | null, d = 2) => (v == null ? "—" : `${v > 0 ? "+" : ""}${fmtPct(v, d)}`);
  const cls = (v?: number | null) => (v == null || v === 0 ? "" : v > 0 ? styles.up : styles.down);
  const figs = [...c.figures].sort((x, y) => x.year - y.year);
  const years = figs.map((f) => String(f.year));
  const offres = await r.listOffers();
  const listedLine = offres.find((o) => o.kind === "MARCHE" && o.isin === c.isin);
  /* LA PAGE D'UNE SOCIÉTÉ A QUATRE VOLETS SUR TÉLÉPHONE (6 novembre 2026, planche « 2B ») : Marché · Comptes · Ratios · Société. Sur grand écran tout reste visible, en deux colonnes. Le desk garde la page d'avant. */
  const client = !desk;
  const pane = (k: string) => (client ? { "data-pane": k } : {});
  if (client) await loadIssuerRegistry();
  const profil = client && listedLine ? resolveIssuer(listedLine) : undefined;
  const autresLignes = profil && listedLine ? offres.filter((x) => x.id !== listedLine.id && !x.hidden && issuerKey(x) === profil.name).map((x) => ({ o: x, s: summarize(x, new Date()) })) : [];
  const [bulletins, latest] = await Promise.all([r.listBulletins(400).catch(() => []), r.latestQuotes().catch(() => [])]);
  const indexPoints = indexSeries(bulletins);
  const weight = indexWeights(latest).find((x) => x.isin === c.isin);
  const scale = pickScale(figs.flatMap((f) => [f.revenue, f.netIncome, f.equity, f.totalAssets]));
  const sc = (v?: number | null) => (v == null ? "—" : fmtScaled(v, scale.div));
  const seancesDesc = [...history].reverse();
  const annees = figs.map((f) => String(f.year));
  const marges = figs.map((f) => margeNettePct(f.netIncome, f.revenue));
  const rentabilites = figs.map((f) => rentabiliteFondsPropresPct(f.netIncome, f.equity));
  const partsFP = figs.map((f) => partFondsPropresPct(f.equity, f.totalAssets));
  const arrondi = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10);
  const margesFiables = marges.length >= 2 && marges.every((v) => v != null);
  const rapportsLisibles = margesFiables || rentabilites.filter((v) => v != null).length >= 2;
  const dividendes = figs.map((f) => (typeof f.dividendPerShare === "number" ? f.dividendPerShare : null));
  const dernierDiv = [...figs].reverse().find((f) => typeof f.dividendPerShare === "number");
  const nominalDivise = figs.some((f) => /division du nominal/i.test(f.source));
  const resultatAuDessus = figs.some((f) => f.netIncome > f.revenue);
  const valorisation = client && figs.length > 0 ? serieDeValorisation(history.map((q) => ({ d: q.sessionDate, c: q.close, titres: q.sharesTotal, flottants: q.sharesFloat, valeur: q.valueTraded })), figs.map((f) => ({ year: f.year, netIncome: f.netIncome, equity: f.equity, dividendPerShare: f.dividendPerShare, publieLe: f.publieLe, publieLeDesk: f.publieLeDesk })), { titres: c.sharesTotal, flottants: c.sharesFloat }) : [];
  /* LA LÉGENDE DU RENDEMENT LIT LE MÊME DIVIDENDE QUE LE CHIFFRE (6 novembre 2026) : elle ne lisait que celui du bulletin et écrivait « pas de dividende récent » sous un rendement calculé sur le dividende des comptes. */
  const legendeRendement = quote?.lastDividend != null ? `${fmt(quote.lastDividend)} FCFA ${t("brut")}${quote.dividendDate ? ` ${t("payé le")} ${fmtDate(quote.dividendDate)}` : ""}` : dernierDiv ? `${fmt(dernierDiv.dividendPerShare as number)} FCFA ${t("brut")} · ${t("exercice {y}", { y: String(dernierDiv.year) })}` : t("pas de dividende récent");
  const enveloppe = (contenu: ReactNode) =>
    client ? (
      <FichePanes depart="marche">
        <FicheSegments volets={VOLETS_SOCIETE} mini={{ nom: c.shortName, chiffre: quote ? fmt(quote.close) : "—", sous: "FCFA" }} />
        {contenu}
      </FichePanes>
    ) : (
      contenu
    );
  const revenueTerm: TermKey = a.latest.revenueLabel.startsWith("Produit") ? "pnb" : a.latest.revenueLabel.startsWith("Primes") ? "primes" : "chiffre_affaires";

  return (
    /* UNE PILE : l'espace entre les retours, l'en-tête, les chiffres et les panneaux vient du jeton des sections (ETALON.md § 8). Le desk, qui rend le même corps, en profite. */
    <div className="pile">
      <div className={styles.backs}>
        {sp.depuis === "indice" && (
          <Link href={desk ? "/desk/indice/apercu" : "/indice"} className={`${styles.back} ${styles.backFrom}`}>
            {t("← Retour à l'indice BVMAC")}
          </Link>
        )}
        <LienRetour href={`${base}/societes`} className={styles.back}>
          {t("← Toutes les sociétés cotées")}
        </LienRetour>
      </div>
      {/* LA BANDE DE RETOUR RESTE AU-DESSUS, ET ELLE PORTE DEUX LIENS : « vers
          l'indice », quand on en vient, et « toutes les sociétés ». Le créneau
          de l'étalon ne porte QU'UN cran en arrière ; deux retours sont une
          bande de navigation, pas ce créneau. Laissé tel quel plutôt que d'en
          perdre un.
          ET LA PHRASE EST UNE SEULE PHRASE : l'activité de la société. La
          conclusion de l'analyse la suivait dans le même bloc — c'est une
          lecture, pas la description de la page, et elle garde sa place sous
          l'en-tête. */}
      <div className={styles.head}>
        <div>
          <EnTete
            surTitre={
              <span className={styles.eyebrow}>
                <span className="cc">{COUNTRY_CODE[c.country]}</span> {c.sector} · BVMAC · {c.mnemo} · {c.isin}
              </span>
            }
            titre={c.name}
            phrase={t(c.activity)}
          />
          <p className={styles.headline}>{t(a.headline)}</p>
        </div>
        <div className={styles.actions}>
          {listedLine && (
            <Link className="btn" href={desk ? `/desk/lignes/${listedLine.id}` : `/offres/${listedLine.id}?intent=achat`}>
              {t("Acheter l'action")}
            </Link>
          )}
          {client && listedLine && (
            <Link className="btn" href={`/offres/${listedLine.id}`}>
              {t("Voir la fiche complète")}
            </Link>
          )}
          <a className="btn" href={`/societes/${c.mnemo.toLowerCase()}/rapport?p=${p}`} target="_blank" rel="noreferrer">
            {t("Rapport PDF")} · {t(PERIODS.find(([k]) => k === p)?.[1] ?? "")}
            {desk ? " ↗" : ""}
          </a>
        </div>
      </div>

      <div className={styles.kpis}>
        <div className={`${styles.kpi} ${styles.gold}`}>
          <span>
            {t("Cours")} <Info term="cours" />
          </span>
          <b>{quote ? fmt(quote.close) : "—"}</b>
          <small>FCFA · {quote ? `${t("clôture")} ${fmtDate(quote.sessionDate)}` : t("pas de cours")}{quote?.variationPct ? ` · ${signed(quote.variationPct)}` : ""}</small>
        </div>
        <div className={styles.kpi}>
          <span>
            {t("Depuis le 1er janvier")} <Info term="ytd" />
          </span>
          <b className={cls(quote?.ytdVariationPct)}>{quote?.ytdVariationPct != null ? signed(quote.ytdVariationPct) : "—"}</b>
          <small>{quote?.ytdVariationPct == null && c.listedOn.startsWith(String(new Date().getFullYear())) ? t("introduite le {d}", { d: fmtDate(c.listedOn) }) : t("variation depuis le 1er janvier")}</small>
        </div>
        <div className={styles.kpi}>
          <span>
            {t("Capitalisation")} <Info term="capitalisation" />
          </span>
          <b>{a.marketCap != null ? fmtUnits(a.marketCap) : "—"}</b>
          <small>FCFA · {fmtUnits(c.sharesTotal)} {t("actions")} · {t("flottant")} {fmtPct(c.freeFloatPct, 1)}</small>
        </div>
        <div className={styles.kpi}>
          <span>
            PER <Info term="per" />
          </span>
          <b>{a.per != null ? `${a.per.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ×` : "—"}</b>
          <small>{t(`bénéfice ${a.latest.year} de ${fmt(a.eps ?? 0)} FCFA / action`)}</small>
        </div>
        <div className={styles.kpi}>
          <span>
            {t("Rendement du dividende")} <Info term="rendement_dividende" />
          </span>
          <b>{a.dividendYieldPct != null ? fmtPct(a.dividendYieldPct, 2) : "—"}</b>
          <small>{legendeRendement}</small>
        </div>
      </div>

      {enveloppe(
      <div className={styles.grid}>
        <div>
          <div className={styles.panel} {...pane("marche")}>
            <div className={styles.panelH}>
              <h2>
                {t("Cours de l'action")} <Info term="cours" />
              </h2>
              <nav className={styles.periods} aria-label={t("Période")}>
                {PERIODS.map(([k, l]) => (
                  <Link key={k} href={`?p=${k}`} aria-current={k === p ? "true" : undefined} scroll={false}>
                    {t(l)}
                  </Link>
                ))}
              </nav>
            </div>
            <LineChart points={slice.map((q) => ({ date: q.sessionDate, value: q.close, volume: q.volumeTraded || 0, amount: q.valueTraded || 0 }))} ariaLabel={`Cours de clôture de ${c.shortName}`} />
            {period ? (
              <div className={styles.reading}>
                <b>{t("Comment lire.")}</b> {t(periodComment(period, c))}
              </div>
            ) : (
              <div className={styles.reading}>{t("Aucun cours ingéré sur cette période : l'historique se remplit à partir des bulletins de la BVMAC.")}</div>
            )}
            <IndexVsShare name={c.shortName} share={history.map((q) => ({ date: q.sessionDate, value: q.close }))} index={indexPoints} from={from} weight={weight} dividendPerShare={quote?.lastDividend ?? undefined} close={quote?.close} rotation={floatRotation(history)} />
          </div>

          {client && quote && (
            <div className={styles.panel} data-pane="marche">
              <h2>
                {t("Séances et cotation")} <Info text={t("La dernière séance de cotation : clôture, seuils de variation permis, volume échangé et référence de la prochaine séance. Le tableau liste les cinq dernières séances.")} label={t("Séances et cotation")} />
              </h2>
              <SeancesDeLAction quotes={seancesDesc} />
              {listedLine && (
                <Mosaique
                  majeur={<Majeur etiquette={t("Règlement")} valeur={`T+${listedLine.settlementDays ?? 3}`} />}
                  tuiles={[
                    [t("Marché"), listedLine.market ?? "—"],
                    [t("Cotation"), t("continue, jours ouvrés")],
                  ]}
                />
              )}
            </div>
          )}

          <div className={styles.panel} {...pane("comptes")}>
            <h2>
              {a.latest.revenueLabel} <Info term={revenueTerm} /> {t("et bénéfice net")} <Info term="resultat_net" /> · {figs[0].year}–{a.latest.year}
            </h2>
            <div className={styles.unitNote}>{t("en FCFA · survolez les barres pour les montants exacts et la variation d'une année sur l'autre")}</div>
            <BarChart groups={years} series={[{ name: t(a.latest.revenueLabel), values: figs.map((f) => f.revenue) }, { name: t("Bénéfice net"), values: figs.map((f) => f.netIncome), accent: true }]} ariaLabel={`${t(a.latest.revenueLabel)} ${t("et bénéfice net par année")}`} />
          </div>

          {client && rapportsLisibles && (
            <div className={styles.panel} data-pane="comptes">
              <h2>
                {t("Marge et rentabilité")} <Info text={t("La rentabilité des fonds propres (résultat net ÷ capitaux propres) et la marge nette (résultat net ÷ chiffre d'affaires). Une marge n'est tracée que si tous les exercices la permettent.")} label={t("Marge et rentabilité")} />
              </h2>
              <GrapheComptes
                annees={annees}
                unite="%"
                lignes={[
                  { nom: t("Rentabilité des fonds propres"), valeurs: rentabilites.map(arrondi), teinte: "or" },
                  ...(margesFiables ? [{ nom: t("Marge nette"), valeurs: marges.map(arrondi), teinte: "bleu" as const }] : []),
                ]}
                resume={figs.map((f, j) => `${f.year} : ${rentabilites[j] == null ? "—" : fmtPct(rentabilites[j] as number, 1)}`).join(" ; ")}
              />
              {!margesFiables && <div className={styles.reading}>{t("Marge nette non affichée : le résultat net dépasse le chiffre d'affaires publié.")}</div>}
            </div>
          )}

          <div className={styles.panel} {...pane("comptes")}>
            <h2>
              {t("Fonds propres")} <Info term="fonds_propres" /> {t("et total du bilan")} <Info term="total_bilan" />
            </h2>
            <div className={styles.unitNote}>{t("en FCFA · survolez les barres pour les montants exacts")}</div>
            <BarChart groups={years} series={[{ name: t("Total du bilan"), values: figs.map((f) => f.totalAssets) }, { name: t("Fonds propres"), values: figs.map((f) => f.equity), accent: true }]} ariaLabel={t("Total du bilan et fonds propres par année")} />
            {client && partsFP.some((v) => v != null) && (
              <>
                <Majeur etiquette={t("Capitaux propres / total bilan · {y}", { y: String(a.latest.year) })} valeur={fmtPct(partsFP[partsFP.length - 1] ?? 0, 1)} />
                <GrapheComptes
                  annees={annees}
                  unite="%"
                  lignes={[{ nom: t("Part des fonds propres"), valeurs: partsFP.map(arrondi), teinte: "bleu" }]}
                  resume={figs.map((f, j) => `${f.year} : ${partsFP[j] == null ? "—" : fmtPct(partsFP[j] as number, 1)}`).join(" ; ")}
                />
              </>
            )}
            <div className={styles.reading}>
              <b>{t("Comment lire.")}</b> {t("Le total du bilan est tout ce que l'entreprise possède ; les fonds propres, la part qui appartient aux actionnaires. Des fonds propres qui grossissent année après année veulent dire que l'entreprise garde une partie de ses bénéfices.")} {c.sector === "Banque" || c.sector === "Holding bancaire" ? t("Pour une banque, un bilan très supérieur aux fonds propres est normal : il est constitué des dépôts des clients.") : ""}
            </div>
          </div>

          {client && dernierDiv && (
            <div className={styles.panel} data-pane="comptes">
              <h2>
                {t("Dividende par action")} <Info text={t("Le dividende brut versé par action pour chaque exercice, tel que la société le publie, et le rendement que chacun donnerait au cours actuel (courbe, axe de droite). Un dividende n'est pas garanti : il peut baisser ou ne pas être versé.")} label={t("Dividende par action")} />
              </h2>
              <Majeur etiquette={t("Dernier dividende · exercice {y}", { y: String(dernierDiv.year) })} valeur={fmt(dernierDiv.dividendPerShare as number)} unite={t("FCFA par action")} sous={`${t("Rendement")} ${a.dividendYieldPct != null ? fmtPct(a.dividendYieldPct, 2) : "—"}`} />
              <GrapheComptes
                annees={annees}
                unite="FCFA"
                barres={[{ nom: t("Dividende brut par action"), valeurs: dividendes, teinte: "or" }]}
                droit={{ unite: "%", lignes: [{ nom: t("Rendement au cours actuel"), valeurs: dividendes.map((d) => { const r2 = rendementDividendePct(d, quote?.close ?? 0); return r2 == null ? null : Math.round(r2 * 100) / 100; }), teinte: "bleu" }] }}
                resume={figs.map((f, j) => `${f.year} : ${dividendes[j] == null ? t("aucun dividende") : `${fmt(dividendes[j] as number)} FCFA`}`).join(" ; ")}
              />
              {nominalDivise && <div className={styles.reading}>{t("Le dernier dividende est écrit après division du nominal : les exercices précédents ne lui sont pas comparables.")}</div>}
            </div>
          )}

          <div className={styles.panel} {...pane("comptes")}>
            <h2>{t("Chiffres clés certifiés")}</h2>
            <div className={styles.unitNote}>{t(`en ${scale.label}, sauf les montants par action (FCFA)`)}</div>
            <div className="scroll-x">
              <table className={styles.tbl}>
                <thead>
                  <tr>
                    <th>{scale.short}</th>
                    {figs.map((f) => (
                      <th key={f.year} className={styles.r}>
                        {f.year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      [a.latest.revenueLabel, revenueTerm, (f) => sc(f.revenue)],
                      ["Valeur ajoutée", "valeur_ajoutee", (f) => sc(f.valueAdded)],
                      ["Résultat net", "resultat_net", (f) => sc(f.netIncome)],
                      ["Fonds propres", "fonds_propres", (f) => sc(f.equity)],
                      ["Total du bilan", "total_bilan", (f) => sc(f.totalAssets)],
                      ["Bénéfice par action (FCFA)", "bnpa", (f) => fmt(f.netIncome / c.sharesTotal)],
                      ["Dividende brut par action (FCFA)", "dividende", (f) => (f.dividendPerShare === null ? t("non distribué") : f.dividendPerShare != null ? fmt(f.dividendPerShare) : "—")],
                    ] as [string, TermKey, (f: (typeof figs)[number]) => string][]
                  ).map(([label, term, fn]) => (
                    <tr key={label}>
                      <td>
                        {t(label)} <Info term={term} />
                      </td>
                      {figs.map((f) => (
                        <td key={f.year} className={styles.r}>
                          {fn(f)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.source}>{t("Sources")} : {[...new Set(figs.map((f) => t(f.source)))].join(" · ")}. {t("Normes")} {[...new Set(figs.map((f) => f.standard))].join(" / ")}. {t("Bénéfice par action calculé sur {n} actions.", { n: fmt(c.sharesTotal) })}{scale.div > 1 ? ` 1 ${scale.short.replace(" FCFA", "")} = ${fmt(scale.div)} FCFA.` : ""}</div>
          </div>
        </div>

        <div>
          <div className={styles.panel} {...pane("comptes")}>
            <h2>{t("Ce que disent les chiffres")}</h2>
            <ul className={styles.comments}>
              {a.comments.map((c0, i) => (
                <li key={i}>
                  {/* a short lead (« Activité », « Dernier exercice ») is set in bold; a sentence that merely contains a colon stays whole */}
                  {c0.includes(" : ") && c0.split(" : ")[0].split(" ").length <= 3 ? (
                    <>
                      <b>{t(c0.split(" : ")[0])}</b> : {t(c0.split(" : ").slice(1).join(" : "))}
                    </>
                  ) : (
                    t(c0)
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.panel} {...pane("ratios")}>
            <h2>{t("Ratios, et comment les lire")}</h2>
            <ul className={styles.ratios}>
              {a.ratios.map((x) => (
                <li key={x.key}>
                  <div className={styles.ratioHead}>
                    <span className={styles.ratioLabel}>{RATIO_TERM[x.key] ? <Term term={RATIO_TERM[x.key]}>{t(x.label)}</Term> : t(x.label)}</span>
                    <b className={styles.ratioValue}>{x.value}</b>
                  </div>
                  <p className={styles.ratioReading}>{t(x.reading)}</p>
                </li>
              ))}
            </ul>
          </div>

          {client && valorisation.length >= 2 && <GraphesDeValorisation serie={valorisation} resultatAuDessusDuChiffreDAffaires={resultatAuDessus} pane="ratios" panneau={styles.panel} />}

          <div className={styles.panel} {...pane("societe")}>
            <h2>
              {t("Actionnariat")} <Info term="flottant" />
            </h2>
            <ShareBar parts={c.coreShareholders} />
            <dl className={styles.facts} style={{ marginTop: 12 }}>
              <dt>{t("Introduite en bourse")}</dt>
              <dd>{fmtDate(c.listedOn)}{c.ipoPrice ? ` ${t("à")} ${fmt(c.ipoPrice)} FCFA` : ""}</dd>
              <dt>{t("Capital social")}</dt>
              <dd>{fmtUnits(c.shareCapital, true)}</dd>
              <dt>{t("Actions")}</dt>
              <dd>{fmt(c.sharesTotal)} dont {fmt(c.sharesFloat)} en bourse</dd>
              {c.chair && (
                <>
                  <dt>{t("Présidence")}</dt>
                  <dd>{c.chair}</dd>
                </>
              )}
              {c.ceo && (
                <>
                  <dt>{t("Direction générale")}</dt>
                  <dd>{c.ceo}</dd>
                </>
              )}
              <dt>{t("Siège")}</dt>
              <dd>{c.city}</dd>
              {c.website && (
                <>
                  <dt>{t("Site")}</dt>
                  <dd>
                    <a href={c.website} target="_blank" rel="noreferrer">
                      {c.website.replace(/^https?:\/\/(www\.)?/, "")}
                    </a>
                  </dd>
                </>
              )}
            </dl>
          </div>

          {client && listedLine && autresLignes.length > 0 && (
            <div className={styles.panel} data-pane="societe">
              <h2>
                {t("Ses lignes à Guichet")} <Info text={t("Les autres lignes de cet émetteur proposées à Guichet, rangées par échéance.")} label={t("Ses lignes à Guichet")} />
              </h2>
              <IssuerCard profile={profil} o={listedLine} others={autresLignes} company={c} lignesSeulement sansRepere />
            </div>
          )}

          <div {...pane("societe")} style={client ? { display: "contents" } : undefined}>
            <RelatedNews kind="company" keyOf={c.mnemo} heading="h2" className={styles.panel} />
          </div>

          <div className={styles.panel} {...pane("societe")}>
            <h2>{t("Documents publiés")} ({c.documents.length})</h2>
            <div className={styles.docs}>
              {[...c.documents]
                .sort((x, y) => y.year - x.year)
                .map((d) => (
                  <a key={d.url} href={d.url} target="_blank" rel="noreferrer">
                    <span>
                      {t(DOC_LABEL[d.kind])} {d.year}
                    </span>
                    <small>bvm-ac.org · {d.url.endsWith(".pdf") ? "PDF" : "image"}</small>
                  </a>
                ))}
            </div>
            <div className={styles.source}>{t("Le desk met ces chiffres à jour à chaque nouvelle publication de la société.")}</div>
          </div>
        </div>
      </div>,
      )}
      <MarketStrip current="societes" mode={mode} />
    </div>
  );
}
