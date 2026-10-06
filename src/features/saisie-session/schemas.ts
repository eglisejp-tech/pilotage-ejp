import { z } from 'zod'

// Schéma de la présence à une session (maquette 09), partagé entre le formulaire et l'appel à la
// base (CLAUDE.md : validation Zod partagée). La base reste l'autorité : `participation` refuse
// `deja_comptes` hors de 0 à `valeur` et `valeur` hors de 0 à 9 999 ; le schéma suit le BRIEF
// (section 9, « Saisie d'une session » : 0 à 999 présents) et évite l'aller-retour.

/** Présents d'un ministère à une session : 0 à 999 (BRIEF, section 9). */
export const PRESENTS_MAX = 999

export const MESSAGES_SESSION = {
  presentsManquants: 'Saisissez le nombre de STARs présents.',
  presentsBornes: 'Entre 0 et 999.',
  dejaComptesManquants: 'Saisissez un nombre, 0 si aucun.',
  /** BRIEF, section 9 : sous le champ « Dont déjà comptés ». */
  dejaComptesTropGrand: 'Ce nombre ne peut pas dépasser les présents.',
} as const

const entier = (manquant: string) =>
  z
    .number({ error: manquant })
    .int(MESSAGES_SESSION.presentsBornes)
    .min(0, MESSAGES_SESSION.presentsBornes)
    .max(PRESENTS_MAX, MESSAGES_SESSION.presentsBornes)

/** Une présence : tous les STARs présents, puis ceux déjà comptés par leur ministère principal. */
export const schemaParticipation = z
  .object({
    sessionId: z.string().min(1),
    ministereId: z.string().min(1),
    valeur: entier(MESSAGES_SESSION.presentsManquants),
    dejaComptes: entier(MESSAGES_SESSION.dejaComptesManquants),
  })
  .refine((saisie) => saisie.dejaComptes <= saisie.valeur, {
    message: MESSAGES_SESSION.dejaComptesTropGrand,
    path: ['dejaComptes'],
  })

export type SaisieParticipation = z.infer<typeof schemaParticipation>

/** Champs du formulaire, en texte (un champ vide n'est jamais un 0). */
export interface ChampsSession {
  presents: string
  dejaComptes: string
}

export type ErreursSession = Partial<Record<keyof ChampsSession, string>>

/** Erreurs de chaque champ du formulaire, d'après le schéma partagé. Vide : rien à corriger. */
export function erreursSession(
  champs: ChampsSession,
  ids: { sessionId: string; ministereId: string },
): ErreursSession {
  const resultat = schemaParticipation.safeParse({
    ...ids,
    valeur: champs.presents === '' ? undefined : Number(champs.presents),
    dejaComptes: champs.dejaComptes === '' ? undefined : Number(champs.dejaComptes),
  })
  if (resultat.success) return {}
  const erreurs: ErreursSession = {}
  for (const probleme of resultat.error.issues) {
    const champ = probleme.path[0] === 'valeur' ? 'presents' : probleme.path[0]
    if ((champ === 'presents' || champ === 'dejaComptes') && !erreurs[champ]) {
      erreurs[champ] = probleme.message
    }
  }
  return erreurs
}
