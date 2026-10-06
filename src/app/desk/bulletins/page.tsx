import { Fragment } from "react";
import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { Reread } from "@/components/desk/Reread";
import { TallTable } from "@/components/desk/TallTable";
import { repo } from "@/lib/data";
import { ARRIERE_PAR_TOUR, bulletinsToReread, REREAD_BATCH } from "@/lib/health";
import { codes as codesDe, FAMILLES, famille, parCode, VUES } from "@/lib/market/remarques";
import type { MarketBulletin } from "@/lib/domain/market";
import { lancerArriereAction, rereadAction } from "./actions";
import { fmtDateTime } from "@/lib/format";
import { getT } from "@/i18n/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bulletins de la BVMAC" };

/**
 * LE DÉPÔT DES BULLETINS : les huit cents séances, et ce que le lecteur a dit
 * de chacune.
 *
 * DEUX COLONNES POUR UN MÊME DOCUMENT, et elles ne disent pas la même chose.
 * « PDF » est notre copie, servie par nous, qui ne dépend de personne ; « lien »
 * est l'adresse chez la bourse, qui vit sa vie. Cent quatre séances ont les
 * deux, les autres n'ont que le lien : le rattrapage de l'historique a gardé
 * les cours et jeté les documents.
 *
 * LES REMARQUES SONT CODÉES, et la matrice sert à la fois de légende et de
 * filtre. La colonne montrait la première phrase du lecteur, tronquée à
 * quatre-vingt-dix caractères : on ne pouvait ni compter, ni comparer. Vingt
 * lettres disent tout ce qu'il a dit, et le compte en exposant distingue une
 * ligne manquée de soixante.
 *
 * TOUT PASSE PAR L'ADRESSE. Une vue se met en lien, se range dans les favoris,
 * se colle dans un message ; un état gardé dans le navigateur ne se partage
 * pas, et c'est Santé qui en a besoin pour pointer sur ce qu'elle signale.
 */
const ANNEES_VISIBLES = 6;

type Tri = "d" | "n" | "s" | "a" | "o" | "v" | "c" | "r";

