"use client";

import { useActionState, useMemo, useState } from "react";
import { useT } from "@/i18n/client";
import { fmt, fmtDate } from "@/lib/format";
import { intituleConcordant, lireLeReleve, resoudreLeMotif, verdictDuVirement, type Intitule, type LigneLue, type Verdict } from "@/lib/domain/virement";
import { inscrireLeCredit, type VirementResult } from "./actions";
import styles from "./page.module.css";

export interface ClientVu {
  userId: string;
  ref: string;
  nom: string;
  holder?: string;
  banque?: string;
  compte?: string;
}

interface Lecture {
  l: LigneLue;
  verdict: Verdict;
  intitule: Intitule;
  /** Le client trouvé, ou les candidats quand un caractère diffère. */
  client?: ClientVu;
  candidats: ClientVu[];
  dejaLue: boolean;
}

function Msg({ state }: { state: VirementResult | null }) {
  const t = useT();
  if (!state) return null;
  return <span className={state.ok ? styles.ok : styles.ko}>{state.ok ? state.message : state.error}</span>;
}

/**
 * LIRE UN RELEVÉ COLLÉ, ET N'INSCRIRE QUE CE QU'UNE PERSONNE CONFIRME.
 *
 * La lecture est vive, sans bouton : le tableau paraît pendant qu'on colle, et
 * c'est ce qui permet de corriger le texte au lieu de corriger des champs. La
 * ligne du relevé est la pièce ; rien d'elle n'est modifiable ici, et une
 * erreur de découpe se répare dans le cadre au-dessus.
 *
 * Un seul verdict ouvre un geste unique. Les quatre autres montrent et
 * attendent, parce qu'un rattachement faux met l'argent d'un client au journal
 * d'un autre et qu'il n'existe pas de bouton pour défaire ça.
 */
