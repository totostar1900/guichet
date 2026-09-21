import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { COMPANIES } from "@/data/companies";
import { ISSUERS } from "@/data/issuers";
import { BOND_TERMS } from "@/data/bond-terms";
import { repo } from "@/lib/data";
import { bocUrl } from "@/lib/market/boc";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dépôt" };

/**
 * The document repository of the desk: every bulletin the Guichet read (and
 * the PDF it kept), the sources received for À valider, the documents the
 * Guichet issues to clients, the models, and the references behind the
 * figures (BVMAC fiches, issuers' accounts). One page, so that « where is
 * the file » has one answer.
 */
export default async function DepotPage({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const r = repo();
  const limit = sp.n === "tous" ? 1000 : 60;
  const [bulletins, intake, documents] = await Promise.all([r.listBulletins(limit), r.listIntake().catch(() => []), r.listDocuments().catch(() => [])]);
  const kept = bulletins.filter((b) => b.fileKey).length;
  const sources = intake
    .filter((i) => i.fileName)
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, 40);
  const refs = [
    ...COMPANIES.flatMap((c) => c.documents.map((d) => ({ who: c.shortName, title: d.title, year: d.year, url: d.url }))),
    ...ISSUERS.flatMap((i) => i.documents.map((d) => ({ who: i.shortName, title: d.title, year: d.year, url: d.url }))),
  ].sort((a, b) => a.who.localeCompare(b.who, "fr") || b.year - a.year);
  const termSources = [...new Set(BOND_TERMS.map((x) => x.source))];
  const models: { title: string; hint: string; href: string }[] = [
    { title: "Convention de compte-titres (modèle vierge)", hint: "PDF · ce que le client lit avant d'accepter", href: "/desk/documents/convention-modele" },
    { title: "Bulletin d'ordre · Appel de fonds · Bordereau · Avis · Relevé", hint: "produits depuis Documents pour une intention donnée", href: "/desk/documents" },
    { title: "Fiche PDF d'une ligne", hint: "depuis la fiche de la ligne, bouton « Fiche PDF » (le « ··· » sur téléphone)", href: "/" },
    { title: "Modèles d'e-mails de connexion", hint: "docs/supabase-email-templates.md dans le dépôt de code", href: "/desk/docs/technique" },
  ];
  return (
    <>
      <DeskNav current="/desk/depot" />
      <div className={styles.head}>
        <div>
          <div className="eyebrow">{t("Desk · Dépôt")}</div>
          <h1 className="display">{t("Dépôt de documents")}</h1>
          <p className="muted">{t("Tout ce que le Guichet a lu, reçu, produit ou cité, avec l'endroit où il est gardé. Les règles de conservation sont dans la documentation « Sources, stockage et dépôt ».")}</p>
        </div>
        <Link className="btn sm" href="/desk/docs/sources">
          {t("Sources, stockage et dépôt")} →
        </Link>
      </div>

      <section className="panel">
        <div className="panel-h">
          <h2>{t("Bulletins Officiels de la Cote")}</h2>
          <span className="muted">{t("{n} séances lues · {k} PDF conservés (bucket « sources », boc/BOC-AAAAMMJJ.pdf) · la source BVMAC reste en lien", { n: String(bulletins.length), k: String(kept) })}</span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Séance")}</th>
                <th>{t("N°")}</th>
                <th>{t("Lu le")}</th>
                <th>{t("Par")}</th>
                <th>{t("Lignes")}</th>
                <th>{t("État")}</th>
                <th>{t("Fichier")}</th>
              </tr>
            </thead>
            <tbody>
              {bulletins.map((b) => (
                <tr key={b.id}>
                  <td>{fmtDate(b.sessionDate)}</td>
                  <td className="mono">{b.number || "—"}</td>
                  <td>{fmtDateTime(b.ingestedAt)}</td>
                  <td>{b.ingestedBy === "cron" ? t("automatique") : t("desk")}</td>
                  <td className="num">{b.counts.equities + b.counts.bonds + b.counts.funds}</td>
                  <td>
                    <span className={`st ${b.status === "ok" ? "reglee" : b.status === "partiel" ? "transmise" : "annulee"}`}>{t(b.status === "ok" ? "complet" : b.status === "partiel" ? "à vérifier" : "échec")}</span>
                  </td>
                  <td className={styles.files}>
                    {b.fileKey && (
                      <a className="btn sm" href={`/desk/depot/boc/${b.sessionDate}`} target="_blank" rel="noreferrer">
                        {t("PDF conservé")}
                      </a>
                    )}
                    <a href={b.sourceUrl?.startsWith("http") ? b.sourceUrl : bocUrl(b.sessionDate)} target="_blank" rel="noreferrer">
                      {t("source BVMAC")}
                    </a>
                  </td>
                </tr>
              ))}
              {bulletins.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    {t("Aucun bulletin lu pour l'instant.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {bulletins.length >= 60 && sp.n !== "tous" && (
          <p className={styles.more}>
            <Link href="/desk/depot?n=tous">{t("Toutes les séances")} →</Link>
          </p>
        )}
      </section>

      <section className="panel">
        <div className="panel-h">
          <h2>{t("Sources reçues")}</h2>
          <span className="muted">{t("courriels et pièces jointes arrivés dans À valider, gardés tels quels (bucket « sources »)")}</span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Reçu le")}</th>
                <th>{t("De")}</th>
                <th>{t("Titre")}</th>
                <th>{t("État")}</th>
                <th>{t("Fichier")}</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((i) => (
                <tr key={i.id}>
                  <td>{fmtDateTime(i.receivedAt)}</td>
                  <td>{i.fromLabel}</td>
                  <td>
                    <Link href={`/desk/a-valider?item=${i.id}`}>{i.title}</Link>
                  </td>
                  <td>{t(i.state)}</td>
                  <td>
                    <a href={`/desk/a-valider/source/${i.id}`} target="_blank" rel="noreferrer">
                      {i.fileName}
                    </a>
                  </td>
                </tr>
              ))}
              {sources.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    {t("Aucune source avec fichier pour l'instant.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-h">
          <h2>{t("Documents émis aux clients")}</h2>
          <span className="muted">{t("{n} documents · générés par le Guichet, table « documents », PDF dans le bucket « documents » · liste et recherche dans Documents", { n: String(documents.length) })}</span>
        </div>
        <p className={styles.p}>
          <Link className="btn sm" href="/desk/documents">
            {t("Ouvrir Documents")} →
          </Link>
        </p>
      </section>

      <section className="panel">
        <div className="panel-h">
          <h2>{t("Modèles")}</h2>
          <span className="muted">{t("les gabarits que le Guichet remplit ; le texte des modèles vit dans le code (src/lib/documents)")}</span>
        </div>
        <ul className={styles.models}>
          {models.map((m) => (
            <li key={m.title}>
              <Link href={m.href}>{t(m.title)}</Link>
              <small>{t(m.hint)}</small>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-h">
          <h2>{t("Références derrière les chiffres")}</h2>
          <span className="muted">{t("les documents publics d'où viennent les fiches d'émetteur, les comptes et les modalités des emprunts ; en lien vers l'original (BVMAC), non copiés")}</span>
        </div>
        <div className={styles.refs}>
          <div>
            <h3>{t("Fiches et comptes des émetteurs")}</h3>
            <ul>
              {refs.map((d) => (
                <li key={d.url}>
                  <b>{d.who}</b> ·{" "}
                  <a href={d.url} target="_blank" rel="noreferrer">
                    {d.title}
                  </a>{" "}
                  <small>{d.year}</small>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>{t("Modalités des emprunts (bond-terms)")}</h3>
            <ul>
              {termSources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <p className="muted">{t("Reprises des fiches signalétiques BVMAC (JPG) dans src/data/bond-terms.ts, avec la date de la fiche.")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
