import { createContext, useContext } from 'react'
import type { LigneConfiguration } from '@/features/indicateurs/configuration/lignes'
import type { EcrituresIndicateurs } from '@/features/indicateurs/configuration/panneaux/ecritures'
import type { SourceCalcul } from '@/features/indicateurs/configuration/panneaux/apercu'
import type { TypeCompte } from '@/lib/base'

/** Le panneau ou la fenêtre ouvert sur l'écran d'un ministère. */
export type PanneauOuvert =
  | { genre: 'ajout' }
  | { genre: 'calcul' }
  | { genre: 'corriger'; ligne: LigneConfiguration }
  | { genre: 'remplacer'; ligne: LigneConfiguration }
  | { genre: 'retirer'; ligne: LigneConfiguration }
  | { genre: 'confidentialite'; ligne: LigneConfiguration }

/** Les genres qui prennent la page entière sous 600 px ; les fenêtres de retrait restent des fenêtres. */
export function estPanneauDePage(panneau: PanneauOuvert | null): boolean {
  return panneau !== null && panneau.genre !== 'retirer' && panneau.genre !== 'confidentialite'
}

/** Ce que partagent les boutons d'action, les panneaux et les fenêtres d'un ministère. */
export interface ControleurPanneaux {
  ecritures: EcrituresIndicateurs
  ministere: { id: string; nom: string }
  profil: TypeCompte
  /** Indicateurs saisis, actifs et sans domaine sensible : les sources possibles d'un calcul. */
  sources: readonly SourceCalcul[]
  /** Calculs suivis de la fiche : la fenêtre « Retirer » nomme ceux qui partent avec l'indicateur. */
  calculs: readonly { id: string; libelle: string }[]
  panneau: PanneauOuvert | null
  ouvrir: (panneau: PanneauOuvert) => void
  fermer: () => void
  /** Ferme le panneau et annonce la réussite (6 secondes, `role="status"`). */
  terminer: (message: string) => void
  reussite: string | null
  /** Numéro de la réussite : deux réussites de suite affichent chacune leur message. */
  envoi: number
}

export const ContextePanneaux = createContext<ControleurPanneaux | null>(null)

/** Le contrôleur des panneaux, ou `null` quand l'écran n'a aucune écriture (lecture seule). */
export function usePanneaux(): ControleurPanneaux | null {
  return useContext(ContextePanneaux)
}
