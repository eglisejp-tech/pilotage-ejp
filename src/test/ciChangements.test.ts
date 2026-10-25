// CI économe (scripts/ci-changements.mjs et .github/workflows/ci.yml ; docs/exploitation.md,
// section 7.8) : documentation seule depuis le dernier run vert, seul le job « qualite » tourne ;
// tout autre changement, ou le moindre doute, fait tout tourner, mise en ligne de main comprise,
// et la mise en ligne n'a jamais lieu si un job requis a échoué ou a été sauté.
import { describe, expect, it } from 'vitest'
import ci from '../../.github/workflows/ci.yml?raw'
import { analyser, choisirBase, decider, estDocumentation } from '../../scripts/ci-changements.mjs'

describe('estDocumentation', () => {
  it('docs/, .claude/ et tout fichier .md', () => {
    for (const chemin of [
      'docs/exploitation.md',
      'docs/reference/maquettes/LISEZMOI.md',
      'docs/reference/tokens.css',
      '.claude/hooks/garde-push.sh',
      '.claude/settings.json',
      'README.md',
      'BRIEF.md',
      'CLAUDE.md',
      'supabase/README.md',
      'src/features/aide/NOTES.MD',
    ]) {
      expect(estDocumentation(chemin), chemin).toBe(true)
    }
  })

  it('le code, les tests, les migrations, la configuration et la CI n’en sont pas', () => {
    for (const chemin of [
      'src/main.tsx',
      'src/styles/tokens.css',
      'src/test/ciChangements.test.ts',
      'e2e/decoupage.spec.ts',
      'supabase/migrations/20261010100000_essai.sql',
      'supabase/tests/000-outils.test.sql',
      'supabase/functions/creer-compte/index.ts',
      'supabase/config.toml',
      'scripts/verifier-textes.mjs',
      'public/_headers',
      'index.html',
      'package.json',
      'package-lock.json',
      'vite.config.ts',
      'playwright.config.ts',
      '.github/workflows/ci.yml',
      '.nvmrc',
      'netlify.toml',
      'documentation.ts',
      'src/docs/page.tsx',
      'md',
    ]) {
      expect(estDocumentation(chemin), chemin).toBe(false)
    }
  })
})

describe('decider', () => {
  it('documentation seule : seul le job « qualite » tourne', () => {
    const decision = decider({ evenement: 'push', fichiers: ['docs/a.md', 'README.md'] })
    expect(decision.code).toBe(false)
    expect(decision.raison).toContain('documentation seule')
  })

  it('un seul fichier hors documentation suffit à tout faire tourner', () => {
    const decision = decider({ evenement: 'push', fichiers: ['docs/a.md', 'src/main.tsx'] })
    expect(decision.code).toBe(true)
    expect(decision.raison).toContain('src/main.tsx')
  })

  it('dans le doute, tout tourne : lancement à la main, aucun run vert, aucun fichier changé', () => {
    expect(decider({ evenement: 'workflow_dispatch', fichiers: ['docs/a.md'] }).code).toBe(true)
    expect(decider({ evenement: 'push', fichiers: null }).code).toBe(true)
    expect(decider({ evenement: 'push', fichiers: [] }).code).toBe(true)
  })
})

describe('choisirBase', () => {
  it('le run vert le plus récent dont le commit est un ancêtre (envoi forcé écarté)', () => {
    const ancetres = new Set(['b', 'c'])
    expect(choisirBase(['a', 'b', 'c'], (sha) => ancetres.has(sha))).toBe('b')
    expect(choisirBase(['a'], () => false)).toBeNull()
    expect(choisirBase([], () => true)).toBeNull()
  })
})

