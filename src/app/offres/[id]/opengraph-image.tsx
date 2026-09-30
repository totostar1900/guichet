import { ImageResponse } from "next/og";
import { repo } from "@/lib/data";
import { COUNTRY_CODE } from "@/lib/domain/summary";
import { COMPANY, PRODUCT } from "@/lib/config";
import { identite } from "./identite";

/**
 * L'image qu'une messagerie montre sous une ligne partagée.
 *
 * ELLE A ÉTÉ LE DERNIER TROU DE LA PORTE. Elle dessinait le rendement en or
 * sur 96 pixels, le titre avec son coupon, la variation à douze mois d'un
 * fonds, et l'ISIN. Une image est lue par le robot de la messagerie, qui n'a
 * pas de session : elle publiait donc, dans chaque conversation, exactement
 * les chiffres que la page retient, et par un canal que personne ne contrôle.
 * Le reste de la carte avait été corrigé avant elle, ce qui est la façon dont
 * ces fuites survivent : on répare le texte et on oublie le dessin.
 *
 * Elle porte maintenant la même chose que la page et que sa description :
 * l'identité de la ligne. La nature et la durée en grand, l'émetteur en
 * dessous, la maison et son agrément au pied. Aucun chiffre de marché, aucune
 * date de séance, aucun ISIN.
 */
export const alt = "La ligne, et chez qui elle se traite";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const NAVY = "#0d2b5b";
const GOLD = "#d4a63c";
const MUTED = "#c3c9d4";

/** Manrope from Google Fonts, fetched once per instance; the default face if the network says no. */
async function fonts(): Promise<{ name: string; data: ArrayBuffer; weight: 500 | 800 }[]> {
  const load = async (weight: 500 | 800) => {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Manrope:wght@${weight}&display=swap`, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
    const url = css.match(/src: url\(([^)]+)\) format\('(?:truetype|opentype|woff)'\)/)?.[1] ?? css.match(/url\(([^)]+\.ttf)\)/)?.[1];
    if (!url) throw new Error("no font url");
    const data = await fetch(url).then((r) => r.arrayBuffer());
    return { name: "Manrope", data, weight };
  };
  try {
    return await Promise.all([load(500), load(800)]);
  } catch {
    return [];
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await repo().getOffer(id);
  const f = await fonts();
  const family = f.length ? "Manrope" : "sans-serif";
  if (!o || o.status === "withdrawn") {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", background: NAVY, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, fontFamily: family, fontWeight: 800 }}>
        {COMPANY.name} · {PRODUCT.name}
      </div>,
      { ...size, fonts: f },
    );
  }
  const q = identite(o);

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: NAVY, color: "white", display: "flex", flexDirection: "column", padding: "56px 64px 48px", fontFamily: family, position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 12, background: GOLD }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26 }}>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ fontWeight: 800, letterSpacing: 4 }}>{COMPANY.name.toUpperCase()}</span>
          <span style={{ color: GOLD, marginLeft: 14, fontWeight: 500 }}>{PRODUCT.name}</span>
        </div>
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, background: "rgba(255,255,255,0.14)", padding: "8px 16px" }}>
          {`${q.marche} · ${COUNTRY_CODE[o.country] ?? o.country}`.toUpperCase()}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
        <span style={{ fontSize: 30, color: GOLD, fontWeight: 500, letterSpacing: 3 }}>{q.emetteur.toUpperCase()}</span>
        <span style={{ display: "flex", fontSize: q.nom.length > 30 ? 80 : 96, fontWeight: 800, lineHeight: 1.05, marginTop: 18 }}>{q.nom}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 48, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.18)" }}>
        <span style={{ fontSize: 26, color: MUTED, fontWeight: 500 }}>Le prix et le rendement se lisent sur le Guichet.</span>
        <span style={{ fontSize: 22, color: MUTED, fontWeight: 500 }}>{COMPANY.licence.split(" · ")[0]}</span>
      </div>
    </div>,
    { ...size, fonts: f },
  );
}
