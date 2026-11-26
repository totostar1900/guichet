import Link from "next/link";
import { DeskNav } from "@/components/DeskNav";
import { requireResponsable } from "@/lib/auth";
import { repo } from "@/lib/data";
import { loadRegistry } from "@/lib/reference";
import { loadBaremeClient } from "@/lib/policy";
import { chargerLeCommissionnement, dusDuMois, moisRecents } from "@/lib/commissionnement-donnees";
import { enVigueur } from "@/lib/domain/frais";
import { RECU_KIND, cleDuRecu, type RecuDeTiers } from "@/lib/domain/retrocession";
import {
  CONDITIONS_VIDES,
  ETATS_DU_RELEVE,
  LIBELLE_DE_L_ETAT,
  cleDuReleve,
  conditionsAu,
  duParSociete,
  ecartsDuTableau,
  etatsSuivants,
  moisFige,
  societeAu,
  type ConditionsDeFonds,
  type FondsCommissionne,
} from "@/lib/domain/commissionnement";
import { getT } from "@/i18n/server";
import { fmt, fmtDate, fmtPct, localIso } from "@/lib/format";
import { EtatDuReleveForm, FormulaireDeFonds, type ValeursDeConditions } from "./Formulaires";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Commissionnement" };

/**
 * LE COMMISSIONNEMENT : LE TABLEAU DE LA DIRECTION (25 novembre 2026, planche « Deux tableaux : la tarification client et le commissionnement interne », 1A · 2C · 3B · 4B et 4C · 5B · 6B · 7B).
 *
 * Ce que chaque fonds verse à la maison, fonds par fonds, regroupé par société de gestion. LA DIRECTION SEULE le lit et le modifie (`requireResponsable`) ; rien ne s'en lit du côté client.
 * Quatre onglets : les conditions (la grille, éditable, avec son aperçu d'impact), le dû du mois (transactions et encours), les relevés par société (leur cycle, leur export), et le simulateur.
 * Un bandeau d'écarts dit d'un regard ce qui ne va pas : un fonds distribué sans conditions, une case vide, un accord qui échoit, une marge négative.
 */
type Onglet = "conditions" | "du" | "releves" | "simulateur";
const ONGLETS: { cle: Onglet; libelle: string }[] = [
  { cle: "conditions", libelle: "Conditions" },
  { cle: "du", libelle: "Dû du mois" },
  { cle: "releves", libelle: "Relevés" },
  { cle: "simulateur", libelle: "Simulateur" },
];

const texte = (n: number, ou = ""): string => (n > 0 ? String(n) : ou);
const valeursDe = (c: ConditionsDeFonds, f?: FondsCommissionne): ValeursDeConditions => ({
  sousPct: texte(c.souscription.pct, "0"),
  sousPart: texte(c.souscription.partDesDroitsPct),
  sousMin: texte(c.souscription.min),
  sousMax: texte(c.souscription.max),
  rachPct: texte(c.rachat.pct, "0"),
  rachPart: texte(c.rachat.partDesDroitsPct),
  rachMin: texte(c.rachat.min),
  rachMax: texte(c.rachat.max),
  encPct: texte(c.encours.pct, "0"),
  encMin: texte(c.encours.min),
  encMax: texte(c.encours.max),
  accordRef: f?.accord?.ref ?? "",
  echeanceLe: f?.accord?.echeanceLe ?? "",
  delai: f?.accord?.delaiDePaiementJours ? String(f.accord.delaiDePaiementJours) : "",
});

