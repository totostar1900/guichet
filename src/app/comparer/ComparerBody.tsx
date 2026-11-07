import { fundAnnualPct } from "@/lib/domain/fund-perf";
import Link from "next/link";
import { LineIdentity } from "@/components/LineIdentity";
import { Info } from "@/components/Info";
import { BackButton } from "@/components/BackButton";
import { getT } from "@/i18n/server";
import { MarketStrip } from "@/components/MarketStrip";
import { repo } from "@/lib/data";
import { displayStatus, displayYield, familyLabel, familySegment, offerFamily, SEGMENT_LABEL, statusLabel } from "@/lib/domain/status";
import { fmtDate, fmtPct, localIso } from "@/lib/format";
import { tenorText } from "@/lib/finance";
import { LinePicker, type PickLine } from "./LinePicker";
import { CompareCharts } from "@/components/CompareCharts";
import { compareLine } from "@/lib/domain/compare";
import { daysBetween } from "@/lib/finance";
import { floatRotation, indexSeries, indexStats, indexWeights, rotationWording } from "@/lib/market/index";
import { summarize } from "@/lib/domain/summary";
import { offerReference } from "@/lib/domain/sheet";
import type { Offer } from "@/lib/domain/types";
import { variationsDesActions } from "@/lib/market/variations";
import styles from "./page.module.css";
import { EnTete } from "@/components/EnTete";
import { compatibilite, plusProches, type NatureChiffre, type Point, type ProfilLigne } from "@/lib/domain/comparaison";
import { loadTauxBancaire } from "@/lib/policy";
import { PeriodePassee } from "./PeriodePassee";
import { preparerPeriode } from "./periode";

export const dynamic = "force-dynamic";
/** The tab and the phone header read this title: in the reader's language. */
export async function generateMetadata() {
  const t = await getT();
  return { title: t("Comparer deux lignes") };
}

/**
 * La comparaison, une seule fois : le Guichet et le desk la lisent par ce
 * composant, « mode » ne changeant que les liens qui sortent.
 *
 * Two lines side by side, on the figures a client actually weighs: what it
 * returns, when the money comes back, what it costs to get in, what can go
 * wrong. Picks are carried in the URL so a comparison can be shared.
 */
const sg = (v: number, d = 2) => `${v > 0 ? "+" : ""}${fmtPct(v, d)}`;

export type ParamsComparer = { a?: string; b?: string; mode?: string; du?: string; au?: string; tb?: string; t?: string };

/** Ce que le chiffre de rendement d'une ligne EST, sans rien calculer : une promesse, un passé, ou un dividende au cours du jour. */
const natureAttendue = (o: Offer): NatureChiffre => (o.kind === "BTA" || o.kind === "OTA" || o.kind === "APE" || (o.kind === "MARCHE" && o.instrument === "obligation") ? "promesse" : o.kind === "FONDS" ? "passe" : o.kind === "RACHAT" ? "aucune" : "cours");
const profilDe = (o: Offer): ProfilLigne => ({ id: o.id, nature: natureAttendue(o), horizonJours: natureAttendue(o) === "promesse" && o.settleOn && o.maturityOn ? daysBetween(o.settleOn, o.maturityOn) : undefined });
const NATURE_MOT: Record<NatureChiffre, string> = { promesse: "une promesse, si l'émetteur paie", passe: "un passé, pas une prévision", cours: "un dividende au cours du jour, jamais garanti", aucune: "pas de rendement à comparer" };

