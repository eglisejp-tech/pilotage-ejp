import type { TypeCompte } from '@/lib/base'

/** Libellés d'exemple, comme ceux du jeu d'exemple (jamais le nom d'une personne). */
export const LIBELLES_EXEMPLE: Record<TypeCompte, string> = {
  ministere: 'Ministère Communication',
  berger: 'Berger',
  conseil: 'Conseil, compte 1',
  admin_eglise: "Administration de l'église",
  admin_plateforme: 'EJP Tech, compte 1',
}

/** Profil demandé par ?profil=, berger par défaut. */
export function lireProfilApercu(valeur: string | null): TypeCompte {
  return valeur !== null && valeur in LIBELLES_EXEMPLE ? (valeur as TypeCompte) : 'berger'
}
