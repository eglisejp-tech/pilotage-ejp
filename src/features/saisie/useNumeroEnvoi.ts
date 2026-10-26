import { useMemo, useRef } from 'react'
import { premierEnvoiEnregistre } from '@/data/echecEnvoi'
import { tirerNumero } from '@/data/envoi'

export interface NumeroEnvoi {
  /** Le numéro de l'envoi : tiré au premier envoi, le même à chaque nouvel essai. */
  tirer: () => string
  /** Après une réussite : le formulaire vidé en tirera un autre. */
  oublier: () => void
  /**
   * Après un échec : le numéro est oublié seulement si la base dit que le premier envoi est déjà
   * enregistré, avec d'autres valeurs (un nouvel envoi volontaire créera autre chose). Après un
   * autre refus, il reste, sans effet : la base n'a rien gardé.
   */
  apresEchec: (erreur: unknown) => void
}

/**
 * Numéro anti-doublon d'un formulaire de création (événement, point, signalement ; T76, lot B,
 * Proposé Q3) : tiré au premier envoi, gardé jusqu'à la réussite, perdu à la fermeture du
 * formulaire. Un nouvel essai, automatique ou à la main, renvoie le même numéro : la base
 * reconnaît l'envoi et ne crée rien de plus.
 */
export function useNumeroEnvoi(): NumeroEnvoi {
  const numero = useRef<string | null>(null)
  return useMemo(
    () => ({
      tirer: () => (numero.current ??= tirerNumero()),
      oublier: () => {
        numero.current = null
      },
      apresEchec: (erreur: unknown) => {
        if (premierEnvoiEnregistre(erreur)) numero.current = null
      },
    }),
    [],
  )
}
