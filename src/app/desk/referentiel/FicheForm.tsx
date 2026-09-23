"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import type { Company, DocKind, YearFigures } from "@/data/companies";
import type { BondIssuer, IssuerFigures } from "@/data/issuers";
import type { Country } from "@/lib/domain/types";
import { saveJsonAction, type RefResult } from "./actions";
import styles from "./page.module.css";

/**
 * The fiche of a listed company or a bond issuer as a form the desk reads:
 * identity, capital, shareholders, figures per year, documents, reading.
 * Repeatable blocks add and remove rows; amounts accept spaces. On submit
 * the form assembles the fiche and hands it to the same server action as
 * before, which validates it field by field.
 */

const COUNTRIES: Country[] = ["Cameroun", "Congo", "Gabon", "RCA", "Tchad", "Guinée éq."];
const SECTORS = ["Agro-alimentaire", "Agro-industrie", "Banque", "Réassurance", "Holding bancaire"];
const DOC_KINDS: [DocKind, string][] = [
  ["fiche", "Fiche signalétique"],
  ["etats_ohada", "États financiers OHADA"],
  ["etats_ifrs", "États financiers IFRS"],
  ["rapport_gestion", "Rapport de gestion"],
  ["rapport_semestriel", "Rapport semestriel"],
  ["note_information", "Note d'information"],
  ["autre", "Autre document"],
];
const REVENUE_LABELS = ["Chiffre d'affaires", "Produit net bancaire", "Primes acquises brutes"];

/** « 1 924 730 000 » or « 1924730000 » → the number; empty → undefined. */
const num = (s: string): number | undefined => {
  const t = s.replace(/[\s  ]/g, "").replace(",", ".");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};
const show = (n?: number | null): string => (n == null ? "" : String(n));

type Holder = { name: string; pct: string };
type Fig = { year: string; standard: "OHADA" | "IFRS"; totalAssets: string; equity: string; revenue: string; revenueLabel: string; valueAdded: string; netIncome: string; dividend: "unknown" | "none" | "amount"; dividendPerShare: string; source: string };
type Doc = { kind: DocKind; year: string; title: string; url: string };

const emptyFig = (year: string): Fig => ({ year, standard: "OHADA", totalAssets: "", equity: "", revenue: "", revenueLabel: REVENUE_LABELS[0], valueAdded: "", netIncome: "", dividend: "unknown", dividendPerShare: "", source: "" });

function Rows<T>({ items, onChange, blank, render, add }: { items: T[]; onChange: (v: T[]) => void; blank: () => T; render: (item: T, set: (patch: Partial<T>) => void, i: number) => React.ReactNode; add: string }) {
  const t = useT();
  return (
    <div className={styles.rows}>
      {items.map((it, i) => (
        <div key={i} className={styles.rowLine}>
          {render(it, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))), i)}
          <button type="button" className={styles.rowDel} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={t("Retirer")} title={t("Retirer")}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn sm ghost" onClick={() => onChange([...items, blank()])}>
        + {add}
      </button>
    </div>
  );
}

/** A fiche started from a bulletin line: what the bulletin knows, the rest to fill. */
export interface FicheSeed {
  key: string;
  isin: string;
  /** Toutes les lignes du bulletin rattachées à cet émetteur : une fiche les prend d'un coup. */
  isins?: string[];
  name: string;
  shortName: string;
  country?: Country;
}

