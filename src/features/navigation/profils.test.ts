import { describe, expect, it } from 'vitest'
import {
  accueil,
  ADRESSES_APPLICATION,
  ONGLETS,
  profilAutorise,
  titrePour,
  trouverAdresse,
} from '@/features/navigation/profils'
import type { TypeCompte } from '@/lib/base'

const PROFILS: TypeCompte[] = ['ministere', 'berger', 'conseil', 'admin_eglise', 'admin_plateforme']

// Adresses de l'étape 4 (plan, section 4, « Adresses ») : un exemple d'adresse réelle par motif,
// et les seuls profils qui y ont droit.
const ADRESSES_ETAPE_4: [motif: string, exemple: string, profils: TypeCompte[]][] = [
  ['/ma-fiche', '/ma-fiche', ['ministere']],
  ['/ministeres', '/ministeres', ['berger', 'conseil', 'admin_plateforme']],
  ['/ministeres/:id', '/ministeres/m1', ['berger', 'conseil', 'admin_plateforme']],
  ['/saisir/dimanche', '/saisir/dimanche?date=2026-09-27', ['ministere']],
  ['/saisir/mois', '/saisir/mois?mois=2026-09', ['ministere']],
  ['/saisir/session/:id', '/saisir/session/s1', ['ministere']],
  ['/saisir/fij', '/saisir/fij', ['ministere']],
  ['/saisir/fij-statistiques', '/saisir/fij-statistiques', ['ministere']],
  ['/saisir/evenement', '/saisir/evenement', ['ministere']],
  ['/saisir/evenement/:id', '/saisir/evenement/e1', ['ministere']],
  ['/saisir/reunion', '/saisir/reunion', ['ministere']],
  ['/signaler', '/signaler?ecran=saisie_evenement', ['ministere']],
  ['/moderation', '/moderation', ['admin_plateforme']],
]

describe('adresses de l’étape 4', () => {
  it.each(ADRESSES_ETAPE_4)(
    '%s : déclarée une fois, avec ses profils',
    (motif, exemple, profils) => {
      expect(ADRESSES_APPLICATION.filter((adresse) => adresse.chemin === motif)).toHaveLength(1)
      expect(trouverAdresse(exemple.split('?')[0] ?? '')?.chemin).toBe(motif)
      for (const profil of PROFILS) {
        expect(profilAutorise(exemple.split('?')[0] ?? '', profil), `${profil} ${exemple}`).toBe(
          profils.includes(profil),
        )
      }
    },
  )

  it('chaque motif de la table est unique', () => {
    const motifs = ADRESSES_APPLICATION.map((adresse) => adresse.chemin)
    expect(new Set(motifs).size).toBe(motifs.length)
  })

  it('« /saisir/evenement » et « /saisir/evenement/:id » ne se confondent pas', () => {
    expect(trouverAdresse('/saisir/evenement')?.titre).toBe('Ajouter un événement')
    expect(trouverAdresse('/saisir/evenement/e1')?.titre).toBe("Mettre à jour l'événement")
    expect(trouverAdresse('/saisir')).toBeNull()
    expect(trouverAdresse('/saisir/point')).toBeNull()
  })

  it('EJP Tech lit tout et ne saisit rien : aucune adresse /saisir ni /signaler pour lui (T29)', () => {
    for (const adresse of ADRESSES_APPLICATION) {
      if (adresse.chemin.startsWith('/saisir') || adresse.chemin === '/signaler') {
        expect(adresse.profils, adresse.chemin).toEqual(['ministere'])
      }
    }
  })

  it('l’administration de l’église n’a aucune adresse nouvelle', () => {
    const nouvelles = ADRESSES_ETAPE_4.map(([, exemple]) => exemple.split('?')[0] ?? '')
    for (const chemin of nouvelles)
      expect(profilAutorise(chemin, 'admin_eglise'), chemin).toBe(false)
  })

  it('le signalement n’est ni au berger ni au conseil : seul le ministère écrit', () => {
    expect(profilAutorise('/signaler', 'ministere')).toBe(true)
    for (const profil of ['berger', 'conseil', 'admin_eglise', 'admin_plateforme'] as const) {
      expect(profilAutorise('/signaler', profil), profil).toBe(false)
    }
  })

  it('le titre d’un écran de saisie est le sien pour le ministère', () => {
    const titres: Record<string, string> = {
      '/saisir/dimanche': 'Chiffres du dimanche',
      '/saisir/mois': 'Chiffres du mois',
      '/saisir/fij': 'Carte des FIJ',
      '/saisir/fij-statistiques': 'Chiffres par département',
      '/saisir/reunion': 'Prochaine réunion',
      '/signaler': 'Signaler une difficulté',
    }
    for (const [chemin, titre] of Object.entries(titres)) {
      const adresse = trouverAdresse(chemin)
      expect(adresse && titrePour(adresse, 'ministere'), chemin).toBe(titre)
    }
  })
})

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
      'Cette semaine',
      'Journal technique',
    ])
    expect(accueil('admin_plateforme')).toBe('/moderation')
    expect(accueil('ministere')).toBe('/')
  })

  it('EJP Tech lit les écrans de lecture du berger, sans ses écrans à lui (T29)', () => {
    for (const chemin of ['/', '/ministeres', '/ministeres/m1', '/points']) {
      expect(profilAutorise(chemin, 'admin_plateforme'), chemin).toBe(true)
      expect(profilAutorise(chemin, 'berger'), chemin).toBe(true)
    }
    for (const chemin of ['/journal', '/ma-fiche', '/comptes', '/sessions']) {
      expect(profilAutorise(chemin, 'admin_plateforme'), chemin).toBe(false)
    }
    expect(profilAutorise('/moderation', 'berger')).toBe(false)
    expect(profilAutorise('/journal-technique', 'berger')).toBe(false)
    const accueilEglise = trouverAdresse('/')
    expect(accueilEglise && titrePour(accueilEglise, 'admin_plateforme')).toBe('Cette semaine')
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
    expect(profilAutorise('/ma-fiche', 'admin_plateforme')).toBe(false)
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
