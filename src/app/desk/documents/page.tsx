import Link from "next/link";
import styles from "../page.module.css";

export const metadata = { title: "Documents" };

export default function DocumentsPage() {
  return (
    <>
      <nav className={styles.sub} aria-label="Desk">
        <Link href="/desk">Carnet du jour</Link>
        <Link href="/desk/a-valider">À valider</Link>
        <Link href="/desk/documents" aria-current="page">
          Documents
        </Link>
      </nav>
      <div className={styles.placeholder}>
        <h2>Chaîne documentaire — prochaine étape</h2>
        Bulletin d&apos;ordre, appel de fonds, bordereau de soumission SVT avec annexe par client, avis de résultat, avis d&apos;opéré, ordre de cession : générés depuis les intentions et les offres, au moment de chaque transition.
      </div>
    </>
  );
}
