import { describe, expect, it } from 'vitest'
import { ADRESSES_APPLICATION } from '@/features/navigation/profils'
import { PAGES_DES_ADRESSES } from '@/pages/pagesDesAdresses'

describe('pages des adresses', () => {
  it('chaque page est celle d’une adresse déclarée (pas de faute de frappe dans un motif)', () => {
    const motifs = new Set(ADRESSES_APPLICATION.map((adresse) => adresse.chemin))
    for (const motif of Object.keys(PAGES_DES_ADRESSES)) expect(motifs.has(motif), motif).toBe(true)
  })

  it('chaque adresse de l’étape 4 a sa page, que son lot remplace', () => {
    for (const adresse of ADRESSES_APPLICATION.filter((a) => a.etape === 4)) {
      expect(PAGES_DES_ADRESSES[adresse.chemin], adresse.chemin).toBeDefined()
    }
  })

  it('« / » garde sa propre vue : elle n’est pas dans la table', () => {
    expect(PAGES_DES_ADRESSES['/']).toBeUndefined()
  })
})
