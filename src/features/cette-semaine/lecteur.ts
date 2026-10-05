import type { Compte } from '@/data/compte'
import type { TypeSession } from '@/lib/metier/phrases'
import type { Lecteur, ProfilVue } from './types'

/**
 * Qui lit « Cette semaine », d'après le compte connecté. EJP Tech la lit comme le berger, en
 * lecture seule (docs/decisions.md, T29). Null : un compte de ministère sans ministère.
 */
export function lecteurDuCompte(compte: Pick<Compte, 'type' | 'ministereId'>): Lecteur | null {
  switch (compte.type) {
    case 'berger':
    case 'conseil':
    case 'admin_eglise':
    case 'admin_plateforme':
      return { profil: compte.type }
    case 'ministere':
      return compte.ministereId ? { profil: 'ministere', ministereId: compte.ministereId } : null
  }
}

/**
 * Profils dont la vue lit les points et montre « À décider » : le berger, le conseil, et EJP Tech
 * en lecture seule (T29). Ni le ministère (jusqu'à l'étape 4) ni l'administration de l'église.
 */
export function voitADecider(profil: ProfilVue): boolean {
  return profil === 'berger' || profil === 'conseil' || profil === 'admin_plateforme'
}

const TYPES_SESSION: readonly TypeSession[] = ['batir', 'anti_dispersion', 'autre']

/**
 * Type de session choisi par `?session=` (« Voir Anti-Dispersion », T20). Null : absent ou
 * inconnu, la vue montre la dernière session passée, tous types confondus.
 */
export function typeSessionDeLAdresse(valeur: string | null): TypeSession | null {
  return TYPES_SESSION.find((type) => type === valeur) ?? null
}