export default async function BulletinsPage({ searchParams }: { searchParams: Promise<{ vue?: string; an?: string; etat?: string; code?: string; grp?: string; tri?: string; sens?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const [tous, arriere] = await Promise.all([repo().listBulletins(2000), bulletinsToReread()]);

  const annees = [...new Set(tous.map((b) => b.sessionDate.slice(0, 4)))].sort().reverse().slice(0, ANNEES_VISIBLES);
  const etats = ["ok", "partiel", "echec"] as const;
  const vue = VUES.find((v) => v.id === sp.vue) ?? VUES[0];
  const an = sp.an && annees.includes(sp.an) ? sp.an : undefined;
  const etat = sp.etat && (etats as readonly string[]).includes(sp.etat) ? sp.etat : undefined;
  const retenus = (sp.code ?? "").split(",").filter((c) => FAMILLES.some((f) => f.code === c));
  const grp = ["an", "mois", "etat", "nb"].includes(sp.grp ?? "") ? sp.grp : undefined;
  const tri = (["d", "n", "s", "a", "o", "v", "c", "r"].includes(sp.tri ?? "") ? sp.tri : vue.file ? "r" : "d") as Tri;
  const sens = sp.sens === "asc" ? 1 : sp.sens === "desc" ? -1 : tri === "r" && vue.file ? 1 : -1;

  const codesPar = new Map(tous.map((b) => [b.id, codesDe(b)]));
  const liste = tous
    .filter((b) => vue.ou(b))
    .filter((b) => (an ? b.sessionDate.startsWith(an) : true))
    .filter((b) => (etat ? b.status === etat : true))
    .filter((b) => (retenus.length ? retenus.some((c) => codesPar.get(b.id)!.includes(c)) : true));

  const valeur = (b: MarketBulletin): string | number =>
    tri === "n" ? b.number ?? 0
    : tri === "s" ? b.status
    : tri === "a" ? b.counts?.equities ?? 0
    : tri === "o" ? b.counts?.bonds ?? 0
    : tri === "v" ? b.counts?.funds ?? 0
    : tri === "c" ? codesPar.get(b.id)!.length
    : tri === "r" ? b.ingestedAt
    : b.sessionDate;
  liste.sort((x, y) => {
    const vx = valeur(x), vy = valeur(y);
    return (vx < vy ? -1 : vx > vy ? 1 : x.sessionDate.localeCompare(y.sessionDate)) * sens;
  });

  /* Le compte par code sur la SÉLECTION, et non sur les 808 : la matrice dit
     ce qui reste, pas ce qui existe. */
  const compte: Record<string, number> = {};
  const bornes: Record<string, [string, string]> = {};
  for (const b of liste)
    for (const c of codesPar.get(b.id)!) {
      compte[c] = (compte[c] ?? 0) + 1;
      bornes[c] = bornes[c] ? [bornes[c][0] < b.sessionDate ? bornes[c][0] : b.sessionDate, bornes[c][1] > b.sessionDate ? bornes[c][1] : b.sessionDate] : [b.sessionDate, b.sessionDate];
    }

  const lien = (o: Partial<{ vue: string; an: string; etat: string; code: string; grp: string; tri: string; sens: string }>) => {
    const q = new URLSearchParams();
    const mis = { vue: vue.id === "tout" ? "" : vue.id, an: an ?? "", etat: etat ?? "", code: retenus.join(","), grp: grp ?? "", tri: sp.tri ?? "", sens: sp.sens ?? "", ...o };
    for (const [k, v] of Object.entries(mis)) if (v) q.set(k, v);
    return `/desk/bulletins${q.toString() ? `?${q}` : ""}`;
  };
  /* Toucher un code l'ajoute, le retoucher l'enlève : la matrice est un filtre
     à bascule, et l'adresse en porte la trace. */
  const bascule = (c: string) => lien({ code: (retenus.includes(c) ? retenus.filter((x) => x !== c) : [...retenus, c]).join(",") });
  const enTete = (k: Tri, nom: string, droite = false) => (
    <th className={droite ? "r" : undefined} aria-sort={tri === k ? (sens < 0 ? "descending" : "ascending") : undefined}>
      <Link href={lien({ tri: k, sens: tri === k && sens < 0 ? "asc" : "desc" })}>
        {nom} {tri === k ? (sens < 0 ? "↓" : "↑") : <span className={styles.muetTri}>↕</span>}
      </Link>
    </th>
  );

  const clef = (b: MarketBulletin) =>
    grp === "an" ? b.sessionDate.slice(0, 4)
    : grp === "mois" ? b.sessionDate.slice(0, 7)
    : grp === "etat" ? t(b.status)
    : grp === "nb" ? (codesPar.get(b.id)!.length ? t("{n} code(s)", { n: codesPar.get(b.id)!.length }) : t("aucun code"))
    : "";
  const paquets = new Map<string, MarketBulletin[]>();
  if (grp) for (const b of liste) paquets.set(clef(b), [...(paquets.get(clef(b)) ?? []), b]);

  const rangee = (b: MarketBulletin) => {
    const cs = codesPar.get(b.id)!;
    const n = parCode(b);
    return (
      <tr key={b.id}>
        {/* La séance mène à son rapport : la seule page qui dise sur QUOI le
            lecteur a buté, produite à la demande en reprenant le PDF. */}
        <td className="mono">
          <Link href={`/desk/bulletins/${b.sessionDate}`}>{b.sessionDate}</Link>
        </td>
        <td className="mono">{b.number || "—"}</td>
        <td>
          <span className={`st ${b.status === "ok" ? "confirmee" : b.status === "partiel" ? "recue" : "annulee"}`}>{t(b.status)}</span>
        </td>
        <td className="r num">{b.counts?.equities ?? 0}</td>
        <td className="r num">{b.counts?.bonds ?? 0}</td>
        <td className="r num">{b.counts?.funds ?? 0}</td>
        {/* Les lettres, et le compte en exposant : une ligne manquée et soixante
            ne sont pas le même dégât, et la pastille seule les confondait. */}
        <td>
          {cs.length ? (
            <span className={styles.codes}>
              {cs.map((c) => {
                const f = famille(c);
                return (
                  <span key={c} className={`${styles.code} ${f?.genre === "anomalie" ? styles.codeA : styles.codeW}`} title={`${c} — ${f?.libelle ?? ""} · ${f?.quoiFaire ?? ""}`}>
                    {c}
                    {n[c] > 1 ? <sup>{n[c]}</sup> : null}
                  </span>
                );
              })}
            </span>
          ) : (
            <span className="muted">{t("rien à signaler")}</span>
          )}
        </td>
        <td className="muted">
          {fmtDateTime(b.ingestedAt)} · {b.ingestedBy}
        </td>
        <td className={styles.doc}>
          {b.fileKey ? (
            <a href={`/desk/bulletins/pdf/${b.sessionDate}`} target="_blank" rel="noreferrer">
              {t("PDF")}
            </a>
          ) : null}
          {b.sourceUrl?.startsWith("http") ? (
            <a href={b.sourceUrl} target="_blank" rel="noreferrer">
              {t("lien")}
            </a>
          ) : null}
          {!b.fileKey && !b.sourceUrl?.startsWith("http") ? <span className="muted">—</span> : null}
        </td>
      </tr>
    );
  };

  return (
    <>
      <DeskNav current="/desk/bulletins" />

      <div className={styles.head}>
        <div>
          <h1>{t("Bulletins de la BVMAC")}</h1>
          <p className="muted">
            {t("Le bulletin officiel de la cote, séance par séance, depuis la première lue. Chaque ligne mène à son document, et porte en lettres ce que le lecteur a dit d'elle.")}
          </p>
        </div>
      </div>

      {/* LA RELECTURE EST ICI, et non sur la page Santé où elle a vécu faute
          d'une page des bulletins. Santé détecte, le domicile répare.

          SA TABLE EST PARTIE le 6 octobre 2026 : elle montrait trente des
          séances en attente, au-dessus d'un tableau qui les montre toutes
          avec leurs codes et ses filtres. La vue « À reprendre » les range
          déjà dans l'ordre de la file. Restent les deux boutons, qui ne sont
          nulle part ailleurs. */}
      {arriere.length > 0 && (
        <section className="panel" id="relire">
          <div className="panel-h">
            <h2>{t("Bulletins de la BVMAC à relire")}</h2>
            <span className="muted">
              {t("{n} séances du bulletin officiel de la cote lues à moitié.", { n: arriere.length })}{" "}
              <Link href={lien({ vue: "reprendre" })}>{t("Les voir dans le tableau")} →</Link>
            </span>
          </div>

          <div className={styles.actions}>
            <Reread action={rereadAction} label={t("Relire {n} séances", { n: String(REREAD_BATCH) })} primary />
            <Reread action={lancerArriereAction} label={t("Confier {k} séances au robot", { k: String(Math.min(ARRIERE_PAR_TOUR, arriere.length)) })} />
          </div>

          {/* DEUX PARAGRAPHES AU LIEU DE CINQ, en petits caractères : un mode
              d'emploi se lit une fois, le tableau se lit tous les jours. Ce
              que les codes et la colonne « Comment » disent maintenant d'un
              coup d'œil n'a plus à être écrit ici. */}
          <p className={styles.mode}>
            {t("Les deux boutons reprennent le PDF des séances les moins récemment reprises et le repassent au lecteur. Chaque cotation retrouvée écrase la sienne ; celles qu'il ne retrouve pas restent en place, donc une relecture ajoute ou corrige et ne retire jamais. Elle ne gagne des cours que le jour où le lecteur progresse : le rapport d'une séance le dit à l'avance, sans rien écrire.")}
          </p>
          <p className={styles.mode}>
            {t("« Relire {n} séances » travaille devant vous, dans le délai d'une action de page. « Confier {k} séances au robot » envoie la suite au robot de lecture, qui dispose de trois cents secondes : il part aussitôt, sans rien afficher, et c'est le compte ci-dessus qui dira où il en est. Son tour s'inscrit comme lancé à la main, donc il n'éteint aucune alarme.", { n: String(REREAD_BATCH), k: String(Math.min(ARRIERE_PAR_TOUR, arriere.length)) })}
          </p>
        </section>
      )}

      <section className="panel">
        <div className="panel-h">
          <h2>{t("{n} séances", { n: liste.length })}</h2>
          <span className="muted">{vue.dit}</span>
        </div>

        {/* LES VUES D'ABORD : un préréglage pose le socle, les filtres l'affinent. */}
        <div className={styles.vues}>
          {VUES.map((v) => (
            <Link key={v.id} href={lien({ vue: v.id === "tout" ? "" : v.id, tri: "", sens: "" })} className={v.id === vue.id ? styles.vueOn : styles.vue}>
              {t(v.nom)}
              <em>{tous.filter(v.ou).length}</em>
            </Link>
          ))}
        </div>

        <div className={styles.filtres}>
          <span className={styles.titreFiltre}>{t("Année")}</span>
          <Link href={lien({ an: "" })} className={an ? undefined : styles.on}>
            {t("toutes")}
          </Link>
          {annees.map((a) => (
            <Link key={a} href={lien({ an: a })} className={an === a ? styles.on : undefined}>
              {a}
            </Link>
          ))}
        </div>
        <div className={styles.filtres}>
          <span className={styles.titreFiltre}>{t("État")}</span>
          <Link href={lien({ etat: "" })} className={etat ? undefined : styles.on}>
            {t("tous")}
          </Link>
          {etats.map((e) => (
            <Link key={e} href={lien({ etat: e })} className={etat === e ? styles.on : undefined}>
              {t(e)}
            </Link>
          ))}
          <span className={styles.titreFiltre} style={{ marginLeft: "var(--s-7)" }}>{t("Grouper")}</span>
          <Link href={lien({ grp: "" })} className={grp ? undefined : styles.on}>
            {t("non")}
          </Link>
          {([["an", "par année"], ["mois", "par mois"], ["etat", "par état"], ["nb", "par nombre de codes"]] as const).map(([g, nom]) => (
            <Link key={g} href={lien({ grp: g })} className={grp === g ? styles.on : undefined}>
              {t(nom)}
            </Link>
          ))}
        </div>

        <div className={styles.avecMatrice}>
          <div>
            <TallTable total={liste.length}>
              <table className="tbl">
                <thead>
                  <tr>
                    {enTete("d", t("Séance"))}
                    {enTete("n", "N°")}
                    {enTete("s", t("État"))}
                    {enTete("a", t("Act."), true)}
                    {enTete("o", t("Obl."), true)}
                    {enTete("v", t("OPCVM"), true)}
                    {enTete("c", t("Comment"))}
                    {enTete("r", t("Lu le"))}
                    <th>{t("Document")}</th>
                  </tr>
                </thead>
                <tbody>
                  {grp
                    ? [...paquets].map(([k, xs]) => (
                        <Fragment key={k}>
                          <tr className={styles.groupe}>
                            <td colSpan={9}>
                              {k} <span>{t("{n} séances", { n: xs.length })}</span>
                            </td>
                          </tr>
                          {xs.map(rangee)}
                        </Fragment>
                      ))
                    : liste.map(rangee)}
                  {liste.length === 0 && (
                    <tr>
                      <td colSpan={9} className="muted">
                        {t("Aucune séance ne répond à ces filtres.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TallTable>
          </div>

          {/* LA MATRICE EST LA LÉGENDE ET LE FILTRE. Deux objets séparés auraient
              demandé de retenir la lettre en passant de l'un à l'autre. */}
          <aside className={styles.matrice}>
            <div className={styles.titreFiltre}>{t("Matrice des codes")}</div>
            {FAMILLES.map((f) => (
              <Link key={f.code} href={bascule(f.code)} className={retenus.includes(f.code) ? styles.mrowOn : styles.mrow} title={f.quoiFaire}>
                <span className={`${styles.code} ${f.genre === "anomalie" ? styles.codeA : styles.codeW}`}>{f.code}</span>
                <span>
                  <b>{t(f.libelle)}</b>
                  <small>{bornes[f.code] ? (bornes[f.code][0] === bornes[f.code][1] ? bornes[f.code][0] : `${bornes[f.code][0]} → ${bornes[f.code][1]}`) : t("absent de la sélection")}</small>
                </span>
                <em>{compte[f.code] ?? 0}</em>
              </Link>
            ))}
            <p className={styles.notule}>
              {t("Le nombre compte les séances portant le code, pas les remarques : une seule séance peut porter soixante lignes d'obligation non reconnues, et l'exposant de la pastille le dit.")}
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
