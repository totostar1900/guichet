/**
 * Les mandats de prélèvement (page /moi/prelevements, 9 octobre 2026).
 *
 * Ils ont leur fichier parce qu'ils forment un vocabulaire à eux : un mandat,
 * un plafond par échéance, un compte débité, une révocation. Les disperser
 * dans en-console aurait noyé trente-six clefs qui se relisent ensemble le
 * jour où le juriste demandera ce que le client a exactement autorisé.
 */
export const EN_PRELEVEMENTS: Record<string, string> = {
  "Vos prélèvements": "Your direct debits",
  "Payer sans y penser": "Paying without thinking about it",
  "Vous pouvez nous autoriser à prélever une somme sur votre compte bancaire, à une date fixe du mois. C'est vous qui fixez le plafond, et nous ne le dépassons jamais. Chaque prélèvement est annoncé avant de partir, et vous pouvez révoquer votre autorisation à tout moment, sans motif.":
    "You may authorise us to debit a sum from your bank account, on a fixed day of the month. You set the ceiling, and we never go beyond it. Every debit is announced before it leaves, and you may revoke your authorisation at any time, without giving a reason.",
  "Vos autorisations": "Your authorisations",
  "Alimenter ma provision": "Funding my provision",
  "Alimenter mon épargne programmée": "Funding my savings plan",
  suspendu: "suspended",
  actif: "active",
  "{m} FCFA, le {j}": "{m} FCFA, on the {j}",
  "Plafond par échéance": "Ceiling per instalment",
  "Compte débité": "Account debited",
  "Référence du mandat": "Mandate reference",
  "Signé le {d}. Votre exemplaire est dans vos documents : votre banque peut vous le demander.":
    "Signed on {d}. Your copy is in your documents: your bank may ask you for it.",
  "Recevoir mon code": "Get my code",
  "Je signe ce mandat": "I sign this mandate",
  Garder: "Keep it",
  "Révoquer ce mandat": "Revoke this mandate",
  "En ajouter un": "Add another",
  "Autoriser un prélèvement": "Authorise a direct debit",
  "Préparer un mandat": "Prepare a mandate",
  "À quoi sert ce prélèvement ?": "What is this debit for?",
  "Alimenter ma provision, chaque mois": "Funding my provision, every month",
  "Alimenter une épargne programmée": "Funding a savings plan",
  "Alimenter une épargne programmée (vous n'en avez pas encore)": "Funding a savings plan (you have none yet)",
  Laquelle: "Which one",
  "{r} · {m} FCFA le {j}": "{r} · {m} FCFA on the {j}",
  "Montant prélevé chaque mois": "Amount debited each month",
  "Jour du mois ({a} à {b})": "Day of the month ({a} to {b})",
  "Plafond par échéance : nous ne prélèverons jamais plus": "Ceiling per instalment: we will never debit more",
  "Titulaire du compte à débiter": "Holder of the account to debit",
  "Banque du compte à débiter": "Bank of the account to debit",
  "RIB ou IBAN du compte à débiter": "Bank details or IBAN of the account to debit",
  "Ce compte doit être ouvert à votre nom. Nous ne présentons jamais de prélèvement sur le compte d'un tiers.":
    "This account must be in your name. We never present a debit on a third party's account.",
  "Préparer, puis signer": "Prepare, then sign",
  Révoqués: "Revoked",
  Provision: "Provision",
  "révoqué le {d}": "revoked on {d}",
};
