import type { ComponentType } from 'react'
import { rechargerApresEchec } from '@/app/rechargement'

/**
 * Pendant que le code d'un écran arrive (T65, moment 2 ; Proposé, sur le modèle « Chargement de
 * … ») : rien pendant 300 ms, puis la flamme vivante et ce texte.
 */
export const TEXTE_CHARGEMENT_ECRAN = 'Chargement de la page'

/**
 * Écran chargé à la demande (découpage du code par écran) : son code n'est pas dans le premier
 * chargement de l'outil, il arrive la première fois que l'écran s'ouvre. Une fois chargé, il
 * reste en mémoire jusqu'au prochain chargement de l'outil : un écran déjà ouvert s'affiche tout
 * de suite, sans attente.
 */
export interface EcranALaDemande<P> {
  /** Nom de l'écran (« PageJournal ») : sert de clé, deux adresses du même écran le partagent. */
  readonly nom: string
  /** Le composant de l'écran, s'il est déjà chargé. */
  readonly charge: () => ComponentType<P> | undefined
  /**
   * Lance le chargement, ou rejoint celui qui est en cours. Un échec n'est pas gardé : l'appel
   * suivant recommence. Quand le serveur répond, l'échec recharge l'outil une fois
   * (`rechargerApresEchec`) et la promesse reste alors en attente.
   */
  readonly charger: () => Promise<ComponentType<P>>
}

export function ecranALaDemande<P>(
  nom: string,
  importer: () => Promise<ComponentType<P>>,
): EcranALaDemande<P> {
  let composant: ComponentType<P> | undefined
  let enCours: Promise<ComponentType<P>> | undefined

  async function charger(): Promise<ComponentType<P>> {
    try {
      composant = await importer()
      return composant
    } catch (erreur) {
      if (await rechargerApresEchec()) return new Promise<never>(() => {})
      throw erreur
    } finally {
      enCours = undefined
    }
  }

  return {
    nom,
    charge: () => composant,
    charger: () => {
      if (composant) return Promise.resolve(composant)
      enCours ??= charger()
      return enCours
    },
  }
}
