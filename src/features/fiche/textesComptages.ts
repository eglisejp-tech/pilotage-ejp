// Textes des blocs « Événements de l'église » et « Ponctualité » de la fiche de Coordination (lot
// L2, X10 ; T68). Français simple, voix active, aucun tiret cadratin ni demi-cadratin.

import { terminerPhrase } from '@/lib/metier/texte'

export const TEXTES_COMPTAGES = {
  titreEvenements: "Événements de l'église",
  titrePonctualite: 'Ponctualité',
  /** À droite du titre de « Ponctualité » : ce que dit la grande valeur. */
  colonnePonctualite: "Part commencée à l'heure",
  chargementEvenements: "Chargement des événements de l'église",
  chargementPonctualite: 'Chargement de la ponctualité',
  probleme: 'La connexion a échoué. Réessayez.',
  premierUsage: "Pas encore d'événement déclaré.",
  quiDeclare: 'Chaque ministère déclare ses événements sur sa fiche.',
  lignes: {
    realises: 'Réalisés',
    prevus: 'Prévus',
    annules: 'Annulés',
    reportes: 'Reportés',
    en_attente: 'En attente de validation',
    passes_sans_etat_final: 'Passés sans état final',
  },
  cultes: 'Cultes',
  autres: 'Autres événements',
  retardMoyen: 'Retard moyen',
  /** « 4 sur 6 ont leurs heures », « 1 sur 2 a ses heures ». */
  ontLeursHeures: (completude: string, avecHeures: number) =>
    `${completude} ${avecHeures > 1 ? 'ont leurs heures' : 'a ses heures'}`,
  depuis: (jour: string) => `Depuis le ${jour}`,
  /** Sous les comptages : le départ, toujours nommé. */
  noteEvenements: (jour: string) =>
    terminerPhrase(`Événements déclarés dans l'outil, comptés depuis le ${jour}`),
  notePonctualite:
    "À l'heure : commencé au plus 5 minutes après l'heure prévue. Une avance compte comme 0 minute de retard.",
  retards: {
    /** Résumé de la liste repliée : « Voir les 2 événements commencés en retard en septembre ». */
    resume: (nombre: number, mois: string) =>
      nombre > 1
        ? `Voir les ${nombre} événements commencés en retard en ${mois}`
        : `Voir l'événement commencé en retard en ${mois}`,
    chargement: 'Chargement des retards',
    retard: (minutes: string) => `${minutes} de retard`,
  },
} as const
