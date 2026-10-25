import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CLE_RECHARGEMENT,
  INTERVALLE_RECHARGEMENT_MS,
  rechargerApresEchec,
} from '@/app/rechargement'

const recharger = vi.fn()
const lire = vi.fn<typeof fetch>()

beforeEach(() => {
  window.sessionStorage.clear()
  recharger.mockReset()
  lire.mockReset().mockResolvedValue(new Response('<!doctype html>', { status: 200 }))
  vi.stubGlobal('fetch', lire)
  vi.stubGlobal('location', { ...window.location, reload: recharger })
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('rechargerApresEchec (code d’un écran absent, nouvelle version en ligne)', () => {
  it('serveur joignable : recharge l’outil une fois et note l’heure', async () => {
    await expect(rechargerApresEchec()).resolves.toBe(true)
    expect(recharger).toHaveBeenCalledTimes(1)
    expect(lire).toHaveBeenCalledWith('/', expect.objectContaining({ cache: 'no-store' }))
    expect(Number(window.sessionStorage.getItem(CLE_RECHARGEMENT))).toBeGreaterThan(0)
  })

  it('un second échec dans la minute ne recharge pas : l’erreur de l’écran s’affiche', async () => {
    await rechargerApresEchec()
    await expect(rechargerApresEchec()).resolves.toBe(false)
    expect(recharger).toHaveBeenCalledTimes(1)
  })

  it('après une minute, un nouvel échec peut recharger de nouveau', async () => {
    window.sessionStorage.setItem(
      CLE_RECHARGEMENT,
      String(Date.now() - INTERVALLE_RECHARGEMENT_MS - 1),
    )
    await expect(rechargerApresEchec()).resolves.toBe(true)
  })

  it('hors ligne : rien ne se recharge, rien n’est lu', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await expect(rechargerApresEchec()).resolves.toBe(false)
    expect(lire).not.toHaveBeenCalled()
    expect(recharger).not.toHaveBeenCalled()
  })

  it('serveur muet ou en erreur : pas de rechargement (le navigateur montrerait sa page d’erreur)', async () => {
    lire.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(rechargerApresEchec()).resolves.toBe(false)
    lire.mockResolvedValueOnce(new Response('', { status: 503 }))
    await expect(rechargerApresEchec()).resolves.toBe(false)
    expect(recharger).not.toHaveBeenCalled()
  })

  it('sans stockage de session : pas de rechargement, faute de pouvoir éviter une boucle', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('refusé', 'SecurityError')
    })
    await expect(rechargerApresEchec()).resolves.toBe(false)
    expect(recharger).not.toHaveBeenCalled()
  })
})
