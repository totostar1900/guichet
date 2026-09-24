import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { repo } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Répertoire" };

/**
 * Tout le monde, pas seulement les dossiers.
 *
 * Un profil naît à la première connexion, longtemps avant qu'un dossier
 * existe : le desk ne voyait donc qu'une part de ses clients, celle qui avait
 * commencé à remplir un formulaire. Cette page montre l'autre.
 *
 * Elle est faite pour deux usages qui n'obéissent pas aux mêmes règles. Le
 * service découle de la relation et ne demande rien : on doit un accusé de
 * réception à qui a passé un ordre. L'information et les opportunités partent
 * de nous, et n'ont le droit de partir qu'avec un consentement, canal par
 * canal. Les colonnes disent donc les deux : le palier, qui est la relation,
 * et les cases, qui sont le consentement.
 *
 * Elle ne fait rien partir. Lire une liste et écrire à trois cents personnes
 * sont deux gestes, et le second demandera son propre écran, avec son compte
 * avant l'envoi.
 */
const TIER: Record<number, { label: string; hint: string }> = {
  0: { label: "Visiteur", hint: "connecté, sans coordonnées" },
  1: { label: "Identifié", hint: "coordonnées connues" },
  2: { label: "Compte ouvert", hint: "compte-titres chez le dépositaire" },
};

export default async function RepertoirePage({ searchParams }: { searchParams: Promise<{ q?: string; palier?: string; canal?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const r = repo();
  const [contacts, files, intents] = await Promise.all([r.listContacts(), r.listClientFiles().catch(() => []), r.listIntents().catch(() => [])]);
  const withFile = new Set(files.map((f) => f.userId));
  const ordered = new Map<string, number>();
  for (const i of intents) if (i.clientId) ordered.set(i.clientId, (ordered.get(i.clientId) ?? 0) + 1);

  const q = (sp.q ?? "").trim().toLowerCase();
  const rows = contacts
    .filter((c) => !q || [c.name, c.email, c.phone, c.segment].some((v) => (v ?? "").toLowerCase().includes(q)))
    .filter((c) => !sp.palier || String(c.tier ?? 1) === sp.palier)
    .filter((c) => (sp.canal === "whatsapp" ? c.whatsappOptIn : sp.canal === "email" ? c.emailOptIn : sp.canal === "aucun" ? !c.whatsappOptIn && !c.emailOptIn : true))
    .sort((a, b) => (b.since ?? "").localeCompare(a.since ?? "") || a.name.localeCompare(b.name, "fr"));

  const joignables = contacts.filter((c) => c.whatsappOptIn || c.emailOptIn).length;
  const chip = (key: "palier" | "canal", value: string, label: string) => {
    const on = (key === "palier" ? sp.palier : sp.canal) === value;
    const next = new URLSearchParams();
    if (sp.q) next.set("q", sp.q);
    if (key === "palier" ? !on : sp.palier) next.set("palier", key === "palier" ? value : sp.palier!);
    if (key === "canal" ? !on : sp.canal) next.set("canal", key === "canal" ? value : sp.canal!);
    return (
      <Link key={`${key}-${value}`} className={`btn sm ${on ? "" : "ghost"}`} href={`/desk/repertoire?${next.toString()}`}>
        {label}
      </Link>
    );
  };

  return (
    <>
      <DeskNav current="/desk/repertoire" />
      <div className={styles.head}>
        <div>
          <div className="eyebrow">{t("Clients · Répertoire")}</div>
          <h1 className="display">{t("Tous ceux qui se sont connectés")}</h1>
          <p className="muted">{t("Un profil naît à la première connexion, bien avant qu'un dossier existe. Le palier dit la relation : elle autorise les messages liés aux ordres. Les cases disent le consentement : lui seul autorise nos informations et nos opportunités, canal par canal.")}</p>
        </div>
        <div className={styles.headLinks}>
          <span className={styles.count}>
            <b>{contacts.length}</b> {t("personnes")} · <b>{joignables}</b> {t("joignables pour information")}
          </span>
          <Link className="btn sm" href="/desk/clients">
            {t("Dossiers")} →
          </Link>
        </div>
      </div>

      <form className={styles.filters} action="/desk/repertoire">
        <input name="q" defaultValue={sp.q} placeholder={t("Un nom, une adresse, un numéro")} aria-label={t("Chercher")} />
        {sp.palier && <input type="hidden" name="palier" value={sp.palier} />}
        {sp.canal && <input type="hidden" name="canal" value={sp.canal} />}
        <button className="btn sm" type="submit">
          {t("Chercher")}
        </button>
        <span className={styles.spacer} />
        {[0, 1, 2].map((n) => chip("palier", String(n), t(TIER[n].label)))}
        {chip("canal", "whatsapp", t("WhatsApp ✓"))}
        {chip("canal", "email", t("E-mail ✓"))}
        {chip("canal", "aucun", t("Sans consentement"))}
        {(sp.q || sp.palier || sp.canal) && (
          <Link className={styles.clear} href="/desk/repertoire">
            {t("Tout voir")}
          </Link>
        )}
      </form>

      <div className="panel">
        <div className="panel-h">
          <h2>{t("{n} personne(s)", { n: String(rows.length) })}</h2>
          <span className="muted">{t("Les plus récemment arrivées d'abord")}</span>
        </div>
        <div className="scroll-x">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Nom")}</th>
                <th>{t("Palier")}</th>
                <th>{t("Coordonnées")}</th>
                <th>{t("Informations")}</th>
                <th className="r">{t("Ordres")}</th>
                <th>{t("Dossier")}</th>
                <th>{t("Depuis")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="who">
                    {c.name}
                    <small className="muted">{c.segment || "—"}</small>
                  </td>
                  <td>
                    <span className={`st ${c.tier === 2 ? "reglee" : c.tier === 0 ? "annulee" : "recue"}`} title={t(TIER[c.tier ?? 1].hint)}>
                      {t(TIER[c.tier ?? 1].label)}
                    </span>
                  </td>
                  <td className={styles.wrap}>
                    {c.email ?? "—"}
                    <br />
                    <small className="mono muted">{c.phone ?? "—"}</small>
                  </td>
                  <td className={styles.consents}>
                    <span className={c.whatsappOptIn ? styles.yes : styles.no}>{t("WhatsApp")}</span>
                    <span className={c.emailOptIn ? styles.yes : styles.no}>{t("E-mail")}</span>
                  </td>
                  <td className="r num">{ordered.get(c.id) ?? 0}</td>
                  <td>{withFile.has(c.id) ? <Link href={`/desk/clients?file=${files.find((f) => f.userId === c.id)?.id}`}>{t("Ouvrir")}</Link> : <span className="muted">{t("aucun")}</span>}</td>
                  <td className="muted">{c.since ? fmtDate(c.since) : "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    {t("Personne ne répond à cette recherche.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
