import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { BOND_TERMS, type BondTerms } from "@/data/bond-terms";
import { COMPANIES, type Company } from "@/data/companies";
import { ISSUERS, type BondIssuer } from "@/data/issuers";
import { repo } from "@/lib/data";
import { SEGMENT_LABEL } from "@/lib/domain/status";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { GLOSSARY as GLOSSARY_DEFAULTS, type Term } from "@/lib/glossary";
import { loadBondTerms, loadCompanies, loadGlossary, loadIssuers, loadLessons, loadTypes, REF } from "@/lib/reference";
import { ENGINE_LABEL, type ProductType } from "@/lib/registry";
import { importDefaultsAction, resetReferenceAction } from "./actions";
import { GlossaryForm, JsonForm, LessonForm, TermForm, TypeForm } from "./Forms";
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

async function Origin({ inDb, builtin }: { inDb: boolean; builtin: boolean }) {
  const tr = await getT();
  if (inDb && builtin) return <span className={`${styles.tag} ${styles.tagEdit}`}>{tr("modifié par le desk")}</span>;
  if (inDb) return <span className={`${styles.tag} ${styles.tagNew}`}>{tr("créé par le desk")}</span>;
  return <span className={styles.tag}>{tr("valeur par défaut")}</span>;
}

function ResetButton({ kind, k, builtin }: { kind: string; k: string; builtin: boolean }) {
  return (
    <form action={resetReferenceAction} className={styles.inlineForm}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="key" value={k} />
      <button className="btn sm ghost" type="submit">
        {builtin ? "Revenir aux valeurs par défaut" : "Supprimer"}
      </button>
    </form>
  );
}

export default async function ReferentielPage({ searchParams }: { searchParams: Promise<{ onglet?: string; cle?: string }> }) {
  const tr = await getT();
  const sp = await searchParams;
  const tab: Tab = (TABS.find(([t]) => t === sp.onglet)?.[0] ?? "types") as Tab;
  const open = sp.cle ?? "";
  const kind = TABS.find(([t]) => t === tab)![2];
  const rows = await repo().listReference(kind);
  const inDb = new Map(rows.map((r) => [r.key, r]));
  const lastEdit = rows.map((r) => r.updatedAt).sort().reverse()[0];

  return (
    <>
      <DeskNav current="/desk/referentiel" />
      <div className={styles.head}>
        <div>
          <h1>{tr("Référentiel")}</h1>
          <p className="muted">{tr("Ce que le Guichet sait sans qu'on touche au code : les types de produits (nom, couleur, points d'attention, liste de contrôle, intentions), les échéanciers exacts des obligations, le glossaire, les fiches des sociétés et des émetteurs. Chaque entrée part d'une valeur par défaut livrée avec l'application ; ce que le desk enregistre ici prend le dessus, et « revenir aux valeurs par défaut » l'efface.")}</p>
        </div>
        <small className="muted">{lastEdit ? `${tr("Dernière modification")} ${fmtDateTime(lastEdit)}` : tr("Aucune modification du desk sur cet onglet")}</small>
      </div>

      <nav className={styles.tabs} aria-label={tr("Référentiel")}>
        {TABS.map(([t, label]) => (
          <Link key={t} href={`/desk/referentiel?onglet=${t}`} aria-current={t === tab ? "page" : undefined}>
            {tr(label)}
          </Link>
        ))}
        <form action={importDefaultsAction} className={styles.importForm}>
          <input type="hidden" name="kind" value={kind} />
          <button className="btn sm" type="submit" title={tr("Copie les valeurs par défaut manquantes dans la table pour les modifier ligne par ligne")}>
            {tr("Importer les valeurs par défaut")}
          </button>
        </form>
      </nav>

      {tab === "types" && <Types types={await loadTypes()} inDb={inDb} open={open} />}
      {tab === "echeanciers" && <Terms terms={[...(await loadBondTerms()).values()]} inDb={inDb} open={open} />}
      {tab === "glossaire" && <Glossary glossary={await loadGlossary()} inDb={inDb} open={open} />}
      {tab === "lecons" && <Lessons list={await loadLessons()} inDb={inDb} open={open} />}
      {tab === "societes" && <Companies list={await loadCompanies()} inDb={inDb} open={open} />}
      {tab === "emetteurs" && <Issuers list={await loadIssuers()} inDb={inDb} open={open} />}
    </>
  );
}

type Rows = Map<string, { updatedAt: string; updatedBy?: string }>;

