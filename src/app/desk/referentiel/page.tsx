import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { BOND_TERMS, type BondTerms } from "@/data/bond-terms";
import { COMPANIES, type Company } from "@/data/companies";
import { ISSUERS, type BondIssuer } from "@/data/issuers";
import { repo } from "@/lib/data";
import type { ReferenceRow } from "@/lib/domain/types";
import { SEGMENT_LABEL } from "@/lib/domain/status";
import { fmtDateTime } from "@/lib/format";
import { GLOSSARY as GLOSSARY_DEFAULTS, type Term } from "@/lib/glossary";
import { loadBondTerms, loadCompanies, loadGlossary, loadIssuers, loadLessons, loadTypes, REF } from "@/lib/reference";
import { BUILTIN_TYPES, ENGINE_LABEL, type ProductType } from "@/lib/registry";
import { GlossaryForm, LessonForm, TermForm, TypeForm } from "./Forms";
import { FicheForm, type FicheSeed } from "./FicheForm";
import { Origin, type DraftState } from "./Origin";
import { DiscardButton, PublishButton, ResetButton } from "./RowActions";
import { TermsTable, type TermRow } from "./TermsTable";
import { FromSante } from "@/components/desk/FromSante";
import { LESSONS, type Lesson } from "@/data/lessons";
import styles from "./page.module.css";
import { getT } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Référentiel" };

type Tab = "types" | "echeanciers" | "glossaire" | "lecons" | "societes" | "emetteurs";
const TABS: [Tab, string, string][] = [
  ["types", "Types de produits", REF.types],
  ["echeanciers", "Échéanciers", REF.bondTerms],
  ["glossaire", "Glossaire", REF.glossary],
  ["lecons", "Leçons", REF.lessons],
  ["societes", "Sociétés cotées", REF.companies],
  ["emetteurs", "Émetteurs", REF.issuers],
];

type Sp = { onglet?: string; cle?: string; ok?: string; publie?: string; nouveau?: string; copie?: string; depuis?: string; point?: string };

/** One entry as the desk sees it: the value it would read after « Publier », with where it stands. */
interface Seen<T> {
  item: T;
  inDb: boolean;
  builtin: boolean;
  draft?: DraftState;
}

/**
 * Lays the drafts over the published list: a « set » draft shows its value,
 * a « reset » shows the code default again, a draft on a key nobody has
 * published yet appears as a new entry. What the clients read is the list
 * without this overlay.
 */
function seen<T>(published: T[], keyOf: (t: T) => string, defaults: T[], keyOfDefault: (t: T) => string, rows: ReferenceRow[]): Seen<T>[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const def = new Map(defaults.map((d) => [keyOfDefault(d), d]));
  const out: Seen<T>[] = published.map((item) => {
    const key = keyOf(item);
    const r = byKey.get(key);
    const builtin = def.has(key);
    if (r?.draft?.op === "set") return { item: { ...item, ...(r.draft.data as object) } as T, inDb: r.data != null, builtin, draft: "set" };
    if (r?.draft?.op === "reset") return { item: def.get(key) ?? item, inDb: true, builtin, draft: "reset" };
    return { item, inDb: Boolean(r && r.data != null), builtin };
  });
  for (const r of rows) {
    if (r.draft?.op === "set" && r.data == null && !published.some((p) => keyOf(p) === r.key)) out.push({ item: { ...(r.draft.data as object), key: r.key } as T, inDb: false, builtin: false, draft: "new" });
  }
  return out;
}

/**
 * The reference data the desk maintains in the app. Every change waits as a
 * draft on this page until « Publier » ; the lists, fiches and simulators
 * read only what is published.
 */
