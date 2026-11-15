import Link from "next/link";
import { hrefDeLecture } from "@/lib/lecture";
import { LienExterne } from "@/components/LienExterne";
import { getT } from "@/i18n/server";
import { fmtDate } from "@/lib/format";
import type { PieceArchivee } from "@/lib/market/pieces";

const mo = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

/** Les copies conservées d'une entité : le titre ouvre la copie, l'adresse d'origine reste à côté, avec le jour de la prise et l'empreinte. */
export async function PiecesConservees({ pieces }: { pieces: PieceArchivee[] }) {
  const t = await getT();
  if (!pieces.length) return <p className="muted">{t("Aucune copie conservée pour le moment.")}</p>;
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--s-3)" }}>
      {pieces.map((p) => (
        <li key={p.id} style={{ display: "grid", gap: 2 }}>
          <Link href={hrefDeLecture(`/pieces/${p.id}`, { titre: p.titre })}>{p.titre}</Link>
          <small style={{ color: "var(--ink-3)" }}>
            {p.editeur} · {t("copie du")} {fmtDate(p.archiveLe.slice(0, 10))} · {p.typeMime === "application/pdf" ? "PDF" : p.typeMime === "text/html" ? "HTML" : "image"} · {mo(p.taille)} · SHA-256 {p.sha256.slice(0, 12)}
            {p.urlOrigine ? (
              <>
                {" · "}
                <LienExterne href={p.urlOrigine}>{t("adresse d'origine")} ↗</LienExterne>
              </>
            ) : null}
          </small>
        </li>
      ))}
    </ul>
  );
}
