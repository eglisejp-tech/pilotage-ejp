import { describe, expect, it } from 'vitest'
import type { Compte } from '@/data/compte'
import { destination, retourValide } from '@/features/session/decisions'
import type { ContexteGarde, Zone } from '@/features/session/decisions'
import type { EtatSession } from '@/features/session/etat'
import type { TypeCompte } from '@/lib/base'

function compte(type: TypeCompte = 'berger'): Compte {
  return {
    id: 'u1',
    type,
    ministereId: type === 'ministere' ? 'm1' : null,
    libelle: 'Berger',
    actif: true,
  }
}

const anonyme: EtatSession = { statut: 'anonyme' }
const desactive: EtatSession = { statut: 'desactive' }
const activation: EtatSession = { statut: 'activation', compte: compte(), email: 'b@exemple.test' }
const code: EtatSession = { statut: 'code', compte: compte(), email: null, facteurId: 'f1' }
const connecte = (type: TypeCompte = 'berger'): EtatSession => ({
  statut: 'connecte',
  compte: compte(type),
  email: null,
})

function contexte(partiel: Partial<ContexteGarde> = {}): ContexteGarde {
  return { adresse: '/', retour: null, motDePasseAChoisir: false, ...partiel }
}

describe('destination', () => {
  it("sans session : la connexion s'affiche, toute autre zone y renvoie avec l'adresse demandée", () => {
    expect(destination(anonyme, 'connexion', contexte())).toBeNull()
    expect(destination(anonyme, 'application', contexte({ adresse: '/points?vue=traites' }))).toBe(
      '/connexion?retour=%2Fpoints%3Fvue%3Dtraites',
    )
    expect(destination(anonyme, 'application', contexte({ adresse: '/' }))).toBe('/connexion')
    expect(destination(anonyme, 'double-authentification', contexte({ retour: '/journal' }))).toBe(
      '/connexion?retour=%2Fjournal',
    )
    expect(destination(anonyme, 'mot-de-passe', contexte())).toBe('/connexion')
  })

  it('compte absent ou désactivé : écran « Compte désactivé », quelle que soit la zone', () => {
    for (const zone of [
      'connexion',
      'double-authentification',
      'mot-de-passe',
      'application',
    ] as Zone[]) {
      expect(destination(desactive, zone, contexte())).toBe('/compte-desactive')
    }
  })

  it("aal1 sans facteur : l'activation, et rien de l'application", () => {
    expect(destination(activation, 'double-authentification', contexte())).toBeNull()
    expect(destination(activation, 'application', contexte({ adresse: '/ministeres' }))).toBe(
      '/double-authentification?retour=%2Fministeres',
    )
    expect(destination(activation, 'connexion', contexte({ retour: '/journal' }))).toBe(
      '/double-authentification?retour=%2Fjournal',
    )
  })

  it("aal1 avec un facteur : l'écran de code, et rien de l'application", () => {
    expect(destination(code, 'double-authentification', contexte())).toBeNull()
    expect(destination(code, 'application', contexte({ adresse: '/' }))).toBe(
      '/double-authentification',
    )
    expect(destination(code, 'connexion', contexte())).toBe('/double-authentification')
  })

  it("aal2 : l'adresse demandée si le profil y a droit, sinon l'accueil du profil", () => {
    expect(destination(connecte(), 'application', contexte({ adresse: '/comptes' }))).toBeNull()
    expect(destination(connecte(), 'connexion', contexte({ retour: '/points?vue=tous' }))).toBe(
      '/points?vue=tous',
    )
    expect(
      destination(connecte(), 'double-authentification', contexte({ retour: '/comptes' })),
    ).toBe('/')
    expect(destination(connecte('admin_plateforme'), 'connexion', contexte())).toBe('/moderation')
    expect(destination(connecte('ministere'), 'mot-de-passe', contexte())).toBe('/')
  })

  it('EJP Tech : /moderation après la connexion, même demandée depuis « / » (T29)', () => {
    // « / » n'est jamais gardé comme adresse de retour : l'accueil du profil décide.
    expect(destination(anonyme, 'application', contexte({ adresse: '/' }))).toBe('/connexion')
    expect(destination(connecte('admin_plateforme'), 'connexion', contexte())).toBe('/moderation')
    expect(destination(connecte('admin_plateforme'), 'application', contexte())).toBeNull()
    expect(
      destination(connecte('admin_plateforme'), 'connexion', contexte({ retour: '/points' })),
    ).toBe('/points')
  })

  it("lien d'invitation ou de récupération : le mot de passe d'abord, le code avant s'il existe", () => {
    const enAttente = contexte({ motDePasseAChoisir: true })
    expect(destination(activation, 'mot-de-passe', enAttente)).toBeNull()
    expect(destination(activation, 'double-authentification', enAttente)).toBe(
      '/acces/mot-de-passe',
    )
    expect(destination(code, 'mot-de-passe', enAttente)).toBe('/double-authentification')
    expect(destination(connecte(), 'double-authentification', enAttente)).toBe(
      '/acces/mot-de-passe',
    )
    expect(destination(connecte(), 'application', enAttente)).toBe('/acces/mot-de-passe')
    expect(destination(connecte(), 'mot-de-passe', enAttente)).toBeNull()
  })
})

describe('retourValide', () => {
  it("garde un chemin de l'application auquel le profil a droit, avec ses filtres", () => {
    expect(retourValide('/points?vue=traites&ministere=m1', 'berger')).toBe(
      '/points?vue=traites&ministere=m1',
    )
    expect(retourValide('/ministeres/abc', 'conseil')).toBe('/ministeres/abc')
  })

  it('refuse une autre origine, un chemin inconnu ou réservé à un autre profil', () => {
    for (const retour of [
      null,
      '',
      'https://exemple.test/',
      '//exemple.test/points',
      '/\\exemple.test',
      'javascript:alert(1)',
      '/inconnu',
      '/connexion',
    ]) {
      expect(retourValide(retour, 'berger')).toBeNull()
    }
    expect(retourValide('/comptes', 'ministere')).toBeNull()
    expect(retourValide('/journal', 'admin_plateforme')).toBeNull()
  })
})
