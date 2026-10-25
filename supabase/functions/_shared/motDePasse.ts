// Mot de passe aléatoire que personne ne voit, commun à reinitialiser-2fa et corriger-adresse :
// l'ancien mot de passe d'un compte ne sert plus. Jamais écrit dans un journal.

// 52 caractères aléatoires ; le préfixe satisfait toute règle de composition de Supabase
// (minuscule, majuscule, chiffre, symbole).
export function motDePasseAleatoire(): string {
  const octets = crypto.getRandomValues(new Uint8Array(36))
  const base64 = btoa(String.fromCharCode(...octets))
  return `Aa1!${base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`
}
