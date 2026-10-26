import { z } from 'zod'
import { lireEchec } from '@/data/echecEnvoi'

// Lecture d'un échec après « Valider » ou « Refuser » (`valider_indicateur`, validation-metier.md,
// 2.4), par le classement unique de `src/data/echecEnvoi.ts` (T76) : un refus du motif (longueur,
// données personnelles, crochets) se dit sous le champ ; un refus qui porte sur la demande (déjà
// décidée, demande sortie, refus de droit 42501) se dit en haut du bloc, la liste relue. Une
// connexion expirée, un compte désactivé, un refus inattendu (repli) ou un échec technique ne
// disent rien de la demande : la phrase reste sous les boutons, la fenêtre reste ouverte et garde
// le motif. Une décision se refait sans doublon (la base dit « déjà décidée »).

export type RefusValidation =
  /** Sous le champ du motif. */
  | { ou: 'champ'; message: string }
  /** Refus de la demande elle-même : en haut du bloc, la fenêtre se ferme, la liste se relit. */
  | { ou: 'bouton'; message: string }
  /** Sous les boutons de la ligne ou de la fenêtre, qui reste ouverte avec son motif. */
  | { ou: 'formulaire'; message: string; reference: string | null }

/**
 * Place et texte d'un échec, pour la ligne ou la fenêtre qui l'a reçu. `formulaire` faux pour
 * « Valider », qui n'a rien à garder : le repli dit alors « L'action n'a pas abouti. », et un
 * échec technique la phrase `connexion` de la ligne.
 */
export function lireRefusValidation(
  erreur: unknown,
  options: { formulaire?: boolean; connexion?: string } = {},
): RefusValidation {
  const lu = lireEchec(erreur, {
    nature: options.formulaire === false ? 'action' : 'reprise',
    connexion: options.connexion,
  })
  if (lu.nature !== 'refus') {
    return { ou: 'formulaire', message: lu.message, reference: lu.reference }
  }
  return lu.champ === 'texte' || erreur instanceof z.ZodError
    ? { ou: 'champ', message: lu.message }
    : { ou: 'bouton', message: lu.message }
}
