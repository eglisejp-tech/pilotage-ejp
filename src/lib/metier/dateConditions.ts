import { schemaVersionConditions, VERSION_CONDITIONS } from '@/lib/metier/conditions'
import { nomDuMois, quantieme } from '@/lib/metier/dates'

/** « 8 octobre 2026 », « 1er novembre 2026 » : la date de la version, pour l'écran. */
export function dateDeVersionConditions(version: string = VERSION_CONDITIONS): string {
  const [annee, mois, jour] = schemaVersionConditions.parse(version).split('-').map(Number)
  return `${quantieme(jour ?? 0)} ${nomDuMois(mois ?? 0)} ${annee}`
}
