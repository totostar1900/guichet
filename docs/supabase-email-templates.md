# Supabase : le code à six chiffres dans l'e-mail de connexion

**Depuis le 20 septembre 2026, le chemin le plus court** : poser `RESEND_API_KEY` et `EMAIL_FROM` sur Vercel (domaine vérifié chez Resend). Le Guichet écrit alors lui-même l'e-mail de connexion (`sendCode` : `generateLink` côté admin donne le code et le `token_hash` ; Resend l'envoie : le code en grand, un lien qui s'ouvre depuis n'importe quel navigateur en dessous). Aucun gabarit Supabase à toucher, aucune limite de 2 e-mails / heure. Le formulaire dit alors « saisissez le code ». Sans ces deux variables, c'est le lien Supabase (flux implicite) qui part, comme décrit plus bas.

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

- `src/app/connexion/actions.ts` › `sendCode` : `signInWithOtp` **en flux implicite** (client supabase-js à part, `flowType: "implicit"`) avec `emailRedirectTo` = `/auth/callback?next=…`. Pourquoi implicite : un lien PKCE ne s'ouvre que dans le navigateur qui l'a demandé, or le client lit son e-mail sur le téléphone et touche le lien depuis l'app Mail (constat du 20 septembre : « le lien ne s'ouvre pas »). En implicite la session revient dans le fragment de l'URL ; `/auth/callback` sans paramètre sert une page minimale qui la remet à `/auth/session` (POST, `setSession` → cookies), et `AuthHashRedirect` fait pareil si Supabase retombe sur l'URL du site. `verifyCode` : `verifyOtp({ email, token, type: "email" })` (le code, dès que le gabarit l'imprime).
- Le formulaire dit « ouvrez le lien qu'il contient, il vous connecte ici ; si l'e-mail montre aussi un code, vous pouvez le saisir », et le bouton « Recevoir mon lien de connexion ». Une fois le gabarit en place, on pourra parler du code d'abord.
- Un lien expiré ou déjà ouvert renvoie sur /connexion avec l'explication (`AuthHashRedirect`).
