# Memory index

- [Guichet project](guichet-project.md) : C:\dev\guichet, live on Vercel + Supabase; governance layer (référentiel, rôles+MFA, audit, approbations, intake) done 2026-09-16
- [Phone UX](guichet-phone-ux.md) : app « ⋮ » menu (AppMenu.tsx), fiche swipe, card pull (left = Déclarer · Me rappeler, right = the blue adaptive back, stays until Recto/scroll-away), cards plain at rest (Safari crash), « ··· » sheet, layout D, density + distinction, floating filter/chevron, share image, 30-second presentation, expired-link redirect, PIN/passkeys discussed; 43 guide shots
- [Docs, guides and tours](guichet-docs-and-guides.md) : in-app docs (src/data/docs, /desk/docs, /info/aide public only + sensitivity test), guide shots script, TOUR/CoachMarks conventions
- [Push after each step](guichet-push-after-each-step.md) : commit + push to origin master automatically for Guichet; Vercel rollback ⇒ staged promotion gotcha, how to check a deployment
- [Companies data](guichet-companies-data.md) : 7 BVMAC issuers in companies.ts; scanned PDFs rendered with scripts/pdf-pages.mjs
- [Bond terms source](guichet-bond-terms.md) : BVMAC fiches signalétiques (JPG) → src/data/bond-terms.ts; Congo (EOCG) missing
- [Supabase migrations](guichet-supabase-migrations.md) : applied via Chrome SQL editor with window.monaco setValue; enum adds run alone; 0001–0026 applied (0023 funds open, 0024 inbox, 0025 news, 0026 channels+devices)
- [No em dashes](guichet-no-em-dash.md) : house style, colon / commas / middle dot instead; the lone missing-value dash stays
- [Auth and channels](guichet-auth-channels.md) : two proven channels before an intention, guest e-mail code, WhatsApp bridge link, passkeys + browser-bound PIN, /moi/securite; migration 0026
