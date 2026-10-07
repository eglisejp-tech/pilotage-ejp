import { VUES_POINTS } from '@/features/points/textesPoints'
import type { VuePoints } from '@/features/points/textesPoints'

/** Vue demandée par `?vue=` : « ouverts » (défaut), « traites » ou « tous ». Toute autre valeur vaut « ouverts ». */
export function lireVuePoints(valeur: string | null): VuePoints {
  return VUES_POINTS.find((vue) => vue === valeur) ?? 'ouverts'
}
