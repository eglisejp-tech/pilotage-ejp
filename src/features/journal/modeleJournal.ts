// Données de l'écran 06 « Journal », prêtes à afficher : les textes arrivent déjà écrits (dates à
// l'heure de Paris, action en mots, détail en phrase). Les composants ne calculent aucune règle
// métier. Contrat entre `construireJournal.ts` et `useJournal.ts` (lectures de la base ou de
// l'aperçu) d'une part, et les composants de `src/features/journal/` d'autre part.

import type { FiltresJournal } from '@/features/journal/filtres'
import type { CodeAction } from '@/features/journal/libellesActions'

/** Un morceau du détail ; `masque` : texte libre que EJP Tech a masqué, affiché en `--encre-3`. */
export interface SegmentDetail {
  texte: string
  masque: boolean
}

/** Une ligne du tableau. */
export interface LigneJournalAffichee {
  id: number
  /** « 27 sept., 12 h 41 » (heure de Paris). */
  quand: string
  /** « Berger », « Communication », « Système ». */
  compte: string
  /** « A saisi des chiffres ». */
  action: string
  /** Texte actuel de l'objet visé, avec ce que la ligne dit de plus. */
  detail: SegmentDetail[]
}

/** Un compte du filtre « Compte ». */
export interface OptionCompte {
  id: string
  /** « Berger », « Communication (désactivé) ». */
  libelle: string
}

/** Une action du filtre « Action ». */
export interface OptionAction {
  code: CodeAction
  libelle: string
}

/** Un ministère de l'adresse. */
export interface OptionMinistere {
  id: string
  nom: string
}

export interface DonneesJournal {
  /** Les filtres retenus : ceux de l'adresse, moins ce que le profil ou la liste ne connaît pas. */
  filtres: FiltresJournal
  /** Choix du filtre « Compte » ; null pour un ministère, qui n'a pas ce filtre. */
  comptes: readonly OptionCompte[] | null
  /** Choix du filtre « Action », ceux que le profil peut lire. */
  actions: readonly OptionAction[]
  /** Ministère de l'adresse, nommé dans « Ministère : Communication » ; null : tous. */
  ministereChoisi: OptionMinistere | null
  lignes: readonly LigneJournalAffichee[]
  /** Reste-t-il des lignes après celles-ci : « Afficher 50 lignes de plus ». */
  aPlus: boolean
  /** Une nouvelle lecture est en cours : les lignes montrées sont celles d'avant le filtre. */
  enMiseAJour: boolean
}
