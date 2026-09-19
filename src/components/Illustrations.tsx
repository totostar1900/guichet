/**
 * The market's actors, drawn from squares, circles and triangles in the
 * app's colours. One image per actor, reused everywhere the actor is named:
 * the actors map of the parcours, a lesson's head, the section strip.
 * 120 × 90 each; the small sizes keep the same shapes.
 */
export type ActorKind = "beac" | "cosumaf" | "bvmac" | "tresor" | "svt" | "entreprise" | "gestion" | "depositaire" | "guichet" | "client";

export const ACTOR_LABEL: Record<ActorKind, string> = {
  beac: "BEAC",
  cosumaf: "COSUMAF",
  bvmac: "BVMAC",
  tresor: "Trésor public",
  svt: "SVT",
  entreprise: "Entreprise",
  gestion: "Société de gestion",
  depositaire: "Dépositaire",
  guichet: "Purpose Capital",
  client: "Vous",
};

const N = "var(--chart-out)"; // navy on a light ground, pale blue on a dark one: the drawing never sinks into its ground
const G = "var(--gold)";
const GD = "var(--gold-ink)";
const T = "#2a8a9a";
const P = "var(--paper)";
const L = "var(--line-2)";
const W = "var(--surface)";

function Body({ kind }: { kind: ActorKind }) {
  switch (kind) {
    case "beac":
      return (
        <>
          <circle cx="60" cy="20" r="13" fill={G} />
          <circle cx="60" cy="20" r="8" fill="none" stroke={GD} strokeWidth="2" />
          <text x="60" y="24.5" textAnchor="middle" fontSize="11" fontWeight="800" fill={GD}>
            F
          </text>
          <path d="M20 46 L60 30 L100 46 Z" fill={N} />
          <rect x="22" y="46" width="76" height="6" fill={N} />
          {[28, 46, 66, 84].map((x) => (
            <rect key={x} x={x} y="54" width="8" height="24" fill={W} stroke={N} strokeWidth="2" />
          ))}
          <rect x="18" y="78" width="84" height="8" fill={N} />
        </>
      );
    case "cosumaf":
      return (
        <>
          <path d="M60 8 L98 20 L94 54 C92 70 76 80 60 86 C44 80 28 70 26 54 L22 20 Z" fill={W} stroke={N} strokeWidth="2.5" />
          <rect x="58" y="26" width="4" height="40" fill={N} />
          <rect x="30" y="34" width="60" height="4" fill={N} />
          <path d="M30 36 L22 54 L38 54 Z" fill="none" stroke={N} strokeWidth="2" />
          <path d="M22 54 Q30 62 38 54" fill={G} stroke={N} strokeWidth="2" />
          <path d="M90 36 L82 54 L98 54 Z" fill="none" stroke={N} strokeWidth="2" />
          <path d="M82 54 Q90 62 98 54" fill={G} stroke={N} strokeWidth="2" />
          <rect x="50" y="66" width="20" height="6" fill={N} />
          <circle cx="60" cy="24" r="5" fill={G} />
        </>
      );
    case "bvmac":
      return (
        <>
          <rect x="16" y="30" width="88" height="56" fill={W} stroke={N} strokeWidth="2.5" />
          <path d="M12 30 L60 8 L108 30 Z" fill={N} />
          <rect x="26" y="40" width="68" height="30" fill={N} />
          <polyline points="32,64 44,54 54,58 66,46 78,50 90,42" fill="none" stroke={G} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx="90" cy="42" r="3" fill={G} />
          {[30, 48, 62, 80].map((x) => (
            <rect key={x} x={x} y="74" width="10" height="12" fill={L} />
          ))}
          <circle cx="60" cy="19" r="4" fill={G} />
        </>
      );
    case "tresor":
      return (
        <>
          <rect x="18" y="22" width="84" height="64" rx="4" fill={W} stroke={N} strokeWidth="2.5" />
          <rect x="24" y="28" width="72" height="52" rx="3" fill={P} stroke={N} strokeWidth="1.5" />
          <circle cx="48" cy="54" r="15" fill={W} stroke={N} strokeWidth="2.5" />
          <circle cx="48" cy="54" r="7" fill="none" stroke={N} strokeWidth="2" />
          <path d="M48 41 L48 47 M48 61 L48 67 M35 54 L41 54 M55 54 L61 54" stroke={N} strokeWidth="2" />
          <rect x="70" y="40" width="18" height="28" fill={N} />
          <circle cx="79" cy="54" r="3" fill={G} />
          <path d="M60 6 L64 14 L72 15 L66 21 L67 29 L60 25 L53 29 L54 21 L48 15 L56 14 Z" fill={G} />
        </>
      );
    case "svt":
      return (
        <>
          <path d="M22 40 L60 22 L98 40 Z" fill={N} />
          <rect x="30" y="42" width="60" height="26" fill={W} stroke={N} strokeWidth="2" />
          {[36, 50, 64, 78].map((x) => (
            <rect key={x} x={x} y="46" width="6" height="18" fill={N} />
          ))}
          <rect x="26" y="68" width="68" height="6" fill={N} />
          <path d="M6 82 L34 82 M28 76 L34 82 L28 88" fill="none" stroke={GD} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M114 82 L86 82 M92 76 L86 82 L92 88" fill="none" stroke={GD} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="60" cy="12" r="6" fill={G} />
        </>
      );
    case "gestion":
      return (
        <>
          <circle cx="48" cy="48" r="30" fill={W} stroke={N} strokeWidth="2.5" />
          <path d="M48 48 L48 18 A30 30 0 0 1 78 48 Z" fill={N} />
          <path d="M48 48 L78 48 A30 30 0 0 1 48 78 Z" fill={T} />
          <path d="M48 48 L48 78 A30 30 0 0 1 18 48 Z" fill={G} />
          <path d="M48 48 L18 48 A30 30 0 0 1 48 18 Z" fill={L} />
          <rect x="76" y="50" width="36" height="28" rx="3" fill={N} />
          <rect x="86" y="44" width="16" height="8" rx="2" fill="none" stroke={N} strokeWidth="2.5" />
          <rect x="92" y="60" width="4" height="8" fill={G} />
        </>
      );
    case "depositaire":
      return (
        <>
          <rect x="18" y="20" width="60" height="66" rx="3" fill={W} stroke={N} strokeWidth="2.5" />
          <rect x="18" y="20" width="10" height="66" fill={N} />
          <path d="M36 34 L70 34 M36 44 L70 44 M36 54 L60 54 M36 64 L70 64 M36 74 L56 74" stroke={L} strokeWidth="3" strokeLinecap="round" />
          <rect x="72" y="46" width="34" height="30" rx="4" fill={G} stroke={GD} strokeWidth="2" />
          <path d="M79 46 L79 38 A10 10 0 0 1 99 38 L99 46" fill="none" stroke={GD} strokeWidth="3" />
          <circle cx="89" cy="60" r="4" fill={GD} />
          <rect x="87" y="60" width="4" height="8" fill={GD} />
        </>
      );
    case "entreprise":
      return (
        <>
          <rect x="46" y="14" width="40" height="72" fill={W} stroke={N} strokeWidth="2.5" />
          {[22, 36, 50].flatMap((y) => [52, 66].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="8" height="8" fill={N} />))}
          <rect x="52" y="64" width="8" height="8" fill={G} />
          <rect x="66" y="64" width="8" height="8" fill={G} />
          <rect x="14" y="50" width="32" height="36" fill={P} stroke={N} strokeWidth="2.5" />
          <path d="M14 50 L30 40 L46 50" fill={N} />
          <rect x="20" y="30" width="6" height="14" fill={N} />
          <rect x="86" y="62" width="20" height="24" fill={P} stroke={N} strokeWidth="2.5" />
          <rect x="10" y="86" width="100" height="3" fill={N} />
        </>
      );
    case "client":
      return (
        <>
          <circle cx="44" cy="30" r="14" fill={W} stroke={N} strokeWidth="2.5" />
          <path d="M18 86 C18 60 30 50 44 50 C58 50 70 60 70 86 Z" fill={N} />
          <rect x="72" y="26" width="34" height="60" rx="6" fill={W} stroke={N} strokeWidth="2.5" />
          <rect x="77" y="34" width="24" height="40" fill={P} />
          <rect x="80" y="38" width="18" height="4" fill={N} />
          <rect x="80" y="46" width="12" height="3" fill={L} />
          <rect x="80" y="52" width="18" height="3" fill={L} />
          <rect x="80" y="62" width="18" height="8" rx="2" fill={G} />
          <circle cx="89" cy="80" r="2.5" fill={N} />
        </>
      );
    default:
      return (
        <>
          <path d="M14 46 A46 46 0 0 1 106 46 L106 54 L14 54 Z" fill={N} />
          <path d="M26 46 A34 34 0 0 1 94 46 L94 52 L26 52 Z" fill={P} />
          <rect x="10" y="54" width="100" height="10" fill={G} />
          <rect x="16" y="64" width="88" height="22" fill={W} stroke={N} strokeWidth="2.5" />
          <circle cx="60" cy="34" r="8" fill={W} stroke={N} strokeWidth="2.5" />
          <path d="M46 52 C46 44 52 42 60 42 C68 42 74 44 74 52 Z" fill={N} />
          <path d="M22 76 L44 76 M40 71 L45 76 L40 81" fill="none" stroke={GD} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M98 76 L76 76 M80 71 L75 76 L80 81" fill="none" stroke={GD} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
  }
}

