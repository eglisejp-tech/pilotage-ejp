import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lireCarteFij } from '@/data/eglise'
import { lireCodeMinistere } from '@/data/fij'
import { CARTE_EXEMPLE } from '@/features/saisie-fij/apercu/exemplesE4'
import { SaisieCarteConnectee } from '@/features/saisie-fij/SaisieCarteConnectee'
import { AvecRequetes } from '@/test/AvecRequetes'

// La carte des FIJ lit d'abord le code du ministère du compte, puis la carte : une seule attente
// pour les deux (T65), la flamme ne disparaît pas entre les deux lectures.

vi.mock('@/data/eglise', () => ({ lireCarteFij: vi.fn(), lireSemaine: vi.fn() }))
vi.mock(import('@/data/fij'), async (importOriginal) => ({
  ...(await importOriginal()),
  lireCodeMinistere: vi.fn(),
}))
const code = vi.mocked(lireCodeMinistere)
const carte = vi.mocked(lireCarteFij)

/** Une réponse que le test donne quand il veut. */
function reponse<T>() {
  let donner: (valeur: T) => void = () => {}
  const promesse = new Promise<T>((resoudre) => {
    donner = resoudre
  })
  return { promesse, donner }
}

async function avancer(ms: number) {
  for (let reste = ms; reste > 0; reste -= 50) {
    await act(() => vi.advanceTimersByTimeAsync(Math.min(50, reste)))
  }
}

function afficher() {
  render(
    <AvecRequetes>
      <MemoryRouter>
        <SaisieCarteConnectee ministereId="m-fij" titre="Carte des FIJ" onFermer={() => {}} />
      </MemoryRouter>
    </AvecRequetes>,
  )
}

const zoneDAttente = () =>
  screen.queryByText('Chargement du formulaire')?.closest('[role="status"]')

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('SaisieCarteConnectee (T65 : une seule attente)', () => {
  it('le code, puis la carte : la même flamme du début à la fin, puis le formulaire', async () => {
    const lectureCode = reponse<string | null>()
    const lectureCarte = reponse<typeof CARTE_EXEMPLE>()
    code.mockReturnValue(lectureCode.promesse)
    carte.mockReturnValue(lectureCarte.promesse)
    afficher()
    await avancer(300)
    const zone = zoneDAttente()
    expect(zone).toBeTruthy()
    // La carte ne se lit qu'une fois le ministère `fij` confirmé.
    expect(carte).not.toHaveBeenCalled()

    lectureCode.donner('fij')
    await avancer(100)
    expect(carte).toHaveBeenCalledOnce()
    // La zone d'attente n'a pas été remplacée : rien n'a clignoté entre les deux lectures.
    expect(zoneDAttente()).toBe(zone)
    await avancer(1000)
    expect(zoneDAttente()).toBe(zone)

    lectureCarte.donner(CARTE_EXEMPLE)
    await avancer(100)
    expect(zoneDAttente()).toBeFalsy()
    expect(screen.getByRole('button', { name: 'Enregistrer la carte' })).toBeInTheDocument()
  })

  it('un autre ministère : la page non disponible après la tenue, sans lire la carte', async () => {
    const lectureCode = reponse<string | null>()
    code.mockReturnValue(lectureCode.promesse)
    afficher()
    await avancer(400)
    // Montrée à 300 ms, la flamme reste jusqu'à 900 ms, même pour un refus.
    lectureCode.donner('communication')
    await avancer(400)
    expect(zoneDAttente()).toBeTruthy()
    expect(screen.queryByText(/pas disponible avec votre compte/)).toBeNull()
    await avancer(150)
    expect(screen.getByText(/pas disponible avec votre compte/)).toBeInTheDocument()
    expect(carte).not.toHaveBeenCalled()
  })
})
