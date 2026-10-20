// Textes de « Nouveau point » (maquette 10, BRIEF section 9, plan de l'étape 5, lot P2). Le
// formulaire n'a plus de bulle (T66) : ce qu'il faut pour remplir est une indication visible sous
// le champ (`indicationAttendu`, `indicationEcheance`). Les messages de la base et la réussite
// sont dans `src/data/pointsEcriture.ts`, le rappel sur les données personnelles et le lien
// « Signaler une difficulté » dans leurs briques : ils ne sont pas réécrits ici. Un champ
// facultatif le dit dans son libellé (LISEZMOI, « Validation »).

import type { Priorite } from '@/lib/base'

/** Les trois priorités, dans l'ordre de la maquette 10, avec leur libellé. */
export const PRIORITES_POINT: readonly { valeur: Priorite; libelle: string }[] = [
  { valeur: 'normale', libelle: 'Normale' },
  { valeur: 'haute', libelle: 'Haute' },
  { valeur: 'urgente', libelle: 'Urgente' },
]

export const TEXTES_POINT = {
  /** Même nom que le bouton qui ouvre le formulaire (T66, t230). */
  titre: 'Nouveau point',
  libelleTitre: 'Titre',
  libelleDescription: 'Ce qui se passe (facultatif)',
  libellePriorite: 'Priorité',
  libelleAttendu: 'Ce qui est attendu (facultatif)',
  /** Indication sous « Ce qui est attendu » (ancienne bulle `point.attendu`, T66 t238). */
  indicationAttendu: 'Exemple : confirmer la salle avant samedi.',
  libelleEcheance: 'Échéance (facultatif)',
  /** Indication sous l'échéance (ancienne bulle `point.echeance`, T66 t239). */
  indicationEcheance: 'Le dernier jour où une réponse vous est utile.',
  /** Titre du groupe de cases, le même que pour un événement (T66, t232). */
  titreMentions: 'Ministères mentionnés (facultatif)',
  /** Note sous les mentions (T66, t233 et t234 : une phrase, sans les droits). */
  noteMentions: 'Le ministère mentionné verra ce point et pourra le marquer traité.',
  /** Aucun ministère à cocher, le même texte que pour un événement (T66, t235). */
  aucuneMention: 'Aucun autre ministère à mentionner.',
  bouton: 'Créer le point',
  /** Règle commune : « Enregistrement en cours » (T66, t236). */
  boutonEnCours: 'Enregistrement en cours',
  /** Erreur de formulaire de LISEZMOI, dite pour un point (les valeurs restent). */
  erreurConnexion: 'La connexion a échoué. Votre point est encore dans le formulaire : réessayez.',
} as const
