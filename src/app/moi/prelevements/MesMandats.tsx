"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { fmt, fmtDate, fmtDateTime } from "@/lib/format";
import { groupedInput } from "@/lib/ui/grouped";
import { Select } from "@/components/ui/Select";
import { creerMandatAction, envoyerCodeMandatAction, revoquerMandatAction, signerMandatAction, type MandatResult } from "./actions";
import styles from "./page.module.css";

interface Vu {
  id: string;
  ref: string;
  objet: "provision" | "instruction";
  titulaire: string;
  banque: string;
  compte: string;
  /** Le montant signé : celui qui est présenté, et le seul qu'il y ait. */
  montant: number;
  jour?: number;
  etat: "actif" | "suspendu" | "revoque";
  signeLe?: string;
  /** L'exemplaire produit à la signature, s'il existe : la pièce que la banque réclame. */
  piece?: string;
  codeEnvoyeA?: string;
  codeEnvoyeLe?: string;
  revoqueLe?: string;
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
  instructions,
  instructionDemandee,
  titulaireParDefaut,
  banqueParDefaut,
  compteParDefaut,
  canal,
  dossier,
  injoignable,
  jourMin,
  jourMax,
}: {
  mandats: Vu[];
  instructions: { id: string; ref: string; montant: number; jour: number }[];
  titulaireParDefaut: string;
  banqueParDefaut: string;
  compteParDefaut: string;
  canal?: { to: string; parMail: boolean };
  /** Le dossier existe-t-il ? Sans lui, aucun code ne peut partir. */
  dossier: boolean;
  /** Aucune adresse où faire parvenir le code, ni plus tard les préavis. */
  injoignable: boolean;
  jourMin: number;
  jourMax: number;
  /** L'instruction qu'on vient de signer, quand on arrive de là. */
  instructionDemandee?: string;
}) {
  const t = useT();
  const [creer, creerAct, creation] = useActionState<MandatResult | null, FormData>(creerMandatAction, null);
  const [envoi, envoiAct, envoyant] = useActionState<MandatResult | null, FormData>(envoyerCodeMandatAction, null);
  const [sign, signAct, signant] = useActionState<MandatResult | null, FormData>(signerMandatAction, null);
  const [revoc, revocAct, revoquant] = useActionState<MandatResult | null, FormData>(revoquerMandatAction, null);
  const connue = instructions.some((i) => i.id === instructionDemandee);
  const vivants = mandats.filter((m) => m.etat !== "revoque");
  const anciens = mandats.filter((m) => m.etat === "revoque");
  const [objet, setObjet] = useState<"provision" | "instruction">(connue ? "instruction" : "provision");
  /* LE FORMULAIRE EST OUVERT QUAND IL N'Y A RIEN D'AUTRE À LIRE.
     Relevé le 25 octobre 2026 : un client arrivait de « Approvisionner votre
     compte » en cliquant « Mettre en place un prélèvement », et tombait sur un
     écran dont le seul contenu était un bouton « Préparer un mandat ». Deux
     clics pour la même intention, et le second n'apprend rien — c'est la page
     intermédiaire dans la page. Quand une autorisation existe déjà, le repli
     garde son sens : la liste est alors ce qu'on vient lire, et en ajouter une
     seconde est un geste délibéré. */
  const [ouvert, setOuvert] = useState(connue || vivants.length === 0);
  const [aRevoquer, setARevoquer] = useState<string | null>(null);
  const [quelle, setQuelle] = useState((connue && instructionDemandee) || instructions[0]?.id || "");
  /* Contrôlés, parce que le regroupement replace le curseur après chaque
     touche : un champ non contrôlé renverrait le curseur au bout. */
  const [montant, setMontant] = useState("");

  return (
    <>
      {vivants.length > 0 && (
        <section className={styles.bloc}>
          <h2>{t("Vos autorisations")}</h2>
          <ul className={styles.liste}>
            {vivants.map((m) => (
              /* L'ANCRE DU RAPPEL : son second lien renvoie ici, sur le
                 mandat qui attend sa signature. Sans elle, le client qui a
                 cliqué « supprimer ce mandat » dans un message atterrissait
                 en haut d'une page et devait le retrouver. */
              <li key={m.id} className={styles.mandat} id={m.signeLe ? undefined : "mandat"}>
                <div className={styles.mTete}>
                  <b>{m.objet === "provision" ? t("Alimenter ma provision") : t("Alimenter mon épargne programmée")}</b>
                  {/* « ARRÊTÉ », et non « suspendu » : « suspendu » décrit ce que la
                      maison peut reprendre, et le client n'a pas à deviner s'il
                      sera prélevé le mois prochain. */}
                  <span className={m.signeLe ? styles.actif : styles.attente}>{m.signeLe ? (m.etat === "suspendu" ? t("arrêté") : t("actif")) : t("à signer")}</span>
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
                      <a href={`/api/documents/mandat-apercu/${m.id}`} target="_blank" rel="noopener noreferrer">
                        {t("Lire le mandat avant de le signer")} ↗
                      </a>{" "}
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
                    <form action={envoiAct}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="btn primary" type="submit" disabled={envoyant || !dossier || injoignable}>
                        {envoyant ? "…" : m.codeEnvoyeLe ? t("Renvoyer un code") : t("Recevoir mon code")}
                      </button>
                    </form>
                    <Msg state={envoi} />
                    {envoi?.ok && envoi.code && (
                      <div className={styles.demo}>
                        {t("Code de démonstration :")} <b className="mono">{envoi.code}</b>
                      </div>
                    )}
                    <form action={signAct} className={styles.codeRow}>
                      <input type="hidden" name="id" value={m.id} />
                      <label className="field">
                        {t("Code reçu")}
                        <input name="code" inputMode="numeric" maxLength={6} placeholder={t("6 chiffres")} autoComplete="one-time-code" />
                      </label>
                      <button className="btn primary" type="submit" disabled={signant}>
                        {signant ? "…" : t("Je signe ce mandat")}
                      </button>
                    </form>
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

      <section className={styles.bloc}>
        <h2>{vivants.length ? t("En ajouter un") : t("Autoriser un prélèvement")}</h2>
        {/* LE DIRE AVANT, PAS APRÈS. Préparer un mandat qu'on ne pourra pas
            signer, c'est remplir sept champs pour s'entendre refuser au
            dernier geste. La condition se lit donc ici aussi, et elle est la
            même : une adresse où le code, puis chaque préavis, peut arriver. */}
        {injoignable ? (
          <p className={styles.note}>
            {t("Il nous faut une adresse e-mail avant de signer : c'est là que part le code, puis l'annonce de chaque prélèvement.")}{" "}
            <Link href="/moi/securite#canaux">{t("Ajouter mon adresse →")}</Link>
          </p>
        ) : !ouvert ? (
          <button type="button" className="btn primary" onClick={() => setOuvert(true)}>
            {t("Préparer un mandat")}
          </button>
        ) : (
          <form action={creerAct} className={styles.form}>
            <fieldset className={styles.choix}>
              <legend>{t("À quoi sert ce prélèvement ?")}</legend>
              {/* UN MANDAT PAR USAGE : le choix est ici, et il n'y a pas de
                  « les deux ». Un mandat général serait juridiquement fragile
                  et commercialement effrayant. */}
              <label>
                <input type="radio" name="objet" value="provision" checked={objet === "provision"} onChange={() => setObjet("provision")} />
                {t("Alimenter ma provision, chaque mois")}
              </label>
              <label>
                <input type="radio" name="objet" value="instruction" checked={objet === "instruction"} onChange={() => setObjet("instruction")} disabled={!instructions.length} />
                {instructions.length ? t("Alimenter une épargne programmée") : t("Alimenter une épargne programmée (vous n'en avez pas encore)")}
              </label>
            </fieldset>

            {/* La liste de la maison, pas la native : au téléphone, celle du
                système s'ouvre en roue, sans la phrase qui dit ce que chaque
                ligne est. Un cliquet garde la règle, invisible autrement. */}
            {objet === "instruction" && (
              <Select
                name="standingId"
                label={t("Laquelle")}
                block
                value={quelle}
                onChange={setQuelle}
                options={instructions.map((i) => ({ value: i.id, label: t("{r} · {m} FCFA le {j}", { r: i.ref, m: fmt(i.montant), j: String(i.jour) }) }))}
              />
            )}

            {/* UN SEUL MONTANT, ET POUR LES DEUX USAGES. Le formulaire
                demandait un montant pour la provision et un « plafond par
                échéance » pour une épargne programmée, dont le montant venait
                de l'instruction : le client signait alors une autorisation sans
                y écrire de chiffre. Depuis le 25 octobre 2026 il écrit le sien
                dans les deux cas, et c'est celui-là qui est présenté. */}
            <div className={styles.deux}>
              <label className="field">
                {t("Montant prélevé chaque mois")}
                <input name="amount" inputMode="numeric" placeholder="50 000" value={montant} {...groupedInput(setMontant)} />
              </label>
              {objet === "provision" && (
                <label className="field">
                  {t("Jour du mois ({a} à {b})", { a: String(jourMin), b: String(jourMax) })}
                  <input name="dayOfMonth" inputMode="numeric" placeholder="5" />
                </label>
              )}
            </div>
            <p className={styles.note}>{t("C'est ce montant exact qui sera présenté à votre banque, ni plus ni moins. Il n'y a pas de plafond à côté : pour le changer, vous signez un nouveau mandat.")}</p>

            <div className={styles.deux}>
              <label className="field">
                {t("Titulaire du compte à débiter")}
                <input name="accountHolder" defaultValue={titulaireParDefaut} maxLength={80} />
              </label>
              <label className="field">
                {/* « Banque » seul est déjà le secteur d une société cotée : deuxième
                    fois dans la journée que ce mot court fait une clef fragile. */}
                {t("Banque du compte à débiter")}
                <input name="bankName" defaultValue={banqueParDefaut} maxLength={80} />
              </label>
            </div>
            <label className="field">
              {t("RIB ou IBAN du compte à débiter")}
              <input name="bankAccount" defaultValue={compteParDefaut} maxLength={60} />
            </label>
            <p className={styles.note}>{t("Ce compte doit être ouvert à votre nom. Nous ne présentons jamais de prélèvement sur le compte d'un tiers.")}</p>

            <div className={styles.actions}>
              <button type="button" className="btn ghost" onClick={() => setOuvert(false)}>
                {t("Annuler")}
              </button>
              <button className="btn primary" type="submit" disabled={creation}>
                {creation ? "…" : t("Préparer, puis signer")}
              </button>
            </div>
            <Msg state={creer} />
          </form>
        )}
      </section>

      {anciens.length > 0 && (
        <section className={styles.bloc}>
          <h2>{t("Révoqués")}</h2>
          {/* ILS RESTENT, et ce n'est pas de l'encombrement : une contestation
              porte sur un tirage passé, et une ligne effacée ne se conteste
              plus. */}
          <ul className={styles.liste}>
            {anciens.map((m) => (
              <li key={m.id} className={styles.ancien}>
                <span className="mono">{m.ref}</span> · {m.objet === "provision" ? t("Provision") : t("Épargne programmée")} · {t("révoqué le {d}", { d: fmtDate(m.revoqueLe ?? "") })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
