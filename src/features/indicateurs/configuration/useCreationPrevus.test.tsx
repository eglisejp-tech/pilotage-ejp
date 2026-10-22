import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CLES_CONFIGURATION } from '@/features/indicateurs/configuration/cles'
import {
  messageDeRefusPrevus,
  useCreationPrevus,
} from '@/features/indicateurs/configuration/useCreationPrevus'

const appel = vi.hoisted(() => ({
  creer: vi.fn<(ministere: string, modele: string) => Promise<number>>(),
}))
vi.mock('@/data/indicateursConfiguration', () => ({
  creerIndicateursPrevus: appel.creer,
}))

const KUMI = { id: 'm-kumi', nom: 'Kumi' }

function monter() {
  const client = new QueryClient()
  const invalidation = vi.spyOn(client, 'invalidateQueries')
  const enveloppe = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { ...renderHook(() => useCreationPrevus(), { wrapper: enveloppe }), invalidation }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('messageDeRefusPrevus', () => {
  it('un refus de la base (P0001) prend sa phrase dans la table de traduction (m228)', () => {
    expect(
      messageDeRefusPrevus({
        code: 'P0001',
        message:
          'La fiche a déjà « Activités réalisées » : retirez-le avant de créer les indicateurs prévus.',
      }),
    ).toBe(
      'La fiche a déjà « Activités réalisées ». Retirez-le, puis créez les indicateurs prévus.',
    )
    expect(
      messageDeRefusPrevus({ code: 'P0001', message: "Ce modèle n'existe pas dans le catalogue." }),
    ).toBe('Cette liste est introuvable. Rechargez la page.')
    expect(
      messageDeRefusPrevus({
        code: 'P0001',
        message: "Cette fiche a déjà des indicateurs prévus : « aucun » ne s'applique pas.",
      }),
    ).toBe("Cette fiche a déjà des indicateurs prévus : « Aucun prévu » ne s'applique plus.")
  })

  it('le catalogue est à corriger : la panne, sans « Réessayez », jamais le texte (T66, m229)', () => {
    for (const message of [
      'Deux indicateurs prévus portent le même nom, « X » : le catalogue est à corriger.',
      'Un indicateur prévu porte le nom du chiffre commun « X » : le catalogue est à corriger.',
    ]) {
      expect(messageDeRefusPrevus({ code: 'P0001', message })).toBe(
        "Les indicateurs prévus n'ont pas pu être créés. Prévenez EJP Tech.",
      )
    }
  })

  it('un refus de droit (42501) dit seulement que l’élément est introuvable (T66, m273)', () => {
    expect(messageDeRefusPrevus({ code: '42501', message: 'permission denied for table x' })).toBe(
      'Cet élément est introuvable. Rechargez la page.',
    )
  })

  it('la double authentification perdue : se reconnecter, pas le texte de la base (m271)', () => {
    expect(
      messageDeRefusPrevus({ code: '42501', message: 'Double authentification requise.' }),
    ).toBe('Votre connexion a expiré. Reconnectez-vous.')
  })

  it('un problème de connexion n’a pas de message ; une erreur inconnue prend le repli', () => {
    expect(messageDeRefusPrevus(new TypeError('Failed to fetch'))).toBeNull()
    expect(messageDeRefusPrevus({ code: 'PGRST000', message: 'x' })).toBe(
      "L'action n'a pas abouti. Réessayez, et si le problème revient, prévenez EJP Tech.",
    )
  })
})

describe('useCreationPrevus', () => {
  it('crée les prévus : un appel à la base, les lectures relues, « 6 indicateurs prévus créés. »', async () => {
    appel.creer.mockResolvedValue(6)
    const { result, invalidation } = monter()
    await act(async () => {
      await result.current.creer(KUMI, 'kumi')
    })
    expect(appel.creer).toHaveBeenCalledWith('m-kumi', 'kumi')
    expect(invalidation).toHaveBeenCalledWith({ queryKey: CLES_CONFIGURATION.racine })
    expect(result.current.reussite).toBe('6 indicateurs prévus créés.')
    expect(result.current.envoi).toBe(1)
    expect(result.current.refus).toBeNull()
    expect(result.current.enCours).toBeNull()
    expect(result.current.dernier).toBe('m-kumi')
  })

  it('après une réussite, relit aussi la fiche et les saisies du ministère', async () => {
    appel.creer.mockResolvedValue(6)
    const { result, invalidation } = monter()
    await act(async () => {
      await result.current.creer(KUMI, 'kumi')
    })
    expect(invalidation).toHaveBeenCalledWith({ queryKey: ['fiche', 'm-kumi'] })
    expect(invalidation).toHaveBeenCalledWith({
      queryKey: ['saisie-chiffres', 'indicateurs', 'm-kumi'],
    })
  })

  it('un refus 42501 de double authentification : se reconnecter, ni « n’existe pas » ni le texte de la base (m271)', async () => {
    appel.creer.mockRejectedValue({ code: '42501', message: 'Double authentification requise.' })
    const { result } = monter()
    await act(async () => {
      await result.current.creer(KUMI, 'kumi')
    })
    expect(result.current.refus).toBe('Votre connexion a expiré. Reconnectez-vous.')
    expect(result.current.dernier).toBe('m-kumi')
  })

  it('un seul prévu : « 1 indicateur prévu créé. »', async () => {
    appel.creer.mockResolvedValue(1)
    const { result } = monter()
    await act(async () => {
      await result.current.creer(KUMI, 'kumi')
    })
    expect(result.current.reussite).toBe('1 indicateur prévu créé.')
  })

  it('rien à créer (déjà tout créé) : le dit, sans « 0 indicateurs créés »', async () => {
    appel.creer.mockResolvedValue(0)
    const { result } = monter()
    await act(async () => {
      await result.current.creer(KUMI, 'kumi')
    })
    expect(result.current.reussite).toBe('Aucun indicateur prévu à créer pour Kumi.')
  })

  it('« Aucun prévu » : l’appel porte le modèle « aucun » et le message le dit', async () => {
    appel.creer.mockResolvedValue(0)
    const { result } = monter()
    await act(async () => {
      await result.current.creer({ id: 'm-protocole', nom: 'Protocole' }, 'aucun')
    })
    expect(appel.creer).toHaveBeenCalledWith('m-protocole', 'aucun')
    expect(result.current.reussite).toBe('Choix « Aucun prévu » enregistré pour Protocole.')
  })

  it('un refus de la base : sa phrase traduite, aucune réussite, aucune relecture (m228)', async () => {
    appel.creer.mockRejectedValue({
      code: 'P0001',
      message:
        'La fiche a déjà « Publications » : retirez-le avant de créer les indicateurs prévus.',
    })
    const { result, invalidation } = monter()
    await act(async () => {
      await result.current.creer(KUMI, 'kumi')
    })
    expect(result.current.refus).toBe(
      'La fiche a déjà « Publications ». Retirez-le, puis créez les indicateurs prévus.',
    )
    expect(result.current.reussite).toBeNull()
    expect(invalidation).not.toHaveBeenCalled()
    expect(result.current.enCours).toBeNull()
  })

  it('un problème de connexion : « La connexion a échoué. Réessayez. », le bouton redevient actif', async () => {
    appel.creer.mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = monter()
    await act(async () => {
      await result.current.creer(KUMI, 'kumi')
    })
    expect(result.current.refus).toBe('La connexion a échoué. Réessayez.')
    expect(result.current.enCours).toBeNull()
  })

  it('un nouvel envoi efface le refus précédent', async () => {
    appel.creer.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(6)
    const { result } = monter()
    await act(async () => {
      await result.current.creer(KUMI, 'kumi')
    })
    expect(result.current.refus).not.toBeNull()
    await act(async () => {
      await result.current.creer(KUMI, 'kumi')
    })
    expect(result.current.refus).toBeNull()
    expect(result.current.reussite).toBe('6 indicateurs prévus créés.')
  })

  it('un second clic pendant l’envoi ne fait rien : un seul appel à la base', async () => {
    let finir: (nombre: number) => void = () => undefined
    appel.creer.mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          finir = resolve
        }),
    )
    const { result } = monter()
    let premier: Promise<void> = Promise.resolve()
    act(() => {
      premier = result.current.creer(KUMI, 'kumi')
    })
    expect(result.current.enCours).toBe('m-kumi')
    await act(async () => {
      await result.current.creer({ id: 'm-autre', nom: 'Autre' }, 'film')
    })
    expect(appel.creer).toHaveBeenCalledTimes(1)
    await act(async () => {
      finir(6)
      await premier
    })
    expect(result.current.reussite).toBe('6 indicateurs prévus créés.')
  })
})
