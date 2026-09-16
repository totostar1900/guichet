"use client";

import { useActionState } from "react";
import { addStaffAction, setRoleAction, type TeamResult } from "./actions";
import styles from "./page.module.css";

function Msg({ state }: { state: TeamResult | null }) {
  if (!state) return null;
  return <small className={state.ok ? styles.ok : styles.err}>{state.ok ? state.message : state.error}</small>;
}

export function AddStaffForm() {
  const [state, action, pending] = useActionState<TeamResult | null, FormData>(addStaffAction, null);
  return (
    <form action={action} className={styles.add}>
      <label>
        <span>Adresse e-mail du compte</span>
        <input name="email" type="email" placeholder="prenom@purposecapital.africa" required />
      </label>
      <label>
        <span>Niveau</span>
        <select name="role" defaultValue="desk">
          <option value="desk">Opérateur desk</option>
          <option value="responsable">Responsable</option>
        </select>
      </label>
      <button className="btn sm primary" type="submit" disabled={pending}>
        {pending ? "…" : "Donner l'accès"}
      </button>
      <Msg state={state} />
    </form>
  );
}

export function RoleForm({ userId, role, self }: { userId: string; role: "desk" | "responsable"; self: boolean }) {
  const [state, action, pending] = useActionState<TeamResult | null, FormData>(setRoleAction, null);
  if (self) return <small className="muted">vous</small>;
  return (
    <form action={action} className={styles.inline}>
      <input type="hidden" name="userId" value={userId} />
      <select name="role" defaultValue={role} aria-label="Niveau">
        <option value="desk">Opérateur desk</option>
        <option value="responsable">Responsable</option>
        <option value="client">— retirer l&apos;accès</option>
      </select>
      <button className="btn sm" type="submit" disabled={pending}>
        {pending ? "…" : "Appliquer"}
      </button>
      <Msg state={state} />
    </form>
  );
}
