// Message d'un envoi refusé (lot E4). Une erreur de saisie levée par la base (P0001) s'affiche
// telle quelle ; un refus de droit (42501, politique d'ajout) prend le message du contrat de
// l'étape 4 (section 7) ; toute autre erreur est un problème de connexion : le formulaire affiche
// alors la phrase de `LISEZMOI.md` (« La connexion a échoué. Vos chiffres sont encore dans le
// formulaire : réessayez. ») et garde les valeurs.

/** Refus de droit, repris du contrat de l'étape 4 (section 7). */
export const MESSAGE_ACCES_REFUSE = "Cet élément n'existe pas ou vous n'y avez pas accès."

function lireChamp(erreur: unknown, champ: 'code' | 'message'): string | null {
  if (typeof erreur !== 'object' || erreur === null || !(champ in erreur)) return null
  const valeur = (erreur as Record<string, unknown>)[champ]
  return typeof valeur === 'string' && valeur !== '' ? valeur : null
}

/** Message à afficher sous le bouton ; null : problème de connexion (message par défaut). */
export function messageErreurEnvoi(erreur: unknown): string | null {
  const code = lireChamp(erreur, 'code')
  if (code === 'P0001') return lireChamp(erreur, 'message')
  if (code === '42501') return MESSAGE_ACCES_REFUSE
  return null
}