export async function ComparerBody({ searchParams, mode = "client" }: { searchParams: Promise<ParamsComparer>; mode?: "client" | "desk" }) {
  // Au desk, une ligne mène à la ligne du desk et l'indice n'est pas servi
  // sur ce domaine : le renvoi vers lui reste une phrase, pas un lien.
  const desk = mode === "desk";
  const fiche = (id: string) => (desk ? `/desk/lignes/${id}` : `/offres/${id}`);
  const r = repo();
  const [sp, t, lues] = await Promise.all([searchParams, getT(), r.listOffers()]);
  const all = lues.filter((o) => !o.hidden);
  const now = new Date();
  const a = sp.a ? all.find((o) => o.id === sp.a) : undefined;
  const b = sp.b ? all.find((o) => o.id === sp.b) : undefined;
  const cols = [a, b].filter((o): o is Offer => Boolean(o));
  const passe = sp.mode === "passe";
  const verdict = cols.length === 2 ? compatibilite(profilDe(cols[0]), profilDe(cols[1])) : undefined;
  const proches = cols.length === 2 && verdict && verdict.niveau !== "ok" ? plusProches(profilDe(cols[0]), all.map(profilDe).filter((p) => p.id !== cols[1].id), 3).map((p) => all.find((o) => o.id === p.id)!).filter(Boolean) : [];
  /* LE TAUX BANCAIRE : celui du client s'il en a saisi un, sinon la référence du Desk, sinon zéro, et la page le dit. */
  const tbSaisi = sp.tb ? Number(sp.tb.replace(",", ".")) : NaN;
  const tbRef = passe ? await loadTauxBancaire() : undefined;
  const tauxBancairePct = Number.isFinite(tbSaisi) && tbSaisi >= 0 && tbSaisi <= 25 ? tbSaisi : (tbRef?.pct ?? 0);
  const tbSource = Number.isFinite(tbSaisi) && tbSaisi >= 0 && tbSaisi <= 25 ? ({ kind: "client" } as const) : tbRef ? ({ kind: "desk", on: tbRef.on } as const) : ({ kind: "aucun" } as const);
  const periode =
    passe && cols.length === 2
      ? await (async () => {
          const [seances, navs, cours] = await Promise.all([
            r.listAuctionResults({ limit: 20_000 }),
            Promise.all(cols.filter((o) => o.kind === "FONDS" && o.fund).map(async (o) => [o.fund!.key, (await r.listFundNavs(o.fund!.key, 2000)).map((n): Point => ({ date: n.navDate, valeur: n.nav })).sort((p, q) => p.date.localeCompare(q.date))] as const)),
            Promise.all(cols.filter((o) => o.kind === "MARCHE" && o.isin).map(async (o) => [o.isin!, (await r.listQuotes(o.isin!, 2000).catch(() => [])).map((x): Point => ({ date: x.sessionDate, valeur: x.close })).sort((p, q) => p.date.localeCompare(q.date))] as const)),
          ]);
          return preparerPeriode({ lignes: cols, navs: new Map(navs), cours: new Map(cours), seances, du: sp.du, au: sp.au, tauxBancairePct, tresor: sp.t, capital: 10_000_000 });
        })()
      : undefined;
  /* LA VARIATION SUR TROIS MOIS DES ACTIONS, la même qu'à l'Accueil et sur Titres (7 novembre 2026) : une requête pour les deux colonnes. */
  /* TOUT CE QUI SE LIT À PARTIR DES DEUX COLONNES PART ENSEMBLE (variations, historiques des fonds, indice, poids, rotations) : un étage, non cinq. */
  const shares = cols.length === 2 && cols.every((o) => o.kind === "MARCHE" && o.instrument === "action");
  const [variations, chartLines, bulletins, quotes, rotations] = await Promise.all([
    variationsDesActions(cols),
    // The graphs need the funds' NAV history and the latest BTA as a reference rate.
    cols.length === 2 ? Promise.all(cols.map(async (o) => compareLine(o, o.kind === "FONDS" && o.fund ? await r.listFundNavs(o.fund.key, 2000) : [], now))) : [],
    shares ? r.listBulletins(400).catch(() => []) : [],
    shares ? r.latestQuotes().catch(() => []) : [],
    shares ? Promise.all(cols.map(async (o) => (o.isin ? floatRotation(await r.listQuotes(o.isin, 400).catch(() => [])) : undefined))) : [],
  ]);
  const data = cols.map((o) => {
    const s = summarize(o, now);
    const map = new Map<string, string>();
    // The first figure is the return, whatever it is called on that line (taux nominal at par, actuariel, dividende…): one row.
    s.ledger.forEach(([k, v, note], i) => map.set(i === 0 ? "Rendement" : k, i === 0 ? `${v} · ${t(k).toLowerCase()}${note ? ` · ${t(note)}` : ""}` : note ? `${v} · ${t(note)}` : v));
    // A fund's return is two figures: the recent one stays on the « Rendement » row, the one since inception gets its own row with the fund's age.
    if (o.kind === "FONDS" && o.fund) {
      const f = o.fund;
      const recent = f.perf1yPct != null ? `${sg(f.perf1yPct)} · ${t("sur 12 mois")}` : fundAnnualPct(f, now) != null ? `${sg(fundAnnualPct(f, now)!)} · ${t("par an depuis l'origine")}` : `· ${t("moins de six mois d'historique")}`;
      const rows: [string, string][] = [
        ["Rendement", recent],
        ["Depuis l'origine", `${sg(f.perfSinceInceptionPct, 1)} · ${t("créé le {d} · {age}", { d: fmtDate(f.inceptionDate), age: t(tenorText(f.inceptionDate, localIso(now))) })}`],
        ...[...map.entries()].filter(([k]) => k !== "Rendement"),
      ];
      map.clear();
      rows.forEach(([k, v]) => map.set(k, v));
    }
    const v3 = variations.get(o.id);
    if (v3) map.set("Variation du cours · 3 mois", `${sg(v3.pct)} · ${t("hors dividendes")}`);
    return { s, dy: displayYield(o), ref: offerReference(o, now), map };
  });
  const bta = all.filter((x) => x.kind === "BTA" && x.precountRate != null && x.maturityOn && x.settleOn).sort((p, q) => (q.pricedAt ?? "").localeCompare(p.pricedAt ?? ""))[0];
  const btaY = bta ? displayYield(bta).pct : null;
  const btaBench = bta && btaY != null ? { label: `BTA ${Math.round(daysBetween(bta.settleOn, bta.maturityOn!) / 7)} sem.`, pct: btaY } : undefined;
  // Two listed shares compare to the equity market, not to a Treasury bill: the BVMAC All Share Index over twelve months.
  const idx = shares ? indexStats(indexSeries(bulletins)) : undefined;
  const benchmark = shares ? (idx?.year != null ? { label: "BVMAC All Share · 12 mois", pct: idx.year } : undefined) : btaBench;
  const weights = shares ? indexWeights(quotes) : [];
  const labels = [...new Set(data.flatMap((d) => [...d.map.keys()]))];
  // The since-inception figure sits right under the return, whichever side brought it.
  if (labels.includes("Depuis l'origine")) labels.splice(1, 0, ...labels.splice(labels.indexOf("Depuis l'origine"), 1));
  // Every line the picker can narrow down: family, market, issuer, country, the headline figure.
  const lines: PickLine[] = all.map((o) => {
    const fam = offerFamily(o);
    const dy = displayYield(o);
    return { id: o.id, title: o.title, family: familyLabel(fam), segment: familySegment(fam), issuer: o.issuer, country: o.countryName, yieldText: dy.pct == null ? "—" : `${dy.approx ? "≈ " : ""}${fmtPct(dy.pct, 2)}`, status: statusLabel(o, displayStatus(o, now)) };
  });
  const better = (i: number) => data.length === 2 && verdict?.niveau === "ok" && data[0].dy.pct != null && data[1].dy.pct != null && (data[0].dy.pct > data[1].dy.pct ? 0 : 1) === i;

  return (
    /* UNE PILE : l'espace entre l'en-tête, le choix, la comparaison et les graphiques vient du jeton des sections (ETALON.md § 8). */
    <div className={`pile ${styles.page}`}>
      {/* LE RETOUR RESTE UN « BackButton », ET C'EST VOULU. Le créneau de
          l'étalon mène à un parent NOMMÉ ; cette page n'en a pas un seul — on
          y arrive de la fiche d'une ligne comme du marché — et son retour est
          donc celui de l'historique, avec une destination de repli. Deux
          dispositifs pour deux questions : « remonter d'un cran » et
          « revenir d'où je viens ». */}
      <div className={styles.head}>
        <BackButton fallbackHref="/" fallbackLabel={t("Retour à Guichet")} />
        <EnTete
          titre={t("Comparer deux lignes")}
          phrase={t("Choisissez deux lignes de Guichet : rendement, échéance, ticket et calcul de référence côte à côte. Rendements bruts, avant frais et fiscalité.")}
        />
      </div>

      {/* LES DEUX QUESTIONS, UN GESTE POUR CHANGER DE L'UNE À L'AUTRE (planche du 7 novembre 2026, 1A) : les deux lignes suivent. */}
      <nav className={styles.modes} aria-label={t("Mode de comparaison")}>
        <a href={`?${new URLSearchParams({ ...(sp.a ? { a: sp.a } : {}), ...(sp.b ? { b: sp.b } : {}) }).toString()}`} aria-current={passe ? undefined : "page"}>
          {t("À partir d'aujourd'hui")}
        </a>
        <a href={`?${new URLSearchParams({ ...(sp.a ? { a: sp.a } : {}), ...(sp.b ? { b: sp.b } : {}), mode: "passe" }).toString()}`} aria-current={passe ? "page" : undefined}>
          {t("Sur une période passée")}
        </a>
      </nav>

      <form className={styles.pick} method="get">
        {passe && <input type="hidden" name="mode" value="passe" />}
        {(["a", "b"] as const).map((k) => (
          <LinePicker key={k} name={k} lines={lines} value={sp[k] ?? ""} label={`${t("Ligne")} ${k.toUpperCase()}`} segments={SEGMENT_LABEL} />
        ))}
        <button className="btn" type="submit">
          {t("Comparer")}
        </button>
      </form>

      {cols.length === 2 && !passe && verdict && verdict.niveau !== "ok" && (
        <div className={styles.verdict} role="note">
          <b>
            {verdict.niveau === "horizons"
              ? t("Horizons différents : {a} contre {b}", { a: t(tenorText(cols[0].settleOn, cols[0].maturityOn ?? cols[0].settleOn)), b: t(tenorText(cols[1].settleOn, cols[1].maturityOn ?? cols[1].settleOn)) })
              : t("Natures différentes : {a} contre {b}", { a: t(NATURE_MOT[natureAttendue(cols[0])]), b: t(NATURE_MOT[natureAttendue(cols[1])]) })}
          </b>
          <span>{t("Ces chiffres ne se comparent pas tels quels. Pour comparer sur des dates communes, passez à « Sur une période passée ».")}</span>
          {proches.length > 0 && (
            <span className={styles.proches}>
              {t("Plus proche de {l} :", { l: t(cols[0].title) })}{" "}
              {proches.map((o) => (
                <a key={o.id} href={`?${new URLSearchParams({ a: cols[0].id, b: o.id }).toString()}`}>{t(o.title)}</a>
              ))}
            </span>
          )}
        </div>
      )}

      {cols.length === 2 && passe && periode && <PeriodePassee periode={periode} a={cols[0].id} b={cols[1].id} tb={Number.isFinite(tbSaisi) ? sp.tb : undefined} tbSource={tbSource} t={t} />}

      {cols.length === 2 && !passe && (
        <div className={styles.grid}>
          <div className={styles.corner} />
          {cols.map((o, i) => (
            <div key={o.id} className={`${styles.colHead} ${better(i) ? styles.best : ""}`}>
              <LineIdentity o={o} s={data[i].s} href={fiche(o.id)} size="lg" />
              {better(i) && <span className={styles.tag}>{t("rendement le plus élevé")}</span>}
            </div>
          ))}

          {labels.map((label) => (
            <div key={label} className={styles.row}>
              <div className={styles.label}>
                {t(label)}
                {label === "Rendement" ? <Info term="rendement_cours" /> : label === "Ticket" ? <Info term="ticket" /> : label === "VL" ? <Info term="vl" /> : label === "Variation" ? <Info term="variation_vl" /> : label === "Depuis l'origine" ? <Info term="perf_origine" /> : null}
              </div>
              {data.map((d, i) => (
                <div key={i} className={styles.cell}>
                  {d.map.get(label) ?? "—"}
                </div>
              ))}
            </div>
          ))}

          {shares && (
            <div className={styles.row}>
              <div className={styles.label}>
                {desk ? t("Dans l'indice BVMAC") : <Link href="/indice">{t("Dans l'indice BVMAC")} →</Link>}
              </div>
              {cols.map((o, i) => {
                const wgt = weights.find((x) => x.isin === o.isin);
                const rot = rotations[i];
                return (
                  <div key={i} className={styles.cell}>
                    {wgt ? `${t("poids")} ${fmtPct(wgt.weightTotal, 1)} (${t("capital global")}) · ${fmtPct(wgt.weightFloat, 1)} (${t("flottant")})${wgt.liquidity3mPct != null ? ` · ${t("liquidité 3 mois")} ${fmtPct(wgt.liquidity3mPct, 2)}` : ""}` : "—"}
                    {rot ? ` · ${t("rotation du flottant 12 mois")} ${fmtPct(rot.pct, rot.pct < 10 ? 1 : 0)} (${t(`liquidité ${rotationWording(rot)}`)})` : ""}
                  </div>
                );
              })}
            </div>
          )}
          <div className={styles.row}>
            <div className={styles.label}>{t("Statut")}</div>
            {data.map((d, i) => (
              <div key={i} className={styles.cell}>
                <span className={`pill ${d.s.statusClass}`}>{t(d.s.status)}</span>
              </div>
            ))}
          </div>

          <div className={styles.row}>
            <div className={styles.label}>{t("Calcul de référence")}</div>
            {data.map((d, i) => (
              <div key={i} className={styles.cell}>
                {d.ref ? (
                  <>
                    <b className={styles.refTitle}>{t(d.ref.title)}</b>
                    <dl className={styles.ref}>
                      {d.ref.rows.map(([k, v]) => (
                        <div key={k}>
                          <dt>{t(k)}</dt>
                          <dd>{t(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                ) : (
                  "—"
                )}
              </div>
            ))}
          </div>

          <div className={styles.row}>
            <div className={styles.label}>{t("Agir")}</div>
            {cols.map((o, i) => (
              <div key={o.id} className={`${styles.cell} ${styles.actions}`}>
                <Link className="btn sm" href={fiche(o.id)}>
                  {t(desk ? "Voir la ligne" : data[i].s.primary ? "Voir la fiche" : "Fiche")}
                </Link>
                <a className="btn sm ghost" href={`/offres/${o.id}/fiche`} target="_blank" rel="noreferrer">
                  PDF
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
      {cols.length === 2 && !passe && <CompareCharts lines={chartLines} benchmark={benchmark} />}
      {cols.length === 1 && <p className="muted">{t("Choisissez une seconde ligne pour comparer.")}</p>}
      <MarketStrip current="comparer" mode={mode} />
    </div>
  );
}