export default async function ReferentielPage({ searchParams }: { searchParams: Promise<Sp> }) {
  const tr = await getT();
  const sp = await searchParams;
  const tab: Tab = (TABS.find(([t]) => t === sp.onglet)?.[0] ?? "types") as Tab;
  const open = sp.cle ?? "";
  const kind = TABS.find(([t]) => t === tab)![2];
  const rows = await repo().listReference(kind);
  const drafts = rows.filter((r) => r.draft);
  const lastEdit = rows
    .map((r) => r.draftAt ?? r.updatedAt)
    .sort()
    .reverse()[0];
  const ctx = { rows, open, ok: sp.ok ?? "" };

  return (
    <>
      <DeskNav current="/desk/referentiel" />
      {sp.depuis === "sante" && <FromSante point={sp.point ?? ""} />}
      <div className={styles.head}>
        <div>
          <h1>{tr("Référentiel")}</h1>
          <p className="muted">{tr("Ce que le Guichet sait sans qu'on touche au code : les types de produits (nom, couleur, points d'attention, liste de contrôle, intentions), les échéanciers exacts des obligations, le glossaire, les fiches des sociétés et des émetteurs. Chaque entrée part d'une valeur par défaut livrée avec l'application. Une modification s'enregistre d'abord en brouillon ; « Publier » la rend visible des clients, « Abandonner » la retire ; « Revenir aux valeurs par défaut » efface ce que le desk avait enregistré.")}</p>
        </div>
        <small className="muted">{lastEdit ? `${tr("Dernière modification")} ${fmtDateTime(lastEdit)}` : tr("Aucune modification du desk sur cet onglet")}</small>
      </div>

      <nav className={styles.tabs} aria-label={tr("Référentiel")} data-coach="ref-tabs">
        {TABS.map(([t, label]) => (
          <Link key={t} href={`/desk/referentiel?onglet=${t}`} aria-current={t === tab ? "page" : undefined}>
            {tr(label)}
          </Link>
        ))}
      </nav>

      {sp.publie && (
        <p className={styles.flashOk} role="status">
          {tr("{n} modification(s) publiée(s) : les clients et le desk lisent la nouvelle valeur.", { n: sp.publie })}
        </p>
      )}
      {sp.ok && (
        <p className={styles.flashDraft} role="status">
          {tr("{k} enregistré en brouillon. Vérifiez la ligne, puis « Publier » pour que les clients la lisent.", { k: sp.ok })}
        </p>
      )}
      {drafts.length > 0 && (
        <div className={styles.draftBar} data-coach="ref-drafts">
          <div>
            <b>{tr("{n} modification(s) non publiée(s)", { n: String(drafts.length) })}</b>
            <span className="muted">
              {drafts
                .slice(0, 8)
                .map((d) => `${d.key}${d.draft?.op === "reset" ? " ↺" : ""}`)
                .join(" · ")}
              {drafts.length > 8 ? " …" : ""}
              {" · "}
              {tr("par")} {[...new Set(drafts.map((d) => d.draftBy).filter(Boolean))].join(", ")}
            </span>
          </div>
          <div className={styles.draftBtns}>
            <DiscardButton kind={kind} n={drafts.length} />
            <PublishButton kind={kind} n={drafts.length} primary />
          </div>
        </div>
      )}

      {tab === "types" && <Types types={await loadTypes()} {...ctx} />}
      {tab === "echeanciers" && <Terms terms={[...(await loadBondTerms()).values()]} {...ctx} nouveau={sp.nouveau ?? ""} />}
      {tab === "glossaire" && <Glossary glossary={await loadGlossary()} {...ctx} />}
      {tab === "lecons" && <Lessons list={await loadLessons()} {...ctx} copie={sp.copie ?? ""} />}
      {tab === "societes" && <Companies list={await loadCompanies()} {...ctx} copie={sp.copie ?? ""} nouveau={sp.nouveau ?? ""} />}
      {tab === "emetteurs" && <Issuers list={await loadIssuers()} {...ctx} copie={sp.copie ?? ""} nouveau={sp.nouveau ?? ""} />}
    </>
  );
}

type Ctx = { rows: ReferenceRow[]; open: string; ok: string };

