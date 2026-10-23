"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { identityAction, type IdentityResult } from "@/app/moi/actions";
import { telLisible } from "@/lib/format";
import styles from "@/components/Feuillet.module.css";

/**
 * L'IDENTITÉ ET LES DEUX CANAUX, SUR LA PAGE QUI LEUR REVIENT.
 *
 * Ces trois lignes étaient coincées dans la feuille du compte, entre une
 * recherche et huit tuiles — alors qu'elles sont exactement ce qu'une
 * pastille d'identité devrait porter, et la seule chose qui ne vive nulle
 * part ailleurs.
 *
 * LE NOM EST CELUI DE LA PIÈCE D'IDENTITÉ, et la page le dit avant la
 * saisie : il s'imprime sur les bulletins et les relevés, et un nom d'usage
 * qui ne correspond pas à la pièce fait recaler un virement à la banque. Le
 * dire après coup, dans un message d'erreur, serait le dire trop tard.
 *
 * UN CANAL SE CHANGE AILLEURS, et le lien le dit plutôt que de le cacher :
 * changer d'adresse demande d'en prouver une nouvelle par un code, ce qui est
 * une procédure et non un champ. La page de sécurité la porte déjà ; la
 * refaire ici en ferait une seconde, qui divergerait.
 */
export function Identite({ nom, segment, email, emailOk, phone, phoneOk }: { nom: string; segment: string; email?: string; emailOk?: boolean; phone?: string; phoneOk?: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<IdentityResult | null, FormData>(identityAction, null);
  const [ouvert, setOuvert] = useState(false);

  const [genre] = segment.split("·").map((x) => x.trim());
  const vu = state?.ok ? { nom: state.name, segment: state.segment } : { nom, segment };
  const [, villeVue = ""] = vu.segment.split("·").map((x) => x.trim());

  return (
    <>
      <section className={styles.bloc}>
        <h2>{t("Identité")}</h2>
        {ouvert ? (
          <form action={action} className={styles.form}>
            <label className="field">
              {t("Nom")}
              <input name="name" defaultValue={vu.nom} maxLength={80} required autoComplete="name" />
            </label>
            <label className="field">
              {t("Ville")}
              <input name="city" defaultValue={villeVue} maxLength={60} autoComplete="address-level2" />
            </label>
            <p className={styles.note}>{t("Écrivez votre nom tel qu'il figure sur votre pièce d'identité : c'est lui qui s'imprime sur vos bulletins et vos relevés, et c'est lui que votre banque lit sur un virement.")}</p>
            <div className={styles.gestes}>
              <button className="btn sm primary" type="submit" disabled={pending}>
                {t(pending ? "…" : "Enregistrer")}
              </button>
              <button className="btn sm ghost" type="button" onClick={() => setOuvert(false)}>
                {t("Annuler")}
              </button>
            </div>
            {state && !state.ok && <small className={styles.err}>{t(state.error)}</small>}
          </form>
        ) : (
          <div className={styles.ligne}>
            <span>
              <b>{vu.nom}</b>
              {/* « Personne physique » vient de la session et traverse t() en
                  variable : le dictionnaire le connaît, le scanner de clefs
                  non. C'est voulu — la qualité juridique est une donnée. */}
              <small>
                {t(genre)}
                {villeVue ? ` · ${villeVue}` : ""}
              </small>
            </span>
            <button type="button" className={styles.chg} onClick={() => setOuvert(true)}>
              {t("Changer")}
            </button>
          </div>
        )}
        {state?.ok && !ouvert && <small className={styles.ok}>{t("C'est enregistré.")}</small>}
      </section>

      <section className={styles.bloc}>
        <h2>{t("Vos canaux")}</h2>
        {/* PROUVÉ VEUT DIRE QUELQUE CHOSE, et la page le dit : c'est le canal
            sur lequel un code peut partir. Une adresse non prouvée reçoit les
            avis mais ne signe rien. */}
        <div className={styles.ligne}>
          <span>
            <b>{email ?? t("E-mail à renseigner")}</b>
            <small>{email ? t(emailOk ? "prouvé" : "à prouver") : t("aucune adresse connue")}</small>
          </span>
          <Link href="/moi/securite#canaux" className={styles.chg}>
            {t(email ? "Changer" : "Ajouter")}
          </Link>
        </div>
        <div className={styles.ligne}>
          <span>
            <b>{phone ? telLisible(phone) : t("WhatsApp à renseigner")}</b>
            <small>{phone ? t(phoneOk ? "prouvé" : "à prouver") : t("aucun numéro connu")}</small>
          </span>
          <Link href="/moi/securite#canaux" className={styles.chg}>
            {t(phone ? "Changer" : "Ajouter")}
          </Link>
        </div>
        <p className={styles.note}>{t("Un canal prouvé est celui sur lequel un code à usage unique peut partir : c'est ce qui vous permet de signer. Tant qu'aucun ne l'est, le desk vous appelle.")}</p>
      </section>
    </>
  );
}
