import { z } from 'zod'
import { lireEchec } from '@/data/echecEnvoi'
import type { NatureEnvoi } from '@/data/echecEnvoi'

// Lecture d'un échec après « Envoyer pour validation » (`ajouter_suggestion`, validation-metier.md,
// 2.4 et configuration-indicateurs.md, 4.2), par le classement unique de `src/data/echecEnvoi.ts`
// (T76, m233) : un refus du « Pourquoi » (longueur, données personnelles, crochets) se dit sous le
// champ ; un refus de limite (3 ajouts, 30 lignes), de doublon ou de suggestion inconnue, un refus
// de droit (42501), une connexion expirée, un compte désactivé ou un refus inattendu se disent
// sous le bouton. Une demande dont l'issue est inconnue (aucune réponse, réponse perdue, délai)
// dit de vérifier la liste avant de réessayer ; un échec technique porte sa référence.

export type RefusSuggestion =
  /** Sous le champ « Pourquoi ». */
  | { ou: 'champ'; message: string }
  /** Sous le bouton, avec la référence d'un échec technique. */
  | { ou: 'bouton'; message: string; reference: string | null }

function lireRefus(erreur: unknown, nature: NatureEnvoi): RefusSuggestion {
  const lu = lireEchec(erreur, { nature })
  return lu.nature === 'refus' && (lu.champ === 'texte' || erreur instanceof z.ZodError)
    ? { ou: 'champ', message: lu.message }
    : { ou: 'bouton', message: lu.message, reference: lu.reference }
}

/**
 * Le même partage pour la fenêtre « Retirer » d'un ajout (T62, `retirer_mon_indicateur`) : un
 * refus du motif (longueur, données personnelles, crochets) sous le champ ; un ajout déjà retiré,
 * la source d'un calcul ou un refus de droit sous les boutons, la fenêtre ouverte. Un retrait se
 * refait sans doublon : la phrase de connexion.
 */
export function lireRefusRetrait(erreur: unknown): RefusSuggestion {
  return lireRefus(erreur, 'reprise')
}

/** Place et texte d'un échec de « Envoyer pour validation » (une création). */
export function lireRefusSuggestion(erreur: unknown): RefusSuggestion {
  return lireRefus(erreur, 'creation')
}
