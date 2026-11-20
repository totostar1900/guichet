"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useT } from "@/i18n/client";
import { apercuDuClasseurAction, chargerLeClasseurAction, type ApercuClasseur } from "./actions";
import styles from "./page.module.css";

/**
 * Le classeur reste dans l'état du composant, pas dans un champ de formulaire : une action de formulaire vide le champ « fichier » en finissant, et « Charger » aurait redemandé le fichier que l'aperçu venait de lire.
 */
export function ChargerUnClasseur() {
  const t = useT();
  const [fichier, setFichier] = useState<File | null>(null);
  const [etat, setEtat] = useState<ApercuClasseur | null>(null);
  const [occupe, lancer] = useTransition();

  const envoyer = (action: typeof apercuDuClasseurAction) => {
    if (!fichier) return;
    lancer(async () => {
      const fd = new FormData();
      fd.set("classeur", fichier);
      setEtat(await action(null, fd));
    });
  };

  const aCharger = etat?.lignes?.filter((l) => l.statut === "a_charger").length ?? 0;
  const seances = etat?.resultats?.filter((r) => r.statut === "complete" || r.statut === "cree").length ?? 0;
  const erreurs = (etat?.lignes?.filter((l) => l.statut === "erreur").length ?? 0) + (etat?.resultats?.filter((r) => r.statut === "erreur").length ?? 0);

  return (
    <>
      <section className={styles.etape}>
        <h2>{t("2. Le classeur rempli")}</h2>
        <div className={styles.choix}>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-label={t("Classeur Excel")}
            onChange={(e) => {
              setFichier(e.target.files?.[0] ?? null);
              setEtat(null);
            }}
          />
          <button type="button" className="btn" disabled={!fichier || occupe} onClick={() => envoyer(apercuDuClasseurAction)}>
            {occupe && !etat ? t("Lecture…") : t("Voir l'aperçu")}
          </button>
        </div>
      </section>

      {etat && !etat.ok && <div className={styles.erreur}>{etat.erreur}</div>}

      {etat?.ok && (
        <section className={styles.etape}>
          <h2>{etat.charge ? t("Chargé") : t("3. L'aperçu")}</h2>
          {etat.charge ? (
            <div className={styles.ok}>
              {t("{p} pièce(s) à valider, {c} séance(s) complétée(s), {n} créée(s).", { p: etat.charge.pieces, c: etat.charge.seancesCompletees, n: etat.charge.seancesCreees })}{" "}
              <Link href="/desk/a-valider">{t("Ouvrir « À valider »")} →</Link>
            </div>
          ) : (
            <div className={styles.compteurs}>
              <span>
                <b>{aCharger}</b> {t("ligne(s) à charger")}
              </span>
              <span>
                <b>{seances}</b> {t("séance(s) à compléter ou créer")}
              </span>
              <span>
                <b>{etat.lignes?.filter((l) => l.statut === "doublon").length ?? 0}</b> {t("doublon(s) ignoré(s)")}
              </span>
              <span>
                <b>{erreurs}</b> {t("erreur(s), non chargées")}
              </span>
            </div>
          )}

          {(etat.lignes?.length ?? 0) > 0 && (
            <div className={styles.tableau}>
              <table>
                <thead>
                  <tr>
                    <th>{t("Feuille")}</th>
                    <th>{t("Ligne")}</th>
                    <th>{t("Contenu")}</th>
                    <th>{t("État")}</th>
                    <th>{t("À savoir")}</th>
                  </tr>
                </thead>
                <tbody>
                  {etat.lignes!.map((l) => (
                    <tr key={`${l.feuille}-${l.ligne}`}>
                      <td>{l.feuille}</td>
                      <td>{l.ligne}</td>
                      <td>{l.resume}</td>
                      <td>
                        <span className={`${styles.st} ${l.statut === "a_charger" ? styles.st_ok : l.statut === "doublon" ? styles.st_doublon : styles.st_erreur}`}>
                          {l.statut === "a_charger" ? (l.officielle ? t("à valider") : t("à compléter")) : l.statut === "doublon" ? t("déjà dans la file") : t("erreur")}
                        </span>
                      </td>
                      <td>
                        <ul className={styles.messages}>
                          {l.erreurs.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                          {l.avertissements.map((m) => (
                            <li key={m} className={styles.alerte}>
                              {m}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {(etat.resultats?.length ?? 0) > 0 && (
            <div className={styles.tableau}>
              <table>
                <thead>
                  <tr>
                    <th>{t("Résultats")}</th>
                    <th>{t("Ligne")}</th>
                    <th>{t("Séance")}</th>
                    <th>{t("État")}</th>
                    <th>{t("À savoir")}</th>
                  </tr>
                </thead>
                <tbody>
                  {etat.resultats!.map((r) => (
                    <tr key={r.ligne}>
                      <td>{t("Résultats")}</td>
                      <td>{r.ligne}</td>
                      <td>{r.resume}</td>
                      <td>
                        <span className={`${styles.st} ${r.statut === "erreur" ? styles.st_erreur : r.statut === "inchange" ? styles.st_doublon : styles.st_ok}`}>{r.statut === "complete" ? t("complétée") : r.statut === "cree" ? t("créée") : r.statut === "inchange" ? t("rien à ajouter") : t("erreur")}</span>
                      </td>
                      <td>
                        <ul className={styles.messages}>
                          {r.erreurs.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                          {r.ajoutes.length > 0 && <li>{t("Ajouté : {c}", { c: r.ajoutes.join(", ") })}</li>}
                          {r.ecarts.map((m) => (
                            <li key={m} className={styles.alerte}>
                              {m}
                            </li>
                          ))}
                          {r.avertissements.map((m) => (
                            <li key={m} className={styles.alerte}>
                              {m}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!etat.charge && (aCharger > 0 || seances > 0) && (
            <button type="button" className="btn primary" disabled={occupe} onClick={() => envoyer(chargerLeClasseurAction)}>
              {occupe ? t("Chargement…") : t("Charger {a} ligne(s) et {s} séance(s)", { a: aCharger, s: seances })}
            </button>
          )}
          {!etat.charge && aCharger === 0 && seances === 0 && <p className={styles.sous}>{t("Rien à charger : corrigez le classeur et relancez l'aperçu.")}</p>}
        </section>
      )}
    </>
  );
}
