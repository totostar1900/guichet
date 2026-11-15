"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useDates, useT } from "@/i18n/client";
import { fmt } from "@/lib/format";
import { PREAVIS_JOURS } from "@/lib/domain/prelevement";
import { deposerCopieMandatAction, envoyerCodeMandatAction, revoquerMandatAction, signerMandatAction, type MandatResult } from "./actions";
import type { EtapeDuMandat } from "@/lib/domain/mandat";
import { hrefDeLecture } from "@/lib/lecture";
import styles from "./page.module.css";
import { BarreCollante } from "@/components/mobile/BarreDEtape";
import barre from "@/components/mobile/BarreDEtape.module.css";

export interface Vu {
  id: string;
  standingId?: string;
  /** Le fonds de l'épargne que ce mandat paie. */
  fonds?: string;
  ref: string;
  objet: "provision" | "instruction";
  titulaire: string;
  banque: string;
  compte: string;
  /** Le montant signé : celui qui est présenté, et le seul qu'il y ait. */
  montant: number;
  jour?: number;
  etat: "actif" | "suspendu" | "revoque";
  /** Où en est le mandat : signé par code, copie signée à la main attendue, en vérification, refusée, actif. */
  etape: EtapeDuMandat;
  /** Le motif du dernier refus de la copie, déjà traduit. */
  refus?: string;
  signeLe?: string;
  /** L'exemplaire produit à la signature, s'il existe : la pièce que la banque réclame. */
  piece?: string;
  codeEnvoyeA?: string;
  codeEnvoyeLe?: string;
  revoqueLe?: string;
  /** Le prochain tirage (ISO), pour un mandat actif. */
  prochain?: string;
}

function Msg({ state }: { state: MandatResult | null }) {
  const t = useT();
  if (!state) return null;
  return <p className={state.ok ? styles.ok : styles.erreur}>{state.ok ? (state.message ? t(state.message) : null) : t(state.error)}</p>;
}

/**
 * UN MANDAT SE LIT AVANT DE SE SIGNER, ET SE SIGNE À PART.
 *
 * Le remplir et le signer d'un même geste reviendrait à le signer sans
 * l'avoir lu : la page le crée d'abord, l'affiche avec ses chiffres, et
 * demande ensuite le code. C'est la même séquence que la convention et que
 * l'ordre, pour la même raison.
 */
