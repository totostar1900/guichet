"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import { fmt } from "@/lib/format";
import { porterAuJournal, type EncaissementResult } from "./actions";
import styles from "./page.module.css";

/**
 * Le geste de la page, et pourquoi ce n'est plus un bouton.
 *
 * C'en était un, et il inscrivait le montant attendu daté de l'échéance : la
 * machine prédisait, et l'opérateur confirmait la prédiction. Trois champs
 * remplacent ce clic, et l'écart se calcule sous les doigts : voir « manque
 * 20 000 » pendant qu'on tape est ce qui fait relire la pièce.
 *
 * Le repos reste un bouton, parce qu'une file de quarante lignes qui ouvre
 * quarante formulaires ne se lit plus. Il ouvre le sien, à sa place.
 *
 * Un message d'enregistrement rendu en haut de l'écran pendant que le bouton
 * est en bas ne se voit jamais : l'opérateur regarde sa ligne, pas l'en-tête.
 * Chaque formulaire porte donc sa propre réponse, et le refus « déjà portée »
 * est une bonne nouvelle plutôt qu'une erreur, ce que sa couleur doit dire.
 */
export function Encaisser({ userId, flux }: { userId: string; flux: { cle: string; amount: number; label: string; date: string; titre: string } }) {
  const t = useT();
  const [res, action, pending] = useActionState<EncaissementResult | null, FormData>(porterAuJournal, null);
  const [ouvert, setOuvert] = useState(false);
  const attendu = Math.round(flux.amount);
  const [recu, setRecu] = useState(String(attendu));
  const n = Number(recu.replace(/\s/g, ""));
  const ecart = Number.isFinite(n) && n > 0 ? Math.round(n) - attendu : 0;

  if (!ouvert)
    return (
      <div className={styles.encaisser}>
        <button className="btn sm" type="button" onClick={() => setOuvert(true)}>
          {t("Enregistrer…")}
        </button>
        {res?.ok && <span className={styles.ok}>{res.message}</span>}
      </div>
    );

  return (
    <form action={action} className={styles.constat}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="flowKey" value={flux.cle} />
      <input type="hidden" name="expected" value={attendu} />
      <input type="hidden" name="label" value={flux.label} />
      <input type="hidden" name="date" value={flux.date} />
      <input type="hidden" name="titre" value={flux.titre} />
      <label>
        <span>{t("Pièce")}</span>
        <input name="evidence" required minLength={3} maxLength={120} placeholder={t("ex. avis teneur de compte n° 4471, ou relevé du 16/10 ligne 42")} />
      </label>
      <label>
        <span>{t("Montant reçu")}</span>
        <input name="amount" required inputMode="numeric" value={recu} onChange={(e) => setRecu(e.target.value)} />
      </label>
      <label>
        <span>{t("Date de valeur")}</span>
        <input type="date" name="valueOn" required max={new Date().toISOString().slice(0, 10)} />
      </label>
      {/* L'écart sous les doigts : c'est lui qui fait relire la pièce. */}
      <p className={ecart ? styles.ecartVif : styles.ecartNul}>
        {ecart
          ? t("Attendu {a}, reçu {r} : écart de {e}.", { a: fmt(attendu), r: fmt(Math.round(n)), e: `${ecart > 0 ? "+" : ""}${fmt(ecart)}` })
          : t("Attendu {a}, et c'est ce que vous inscrivez.", { a: fmt(attendu) })}
      </p>
      <div className={styles.constatFoot}>
        <button className="btn sm ghost" type="button" onClick={() => setOuvert(false)}>
          {t("Annuler")}
        </button>
        <button className="btn sm primary" type="submit" disabled={pending}>
          {pending ? t("Inscription…") : t("Inscrire au journal")}
        </button>
      </div>
      {res && <span className={res.ok ? styles.ok : styles.ko}>{res.ok ? res.message : res.error}</span>}
    </form>
  );
}