export function FicheForm({ kind, data, tab, copy, seed }: { kind: string; data?: Company | BondIssuer; tab: "societes" | "emetteurs"; copy?: boolean; seed?: FicheSeed }) {
  const t = useT();
  const isCompany = kind === "company";
  const c = isCompany ? (data as Company | undefined) : undefined;
  const iss = !isCompany ? (data as BondIssuer | undefined) : undefined;
  const editing = Boolean(data) && !copy;
  const [state, action, pending] = useActionState<RefResult | null, FormData>(saveJsonAction, null);

  // identity
  const [key, setKey] = useState(copy ? `${c?.mnemo ?? iss?.slug ?? ""}-2` : (c?.mnemo ?? iss?.slug ?? seed?.key ?? ""));
  const [isin, setIsin] = useState(copy ? "" : (c?.isin ?? seed?.isin ?? ""));
  const [isins, setIsins] = useState(copy ? "" : (iss?.isins ?? seed?.isins ?? (seed?.isin ? [seed.isin] : [])).join("\n"));
  const [name, setName] = useState(data?.name ?? seed?.name ?? "");
  const [shortName, setShortName] = useState(copy && data ? `${data.shortName} (copie)` : (data?.shortName ?? seed?.shortName ?? ""));
  const [mnemoIss, setMnemoIss] = useState(iss?.mnemo ?? "");
  const [sector, setSector] = useState(data?.sector ?? (isCompany ? SECTORS[0] : ""));
  const [activity, setActivity] = useState(data?.activity ?? "");
  const [country, setCountry] = useState<Country>(data?.country ?? seed?.country ?? "Cameroun");
  const [city, setCity] = useState(data?.city ?? "");
  const [listedOn, setListedOn] = useState(c?.listedOn ?? "");
  const [ipoPrice, setIpoPrice] = useState(show(c?.ipoPrice));
  const [chair, setChair] = useState(data?.chair ?? "");
  const [ceo, setCeo] = useState(data?.ceo ?? "");
  const [website, setWebsite] = useState(data?.website ?? "");
  const [contact, setContact] = useState(data?.contact ?? "");
  // capital
  const [shareCapital, setShareCapital] = useState(show(data?.shareCapital));
  const [sharesTotal, setSharesTotal] = useState(show(c?.sharesTotal));
  const [sharesFloat, setSharesFloat] = useState(show(c?.sharesFloat));
  const [freeFloatPct, setFreeFloatPct] = useState(show(c?.freeFloatPct));
  const [unit, setUnit] = useState<string>(String(iss?.unit ?? 1));
  const [unitNote, setUnitNote] = useState(iss?.unitNote ?? "Montants en FCFA tels que publiés sur la fiche signalétique.");
  const [holders, setHolders] = useState<Holder[]>((c?.coreShareholders ?? iss?.shareholders ?? []).map((h) => ({ name: h.name, pct: show(h.pct) })));
  const [figs, setFigs] = useState<Fig[]>(
    (data?.figures ?? []).map((f) => {
      const y = f as Partial<YearFigures & IssuerFigures>;
      return { year: show(y.year), standard: y.standard ?? "OHADA", totalAssets: show(y.totalAssets), equity: show(y.equity), revenue: show(y.revenue), revenueLabel: y.revenueLabel ?? REVENUE_LABELS[0], valueAdded: show(y.valueAdded), netIncome: show(y.netIncome), dividend: y.dividendPerShare === null ? "none" : y.dividendPerShare == null ? "unknown" : "amount", dividendPerShare: show(y.dividendPerShare), source: y.source ?? "" };
    }),
  );
  const [docs, setDocs] = useState<Doc[]>((data?.documents ?? []).map((d) => ({ kind: ((d as { kind?: DocKind }).kind ?? "autre") as DocKind, year: show(d.year), title: d.title, url: d.url })));
  const [reading, setReading] = useState((data?.reading ?? []).join("\n\n"));

  // the fiche as the server expects it, rebuilt from the fields
  const json = useMemo(() => {
    const base = {
      name: name.trim(),
      shortName: shortName.trim(),
      sector: sector.trim(),
      activity: activity.trim(),
      country,
      city: city.trim(),
      shareCapital: num(shareCapital) ?? 0,
      ...(chair.trim() ? { chair: chair.trim() } : {}),
      ...(ceo.trim() ? { ceo: ceo.trim() } : {}),
      ...(website.trim() ? { website: website.trim() } : {}),
      ...(contact.trim() ? { contact: contact.trim() } : {}),
      reading: reading
        .split(/\n\s*\n/)
        .map((x) => x.replace(/\s+/g, " ").trim())
        .filter(Boolean),
    };
    const hs = holders.filter((h) => h.name.trim()).map((h) => ({ name: h.name.trim(), pct: num(h.pct) ?? 0 }));
    if (isCompany) {
      const fiche: Company = {
        ...base,
        mnemo: key.trim().toUpperCase(),
        isin: isin.trim().toUpperCase(),
        sector: sector as Company["sector"],
        listedOn,
        ...(num(ipoPrice) != null ? { ipoPrice: num(ipoPrice) } : {}),
        sharesTotal: num(sharesTotal) ?? 0,
        sharesFloat: num(sharesFloat) ?? 0,
        freeFloatPct: num(freeFloatPct) ?? 0,
        coreShareholders: hs,
        fiscalYearEnd: "31/12",
        figures: figs
          .filter((f) => num(f.year) != null)
          .map((f) => ({
            year: num(f.year)!,
            standard: f.standard,
            totalAssets: num(f.totalAssets) ?? 0,
            equity: num(f.equity) ?? 0,
            revenue: num(f.revenue) ?? 0,
            revenueLabel: f.revenueLabel as YearFigures["revenueLabel"],
            ...(num(f.valueAdded) != null ? { valueAdded: num(f.valueAdded) } : {}),
            netIncome: num(f.netIncome) ?? 0,
            ...(f.dividend === "none" ? { dividendPerShare: null } : f.dividend === "amount" && num(f.dividendPerShare) != null ? { dividendPerShare: num(f.dividendPerShare) } : {}),
            source: f.source.trim(),
          })),
        documents: docs.filter((d) => d.title.trim() && d.url.trim()).map((d) => ({ kind: d.kind, year: num(d.year) ?? 0, title: d.title.trim(), url: d.url.trim() })),
      };
      return fiche;
    }
    const fiche: BondIssuer = {
      ...base,
      slug: key.trim().toLowerCase(),
      mnemo: mnemoIss.trim(),
      shareholders: hs,
      isins: isins
        .split(/[\s,;]+/)
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean),
      unit: Number(unit) as BondIssuer["unit"],
      unitNote: unitNote.trim(),
      figures: figs.filter((f) => num(f.year) != null).map((f) => ({ year: num(f.year)!, totalAssets: num(f.totalAssets) ?? 0, revenue: num(f.revenue) ?? 0, revenueLabel: f.revenueLabel, netIncome: num(f.netIncome) ?? 0 })),
      documents: docs.filter((d) => d.title.trim() && d.url.trim()).map((d) => ({ year: num(d.year) ?? 0, title: d.title.trim(), url: d.url.trim() })),
    };
    return fiche;
  }, [name, shortName, sector, activity, country, city, shareCapital, chair, ceo, website, contact, reading, holders, isCompany, key, isin, listedOn, ipoPrice, sharesTotal, sharesFloat, freeFloatPct, figs, docs, mnemoIss, isins, unit, unitNote]);

  const nextYear = String((Math.max(0, ...figs.map((f) => num(f.year) ?? 0)) || new Date().getFullYear() - 1) + 1);
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="json" value={JSON.stringify(json)} />
      {!editing && <input type="hidden" name="nouvelle" value="1" />}
      {copy && <p className={styles.copyHint}>{t("Tout est repris de la fiche d'origine : donnez un identifiant, l'ISIN et le nom, et changez ce qui doit l'être. La fiche d'origine ne bouge pas.")}</p>}
      {seed && <p className={styles.copyHint}>{t("Ce que le bulletin sait est déjà rempli (identifiant, ISIN, nom) ; le reste vient de la fiche signalétique BVMAC et des états financiers.")}</p>}

      <fieldset className={styles.fs}>
        <legend>{t("Identité")}</legend>
        <div className={styles.row3}>
          <label>
            <span>{isCompany ? t("Mnémo (ne change plus)") : t("Identifiant de page (slug, ne change plus)")}</span>
            <input value={key} onChange={(e) => setKey(e.target.value)} readOnly={editing} className="mono" required placeholder={isCompany ? "SEMC" : "snpc"} />
          </label>
          {isCompany ? (
            <label>
              <span>ISIN</span>
              <input value={isin} onChange={(e) => setIsin(e.target.value)} className="mono" maxLength={12} required />
            </label>
          ) : (
            <label>
              <span>{t("Mnémo au bulletin")}</span>
              <input value={mnemoIss} onChange={(e) => setMnemoIss(e.target.value)} className="mono" placeholder="SNPC 1" />
            </label>
          )}
          <label>
            <span>{t("Nom court")}</span>
            <input value={shortName} onChange={(e) => setShortName(e.target.value)} required />
          </label>
        </div>
        <label>
          <span>{t("Dénomination sociale")}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          <span>{t("Activité, en une phrase")}</span>
          <textarea value={activity} onChange={(e) => setActivity(e.target.value)} rows={2} required />
        </label>
        <div className={styles.row3}>
          <label>
            <span>{t("Secteur")}</span>
            {isCompany ? <Select block name="sector_ui" value={sector} onChange={setSector} options={SECTORS.map((s) => ({ value: s, label: t(s) }))} /> : <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder={t("Pétrole, banque de développement…")} required />}
          </label>
          <label>
            <span>{t("Pays")}</span>
            <Select block name="country_ui" value={country} onChange={(v) => setCountry(v as Country)} options={COUNTRIES.map((s) => ({ value: s, label: t(s) }))} />
          </label>
          <label>
            <span>{t("Ville")}</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} required />
          </label>
        </div>
        <div className={styles.row3}>
          {isCompany && (
            <>
              <label>
                <span>{t("Cotée depuis le")}</span>
                <input type="date" value={listedOn} onChange={(e) => setListedOn(e.target.value)} required />
              </label>
              <label>
                <span>{t("Prix d'introduction (FCFA)")}</span>
                <input inputMode="numeric" value={ipoPrice} onChange={(e) => setIpoPrice(e.target.value)} />
              </label>
            </>
          )}
          {!isCompany && (
            <label className={styles.span2}>
              <span>{t("Lignes cotées (ISIN, un par ligne)")}</span>
              <textarea value={isins} onChange={(e) => setIsins(e.target.value)} rows={2} className="mono" />
            </label>
          )}
          <label>
            <span>{t("Site web")}</span>
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
          </label>
        </div>
        <div className={styles.row3}>
          <label>
            <span>{t("Président du conseil")}</span>
            <input value={chair} onChange={(e) => setChair(e.target.value)} />
          </label>
          <label>
            <span>{t("Directeur général")}</span>
            <input value={ceo} onChange={(e) => setCeo(e.target.value)} />
          </label>
          <label>
            <span>{t("Contact")}</span>
            <input value={contact} onChange={(e) => setContact(e.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.fs}>
        <legend>{t("Capital et actionnaires")}</legend>
        <div className={styles.row3}>
          <label>
            <span>{t("Capital social (FCFA)")}</span>
            <input inputMode="numeric" value={shareCapital} onChange={(e) => setShareCapital(e.target.value)} required />
          </label>
          {isCompany ? (
            <>
              <label>
                <span>{t("Nombre d'actions")}</span>
                <input inputMode="numeric" value={sharesTotal} onChange={(e) => setSharesTotal(e.target.value)} required />
              </label>
              <label>
                <span>{t("Actions dans le public (flottant)")}</span>
                <input inputMode="numeric" value={sharesFloat} onChange={(e) => setSharesFloat(e.target.value)} required />
              </label>
              <label>
                <span>{t("Flottant (%)")}</span>
                <input inputMode="decimal" value={freeFloatPct} onChange={(e) => setFreeFloatPct(e.target.value)} required />
              </label>
            </>
          ) : (
            <>
              <label>
                <span>{t("Unité des chiffres")}</span>
                <Select block name="unit_ui" value={unit} onChange={setUnit} options={[{ value: "1", label: "FCFA" }, { value: "1000", label: t("milliers de FCFA") }, { value: "1000000", label: t("millions de FCFA") }]} />
              </label>
              <label className={styles.span2}>
                <span>{t("Note sur l'unité (affichée sous les chiffres)")}</span>
                <input value={unitNote} onChange={(e) => setUnitNote(e.target.value)} />
              </label>
            </>
          )}
        </div>
        <span className={styles.fsLabel}>{t("Actionnaires de référence")}</span>
        <Rows
          items={holders}
          onChange={setHolders}
          blank={() => ({ name: "", pct: "" })}
          add={t("un actionnaire")}
          render={(h, set) => (
            <>
              <input value={h.name} onChange={(e) => set({ name: e.target.value })} placeholder={t("Nom")} className={styles.grow} />
              <input value={h.pct} onChange={(e) => set({ pct: e.target.value })} placeholder="%" inputMode="decimal" className={styles.w6} />
            </>
          )}
        />
      </fieldset>

      <fieldset className={styles.fs}>
        <legend>{t("Chiffres par exercice")}</legend>
        <span className={styles.fsHint}>{isCompany ? t("Tels que publiés, en FCFA. Le dividende : inconnu, non distribué, ou le montant brut par action.") : t("Tels qu'imprimés sur la fiche signalétique, dans l'unité choisie ci-dessus.")}</span>
        <Rows
          items={figs}
          onChange={setFigs}
          blank={() => emptyFig(nextYear)}
          add={t("un exercice")}
          render={(f, set) => (
            <div className={styles.figGrid}>
              <label>
                <span>{t("Exercice")}</span>
                <input value={f.year} onChange={(e) => set({ year: e.target.value })} inputMode="numeric" className={styles.w6} required />
              </label>
              {isCompany && (
                <label>
                  <span>{t("Normes")}</span>
                  <Select block name={`std_${f.year}`} value={f.standard} onChange={(v) => set({ standard: v as Fig["standard"] })} options={[{ value: "OHADA", label: "OHADA" }, { value: "IFRS", label: "IFRS" }]} />
                </label>
              )}
              <label>
                <span>{t("Total bilan")}</span>
                <input value={f.totalAssets} onChange={(e) => set({ totalAssets: e.target.value })} inputMode="numeric" />
              </label>
              {isCompany && (
                <label>
                  <span>{t("Capitaux propres")}</span>
                  <input value={f.equity} onChange={(e) => set({ equity: e.target.value })} inputMode="numeric" />
                </label>
              )}
              <label>
                <span>{t("Revenu")}</span>
                <input value={f.revenue} onChange={(e) => set({ revenue: e.target.value })} inputMode="numeric" />
              </label>
              <label>
                <span>{t("Ce revenu est")}</span>
                {isCompany ? <Select block name={`rl_${f.year}`} value={f.revenueLabel} onChange={(v) => set({ revenueLabel: v })} options={REVENUE_LABELS.map((s) => ({ value: s, label: t(s) }))} /> : <input value={f.revenueLabel} onChange={(e) => set({ revenueLabel: e.target.value })} />}
              </label>
              {isCompany && (
                <label>
                  <span>{t("Valeur ajoutée")}</span>
                  <input value={f.valueAdded} onChange={(e) => set({ valueAdded: e.target.value })} inputMode="numeric" />
                </label>
              )}
              <label>
                <span>{t("Résultat net")}</span>
                <input value={f.netIncome} onChange={(e) => set({ netIncome: e.target.value })} inputMode="numeric" />
              </label>
              {isCompany && (
                <>
                  <label>
                    <span>{t("Dividende")}</span>
                    <Select block name={`dv_${f.year}`} value={f.dividend} onChange={(v) => set({ dividend: v as Fig["dividend"] })} options={[{ value: "unknown", label: t("inconnu") }, { value: "none", label: t("non distribué") }, { value: "amount", label: t("montant par action") }]} />
                  </label>
                  {f.dividend === "amount" && (
                    <label>
                      <span>{t("Brut par action (FCFA)")}</span>
                      <input value={f.dividendPerShare} onChange={(e) => set({ dividendPerShare: e.target.value })} inputMode="numeric" />
                    </label>
                  )}
                  <label className={styles.figSource}>
                    <span>{t("Source (titre du document)")}</span>
                    <input value={f.source} onChange={(e) => set({ source: e.target.value })} />
                  </label>
                </>
              )}
            </div>
          )}
        />
      </fieldset>

      <fieldset className={styles.fs}>
        <legend>{t("Documents")}</legend>
        <span className={styles.fsHint}>{t("En lien vers l'original (BVMAC, site de l'émetteur), jamais copiés.")}</span>
        <Rows
          items={docs}
          onChange={setDocs}
          blank={() => ({ kind: "fiche" as DocKind, year: nextYear, title: "", url: "" })}
          add={t("un document")}
          render={(d, set, i) => (
            <>
              {isCompany && <Select name={`dk_${i}`} value={d.kind} onChange={(v) => set({ kind: v as DocKind })} options={DOC_KINDS.map(([k, l]) => ({ value: k, label: t(l) }))} />}
              <input value={d.year} onChange={(e) => set({ year: e.target.value })} inputMode="numeric" placeholder={t("Année")} className={styles.w6} />
              <input value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder={t("Titre")} className={styles.grow} />
              <input value={d.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" className={`${styles.grow} mono`} />
            </>
          )}
        />
      </fieldset>

      <fieldset className={styles.fs}>
        <legend>{t("Lecture")}</legend>
        <label>
          <span>{t("Ce qu'il faut comprendre, un paragraphe par ligne vide : ce que fait la société, ce qu'il faut surveiller")}</span>
          <textarea value={reading} onChange={(e) => setReading(e.target.value)} rows={6} />
        </label>
      </fieldset>

      <details className={styles.advanced}>
        <summary>{t("La fiche telle qu'elle sera enregistrée (JSON)")}</summary>
        <pre>{JSON.stringify(json, null, 2)}</pre>
      </details>

      <div className={styles.actions}>
        {/* Une fiche qu'on ouvre par erreur doit pouvoir se refermer : « Annuler »
            vaut pour la fiche nouvelle comme pour celle qu'on modifie. */}
        <Link className="btn sm ghost" href={`/desk/referentiel?onglet=${tab}`}>
          {t("Annuler")}
        </Link>
        <button className="btn sm primary" type="submit" disabled={pending} title={t("Enregistre un brouillon : « Publier » le rend visible des clients")}>
          {pending ? "…" : t(copy ? "Créer cette copie (brouillon)" : "Enregistrer le brouillon")}
        </button>
      </div>
      {state && !state.ok && <p className={styles.err}>{state.error}</p>}
    </form>
  );
}
