import { z } from 'zod'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import { MESSAGES_BASE_MODERATION } from '@/features/moderation/textes'

// Lecture d'un refus de la base après « Rien à signaler » ou « Masquer définitivement » : un refus
// de saisie (P0001 : « Texte introuvable, vide ou déjà masqué. », « Ce texte a déjà été relu. »)
// se dit tel quel, un refus de droit (42501) dit que l'élément n'est pas accessible, et tout le
// reste est un problème de connexion (la fenêtre reste ouverte, le choix gardé).

function lireErreur(erreur: unknown): { code: string; message: string } | null {
  if (typeof erreur !== 'object' || erreur === null) return null
  const { code, message } = erreur as { code?: unknown; message?: unknown }
  if (typeof code !== 'string' || typeof message !== 'string') return null
  return { code, message }
}

/** Phrase d'un refus, à montrer sous les boutons de la ligne ou de la fenêtre. */
export function lireRefusModeration(erreur: unknown): string {
  if (erreur instanceof z.ZodError) return erreur.issues[0]?.message ?? TEXTES_VIDES.page.erreur
  const lue = lireErreur(erreur)
  if (!lue) return TEXTES_VIDES.page.erreur
  if (lue.code === 'P0001') return lue.message
  if (lue.code === '42501') return MESSAGES_BASE_MODERATION.acces
  return TEXTES_VIDES.page.erreur
}