describe('analyser (lectures simulées)', () => {
  // Historique : v1 (code, run vert), v2 (code, run annulé), v3 (documentation, l'envoi).
  const changesDepuis: Record<string, string[]> = {
    v1: ['src/main.tsx', 'docs/exploitation.md'],
    v2: ['docs/exploitation.md'],
  }
  const lectures = (verts: string[]) => ({
    evenement: 'push',
    lireCommitsVerts: () => Promise.resolve(verts),
    estAncetre: (sha: string) => sha in changesDepuis,
    fichiersDepuis: (base: string) => changesDepuis[base] ?? [],
  })

  it('documentation après un run de code annulé : tout tourne (rien ne reste sans mise en ligne)', async () => {
    const decision = await analyser(lectures(['v1']))
    expect(decision).toMatchObject({ base: 'v1', code: true })
  })

  it('documentation après un run vert : seul « qualite » tourne', async () => {
    const decision = await analyser(lectures(['v2', 'v1']))
    expect(decision).toMatchObject({ base: 'v2', code: false })
  })

  it('aucun run vert ancêtre (branche neuve, envoi forcé) : tout tourne', async () => {
    expect(await analyser(lectures([]))).toMatchObject({ base: null, code: true })
    expect(await analyser(lectures(['ailleurs']))).toMatchObject({ base: null, code: true })
  })

  it('API ou git en échec : tout tourne, et la raison le dit', async () => {
    const decision = await analyser({
      ...lectures(['v2']),
      lireCommitsVerts: () => Promise.reject(new Error('API GitHub, statut 403')),
    })
    expect(decision).toMatchObject({ base: null, code: true })
    expect(decision.raison).toContain('statut 403')
    const sansGit = await analyser({
      ...lectures(['v2']),
      fichiersDepuis: () => {
        throw new Error('git absent')
      },
    })
    expect(sansGit.code).toBe(true)
  })

  it('lancement à la main : tout tourne, sans rien lire', async () => {
    const decision = await analyser({
      ...lectures(['v2']),
      evenement: 'workflow_dispatch',
      lireCommitsVerts: () => Promise.reject(new Error('ne doit pas être lu')),
    })
    expect(decision).toMatchObject({ base: null, code: true })
  })
})

describe('.github/workflows/ci.yml', () => {
  /** Le texte d'un job, jusqu'au job suivant. */
  const job = (nom: string) => {
    const debut = ci.indexOf(`\n  ${nom}:\n`)
    expect(debut, nom).toBeGreaterThan(-1)
    const suite = ci.slice(debut + 1).search(/\n {2}[a-z0-9_-]+:\n/)
    return suite === -1 ? ci.slice(debut) : ci.slice(debut, debut + 1 + suite)
  }

  it('« changements » lit tout l’historique et la liste des runs, en lecture seule', () => {
    const changements = job('changements')
    expect(changements).toMatch(/fetch-depth: 0/)
    expect(changements).toMatch(/contents: read/)
    expect(changements).toMatch(/actions: read/)
    expect(changements).not.toMatch(/: write/)
    expect(changements).not.toMatch(/secrets\./)
    expect(changements).toMatch(/run: node scripts\/ci-changements\.mjs/)
    expect(changements).toMatch(/GH_TOKEN: \$\{\{ github\.token \}\}/)
    expect(changements).toMatch(/code: \$\{\{ steps\.decision\.outputs\.code \}\}/)
  })

  it('« qualite » tourne toujours ; la base, les parcours et les fonctions si du code a changé', () => {
    expect(job('qualite')).not.toMatch(/\n {4}(needs|if):/)
    for (const nom of ['base', 'e2e', 'fonctions']) {
      expect(job(nom), nom).toMatch(/\n {4}needs: changements\n/)
      // Seule une réponse « non » explicite saute le job : une sortie absente fait tout tourner.
      expect(job(nom), nom).toMatch(/\n {4}if: needs\.changements\.outputs\.code != 'non'\n/)
    }
  })

  it('la mise en ligne attend tous les jobs, et seulement quand du code a changé', () => {
    const deploiement = job('deploiement')
    expect(deploiement).toMatch(/needs: \[changements, qualite, base, e2e, fonctions\]/)
    expect(deploiement).toMatch(
      /\n {4}if: github\.ref == 'refs\/heads\/main' && \(github\.event_name == 'push' \|\| github\.event_name == 'workflow_dispatch'\) && needs\.changements\.outputs\.code != 'non'\n/,
    )
    // Sans fonction d'état, GitHub ajoute success() : un job requis en échec, annulé ou sauté
    // empêche toute publication. always(), failure() ou cancelled() la rendraient possible.
    expect(deploiement).not.toMatch(/always\(\)|failure\(\)|cancelled\(\)|success\(\)/)
  })

  it('le script n’écrit que « oui » ou « non », et les jobs ne testent que ces deux mots', () => {
    expect(ci.match(/outputs\.code [!=]= '\w+'/g)?.every((test) => test.endsWith("!= 'non'"))).toBe(
      true,
    )
  })

  it('aucun autre job ne se lance sans « changements » ni ne le contourne', () => {
    const noms = [...ci.matchAll(/\n {2}([a-z0-9_-]+):\n {4}(?:name|runs-on|needs|if):/g)].map(
      (m) => m[1],
    )
    expect(noms).toEqual(['changements', 'qualite', 'base', 'e2e', 'fonctions', 'deploiement'])
  })
})
