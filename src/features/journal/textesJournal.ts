// Textes de l'écran 06 « Journal » et du « Journal technique » d'EJP Tech (BRIEF, section 9 ;
// maquette 06 ; LISEZMOI, « États »). « Proposé » : l'introduction du ministère, la phrase du
// journal vide sans filtre et le compteur de lignes, que ni le BRIEF ni LISEZMOI ne donnent.

import { TAILLE_PAGE_JOURNAL } from '@/data/journal'
import type { TypeCompte } from '@/lib/base'

const COMMUN =
  'Chaque saisie, création et changement de statut laisse une ligne ici, avec la date et le compte. Personne ne peut modifier ni effacer le journal.'

export const TEXTES_JOURNAL = {
  /** Phrase sous le titre (maquette 06). Le ministère lit les lignes de son ministère (Proposé). */
  introduction: (profil: TypeCompte): string =>
    profil === 'ministere'
      ? 'Chaque saisie, création et changement de statut de votre ministère laisse une ligne ici, avec la date et le compte. Personne ne peut modifier ni effacer le journal.'
      : COMMUN,
  filtres: {
    groupe: 'Filtres du journal',
    compte: 'Compte',
    tousLesComptes: 'Tous les comptes',
    action: 'Action',
    toutesLesActions: 'Toutes les actions',
    periode: 'Période',
    /** Sous les filtres : « Ministère : Communication », avec « Retirer le filtre ». */
    ministere: (nom: string) => `Ministère : ${nom}`,
    retirerMinistere: 'Retirer le filtre',
  },
  /** Ajouté au nom d'un compte ou d'un ministère désactivé. */
  desactive: '(désactivé)',
  entetes: { date: 'Date', compte: 'Compte', action: 'Action', detail: 'Détail' },
  liste: 'Lignes du journal',
  /** Mots lus avant chaque valeur d'une ligne, quand le tableau devient une liste (téléphone). */
  motsDeLigne: { compte: 'Compte', action: 'Action', detail: 'Détail' },
  vide: {
    /** Situation « aucun résultat » (T36) : un filtre est choisi. */
    pourCesFiltres: 'Aucune ligne pour ces filtres.',
    retirer: 'Retirer les filtres',
    /** Situation « premier usage » : aucun filtre, aucune ligne (Proposé). */
    sansFiltre: "Le journal est vide pour l'instant. Chaque saisie y laissera une ligne.",
  },
  plus: `Afficher ${TAILLE_PAGE_JOURNAL} lignes de plus`,
  /** Sous la liste, annoncé à voix haute après « Afficher 50 lignes de plus » (Proposé). */
  compteur: (affichees: number, aPlus: boolean) =>
    aPlus ? `${affichees} lignes affichées.` : `Toutes les lignes sont affichées (${affichees}).`,
  chargement: 'Chargement',
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
} as const
