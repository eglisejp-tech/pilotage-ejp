import { describe, expect, it, vi } from 'vitest'
import configVite from '../../vite.config.ts?raw'
import sourceMain from '@/main.tsx?raw'
import { routesDeDeveloppement as routesAbsentes } from '@/app/routesDeDeveloppementAbsentes'
import sourceRoutes from '@/app/routes.tsx?raw'
import sourcePageApplication from '@/pages/PageApplication.tsx?raw'
import source from '@/pages/pagesDesAdresses.ts?raw'
import { ADRESSES_APPLICATION } from '@/features/navigation/profils'
import { PAGE_ACCUEIL, PAGES_DES_ADRESSES, prechargerEcran } from '@/pages/pagesDesAdresses'

// En premier : les tests suivants chargent toutes les pages, et un écran chargé le reste.
describe('prechargerEcran (au démarrage de l’outil)', () => {
  it('fait venir le code de l’écran de l’adresse ouverte, motif à paramètre compris', async () => {
    const fiche = PAGES_DES_ADRESSES['/ministeres/:id']!
    expect(fiche.charge()).toBeUndefined()
    prechargerEcran('/ministeres/1f0c6c2e-0000-4000-8000-000000000000')
    await vi.waitFor(() => expect(fiche.charge()).toBeTypeOf('function'), { timeout: 20_000 })
    expect(PAGES_DES_ADRESSES['/ministeres']!.charge()).toBeUndefined()
  }, 30_000)

  it('« / » fait venir Cette semaine ; rien hors de l’application (connexion, pages publiques)', async () => {
    prechargerEcran('/connexion')
    prechargerEcran('/confidentialite')
    expect(PAGE_ACCUEIL.charge()).toBeUndefined()
    prechargerEcran('/')
    await vi.waitFor(() => expect(PAGE_ACCUEIL.charge()).toBeTypeOf('function'), {
      timeout: 20_000,
    })
  }, 30_000)
})

describe('pages des adresses', () => {
  it('chaque page est celle d’une adresse déclarée (pas de faute de frappe dans un motif)', () => {
    const motifs = new Set(ADRESSES_APPLICATION.map((adresse) => adresse.chemin))
    for (const motif of Object.keys(PAGES_DES_ADRESSES)) expect(motifs.has(motif), motif).toBe(true)
  })

  it('chaque adresse de l’étape 4 a sa page, que son lot remplace', () => {
    for (const adresse of ADRESSES_APPLICATION.filter((a) => a.etape === 4)) {
      expect(PAGES_DES_ADRESSES[adresse.chemin], adresse.chemin).toBeDefined()
    }
  })

  it('chaque adresse des étapes 5 et 6 a sa page (amorce du lot C0), que son lot remplace', () => {
    for (const adresse of ADRESSES_APPLICATION.filter((a) => a.etape === 5 || a.etape === 6)) {
      expect(PAGES_DES_ADRESSES[adresse.chemin], adresse.chemin).toBeDefined()
    }
  })

  it('le journal et le journal technique partagent une seule page', () => {
    expect(PAGES_DES_ADRESSES['/journal-technique']).toBe(PAGES_DES_ADRESSES['/journal'])
  })

  it('« / » garde sa propre vue : elle n’est pas dans la table', () => {
    expect(PAGES_DES_ADRESSES['/']).toBeUndefined()
    expect(PAGE_ACCUEIL.nom).toBe('PageCetteSemaine')
  })

  it('chaque écran se charge et donne son composant, sous un nom qui lui est propre', async () => {
    const parNom = new Map<string, unknown>()
    for (const ecran of [PAGE_ACCUEIL, ...Object.values(PAGES_DES_ADRESSES)]) {
      const composant = await ecran.charger()
      expect(typeof composant, ecran.nom).toBe('function')
      expect(ecran.charge(), ecran.nom).toBe(composant)
      // Le nom sert de clé à l'affichage : deux écrans différents n'ont jamais le même.
      if (parNom.has(ecran.nom)) expect(parNom.get(ecran.nom), ecran.nom).toBe(ecran)
      parNom.set(ecran.nom, ecran)
    }
  }, 60_000)
})

describe('découpage par écran : aucune page à la demande dans le premier chargement', () => {
  // Un import statique d'une de ces pages la remettrait dans le premier chargement de l'outil.
  // Seuls les imports de type (effacés au build) et les import() sont permis.
  const noms = [PAGE_ACCUEIL, ...Object.values(PAGES_DES_ADRESSES)].map((ecran) => ecran.nom)

  it('pagesDesAdresses.ts, PageApplication.tsx, routes.tsx et main.tsx n’en importent aucune', () => {
    for (const [fichier, texte] of [
      ['pagesDesAdresses.ts', source],
      ['PageApplication.tsx', sourcePageApplication],
      ['routes.tsx', sourceRoutes],
      ['main.tsx', sourceMain],
    ] as const) {
      for (const nom of noms) {
        // Un import sur une ou plusieurs lignes, jusqu'à son module ; jamais au-delà d'un autre.
        const statique = new RegExp(`^import\\s+(?!type\\b)[^'"]*from\\s+'@/pages/${nom}'`, 'm')
        expect(statique.test(texte), `${fichier} importe ${nom}`).toBe(false)
      }
    }
  })

  it('les aperçus de développement passent par un seul module, vide au build', () => {
    expect(sourceRoutes).not.toMatch(/^import [^'"]*from '[^']*apercu/im)
    expect(sourceRoutes).toMatch(
      /^import \{ routesDeDeveloppement \} from '@\/app\/routesDeDeveloppement'$/m,
    )
    expect(configVite).toMatch(/command === 'build'/)
    expect(configVite).toMatch(/find: \/\^@\\\/app\\\/routesDeDeveloppement\$\//)
    expect(configVite).toContain("'./src/app/routesDeDeveloppementAbsentes.ts'")
    expect(routesAbsentes).toEqual([])
  })
})
