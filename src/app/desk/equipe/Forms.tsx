"use client";

import { useT } from "@/i18n/client";
import { Select } from "@/components/ui/Select";
import { useActionState } from "react";
import { addStaffAction, setRoleAction, type TeamResult } from "./actions";
import styles from "./page.module.css";

function Msg({ state }: { state: TeamResult | null }) {
  if (!state) return null;
  return <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>;
}

export function AddStaffForm() {
  const t = useT();
  const [state, action, pending] = useActionState<TeamResult | null, FormData>(addStaffAction, null);
  return (
    <form action={action} className={styles.add}>
      <label>
        <span>{t("Adresse e-mail du compte")}</span>
        <input name="email" type="email" placeholder={t("prenom@purposecapital.africa")} required />
      </label>
      <label>
        <span>{t("Niveau")}</span>
        <Select block name="role" value="desk" options={[{ value: "desk", label: "Opérateur desk" }, { value: "responsable", label: "Responsable" }]} />
      </label>
      <button className="btn sm primary" type="submit" disabled={pending}>
        {pending ? "…" : "Donner l'accès"}
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
      <Select compact name="role" value={role} label="Niveau" options={[{ value: "desk", label: "Opérateur desk" }, { value: "responsable", label: "Responsable" }, { value: "client", label: "— retirer l'accès" }]} />
      <button className="btn sm" type="submit" disabled={pending}>
        {pending ? "…" : "Appliquer"}
      </button>
      <Msg state={state} />
    </form>
  );
}
