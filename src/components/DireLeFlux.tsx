"use client";

import { useActionState, useState } from "react";
import { useT } from "@/i18n/client";
import type { FluxSuivi } from "@/lib/domain/encaissement";
import type { Temoignage } from "@/lib/domain/temoignage";
import { fmt, fmtDate } from "@/lib/format";
import { direLeFlux, type TemoignageResult } from "./temoignage-actions";
import styles from "./Reinvest.module.css";

/**
 * Donner la parole au seul témoin.
 *
 * La bande annonçait « l'émetteur doit encore ces sommes, et le desk les suit »,
 * avec ce commentaire : « aucun bouton, il n'y a rien à replacer tant que rien
 * n'est arrivé ». C'était vrai et incomplet. Il n'y avait rien à REPLACER, mais
 * pour un compte-titres tenu ailleurs il y avait quelque chose à DIRE, et la
 * seule personne qui pouvait le dire n'était pas consultée.
 *
 * TROIS RÉPONSES, PAS DEUX. « Reçu » et « rien » sont évidentes ; la troisième
 * est celle qui compte, parce que c'est la seule qui se perdrait autrement. Un
 * montant différent de celui annoncé se constate sans bruit : l'opérateur
 * confirme la somme attendue, et il a l'air d'avoir raison.
 *
 * Et ce que l'écran répond ne promet pas un encaissement, seulement d'aller
 * voir. Promettre le crédit referait, à l'envers, la faute que tout ce lot
 * corrige.
 */
export function DireLeFlux({ flux, deja }: { flux: FluxSuivi[]; deja: Record<string, Temoignage> }) {
  const t = useT();
  const [res, action, pending] = useActionState<TemoignageResult | null, FormData>(direLeFlux, null);
  const [autre, setAutre] = useState<string | null>(null);
  const [montant, setMontant] = useState("");
  const aujourdHui = new Date().toISOString().slice(0, 10);

  /* Deux phrases entières plutôt qu'une phrase en morceaux : « ... reçue » puis
     « le 8 juillet » se recollerait mal dans une autre langue, où la date ne se
     pose pas au même endroit. */
  const ditEnMots = (x: Temoignage) =>
    x.said === "recu"
      ? x.saidOn
        ? t("Vous avez dit l'avoir reçue le {j}.", { j: fmtDate(x.saidOn) })
        : t("Vous avez dit l'avoir reçue.")
      : x.said === "rien"
        ? t("Vous avez dit n'avoir rien reçu. Le desk relance l'émetteur.")
        : t("Vous avez dit avoir reçu {m} FCFA.", { m: fmt(Math.round(x.saidAmount ?? 0)) });

  return (
    <div className={styles.dire}>
      <p className={styles.direIntro}>{t("Ces sommes ont pu arriver sur votre compte sans que la maison le voie : si votre compte-titres est tenu ailleurs, vous êtes le seul à le savoir.")}</p>
      <ul className={styles.direListe}>
        {flux.map((f) => {
          const x = deja[f.cle];
          return (
            <li key={f.cle}>
              <span className={styles.direQuoi}>
                <b>{fmt(Math.round(f.amount))} FCFA</b> · {t(f.label)} · {f.titre} · {t("échue le {j}", { j: fmtDate(f.date) })}
              </span>
              {x ? (
                <span className={styles.direDit}>
                  {ditEnMots(x)}{" "}
                  <button type="button" className={styles.direLien} onClick={() => setAutre(autre === f.cle ? null : f.cle)}>
                    {t("Me reprendre")}
                  </button>
                </span>
              ) : (
                <span className={styles.direActs}>
                  <form action={action}>
                    <input type="hidden" name="flowKey" value={f.cle} />
                    <input type="hidden" name="said" value="recu" />
                    <input type="hidden" name="saidOn" value={aujourdHui} />
                    <button className="btn sm" type="submit" disabled={pending}>
                      {t("Je l'ai reçue")}
                    </button>
                  </form>
                  <form action={action}>
                    <input type="hidden" name="flowKey" value={f.cle} />
                    <input type="hidden" name="said" value="rien" />
                    <button className="btn sm" type="submit" disabled={pending}>
                      {t("Rien reçu")}
                    </button>
                  </form>
                  <button type="button" className={styles.direLien} onClick={() => setAutre(autre === f.cle ? null : f.cle)}>
                    {t("Un autre montant…")}
                  </button>
                </span>
              )}

              {autre === f.cle && (
                <form action={action} className={styles.direForm}>
                  <input type="hidden" name="flowKey" value={f.cle} />
                  <input type="hidden" name="said" value="autre" />
                  <label>
                    <span>{t("Somme réellement reçue")}</span>
                    <input name="saidAmount" required inputMode="numeric" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder={fmt(Math.round(f.amount))} />
                  </label>
                  <label>
                    <span>{t("Vue sur votre compte le")}</span>
                    <input type="date" name="saidOn" max={aujourdHui} />
                  </label>
                  <label className={styles.direNote}>
                    <span>{t("Un mot pour le desk (facultatif)")}</span>
                    <input name="note" maxLength={240} />
                  </label>
                  <div className={styles.direFoot}>
                    <button type="button" className="btn sm ghost" onClick={() => setAutre(null)}>
                      {t("Annuler")}
                    </button>
                    <button className="btn sm primary" type="submit" disabled={pending || !montant.trim()}>
                      {pending ? "…" : t("Envoyer au desk")}
                    </button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      {res && <p className={res.ok ? styles.direOk : styles.direKo}>{res.ok ? res.message : res.error}</p>}
    </div>
  );
}
