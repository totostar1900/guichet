"use client";

import { useId, useState } from "react";
import { useT } from "@/i18n/client";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { Select } from "@/components/ui/Select";
import { CANCEL_REASONS, cancelReason, reasonForClient, packReason } from "@/lib/domain/cancel-reasons";
import { transitionIntent } from "../../actions";
import styles from "./page.module.css";

/**
 * Clore un ordre sans suite.
 *
 * C'était un bouton sans question et sans motif : un clic, l'ordre terminé, le
 * client prévenu que son intention « a été annulée », et six mois plus tard
 * personne ne savait pourquoi. Trois choses changent.
 *
 * Le mot d'abord : « Annuler » se lit aussi comme « laisser tomber ce que je
 * viens de cliquer ». « Clore sans suite » ne se lit que d'une façon.
 *
 * Le motif ensuite, choisi dans une liste fermée, parce que c'est lui que le
 * client lit et lui que le journal garde.
 *
 * La relecture enfin, qui nomme l'ordre et le client, et surtout montre la
 * phrase exacte qui partira. Composer un message à partir des faits ne vaut que
 * si celui qui l'envoie l'a lue : une phrase fausse qu'on ne lit plus est pire
 * qu'une case vide.
 */
export function CancelOrder({ intentId, ref_, clientName, offerTitle }: { intentId: string; ref_: string; clientName: string; offerTitle: string }) {
  const t = useT();
  const id = useId();
  const [key, setKey] = useState("");
  const [note, setNote] = useState("");
  const chosen = cancelReason(key);
  const needsNote = Boolean(chosen?.needsNote);
  const ready = Boolean(key) && (!needsNote || note.trim().length > 2);
  const sentence = ready ? reasonForClient(packReason(key, note)) : "";

  return (
    <form id={id} action={transitionIntent} className={styles.cancel}>
      <input type="hidden" name="intentId" value={intentId} />
      <input type="hidden" name="state" value="annulee" />
      <input type="hidden" name="reason" value={key} />
      <input type="hidden" name="reasonNote" value={note} />
      <Select
        compact
        name="reasonPick"
        label={t("Motif")}
        value={key}
        onChange={setKey}
        options={[{ value: "", label: t("Choisir un motif…") }, ...CANCEL_REASONS.map((r) => ({ value: r.key, label: t(r.label) }))]}
      />
      {key && (
        <input
          className={styles.cancelNote}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t(needsNote ? "Le motif, en une phrase : le client la lira" : "Précision (facultative) : elle remplacera la phrase type")}
          maxLength={180}
        />
      )}
      <ConfirmPublish
        form={id}
        className="btn ghost"
        label={t("Clore sans suite")}
        confirmLabel={t("Clore et prévenir le client")}
        title={t("Clore l'ordre {r} sans suite", { r: ref_ })}
        disabled={!ready}
        typed={ref_}
        lines={[
          t("{who} ne recevra pas d'exécution sur {line}.", { who: clientName, line: offerTitle }),
          t("Ce passage est définitif : l'ordre ne se rouvre pas."),
          t("Le client lira : « Votre ordre {r} est clos sans suite : {why}. Écrivez-nous si vous souhaitez le reprendre. »", { r: ref_, why: sentence }),
        ]}
      />
    </form>
  );
}