export function LireLeReleve({ clients, dejaLues }: { clients: ClientVu[]; dejaLues: string[] }) {
  const t = useT();
  const [texte, setTexte] = useState("");
  const [etat, action, enCours] = useActionState<VirementResult | null, FormData>(inscrireLeCredit, null);
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [motifOuvert, setMotifOuvert] = useState<string | null>(null);
  const [jumelles, setJumelles] = useState<string[]>([]);

  const refs = useMemo(() => new Map(clients.map((c) => [c.ref, c.userId])), [clients]);
  const parUser = useMemo(() => new Map(clients.map((c) => [c.userId, c])), [clients]);
  const connues = useMemo(() => new Set(dejaLues), [dejaLues]);

  const { lectures, illisibles } = useMemo(() => {
    const { lignes, illisibles: ill } = lireLeReleve(texte);
    const out: Lecture[] = lignes.map((l) => {
      const r = resoudreLeMotif(l.motif, refs);
      const client = r.kind === "exacte" ? parUser.get(r.userId) : undefined;
      const candidats = r.kind === "proche" ? r.candidats.map((c) => parUser.get(c.userId)).filter((c): c is ClientVu => Boolean(c)) : [];
      const intitule = intituleConcordant(l.payer, client?.holder);
      return { l, verdict: verdictDuVirement(r, intitule), intitule, client, candidats, dejaLue: connues.has(l.fingerprint) };
    });
    return { lectures: out, illisibles: ill };
  }, [texte, refs, parUser, connues]);

  const aLire = lectures.filter((x) => !x.dejaLue || jumelles.includes(x.l.fingerprint));

  return (
    <>
      <section className="panel">
        <div className="panel-h">
          <h2>{t("Lire le relevé")}</h2>
          <span className="muted">{t("Collez les lignes de crédit. La machine lit, vous confirmez.")}</span>
        </div>
        <div className={styles.pb}>
          <textarea
            className={styles.releve}
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder="09/10/2026  VIR RECU NITCHEU GEORGES  PR-XXXXXX  500 000"
            aria-label={t("Lignes de crédit du relevé")}
          />
          <p className={styles.note}>
            {t("Une ligne déjà inscrite se reconnaît et ne se propose plus : un relevé dont la période chevauche la précédente ne crédite pas deux fois.")}
          </p>
          {illisibles.length > 0 && (
            /* ACQUITTER N'EST PAS SE TAIRE : une ligne tombée sans bruit est un
               virement orphelin de plus, et personne ne saurait la chercher. */
            <div className={styles.illisibles}>
              <b>{t("{n} lignes non lues", { n: String(illisibles.length) })}</b>
              <span>{t("Il y manque une date ou un montant. Rien n'est perdu : elles sont ici.")}</span>
              <ul>
                {illisibles.slice(0, 6).map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {lectures.length > 0 && (
        <section className="panel">
          <div className="panel-h">
            <h2>{aLire.length ? t("{n} crédits lus, à confirmer un par un", { n: String(aLire.length) }) : t("Rien de nouveau dans ce relevé")}</h2>
            <span className="muted">{t("Rien n'est inscrit au journal avant votre geste.")}</span>
          </div>
          <div className={styles.rows}>
            {lectures.map((x) => {
              const clef = x.l.fingerprint;
              const jumelle = jumelles.includes(clef);
              if (x.dejaLue && !jumelle) {
                return (
                  <div key={clef} className={`${styles.row} ${styles.deja}`}>
                    <div className={styles.cellJour}>{fmtDate(x.l.at)}</div>
                    <div className={styles.cellMontant}>{fmt(x.l.amount)}</div>
                    <div className={styles.cellQui}>
                      {x.l.payer}
                      <small>{x.l.motif ?? t("sans référence")}</small>
                    </div>
                    <div className={styles.cellVerdict}>
                      <span className={styles.vDeja}>{t("déjà inscrite")}</span>
                    </div>
                    <div className={styles.cellGeste}>
                      <button type="button" className="btn sm ghost" onClick={() => setJumelles((j) => [...j, clef])}>
                        {t("C'est un second virement identique")}
                      </button>
                    </div>
                  </div>
                );
              }
              const choisi = choix[clef] ?? x.client?.userId ?? (x.candidats.length === 1 ? x.candidats[0].userId : "");
              const nomme = parUser.get(choisi);
              return (
                <form key={clef} action={action} className={`${styles.row} ${x.verdict === "tiers" ? styles.rowTiers : ""}`}>
                  <input type="hidden" name="at" value={x.l.at} />
                  <input type="hidden" name="amount" value={x.l.amount} />
                  <input type="hidden" name="payer" value={x.l.payer} />
                  {x.l.motif && <input type="hidden" name="motif" value={x.l.motif} />}
                  <input type="hidden" name="brut" value={x.l.brut} />
                  {jumelle && <input type="hidden" name="occurrence" value="2" />}

                  <div className={styles.cellJour}>{fmtDate(x.l.at)}</div>
                  <div className={styles.cellMontant}>{fmt(x.l.amount)}</div>
                  <div className={styles.cellQui}>
                    {x.l.payer}
                    <small className="mono">{x.l.motif ?? t("sans référence")}</small>
                  </div>

                  <div className={styles.cellClient}>
                    {x.verdict === "a_rattacher" || x.verdict === "tiers" || x.verdict === "intitule_inconnu" ? (
                      <>
                        <b>{x.client?.nom}</b>
                        <small className={x.intitule === "differe" ? styles.alerte : undefined}>
                          {x.client?.holder ? `${x.client.banque ?? ""} · ${x.client.holder}` : t("aucun intitulé de compte déclaré")}
                        </small>
                      </>
                    ) : (
                      /* La liste native est assumée au desk : on y travaille au
                         clavier sur grand écran, et le cliquet le dit. */
                      <select name="userId" value={choisi} onChange={(e) => setChoix((c) => ({ ...c, [clef]: e.target.value }))} aria-label={t("Client")}>
                        <option value="">{t("Choisir un client")}</option>
                        {(x.candidats.length ? x.candidats : clients).map((c) => (
                          <option key={c.userId} value={c.userId}>
                            {c.nom} · {c.ref}
                          </option>
                        ))}
                      </select>
                    )}
                    {(x.verdict === "a_rattacher" || x.verdict === "tiers" || x.verdict === "intitule_inconnu") && <input type="hidden" name="userId" value={x.client?.userId ?? ""} />}
                    {nomme && x.verdict === "proche" && <small>{t("Proposé parce qu'un seul caractère diffère de son motif.")}</small>}
                  </div>

                  <div className={styles.cellVerdict}>
                    <span className={x.verdict === "a_rattacher" ? styles.vOk : x.verdict === "orphelin" ? styles.vNon : styles.vDoute}>
                      {x.verdict === "a_rattacher"
                        ? t("Référence exacte, intitulé concordant")
                        : x.verdict === "tiers"
                          ? t("Fonds d'un tiers")
                          : x.verdict === "intitule_inconnu"
                            ? t("Intitulé de compte non déclaré")
                            : x.verdict === "proche"
                              ? t("Référence approchante")
                              : t("Aucune référence lisible")}
                    </span>
                    {x.verdict === "tiers" && <small>{t("L'article 3 refuse et restitue : le motif nomme ce client, le compte débité n'est pas le sien.")}</small>}
                    {x.verdict === "orphelin" && <small>{t("Le motif ne porte pas de référence. Un nom ne suffit pas à inscrire.")}</small>}
                  </div>

                  <div className={styles.cellGeste}>
                    {motifOuvert === clef ? (
                      <div className={styles.refus}>
                        <input name="raison" placeholder={t("Pourquoi cet argent repart")} maxLength={160} />
                        <button type="button" className="btn sm ghost" onClick={() => setMotifOuvert(null)}>
                          {t("Annuler")}
                        </button>
                        <button name="geste" value="restituer" className="btn sm" disabled={enCours}>
                          {t("Restituer")}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button name="geste" value="rattacher" className="btn sm primary" disabled={enCours || !choisi}>
                          {x.verdict === "tiers" ? t("Rattacher quand même") : t("Rattacher")}
                        </button>
                        {x.verdict !== "a_rattacher" && (
                          <button type="button" className="btn sm" onClick={() => setMotifOuvert(clef)}>
                            {t("Restituer")}
                          </button>
                        )}
                        {x.verdict !== "a_rattacher" && (
                          <button name="geste" value="attente" className="btn sm ghost" disabled={enCours}>
                            {t("Mettre en attente")}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </form>
              );
            })}
          </div>
          <div className={styles.pbMince}>
            <Msg state={etat} />
          </div>
        </section>
      )}
    </>
  );
}
