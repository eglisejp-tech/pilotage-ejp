import { describe, expect, it } from 'vitest'
import {
  accueil,
  ONGLETS,
  profilAutorise,
  titrePour,
  trouverAdresse,
} from '@/features/navigation/profils'
import type { TypeCompte } from '@/lib/base'

const PROFILS: TypeCompte[] = ['ministere', 'berger', 'conseil', 'admin_eglise', 'admin_plateforme']

describe('navigation par profil', () => {
  it('reprend les onglets de la maquette 00, le premier étant l’accueil', () => {
    expect(ONGLETS.ministere.map((o) => o.libelle)).toEqual([
      'Cette semaine',
      'Ma fiche',
      'Mes points',
      'Mon journal',
    ])
    expect(ONGLETS.berger.map((o) => o.libelle)).toEqual([
      'Cette semaine',
      'Ministères',
      "Points d'attention",
      'Journal',
    ])
    expect(ONGLETS.conseil).toEqual(ONGLETS.berger)
    expect(ONGLETS.admin_eglise.map((o) => o.libelle)).toEqual([
      'Cette semaine',
      'Ministères et comptes',
      'Sessions',
      'Journal',
    ])
    expect(ONGLETS.admin_plateforme.map((o) => o.libelle)).toEqual([
      'Modération',
      'Journal technique',
    ])
    expect(accueil('admin_plateforme')).toBe('/moderation')
    expect(accueil('ministere')).toBe('/')
  })

  it('chaque onglet mène à une adresse autorisée pour son profil', () => {
    for (const profil of PROFILS) {
      for (const { chemin } of ONGLETS[profil]) {
        expect(profilAutorise(chemin, profil), `${profil} ${chemin}`).toBe(true)
      }
    }
  })

  it("aucun profil n'a droit aux écrans réservés à un autre", () => {
    expect(profilAutorise('/comptes', 'berger')).toBe(false)
    expect(profilAutorise('/ma-fiche', 'conseil')).toBe(false)
    expect(profilAutorise('/ministeres/m1', 'ministere')).toBe(false)
    expect(profilAutorise('/moderation', 'admin_eglise')).toBe(false)
    expect(profilAutorise('/', 'admin_plateforme')).toBe(false)
    expect(profilAutorise('/journal', 'admin_plateforme')).toBe(false)
    expect(profilAutorise('/points', 'admin_eglise')).toBe(false)
    expect(profilAutorise('/inconnu', 'berger')).toBe(false)
  })

  it("le titre d'un écran suit l'onglet du profil", () => {
    const points = trouverAdresse('/points')
    expect(points && titrePour(points, 'ministere')).toBe('Mes points')
    expect(points && titrePour(points, 'berger')).toBe("Points d'attention")
  })
})
