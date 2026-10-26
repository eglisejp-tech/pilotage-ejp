import { describe, expect, it } from 'vitest'

// Garde-fou du classement unique (T76) : toute écriture de `src/data/` passe par `envoyer`, avec
// la cible de sa requête. Sinon son échec ne serait classé que d'après son message (un 200 au corps
// perdu passerait pour une coupure), et sa référence ne partirait pas dans X-Client-Info.

const SOURCES = import.meta.glob<string>(['./*.ts', '!./*.test.ts', '!./envoi.ts'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** Fonctions de la base qui lisent seulement : elles ne passent pas par `envoyer`. */
const LECTURES = new Set([
  'conditions_acceptees',
  'evenements_eglise_mois',
  'limites_indicateurs',
  'verifier_libelle',
])

/** Les écritures d'un fichier : `rpc/<nom>`, `table/<nom>` et `functions/...`, dans l'ordre. */
function ecritures(source: string): string[] {
  const trouvees: string[] = []
  for (const appel of source.matchAll(
    /\.rpc\('([a-z_]+)'|\.from\('([a-z_]+)'\)\s*\.(?:insert|upsert)\(|\.functions\.invoke\(/g,
  )) {
    if (appel[1] && LECTURES.has(appel[1])) continue
    trouvees.push(appel[1] ? `rpc/${appel[1]}` : appel[2] ? `table/${appel[2]}` : 'functions')
  }
  return trouvees
}

/** Les cibles annoncées à `envoyer`, dans l'ordre. */
function envois(source: string): string[] {
  return Array.from(
    source.matchAll(/envoyer\(\s*['`]((?:rpc|table|functions)\/[^'`$]*)/g),
    (envoi) => (envoi[1]?.startsWith('functions/') ? 'functions' : (envoi[1] ?? '')),
  )
}

describe('toute écriture passe par envoyer (T76)', () => {
  it('lit bien les fichiers de src/data/', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(20)
    expect(Object.values(SOURCES).flatMap(ecritures)).toContain('rpc/ajouter_evenement')
  })

  it.each(Object.entries(SOURCES))('%s', (_fichier, source) => {
    expect(envois(source)).toEqual(ecritures(source))
  })
})
