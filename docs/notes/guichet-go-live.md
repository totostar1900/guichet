---
name: guichet-go-live
description: Go-live status of Guichet: production domain guichet.purposecapital.africa set up 2026-09-21, what remains (paid plans, VAPID, demo data, staff list)
metadata:
  type: project
---

Production address is **https://guichet.purposecapital.africa** since 2026-09-21: Vercel project domain (Production), CNAME `guichet` → `8200882685b486f7.vercel-dns-017.com` in Netlify DNS zone, `NEXT_PUBLIC_APP_URL` switched + redeployed, Supabase Auth Site URL + redirect URLs (`/auth/callback`, `/**`) updated. `guichet-seven.vercel.app` still serves the same deployment.

Go-live plan agreed 2026-09-21 (still open as of then): Supabase Pro (project is FREE), Vercel Pro (team is Hobby, 7 crons need it), VAPID keys, WhatsApp Cloud API (Meta verification, long), SETTLEMENT_BANK/IBAN, INBOUND_SECRET, remove demo data from production Supabase, DESK_EMAILS staff list, legal review, full e2e on prod, launch to a first circle.

Domains checked 2026-09-21: guichet.africa and guichet.app are taken (EuroDNS, parked); leguichet.app / leguichet.africa / guichet.finance / guichet.money / guichet.io were available.

**Why:** the user decided the domain and asked to go live; steps done vs pending must not be redone.
**How to apply:** treat guichet.purposecapital.africa as the canonical URL in links, docs and tests; when checking a deployment, curl this domain. See [[guichet-push-after-each-step]] and [[guichet-supabase-migrations]].

**2026-09-21, desk host:** desk.purposecapital.africa live (Vercel domain, Netlify CNAME to the same vercel-dns target, `NEXT_PUBLIC_DESK_HOST` env, Supabase redirect `https://desk.purposecapital.africa/**`). Rules in `src/lib/hosts.ts` + `src/proxy.ts`: /desk only on the desk host, everything else redirected to the client host; client UI never shows desk controls (layout computes `deskUi`). Sessions are per host: staff sign in on the desk host. Ink band over the tab bar = always-mounted sheet scrims; fixed by `useSheetPresence` (Sheet + LineMenu mount only while open).
