---
name: guichet-auth-channels
description: "Guichet sign-in and channel proof, decided 2026-09-19 : two proven channels before an intention leaves, guest by e-mail code, WhatsApp bridge link, passkeys + browser-bound 4-digit code, Sécurité page"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8ecfdc15-a97a-41f6-a140-c3c9f48a4903
  modified: 2026-09-19T15:48:38.014Z
---

Built 2026-09-19 (commits 16c01c5 → 4610970+). The rule the user set: **an intention is pushed only once the e-mail AND the WhatsApp number are proven**, and a newcomer may start as a guest (e-mail code on the fiche, or a WhatsApp conversation the desk answers "avec la ligne").

**How it is built**
- `src/lib/channels.ts` (server-only): `requestPhoneProof` / `confirmPhoneProof` (6-digit code, HMAC(AUTH_SECRET) hash, 10 min, 5 tries; when WhatsApp is not configured the code is returned as `demoCode` and shown in the form), `signLineLink(phone)` / `readLineLink(token)` (30-day token in `/offres/{id}?de=`; reaching the fiche through it counts as the WhatsApp proof).
- `src/lib/auth/devices.ts`: passkeys via `@simplewebauthn/server` v14 (rpID/origin from the request host; challenge in a signed 5-min cookie `guichet_webauthn`; discoverable credentials so sign-in needs no e-mail), PIN = HMAC(pepper, `pin|token|code`) where the token lives only in the browser's localStorage (`guichet_device`, see `src/lib/device-client.ts`), 5 failures → device removed; session minting = admin `generateLink({type:"magiclink"})` then `verifyOtp({token_hash, type:"magiclink"})` on the cookie client (dev backend: rebuild the dev cookie from `dev-{role}-{slug}`). Every add/remove/forget is told on both channels + `logEvent`.
- Data: `ChannelStatus`, `ChannelCode`, `TrustedDevice` in `src/lib/domain/types.ts`; repo methods `getChannelStatus`, `markChannelVerified`, `createChannelCode`, `findChannelCode`, `updateChannelCode`, `listDevices`, `findDevice`, `addDevice`, `updateDevice`, `removeDevice(s)`; migration 0026 applied. `updateContact` drops the proof when the phone / e-mail changes.
- UI: `ProofBlock` (`src/components/ProofBlock.tsx`, shared by IntentForm and Sécurité), `DeviceSignIn` on `/connexion` (known device first, "Pas vous ?" falls back to the code), `/moi/securite` (`SecurityPanel`), `TrustNudge` ("Un doigt la prochaine fois ?") on /moi and the intent receipt, desk `ReplyForm` line picker, proof marks on `/desk/intentions/[id]`.
- Tests: `src/test/devices.test.ts` (PIN flow), `src/test/channels.test.ts` (signed link), e2e proves the phone first.

**Why:** WhatsApp is the client's real channel in CEMAC; a code typed once proves the desk can reach them; the phone's lock beats a password nobody remembers; the PIN is device-bound so a leaked code opens nothing elsewhere.

**How to apply:** never weaken the two-channel rule in `submitIntent`; a new proof path must call `markChannelVerified`; anything the browser stores about a device goes through `device-client.ts`; on production the passkey rpID is the served host (guichet-seven.vercel.app), so a custom domain later means re-enrolment. Passkeys were not exercised in the browser pane (no authenticator): first real test is on the user's iPhone.

Related: [[guichet-project]], [[guichet-supabase-migrations]], [[guichet-phone-ux]]

