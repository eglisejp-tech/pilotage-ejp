import { ErreurCompte, MESSAGES_ERREURS_COMPTES } from '@/data/comptes'

/** Où se dit un refus : sous un champ du panneau, ou sous le bouton (ou dans la fenêtre). */
export type PlaceRefus = 'email' | 'nom' | 'formulaire'

export interface RefusCompte {
  ou: PlaceRefus
  message: string
}

/**
 * Place et phrase d'un refus des fonctions de comptes. L'adresse déjà utilisée se dit sous le
 * champ « Email », le nom déjà pris sous « Nom du ministère » ; tout le reste sous le bouton.
 * Une erreur qui n'est pas un refus (réponse absente) devient « La connexion a échoué. ».
 */
export function lireRefusCompte(erreur: unknown): RefusCompte {
  if (!(erreur instanceof ErreurCompte)) {
    return { ou: 'formulaire', message: MESSAGES_ERREURS_COMPTES.connexion }
  }
  if (erreur.code === 'adresse_deja_utilisee') return { ou: 'email', message: erreur.message }
  if (erreur.code === 'nom_ministere_deja_pris') return { ou: 'nom', message: erreur.message }
  return { ou: 'formulaire', message: erreur.message }
}
