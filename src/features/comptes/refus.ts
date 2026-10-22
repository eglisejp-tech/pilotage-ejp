import { z } from 'zod'
import {
  CONNEXION_FENETRE_COMPTE,
  ErreurCompte,
  MESSAGES_ERREURS_COMPTES,
  REFUS_ACTION_COMPTE,
} from '@/data/comptes'

/** Où se dit un refus : sous un champ du panneau, ou sous le bouton (ou dans la fenêtre). */
export type PlaceRefus = 'email' | 'nom' | 'formulaire'

export interface RefusCompte {
  ou: PlaceRefus
  message: string
}

/**
 * D'où vient la demande : un panneau d'ajout (avec des champs), le bouton d'une ligne, ou une
 * fenêtre de confirmation, qui cache la liste (T66, m183 et m186).
 */
export type OrigineDemande = 'panneau' | 'ligne' | 'fenetre'

/**
 * Place et phrase d'un refus des fonctions de comptes. L'adresse déjà utilisée se dit sous le
 * champ « Email », le nom déjà pris sous « Nom du ministère » ; tout le reste sous le bouton.
 * Un identifiant de compte refusé par le schéma avant tout appel dit que le compte est
 * introuvable (m197). Une demande refusée par le schéma dit de vérifier les champs dans un
 * panneau ; une action sans champ (ligne, fenêtre) dit de recharger la page (m186). Une réponse
 * absente dit de vérifier la liste avant de réessayer, en fermant d'abord la fenêtre qui la cache
 * (m183).
 */
export function lireRefusCompte(erreur: unknown, origine: OrigineDemande = 'panneau'): RefusCompte {
  const refusDeDemande =
    origine === 'panneau' ? MESSAGES_ERREURS_COMPTES.requete_invalide : REFUS_ACTION_COMPTE
  if (erreur instanceof z.ZodError) {
    const probleme = erreur.issues[0]
    if (probleme?.path[0] === 'user_id') return { ou: 'formulaire', message: probleme.message }
    return { ou: 'formulaire', message: refusDeDemande }
  }
  if (!(erreur instanceof ErreurCompte) || erreur.code === 'connexion') {
    return {
      ou: 'formulaire',
      message:
        origine === 'fenetre' ? CONNEXION_FENETRE_COMPTE : MESSAGES_ERREURS_COMPTES.connexion,
    }
  }
  if (erreur.code === 'requete_invalide') return { ou: 'formulaire', message: refusDeDemande }
  if (erreur.code === 'adresse_deja_utilisee') return { ou: 'email', message: erreur.message }
  if (erreur.code === 'nom_ministere_deja_pris') return { ou: 'nom', message: erreur.message }
  return { ou: 'formulaire', message: erreur.message }
}
