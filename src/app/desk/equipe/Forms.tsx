"use client";

import { useT } from "@/i18n/client";
import { ConfirmPublish } from "@/components/desk/ConfirmPublish";
import { Select } from "@/components/ui/Select";
import { useActionState, useId, useState } from "react";
import { addStaffAction, setNameAction, setRoleAction, type TeamResult } from "./actions";
import styles from "./page.module.css";

function Msg({ state }: { state: TeamResult | null }) {
  if (!state) return null;
  return <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>;
}

/**
 * Donner l'accès au desk.
 *
 * IL N'Y A PAS DE CASE « NOM », et ce n'est pas un oubli : ce formulaire ne crée
 * personne. Il cherche un compte qui EXISTE déjà, par son adresse, et lui lève
 * son niveau. Un nom tapé ici n'aurait rien à remplir, ou pire, permettrait de
 * renommer quelqu'un d'autre au passage. Le nom se corrige sur la ligne de la
 * personne, sous « Modifier ».
 *
 * UNE RELECTURE AVANT, parce que le geste ouvre les écrans du desk à quelqu'un :
 * il se défait, mais entre-temps la personne a tout vu. La feuille redit
 * l'adresse et le niveau, en toutes lettres.
 */
export function AddStaffForm() {
  const t = useT();
  const [state, action, pending] = useActionState<TeamResult | null, FormData>(addStaffAction, null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("desk");
  const formId = useId();
  const niveau = role === "responsable" ? t("Responsable du desk") : t("Opérateur");
  return (
    <form id={formId} action={action} className={styles.add}>
      <label>
        <span>{t("Adresse e-mail du compte")}</span>
        <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("prenom@purposecapital.africa")} required />
      </label>
      <label>
        <span>{t("Niveau")}</span>
        <Select block name="role" value={role} onChange={setRole} options={[{ value: "desk", label: t("Opérateur") }, { value: "responsable", label: t("Responsable du desk") }]} />
      </label>
      <ConfirmPublish
        form={formId}
        label={t("Donner l'accès")}
        title={t("Donner l'accès au desk")}
        lines={[
          `${t("Compte")} : ${email.trim() || t("adresse à saisir")}`,
          `${t("Niveau")} : ${niveau}`,
          role === "responsable" ? t("Un responsable approuve, gère l'équipe, fixe le barème de garde et publie les données de marché.") : t("Un opérateur traite les ordres, les dossiers et le courrier."),
        ]}
        confirmLabel={t("Donner l'accès")}
        disabled={!email.trim()}
        pending={pending}
      />
      <Msg state={state} />
    </form>
  );
}

/**
 * Corriger le nom affiché de quelqu'un.
 *
 * L'ADRESSE S'AFFICHE ET NE S'ÉDITE PAS : c'est l'identité de connexion, et la
 * changer ici sans la changer dans l'authentification couperait la personne de
 * son compte, en silence. Elle se change là où le compte se gouverne.
 */
export function NameForm({ userId, name, email }: { userId: string; name: string; email?: string }) {
  const t = useT();
  const [state, action, pending] = useActionState<TeamResult | null, FormData>(setNameAction, null);
  const [ouvert, setOuvert] = useState(false);
  if (!ouvert)
    return (
      <button type="button" className="btn sm ghost" onClick={() => setOuvert(true)}>
        {t("Modifier")}
      </button>
    );
  return (
    <form action={action} className={styles.inline}>
      <input type="hidden" name="userId" value={userId} />
      <input name="name" defaultValue={name} maxLength={80} required aria-label={t("Nom affiché")} />
      <small className="muted">{email ? t("{a} · l'adresse est l'identité de connexion et se change avec le compte.", { a: email }) : t("L'adresse est l'identité de connexion et se change avec le compte.")}</small>
      <button className="btn sm" type="submit" disabled={pending}>
        {t(pending ? "…" : "Enregistrer")}
      </button>
      <button type="button" className="btn sm ghost" onClick={() => setOuvert(false)}>
        {t("Annuler")}
      </button>
      <Msg state={state} />
    </form>
  );
}

export function RoleForm({ userId, role, self }: { userId: string; role: "desk" | "responsable"; self: boolean }) {
  const t = useT();
  const [state, action, pending] = useActionState<TeamResult | null, FormData>(setRoleAction, null);
  if (self) return <small className="muted">{t("vous")}</small>;
  return (
    <form action={action} className={styles.inline}>
      <input type="hidden" name="userId" value={userId} />
      <Select compact name="role" value={role} label={t("Niveau")} options={[{ value: "desk", label: t("Opérateur") }, { value: "responsable", label: t("Responsable du desk") }, { value: "client", label: t("retirer l'accès") }]} />
      <button className="btn sm" type="submit" disabled={pending}>
        {t(pending ? "…" : "Appliquer")}
      </button>
      <Msg state={state} />
    </form>
  );
}
