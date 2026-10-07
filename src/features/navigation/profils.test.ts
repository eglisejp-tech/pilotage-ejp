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
    // Lot C0 : « Nouveau point » (étape 5) a maintenant son adresse, au ministère seulement.
    expect(trouverAdresse('/saisir/point')?.titre).toBe('Nouveau point')
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
      'Indicateurs',
      'Journal',
    ])
    expect(ONGLETS.admin_plateforme.map((o) => o.libelle)).toEqual([
      'Modération',
      'Indicateurs',
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

// Adresses des étapes 5 et 6 (plan des étapes 5 à 8, section 3.0, lot C0) : un exemple d'adresse
// réelle par motif, son étape et les seuls profils qui y ont droit.
const ADRESSES_ETAPES_5_6: [
  motif: string,
  exemple: string,
  etape: number,
  profils: TypeCompte[],
][] = [
  ['/saisir/point', '/saisir/point', 5, ['ministere']],
  ['/points', '/points', 5, ['ministere', 'berger', 'conseil', 'admin_plateforme']],
  ['/journal', '/journal', 6, ['ministere', 'berger', 'conseil', 'admin_eglise']],
  ['/journal-technique', '/journal-technique', 6, ['admin_plateforme']],
  ['/comptes', '/comptes', 6, ['admin_eglise']],
  ['/sessions', '/sessions', 6, ['admin_eglise']],
  ['/indicateurs', '/indicateurs', 6, ['admin_eglise', 'admin_plateforme']],
  ['/indicateurs/:id', '/indicateurs/m1', 6, ['admin_eglise', 'admin_plateforme']],
  ['/ma-fiche/indicateurs', '/ma-fiche/indicateurs', 6, ['ministere']],
  ['/moderation', '/moderation', 6, ['admin_plateforme']],
]

describe('adresses des étapes 5 et 6 (lot C0)', () => {
  it.each(ADRESSES_ETAPES_5_6)(
    '%s : déclarée une fois, à son étape, avec ses profils',
    (motif, exemple, etape, profils) => {
      expect(ADRESSES_APPLICATION.filter((adresse) => adresse.chemin === motif)).toHaveLength(1)
      const adresse = trouverAdresse(exemple)
      expect(adresse?.chemin).toBe(motif)
      expect(adresse?.etape).toBe(etape)
      for (const profil of PROFILS) {
        expect(profilAutorise(exemple, profil), `${profil} ${exemple}`).toBe(
          profils.includes(profil),
        )
      }
    },
  )

  it('« /ma-fiche/indicateurs » et « /indicateurs/:id » ne se confondent pas avec leurs voisines', () => {
    expect(trouverAdresse('/ma-fiche')?.chemin).toBe('/ma-fiche')
    expect(trouverAdresse('/ma-fiche/indicateurs')?.chemin).toBe('/ma-fiche/indicateurs')
    expect(trouverAdresse('/indicateurs')?.chemin).toBe('/indicateurs')
    expect(trouverAdresse('/indicateurs/m1')?.chemin).toBe('/indicateurs/:id')
    expect(trouverAdresse('/indicateurs/m1/autre')).toBeNull()
  })

  it('seul un ministère crée un point : ni le berger, ni le conseil, ni EJP Tech (BRIEF règle 7, T29)', () => {
    expect(profilAutorise('/saisir/point', 'ministere')).toBe(true)
    for (const profil of ['berger', 'conseil', 'admin_eglise', 'admin_plateforme'] as const) {
      expect(profilAutorise('/saisir/point', profil), profil).toBe(false)
    }
  })

  it('« Indicateurs » suit « Sessions » (administration) et « Modération » (EJP Tech)', () => {
    const chemins = (profil: TypeCompte) => ONGLETS[profil].map((onglet) => onglet.chemin)
    const eglise = chemins('admin_eglise')
    expect(eglise.indexOf('/indicateurs')).toBe(eglise.indexOf('/sessions') + 1)
    const tech = chemins('admin_plateforme')
    expect(tech.indexOf('/indicateurs')).toBe(tech.indexOf('/moderation') + 1)
    for (const profil of ['ministere', 'berger', 'conseil'] as const) {
      expect(chemins(profil), profil).not.toContain('/indicateurs')
    }
  })

  it('le ministère n’a pas de cinquième onglet : « Mes indicateurs » s’ouvre depuis « Ma fiche »', () => {
    expect(ONGLETS.ministere).toHaveLength(4)
    const mesIndicateurs = trouverAdresse('/ma-fiche/indicateurs')
    expect(mesIndicateurs && titrePour(mesIndicateurs, 'ministere')).toBe('Mes indicateurs')
  })
})
