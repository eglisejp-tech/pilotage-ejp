import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IncidentEnvoye } from '@/lib/base'
import {
  ajouterAFile,
  cleFile,
  DUREE_FILE_MS,
  envoyerFile,
  lireFile,
  PLAFOND_FILE,
  viderMemoireFiles,
} from '@/lib/fileIncidents'

// File locale des incidents d'envoi (T76, lot C ; conception erreurs-envoi, 6.3 et 14, test 16).

const MAINTENANT = Date.parse('2026-10-26T12:00:00Z')

/** Une référence de l'alphabet des références, tirée d'un rang (1 donne « 222223 »). */
function reference(rang: number): string {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
  let reste = rang
  let texte = ''
  for (let i = 0; i < 6; i += 1) {
    texte = (alphabet[reste % 31] ?? '2') + texte
    reste = Math.floor(reste / 31)
  }
  return texte
}

function incident(rang: number, survenu = MAINTENANT): IncidentEnvoye {
  return {
    reference: reference(rang),
    survenu_le: new Date(survenu).toISOString(),
    ecran: '/saisir/evenement',
    operation: 'ajouter_evenement',
    genre: 'sans_reponse',
    issue: 'inconnue',
    rattrape: false,
    statut_http: null,
    code: null,
    nom_erreur: 'TypeError',
    duree_ms: 1234,
    en_ligne: true,
    visible: true,
    version: '3f2a1c9',
    navigateur: 'safari',
    version_navigateur: 26,
    systeme: 'ios',
  }
}

beforeEach(() => {
  localStorage.clear()
  viderMemoireFiles()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(MAINTENANT)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('file des incidents', () => {
  it('une file par espace (T73) : un incident de A ne part jamais avec B', () => {
    ajouterAFile('a', incident(1))
    ajouterAFile('b', incident(2))
    expect(lireFile('a').map((i) => i.reference)).toEqual([reference(1)])
    expect(lireFile('b').map((i) => i.reference)).toEqual([reference(2)])
    expect(localStorage.getItem(cleFile('a'))).toContain(reference(1))
  })

  it(`plafond de ${PLAFOND_FILE} : le plus ancien tombe`, () => {
    for (let rang = 1; rang <= 25; rang += 1) ajouterAFile('a', incident(rang))
    const file = lireFile('a')
    expect(file).toHaveLength(PLAFOND_FILE)
    expect(file[0]?.reference).toBe(reference(6))
  })

  it('un incident de plus de 7 jours tombe', () => {
    ajouterAFile('a', incident(1, MAINTENANT - DUREE_FILE_MS - 1000))
    ajouterAFile('a', incident(2, MAINTENANT - DUREE_FILE_MS + 60_000))
    expect(lireFile('a').map((i) => i.reference)).toEqual([reference(2)])
  })

  it('schéma strict : un champ en trop ou un texte du formulaire n’entre pas', () => {
    ajouterAFile('a', { ...incident(1), texte: 'Texte témoin du formulaire' } as IncidentEnvoye)
    ajouterAFile('a', { ...incident(2), reference: 'pas une référence' })
    expect(lireFile('a')).toEqual([])
    // Une file abîmée dans le stockage est ignorée, sans erreur.
    localStorage.setItem(cleFile('b'), '{"pas": "une liste"')
    expect(lireFile('b')).toEqual([])
    localStorage.setItem(
      cleFile('c'),
      JSON.stringify([{ ...incident(3), email: 'x@exemple.test' }]),
    )
    expect(lireFile('c')).toEqual([])
  })

  it('une même référence n’entre qu’une fois', () => {
    ajouterAFile('a', incident(1))
    ajouterAFile('a', incident(1))
    expect(lireFile('a')).toHaveLength(1)
  })

  it('stockage bloqué (navigation privée) : la file vit en mémoire', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqué')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqué')
    })
    ajouterAFile('a', incident(1))
    expect(lireFile('a').map((i) => i.reference)).toEqual([reference(1)])
  })
})

describe('envoi de la file', () => {
  it('après une réponse : les références envoyées sortent de la file, même ignorées par la base', async () => {
    ajouterAFile('a', incident(1))
    ajouterAFile('a', incident(2))
    const noter = vi.fn((lot: IncidentEnvoye[]) => Promise.resolve(lot.length - 1))
    await envoyerFile('a', noter)
    expect(noter).toHaveBeenCalledTimes(1)
    expect(noter.mock.calls[0]?.[0].map((i) => i.reference)).toEqual([reference(1), reference(2)])
    expect(lireFile('a')).toEqual([])
  })

  it('après un échec : la file attend, et l’échec ne dit rien', async () => {
    ajouterAFile('a', incident(1))
    await expect(
      envoyerFile('a', () => Promise.reject(new TypeError('Load failed'))),
    ).resolves.toBeUndefined()
    expect(lireFile('a')).toHaveLength(1)
  })

  it('un seul envoi à la fois ; une file vide n’envoie rien', async () => {
    const vide = vi.fn(() => Promise.resolve(0))
    await envoyerFile('a', vide)
    expect(vide).not.toHaveBeenCalled()
    ajouterAFile('a', incident(1))
    let finir: () => void = () => undefined
    const lent = vi.fn(
      () =>
        new Promise<number>((resoudre) => {
          finir = () => resoudre(1)
        }),
    )
    const premier = envoyerFile('a', lent)
    await envoyerFile('a', lent)
    expect(lent).toHaveBeenCalledTimes(1)
    finir()
    await premier
    expect(lireFile('a')).toEqual([])
  })

  it('un incident arrivé pendant l’envoi part dans le lot suivant', async () => {
    ajouterAFile('a', incident(1))
    const lots: string[][] = []
    let finir: () => void = () => undefined
    const envoi = envoyerFile('a', (lot) => {
      lots.push(lot.map((i) => i.reference))
      if (lots.length > 1) return Promise.resolve(1)
      return new Promise<number>((resoudre) => {
        finir = () => resoudre(1)
      })
    })
    ajouterAFile('a', incident(2))
    finir()
    await envoi
    expect(lots).toEqual([[reference(1)], [reference(2)]])
    expect(lireFile('a')).toEqual([])
  })
})
