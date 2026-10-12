import type { TypeCompte } from '@/lib/base'

/** Libellés d'exemple, comme ceux du jeu d'exemple (jamais le nom d'une personne). */
export const LIBELLES_EXEMPLE: Record<TypeCompte, string> = {
  ministere: 'Ministère Communication',
  berger: 'Berger',
  conseil: 'Conseil, compte 1',
  admin_eglise: "Administration de l'église",
  admin_plateforme: 'EJP Tech, compte 1',
}

/**
 * Profil demandé par ?profil=, berger par défaut. Un écran réservé à un autre profil donne le sien
 * (l'aperçu des indicateurs : l'administration de l'église), pour que l'en-tête et l'écran
 * disent la même chose.
 */
export function lireProfilApercu(
  valeur: string | null,
  parDefaut: TypeCompte = 'berger',
): TypeCompte {
  return valeur !== null && valeur in LIBELLES_EXEMPLE ? (valeur as TypeCompte) : parDefaut
}
