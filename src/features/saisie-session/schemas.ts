import { z } from 'zod'
import { lireChamp, MESSAGE_NOMBRE_ENTIER } from '@/features/saisie/chiffres'

// Schéma de la présence à une session (maquette 09), partagé entre le formulaire et l'appel à la
// base (CLAUDE.md : validation Zod partagée). La base reste l'autorité : `participation` refuse
// `deja_comptes` hors de 0 à `valeur` et `valeur` hors de 0 à 9 999 ; le schéma suit le BRIEF
// (section 9, « Saisie d'une session » : 0 à 999 présents) et évite l'aller-retour.

/**
 * Identifiant d'une session dans l'adresse (`/saisir/session/:id`) : un uuid. Partagé entre la
 * page et la lecture, pour qu'une adresse fausse ne devienne jamais une requête.
 */
export const schemaIdentifiantSession = z.guid()

/** Présents d'un ministère à une session : 0 à 999 (BRIEF, section 9). */
export const PRESENTS_MAX = 999

// T66 (t113, t114, m102, m109) : un champ vide dit que 0 est permis, une borne commence par
// l'action, et « Dont déjà comptés » donne le nombre exact à ne pas dépasser.
export const MESSAGES_SESSION = {
  presentsManquants: 'Saisissez un nombre, 0 si aucun.',
  presentsBornes: 'Saisissez un nombre entre 0 et 999.',
  dejaComptesManquants: 'Saisissez un nombre, 0 si aucun.',
} as const

/** BRIEF, section 9 : sous le champ « Dont déjà comptés » (« Saisissez 12 au plus, ... »). */
export function messageDejaComptesTropGrand(presents: number): string {
  return `Saisissez ${presents} au plus, le nombre de présents.`
}

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
  .superRefine((saisie, contexte) => {
    if (saisie.dejaComptes <= saisie.valeur) return
    contexte.addIssue({
      code: 'custom',
      message: messageDejaComptesTropGrand(saisie.valeur),
      path: ['dejaComptes'],
    })
  })

export type SaisieParticipation = z.infer<typeof schemaParticipation>

/** Champs du formulaire, en texte (un champ vide n'est jamais un 0). */
export interface ChampsSession {
  presents: string
  dejaComptes: string
}

export type ErreursSession = Partial<Record<keyof ChampsSession, string>>

/**
 * Erreurs de chaque champ du formulaire, d'après le schéma partagé. Vide : rien à corriger. Un
 * texte qui n'est pas un nombre entier (« 12,5 ») n'est jamais converti (m100).
 */
export function erreursSession(
  champs: ChampsSession,
  ids: { sessionId: string; ministereId: string },
): ErreursSession {
  const presents = lireChamp(champs.presents)
  const dejaComptes = lireChamp(champs.dejaComptes)
  const erreurs: ErreursSession = {}
  // Un texte à corriger garde sa consigne ; l'autre champ reçoit quand même son propre message.
  if (presents.etat === 'format') erreurs.presents = MESSAGE_NOMBRE_ENTIER
  if (dejaComptes.etat === 'format') erreurs.dejaComptes = MESSAGE_NOMBRE_ENTIER
  const resultat = schemaParticipation.safeParse({
    ...ids,
    valeur: presents.etat === 'nombre' ? presents.valeur : undefined,
    dejaComptes: dejaComptes.etat === 'nombre' ? dejaComptes.valeur : undefined,
  })
  if (resultat.success) return erreurs
  for (const probleme of resultat.error.issues) {
    const champ = probleme.path[0] === 'valeur' ? 'presents' : probleme.path[0]
    if ((champ === 'presents' || champ === 'dejaComptes') && !erreurs[champ]) {
      erreurs[champ] = probleme.message
    }
  }
  return erreurs
}
