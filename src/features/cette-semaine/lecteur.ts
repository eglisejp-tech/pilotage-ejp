import type { Compte } from '@/data/compte'
import type { TypeSession } from '@/lib/metier/phrases'
import type { Lecteur } from './types'

/**
 * Qui lit « Cette semaine », d'après le compte connecté. Null : ce compte n'a pas de vue de
 * l'église (EJP Tech, renvoyé vers /moderation) ou un compte de ministère sans ministère.
 */
export function lecteurDuCompte(compte: Pick<Compte, 'type' | 'ministereId'>): Lecteur | null {
  switch (compte.type) {
    case 'berger':
    case 'conseil':
    case 'admin_eglise':
      return { profil: compte.type }
    case 'ministere':
      return compte.ministereId ? { profil: 'ministere', ministereId: compte.ministereId } : null
    case 'admin_plateforme':
      return null
  }
}

const TYPES_SESSION: readonly TypeSession[] = ['batir', 'anti_dispersion', 'autre']

/**
 * Type de session choisi par `?session=` (« Voir Anti-Dispersion », T20). Null : absent ou
 * inconnu, la vue montre la dernière session passée, tous types confondus.
 */
export function typeSessionDeLAdresse(valeur: string | null): TypeSession | null {
  return TYPES_SESSION.find((type) => type === valeur) ?? null
}
