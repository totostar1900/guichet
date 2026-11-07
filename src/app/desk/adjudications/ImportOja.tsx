"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { useDates, useT } from "@/i18n/client";
import { Info } from "@/components/Info";
import { lotDepuis } from "@/lib/market/import-oja";
import { KPI_OJA, type CleKpiOja } from "@/lib/market/oja-kpi";
import { agregerOja, entetesManquants, reconnaitreFichier, type LigneOja, type OjaImport, type TypeFichier } from "@/lib/market/oja";
import type { Source } from "@/lib/market/sources-seance";
import { lireClasseur } from "@/lib/market/xlsx-leger";
import { apercuOjaAction, appliquerOjaAction, exclureImportAction, type ApercuOja } from "./oja-actions";
import styles from "./ImportOja.module.css";

/**
 * L'IMPORT D'UN EXPORT OJA (6 novembre 2026, planche 1A · 2A).
 *
 * Une carte « Dernier import » au-dessus de la liste, un bouton, et un panneau d'aperçu : le fichier est lu ICI, dans le navigateur (8 Mo, 32 870 lignes : trop pour une fonction
 * du serveur, et ses comptes acheteurs n'ont aucune raison de voyager), réduit en séances, puis envoyé. Rien n'est écrit avant « Importer ».
 */

const COLONNES: Record<TypeFichier, string[]> = {
  offres: ["Titre", "Etat", "Type d'opération", "Volume", "Prix ajusté", "Date de confirmation", "Compte du détenteur d'achteur", "Heure de modification"],
  encheres: ["Titre", "Etat", "Montant", "Date de confirmation", "Type d'opération"],
  titres: ["Code", "Valeur nominale", "Terme", "Taux", "Date d'échéance"],
};
/** Le libellé d'un compteur et sa bulle : ce que le chiffre veut dire, quoi faire, à quoi il sert. */
function Kpi({ cle, libelle }: { cle: CleKpiOja; libelle: string }) {
  return (
    <span>
      {libelle} <Info subtle label={KPI_OJA[cle].titre} text={KPI_OJA[cle].texte} />
    </span>
  );
}

const NOM_FICHIER: Record<TypeFichier, string> = { offres: "Toutes les offres", encheres: "Enchères", titres: "Titres" };

