import { beforeEach, describe, expect, it } from 'vitest'
import {
  effacerMotif,
  lireMotif,
  noterDeconnexionVolontaire,
  noterTransition,
} from '@/features/session/motif'

beforeEach(() => {
  effacerMotif()
  noterTransition(undefined, 'connecte')
})

describe('motif de fin de session', () => {
  it('« Se déconnecter » : l’écran de connexion confirme « Compte déconnecté. » (m060)', () => {
    noterDeconnexionVolontaire()
    noterTransition('connecte', 'anonyme')
    expect(lireMotif()).toBe('deconnexion')
  })

  it('déconnexion silencieuse (après l’écran « Compte désactivé ») : rien', () => {
    noterDeconnexionVolontaire(false)
    noterTransition('desactive', 'anonyme')
    expect(lireMotif()).toBeNull()
  })

  it('fin sans clic : connexion ou session expirée, comme avant', () => {
    noterTransition('code', 'anonyme')
    expect(lireMotif()).toBe('connexion-expiree')
    noterTransition('anonyme', 'connecte')
    noterTransition('connecte', 'anonyme')
    expect(lireMotif()).toBe('session-expiree')
  })

  it('le motif s’efface une fois annoncé', () => {
    noterDeconnexionVolontaire()
    noterTransition('connecte', 'anonyme')
    effacerMotif()
    expect(lireMotif()).toBeNull()
  })
})
