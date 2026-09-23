import "server-only";

/**
 * Le code de connexion par e-mail, écrit et envoyé par le Guichet.
 *
 * Supabase n'envoie un code lisible que si l'on peut éditer son gabarit, et son
 * gabarit ne s'édite qu'avec un SMTP à soi : sans cela il envoie un lien, qui
 * ouvre une autre fenêtre et abandonne le formulaire en cours. On ne demande
 * donc à Supabase que de frapper le jeton, et la maison écrit la lettre : le
 * code en grand, et le lien dessous pour qui le préfère.
 *
 * `generateLink` rend `email_otp`, les six chiffres, et `hashed_token`, qui
 * ouvre depuis n'importe quel navigateur. Une première visite n'a pas encore de
 * compte : on le crée, confirmé, pour que le jeton puisse être frappé.
 *
 * Sans expéditeur à nous, on retombe sur l'envoi de Supabase, c'est-à-dire sur
 * le lien. La page de connexion le dit alors en toutes lettres plutôt que de
 * promettre un code qui n'arrivera pas.
 */
export interface CodeSent {
  ok: boolean;
  /** Vrai quand la lettre part de chez nous, avec le code dedans. */
  withCode: boolean;
  error?: string;
}

export const ownSenderReady = (): boolean => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function sendSignInCode(email: string, base: string, next = "/"): Promise<CodeSent> {
  const { emailConfigured, sendEmail } = await import("@/lib/notify/providers");
  const { createClient } = await import("@supabase/supabase-js");

  if (emailConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    let { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (error && /not found/i.test(error.message)) {
      await admin.auth.admin.createUser({ email, email_confirm: true });
      ({ data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email }));
    }
    if (error || !data.properties?.email_otp || !data.properties.hashed_token) return { ok: false, withCode: true, error: `Envoi impossible : ${error?.message ?? "code indisponible"}` };
    const code = data.properties.email_otp;
    const link = `${base}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink&next=${encodeURIComponent(next)}`;
    try {
      await sendEmail(email, `Votre code Guichet : ${code}`, codeEmailHtml(code, link), `Votre code de connexion Guichet : ${code}\nIl vaut dix minutes ; le dernier reçu est toujours le bon.\nVous préférez un lien ? ${link}`);
    } catch (e) {
      return { ok: false, withCode: true, error: `Envoi impossible : ${e instanceof Error ? e.message : "e-mail"}` };
    }
    return { ok: true, withCode: true };
  }

  // Pas d'expéditeur à nous : Supabase envoie son lien. Le flux implicite est
  // voulu, un lien PKCE ne s'ouvrirait que dans le navigateur qui l'a demandé,
  // alors qu'on lit son courrier sur le téléphone et qu'on tape depuis la boîte.
  const plain = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { error } = await plain.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}` } });
  if (error) return { ok: false, withCode: false, error: `Envoi impossible : ${error.message}` };
  return { ok: true, withCode: false };
}

/** La lettre de connexion : le code d'abord, le lien pour qui le préfère. */
export function codeEmailHtml(code: string, link: string): string {
  return `<div style="font-family:Manrope,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">Purpose Capital · Guichet</p>
  <h1 style="margin:0 0 16px;font-size:20px">Votre code de connexion</h1>
  <p style="margin:0 0 8px">Saisissez ce code sur l'écran où vous êtes. Il vaut dix minutes ; le dernier reçu est toujours le bon.</p>
  <p style="margin:16px 0;font-size:34px;font-weight:800;letter-spacing:.24em;color:#0b2545">${code}</p>
  <p style="margin:0 0 8px;font-size:13px;color:#4b5563">Vous préférez un lien ? Il ouvre le Guichet dans votre navigateur :</p>
  <p style="margin:0 0 20px"><a href="${link}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#0b2545;color:#fff;text-decoration:none;font-weight:700;font-size:14px">Ouvrir le Guichet</a></p>
  <p style="margin:0;font-size:12px;color:#6b7280">Vous n'avez rien demandé ? Ignorez cet e-mail : sans le code, personne n'entre. Purpose Capital S.A., société de bourse agréée COSUMAF · Yaoundé.</p>
</div>`;
}
