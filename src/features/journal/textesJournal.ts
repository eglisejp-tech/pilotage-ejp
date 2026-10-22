// Textes de l'écran 06 « Journal » et du « Journal technique » d'EJP Tech (BRIEF, section 9 ;
// maquette 06 ; LISEZMOI, « États »). « Proposé » : l'introduction du ministère, la phrase du
// journal vide sans filtre et le compteur de lignes, que ni le BRIEF ni LISEZMOI ne donnent.

import { TAILLE_PAGE_JOURNAL } from '@/data/journal'
import type { TypeCompte } from '@/lib/base'

// Ce que contient le journal, sans dire qu'il ne se modifie pas (T66, t372 et t373 ; guide,
// exemple 6) : l'inaltérabilité est sur la page d'aide.
const COMMUN = 'Ce que chaque compte a saisi ou modifié, avec la date.'

export const TEXTES_JOURNAL = {
  /** Phrase sous le titre (maquette 06). Le ministère lit les lignes de son ministère (Proposé). */
  introduction: (profil: TypeCompte): string =>
    profil === 'ministere' ? 'Ce que votre ministère a saisi ou modifié, avec la date.' : COMMUN,
  filtres: {
    groupe: 'Filtres du journal',
    compte: 'Compte',
    tousLesComptes: 'Tous les comptes',
    action: 'Action',
    toutesLesActions: 'Toutes les actions',
    periode: 'Période',
    /** Sous les filtres : « Ministère : Communication », avec « Voir tous les ministères » (t375). */
    ministere: (nom: string) => `Ministère : ${nom}`,
    retirerMinistere: 'Voir tous les ministères',
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
    /**
     * Situation « premier usage » : aucun filtre, aucune ligne. Forme de m238, qui corrige t376 :
     * un état vide ne dit pas « pour l'instant » (guide, 10.5).
     */
    sansFiltre: 'Aucune ligne.',
  },
  plus: `Afficher ${TAILLE_PAGE_JOURNAL} lignes de plus`,
  /** Sous la liste, annoncé à voix haute après « Afficher 50 lignes de plus » (Proposé). */
  compteur: (affichees: number, aPlus: boolean) =>
    aPlus ? `${affichees} lignes affichées.` : `Toutes les lignes sont affichées (${affichees}).`,
  /** Avec la flamme vivante, après 300 ms sans réponse (T65 : le texte dit ce qui charge). */
  chargement: 'Chargement du journal',
  erreur: 'La connexion a échoué. Réessayez.',
  reessayer: 'Réessayer',
} as const
