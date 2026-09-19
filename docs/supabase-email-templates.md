# Supabase : le code à six chiffres dans l'e-mail de connexion

Constat du 19 septembre 2026 : Supabase envoie **un lien** et non un code. Le lien ouvre une session dans un autre onglet (ou l'app Mail l'a déjà « ouvert ») ; le code, lui, garde le client sur l'écran où il est. Le formulaire du Guichet accepte les deux : il suffit que l'e-mail contienne le code.

Pourquoi ce n'est pas encore le cas : sur l'expéditeur par défaut de Supabase, les gabarits ne se modifient pas (Authentication › Emails : « Set up custom SMTP to edit templates »). Le gabarit par défaut ne contient que le lien.

## Ce qu'il faut faire, une fois (dix minutes, par le titulaire du compte Supabase)

1. Supabase › Authentication › Emails › **SMTP Settings** › *Enable custom SMTP* :
   - Sender email : `guichet@purposecapital.africa` (ou l'adresse `EMAIL_FROM` déjà vérifiée chez Resend)
   - Sender name : `Guichet · Purpose Capital`
   - Host : `smtp.resend.com` · Port : `465` · Username : `resend` · Password : la clé API Resend (la même que `RESEND_API_KEY` sur Vercel, ou une clé dédiée « Supabase » créée chez Resend, envoi seul).
   - Save. Le quota d'envoi passe de 2 e-mails/heure (défaut Supabase) à celui de Resend.
2. Authentication › Emails › **Templates** › *Magic link or OTP* : coller le gabarit ci-dessous, sujet compris. Faire de même pour *Confirm sign up* (première connexion d'une adresse inconnue : c'est ce gabarit qui part).
3. Tester : /connexion, une adresse, « Recevoir un code » : l'e-mail montre le code en gros, le lien reste en bas pour ceux qui préfèrent.

## Gabarit « Magic link or OTP » et « Confirm sign up »

Sujet :

```
Votre code Guichet : {{ .Token }}
```

Corps (HTML) :

```html
<div style="font-family:Manrope,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">Purpose Capital · Guichet</p>
  <h1 style="margin:0 0 16px;font-size:20px">Votre code de connexion</h1>
  <p style="margin:0 0 8px">Saisissez ce code sur l'écran où vous êtes. Il vaut dix minutes ; le dernier reçu est toujours le bon.</p>
  <p style="margin:16px 0;font-size:34px;font-weight:800;letter-spacing:.24em;color:#0b2545">{{ .Token }}</p>
  <p style="margin:0 0 8px;font-size:13px;color:#4b5563">Vous préférez un lien ? Il ouvre le Guichet dans votre navigateur :</p>
  <p style="margin:0 0 20px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#0b2545;color:#fff;text-decoration:none;font-weight:700;font-size:14px">Ouvrir le Guichet</a></p>
  <p style="margin:0;font-size:12px;color:#6b7280">Vous n'avez rien demandé ? Ignorez cet e-mail : sans le code, personne n'entre. Purpose Capital S.A., société de bourse agréée COSUMAF · Yaoundé.</p>
</div>
```

## Ce que le code du Guichet fait déjà

- `src/app/connexion/actions.ts` › `sendCode` : `signInWithOtp` avec `emailRedirectTo` (le lien) ; `verifyCode` : `verifyOtp({ email, token, type: "email" })` (le code). Les deux mènent à la même session.
- Le formulaire dit « saisissez le code qu'il contient, ou cliquez simplement sur son lien ». Une fois le gabarit en place, on pourra ne parler que du code.
- Un lien expiré ou déjà ouvert renvoie sur /connexion avec l'explication (`AuthHashRedirect`).
