import Link from "next/link";
import { hrefDeLecture } from "@/lib/lecture";
import { LienExterne } from "./LienExterne";

/**
 * UN DOCUMENT D'UNE LIGNE : il se lit dans l'app (« /lire »), ou, quand il vit sur un site extérieur, il ne piège pas l'app installée (« LienExterne »).
 * Une seule écriture pour les fiches d'action, de fonds et de ligne.
 */
export function LienDeDocument({ d, offerId, index, className, children }: { d: { name: string; url?: string; fileKey?: string }; offerId: string; index: number; className?: string; children: React.ReactNode }) {
  if (d.url) return <LienExterne href={d.url} className={className}>{children}</LienExterne>;
  return (
    <Link href={hrefDeLecture(`/offres/${offerId}/doc/${index}`, { titre: d.name, de: `/offres/${offerId}` })} className={className}>
      {children}
    </Link>
  );
}
