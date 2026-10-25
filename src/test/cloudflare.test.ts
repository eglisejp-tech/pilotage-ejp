import { describe, expect, it } from 'vitest'
import ci from '../../.github/workflows/ci.yml?raw'
import nvmrc from '../../.nvmrc?raw'
import indexHtml from '../../index.html?raw'
import netlify from '../../netlify.toml?raw'
import entetes from '../../public/_headers?raw'
import redirections from '../../public/_redirects?raw'
import configVite from '../../vite.config.ts?raw'

/**
 * Hébergement Cloudflare Pages (T70) : contrôle de public/_headers et public/_redirects (copiés
 * dans dist/ par Vite), de la page 404 de /assets/, de l'aperçu des liens, du job de mise en
 * ligne et de la redirection laissée sur Netlify. Mêmes garanties que l'ancien contrôle de
 * netlify.toml (plan de l'étape 8, lot D1). Les règles de Pages sont celles de sa documentation,
 * vérifiées le 24 octobre 2026 et essayées avec wrangler pages dev.
 */

const PRODUCTION = 'ugbitornbspatpcowlvg'
/** Ancien marqueur du projet de production : il ne doit jamais revenir dans la politique. */
const MARQUEUR_PRODUCTION = '<ref-prod>'

function sansCommentaires(texte: string): string[] {
  return texte.split('\n').filter((ligne) => ligne.trim() !== '' && !ligne.trim().startsWith('#'))
}

interface Bloc {
  valeurs: Map<string, string>
  retires: string[]
}

/**
 * _headers : une ligne d'adresse en colonne 0, puis les en-têtes indentés « Nom: valeur », ou
 * « ! Nom » pour retirer un en-tête posé par Pages.
 */
function lireEntetes(texte: string): Map<string, Bloc> {
  const blocs = new Map<string, Bloc>()
  let courant: Bloc | undefined
  for (const ligne of sansCommentaires(texte)) {
    if (!/^\s/.test(ligne)) {
      courant = { valeurs: new Map(), retires: [] }
      blocs.set(ligne.trim(), courant)
      continue
    }
    if (courant === undefined) throw new Error(`En-tête hors d'un bloc : ${ligne}`)
    const retrait = /^\s+!\s*(\S+)\s*$/.exec(ligne)
    if (retrait?.[1]) {
      courant.retires.push(retrait[1])
      continue
    }
    const entete = /^\s+([A-Za-z-]+):\s*(.+?)\s*$/.exec(ligne)
    if (!entete?.[1] || entete[2] === undefined) throw new Error(`Ligne illisible : ${ligne}`)
    courant.valeurs.set(entete[1], entete[2])
  }
  return blocs
}

const BLOCS = lireEntetes(entetes)

function bloc(adresse: string): Bloc {
  const trouve = BLOCS.get(adresse)
  if (trouve === undefined) throw new Error(`Bloc absent de _headers : ${adresse}`)
  return trouve
}

/** En-tête de sécurité : lu seulement dans le bloc qui protège toutes les adresses (/*). */
function entetePages(nom: string): string {
  const valeur = bloc('/*').valeurs.get(nom)
  if (valeur === undefined) throw new Error(`En-tête absent du bloc /* : ${nom}`)
  return valeur
}

const csp = entetePages('Content-Security-Policy')
const directives = new Map(
  csp.split(';').map((directive) => {
    const [nom = '', ...sources] = directive.trim().split(/\s+/)
    return [nom, sources] as const
  }),
)

/** Fichiers 404.html de public/ (copiés tels quels dans dist/). */
const PAGES_404 = Object.keys(
  import.meta.glob('../../public/**/404.html', { query: '?raw', import: 'default', eager: true }),
)

describe('_headers : forme lue par Cloudflare Pages', () => {
  it('a deux blocs, /* et /assets/*, dans les limites de Pages (100 blocs, 2 000 caractères)', () => {
    expect([...BLOCS.keys()]).toEqual(['/*', '/assets/*'])
    for (const ligne of entetes.split('\n')) expect(ligne.length).toBeLessThanOrEqual(2000)
  })
})