/** The head of the edit panel: the title, then the entry's own buttons (publish / discard its draft, reset). */
function EditHead({ title, kind, k, s }: { title: string; kind: string; k?: string; s?: Seen<unknown> }) {
  return (
    <div className="panel-h">
      <h2>{title}</h2>
      {k && s && (
        <span className={styles.editBtns}>
          {s.draft && <DiscardButton kind={kind} k={k} />}
          {s.draft && <PublishButton kind={kind} k={k} />}
          {(s.inDb || s.draft === "new") && s.draft !== "reset" && <ResetButton kind={kind} k={k} builtin={s.builtin} />}
        </span>
      )}
    </div>
  );
}

async function Types({ types, rows, open, ok }: { types: ProductType[] } & Ctx) {
  const tr = await getT();
  const list = seen(types, (t) => t.key, BUILTIN_TYPES, (t) => t.key, rows);
  const cur = list.find((s) => s.item.key === open);
  return (
    <>
      <div className="panel">
        <div className="panel-h">
          <h2>{tr("Types de produits")} ({list.length})</h2>
          <span className="muted">{tr("Un nouveau type réutilise un moteur de calcul existant ; tout le reste est à vous.")}</span>
        </div>
        <table className={`tbl ${styles.tbl}`}>
          <thead>
            <tr>
              <th>{tr("Badge")}</th>
              <th>{tr("Libellé")}</th>
              <th>{tr("Marché")}</th>
              <th>{tr("Moteur")}</th>
              <th>{tr("Intentions")}</th>
              <th>{tr("Origine")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ item: t, ...s }) => (
              <tr key={t.key} className={`${t.enabled ? "" : styles.off} ${t.key === ok ? styles.hl : ""}`} id={`ref-${t.key}`}>
                <td>
                  <b className={styles.badge} style={{ color: t.color, background: t.colorSoft, borderColor: t.color }}>
                    {t.short}
                  </b>
                </td>
                <td>
                  {tr(t.label)}
                  <br />
                  <small className="mono muted">{t.key}</small>
                  {!t.enabled && <small className={styles.offTag}>{tr("désactivé")}</small>}
                </td>
                <td>{tr(SEGMENT_LABEL[t.segment])}</td>
                <td className={styles.wrap}>{tr(ENGINE_LABEL[t.engine].split(" (")[0])}</td>
                <td className={styles.wrap}>{t.intentsOpen.join(", ") || "—"}</td>
                <td>
                  <Origin inDb={s.inDb} builtin={s.builtin} draft={s.draft} />
                </td>
                <td className="r">
                  <Link className="btn sm" href={`/desk/referentiel?onglet=types&cle=${t.key}#edit`}>
                    {tr("Modifier")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel" id="edit">
        {cur ? <EditHead title={`${tr("Modifier")} ${open}`} kind={REF.types} k={open} s={cur} /> : <EditHead title={tr("Nouveau type de produit")} kind={REF.types} />}
        {cur ? <TypeForm key={open} t={cur.item} /> : <TypeForm key="new" isNew />}
      </div>
    </>
  );
}

async function Terms({ terms, rows, open, ok, nouveau }: { terms: BondTerms[]; nouveau: string } & Ctx) {
  const tr = await getT();
  const list = seen(terms, (t) => t.isin, BOND_TERMS, (t) => t.isin, rows);
  const offers = await repo().listOffers();
  const byIsin = new Map(offers.filter((o) => o.isin).map((o) => [o.isin, o]));
  const have = new Set(list.map((s) => s.item.isin));
  const missing = offers
    .filter((o) => o.kind === "MARCHE" && !o.hidden && o.instrument === "obligation" && o.isin && !have.has(o.isin))
    .map((o) => ({ isin: o.isin, title: o.title, issuer: o.issuer }))
    .sort((a, b) => a.issuer.localeCompare(b.issuer, "fr"));
  const tableRows: TermRow[] = list.map(({ item: t, ...s }) => ({ isin: t.isin, maturityOn: t.maturityOn, periodsPerYear: t.periodsPerYear, graceUntil: t.graceUntil, source: t.source, title: byIsin.get(t.isin)?.title, issuer: byIsin.get(t.isin)?.issuer, ...s }));
  const cur = list.find((s) => s.item.isin === open);
  const seed = nouveau && byIsin.get(nouveau) ? ({ isin: nouveau, maturityOn: "", periodsPerYear: 1, source: `Fiche signalétique BVMAC · ${byIsin.get(nouveau)!.issuer}` } as unknown as BondTerms) : undefined;
  return (
    <>
      <div className="panel">
        <div className="panel-h">
          <h2>{tr("Échéanciers des obligations")} ({list.length})</h2>
          <span className="muted">{tr("Le bulletin ne donne que l'année : ici la date exacte, la périodicité et le différé, d'après la fiche signalétique.")}</span>
        </div>
        <TermsTable rows={tableRows} missing={missing} highlight={ok} />
      </div>
      <div className="panel" id="edit">
        {cur ? <EditHead title={`${tr("Échéancier")} ${cur.item.isin}`} kind={REF.bondTerms} k={cur.item.isin} s={cur} /> : <EditHead title={seed ? `${tr("Nouvel échéancier")} · ${seed.isin} · ${byIsin.get(seed.isin)?.issuer}` : tr("Nouvel échéancier")} kind={REF.bondTerms} />}
        <TermForm key={cur?.item.isin ?? seed?.isin ?? "new"} t={cur?.item ?? seed} isNew={!cur} />
      </div>
    </>
  );
}

async function Glossary({ glossary, rows, open, ok }: { glossary: Record<string, Term> } & Ctx) {
  const tr = await getT();
  const list = seen(
    Object.entries(glossary).map(([key, t]) => ({ key, ...t })),
    (t) => t.key,
    Object.entries(GLOSSARY_DEFAULTS).map(([key, t]) => ({ key, ...t })),
    (t) => t.key,
    rows,
  ).sort((a, b) => a.item.short.localeCompare(b.item.short, "fr"));
  const cur = list.find((s) => s.item.key === open);
  return (
    <>
      <div className="panel">
        <div className="panel-h">
          <h2>{tr("Glossaire")} ({list.length})</h2>
          <span className="muted">{tr("Les bulles « i » des fiches, du simulateur et des tableaux.")}</span>
        </div>
        <table className={`tbl ${styles.tbl}`}>
          <thead>
            <tr>
              <th>{tr("Terme")}</th>
              <th>{tr("Explication")}</th>
              <th>{tr("Origine")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ item: g, ...s }) => (
              <tr key={g.key} className={g.key === ok ? styles.hl : undefined} id={`ref-${g.key}`}>
                <td>
                  <b>{g.short}</b>
                  {g.long && <small className="muted"> : {g.long}</small>}
                  <br />
                  <small className="mono muted">{g.key}</small>
                </td>
                <td className={styles.wrap}>{g.text}</td>
                <td>
                  <Origin inDb={s.inDb} builtin={s.builtin} draft={s.draft} />
                </td>
                <td className="r">
                  <Link className="btn sm" href={`/desk/referentiel?onglet=glossaire&cle=${g.key}#edit`}>
                    {tr("Modifier")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel" id="edit">
        {cur ? <EditHead title={`${tr("Modifier")} « ${cur.item.short} »`} kind={REF.glossary} k={cur.item.key} s={cur} /> : <EditHead title={tr("Nouveau terme")} kind={REF.glossary} />}
        <GlossaryForm key={cur?.item.key ?? "new"} k={cur?.item.key} t={cur ? { short: cur.item.short, long: cur.item.long, text: cur.item.text } : undefined} />
      </div>
    </>
  );
}

async function Lessons({ list: published, rows, open, ok, copie }: { list: Lesson[]; copie: string } & Ctx) {
  const tr = await getT();
  const list = seen(published, (l) => l.key, LESSONS, (l) => l.key, rows);
  const cur = list.find((s) => s.item.key === open);
  // « Dupliquer » : the new-lesson form opens on a copy of an existing one, to change and save under its own key.
  const model = !cur && copie ? list.find((s) => s.item.key === copie)?.item : undefined;
  return (
    <>
      <div className="panel">
        <div className="panel-h">
          <h2>{tr("Leçons")} ({list.length})</h2>
          <span className="muted">{tr("L'onglet Guide : une idée par leçon, une vraie ligne, une question.")}</span>
        </div>
        <table className={`tbl ${styles.tbl}`}>
          <thead>
            <tr>
              <th>N°</th>
              <th>{tr("Leçon")}</th>
              <th>{tr("Bloc")}</th>
              <th>{tr("Termes liés")}</th>
              <th>{tr("Origine")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ item: l, ...s }) => (
              <tr key={l.key} className={l.key === ok ? styles.hl : undefined} id={`ref-${l.key}`}>
                <td className="r num">{l.order}</td>
                <td>
                  <b>{l.title}</b>
                  <br />
                  <small className="mono muted">{l.key}</small>
                </td>
                <td className="mono">{l.widget}</td>
                <td className={styles.wrap}>{l.terms.join(", ") || "—"}</td>
                <td>
                  <Origin inDb={s.inDb} builtin={s.builtin} draft={s.draft} />
                </td>
                <td className="r">
                  <span className={styles.rowBtns}>
                    <Link className="btn sm ghost" href={`/desk/referentiel?onglet=lecons&copie=${l.key}#edit`} title={tr("Nouvelle leçon à partir de celle-ci")}>
                      {tr("Dupliquer")}
                    </Link>
                    <Link className="btn sm" href={`/desk/referentiel?onglet=lecons&cle=${l.key}#edit`}>
                      {tr("Modifier")}
                    </Link>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel" id="edit">
        {cur ? <EditHead title={`${tr("Modifier")} « ${cur.item.title} »`} kind={REF.lessons} k={cur.item.key} s={cur} /> : <EditHead title={model ? `${tr("Nouvelle leçon à partir de")} « ${model.title} »` : tr("Nouvelle leçon")} kind={REF.lessons} />}
        {model && <p className={styles.copyHint}>{tr("Tout est repris de la leçon d'origine : donnez une clé (l'adresse de la page), un titre, et changez ce qui doit l'être. La leçon d'origine ne bouge pas.")}</p>}
        <LessonForm key={cur?.item.key ?? (model ? `copy-${model.key}` : "new")} l={cur?.item ?? model} copy={Boolean(model)} />
      </div>
    </>
  );
}

/** The lines of the bulletin that have no fiche yet: a company or an issuer comes from the bulletin, its fiche is written here. */
async function NoFiche({ items, tab, label }: { items: { isin: string; title: string }[]; tab: string; label: string }) {
  const tr = await getT();
  if (!items.length) return null;
  return (
    <div className={styles.missing}>
      <b>
        {items.length} {label}.
      </b>
      <ul>
        {items.map((m) => (
          <li key={m.isin}>
            <span className="mono">{m.isin}</span>
            <span>{m.title}</span>
            <Link className="btn sm" href={`/desk/referentiel?onglet=${tab}&nouveau=${m.isin}#edit`}>
              {tr("Créer la fiche")}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const slugOf = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

async function Companies({ list: published, rows, open, ok, copie, nouveau }: { list: Company[]; copie: string; nouveau: string } & Ctx) {
  const tr = await getT();
  const list = seen(published, (c) => c.mnemo, COMPANIES, (c) => c.mnemo, rows);
  const cur = list.find((s) => s.item.mnemo === open);
  const model = !cur && copie ? list.find((s) => s.item.mnemo === copie)?.item : undefined;
  const offers = await repo().listOffers();
  const known = new Set(list.map((s) => s.item.isin));
  const fromBoc = offers.filter((o) => o.kind === "MARCHE" && !o.hidden && o.instrument === "action" && o.isin && !known.has(o.isin));
  const seedOffer = !cur && !model && nouveau ? fromBoc.find((o) => o.isin === nouveau) : undefined;
  const seed: FicheSeed | undefined = seedOffer ? { key: (seedOffer.issuer.split(/\s+/)[0] ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6), isin: seedOffer.isin, name: seedOffer.issuer, shortName: seedOffer.issuer, country: seedOffer.country } : undefined;
  const newTitle = model ? `${tr("Nouvelle fiche à partir de")} « ${model.shortName} »` : seed ? `${tr("Fiche de")} ${seed.shortName} · ${seed.isin}` : tr("Nouvelle société");
  return (
    <>
      <div className="panel">
        <div className="panel-h">
          <h2>{tr("Sociétés cotées")} ({list.length})</h2>
          <span className="muted">{tr("Chiffres clés, actionnariat, documents et lecture : la page /societes.")}</span>
        </div>
        <NoFiche items={fromBoc.map((o) => ({ isin: o.isin, title: o.title }))} tab="societes" label={tr("société(s) cotée(s) au bulletin sans fiche")} />
        <table className={`tbl ${styles.tbl}`}>
          <thead>
            <tr>
              <th>{tr("Mnémo")}</th>
              <th>{tr("Société")}</th>
              <th>{tr("Exercices")}</th>
              <th>{tr("Documents")}</th>
              <th>{tr("Origine")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ item: c, ...s }) => (
              <tr key={c.mnemo} className={c.mnemo === ok ? styles.hl : undefined} id={`ref-${c.mnemo}`}>
                <td className="mono">{c.mnemo}</td>
                <td>
                  {c.shortName}
                  <br />
                  <small className="muted">{c.name}</small>
                </td>
                <td>
                  {c.figures?.[0]?.year}–{c.figures?.[c.figures.length - 1]?.year}
                </td>
                <td className="r num">{c.documents?.length ?? 0}</td>
                <td>
                  <Origin inDb={s.inDb} builtin={s.builtin} draft={s.draft} />
                </td>
                <td className="r">
                  <span className={styles.rowBtns}>
                    <Link className="btn sm ghost" href={`/desk/referentiel?onglet=societes&copie=${c.mnemo}#edit`} title={tr("Nouvelle fiche à partir de celle-ci")}>
                      {tr("Dupliquer")}
                    </Link>
                    <Link className="btn sm" href={`/desk/referentiel?onglet=societes&cle=${c.mnemo}#edit`}>
                      {tr("Modifier")}
                    </Link>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel" id="edit">
        {cur ? <EditHead title={`${tr("Fiche")} ${cur.item.shortName}`} kind={REF.companies} k={cur.item.mnemo} s={cur} /> : <EditHead title={newTitle} kind={REF.companies} />}
        {cur || model || seed ? (
          <FicheForm key={cur?.item.mnemo ?? (model ? `copy-${model.mnemo}` : `seed-${seed?.isin}`)} kind={REF.companies} data={cur?.item ?? model} tab="societes" copy={Boolean(model)} seed={seed} />
        ) : (
          <p className={styles.copyHint}>{tr("Une société cotée n'est pas créée à la main : sa ligne arrive avec le bulletin de la BVMAC, et sa fiche se rédige ici depuis « Créer la fiche » (ce que le bulletin sait est pré-rempli) ou « Dupliquer » sur une fiche voisine.")}</p>
        )}
      </div>
    </>
  );
}

async function Issuers({ list: published, rows, open, ok, copie, nouveau }: { list: BondIssuer[]; copie: string; nouveau: string } & Ctx) {
  const tr = await getT();
  const list = seen(published, (i) => i.slug, ISSUERS, (i) => i.slug, rows);
  const cur = list.find((s) => s.item.slug === open);
  const model = !cur && copie ? list.find((s) => s.item.slug === copie)?.item : undefined;
  const offers = await repo().listOffers();
  const known = new Set(list.flatMap((s) => s.item.isins ?? []));
  const companyIsins = new Set(COMPANIES.map((c) => c.isin));
  const fromBoc = offers.filter((o) => o.kind === "MARCHE" && !o.hidden && o.instrument === "obligation" && o.isin && !known.has(o.isin) && !companyIsins.has(o.isin));
  const seedOffer = !cur && !model && nouveau ? fromBoc.find((o) => o.isin === nouveau) : undefined;
  const seed: FicheSeed | undefined = seedOffer ? { key: slugOf(seedOffer.issuer), isin: seedOffer.isin, name: seedOffer.issuer, shortName: seedOffer.issuer, country: seedOffer.country } : undefined;
  const newTitle = model ? `${tr("Nouvelle fiche à partir de")} « ${model.shortName} »` : seed ? `${tr("Fiche de")} ${seed.shortName} · ${seed.isin}` : tr("Nouvel émetteur");
  return (
    <>
      <div className="panel">
        <div className="panel-h">
          <h2>{tr("Émetteurs obligataires")} ({list.length})</h2>
          <span className="muted">{tr("Les pages /emetteurs : lignes rattachées par ISIN, chiffres clés, documents.")}</span>
        </div>
        <NoFiche items={fromBoc.map((o) => ({ isin: o.isin, title: o.title }))} tab="emetteurs" label={tr("ligne(s) obligataire(s) au bulletin sans fiche d'émetteur")} />
        <table className={`tbl ${styles.tbl}`}>
          <thead>
            <tr>
              <th>{tr("Slug")}</th>
              <th>{tr("Émetteur")}</th>
              <th>{tr("Lignes (ISIN)")}</th>
              <th>{tr("Exercices")}</th>
              <th>{tr("Origine")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ item: i, ...s }) => (
              <tr key={i.slug} className={i.slug === ok ? styles.hl : undefined} id={`ref-${i.slug}`}>
                <td className="mono">{i.slug}</td>
                <td>
                  {i.shortName}
                  <br />
                  <small className="muted">{i.name}</small>
                </td>
                <td className="r num">{i.isins?.length ?? 0}</td>
                <td>
                  {i.figures?.[0]?.year}–{i.figures?.[i.figures.length - 1]?.year}
                </td>
                <td>
                  <Origin inDb={s.inDb} builtin={s.builtin} draft={s.draft} />
                </td>
                <td className="r">
                  <span className={styles.rowBtns}>
                    <Link className="btn sm ghost" href={`/desk/referentiel?onglet=emetteurs&copie=${i.slug}#edit`} title={tr("Nouvelle fiche à partir de celle-ci")}>
                      {tr("Dupliquer")}
                    </Link>
                    <Link className="btn sm" href={`/desk/referentiel?onglet=emetteurs&cle=${i.slug}#edit`}>
                      {tr("Modifier")}
                    </Link>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel" id="edit">
        {cur ? <EditHead title={`${tr("Fiche")} ${cur.item.shortName}`} kind={REF.issuers} k={cur.item.slug} s={cur} /> : <EditHead title={newTitle} kind={REF.issuers} />}
        {cur || model || seed ? (
          <FicheForm key={cur?.item.slug ?? (model ? `copy-${model.slug}` : `seed-${seed?.isin}`)} kind={REF.issuers} data={cur?.item ?? model} tab="emetteurs" copy={Boolean(model)} seed={seed} />
        ) : (
          <p className={styles.copyHint}>{tr("Un émetteur n'est pas créé à la main : ses lignes arrivent avec le bulletin de la BVMAC, et sa fiche se rédige ici depuis « Créer la fiche » (ce que le bulletin sait est pré-rempli) ou « Dupliquer » sur une fiche voisine.")}</p>
        )}
      </div>
    </>
  );
}
