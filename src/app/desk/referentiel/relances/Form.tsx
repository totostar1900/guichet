"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import {
  ENJEU_DU_SUJET,
  NOM_DU_SUJET,
  remplir,
  SUJETS,
  texteDuSujet,
  TEXTE_PAR_DEFAUT,
  type PolitiqueDeRelance,
  type SujetDeRelance,
} from "@/lib/domain/relance";
import { enregistrerRelancesAction, type RelancePolitiqueResult } from "./actions";
import styles from "./page.module.css";

/** Ce que la file contient aujourd'hui, par sujet : le réglage se juge là-dessus. */
export interface FileParSujet {
  sujet: SujetDeRelance;
  enCours: number;
  ecartees: number;
  epuisees: number;
}

/**
 * LE RÉGLAGE, ET CE QU'IL DÉPLACE, SUR LE MÊME ÉCRAN.
 *
 * Le délai de souffrance se règle en voyant ce qu'il attrape, et la raison
 * vaut doublement ici : un réglage qui colore une colonne se corrige après
 * coup, un réglage qui envoie cinq messages à chaque client ne se corrige
 * plus — les messages sont partis.
 *
 * TROIS CHOSES SE VOIENT AVANT D'ENREGISTRER. Combien de personnes sont dans
 * la file, sujet par sujet. Combien de messages le réglage produira au total,
 * calculé pendant la frappe. Et le message lui-même, rendu avec ses trous
 * bouchés : personne ne relit un modèle à trous, tout le monde relit une
 * phrase.
 */
