import { ImageResponse } from "next/og";
import { repo } from "@/lib/data";
import { loadRegistry } from "@/lib/reference";
import { COUNTRY_CODE, summarize } from "@/lib/domain/summary";
import { familySegment, offerFamily, SEGMENT_LABEL } from "@/lib/domain/status";
import { COMPANY, PRODUCT } from "@/lib/config";

/**
 * The image a messaging app shows under a shared line: the line's own
 * figures, drawn on request from the same summary as the cards. Navy
 * ground, the number in gold, the wordmark small: the line is the point.
 */
export const alt = "La ligne, en chiffres";
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
  await loadRegistry();
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
  const s = summarize(o, new Date());
  const segment = SEGMENT_LABEL[familySegment(offerFamily(o))];
  const isFund = o.kind === "FONDS" && o.fund;
  const number = isFund ? `VL ${s.hero}` : s.hero;
  const condition = isFund ? `${s.heroSub} · 12 mois ${o.fund!.perf1yPct != null ? `${o.fund!.perf1yPct > 0 ? "+" : ""}${o.fund!.perf1yPct.toFixed(2).replace(".", ",")} %` : "—"}` : s.heroSub;
  const open = s.statusClass === "open" || s.statusClass === "closing" || s.statusClass === "quoted" || s.statusClass === "live";
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: NAVY, color: "white", display: "flex", flexDirection: "column", padding: "56px 64px 48px", fontFamily: family, position: "relative" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 12, background: GOLD }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26 }}>
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <span style={{ fontWeight: 800, letterSpacing: 4 }}>{COMPANY.name.toUpperCase()}</span>
          <span style={{ color: GOLD, marginLeft: 14, fontWeight: 500 }}>{PRODUCT.name}</span>
        </div>
        <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, background: "rgba(255,255,255,0.14)", padding: "8px 16px", borderRadius: 8 }}>
          {`${segment} · ${s.kind} · ${COUNTRY_CODE[o.country] ?? o.country}`.toUpperCase()}
        </span>
      </div>
      <div style={{ display: "flex", fontSize: s.title.length > 48 ? 48 : 58, fontWeight: 800, lineHeight: 1.12, marginTop: 44, maxHeight: 200, overflow: "hidden" }}>{s.title}</div>
      <div style={{ display: "flex", fontSize: 28, color: MUTED, marginTop: 14, fontWeight: 500 }}>{s.subtitle}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: isFund ? 76 : 96, fontWeight: 800, color: isFund ? "white" : GOLD, lineHeight: 1 }}>{number}</span>
          <span style={{ fontSize: 26, color: MUTED, marginTop: 12, fontWeight: 500 }}>{condition}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontSize: 24, color: MUTED, fontFamily: "monospace", marginBottom: 14 }}>{o.isin}</span>
          <span style={{ fontSize: 26, fontWeight: 800, background: open ? "#e2f1e6" : "#eceef2", color: open ? "#2f7d4f" : "#4a5266", padding: "10px 22px", borderRadius: 999 }}>{`● ${s.status}`}</span>
        </div>
      </div>
    </div>,
    { ...size, fonts: f },
  );
}
