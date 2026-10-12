import type { Etape, Partie } from '@/features/avancement/etapes'

export type StatutEtape = 'en-ligne' | 'en-partie' | 'a-venir'

export type Resume = {
  enLigne: number
  total: number
  /** Étape qui porte la prochaine partie prévue, ou null si tout est en ligne. */
  prochaine: { numero: Etape['numero']; partie: Partie } | null
}

export function statutDe(etape: Etape): StatutEtape {
  if (etape.prevu.length === 0) return 'en-ligne'
  if (etape.livre.length === 0) return 'a-venir'
  return 'en-partie'
}

/** La partie prévue d'une étape la plus proche dans le temps, ou undefined. */
export function premierePrevue(etape: Etape): Partie | undefined {
  return [...etape.prevu].sort((a, b) => a.date.localeCompare(b.date))[0]
}

/** La partie prévue la plus proche de toutes les étapes (date, puis ordre des étapes). */
export function resumer(etapes: readonly Etape[]): Resume {
  let prochaine: Resume['prochaine'] = null
  for (const etape of etapes) {
    const partie = premierePrevue(etape)
    if (partie && (prochaine === null || partie.date < prochaine.partie.date)) {
      prochaine = { numero: etape.numero, partie }
    }
  }
  return {
    enLigne: etapes.filter((etape) => statutDe(etape) === 'en-ligne').length,
    total: etapes.length,
    prochaine,
  }
}