/** One actor, as a standalone image. */
export function Actor({ kind, size = 96, title, dim }: { kind: ActorKind; size?: number; title?: string; dim?: boolean }) {
  return (
    <svg width={size} height={(size * 3) / 4} viewBox="0 0 120 90" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} style={dim ? { opacity: 0.35 } : undefined}>
      <Body kind={kind} />
    </svg>
  );
}

/** The same drawing inside a bigger SVG, at a position and scale. */
export function ActorGlyph({ kind, x, y, scale = 0.6, dim }: { kind: ActorKind; x: number; y: number; scale?: number; dim?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={dim ? 0.3 : 1}>
      <Body kind={kind} />
    </g>
  );
}

/** The shape of a section of the parcours. */
export function SectionShape({ shape, color, size = 22 }: { shape: "circle" | "squares" | "triangle" | "arrow" | "hexagon" | "diamond"; color: string; size?: number }) {
  const c = color;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flex: "none" }}>
      {shape === "circle" && (
        <>
          <circle cx="12" cy="12" r="8" fill="none" stroke={c} strokeWidth="2" />
          <circle cx="12" cy="12" r="2.5" fill={c} />
        </>
      )}
      {shape === "squares" && (
        <>
          <rect x="3" y="3" width="8" height="8" rx="1.5" fill={c} />
          <rect x="13" y="3" width="8" height="8" rx="1.5" fill="none" stroke={c} strokeWidth="2" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" fill="none" stroke={c} strokeWidth="2" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" fill={c} />
        </>
      )}
      {shape === "triangle" && (
        <>
          <path d="M12 3 L21 20 L3 20 Z" fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 9 L12 14" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="17" r="1.2" fill={c} />
        </>
      )}
      {shape === "arrow" && (
        <>
          <path d="M3 12 L17 12" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <path d="M13 7 L18 12 L13 17" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="4" cy="12" r="2" fill={c} />
        </>
      )}
      {shape === "hexagon" && (
        <>
          <path d="M12 2.5 L20.5 7.25 L20.5 16.75 L12 21.5 L3.5 16.75 L3.5 7.25 Z" fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" />
          <path d="M8.5 12 L15.5 12 M12 8.5 L12 15.5" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {shape === "diamond" && (
        <>
          <path d="M12 2.5 L21.5 12 L12 21.5 L2.5 12 Z" fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" />
          <path d="M7 14 L10 10.5 L13 13 L17 8.5" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}
