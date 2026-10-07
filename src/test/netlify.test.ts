import { describe, expect, it } from 'vitest'
import nvmrc from '../../.nvmrc?raw'
import fichier from '../../netlify.toml?raw'

/**
 * Contrôle de netlify.toml (plan de l'étape 8, lot D1). Il n'y a pas d'analyseur TOML dans les
 * dépendances : le fichier est lu par motifs, ce qui suffit pour ces contrôles.
 */

const PREPRODUCTION = 'ugbitornbspatpcowlvg'
/** Ancien marqueur du projet de production : il ne doit jamais revenir dans la politique. */
const MARQUEUR_PRODUCTION = '<ref-prod>'
const SANS_COMMENTAIRES = fichier
  .split('\n')
  .filter((ligne) => !ligne.trim().startsWith('#'))
  .join('\n')

function valeurDans(texte: string, nom: string): string {
  const motif = new RegExp(`^\\s*${nom}\\s*=\\s*"(.*)"\\s*$`, 'm')
  const trouve = motif.exec(texte)
  if (!trouve?.[1]) throw new Error(`Valeur absente de netlify.toml : ${nom}`)
  return trouve[1]
}

function valeur(nom: string): string {
  return valeurDans(SANS_COMMENTAIRES, nom)
}

/** Un bloc [[headers]] par adresse (for = "..."), pour lire chaque en-tête sous la bonne adresse. */
const BLOCS_EN_TETES = new Map(
  SANS_COMMENTAIRES.split('[[headers]]')
    .slice(1)
    .map((bloc) => [valeurDans(bloc, 'for'), bloc] as const),
)

function blocEnTetes(adresse: string): string {
  const bloc = BLOCS_EN_TETES.get(adresse)
  if (bloc === undefined) throw new Error(`Bloc [[headers]] absent de netlify.toml : ${adresse}`)
  return bloc
}

/** En-tête de sécurité : lu seulement dans le bloc qui protège les pages (for = "/*"). */
function entetePages(nom: string): string {
  return valeurDans(blocEnTetes('/*'), nom)
}

const csp = entetePages('Content-Security-Policy')
const directives = new Map(
  csp.split(';').map((directive) => {
    const [nom = '', ...sources] = directive.trim().split(/\s+/)
    return [nom, sources] as const
  }),
)

describe('netlify.toml : construction', () => {
  it('construit avec npm run build et publie dist', () => {
    expect(valeur('command')).toBe('npm run build')
    expect(valeur('publish')).toBe('dist')
  })

  it('fixe la version de Node à celle de .nvmrc', () => {
    expect(valeur('NODE_VERSION')).toBe(nvmrc.trim())
  })

  it('renvoie toute adresse vers index.html avec le statut 200', () => {
    expect(SANS_COMMENTAIRES).toMatch(
      /\[\[redirects\]\]\s+from = "\/\*"\s+to = "\/index\.html"\s+status = 200/,
    )
  })

  it('répond 404 à un fichier de /assets/ absent, avant la règle qui renvoie index.html', () => {
    const regle404 = /\[\[redirects\]\]\s+from = "\/assets\/\*"\s+to = "\/404\.html"\s+status = 404/
    expect(SANS_COMMENTAIRES).toMatch(regle404)
    const position404 = SANS_COMMENTAIRES.search(regle404)
    const positionSpa = SANS_COMMENTAIRES.indexOf('from = "/*"')
    expect(position404).toBeGreaterThanOrEqual(0)
    expect(position404).toBeLessThan(positionSpa)
  })
})

describe('netlify.toml : politique de contenu', () => {
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
    expect(sources.slice(0, 2)).toEqual(["'self'", `https://${PREPRODUCTION}.supabase.co`])
    // Le projet de production s'ajoute quand il existe, par son identifiant de 20 lettres.
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

describe('netlify.toml : autres en-têtes', () => {
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

  it('met en cache sans limite les fichiers empreints de /assets/*, et seulement eux', () => {
    expect(valeurDans(blocEnTetes('/assets/*'), 'Cache-Control')).toBe(
      'public, max-age=31536000, immutable',
    )
    expect(blocEnTetes('/*')).not.toContain('Cache-Control')
  })

  it('ne met aucun en-tête de sécurité sous /assets/*', () => {
    expect(blocEnTetes('/assets/*')).not.toContain('Content-Security-Policy')
    expect(blocEnTetes('/assets/*')).not.toContain('Strict-Transport-Security')
  })
})