describe('_headers : politique de contenu', () => {
  it('interdit unsafe-eval, le joker et les scripts en ligne', () => {
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).not.toMatch(/(^|\s)\*(\s|;|$)/)
    expect(directives.get('script-src')).toEqual(["'self'"])
  })

  it("limite 'unsafe-inline' aux styles", () => {
    for (const [nom, sources] of directives) {
      if (nom !== 'style-src') expect(sources, nom).not.toContain("'unsafe-inline'")
    }
    expect(directives.get('style-src')).toEqual(["'self'", "'unsafe-inline'"])
  })

  it("n'autorise data: que pour les images (QR code) et garde les polices sur le site", () => {
    for (const [nom, sources] of directives) {
      if (nom !== 'img-src') expect(sources, nom).not.toContain('data:')
    }
    expect(directives.get('img-src')).toEqual(["'self'", 'data:'])
    expect(directives.get('font-src')).toEqual(["'self'"])
  })

  it('limite connect-src au site et aux projets Supabase', () => {
    const sources = directives.get('connect-src') ?? []
    expect(sources.slice(0, 2)).toEqual(["'self'", `https://${PRODUCTION}.supabase.co`])
    // Un autre projet s'ajoute à la suite, par son identifiant de 20 lettres.
    expect(sources.length).toBeLessThanOrEqual(3)
    if (sources[2] !== undefined) expect(sources[2]).toMatch(/^https:\/\/[a-z]{20}\.supabase\.co$/)
  })

  it("n'écrit jamais de marqueur dans la politique : le navigateur le rejetterait en erreur", () => {
    expect(directives.get('connect-src')?.join(' ')).not.toContain(MARQUEUR_PRODUCTION)
  })

  it("interdit l'intégration dans un cadre, les objets et les bases extérieures", () => {
    expect(directives.get('default-src')).toEqual(["'self'"])
    expect(directives.get('frame-ancestors')).toEqual(["'none'"])
    expect(directives.get('base-uri')).toEqual(["'self'"])
    expect(directives.get('form-action')).toEqual(["'self'"])
    expect(directives.get('object-src')).toEqual(["'none'"])
  })
})

describe('_headers : autres en-têtes', () => {
  it('pose HSTS, nosniff, no-referrer, Permissions-Policy et noindex', () => {
    expect(entetePages('Strict-Transport-Security')).toMatch(/^max-age=\d{8,}/)
    expect(entetePages('X-Content-Type-Options')).toBe('nosniff')
    expect(entetePages('Referrer-Policy')).toBe('no-referrer')
    expect(entetePages('X-Robots-Tag')).toContain('noindex')
  })

  it('pose la Permissions-Policy sans la fonction retirée interest-cohort', () => {
    const politique = entetePages('Permissions-Policy')
    for (const fonction of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) {
      expect(politique).toContain(`${fonction}=()`)
    }
    expect(politique).not.toContain('interest-cohort')
  })

  it("retire l'Access-Control-Allow-Origin: * que Pages pose par défaut, et rien d'autre", () => {
    expect(bloc('/*').retires).toEqual(['Access-Control-Allow-Origin'])
    expect(bloc('/assets/*').retires).toEqual([])
  })

  it('met en cache sans limite les fichiers empreints de /assets/*, et seulement eux', () => {
    expect(bloc('/assets/*').valeurs.get('Cache-Control')).toBe(
      'public, max-age=31536000, immutable',
    )
    expect(bloc('/*').valeurs.has('Cache-Control')).toBe(false)
  })

  it('ne met aucun autre en-tête sous /assets/* : ils viennent du bloc /*, que Pages ajoute', () => {
    expect([...bloc('/assets/*').valeurs.keys()]).toEqual(['Cache-Control'])
  })
})