export function MesMandats({
  mandats,
  canal,
  dossier,
  injoignable,
}: {
  /** Le ou les mandats montrés : la page d'un mandat n'en porte qu'un (« /moi/prelevements/[id] »). */
  mandats: Vu[];
  canal?: { to: string; parMail: boolean };
  /** Le dossier existe-t-il ? Sans lui, aucun code ne peut partir. */
  dossier: boolean;
  /** Aucune adresse où faire parvenir le code, ni plus tard les préavis. */
  injoignable: boolean;
}) {
  const { fmtDate, fmtDateTime } = useDates();
  const t = useT();
  const [envoi, envoiAct, envoyant] = useActionState<MandatResult | null, FormData>(envoyerCodeMandatAction, null);
  const [sign, signAct, signant] = useActionState<MandatResult | null, FormData>(signerMandatAction, null);
  const [revoc, revocAct, revoquant] = useActionState<MandatResult | null, FormData>(revoquerMandatAction, null);
  const [copie, copieAct, deposant] = useActionState<MandatResult | null, FormData>(deposerCopieMandatAction, null);
  const [fichier, setFichier] = useState("");
  /* Un mandat révoqué ne se montre plus ici : sa référence se retrouve dans l'historique. */
  const vivants = mandats.filter((m) => m.etat !== "revoque");
  const [aRevoquer, setARevoquer] = useState<string | null>(null);

  return (
    <>
      {vivants.length > 0 && (
        <section className={styles.bloc}>
          <ul className={styles.liste}>
            {vivants.map((m) => (
              /* L'ANCRE DU RAPPEL : son second lien renvoie ici, sur le
                 mandat qui attend sa signature. Sans elle, le client qui a
                 cliqué « supprimer ce mandat » dans un message atterrissait
                 en haut d'une page et devait le retrouver. */
              <li key={m.id} className={styles.mandat} id={m.signeLe ? undefined : "mandat"}>
                <div className={styles.mTete}>
                  <b>{m.objet === "provision" ? t("Alimenter ma provision") : m.fonds ? t("Alimenter mon épargne vers {f}", { f: m.fonds }) : t("Alimenter mon épargne programmée")}</b>
                  {/* « ARRÊTÉ », et non « suspendu » : « suspendu » décrit ce que la
                      maison peut reprendre, et le client n'a pas à deviner s'il
                      sera prélevé le mois prochain. */}
                  <span className={m.etape === "actif" || (m.signeLe && m.etape === "a_signer") ? styles.actif : styles.attente}>
                    {m.etape === "a_signer" ? t("à signer") : m.etat === "suspendu" ? t("arrêté") : m.etape === "copie_attendue" ? t("copie attendue") : m.etape === "en_verification" ? t("en vérification") : m.etape === "copie_refusee" ? t("copie refusée") : t("actif")}
                  </span>
                </div>
                {/* UN SEUL NOMBRE depuis le 25 octobre 2026. La carte en portait
                    deux — « chaque mois 50 000 » puis « plafond par échéance
                    50 000 », en gras — et deux chiffres identiques côte à côte
                    font chercher ce qui les distingue. Il n'y a qu'un montant,
                    c'est celui qui est présenté à la banque, et la ligne le
                    dit. */}
                <dl className={styles.mLignes}>
                  <div>
                    <dt>{m.jour != null ? t("Présenté chaque mois") : t("Montant présenté")}</dt>
                    <dd>
                      <b>{fmt(m.montant)} FCFA</b>
                      {m.jour != null ? <span className={styles.leJour}>{t("le {j} de chaque mois", { j: String(m.jour) })}</span> : null}
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Compte débité")}</dt>
                    <dd>
                      {m.titulaire} · {m.banque} · <span className="mono">{m.compte}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>{t("Référence du mandat")}</dt>
                    <dd className="mono">{m.ref}</dd>
                  </div>
                </dl>

                {m.signeLe ? (
                  <>
                    {/* LA CONFIRMATION DE LA SIGNATURE SURVIT AU FORMULAIRE
                        QU'ELLE CONFIRME. Relevé en jouant le parcours le
                        25 octobre 2026 : le message « Mandat signé » vivait
                        dans le bloc de signature, et signer fait disparaître ce
                        bloc — donc le message. Le client voyait la carte
                        changer d'état sans qu'une ligne le lui dise, ce qui
                        est indiscernable d'un geste qui n'a pas abouti. C'est
                        la même panne que sur le compte de règlement du desk,
                        le même jour, pour la même raison. */}
                    {sign?.ok && sign.message ? <p className={styles.ok}>{t(sign.message)}</p> : null}
                    {/* LA FIN DU PARCOURS : le mandat est en place, on le retrouve avec ce qui part tout seul (audit « Mon argent », 10 novembre 2026). */}
                    {sign?.ok ? <Link href="/moi/regles">{t("Ce qui part tout seul")} →</Link> : null}
                    {/* LA COPIE SIGNÉE À LA MAIN (15 novembre 2026) : trois états, un seul geste à la fois, et rien n'est prélevé avant la vérification. */}
                    {(m.etape === "copie_attendue" || m.etape === "copie_refusee") && (
                      <form action={copieAct} className={styles.signer}>
                        <p className={styles.note}>
                          {m.etape === "copie_refusee"
                            ? `${t("La copie signée a été refusée.")} ${m.refus ?? ""} ${t("Renvoyez une copie signée.")}`
                            : t("Il reste à signer le document à la main, à le déposer à votre banque et à nous en envoyer une copie. Rien n'est prélevé avant sa vérification.")}{" "}
                          <Link href={m.piece ? hrefDeLecture(`/api/documents/${m.piece}`, { titre: `${t("Mandat")} ${m.ref}`, de: "/moi/prelevements" }) : "/moi/documents/signes"}>{t("Lire le mandat à imprimer")} →</Link>
                        </p>
                        <input type="hidden" name="id" value={m.id} />
                        <label className="field">
                          {t("Copie signée (PDF, photo ou scan, 10 Mo au plus)")}
                          <input type="file" name="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setFichier(e.target.files?.[0]?.name ?? "")} />
                        </label>
                        <button className="btn primary" type="submit" disabled={deposant || !fichier}>
                          {deposant ? "…" : t("Envoyer ma copie signée")}
                        </button>
                        <Msg state={copie} />
                      </form>
                    )}
                    {m.etape === "en_verification" && <p className={styles.note}>{t("Copie reçue : nous la vérifions. Le prélèvement part dès qu'elle est validée.")}</p>}
                    {m.prochain && <p className={styles.note}>{t("prochain prélèvement le {d}, annoncé {n} jours avant", { d: fmtDate(m.prochain, false), n: String(PREAVIS_JOURS) })}</p>}
                    <p className={styles.note}>
                      {t("Signé le {d}. Votre banque peut vous demander cet exemplaire.", { d: fmtDateTime(m.signeLe) })}{" "}
                      {/* L'ADRESSE DE LA PIÈCE, et non sa description : « dans
                          vos documents » faisait traverser trois écrans pour
                          trouver le seul papier qu'une agence réclame. */}
                      <Link href={m.piece ? `/moi/documents/${m.piece}?de=${encodeURIComponent("/moi/prelevements")}` : "/moi/documents/signes"}>{t("Ouvrir mon exemplaire →")}</Link>
                    </p>
                  </>
                ) : (
                  <div className={styles.signer}>
                    {/* LIRE LE PAPIER AVANT DE L'AUTORISER.
                        Relevé à l'audit des pièces signées du 27 octobre 2026 :
                        le client autorisait sa banque à être débitée sans avoir
                        vu le document qui le dit — il relisait des chiffres sur
                        ce formulaire, et la pièce naissait dans le geste de
                        signer. Le lien vient AVANT le bouton du code, parce que
                        c'est l'ordre dans lequel on fait les choses : on lit,
                        puis on demande le code, puis on signe. */}
                    <p className={styles.note}>
                      <Link href={hrefDeLecture(`/api/documents/mandat-apercu/${m.id}`, { titre: `${t("Mandat")} ${m.ref}`, note: t("Le mandat tel que vous le signerez. Rien n'est engagé tant que vous n'avez pas saisi le code."), de: "/moi/prelevements" })}>
                        {t("Lire le mandat avant de le signer")} →
                      </Link>{" "}
                      {t("— c'est le document que votre banque vous demandera. Tant qu'il n'est pas signé, vous pouvez encore le corriger.")}
                    </p>
                    {/* LA PAGE ET L'ACTION DOIVENT DIRE LA MÊME CHOSE. Sans
                        dossier, la page annonçait « le code s'affichera à
                        l'écran » et le bouton répondait « Dossier
                        introuvable » : deux vérités, dont une seule tenait.
                        Vu à l'écran le 9 octobre 2026. */}
                    <p className={styles.note}>
                      {!dossier
                        ? t("Votre dossier doit être ouvert avant de signer un mandat : c'est lui qui porte le canal par lequel le code vous parvient.")
                        : injoignable
                          ? t("Il nous faut une adresse e-mail avant de signer : c'est là que part le code, puis l'annonce de chaque prélèvement.")
                          : canal
                          ? t(canal.parMail ? "Le code part par e-mail, à {o}" : "Le code part par WhatsApp, au {o}", { o: canal.to })
                          : t("Aucun canal d'envoi n'est configuré : le code s'affichera à l'écran.")}
                    </p>
                    {/* UN SEUL BOUTON PRINCIPAL PAR ÉTAT (15 novembre 2026) : tant que le code n'est pas parti, la page ne propose que de le recevoir ; une fois parti, elle ne propose que de signer, et renvoyer le code devient un geste discret. */}
                    {!(m.codeEnvoyeLe || envoi?.ok) ? (
                      <form action={envoiAct}>
                        <input type="hidden" name="id" value={m.id} />
                        <button className="btn primary" type="submit" disabled={envoyant || !dossier || injoignable}>
                          {envoyant ? "…" : t("Recevoir mon code")}
                        </button>
                      </form>
                    ) : (
                      <>
                        <Msg state={envoi} />
                        {envoi?.ok && envoi.code && (
                          <div className={styles.demo}>
                            {t("Code de démonstration :")} <b className="mono">{envoi.code}</b>
                          </div>
                        )}
                        <form action={signAct}>
                          <input type="hidden" name="id" value={m.id} />
                          <label className="field">
                            {t("Code reçu")}
                            <input name="code" inputMode="numeric" maxLength={6} placeholder={t("6 chiffres")} autoComplete="one-time-code" />
                          </label>
                          <BarreCollante>
                            <button className={`btn primary ${barre.suivant}`} type="submit" disabled={signant}>
                              {signant ? "…" : t("Je signe ce mandat")}
                            </button>
                          </BarreCollante>
                        </form>
                        <form action={envoiAct}>
                          <input type="hidden" name="id" value={m.id} />
                          <button className="btn sm ghost" type="submit" disabled={envoyant || !dossier || injoignable}>
                            {envoyant ? "…" : t("Renvoyer un code")}
                          </button>
                        </form>
                      </>
                    )}
                    <Msg state={sign} />
                  </div>
                )}

                {/* LA RÉVOCATION EST UN DROIT, DONC ELLE EST VISIBLE. La cacher
                    derrière un message au desk reviendrait à la supprimer.

                    ON NE RÉVOQUE PAS CE QUI N'A JAMAIS EU COURS. Un mandat
                    préparé et jamais signé n'autorise rien : « révoquer » y
                    décrit l'annulation d'un pouvoir qu'on n'a pas donné, et
                    le mot fait hésiter celui qui voudrait simplement effacer
                    un brouillon. Il se supprime, et le reste se révoque. */}
                {aRevoquer === m.id ? (
                  <form action={revocAct} className={styles.codeRow}>
                    <input type="hidden" name="id" value={m.id} />
                    <label className="field">
                      {t("Un mot, si vous voulez (facultatif)")}
                      <input name="motif" maxLength={160} />
                    </label>
                    <button type="button" className="btn sm ghost" onClick={() => setARevoquer(null)}>
                      {t("Garder")}
                    </button>
                    <button className="btn sm primary" type="submit" disabled={revoquant}>
                      {revoquant ? "…" : t(m.signeLe ? "Révoquer" : "Supprimer")}
                    </button>
                  </form>
                ) : (
                  <button type="button" className="btn sm" onClick={() => setARevoquer(m.id)}>
                    {t(m.signeLe ? "Révoquer ce mandat" : "Supprimer ce mandat")}
                  </button>
                )}
                <Msg state={revoc} />
              </li>
            ))}
          </ul>
        </section>
      )}

    </>
  );
}
