import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentType } from 'react'
import { ecranALaDemande } from '@/app/ecranALaDemande'
import { rechargerApresEchec } from '@/app/rechargement'

vi.mock('@/app/rechargement', () => ({ rechargerApresEchec: vi.fn() }))

type Composant = ComponentType<{ titre: string }>

const Ecran: Composant = () => null

beforeEach(() => {
  vi.mocked(rechargerApresEchec).mockReset().mockResolvedValue(false)
})

describe('ecranALaDemande (découpage par écran)', () => {
  it('rien n’est chargé avant le premier appel ; ensuite, le composant reste en mémoire', async () => {
    const importer = vi.fn(() => Promise.resolve(Ecran))
    const ecran = ecranALaDemande('PageEssai', importer)
    expect(ecran.nom).toBe('PageEssai')
    expect(ecran.charge()).toBeUndefined()
    expect(importer).not.toHaveBeenCalled()

    await expect(ecran.charger()).resolves.toBe(Ecran)
    expect(ecran.charge()).toBe(Ecran)
    // Un écran chargé ne se recharge pas.
    await expect(ecran.charger()).resolves.toBe(Ecran)
    expect(importer).toHaveBeenCalledTimes(1)
  })

  it('deux appels pendant le chargement partagent le même import', async () => {
    let terminer: (composant: Composant) => void = () => {}
    const importer = vi.fn(
      () =>
        new Promise<Composant>((resolve) => {
          terminer = resolve
        }),
    )
    const ecran = ecranALaDemande('PageEssai', importer)
    const premier = ecran.charger()
    const second = ecran.charger()
    expect(importer).toHaveBeenCalledTimes(1)
    terminer(Ecran)
    await expect(premier).resolves.toBe(Ecran)
    await expect(second).resolves.toBe(Ecran)
  })

  it('un échec n’est pas gardé : l’appel suivant recommence', async () => {
    const importer = vi
      .fn<() => Promise<Composant>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module'))
      .mockResolvedValueOnce(Ecran)
    const ecran = ecranALaDemande('PageEssai', importer)

    await expect(ecran.charger()).rejects.toThrow('Failed to fetch')
    expect(rechargerApresEchec).toHaveBeenCalledTimes(1)
    expect(ecran.charge()).toBeUndefined()

    await expect(ecran.charger()).resolves.toBe(Ecran)
    expect(importer).toHaveBeenCalledTimes(2)
  })

  it('quand l’outil se recharge après l’échec, la promesse reste en attente (pas d’erreur affichée)', async () => {
    vi.mocked(rechargerApresEchec).mockResolvedValue(true)
    const ecran = ecranALaDemande('PageEssai', () => Promise.reject(new Error('404')))
    const issue = vi.fn()
    ecran.charger().then(issue, issue)
    await vi.waitFor(() => expect(rechargerApresEchec).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(issue).not.toHaveBeenCalled()
  })
})
