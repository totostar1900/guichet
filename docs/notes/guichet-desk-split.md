---
name: guichet-desk-split
description: "How Desk and Guichet are kept separate in Guichet (shared bodies, DeskView context, desk reading routes, what may never be copied)"
metadata:
  node_type: memory
  type: project
  originSessionId: b2709f29-0ead-485f-9c72-4137a89e837c
  modified: 2026-09-24T16:14:14.193Z
---

Decided and built 24 September 2026, after the report that a desk link jumped to guichet.

**Why it mattered.** No cookie sets a parent `domain` anywhere in the codebase, so `desk.*` and `guichet.*` have separate jars. A staff member following `/offres/x` from the desk arrived signed out, and the desk's MFA bought nothing there. The goal was therefore no jump at all, not a nicer one.

**The rule: one body, two routes, never a copy.** The reading half of each page lives in a shared component that both routes render:

| Shared body | Client route | Desk route |
| --- | --- | --- |
| `src/app/offres/[id]/FicheReading.tsx` (+ `loadFiche`) | `/offres/[id]` | `/desk/lignes/[id]`, above versions, lifecycle and audit |
| `src/app/TitresBody.tsx` | `/` | `/desk/titres` |
| `src/app/fonds/FondsBody.tsx` | `/fonds` | `/desk/fonds` |
| `src/app/comparer/ComparerBody.tsx` | `/comparer` | `/desk/comparer` |
| `src/app/indice/IndiceBody.tsx` | `/indice` | `/desk/indice/apercu` (beside `/desk/indice`, the notes workshop) |
| `src/app/societes/SocietesBody.tsx` | `/societes` | `/desk/societes` |
| `src/app/societes/[mnemo]/SocieteBody.tsx` | `/societes/[mnemo]` | `/desk/societes/[mnemo]` |

**`src/components/DeskView.tsx`** is a client context, not a prop chain: `<DeskView>` around a body makes `useLineHref()` return `/desk/lignes/<id>` and `useDeskView()` true, which hides the client affordances (the `···` menu that follows, compares and shares, the card density switch, the coach marks). A **server** component cannot read it, so `FicheReading` and `ComparerBody` take `mode: "client" | "desk"` in clear instead.

**Decisions the user made** (do not quietly revisit): desk reading lives at desk URLs, not at client paths on the desk host, so a copied link says what it is; the desk pages are **read only**, no intention form, an order is recorded through the desk's own screens; of the client affordances only **Comparer** follows. The Guide (`/info`) is not served on the desk host, so its two prose links render as plain text there and the KpiCard lesson button is hidden (`lessons={false}`).

**The deliberate outbounds**, each marked with ↗ and opening in a new tab: « Fiche client » on the desk line page, a note's public page and its PDF, a company's report PDF, and the index series CSV.

**`MARKET_PAGES` carries a `deskHref`** for the pages served at the desk, and the « Sur le même sujet » strip shows only those in desk mode. Adding one there is how a market page joins the desk.

`src/app/robots.ts` was created at the same time: there was none, `/robots.txt` returned the app HTML. The desk host now answers `Disallow: /`.

See [[guichet-go-live]] for the host split itself (`NEXT_PUBLIC_DESK_HOST`, `src/lib/hosts.ts`, `src/proxy.ts`), and [[guichet-search-and-sort]] for the list conventions these pages share.
