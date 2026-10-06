/**
 * Le tiroir du rapport, en emplacement parallèle.
 *
 * Il reste vide tant que personne n'ouvre un rapport : « default.tsx » rend
 * null. Quand le tableau mène à une séance, la route interceptée remplit
 * cet emplacement au lieu de remplacer la page, et la liste garde son
 * défilement, ses filtres et sa vue.
 */
export default function DispositionBulletins(props: { children: React.ReactNode; rapport?: React.ReactNode }) {
  return (
    <>
      {props.children}
      {props.rapport}
    </>
  );
}
