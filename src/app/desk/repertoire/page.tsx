import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { repo } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { getT } from "@/i18n/server";
import { tenuesDeTous } from "@/lib/desk/tenue-data";
import { activitesDeTous } from "@/lib/desk/activite-data";
import { cohortesDeTous } from "@/lib/desk/cohortes-data";
import { COHORTES, COHORTE_LABEL, COHORTE_QUOI, estCohorte } from "@/lib/domain/cohortes";
import type { Activite } from "@/lib/domain/activite";
import { CRAN_LABEL, type Tenue } from "@/lib/domain/tenue";
import { cadencesDeTous } from "@/lib/desk/cadence-data";
import { Cadence } from "@/components/Cadence";
import type { Cadence as Chiffres } from "@/lib/domain/cadence";
import { GESTES } from "@/lib/domain/journal-client";
import { parsePeopleQuery, peopleMatch } from "@/lib/search/people";
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

/**
 * DEUX VUES DU MÊME RÉPERTOIRE, ET LA RAISON EST DE LARGEUR.
 *
 * La maquette du 10 octobre 2026 dessinait sept colonnes, dont la cadence sur
 * douze mois, les actions sur trente jours et la dernière action. L'écran en
 * portait neuf, les cinq dernières venant du répertoire d'avant. Les seize
 * ensemble ne tiennent à aucune largeur lisible, et c'est pour cela que le lot
 * avait été greffé en perdant son dessin.
 *
 * Un seul tableau, deux préréglages, comme le dépôt des bulletins : la vue
 * « dossier » garde les colonnes d'aujourd'hui, la vue « activité » porte
 * celles de la maquette. Rien n'est supprimé, et chaque vue est lisible.
 */
const VUES = ["dossier", "activite"] as const;
type Vue = (typeof VUES)[number];
const estVue = (v?: string): v is Vue => !!v && (VUES as readonly string[]).includes(v);

