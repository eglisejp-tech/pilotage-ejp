import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AffichageEcran } from '@/app/AffichageEcran'
import { ecranALaDemande, TEXTE_CHARGEMENT_ECRAN } from '@/app/ecranALaDemande'
import { rechargerApresEchec } from '@/app/rechargement'
import {
  LECTURE_IMPOSSIBLE,
  LECTURE_IMPOSSIBLE_RECOURS,
} from '@/components/etats/lectureImpossible'

vi.mock('@/app/rechargement', () => ({ rechargerApresEchec: vi.fn() }))

type Props = { titre: string }

function EcranEssai({ titre }: Props) {
  return <h1>{titre}</h1>
}

/** Un import qu'on termine à la main : réussite ou échec, au moment choisi. */
function importManuel() {
  let reussir: () => void = () => {}
  let echouer: () => void = () => {}
  const importer = vi.fn(
    () =>
      new Promise<typeof EcranEssai>((resolve, reject) => {
        reussir = () => resolve(EcranEssai)
        echouer = () => reject(new TypeError('Failed to fetch dynamically imported module'))
      }),
  )
  return { importer, reussir: () => reussir(), echouer: () => echouer() }
}

function afficher(ecran: ReturnType<typeof ecranALaDemande<Props>>) {
  return render(<AffichageEcran ecran={ecran} titre="Journal" proprietes={{ titre: 'Journal' }} />)
}

/** Avance l'horloge par pas de 50 ms, en laissant React rendre entre deux minuteries. */
async function avancer(ms: number) {
  for (let reste = ms; reste > 0; reste -= 50) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(50, reste))
    })
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(rechargerApresEchec).mockReset().mockResolvedValue(false)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AffichageEcran (code d’un écran chargé à la demande, règle de temps de T65)', () => {
  it('écran déjà chargé : il s’affiche tout de suite, sans chargement ni fondu', async () => {
    const ecran = ecranALaDemande<Props>('PageEssai', () => Promise.resolve(EcranEssai))
    await ecran.charger()
    const { container } = afficher(ecran)
    expect(screen.getByRole('heading', { name: 'Journal' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(container.querySelector('[data-arrivee]')).toBeNull()
  })

  it('code rapide (moins de 300 ms) : rien ne s’affiche, puis l’écran', async () => {
    const { importer, reussir } = importManuel()
    const ecran = ecranALaDemande<Props>('PageEssai', importer)
    afficher(ecran)
    // La zone status existe, vide : rien pendant 300 ms.
    expect(screen.getByRole('status')).toHaveTextContent('')
    await avancer(200)
    expect(screen.getByRole('status')).toHaveTextContent('')
    // Le titre de l'onglet est celui de l'écran dès le départ (l'écran le garde ensuite).
    expect(document.title).toBe('Journal, Pilotage EJP')
    await act(async () => reussir())
    expect(screen.getByRole('heading', { name: 'Journal' })).toBeInTheDocument()
    expect(screen.queryByText(TEXTE_CHARGEMENT_ECRAN)).not.toBeInTheDocument()
  })

  it('code lent : la flamme et « Chargement de la page » après 300 ms, au moins 600 ms', async () => {
    const { importer, reussir } = importManuel()
    const ecran = ecranALaDemande<Props>('PageEssai', importer)
    afficher(ecran)
    await avancer(350)
    expect(screen.getByRole('status')).toHaveTextContent(TEXTE_CHARGEMENT_ECRAN)
    // Le code arrive juste après l'indicateur : il reste à l'écran, rien ne clignote.
    await act(async () => reussir())
    expect(screen.getByText(TEXTE_CHARGEMENT_ECRAN)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Journal' })).not.toBeInTheDocument()
    await avancer(600)
    expect(screen.getByRole('heading', { name: 'Journal' })).toBeInTheDocument()
    expect(screen.queryByText(TEXTE_CHARGEMENT_ECRAN)).not.toBeInTheDocument()
  })

  it('code absent : l’erreur de page avec « Réessayer », qui relance le chargement', async () => {
    vi.useRealTimers()
    const essais = [importManuel(), importManuel(), importManuel()]
    let numero = 0
    const ecran = ecranALaDemande<Props>('PageEssai', () => essais[numero++]!.importer())
    afficher(ecran)
    await act(async () => essais[0]!.echouer())
    expect(await screen.findByRole('alert')).toHaveTextContent(LECTURE_IMPOSSIBLE)
    expect(rechargerApresEchec).toHaveBeenCalledTimes(1)
    // Le titre reste dit aux lecteurs d'écran, sans page blanche.
    expect(screen.getByRole('heading', { level: 1, name: 'Journal' })).toHaveClass('sr-only')

    const personne = userEvent.setup()
    await personne.click(screen.getByRole('button', { name: 'Réessayer' }))
    await act(async () => essais[1]!.echouer())
    // Deuxième échec de suite : la phrase commune et le recours (m250).
    expect(await screen.findByRole('alert')).toHaveTextContent(LECTURE_IMPOSSIBLE_RECOURS)

    await personne.click(screen.getByRole('button', { name: 'Réessayer' }))
    await act(async () => essais[2]!.reussir())
    expect(await screen.findByRole('heading', { name: 'Journal' })).not.toHaveClass('sr-only')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('au retour du réseau, le chargement repart seul, sans « Réessayer »', async () => {
    vi.useRealTimers()
    const essais = [importManuel(), importManuel()]
    let numero = 0
    const ecran = ecranALaDemande<Props>('PageEssai', () => essais[numero++]!.importer())
    const enLigne = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    afficher(ecran)
    await act(async () => essais[0]!.echouer())
    expect(await screen.findByRole('alert')).toHaveTextContent(LECTURE_IMPOSSIBLE)

    enLigne.mockReturnValue(true)
    await act(async () => window.dispatchEvent(new Event('online')))
    await act(async () => essais[1]!.reussir())
    expect(await screen.findByRole('heading', { name: 'Journal' })).not.toHaveClass('sr-only')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    enLigne.mockRestore()
  })

  it('outil qui se recharge après l’échec : le chargement reste, aucune erreur', async () => {
    vi.mocked(rechargerApresEchec).mockResolvedValue(true)
    const { importer, echouer } = importManuel()
    afficher(ecranALaDemande<Props>('PageEssai', importer))
    await act(async () => echouer())
    await avancer(1000)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(TEXTE_CHARGEMENT_ECRAN)
  })
})
