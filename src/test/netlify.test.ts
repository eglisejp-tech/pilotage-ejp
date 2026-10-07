import { describe, expect, it } from 'vitest'
import nvmrc from '../../.nvmrc?raw'
import fichier from '../../netlify.toml?raw'

/**
 * Contrôle de netlify.toml (plan de l'étape 8, lot D1). Il n'y a pas d'analyseur TOML dans les
 * dépendances : le fichier est lu par motifs, ce qui suffit pour ces contrôles.
 */

const PREPRODUCTION = 'ugbitornbspatpcowlvg'
/** Marqueur du projet de production, à remplacer par son identifiant avant la mise en service. */
const MARQUEUR_PRODUCTION = '<ref-prod>'
const SANS_COMMENTAIRES = fichier
  .split('\n')
  .filter((ligne) => !ligne.trim().startsWith('#'))
  .join('\n')

function valeur(nom: string): string {
  const motif = new RegExp(`^\\s*${nom}\\s*=\\s*"(.*)"\\s*$`, 'm')
  const trouve = motif.exec(SANS_COMMENTAIRES)
  if (!trouve?.[1]) throw new Error(`Valeur absente de netlify.toml : ${nom}`)
  return trouve[1]
}

const csp = valeur('Content-Security-Policy')
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

  it('limite connect-src au site et aux deux projets Supabase', () => {
    const sources = directives.get('connect-src') ?? []
    expect(sources).toHaveLength(3)
    expect(sources.slice(0, 2)).toEqual(["'self'", `https://${PREPRODUCTION}.supabase.co`])
    // Troisième source : le projet de production, marqueur ou identifiant de 20 lettres.
    const production = new RegExp(`^https://(${MARQUEUR_PRODUCTION}|[a-z]{20})\\.supabase\\.co$`)
    expect(sources[2]).toMatch(production)
  })

  it('garde le marqueur du projet de production à un seul endroit, avec son commentaire', () => {
    const occurrences = fichier.split(MARQUEUR_PRODUCTION).length - 1
    expect(occurrences).toBeLessThanOrEqual(1)
    expect(fichier).toContain("À remplacer par l'identifiant du projet de production")
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
    expect(valeur('Strict-Transport-Security')).toMatch(/^max-age=\d{8,}/)
    expect(valeur('X-Content-Type-Options')).toBe('nosniff')
    expect(valeur('Referrer-Policy')).toBe('no-referrer')
    expect(valeur('Permissions-Policy')).toContain('camera=()')
    expect(valeur('X-Robots-Tag')).toContain('noindex')
  })

  it('met en cache sans limite les fichiers empreints de /assets/*', () => {
    expect(SANS_COMMENTAIRES).toMatch(/for = "\/assets\/\*"/)
    expect(valeur('Cache-Control')).toBe('public, max-age=31536000, immutable')
  })
})
