"use client";

import { useActionState, useState, useTransition } from "react";
import { Select } from "@/components/ui/Select";
import { useT } from "@/i18n/client";
import { RUBRIC_LABEL, RUBRICS, SOURCE_OPTIONS, whyProblem, type NewsItem } from "@/lib/news/model";
import type { LinkMeta } from "@/lib/news/fetch";
import { readLinkAction, saveNewsAction, type NewsResult } from "./actions";
import styles from "./page.module.css";

const localInput = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** One publication: paste the link, let the page fill what it can, write the two lines, publish. */
export function NewsForm({ item, candidates, featuredTitle }: { item?: NewsItem; candidates: { label: string; hint: string }[]; featuredTitle?: string }) {
  const tr = useT();
  const [state, action, pending] = useActionState<NewsResult | null, FormData>(saveNewsAction, null);
  const [reading, startRead] = useTransition();
  const [url, setUrl] = useState(item?.url ?? "");
  const [title, setTitle] = useState(item?.title ?? "");
  const [why, setWhy] = useState(item?.why ?? "");
  const [source, setSource] = useState(item?.source ?? "BVMAC");
  const [rubric, setRubric] = useState<string>(item?.rubric ?? "bvmac");
  const [format, setFormat] = useState(item?.format ?? "");
  const [publishedAt, setPublishedAt] = useState(localInput(item?.publishedAt));
  const [pageTitle, setPageTitle] = useState(item?.pageTitle ?? "");
  const [meta, setMeta] = useState<LinkMeta | null>(null);
  const [en, setEn] = useState(Boolean(item?.titleEn || item?.whyEn));
  const problem = why ? whyProblem(why) : null;

  const read = () =>
    startRead(async () => {
      const m = await readLinkAction(url);
      setMeta(m);
      if (!m.ok) return;
      setSource(m.source);
      setRubric(m.rubric);
      setFormat(m.format);
      if (m.pageTitle) {
        setPageTitle(m.pageTitle);
        if (!title) setTitle(m.pageTitle);
      }
      if (m.publishedAt) setPublishedAt(localInput(m.publishedAt));
    });

  return (
    <form action={action} className={styles.form}>
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="pageTitle" value={pageTitle} />
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="rubric" value={rubric} />
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.05rem" }}>{item ? tr("Préparer la publication") : tr("Ajouter une publication")}</h2>
        <p className={styles.hint}>{tr("Collez le lien : titre, source et date sont lus sur la page. Vous rédigez le titre pour le client et les deux lignes de lecture.")}</p>
      </div>
      {item?.receivedFrom && item.status === "recu" && (
        <div className={styles.preview}>
          <b>
            {tr("Reçu")} · {tr(item.receivedFrom)}
          </b>
          {item.note && <span>« {item.note} »</span>}
        </div>
      )}
      <label>
        <span>{tr("Lien")}</span>
        <div className={styles.urlRow}>
          <input name="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" required />
          <button type="button" className="btn sm" onClick={read} disabled={reading || !url}>
            {reading ? "…" : tr("Lire la page")}
          </button>
        </div>
        {meta && (
          <span className={`${styles.hint} ${meta.error ? styles.bad : styles.good}`}>
            {meta.error ? tr(meta.error) : `${tr("Page lue")} · ${tr(meta.format)} · ${meta.domain}${meta.pageTitle ? ` · « ${meta.pageTitle.slice(0, 80)} »` : ""}`}
          </span>
        )}
      </label>
      <div className={styles.row2}>
        <label>
          <span>{tr("Source")}</span>
          <Select block value={source} onChange={setSource} options={[...new Set([...SOURCE_OPTIONS, source])].map((s) => ({ value: s, label: s }))} />
        </label>
        <label>
          <span>{tr("Date de publication")}</span>
          <input name="publishedAt" type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} required />
        </label>
      </div>
      <label>
        <span>{tr("Titre affiché")}</span>
        <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
        {pageTitle && pageTitle !== title && (
          <span className={styles.hint}>
            {tr("Titre lu sur la page")} : « {pageTitle.slice(0, 120)} »
          </span>
        )}
      </label>
      <label>
        <span>{tr("Pourquoi ça compte — deux lignes, pas plus")}</span>
        <textarea name="why" rows={3} value={why} onChange={(e) => setWhy(e.target.value)} maxLength={320} />
        <span className={styles.counter}>
          <span className={problem ? styles.bad : ""}>{problem ? tr(problem) : tr("Pas de recommandation, pas de chiffre non sourcé.")}</span>
          <span>{why.length} / 320</span>
        </span>
      </label>
      <div className={styles.row2}>
        <label>
          <span>{tr("Rubrique")}</span>
          <Select block value={rubric} onChange={setRubric} options={RUBRICS.map((r) => ({ value: r, label: tr(RUBRIC_LABEL[r]) }))} />
        </label>
        <label>
          <span>{tr("Visible jusqu'au")}</span>
          <input name="visibleUntil" type="date" defaultValue={item?.visibleUntil ?? ""} />
          <span className={styles.hint}>{tr("Vide : 30 jours après la publication.")}</span>
        </label>
      </div>
      <label>
        <span>{tr("Lignes et notions liées (séparées par des virgules)")}</span>
        <input name="links" list="news-links" defaultValue={item?.links.map((l) => l.label).join(", ") ?? ""} placeholder={tr("ex. SEMC, dividende, rca-ota-c-2028")} />
        <datalist id="news-links">
          {candidates.map((c) => (
            <option key={c.label} value={c.label}>
              {c.hint}
            </option>
          ))}
        </datalist>
        <span className={styles.hint}>{tr("Une publication liée s'affiche aussi sur la fiche de la ligne, de la société ou de l'émetteur.")}</span>
      </label>
      <div className={styles.check}>
        <input id="news-featured" name="featured" type="checkbox" defaultChecked={item?.featured} />
        <label htmlFor="news-featured">{tr("Mettre à la une")}</label>
        {featuredTitle && !item?.featured && (
          <span className={styles.hint}>
            ({tr("remplace")} « {featuredTitle.slice(0, 60)} »)
          </span>
        )}
      </div>
      <div className={styles.check}>
        <input id="news-en" type="checkbox" checked={en} onChange={(e) => setEn(e.target.checked)} />
        <label htmlFor="news-en">{tr("Version anglaise")}</label>
        <span className={styles.hint}>{tr("sinon le lecteur anglais lit le français")}</span>
      </div>
      {en && (
        <>
          <label>
            <span>Title (English)</span>
            <input name="titleEn" defaultValue={item?.titleEn ?? ""} maxLength={200} />
          </label>
          <label>
            <span>Why it matters (English)</span>
            <textarea name="whyEn" rows={2} defaultValue={item?.whyEn ?? ""} maxLength={400} />
          </label>
        </>
      )}
      {state && <p className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</p>}
      <div className={styles.actions}>
        <button className="btn primary" type="submit" name="do" value="publier" disabled={pending}>
          {pending ? "…" : item?.status === "publiee" ? tr("Enregistrer et republier") : tr("Publier")}
        </button>
        <button className="btn" type="submit" name="do" value="brouillon" disabled={pending}>
          {tr("Enregistrer le brouillon")}
        </button>
        <small>{tr("Journalisé, versionné")}</small>
      </div>
    </form>
  );
}