export default async function CommissionnementPage({ searchParams }: { searchParams: Promise<{ v?: string; m?: string; f?: string }> }) {
  await requireResponsable("/desk/commissionnement");
  await loadRegistry();
  const t = await getT();
  const sp = await searchParams;
  const onglet: Onglet = ONGLETS.some((o) => o.cle === sp.v) ? (sp.v as Onglet) : "conditions";
  const r = repo();
  const [offres, intents, c, bareme, recusRows] = await Promise.all([r.listOffers(), r.listIntents(), chargerLeCommissionnement(), loadBaremeClient(), r.listPrive(RECU_KIND)]);
  const fondsDuGuichet = offres.filter((o) => o.kind === "FONDS" && o.fund);
  const jour = localIso(new Date());
  const mois = moisRecents(4);
  const choisi = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : mois[0];
  const recus = new Map(recusRows.map((x) => [x.key, x.data as RecuDeTiers]));
  const nomDeSociete = (code?: string): string => (code && c.societes.get(code)?.nom) || t("Sans société");

  /* LE BANDEAU D'ÉCARTS (4B). Le prix total du client par fonds : les droits du fonds, plus la règle de la maison quand elle est en vigueur. */
  const clientTotal = (offerId: string, op: "souscription" | "rachat"): number | undefined => {
    const o = fondsDuGuichet.find((x) => x.id === offerId);
    if (!o?.fund) return undefined;
    const regle = bareme[op === "souscription" ? "fonds.souscription" : "fonds.rachat"];
    return (op === "souscription" ? o.fund.entryFeePct : o.fund.exitFeePct) + (enVigueur(regle, jour) ? regle.clientPct : 0);
  };
  const droitsPct = (offerId: string, op: "souscription" | "rachat"): number => {
    const o = fondsDuGuichet.find((x) => x.id === offerId);
    return (op === "souscription" ? o?.fund?.entryFeePct : o?.fund?.exitFeePct) ?? 0;
  };
  const connus = fondsDuGuichet.map((o) => ({ offerId: o.id, titre: o.title, distribue: Boolean(o.fund?.distributed), ordresRegles: intents.filter((i) => i.offerId === o.id && i.state === "reglee").length }));
  const ecarts = ecartsDuTableau([...c.fonds.values()], connus, jour, clientTotal, droitsPct);

  const hrefOnglet = (v: Onglet) => `/desk/commissionnement?v=${v}${v === "du" || v === "releves" ? `&m=${choisi}` : ""}`;
  const societesConnues = [...c.societes.values()].map((s) => s.nom);

  return (
    <>
      <DeskNav current="/desk/commissionnement" />
      <div className={styles.page}>
        <header className={styles.head}>
          <h1>{t("Commissionnement")}</h1>
          <p className="muted">
            {t("Ce que chaque fonds verse à la maison, fonds par fonds, regroupé par société de gestion. La direction seule le lit et le modifie : rien de cette page n'est lu par le client, et le journal d'audit ne porte jamais un taux.")}
          </p>
        </header>

        {ecarts.length > 0 ? (
          <div className={styles.bandeau} role="status">
            {ecarts.map((e, i) => (
              <span key={`${e.code}-${i}`} className={`${styles.alerte} ${e.genre === "negatif" || e.genre === "sans_accord" ? styles.alerteRouge : ""}`}>
                {t(e.phrase)}
              </span>
            ))}
          </div>
        ) : (
          <p className={styles.note}>{t("Aucun écart : chaque fonds distribué a ses conditions, et rien n'échoit dans les soixante jours.")}</p>
        )}

        <nav className={styles.onglets} aria-label={t("Commissionnement")}>
          {ONGLETS.map((o) => (
            <Link key={o.cle} href={hrefOnglet(o.cle)} className={o.cle === onglet ? styles.actif : undefined}>
              {t(o.libelle)}
            </Link>
          ))}
        </nav>

        {onglet === "conditions" && (
          <>
            {[...new Set([...fondsDuGuichet.map((o) => societeAu(c.fonds.get(o.id) ?? { code: "", offerId: "", rattachements: [], versions: [] }, jour) ?? ""), ...c.societes.keys()])]
              .sort((a, b) => nomDeSociete(a).localeCompare(nomDeSociete(b), "fr"))
              .map((code) => {
                const lignes = fondsDuGuichet.filter((o) => (societeAu(c.fonds.get(o.id) ?? { code: "", offerId: "", rattachements: [], versions: [] }, jour) ?? "") === code);
                if (lignes.length === 0) return null;
                return (
                  <section key={code || "aucune"} className="panel">
                    <div className="panel-h">
                      <h2>{code ? c.societes.get(code)?.nom : t("Fonds sans conditions posées")}</h2>
                      <span className={styles.code}>{code || "—"}</span>
                    </div>
                    <div className={styles.large}>
                      <table className={styles.tableau}>
                        <thead>
                          <tr>
                            <th>{t("Fonds")}</th>
                            <th>{t("Code")}</th>
                            <th className={styles.r}>{t("Souscription")}</th>
                            <th className={styles.r}>{t("Rachat")}</th>
                            <th className={styles.r}>{t("Encours / an")}</th>
                            <th>{t("Départ")}</th>
                            <th>{t("Accord")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lignes.map((o) => {
                            const f = c.fonds.get(o.id);
                            const v = f ? conditionsAu(f, jour) : undefined;
                            const dit = (pct: number, part: number) => [pct > 0 ? fmtPct(pct, 2) : "", part > 0 ? t("{p} % des droits", { p: String(part) }) : ""].filter(Boolean).join(" + ");
                            const prochaine = f?.versions.find((x) => x.effetLe > jour);
                            return (
                              <tr key={o.id}>
                                <td>
                                  <details className={styles.fiche}>
                                    <summary>{t(o.title)}</summary>
                                    <FormulaireDeFonds
                                      offerId={o.id}
                                      societe={code ? (c.societes.get(code)?.nom ?? "") : (o.fund?.manager ?? "")}
                                      societes={societesConnues}
                                      valeurs={valeursDe(v ?? CONDITIONS_VIDES, f)}
                                      aujourdHui={jour}
                                      aDesSoeurs={Boolean(code) && lignes.length > 1}
                                    />
                                  </details>
                                </td>
                                <td className={styles.code}>{f?.code ?? "—"}</td>
                                <td className={`${styles.r} ${v && !dit(v.souscription.pct, v.souscription.partDesDroitsPct) ? styles.trou : ""}`}>{v ? dit(v.souscription.pct, v.souscription.partDesDroitsPct) || t("vide") : <span className={styles.vide}>—</span>}</td>
                                <td className={`${styles.r} ${v && !dit(v.rachat.pct, v.rachat.partDesDroitsPct) ? styles.trou : ""}`}>{v ? dit(v.rachat.pct, v.rachat.partDesDroitsPct) || t("vide") : <span className={styles.vide}>—</span>}</td>
                                <td className={`${styles.r} ${v && v.encours.pct <= 0 ? styles.trou : ""}`}>{v ? (v.encours.pct > 0 ? fmtPct(v.encours.pct, 2) : t("vide")) : <span className={styles.vide}>—</span>}</td>
                                <td>{v ? fmtDate(v.effetLe) : <span className={styles.vide}>{t("non posé")}</span>}{prochaine ? ` · ${t("puis le {d}", { d: fmtDate(prochaine.effetLe) })}` : ""}</td>
                                <td>{f?.accord?.ref ?? <span className={styles.vide}>—</span>}{f?.accord?.echeanceLe ? ` · ${t("échoit le {d}", { d: fmtDate(f.accord.echeanceLe) })}` : ""}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                );
              })}
            <p className={styles.note}>
              {t("Un clic sur un fonds ouvre ses conditions. Chaque enregistrement pose une version datée, avec son motif : le passé n'est jamais réécrit, et un mois dont le relevé est parti est figé. Colonnes adjudications et titres cotés : prévues, masquées pour l'instant.")}
            </p>
          </>
        )}

        {(onglet === "du" || onglet === "releves") && (
          <>
            <nav className={styles.onglets} aria-label={t("Mois")}>
              {mois.map((m) => (
                <Link key={m} href={`/desk/commissionnement?v=${onglet}&m=${m}`} className={m === choisi ? styles.actif : undefined}>
                  {m}
                </Link>
              ))}
            </nav>
            <DuDuMoisVue mois={choisi} onglet={onglet} c={c} recus={recus} t={t} />
          </>
        )}

        {onglet === "simulateur" && (
          <>
            <p className={styles.note}>{t("Changez un taux sans rien appliquer : le simulateur rejoue les six derniers mois avec ces conditions, et projette douze mois à volumes constants. C'est une estimation.")}</p>
            <nav className={styles.onglets} aria-label={t("Fonds")}>
              {fondsDuGuichet.map((o) => (
                <Link key={o.id} href={`/desk/commissionnement?v=simulateur&f=${o.id}`} className={(sp.f ?? fondsDuGuichet[0]?.id) === o.id ? styles.actif : undefined}>
                  {t(o.title)}
                </Link>
              ))}
            </nav>
            {fondsDuGuichet
              .filter((o) => o.id === (sp.f ?? fondsDuGuichet[0]?.id))
              .map((o) => {
                const f = c.fonds.get(o.id);
                const v = f ? conditionsAu(f, jour) : undefined;
                return <FormulaireDeFonds key={o.id} offerId={o.id} societe="" societes={[]} valeurs={valeursDe(v ?? CONDITIONS_VIDES, f)} aujourdHui={jour} simulateurSeul />;
              })}
            {fondsDuGuichet.length === 0 && <p className={styles.note}>{t("Aucun fonds au Guichet.")}</p>}
          </>
        )}
      </div>
    </>
  );
}

/** Le dû d'un mois, par société puis par fonds : l'onglet « Dû du mois » et celui des relevés partagent le même calcul. */
async function DuDuMoisVue({ mois, onglet, c, recus, t }: { mois: string; onglet: Onglet; c: Awaited<ReturnType<typeof chargerLeCommissionnement>>; recus: Map<string, RecuDeTiers>; t: Awaited<ReturnType<typeof getT>> }) {
  const dus = await dusDuMois(mois, c);
  const parSociete = duParSociete(dus.map((d) => ({ code: d.fonds.code, du: d.du })), mois);
  const offreDe = new Map(dus.map((d) => [d.fonds.code, d.offre]));
  const total = dus.reduce((s, d) => s + d.du.total, 0);
  const recu = dus.reduce((s, d) => s + (recus.get(cleDuRecu(d.offre.id, mois))?.montant ?? 0), 0);

  if (dus.length === 0) return <p className={styles.note}>{t("Aucun fonds n'a encore de conditions : posez-les dans l'onglet « Conditions ».")}</p>;
  return (
    <>
      <div className={styles.band}>
        <div>
          <span>{t("Dû")}</span>
          <b>{fmt(total)}</b>
        </div>
        <div>
          <span>{t("Reçu")}</span>
          <b>{fmt(recu)}</b>
        </div>
        <div>
          <span>{t("Solde à réclamer")}</span>
          <b>{fmt(total - recu)}</b>
        </div>
      </div>
      {parSociete.map((s) => {
        const releve = c.releves.get(cleDuReleve(s.societe, mois));
        const figee = moisFige(releve);
        const totalAffiche = figee && releve?.totalFige != null ? releve.totalFige : s.total;
        return (
          <section key={s.societe} className="panel">
            <div className="panel-h">
              <h2>{c.societes.get(s.societe)?.nom ?? t("Sans société")}</h2>
              <span className={styles.code}>{s.societe}</span>
              <span className={styles.etat}>{t(LIBELLE_DE_L_ETAT[releve?.etat ?? "calcule"])}</span>
            </div>
            <div className={styles.pb}>
              <div className={styles.large}>
                <table className={styles.tableau}>
                  <thead>
                    <tr>
                      <th>{t("Fonds")}</th>
                      <th className={styles.r}>{t("Souscriptions")}</th>
                      <th className={styles.r}>{t("Rachats")}</th>
                      <th className={styles.r}>{t("Encours moyen")}</th>
                      <th className={styles.r}>{t("Dû · transactions")}</th>
                      <th className={styles.r}>{t("Dû · encours")}</th>
                      <th className={styles.r}>{t("Total dû")}</th>
                      <th className={styles.r}>{t("Reçu")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.fonds.map(({ code, du }) => {
                      const o = offreDe.get(code)!;
                      const r = recus.get(cleDuRecu(o.id, mois));
                      return (
                        <tr key={code}>
                          <td>
                            {t(o.title)} <span className={styles.code}>{code}</span>
                            {du.ordresSansCondition > 0 && <div className={styles.trou}>{t("{n} ordre(s) sans condition à leur date, comptés zéro", { n: String(du.ordresSansCondition) })}</div>}
                          </td>
                          <td className={styles.r}>{fmt(du.souscriptions)}</td>
                          <td className={styles.r}>{fmt(du.rachats)}</td>
                          <td className={styles.r}>{fmt(du.encoursMoyen)}</td>
                          <td className={styles.r}>{fmt(du.transactions)}</td>
                          <td className={styles.r}>{fmt(du.encours)}</td>
                          <td className={styles.r}>
                            <b>{fmt(du.total)}</b>
                          </td>
                          <td className={styles.r}>{r ? fmt(r.montant) : "—"}</td>
                        </tr>
                      );
                    })}
                    <tr className={styles.total}>
                      <th>{t("Société")}</th>
                      <td colSpan={3} />
                      <td className={styles.r}>{fmt(s.transactions)}</td>
                      <td className={styles.r}>{fmt(s.encours)}</td>
                      <td className={styles.r}>{fmt(totalAffiche)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
              {onglet === "releves" && (
                <>
                  <p className={styles.note}>
                    {figee ? t("Relevé envoyé le {d} : le total est figé à {m} FCFA.", { d: releve?.envoyeLe ? fmtDate(releve.envoyeLe) : "", m: fmt(releve?.totalFige ?? 0) }) : t("Relevé calculé, pas encore envoyé : le total suit les ordres jusqu'à l'envoi.")}
                    {releve?.echeanceLe ? ` ${t("À payer avant le {d}.", { d: fmtDate(releve.echeanceLe) })}` : ""}
                  </p>
                  <div className={styles.pied}>
                    <a className="btn" href={`/desk/commissionnement/export?m=${mois}&societe=${s.societe}`}>
                      {t("Exporter (Excel)")}
                    </a>
                    <EtatDuReleveForm societe={s.societe} mois={mois} suivants={etatsSuivants(releve?.etat ?? "calcule").filter((e) => ETATS_DU_RELEVE.includes(e)).map((e) => ({ etat: e, libelle: LIBELLE_DE_L_ETAT[e] }))} />
                  </div>
                </>
              )}
            </div>
          </section>
        );
      })}
      <p className={styles.note}>
        {t("Le dû se calcule avec les conditions de la date de chaque ordre ; la rétrocession, sur l'encours moyen du mois (parts réglées de nos clients × dernière VL connue), au taux de la fin du mois. Le reçu se saisit dans le rapprochement.")}{" "}
        <Link href={`/desk/frais/rapprochement?m=${mois}`}>{t("Ouvrir le rapprochement")}</Link>
      </p>
    </>
  );
}