const fmtValeur = (champ: string, v?: number): string => {
  if (v == null) return "—";
  if (champ === "announced" || champ === "bid" || champ === "served") return `${(v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} Md`;
  if (champ === "bidders") return String(v);
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} %`;
};

export function ImportOja({ imports }: { imports: OjaImport[] }) {
  const t = useT();
  const { fmtDate } = useDates();
  const router = useRouter();
  const entree = useRef<HTMLInputElement>(null);
  /* Un jeton par lecture : annuler le fait avancer, et une lecture déjà partie ne pose plus rien à l'écran quand elle revient. */
  const jeton = useRef(0);
  const [ouvert, setOuvert] = useState(false);
  const [etat, setEtat] = useState<"repos" | "lecture" | "apercu" | "ecriture" | "fait">("repos");
  const [progres, setProgres] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [lot, setLot] = useState<string>("");
  const [apercu, setApercu] = useState<ApercuOja | null>(null);
  const [fiables, setFiables] = useState(true);
  const [aConfirmer, setAConfirmer] = useState(false);
  const [choix, setChoix] = useState<Record<string, Source>>({});
  const [message, setMessage] = useState("");
  const [rouvrir, setRouvrir] = useState(false);
  const [, demarrer] = useTransition();
  const dernier = imports[0];

  function annuler() {
    jeton.current++;
    setApercu(null);
    setLot("");
    setChoix({});
    setRouvrir(false);
    setErreur(null);
    setProgres("");
    setMessage("");
    setEtat("repos");
    setOuvert(false);
    if (entree.current) entree.current.value = "";
  }

  async function lire(fichiers: FileList) {
    const mien = ++jeton.current;
    const abandonne = () => jeton.current !== mien;
    setErreur(null);
    setApercu(null);
    setEtat("lecture");
    try {
      const lus: Partial<Record<TypeFichier, LigneOja[]>> = {};
      const meta: { type: TypeFichier; nom: string; lignes: number }[] = [];
      for (const f of Array.from(fichiers)) {
        setProgres(t("Lecture de {f}…", { f: f.name }));
        const buf = new Uint8Array(await f.arrayBuffer());
        if (abandonne()) return;
        const tete = await lireClasseur(buf, { seulementEntetes: true });
        if (abandonne()) return;
        const type = reconnaitreFichier(tete.entetes);
        if (!type) throw new Error(t("« {f} » n'est pas un export OJA reconnu (offres, enchères ou titres).", { f: f.name }));
        const manque = entetesManquants(type, tete.entetes);
        if (manque.length) throw new Error(t("« {f} » : colonne(s) manquante(s) : {c}.", { f: f.name, c: manque.join(", ") }));
        if (lus[type]) throw new Error(t("Deux fichiers « {n} » : déposez un seul de chaque.", { n: NOM_FICHIER[type] }));
        const c = await lireClasseur(buf, { colonnes: COLONNES[type], surProgres: (n) => setProgres(t("Lecture de {f} : {n} lignes…", { f: f.name, n })) });
        if (abandonne()) return;
        if (!c.lignes.length) throw new Error(t("« {f} » ne contient aucune ligne.", { f: f.name }));
        lus[type] = c.lignes;
        meta.push({ type, nom: f.name, lignes: c.lignes.length });
      }
      if (!lus.offres) throw new Error(t("Le fichier « Toutes les offres » est exigé : sans lui, rien à calculer."));
      setProgres(t("Calcul des séances…"));
      const rapport = agregerOja({ offres: lus.offres, encheres: lus.encheres, titres: lus.titres });
      const brut = JSON.stringify(lotDepuis(rapport, meta));
      setLot(brut);
      setProgres(t("Comparaison avec le Desk…"));
      const a = await apercuOjaAction(brut);
      if (abandonne()) return;
      if (!a.ok) throw new Error(a.error ?? t("Aperçu impossible."));
      const init: Record<string, Source> = {};
      for (const l of a.ecarts) for (const c of l.champs) init[c.cle] = c.proposition.source;
      setChoix(init);
      setApercu(a);
      setFiables(true);
      setAConfirmer(false);
      setEtat("apercu");
    } catch (e) {
      if (abandonne()) return;
      setErreur(e instanceof Error ? e.message : String(e));
      setEtat("repos");
    } finally {
      if (!abandonne()) {
        setProgres("");
        if (entree.current) entree.current.value = "";
      }
    }
  }

  /** Recalcule l'aperçu avec ou sans les écarts déjà tranchés : le lot garde la case, l'import qui suit la reprend. */
  async function recalculer(v: boolean) {
    setRouvrir(v);
    setErreur(null);
    setProgres(t("Comparaison avec le Desk…"));
    try {
      const brut = JSON.stringify({ ...JSON.parse(lot), rouvrir: v });
      const a = await apercuOjaAction(brut);
      if (!a.ok) throw new Error(a.error ?? t("Aperçu impossible."));
      const init: Record<string, Source> = {};
      for (const l of a.ecarts) for (const x of l.champs) init[x.cle] = x.proposition.source;
      setLot(brut);
      setChoix(init);
      setApercu(a);
    } catch (e) {
      setRouvrir(!v);
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setProgres("");
    }
  }

  function importer(e: React.FormEvent) {
    e.preventDefault();
    setEtat("ecriture");
    demarrer(async () => {
      const r = await appliquerOjaAction(JSON.stringify({ lot: JSON.parse(lot), choix: { nouvellesFiables: fiables, nouvellesAConfirmer: aConfirmer, decisions: choix } }));
      if (!r.ok) {
        setErreur(r.error ?? t("Import impossible."));
        setEtat("apercu");
        return;
      }
      setMessage(r.message ?? "");
      setEtat("fait");
      setApercu(null);
      setLot("");
      router.refresh();
    });
  }

  const c = apercu?.compteurs;
  const aImporter = (fiables ? c?.nouvellesFiables ?? 0 : 0) + (aConfirmer ? c?.nouvellesAConfirmer ?? 0 : 0);

  return (
    <div className={styles.carte}>
      <div className={styles.entete}>
        <b>{t("Dernier import OJA")}</b>
        <button type="button" className="btn sm primary" onClick={() => setOuvert((v) => !v)} aria-expanded={ouvert}>
          {t("Importer un fichier Excel")}
        </button>
      </div>
      {dernier ? (
        <>
          <p className={styles.sous}>
            {fmtDate(dernier.at)} · {dernier.fichiers.map((f) => f.nom).join(" · ")} · {dernier.by}
            {dernier.exclu && <em className={styles.exclu}> · {t("exclu")}</em>}
          </p>
          <div className={styles.chiffres}>
            <div><b>{dernier.nouvelles}</b><Kpi cle="nouvelles" libelle={t("nouvelles séances")} /></div>
            <div><b className={styles.bon}>{dernier.concordantes}</b><Kpi cle="concordantes" libelle={t("concordantes")} /></div>
            <div><b className={dernier.ecarts ? styles.mauvais : undefined}>{dernier.ecarts}</b><Kpi cle="ecarts" libelle={t("écarts")} /></div>
          </div>
          <form action={exclureImportAction} className={styles.ligne}>
            <input type="hidden" name="importId" value={dernier.id} />
            <input type="hidden" name="exclure" value={dernier.exclu ? "0" : "1"} />
            <button type="submit" className="btn sm">{dernier.exclu ? t("Rétablir cet import") : t("Exclure cet import")}</button>
            <span className={styles.aide}>{t("Un import exclu ne compte plus pour les valeurs retenues ni les rapports ; les valeurs du communiqué reviennent.")}</span>
          </form>
        </>
      ) : (
        <p className={styles.sous}>{t("Aucun import. Déposez les exports OJA pour comparer les séances du Desk et combler celles qui manquent.")}</p>
      )}

      {ouvert && (
        <div className={styles.panneau} data-import-ouvert="">
          <label className={styles.depot}>
            <span>{t("Déposez les exports OJA : « Toutes les offres » (exigé), « Enchères » et « Titres » (recommandés).")}</span>
            <input ref={entree} type="file" accept=".xlsx" multiple disabled={etat === "lecture" || etat === "ecriture"} onChange={(e) => e.target.files?.length && lire(e.target.files)} />
          </label>
          {progres && <p className={styles.aide} role="status">{progres}</p>}
          {erreur && <p className={styles.erreur} role="alert">{erreur}</p>}
          {etat === "fait" && <p className={styles.fait} role="status">{message}</p>}

          {apercu && c && (
            <form id="oja-import" onSubmit={importer} className={styles.apercu}>
              <h3>{t("Aperçu de l'import")}</h3>
              <p className={styles.aide}>
                {apercu.fichiers.map((f) => `${f.nom} (${f.lignes})`).join(" · ")}
                {apercu.plage ? ` · ${fmtDate(apercu.plage.du)} → ${fmtDate(apercu.plage.au)}` : ""}
              </p>
              <div className={styles.compteurs}>
                <div><b className={styles.bon}>{c.nouvellesFiables}</b><Kpi cle="nouvellesFiables" libelle={t("nouvelles fiables")} /></div>
                <div><b>{c.nouvellesAConfirmer}</b><Kpi cle="nouvellesAConfirmer" libelle={t("à confirmer (avant 2023)")} /></div>
                <div><b className={c.ecarts ? styles.mauvais : undefined}>{c.ecarts}</b><Kpi cle="ecarts" libelle={t("écarts à trancher")} /></div>
                <div><b>{c.concordantes}</b><Kpi cle="concordantes" libelle={t("concordantes")} /></div>
                <div><b>{c.ignorees}</b><Kpi cle="ignorees" libelle={t("ignorées")} /></div>
              </div>
              {apercu.avertissements.map((a) => <p key={a} className={styles.aide}>⚠ {a}</p>)}
              <p className={styles.aide}>{t("Ignorées : séances du jour, séances rejetées, séances écartées au Desk.")}</p>

              {/* LA CASE EST TOUJOURS LÀ : une fois tous les écarts tranchés, l'aperçu n'en montre plus, et c'est alors qu'on veut pouvoir les rouvrir. */}
              <div className={styles.rouvrir}>
                <label className={styles.case}>
                  <input type="checkbox" checked={rouvrir} onChange={(e) => recalculer(e.target.checked)} />
                  {t("Réexaminer aussi les écarts déjà tranchés")}
                </label>
                <p className={styles.aide}>{t("Rien n'est définitif : un écart se reprend ici, en rechargeant ce lot avec cette case cochée, ou depuis la fiche de la séance.")}</p>
              </div>

              {apercu.ecartsTotal > 0 && (
                <div className={styles.ecarts}>
                  <b>{t("Écarts à trancher")} · {apercu.ecartsTotal}</b>
                  <p className={styles.aide}>{t("La règle propose une source par champ : l'Excel pour une erreur d'unité ou un chiffre qui se contredit (depuis le 1er février 2023), le communiqué sinon. Changez au besoin.")}</p>
                  {apercu.ecarts.map((l) => (
                    <div key={l.deskId} className={styles.sceance}>
                      <div className={styles.quand}>
                        {l.pays} · {l.instrument} · {fmtDate(l.date)} <small>{l.code}</small>
                        <span className={styles.liens}>
                          {l.fichier && (
                            <a href={`/desk/adjudications/source/${l.deskId}`} target="_blank" rel="noopener">
                              PDF ↗
                            </a>
                          )}
                          <a href={`/desk/adjudications?s=${l.deskId}`} target="_blank" rel="noopener" title={t("La fiche de la séance : le PDF et l'Excel côte à côte, et de quoi trancher à tout moment. Le fichier Excel reste sur votre poste : il ne s'ouvre pas à la ligne ; cherchez le code dans la colonne Titre.")}>
                            {t("Fiche")} ↗
                          </a>
                        </span>
                      </div>
                      {l.champs.map((x) => (
                        <div key={x.cle} className={styles.champ}>
                          <span>
                            {t(x.libelle)}
                            {x.dejaTranche && <small className={styles.deja}> · {t("déjà tranché : {s} par {p}", { s: x.dejaTranche.retenu === "pdf" ? "PDF" : "Excel", p: x.dejaTranche.par })}</small>}
                          </span>
                          <span className={styles.val}>PDF {fmtValeur(x.champ, x.pdf)}</span>
                          <span className={styles.val}>Excel {fmtValeur(x.champ, x.excel)}</span>
                          <select value={choix[x.cle] ?? x.proposition.source} onChange={(e) => setChoix((v) => ({ ...v, [x.cle]: e.target.value as Source }))} aria-label={t("Source retenue")}>
                            <option value="pdf">PDF</option>
                            <option value="excel">Excel</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  ))}
                  {apercu.ecartsTotal > apercu.ecarts.length && <p className={styles.aide}>{t("{n} autres écarts : la règle s'applique, et chacun se retrouve dans la fiche de sa séance.", { n: apercu.ecartsTotal - apercu.ecarts.length })}</p>}
                </div>
              )}

              {apercu.contredites.length > 0 && (
                <div className={styles.ecarts}>
                  <b>{t("Résultats du Desk qu'OJA dit rejetés")} · {apercu.contredites.length}</b>
                  <p className={styles.aide}>{apercu.contredites.map((x) => `${x.pays} ${x.isin} ${x.date}`).join(" · ")}</p>
                  <p className={styles.aide}>{t("Ouvrez la pièce : séance annulée ou infructueuse ? Rien n'est modifié ici.")}</p>
                </div>
              )}

              <label className={styles.case}>
                <input type="checkbox" checked={fiables} onChange={(e) => setFiables(e.target.checked)} />
                {t("Importer et confirmer les {n} séances nouvelles fiables", { n: c.nouvellesFiables })}
              </label>
              <label className={styles.case}>
                <input type="checkbox" checked={aConfirmer} onChange={(e) => setAConfirmer(e.target.checked)} />
                {t("Importer aussi les {n} séances d'avant 2023, à confirmer sur la pièce", { n: c.nouvellesAConfirmer })}
              </label>
              <ConfirmPublish
                form="oja-import"
                label={t("Importer")}
                title={t("Importer l'export OJA")}
                lines={[
                  t("{n} séance(s) nouvelle(s) créée(s) avec la source « Excel »{c}.", { n: aImporter, c: fiables ? t(", les fiables confirmées sous votre nom") : "" }),
                  t("{n} séance(s) du Desk enrichie(s) de l'Excel : le communiqué reste, les deux jeux de valeurs sont gardés.", { n: c.concordantes + c.ecarts }),
                  t("{n} écart(s) tranché(s) selon vos choix ; la valeur écartée et le motif sont gardés.", { n: c.ecarts }),
                  t("Chaque changement de valeur retenue écrit son entrée au journal d'audit. Un import s'exclut ensuite d'un clic."),
                ]}
                confirmLabel={t("Importer")}
                typed={t("importer")}
                className="btn sm primary"
                pending={etat === "ecriture"}
                disabled={etat === "ecriture"}
              />
            </form>
          )}

          {/* ANNULER À TOUTE ÉTAPE, SAUF PENDANT L'ÉCRITURE : une lecture ou un aperçu s'abandonnent sans rien écrire ; une écriture partie ne se rappelle pas. */}
          <div className={styles.ligne}>
            <button type="button" className="btn sm" onClick={annuler} disabled={etat === "ecriture"}>
              {etat === "fait" ? t("Fermer") : t("Annuler")}
            </button>
            {etat === "ecriture" && <span className={styles.aide}>{t("L'écriture est en cours : elle ne peut plus être annulée.")}</span>}
            {(etat === "lecture" || etat === "apercu") && <span className={styles.aide}>{t("Rien n'est écrit tant que vous n'avez pas confirmé l'import.")}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
