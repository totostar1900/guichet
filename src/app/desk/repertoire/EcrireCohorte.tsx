"use client";

import { useActionState, useState } from "react";
import { preparerEnvoiAction, type EnvoiResult } from "./envoi-actions";
import { MENTIONS } from "@/lib/domain/envoi-cohorte";
import { COHORTE_LABEL } from "@/lib/domain/cohortes";
import { useT } from "@/i18n/client";
import styles from "./page.module.css";

/**
 * D'UNE COHORTE À UN MESSAGE.
 *
 * La feuille s'ouvre du bord de son déclencheur, qui est la pastille de la
 * cohorte : c'est la règle du dock, et la maquette la suit déjà en écrivant
 * « depuis le répertoire · cohorte fidèles » en sur-titre.
 *
 * ELLE PRÉPARE, ELLE N'ENVOIE PAS, et le bouton de la maquette le dit :
 * « Préparer l'envoi aux 7 ». Un message libre à plusieurs clients à la fois
 * n'est pas un geste qu'on fait d'un clic : il part après qu'un second
 * responsable l'a lu.
 */
export function EcrireCohorte({
  cohorte,
  plan,
}: {
  cohorte: string;
  plan: { dansLaCohorte: number; joignables: number; sansCanal: number; parWhatsapp: number; parEmail: number };
}) {
  const t = useT();
  const [ouvert, setOuvert] = useState(false);
  const [res, action, enCours] = useActionState<EnvoiResult | null, FormData>(preparerEnvoiAction, null);

  if (!ouvert)
    return (
      <button type="button" className="btn sm" onClick={() => setOuvert(true)}>
        {t("Écrire à {n} client(s)", { n: plan.joignables })}
      </button>
    );

  return (
    <form action={action} className={styles.ecrire}>
      <input type="hidden" name="cohorte" value={cohorte} />
      <div className={styles.ecrireTete}>
        <span className="eyebrow">
          {t("Depuis le répertoire")} · {t(COHORTE_LABEL[cohorte as keyof typeof COHORTE_LABEL] ?? cohorte)}
        </span>
        <h2>{t("Écrire à {n} client(s)", { n: plan.joignables })}</h2>
      </div>

      {/* LES QUATRE COMPTEURS DE LA MAQUETTE. Celui qui ne recevra rien se
          compte et se dit : sans lui, le desk croirait avoir prévenu tout le
          groupe. */}
      <dl className={styles.compteurs}>
        <div>
          <dt>{t("Dans la cohorte")}</dt>
          <dd className="num">{plan.dansLaCohorte}</dd>
        </div>
        <div>
          <dt>{t("Ont accepté les informations")}</dt>
          <dd className="num">{plan.joignables}</dd>
        </div>
        <div>
          <dt>{t("Ne recevront rien")}</dt>
          <dd className="num">{plan.sansCanal}</dd>
        </div>
        <div>
          <dt>{t("Par WhatsApp · par e-mail")}</dt>
          <dd className="num">
            {plan.parWhatsapp} · {plan.parEmail}
          </dd>
        </div>
      </dl>
      <p className={styles.ecrireNote}>
        {t(
          "Ceux qui n'ont pas accepté restent dans la cohorte et gardent tous leurs droits : le consentement commande l'envoi, jamais l'appartenance au groupe. Les comptes de démonstration sont déjà hors de ce compte.",
        )}
      </p>

      <label>
        <span>{t("Objet")}</span>
        <input name="objet" maxLength={120} required placeholder={t("ce qui s'affiche avant le texte")} />
      </label>
      <label>
        <span>{t("Texte")}</span>
        <textarea name="corps" rows={6} maxLength={1200} required placeholder={t("ce que le client lira")} />
      </label>

      <p className={styles.mentions}>
        {t("Ajouté par le modèle, et non retirable")} : {MENTIONS.join(" ")}
      </p>

      <div className={styles.ecrirePied}>
        <button className="btn sm" type="submit" disabled={enCours}>
          {enCours ? t("Préparation…") : t("Préparer l'envoi aux {n}", { n: plan.joignables })}
        </button>
        <button type="button" className="btn sm ghost" onClick={() => setOuvert(false)}>
          {t("Annuler")}
        </button>
      </div>
      {res?.error && <p className={styles.erreur}>{res.error}</p>}
      {res?.ok && <p className={styles.ecrireNote}>{res.ok}</p>}
      <p className={styles.ecrireNote}>
        {t("Une cohorte sert à choisir qui prévenir d'une ligne, jamais à moduler un prix ni une condition : deux clients devant la même offre lisent le même prix.")}
      </p>
    </form>
  );
}
