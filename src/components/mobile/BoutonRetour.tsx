"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { retourEtape } from "./retourEtape";

/** Un « Retour » de formulaire : un vrai lien (il marche sans script), qui revient à l'étape précédente comme la flèche du haut. Voir « retourEtape ». */
export function BoutonRetour({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        retourEtape(router, href);
      }}
    >
      {children}
    </Link>
  );
}
