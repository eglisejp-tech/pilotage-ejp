// Textes de « Nouveau point d'attention » (maquette 10, BRIEF section 9, plan de l'étape 5, lot P2).
// Les aides en bulle sont dans `src/components/aide/textesAide.ts` (point.priorite, point.attendu,
// point.echeance), les messages de la base et la réussite dans `src/data/pointsEcriture.ts`, le
// rappel sur les données personnelles et le lien « Signaler une difficulté » dans leurs briques :
// ils ne sont pas réécrits ici. Un champ facultatif le dit dans son libellé (LISEZMOI, « Validation »).

import type { Priorite } from '@/lib/base'

/** Les trois priorités, dans l'ordre de la maquette 10, avec leur libellé. */
export const PRIORITES_POINT: readonly { valeur: Priorite; libelle: string }[] = [
  { valeur: 'normale', libelle: 'Normale' },
  { valeur: 'haute', libelle: 'Haute' },
  { valeur: 'urgente', libelle: 'Urgente' },
]

export const TEXTES_POINT = {
  titre: "Nouveau point d'attention",
  libelleTitre: 'Titre',
  libelleDescription: 'Ce qui se passe (facultatif)',
  libellePriorite: 'Priorité',
  libelleAttendu: 'Ce qui est attendu (facultatif)',
  libelleEcheance: 'Échéance (facultatif)',
  /** Titre du groupe de cases : un champ facultatif le dit. */
  titreMentions: 'Mentionner un ministère (facultatif)',
  /** Note sous les mentions : BRIEF section 9 et LISEZMOI (écart de la maquette 10). */
  noteMentions:
    'Le ministère mentionné verra ce point, et seulement ce point. Il pourra le marquer traité en expliquant ce qui a été fait. Le berger et le conseil voient tous les points.',
  /** Texte visible sous la note (BRIEF règle 7 : les mentions sont fixées à la création). */
  mentionsFigees: 'Les mentions se choisissent à la création et ne changent plus.',
  /** Aucun ministère à cocher. */
  aucuneMention: 'Aucun autre ministère actif à mentionner.',
  bouton: 'Créer le point',
  boutonEnCours: 'Envoi en cours',
  /** Erreur de formulaire de LISEZMOI, dite pour un point (les valeurs restent). */
  erreurConnexion: 'La connexion a échoué. Votre point est encore dans le formulaire : réessayez.',
} as const
