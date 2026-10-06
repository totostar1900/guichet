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
        <td className="mono">{b.sessionDate}</td>
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
          d'une page des bulletins. Santé détecte, le domicile répare : son
          contrôle « Bulletins à relire » compte les séances et mène ici. */}
      {arriere.length > 0 && (
        <section className="panel" id="relire">
          <div className="panel-h">
            {/* LE TITRE NOMME SA SOURCE. « Bulletins » tout court laissait
                trois lectures possibles sur cette page : le bulletin de la cote,
                les avis d'emission de la BEAC, les rapports hebdomadaires. */}
            <h2>{t("Bulletins de la BVMAC à relire")}</h2>
            <span className="muted">
              {t("{n} séances du bulletin officiel de la cote (BOC) lues à moitié : le lecteur les a marquées au moment même, elles attendent une relecture.", { n: arriere.length })}
            </span>
          </div>
          <p className={styles.p}>
            {t("« Relire » reprend le PDF de la séance à l'adresse gardée avec elle et le repasse au lecteur d'aujourd'hui. Chaque cotation retrouvée écrase celle de la même ligne pour la même séance ; celles qu'il ne retrouve pas restent en place, donc une relecture ajoute ou corrige et ne retire jamais. Le geste se répète sans risque : une séance ne gagne des cours que le jour où le lecteur progresse. Une séance sans cours d'action fausse la lecture de l'indice, c'est elle qu'il faut reprendre en premier.")}
          </p>
          {/* POURQUOI SIX, ET NON TOUT. La question se pose devant le bouton, donc
              la reponse vit a cote de lui. Quatre secondes par bulletin, mesurees :
              une action de page doit repondre dans le delai de la fonction, et la
              serie entiere se compte en dizaines de minutes. */}
          <p className={styles.p}>
            {t("Une passe reprend {n} séances, les moins récemment reprises de la liste : la file tourne, et une séance qui ne s'améliore pas ne bloque plus les autres. {n} et non toutes, parce qu'un bulletin demande environ quatre secondes et qu'un bouton de page doit répondre avant le délai de la fonction.", { n: String(REREAD_BATCH) })}
          </p>
          {/* DEUX GESTES, ET ILS NE SE RESSEMBLENT PAS. Le premier travaille
              devant vous et dit ce qu'il a changé ; le second part et ne revient
              pas, c'est le compte en attente qui répondra. */}
          <p className={styles.p}>
            {t("« Confier au robot » ne fait pas le travail ici : il envoie la liste au robot de lecture, qui dispose de trois cents secondes par tour là où un bouton de page n'en a que quelques-unes. Il part avec {k} séances et rend la main aussitôt, sans rien afficher de plus. Revenez sur cette page dans quelques minutes : c'est le nombre de séances en attente, en tête de ce cadre, qui dira où il en est. Le tour s'inscrit au registre des robots comme un tour lancé à la main, donc il n'éteint aucune alarme.", { k: String(ARRIERE_PAR_TOUR) })}
          </p>
          {/* DEUX MOTS QUI NE SE DEVINENT PAS. Ils sortent du lecteur et
              designent deux pannes qui ne se reparent pas pareil : l'une laisse
              la seance a moitie en base, l'autre n'y laisse rien. */}
          <p className={styles.p}>
            {t("« partiel » : le bulletin a été lu, et le contrôle a relevé quelque chose. Une section plus courte que la veille, un cours hors de ses seuils, une ligne présente hier et absente aujourd'hui. Ce qui a été lu est en base, le reste manque.")}
            <br />
            {t("« échec » : l'en-tête du PDF n'a pas été reconnu, donc le numéro du bulletin non plus. Aucun cours de cette séance n'est entré : elle est entièrement à reprendre.")}
          </p>
          {/* CE QUE DEVIENT LA LIGNE. On regarde un tableau d'attente sans
              savoir ce qui fait sortir d'une file : la reponse tient en deux
              phrases, et sans elles on reclique sur la meme seance. */}
          <p className={styles.p}>
            {t("Après la passe, une séance qui repasse en « ok » quitte ce tableau : elle rejoint les bulletins ordinaires, ses cours alimentent l'indice et les fiches comme les autres. Une séance qui n'a rien gagné reste ici, et passe en queue de file : la liste tourne, et les suivantes sont servies avant qu'on ne revienne sur elle.")}
          </p>
          <div className={styles.actions}>
            <Reread action={rereadAction} label={t("Relire {n} séances", { n: String(REREAD_BATCH) })} primary />
            <Reread action={lancerArriereAction} label={t("Confier {k} séances au robot", { k: String(Math.min(ARRIERE_PAR_TOUR, arriere.length)) })} />
            <Link className="btn sm ghost" href="/desk/marche">
              {t("Marché")} →
            </Link>
          </div>
          <div className="scroll-x">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Séance")}</th>
                  <th>N°</th>
                  <th>{t("État")}</th>
                  <th className="r">{t("Actions")}</th>
                  <th>{t("Ce que le lecteur a dit")}</th>
                  <th>{t("Source")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {arriere.slice(0, 30).map((b) => (
                  <tr key={b.id}>
                    <td className="mono">{b.sessionDate}</td>
                    <td className="mono">{b.number}</td>
                    <td>
                      <span className={`st ${b.status === "partiel" ? "recue" : "annulee"}`}>{t(b.status)}</span>
                    </td>
                    <td className="r num">{b.counts?.equities ?? 0}</td>
                    <td className="muted">{(b.anomalies[0] ?? b.warnings[0] ?? "—").slice(0, 90)}</td>
                    {/* Le document que le lecteur a lu : sans lui, verifier une
                        anomalie voulait dire retrouver la seance a la main sur
                        le site de la bourse. */}
                    <td>
                      {b.sourceUrl?.startsWith("http") ? (
                        <a href={b.sourceUrl} target="_blank" rel="noreferrer">
                          {t("PDF")}
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="r">
                      <Reread action={rereadAction} label={t("Relire")} date={b.sessionDate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {arriere.length > 30 && (
            <p className="muted">{t("… et {n} autres, reprises {k} par {k}.", { n: arriere.length - 30, k: String(REREAD_BATCH) })}</p>
          )}
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
