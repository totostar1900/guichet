# Memory index

- [Guichet project](guichet-project.md) : C:\dev\guichet, live on Vercel + Supabase; governance layer (référentiel, rôles+MFA, audit, approbations, intake) done 2026-09-16
- [Phone UX](guichet-phone-ux.md) : app « ⋮ » menu (AppMenu.tsx, two tabs Guichet/Contact at fixed height since 2026-09-20), fiche swipe, card pull (left = Déclarer · Me rappeler, right = the blue adaptive back, stays until Recto/scroll-away), cards plain at rest (Safari crash), « ··· » sheet, layout D, density + distinction, floating filter/chevron, share image, 30-second presentation, expired-link redirect, PIN/passkeys discussed; 43 guide shots
- [Docs, guides and tours](guichet-docs-and-guides.md) : Guide corner « double bouton » (pastille + sommaire, GuideBar.tsx), actors map stacked + Agrandir on phone; in-app docs (src/data/docs, /desk/docs, /info/aide public only + sensitivity test), guide shots script, TOUR/CoachMarks conventions
- [Go-live](guichet-go-live.md) : production guichet.purposecapital.africa + desk.purposecapital.africa (host split via NEXT_PUBLIC_DESK_HOST, src/lib/hosts.ts, proxy) since 2026-09-21; pending: Supabase Pro, Vercel Pro, VAPID, demo data, staff list
- [Push after each step](guichet-push-after-each-step.md) : commit + push to origin master automatically for Guichet; Vercel rollback ⇒ staged promotion gotcha, how to check a deployment
- [Issuers and fiche](guichet-issuers-fiche.md) : issuer registry (aliases, CEMAC zone, sourced text, silent gaps), fiche panes Essentiel·Chiffres·Documents·Émetteur, intention page /offres/[id]/intention (2026-09-21)
- [Companies data](guichet-companies-data.md) : 7 BVMAC issuers in companies.ts; scanned PDFs rendered with scripts/pdf-pages.mjs
- [Bond terms source](guichet-bond-terms.md) : BVMAC fiches signalétiques (JPG) → src/data/bond-terms.ts; Congo (EOCG) missing
- [Supabase migrations](guichet-supabase-migrations.md) : applied via Chrome SQL editor with window.monaco setValue; enum adds run alone; 0001–0030 applied (0023 funds open, 0024 inbox, 0025 news, 0026 channels+devices, 0027 terms, 0028 financial profile, 0029 prefs)
- [No em dashes](guichet-no-em-dash.md) : house style, colon / commas / middle dot instead; the lone missing-value dash stays
- [Auth and channels](guichet-auth-channels.md) : two proven channels before an intention, guest e-mail code, WhatsApp bridge link, passkeys + browser-bound PIN, /moi/securite; migration 0026
- [Positive tone](guichet-positive-tone.md) : say what Guichet does, never what it is not; regulatory disclaimer stays; bump LEGAL_VERSION when legal text changes
- [Templates registry](guichet-templates.md) : desk › Référentiel › Modèles, passages catalogue vs server resolver, libre/relu/réglementaire, migration 0030 applied 2026-09-21
