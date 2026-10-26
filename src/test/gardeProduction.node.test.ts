// @vitest-environment node
// Hook .claude/hooks/garde-production.sh (docs/exploitation.md, 7.3 bis ; T77) : les gestes de
// production de Claude passent par les seules formes exactes du script, et seulement si le script
// et ses fonctions sont ceux de origin/main dans le dossier de la commande. Déchiffrer un export
// ou créer une paire de clés age est refusé. Le hook est lancé par bash, comme Claude Code le fait.
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Chaque appel lance bash, node et git : 1 à 2 secondes sous Windows, bien moins en CI.
const LENT = { timeout: 120_000 }
const racine = process.cwd()
const hook = join(racine, '.claude/hooks/garde-production.sh').replaceAll('\\', '/')
let depot = ''
let horsDepot = ''

function git(dossier: string, args: string[]) {
  const r = spawnSync('git', ['-C', dossier, ...args], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} : ${r.stderr}`)
}

function garde(commande: string, cwd = depot) {
  const r = spawnSync('bash', [hook], {
    input: JSON.stringify({ tool_input: { command: commande }, cwd }),
    encoding: 'utf8',
  })
  return { code: r.status, sortie: r.stdout, erreur: r.stderr }
}

beforeAll(() => {
  depot = mkdtempSync(join(tmpdir(), 'garde-production-'))
  horsDepot = mkdtempSync(join(tmpdir(), 'garde-production-hors-'))
  mkdirSync(join(depot, 'scripts'), { recursive: true })
  cpSync(join(racine, 'scripts/production.sh'), join(depot, 'scripts/production.sh'))
  cpSync(join(racine, 'scripts/export'), join(depot, 'scripts/export'), { recursive: true })
  git(depot, ['init', '-q'])
  git(depot, ['add', '.'])
  git(depot, [
    '-c',
    'user.name=essai',
    '-c',
    'user.email=essai@exemple.test',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '-q',
    '--no-verify',
    '-m',
    'essai',
  ])
  git(depot, ['update-ref', 'refs/remotes/origin/main', 'HEAD'])
}, 60_000)

afterAll(() => {
  rmSync(depot, { recursive: true, force: true })
  rmSync(horsDepot, { recursive: true, force: true })
})

describe('formes acceptées, script identique à origin/main', LENT, () => {
  it('etat, revenir, preparer et export passent sans confirmation', () => {
    for (const commande of [
      'bash scripts/production.sh etat',
      'bash scripts/production.sh revenir',
      'bash scripts/production.sh preparer main',
      'bash scripts/production.sh preparer etape-8-export-chiffre',
      'bash scripts/production.sh export',
      '  bash scripts/production.sh export  ',
    ]) {
      const r = garde(commande)
      expect(r.code, commande).toBe(0)
      expect(r.sortie, commande).toBe('')
    }
  })

  it('migrer et fonction demandent la confirmation de la personne', () => {
    for (const commande of [
      'bash scripts/production.sh migrer',
      'bash scripts/production.sh fonction creer-compte',
    ]) {
      const r = garde(commande)
      expect(r.code, commande).toBe(0)
      expect(r.sortie, commande).toContain('"permissionDecision":"ask"')
    }
  })
})

describe('script différent de origin/main', LENT, () => {
  it('une fonction modifiée dans scripts/export/ bloque toutes les formes', () => {
    appendFileSync(join(depot, 'scripts/export/commun.sh'), '\n# modifié\n')
    try {
      for (const commande of [
        'bash scripts/production.sh export',
        'bash scripts/production.sh etat',
      ]) {
        const r = garde(commande)
        expect(r.code, commande).toBe(2)
        expect(r.erreur, commande).toContain('origin/main')
      }
    } finally {
      git(depot, ['checkout', '--', '.'])
    }
    expect(garde('bash scripts/production.sh export').code).toBe(0)
  })

  it('un fichier nouveau dans scripts/export/ bloque', () => {
    writeFileSync(join(depot, 'scripts/export/autre.sh'), 'echo autre\n')
    try {
      expect(garde('bash scripts/production.sh export').code).toBe(2)
    } finally {
      rmSync(join(depot, 'scripts/export/autre.sh'))
    }
  })

  it('un script production.sh modifié bloque migrer', () => {
    appendFileSync(join(depot, 'scripts/production.sh'), '\n# modifié\n')
    try {
      expect(garde('bash scripts/production.sh migrer').code).toBe(2)
    } finally {
      git(depot, ['checkout', '--', '.'])
    }
  })

  it('hors d un dépôt (origin/main introuvable), la forme exacte est refusée', () => {
    expect(garde('bash scripts/production.sh export', horsDepot).code).toBe(2)
  })
})

describe('formes refusées', LENT, () => {
  it('toute variante du script et tout appel distant de la CLI', () => {
    for (const commande of [
      'bash scripts/production.sh export --verbose',
      'bash scripts/production.sh export x',
      'bash scripts/production.sh export; ls',
      'bash scripts/production.sh export && cat x',
      'bash scripts/production.sh  export',
      'bash scripts/production.sh "export"',
      'bash ./scripts/production.sh export',
      'sh scripts/production.sh export',
      'bash scripts/production.sh etat; cat x',
      'bash scripts/production.sh migrer --yes',
      'npx supabase db dump --linked --dry-run',
      'npx supabase db dump --local --dry-run',
      'npx supabase db push',
      'node_modules/.bin/supabase functions deploy creer-compte',
      'npx supabase link --project-ref abc',
    ]) {
      expect(garde(commande).code, commande).toBe(2)
    }
  })

  it('déchiffrer un export ou créer une paire de clés age', () => {
    for (const commande of [
      'age -d -i cle.txt ejp-2026-11-02-0910.dump.age',
      'age --decrypt -i cle.txt f.age > x',
      'C:/Users/x/outils/age/age.exe -d f.age',
      'cat f.age | age -i cle.txt -d',
      'age-keygen -o cle.txt',
      'age-keygen -y cle.txt',
    ]) {
      const r = garde(commande)
      expect(r.code, commande).toBe(2)
      expect(r.erreur, commande).toContain('réservé à la personne')
    }
  })

  it('entrée illisible : refusée par précaution', () => {
    const r = spawnSync('bash', [hook], { input: 'pas du json', encoding: 'utf8' })
    expect(r.status).toBe(2)
  })
})

describe('commandes sans geste de production', LENT, () => {
  it('passent', () => {
    for (const commande of [
      'git add scripts/production.sh scripts/export/commun.sh',
      'git diff scripts/production.sh scripts/export/',
      'bash -n scripts/production.sh',
      'export FOO=1 && echo $FOO',
      'npx supabase start',
      'npx supabase db reset',
      'npx supabase test db',
      'age -e -r age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p -o x.age x',
      'npm run lint',
    ]) {
      expect(garde(commande).code, commande).toBe(0)
    }
  })
})