**2026-09-19 evening.** Production Vercel has NO `WHATSAPP_*` and NO `RESEND_API_KEY` (checked in the user's Chrome): WhatsApp codes cannot send there. `proofDemoAllowed()` (channels.ts) hides the demo code on production hosts; `requestPhoneProof` then returns `unavailable`, the form opens the button with "un conseiller confirme par téléphone" and `submitIntent` lets the intention leave with `phoneVerified:false` (the desk sees "WhatsApp non prouvé"). Supabase auth e-mails carry a link, not a code, because templates are locked until custom SMTP is set (needs the Resend key entered by the user: I must not enter keys); the ready-to-paste templates are in `docs/supabase-email-templates.md`. Legal consent: `src/data/legal.ts` (`LEGAL_VERSION`), `ConsentGate` in the layout for clients, migration 0027 (`terms_version`, `terms_accepted_at`), public `/info/mentions`.

**2026-09-20, the e-mail link opens anywhere.** The default Supabase template only carries a link, and a PKCE link only opens in the browser that requested it (the code verifier cookie): from the phone's mail app it failed (« le lien ne s'ouvre pas »). `sendCode` now uses a plain supabase-js client with `flowType: "implicit"` for `signInWithOtp`; the link returns to `/auth/callback?next=…` with the session in the hash; the route, with no `code`/`token_hash`, serves a tiny HTML page that POSTs the tokens to `/auth/session` (`setSession` → cookies); `AuthHashRedirect` does the same if Supabase falls back to the site URL. Form wording: « ouvrez le lien qu'il contient… si l'e-mail montre aussi un code, vous pouvez le saisir », button « Recevoir mon lien de connexion ». Custom SMTP + template (docs/supabase-email-templates.md) still wanted to print the code.

**2026-09-20, the profile for visitors.** `src/lib/profile-local.ts` (`useLocalProfile` via useSyncExternalStore, `writeLocalProfile`); `ProfileQuiz guest` computes with `computeProfile` and keeps the profile on the device; signed in without a server profile, a device profile shows a « Le garder » box that calls `saveProfile(local.answers)` then clears the device copy. `/moi/profil` uses `getSession` (public).

**2026-09-20, profile v2.** `src/data/profile.ts`: `PROFILE_QUESTIONS` carry `block` (appetit · connaissance · capacite), `multi` (bitmask answer, « aucun » clears the others), `lesson` + `correct` on the four verifications (`VERIFICATIONS`). `computeProfile(answers, lessonsRead)` keeps v1 arithmetic for seven-answer profiles and adds `version: 2`, `knowledge`, `verified`, `lessonsRead`, `capacity`, `investable` (index into the « epargne » bands, `INVESTABLE_MAX`), `confidence`, `capped`. `toCover(p)` lists missed verifications with their lessons; `amountFlag(p, amount)` reads an outlay against the declared savings (warn past 50 % or beyond). Quiz: `ProfileQuiz` three-block rail, inline feedback on verifications, result with three panels and checks; `saveProfile(answers, lessonsRead)`. Fiche: `IntentForm investable` → second confirmation box, both flags joined in `profileFlag`. Desk: `src/components/desk/ProfileCard.tsx` on the intent page (with `est.outlay`) and the clients page. Tests in `src/test/profile.test.ts`. Not done yet: broadcast targeting by appetite × knowledge, desk « confirmé » flag, KYC pre-fill from bands.

## Le code par téléphone (23 septembre 2026)

Twilio est branché dans Supabase › Auth › Phone. La connexion par téléphone
était déjà écrite : `/connexion` propose le numéro quand `PHONE_OTP_ENABLED=1`,
et `PHONE_OTP_CHANNEL` vaut `sms` ou `whatsapp` selon ce que Twilio sert.
`verifyOtp({ type: "sms" })` vaut pour les deux, Supabase ne distingue pas.

Ce qui manquait : **une connexion par téléphone ne comptait pas comme preuve du
numéro**. La session portait bien `phone`, mais rien ne disait qu'il avait été
confirmé, et le formulaire d'intention ne regardait que la table des codes de
Guichet. Le client prouvait donc une seconde fois, par un code WhatsApp qui
n'est pas toujours disponible, un numéro que Supabase venait de confirmer.

`Session.phoneVerified` vient désormais de `user.phone_confirmed_at`, à la
condition que le profil n'ait pas un autre numéro. Le formulaire d'intention
connaît trois preuves : le lien WhatsApp du desk, le code validé au profil, et
la connexion par téléphone elle-même.

C'est la symétrie de ce qui a été corrigé pour l'e-mail le même jour : l'app
savait, et ne s'en servait pas.

**Ce qui reste manuel** : `PHONE_OTP_ENABLED=1` et `PHONE_OTP_CHANNEL` sur
Vercel, puis *Redeploy*. Et le gabarit d'e-mail de Supabase doit porter
`{{ .Token }}` et non `{{ .ConfirmationURL }}`, sinon le code arrive sous forme
de lien.

Le canal WhatsApp de Guichet (les accusés, les avis) reste sur l'API Meta, sans
rapport avec Twilio : `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID`. Deux chemins, deux
fournisseurs, et `requestPhoneProof` dépend toujours du premier.