async function Types({ types, inDb, open }: { types: ProductType[]; inDb: Rows; open: string }) {
  const tr = await getT();
  return (
    <>
      <div className="panel">
        <div className="panel-h">
          <h2>{tr("Types de produits")} ({types.length})</h2>
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
            {types.map((t) => (
              <tr key={t.key} className={t.enabled ? undefined : styles.off}>
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
                  <Origin inDb={inDb.has(t.key)} builtin={t.builtin} />
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
      {open && types.some((t) => t.key === open) ? (
        <div className="panel" id="edit">
          <div className="panel-h">
            <h2>Modifier {open}</h2>
            {inDb.has(open) && <ResetButton kind={REF.types} k={open} builtin={types.find((t) => t.key === open)!.builtin} />}
          </div>
          <TypeForm key={open} t={types.find((t) => t.key === open)} />
        </div>
      ) : (
        <div className="panel" id="edit">
          <div className="panel-h">
            <h2>{tr("Nouveau type de produit")}</h2>
          </div>
          <TypeForm key="new" isNew />
        </div>
      )}
    </>
  );
}

async function Terms({ terms, inDb, open }: { terms: BondTerms[]; inDb: Rows; open: string }) {
  const tr = await getT();
  const defaults = new Set(BOND_TERMS.map((b) => b.isin));
  const cur = terms.find((t) => t.isin === open);
  return (
    <>
      <div className="panel">
        <div className="panel-h">
          <h2>{tr("Échéanciers des obligations")} ({terms.length})</h2>
          <span className="muted">{tr("Le bulletin ne donne que l'année : ici la date exacte, la périodicité et le différé, d'après la fiche signalétique.")}</span>
        </div>
        <table className={`tbl ${styles.tbl}`}>
          <thead>
            <tr>
              <th>{tr("ISIN")}</th>
              <th>{tr("Échéance")}</th>
              <th>{tr("Paiements / an")}</th>
              <th>{tr("Différé jusqu'au")}</th>
              <th>{tr("Source")}</th>
              <th>{tr("Origine")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {terms
              .sort((a, b) => a.isin.localeCompare(b.isin))
              .map((t) => (
                <tr key={t.isin}>
                  <td className="mono">{t.isin}</td>
                  <td>{fmtDate(t.maturityOn)}</td>
                  <td className="r num">{t.periodsPerYear}</td>
                  <td>{t.graceUntil ? fmtDate(t.graceUntil) : "—"}</td>
                  <td className={styles.wrap}>
                    <small>{t.source}</small>
                  </td>
                  <td>
                    <Origin inDb={inDb.has(t.isin)} builtin={defaults.has(t.isin)} />
                  </td>
                  <td className="r">
                    <Link className="btn sm" href={`/desk/referentiel?onglet=echeanciers&cle=${t.isin}#edit`}>
                      {tr("Modifier")}
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <div className="panel" id="edit">
        <div className="panel-h">
          <h2>{cur ? `Échéancier ${cur.isin}` : "Nouvel échéancier"}</h2>
          {cur && inDb.has(cur.isin) && <ResetButton kind={REF.bondTerms} k={cur.isin} builtin={defaults.has(cur.isin)} />}
        </div>
        <TermForm key={cur?.isin ?? "new"} t={cur} />
      </div>
    </>
  );
}

async function Glossary({ glossary, inDb, open }: { glossary: Record<string, Term>; inDb: Rows; open: string }) {
  const tr = await getT();
  const keys = Object.keys(glossary).sort((a, b) => glossary[a].short.localeCompare(glossary[b].short, "fr"));
  const cur = open && glossary[open] ? open : "";
  return (
    <>
      <div className="panel">
        <div className="panel-h">
          <h2>{tr("Glossaire")} ({keys.length})</h2>
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
            {keys.map((k) => (
              <tr key={k}>
                <td>
                  <b>{glossary[k].short}</b>
                  {glossary[k].long && <small className="muted"> — {glossary[k].long}</small>}
                  <br />
                  <small className="mono muted">{k}</small>
                </td>
                <td className={styles.wrap}>{glossary[k].text}</td>
                <td>
                  <Origin inDb={inDb.has(k)} builtin={k in GLOSSARY_DEFAULTS} />
                </td>
                <td className="r">
                  <Link className="btn sm" href={`/desk/referentiel?onglet=glossaire&cle=${k}#edit`}>
                    {tr("Modifier")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel" id="edit">
        <div className="panel-h">
          <h2>{cur ? `Modifier « ${glossary[cur].short} »` : "Nouveau terme"}</h2>
          {cur && inDb.has(cur) && <ResetButton kind={REF.glossary} k={cur} builtin={cur in GLOSSARY_DEFAULTS} />}
        </div>
        <GlossaryForm key={cur || "new"} k={cur || undefined} t={cur ? glossary[cur] : undefined} />
      </div>
    </>
  );
}

async function Lessons({ list, inDb, open }: { list: Lesson[]; inDb: Rows; open: string }) {
  const tr = await getT();
  const defaults = new Set(LESSONS.map((l) => l.key));
  const cur = list.find((l) => l.key === open);
  return (
    <>
      <div className="panel">
        <div className="panel-h">
          <h2>{tr("Leçons")} ({list.length})</h2>
          <span className="muted">{tr("L'onglet Info : une idée par leçon, une vraie ligne, une question.")}</span>
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
            {list.map((l) => (
              <tr key={l.key}>
                <td className="r num">{l.order}</td>
                <td>
                  <b>{l.title}</b>
                  <br />
                  <small className="mono muted">{l.key}</small>
                </td>
                <td className="mono">{l.widget}</td>
                <td className={styles.wrap}>{l.terms.join(", ") || "—"}</td>
                <td>
                  <Origin inDb={inDb.has(l.key)} builtin={defaults.has(l.key)} />
                </td>
                <td className="r">
                  <Link className="btn sm" href={`/desk/referentiel?onglet=lecons&cle=${l.key}#edit`}>
                    {tr("Modifier")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel" id="edit">
        <div className="panel-h">
          <h2>{cur ? `Modifier « ${cur.title} »` : "Nouvelle leçon"}</h2>
          {cur && inDb.has(cur.key) && <ResetButton kind={REF.lessons} k={cur.key} builtin={defaults.has(cur.key)} />}
        </div>
        <LessonForm key={cur?.key ?? "new"} l={cur} />
      </div>
    </>
  );
}

async function Companies({ list, inDb, open }: { list: Company[]; inDb: Rows; open: string }) {
  const tr = await getT();
  const defaults = new Set(COMPANIES.map((c) => c.mnemo));
  const cur = list.find((c) => c.mnemo === open);
  return (
    <>
      <div className="panel">
        <div className="panel-h">
          <h2>{tr("Sociétés cotées")} ({list.length})</h2>
          <span className="muted">{tr("Chiffres clés, actionnariat, documents et lecture : la page /societes.")}</span>
        </div>
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
            {list.map((c) => (
              <tr key={c.mnemo}>
                <td className="mono">{c.mnemo}</td>
                <td>
                  {c.shortName}
                  <br />
                  <small className="muted">{c.name}</small>
                </td>
                <td>
                  {c.figures[0]?.year}–{c.figures[c.figures.length - 1]?.year}
                </td>
                <td className="r num">{c.documents.length}</td>
                <td>
                  <Origin inDb={inDb.has(c.mnemo)} builtin={defaults.has(c.mnemo)} />
                </td>
                <td className="r">
                  <Link className="btn sm" href={`/desk/referentiel?onglet=societes&cle=${c.mnemo}#edit`}>
                    {tr("Modifier")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel" id="edit">
        <div className="panel-h">
          <h2>{cur ? `Fiche ${cur.shortName}` : "Nouvelle société"}</h2>
          {cur && inDb.has(cur.mnemo) && <ResetButton kind={REF.companies} k={cur.mnemo} builtin={defaults.has(cur.mnemo)} />}
        </div>
        <JsonForm key={cur?.mnemo ?? "new"} kind={REF.companies} data={cur} label={tr("Société cotée")} />
      </div>
    </>
  );
}

async function Issuers({ list, inDb, open }: { list: BondIssuer[]; inDb: Rows; open: string }) {
  const tr = await getT();
  const defaults = new Set(ISSUERS.map((i) => i.slug));
  const cur = list.find((i) => i.slug === open);
  return (
    <>
      <div className="panel">
        <div className="panel-h">
          <h2>{tr("Émetteurs obligataires")} ({list.length})</h2>
          <span className="muted">{tr("Les pages /emetteurs : lignes rattachées par ISIN, chiffres clés, documents.")}</span>
        </div>
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
            {list.map((i) => (
              <tr key={i.slug}>
                <td className="mono">{i.slug}</td>
                <td>
                  {i.shortName}
                  <br />
                  <small className="muted">{i.name}</small>
                </td>
                <td className="r num">{i.isins.length}</td>
                <td>
                  {i.figures[0]?.year}–{i.figures[i.figures.length - 1]?.year}
                </td>
                <td>
                  <Origin inDb={inDb.has(i.slug)} builtin={defaults.has(i.slug)} />
                </td>
                <td className="r">
                  <Link className="btn sm" href={`/desk/referentiel?onglet=emetteurs&cle=${i.slug}#edit`}>
                    {tr("Modifier")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel" id="edit">
        <div className="panel-h">
          <h2>{cur ? `Fiche ${cur.shortName}` : "Nouvel émetteur"}</h2>
          {cur && inDb.has(cur.slug) && <ResetButton kind={REF.issuers} k={cur.slug} builtin={defaults.has(cur.slug)} />}
        </div>
        <JsonForm key={cur?.slug ?? "new"} kind={REF.issuers} data={cur} label={tr("Émetteur")} />
      </div>
    </>
  );
}