describe('_redirects et page 404 : application à page unique', () => {
  it("n'a aucune règle : sans 404.html à la racine, Pages sert déjà index.html", () => {
    expect(sansCommentaires(redirections)).toEqual([])
  })

  it('a un 404.html dans public/assets/ seulement, jamais à la racine (il couperait le repli)', () => {
    expect(PAGES_404).toEqual(['../../public/assets/404.html'])
  })
})

describe('Aperçu des liens : adresse du site au build (VITE_SITE_URL)', () => {
  it("prend l'image d'aperçu à l'adresse VITE_SITE_URL, que Vite remplace au build", () => {
    expect(indexHtml).toContain(
      '<meta property="og:image" content="%VITE_SITE_URL%/apercu-lien.png" />',
    )
    expect(indexHtml).not.toContain('netlify.app')
  })

  it("donne par défaut l'adresse Cloudflare Pages, celle vers laquelle Netlify renvoie", () => {
    const defaut = /const ADRESSE_SITE_PAR_DEFAUT = '([^']+)'/.exec(configVite)?.[1]
    expect(defaut).toBe('https://pilotage-ejp.pages.dev')
    expect(netlify).toContain(`to = "${defaut}/:splat"`)
  })
})

describe('Mise en ligne par la CI (job « deploiement »)', () => {
  const job = ci.slice(ci.indexOf('\n  deploiement:'))

  it('existe, après tous les autres jobs de la CI', () => {
    expect(job.length).toBeGreaterThan(0)
    expect(job).toMatch(/needs: \[qualite, base, e2e, fonctions\]/)
  })

  it('ne se lance que sur main, pour un envoi ou un lancement à la main', () => {
    expect(job).toMatch(
      /if: github\.ref == 'refs\/heads\/main' && \(github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'\)/,
    )
  })

  it('publie dist sur le projet pilotage-ejp, branche de production main, avec wrangler-action', () => {
    expect(job).toContain('uses: cloudflare/wrangler-action@v4')
    expect(job).toMatch(/pages deploy dist --project-name=pilotage-ejp --branch=main/)
    // Sinon « --branch=main » publierait un simple aperçu.
    expect(job).toContain(`--data '{"name":"pilotage-ejp","production_branch":"main"}'`)
    expect(job).toContain('if [ "$branche" != "main" ]; then')
  })

  it('prend le jeton et le compte Cloudflare dans les secrets, la clé publique dans les variables', () => {
    expect(job).toContain('${{ secrets.CLOUDFLARE_API_TOKEN }}')
    expect(job).toContain('${{ secrets.CLOUDFLARE_ACCOUNT_ID }}')
    expect(job).toContain('${{ vars.VITE_SUPABASE_URL }}')
    expect(job).toContain('${{ vars.VITE_SUPABASE_PUBLISHABLE_KEY }}')
    expect(job).toContain('${{ vars.VITE_SITE_URL }}')
    expect(job).not.toMatch(/secrets\.VITE_|vars\.CLOUDFLARE_/)
  })
})

describe("netlify.toml : renvoi de l'ancienne adresse", () => {
  const lignes = sansCommentaires(netlify).join('\n')

  it('renvoie toute adresse vers le nouveau site, en 301, fichiers compris', () => {
    expect(lignes).toMatch(
      /\[\[redirects\]\]\s+from = "\/\*"\s+to = "https:\/\/pilotage-ejp\.pages\.dev\/:splat"\s+status = 301\s+force = true/,
    )
    expect(lignes.match(/\[\[redirects\]\]/g)).toHaveLength(1)
  })

  it("ne construit plus l'application et ne publie ni dist ni le dépôt", () => {
    expect(lignes).not.toContain('npm run build')
    expect(lignes).toMatch(/publish = "redirection-netlify"/)
    expect(lignes).not.toContain('[[headers]]')
  })

  it('fixe la version de Node à celle de .nvmrc (Netlify installe encore les dépendances)', () => {
    expect(/NODE_VERSION = "(\d+)"/.exec(lignes)?.[1]).toBe(nvmrc.trim())
  })
})