export default async function RepertoirePage({ searchParams }: { searchParams: Promise<{ q?: string; palier?: string; canal?: string; cohorte?: string; vue?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const r = repo();
  const [contacts, files, intents, tenues] = await Promise.all([r.listContacts(), r.listClientFiles().catch(() => []), r.listIntents().catch(() => []), tenuesDeTous().catch(() => new Map())]);
  const activites = await activitesDeTous().catch(() => new Map());
  const cohortes = await cohortesDeTous().catch(() => ({ parClient: new Map<string, string>(), comptes: {} as Record<string, number>, bareme: 0 }));
  const vue: Vue = estVue(sp.vue) ? sp.vue : "dossier";
  /* On ne lit le registre des gestes que si la vue le montre : il grossit de
     plusieurs milliers de lignes par mois, et la vue « dossier » n'en a pas
     besoin. */
  const cadences = vue === "activite" ? await cadencesDeTous().catch(() => new Map()) : new Map();
  const withFile = new Set(files.map((f) => f.userId));
  const ordered = new Map<string, number>();
  for (const i of intents) if (i.clientId) ordered.set(i.clientId, (ordered.get(i.clientId) ?? 0) + 1);

  const q = (sp.q ?? "").trim();
  // La même recherche que la colonne des Dossiers, aux mots-clefs près : les
  // accents et la casse ne comptent pas, chaque mot tapé doit répondre, un
  // numéro se cherche par ses chiffres. « palier:2 dossier:non » est la
  // question qu'aucune pastille seule ne pose.
  const asked = parsePeopleQuery(q);
  const rows = contacts
    .filter((c) =>
      peopleMatch(
        { words: [c.name, c.email, c.segment], phone: c.phone, tier: c.tier ?? 1, whatsapp: c.whatsappOptIn, email: c.emailOptIn, file: withFile.has(c.id), orders: ordered.get(c.id) ?? 0 },
        asked,
      ),
    )
    .filter((c) => !estCohorte(sp.cohorte) || cohortes.parClient.get(c.id) === sp.cohorte)
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
        <input name="q" defaultValue={sp.q} placeholder={t("Un nom, une adresse, un numéro")} aria-label={t("Chercher")} title={t("Deux mots se cumulent · un numéro se cherche par ses chiffres · palier:2 · canal:email · dossier:non · ordres:oui")} />
        {sp.palier && <input type="hidden" name="palier" value={sp.palier} />}
        {sp.canal && <input type="hidden" name="canal" value={sp.canal} />}
        {sp.cohorte && <input type="hidden" name="cohorte" value={sp.cohorte} />}
        {/* Chercher ne doit pas renvoyer à l'autre vue : le formulaire emporte
            la vue courante comme il emporte les autres filtres. */}
        {vue !== "dossier" && <input type="hidden" name="vue" value={vue} />}
        <button className="btn sm" type="submit">
          {t("Chercher")}
        </button>
        <span className={styles.spacer} />
        {/* LES DEUX VUES, ET ELLES GARDENT LES FILTRES. Changer de vue en
            perdant sa recherche ferait recommencer à chaque aller-retour : le
            lien reprend donc tout ce qui est posé, et ne change que « vue ».
            C'est l'idiome du dépôt des bulletins, où le même tableau se lit
            sous plusieurs préréglages. */}
        {VUES.map((v) => {
          const params = new URLSearchParams();
          if (sp.q) params.set("q", sp.q);
          if (sp.palier) params.set("palier", sp.palier);
          if (sp.canal) params.set("canal", sp.canal);
          if (sp.cohorte) params.set("cohorte", sp.cohorte);
          if (v !== "dossier") params.set("vue", v);
          const qs = params.toString();
          return (
            <Link key={v} className={`btn sm ${vue === v ? "" : "ghost"}`} href={qs ? `/desk/repertoire?${qs}` : "/desk/repertoire"} aria-current={vue === v ? "page" : undefined}>
              {v === "dossier" ? t("Dossier") : t("Activité")}
            </Link>
          );
        })}
        <span className={styles.spacer} />
        {[0, 1, 2].map((n) => chip("palier", String(n), t(TIER[n].label)))}
        {chip("canal", "whatsapp", t("WhatsApp ✓"))}
        {chip("canal", "email", t("E-mail ✓"))}
        {chip("canal", "aucun", t("Sans consentement"))}
        {/* Une cohorte se regarde avant de lui écrire : le groupe porte son
            compte, et l'écran dit ce qui le définit. */}
        {COHORTES.map((co) => (
          <Link
            key={co}
            className={`btn sm ${sp.cohorte === co ? "" : "ghost"}`}
            title={t(COHORTE_QUOI[co])}
            href={sp.cohorte === co ? (vue === "dossier" ? "/desk/repertoire" : `/desk/repertoire?vue=${vue}`) : `/desk/repertoire?cohorte=${co}${vue === "dossier" ? "" : `&vue=${vue}`}`}
          >
            {t(COHORTE_LABEL[co])} <span className="muted">{cohortes.comptes[co] ?? 0}</span>
          </Link>
        ))}
        {(sp.q || sp.palier || sp.canal || sp.cohorte) && (
          <Link className={styles.clear} href="/desk/repertoire">
            {t("Tout voir")}
          </Link>
        )}
      </form>
      {/* Ce que le champ sait faire, écrit une fois sous lui : un mot-clef
          qu'on ignore ne sert à personne, et un mot-clef mal écrit rendrait
          zéro ligne sans dire pourquoi. */}
      <p className={styles.hint}>
        {t("Deux mots se cumulent · un numéro se cherche par ses chiffres · palier:2 · canal:email · dossier:non · ordres:oui")}
        {asked.unknown.length > 0 && (
          <b className={styles.hintWarn}> · {t("non compris : {mots}", { mots: asked.unknown.join(" ") })}</b>
        )}
      </p>

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
                <th>{t("Tenue")}</th>
                <th className="r">{t("Activité")}</th>
                {vue === "activite" ? (
                  <>
                    {/* LES TROIS COLONNES DE LA MAQUETTE. La cadence dit le
                        SENS, « Actions 30 j » dit la TAILLE que les barres
                        mises à l'échelle de chaque ligne ne disent pas, et la
                        dernière action dit DEPUIS QUAND. Les trois ensemble se
                        lisent d'un coup d'œil ; chacune seule trompe. */}
                    <th>{t("Cadence, 12 mois")}</th>
                    <th className="r">{t("Actions 30 j")}</th>
                    <th>{t("Dernière action")}</th>
                  </>
                ) : (
                  <>
                    <th>{t("Coordonnées")}</th>
                    <th>{t("Informations")}</th>
                    <th className="r">{t("Ordres")}</th>
                    <th>{t("Dossier")}</th>
                    <th>{t("Depuis")}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="who">
                    {c.name}
                    {/* La marque suit le nom partout où une personne pourrait
                        prendre un compte d'essai pour un client. */}
                    {c.demo && <span className="st" title={t("Compte de démonstration : écarté du reporting réglementaire.")}>{t("démo")}</span>}
                    <small className="muted">{c.segment || "—"}</small>
                  </td>
                  <td>
                    <span className={`st ${c.tier === 2 ? "reglee" : c.tier === 0 ? "annulee" : "recue"}`} title={t(TIER[c.tier ?? 1].hint)}>
                      {t(TIER[c.tier ?? 1].label)}
                    </span>
                  </td>
                  {/* LA TENUE PORTE SA RAISON, OU ELLE N'EST QU'UNE ÉTIQUETTE.
                      Un cran seul se lit comme un jugement de machine ; avec
                      le manquement le plus grave écrit dessous, c'est un
                      constat qu'on peut aller vérifier. */}
                  <td>
                    {(() => {
                      const ten = (tenues as Map<string, Tenue>).get(c.id);
                      if (!ten) return <span className="muted">—</span>;
                      const pire = ten.manquements[0];
                      return (
                        <>
                          <span className={`st ${ten.cran === "en_defaut" ? "annulee" : ten.cran === "a_surveiller" ? "recue" : "reglee"}`}>{t(CRAN_LABEL[ten.cran])}</span>
                          {pire && (
                            <>
                              <br />
                              <small className="muted">{t(pire.phrase, pire.vars)}</small>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  {/* Le score cite son barème : sans cela, deux chiffres pris
                      à deux mois d'intervalle ne se compareraient pas. */}
                  <td className="r num">
                    {(() => {
                      const a = (activites as Map<string, Activite>).get(c.id);
                      if (!a) return <span className="muted">—</span>;
                      return (
                        <>
                          {a.score}
                          <br />
                          <small className="muted">v{a.bareme}</small>
                        </>
                      );
                    })()}
                  </td>
                  {vue === "activite" ? (
                    (() => {
                      const cad = (cadences as Map<string, Chiffres>).get(c.id);
                      return (
                        <>
                          <td>{cad ? <Cadence c={cad} titre={c.name} /> : <span className="muted">—</span>}</td>
                          <td className="r num">{cad ? cad.recents : <span className="muted">—</span>}</td>
                          <td>
                            {cad?.dernier ? (
                              <>
                                {cad.dernier.jours === 0 ? t("aujourd'hui") : t("il y a {n} j", { n: cad.dernier.jours })}
                                <br />
                                {/* LE GESTE SE DIT EN MOTS, pas par sa clef :
                                    « ordre.depose » n'est pas une phrase, et le
                                    catalogue porte déjà la tournure du desk. */}
                                <small className="muted">{t(GESTES[cad.dernier.geste]?.auDesk ?? cad.dernier.geste)}</small>
                              </>
                            ) : (
                              <span className="muted">{t("aucun geste")}</span>
                            )}
                          </td>
                        </>
                      );
                    })()
                  ) : (
                    <>
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
                    </>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={vue === "activite" ? 7 : 9} className="muted">
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
