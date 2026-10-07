// Données de l'écran 05 « Points d'attention » et de « Mes points », prêtes à afficher : les
// textes arrivent déjà écrits (dates à l'heure de Paris, auteur du traitement). Les composants ne
// calculent aucune règle métier. Contrat entre `construirePoints.ts` (lectures de la base ou de
// l'aperçu) et les composants de `src/features/points/`.

import type { TexteLibre } from '@/features/cette-semaine/types'
import type { PointDesActions } from '@/features/points-actions/ActionsPoint'
import type { Priorite, StatutPoint } from '@/lib/base'

/** Un point en lecture : une rangée du tableau, ou une ligne de « Traités récemment ». */
export interface LignePoint {
  id: string
  priorite: Priorite
  /** Ministère créateur : « Intégration », « Social (désactivé) ». */
  ministere: string
  titre: TexteLibre
  description: TexteLibre | null
  attendu: TexteLibre | null
  /** Noms complets des ministères mentionnés : « @Coordination ». */
  mentions: string[]
  statut: StatutPoint
  /** « En attente de décision », « Traité ». */
  statutLibelle: string
  /** Point ouvert seulement : « 5 oct. » ou « 28 sept., dépassée » (rouge, avec le mot). */
  echeance: { texte: string; depassee: boolean } | null
  /** Point traité seulement. */
  traite: {
    /** « Traité le 30 sept. par Coordination » (sans auteur lisible : « Traité le 30 sept. »). */
    texte: string
    /** Auteur seul, pour la colonne de « Traités récemment » ; null s'il n'est pas lisible. */
    auteur: string | null
    commentaire: TexteLibre | null
  } | null
  /** Ce que lisent les boutons « Changer le statut » et « Marquer traité » (lot P1). */
  actions: PointDesActions
}

/** Un ministère du filtre « Tous les ministères ». */
export interface OptionMinistere {
  id: string
  /** « Social (désactivé) » pour un ministère désactivé. */
  nom: string
}

export interface DonneesPoints {
  /** Choix du filtre ; null pour un ministère, dont « Mes points » n'a pas de filtre. */
  ministeres: OptionMinistere[] | null
  /** Ministère retenu par le filtre ; null : « Tous les ministères ». */
  ministereChoisi: OptionMinistere | null
  /** Onglet « Ouverts » : par priorité, puis échéance, puis création. */
  ouverts: LignePoint[]
  /** Onglet « Traités » : du plus récent au plus ancien traitement. */
  traites: LignePoint[]
  /** Onglet « Tous » : les ouverts, puis les traités (`trierTous`). */
  tous: LignePoint[]
  /** « Traités récemment » : les 5 derniers traités. */
  recents: LignePoint[]
}