export function RelancesForm({ politique, file, exemple }: { politique: PolitiqueDeRelance; file: FileParSujet[]; exemple: { prenom: string; quoi: string; lien: string } }) {
  const t = useT();
  const [state, action, pending] = useActionState<RelancePolitiqueResult | null, FormData>(enregistrerRelancesAction, null);

  const [active, setActive] = useState(politique.active);
  const [rappels, setRappels] = useState(String(politique.rappels));
  const [delai, setDelai] = useState(String(politique.delaiPremier));
  const [cadence, setCadence] = useState(String(politique.cadence));
  const [canaux, setCanaux] = useState({ whatsapp: politique.canaux.includes("whatsapp"), email: politique.canaux.includes("email") });
  const [sujets, setSujets] = useState<Record<SujetDeRelance, boolean>>({ ...politique.sujets });
  const [textes, setTextes] = useState<Record<string, { objet: string; texte: string }>>(
    Object.fromEntries(SUJETS.map((s) => [s, texteDuSujet(politique, s)])),
  );
  const [ouvert, setOuvert] = useState<SujetDeRelance | null>(null);

  const n = Number(rappels);
  const dans = (s: SujetDeRelance) => file.find((f) => f.sujet === s)?.enCours ?? 0;
  const vises = SUJETS.filter((s) => sujets[s]).reduce((a, s) => a + dans(s), 0);
  const sansCanal = !canaux.whatsapp && !canaux.email;
  /* LE PIRE CAS, et c'est celui qu'il faut voir : si personne ne répond ni
     n'écarte, voilà combien de messages partent. Une moyenne rassurerait à
     tort — c'est le plafond qui se décide ici. */
  const plafond = active && !sansCanal && Number.isFinite(n) ? vises * n : 0;

  return (
    <form action={action} className={styles.form}>
      <section className={styles.bloc}>
        <label className={styles.inter}>
          <input type="checkbox" name="active" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <span>
            <b>{t("Envoyer les rappels")}</b>
            <small>{t("Décoché, le robot continue de constater et de tenir la file, mais plus rien ne part.")}</small>
          </span>
        </label>
      </section>

      <section className={styles.bloc}>
        <h3>{t("La cadence")}</h3>
        <div className={styles.grid}>
          <label>
            <span>{t("Combien de rappels au plus")}</span>
            <input name="rappels" type="number" min="1" max="20" step="1" value={rappels} onChange={(e) => setRappels(e.target.value)} />
          </label>
          <label>
            <span>{t("Le premier, combien de jours après")}</span>
            <input name="delaiPremier" type="number" min="0" max="30" step="1" value={delai} onChange={(e) => setDelai(e.target.value)} />
          </label>
          <label>
            <span>{t("Un rappel tous les combien de jours")}</span>
            <input name="cadence" type="number" min="1" max="30" step="1" value={cadence} onChange={(e) => setCadence(e.target.value)} />
          </label>
        </div>
        <p className={styles.dit}>
          {t("Un client qui ne répond à rien recevra {n} message(s), le premier {j}, puis un tous les {c} jour(s).", {
            n: rappels,
            j: Number(delai) === 0 ? t("le jour même") : Number(delai) === 1 ? t("le lendemain") : t("{d} jours après", { d: delai }),
            c: cadence,
          })}
        </p>
        <JoursOuvres defaut={politique.joursOuvres} t={t} />
        <PreavisGarde defaut={politique.pasLeJourDUnPreavis} t={t} />
      </section>

      <section className={styles.bloc}>
        <h3>{t("Les canaux")}</h3>
        <div className={styles.cases}>
          <label className={styles.inter}>
            <input type="checkbox" name="whatsapp" checked={canaux.whatsapp} onChange={(e) => setCanaux({ ...canaux, whatsapp: e.target.checked })} />
            <span>
              <b>WhatsApp</b>
              <small>{t("Seulement vers les clients qui ont donné leur accord WhatsApp.")}</small>
            </span>
          </label>
          <label className={styles.inter}>
            <input type="checkbox" name="email" checked={canaux.email} onChange={(e) => setCanaux({ ...canaux, email: e.target.checked })} />
            <span>
              <b>{t("E-mail")}</b>
              <small>{t("Vers l'adresse du dossier.")}</small>
            </span>
          </label>
        </div>
        {sansCanal && <p className={styles.alerte}>{t("Aucun canal coché : rien ne partira, quel que soit le reste du réglage.")}</p>}
      </section>

      <section className={styles.bloc}>
        <h3>{t("Les sujets, et ce que chacun bloque")}</h3>
        <div className={styles.sujets}>
          {SUJETS.map((s) => {
            const f = file.find((x) => x.sujet === s);
            const modele = textes[s];
            return (
              <div key={s} className={styles.sujet} data-off={sujets[s] ? undefined : "oui"}>
                <label className={styles.inter}>
                  <input type="checkbox" name={`sujet_${s}`} checked={sujets[s]} onChange={(e) => setSujets({ ...sujets, [s]: e.target.checked })} />
                  <span>
                    <b>{t(NOM_DU_SUJET[s])}</b>
                    <small>{t(ENJEU_DU_SUJET[s])}</small>
                  </span>
                </label>
                <div className={styles.compte}>
                  <b>{f?.enCours ?? 0}</b>
                  <span>{t("en attente")}</span>
                  {Boolean(f?.ecartees) && <span className={styles.tag}>{t("{n} écartés", { n: String(f!.ecartees) })}</span>}
                  {Boolean(f?.epuisees) && <span className={styles.tag}>{t("{n} épuisés", { n: String(f!.epuisees) })}</span>}
                </div>
                <button type="button" className={styles.plier} onClick={() => setOuvert(ouvert === s ? null : s)} aria-expanded={ouvert === s}>
                  {t(ouvert === s ? "Masquer le message" : "Voir et modifier le message")}
                </button>
                {ouvert === s && (
                  <div className={styles.message}>
                    <label>
                      <span>{t("Objet (e-mail)")}</span>
                      <input name={`objet_${s}`} value={modele.objet} maxLength={120} onChange={(e) => setTextes({ ...textes, [s]: { ...modele, objet: e.target.value } })} />
                    </label>
                    <label>
                      <span>{t("Message")}</span>
                      <textarea name={`texte_${s}`} rows={5} maxLength={900} value={modele.texte} onChange={(e) => setTextes({ ...textes, [s]: { ...modele, texte: e.target.value } })} />
                    </label>
                    <p className={styles.trous}>
                      {t("Trois trous : {a} le prénom du client, {b} l'objet précis (le titre de la ligne, la destination du mandat), {c} l'adresse du geste. {c} est obligatoire.", {
                        a: "{prenom}",
                        b: "{quoi}",
                        c: "{lien}",
                      })}
                    </p>
                    {/* CE QUE LE CLIENT LIRA, trous bouchés. Personne ne relit
                        un modèle ; tout le monde relit une phrase. */}
                    <div className={styles.apercu}>
                      <small>{t("Ce que le client lira")}</small>
                      <b>{remplir(modele.objet, exemple)}</b>
                      <p>{remplir(modele.texte, exemple)}</p>
                    </div>
                    <button
                      type="button"
                      className={styles.plier}
                      onClick={() => setTextes({ ...textes, [s]: { ...TEXTE_PAR_DEFAUT[s] } })}
                    >
                      {t("Revenir au texte de la maison")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* LE PLAFOND, ET POURQUOI C'EST LUI QU'ON MONTRE. Une moyenne
          rassurerait à tort : ce qui se décide ici est le pire cas, celui où
          personne ne répond ni n'écarte. */}
      <div className={styles.effet}>
        <b>{t("{n} message(s) au plus", { n: String(plafond) })}</b>
        <span className="muted">{t("si aucun des {v} client(s) en attente ne répond ni n'interrompt les rappels", { v: String(vises) })}</span>
        {!active && <p className={styles.alerte}>{t("Les rappels sont désactivés : rien ne partira.")}</p>}
      </div>

      <div className={styles.row}>
        <button className="btn sm primary" type="submit" disabled={pending}>
          {t(pending ? "…" : "Enregistrer le réglage")}
        </button>
        {state && <span className={state.ok ? styles.ok : styles.ko}>{state.ok ? t(state.message) : t(state.error)}</span>}
      </div>
    </form>
  );
}

/* Deux interrupteurs qui gardent leur état à la saisie : écrits à part pour
   que le corps du formulaire reste lisible. */
function JoursOuvres({ defaut, t }: { defaut: boolean; t: (k: string) => string }) {
  const [on, setOn] = useState(defaut);
  return (
    <label className={styles.inter}>
      <input type="checkbox" name="joursOuvres" checked={on} onChange={(e) => setOn(e.target.checked)} />
      <span>
        <b>{t("Sauter le samedi et le dimanche")}</b>
        <small>{t("Décoché, cinq rappels sont cinq jours de suite : un bulletin qui attend n'attend pas moins le samedi.")}</small>
      </span>
    </label>
  );
}

function PreavisGarde({ defaut, t }: { defaut: boolean; t: (k: string) => string }) {
  const [on, setOn] = useState(defaut);
  return (
    <label className={styles.inter}>
      <input type="checkbox" name="pasLeJourDUnPreavis" checked={on} onChange={(e) => setOn(e.target.checked)} />
      <span>
        <b>{t("Se taire le jour d'un préavis de prélèvement")}</b>
        <small>{t("Deux messages de la maison le même jour sur deux sujets différents, c'est un message qu'on n'ouvre plus — et le préavis annonce un débit, donc il est dû.")}</small>
      </span>
    </label>
  );
}
