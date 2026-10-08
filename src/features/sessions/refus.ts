import { z } from 'zod'
import { TEXTES_SESSIONS } from '@/features/sessions/textes'

// Lecture d'un refus de la base après « Déclarer », « Enregistrer » ou « Supprimer » : une erreur
// de saisie (P0001) se dit telle quelle (« Une session Bâtir l'Église est déjà déclarée le
// samedi 10 octobre. »), un refus de droit (42501) dit que la session n'est pas accessible, et
// tout le reste est un problème de connexion (les valeurs restent dans le formulaire).

function lireErreur(erreur: unknown): { code: string; message: string } | null {
  if (typeof erreur !== 'object' || erreur === null) return null
  const { code, message } = erreur as { code?: unknown; message?: unknown }
  if (typeof code !== 'string' || typeof message !== 'string') return null
  return { code, message }
}

/** Phrase d'un refus, avec la phrase de connexion propre au formulaire qui l'a reçu. */
export function lireRefusSession(erreur: unknown, connexion: string): string {
  if (erreur instanceof z.ZodError) return erreur.issues[0]?.message ?? connexion
  const lue = lireErreur(erreur)
  if (!lue) return connexion
  if (lue.code === 'P0001') return lue.message
  if (lue.code === '42501') return TEXTES_SESSIONS.erreurAcces
  return connexion
}
