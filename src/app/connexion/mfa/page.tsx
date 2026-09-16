import { redirect } from "next/navigation";
import { getSession, mfaRequired } from "@/lib/auth";
import { isDesk } from "@/lib/auth/types";
import { COMPANY } from "@/lib/config";
import { MfaForm } from "./MfaForm";
import { startEnrol, type MfaState } from "./actions";
import styles from "../page.module.css";

export const metadata = { title: "Second facteur" };

/** Desk second factor: enrol once (QR), then a 6-digit code at each login. */
export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string; enrol?: string }> }) {
  const { next = "/desk", enrol } = await searchParams;
  const s = await getSession();
  if (!s) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  if (!isDesk(s) || s.provider !== "supabase" || !mfaRequired()) redirect(next.startsWith("/") ? next : "/desk");
  if (s.mfaVerified && !enrol) redirect(next.startsWith("/") ? next : "/desk");

  const wantsEnrol = Boolean(enrol) || !s.mfaEnrolled;
  const initial: MfaState = wantsEnrol ? await startEnrol() : { step: "verify", factorId: "" };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className="eyebrow">{COMPANY.name} · desk</div>
        <h1 className="display">{wantsEnrol ? "Activer le second facteur" : "Second facteur"}</h1>
        <p className={styles.lead}>
          {wantsEnrol
            ? "L'accès desk (prix, publication, clients) exige une deuxième preuve d'identité : un code qui change toutes les 30 secondes sur votre téléphone. Un code e-mail seul ne suffit pas pour agir au nom de la société."
            : `Bonjour ${s.name}. Pour entrer sur le desk, ajoutez le code de votre application d'authentification.`}
        </p>
        <MfaForm initial={initial} next={next} />
      </div>
    </div>
  );
}
