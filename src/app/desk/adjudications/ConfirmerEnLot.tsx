"use client";

import { useActionState } from "react";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { useT } from "@/i18n/client";
import { confirmBatchAction, type ResultOutcome } from "./actions";
import styles from "./ConfirmerEnLot.module.css";

/**
 * Signer une file entière, et savoir ce qu'on signe.
 *
 * Confirmer n'est pas ranger : à partir de la signature, le taux fonde les
 * indications du desk. Un bouton qui en signe soixante-dix d'un coup mérite
 * donc l'étage le plus haut de la maison, celui du mot à recopier, et non un
 * « êtes-vous sûr » qui entre dans le rythme du clic en une semaine.
 *
 * La boîte nomme trois nombres, et ce sont les trois qui décident : combien
 * seront signées, combien resteront muettes faute de taux publié, combien de
 * points de courbe on y gagne. Une séance tchadienne qui ne publie qu'une
 * fourchette est recevable et ne donnera jamais de rendement : la signer n'est
 * pas une faute, c'est une chose à savoir avant et non après.
 */
export function ConfirmerEnLot({
  instrument,
  enAttente,
  muettes,
  pointsGagnes,
}: {
  instrument: "BTA" | "OTA";
  /** Les séances que l'action signera réellement, irrecevables déduites. */
  enAttente: number;
  /** Parmi elles, celles qui ne donneront aucun rendement. */
  muettes: number;
  pointsGagnes: number;
}) {
  const t = useT();
  const [state, action, pending] = useActionState<ResultOutcome | null, FormData>(confirmBatchAction, null);
  if (!enAttente) return null;

  return (
    <div className={styles.lot}>
      <form id="lot-confirm" action={action}>
        <input type="hidden" name="instrument" value={instrument} />
      </form>
      <p className={styles.quoi}>
        {t("{n} séances {i} attendent une signature.", { n: enAttente, i: instrument })}{" "}
        {pointsGagnes > 0
          ? t("Les confirmer ajoute {p} point(s) à la courbe.", { p: pointsGagnes })
          : t("Aucune n'ajoutera de point à la courbe.")}
      </p>
      <ConfirmPublish
        form="lot-confirm"
        label={t("Confirmer les {n} {i}", { n: enAttente, i: instrument })}
        title={t("Signer {n} séances d'un coup", { n: enAttente })}
        lines={[
          t("{n} séances passent de « à relire » à « relue », sous votre nom.", { n: enAttente }),
          t("À partir de là, leurs taux fondent les indications du desk et entrent dans la courbe."),
          muettes > 0
            ? t("{n} d'entre elles ne publient qu'une fourchette : elles seront signées et ne donneront aucun rendement.", { n: muettes })
            : t("Toutes donnent un rendement calculable."),
          t("Chaque séance écrit son entrée au journal d'audit, comme une confirmation unitaire."),
          t("Une séance signée par erreur se rouvre séance par séance, depuis sa fiche."),
        ]}
        confirmLabel={t("Signer les {n}", { n: enAttente })}
        typed={t("relu")}
        className="btn sm primary"
        pending={pending}
      />
      {state?.ok === false && <p className={styles.erreur}>{state.error}</p>}
      {state?.ok && <p className={styles.fait}>{state.message}</p>}
    </div>
  );
}
