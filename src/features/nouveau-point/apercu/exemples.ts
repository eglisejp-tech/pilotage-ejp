import {
  AUJOURDHUI_EXEMPLE,
  MINISTERES_EXEMPLE,
  MINISTERE_EXEMPLE,
} from '@/features/evenements/apercu/exemples'
import type { ContenuPanneauNouveauPoint } from '@/features/nouveau-point/PanneauNouveauPoint'
import { MESSAGES_POINT } from '@/data/pointsEcriture'

// Données d'exemple de l'aperçu de « Nouveau point d'attention » (/apercu/nouveau-point) : jamais
// la base, jamais un nom de personne. « Aujourd'hui » est le jour fixe du jeu d'exemple (mardi
// 6 oct. 2026), pas la date du navigateur. L'envoi simule la base : une échéance passée est
// refusée avec son message, et `envoi=echec` simule une connexion perdue.

/** Les écrans de l'aperçu, choisis par `?ecran=` (le formulaire par défaut). */
export const ECRANS_APERCU_POINT = ['formulaire', 'sans-mention', 'chargement', 'probleme'] as const

export type EcranApercuPoint = (typeof ECRANS_APERCU_POINT)[number]

export function lireEcranApercuPoint(valeur: string | null): EcranApercuPoint {
  return ECRANS_APERCU_POINT.find((ecran) => ecran === valeur) ?? 'formulaire'
}

/** Une demi-seconde d'attente : « Envoi en cours » se voit. */
const attendre = () => new Promise<void>((fin) => setTimeout(fin, 400))

export function contenuNouveauPoint(
  ecran: EcranApercuPoint,
  echec: boolean,
): ContenuPanneauNouveauPoint {
  if (ecran === 'chargement') return { etat: 'chargement' }
  if (ecran === 'probleme') return { etat: 'probleme', reessayer: () => undefined }
  return {
    etat: 'formulaire',
    aujourdhui: AUJOURDHUI_EXEMPLE,
    ministereId: MINISTERE_EXEMPLE,
    ministeres: ecran === 'sans-mention' ? [] : MINISTERES_EXEMPLE,
    envoyer: async (point) => {
      await attendre()
      if (echec) throw new TypeError('Failed to fetch')
      if (point.echeance !== null && point.echeance < AUJOURDHUI_EXEMPLE) {
        throw { code: 'P0001', message: MESSAGES_POINT.refus.echeancePassee }
      }
    },
  }
}
