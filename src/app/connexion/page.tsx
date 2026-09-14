import { redirect } from "next/navigation";
import { authMode, getSession } from "@/lib/auth";
import { COMPANY } from "@/lib/config";
import { EmailOtpForm } from "./EmailOtpForm";
import { devLogin } from "./actions";
import styles from "./page.module.css";

export const metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams;
  if (await getSession()) redirect(next.startsWith("/") ? next : "/");
  const mode = authMode();

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className="eyebrow">{COMPANY.name}</div>
        <h1 className="display">Se connecter</h1>
        {mode === "supabase" ? (
          <>
            <p className={styles.lead}>Recevez un code à usage unique par e-mail. Aucun mot de passe à retenir. La connexion WhatsApp arrive avec l&apos;étape suivante.</p>
            <EmailOtpForm next={next} />
          </>
        ) : (
          <>
            <p className={styles.lead}>
              <b>Mode démonstration</b> — aucun backend configuré. Choisissez un rôle pour parcourir le Guichet comme un client ou comme le desk. En production, la connexion se fait par code e-mail ou WhatsApp.
            </p>
            <div className={styles.two}>
              <form action={devLogin} className={styles.devForm}>
                <input type="hidden" name="role" value="client" />
                <input type="hidden" name="next" value={next} />
                <h2>Client</h2>
                <label className="field">
                  Nom affiché
                  <input name="name" defaultValue="G. Nitcheu" required minLength={2} />
                </label>
                <label className="field">
                  Segment
                  <select name="segment" defaultValue="Personne physique · Yaoundé">
                    <option>Personne physique · Yaoundé</option>
                    <option>Personne physique · Douala</option>
                    <option>Diaspora · Paris</option>
                    <option>Groupement · Yaoundé</option>
                    <option>Entreprise · Bangui</option>
                    <option>Institutionnel · Libreville</option>
                  </select>
                </label>
                <button className="btn primary" type="submit">
                  Entrer comme client
                </button>
              </form>
              <form action={devLogin} className={styles.devForm}>
                <input type="hidden" name="role" value="desk" />
                <input type="hidden" name="next" value={next.startsWith("/desk") ? next : "/desk"} />
                <h2>Desk</h2>
                <label className="field">
                  Conseiller
                  <input name="name" defaultValue="Georges" required minLength={2} />
                </label>
                <p className={styles.hint}>Accès au carnet, aux intentions et à la publication des prix.</p>
                <button className="btn" type="submit">
                  Entrer comme desk
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
