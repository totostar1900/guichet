import Link from "next/link";
import styles from "../page.module.css";

export const metadata = { title: "À valider" };

export default function IntakePage() {
  return (
    <>
      <nav className={styles.sub} aria-label="Desk">
        <Link href="/desk">Carnet du jour</Link>
        <Link href="/desk/a-valider" aria-current="page">
          À valider
        </Link>
        <Link href="/desk/documents">Documents</Link>
      </nav>
      <div className={styles.placeholder}>
        <h2>File d&apos;entrée — prochaine étape</h2>
        Les communiqués reçus par e-mail, PDF ou photo arriveront ici : source à gauche, champs extraits à droite, décision du desk (prix, commission, ticket minimum) en bas. Publier crée la version suivante de l&apos;offre et déclenche les diffusions.
      </div>
    </>
  );
}
