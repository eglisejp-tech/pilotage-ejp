// @vitest-environment node
// Hook .claude/hooks/garde-production.sh (docs/exploitation.md, 7.3 bis ; T79) : les gestes de
// production de Claude passent par les seules formes exactes du script, et seulement si le script
// et ses fonctions sont, octet pour octet, ceux de main sur l'adresse officielle ; le hook lance
// alors une copie extraite de ce SHA. Déchiffrer un export ou créer une paire de clés age est
// refusé. Le hook est lancé par bash, comme Claude Code le fait, depuis une copie où l'adresse
// officielle est remplacée par un dépôt nu local (aucun réseau).
import { spawnSync } from 'node:child_process'
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Chaque appel lance bash, node et git : 1 à 2 secondes sous Windows, bien moins en CI.
const LENT = { timeout: 180_000 }
const racine = process.cwd()
const OFFICIEL = 'https://github.com/eglisejp-tech/pilotage-ejp.git'
const versBash = (chemin: string) => chemin.replaceAll('\\', '/')
// Adresse file:// telle que git la lit (sans encoder ~ : GRACEM~1 sous Windows).
const versUrl = (chemin: string) =>
  `file://${versBash(chemin).startsWith('/') ? '' : '/'}${versBash(chemin)}`
let temp = ''
let depot = ''
let horsDepot = ''
let officiel = ''
let crochets = ''
let crochetsInjoignable = ''
let shaMain = ''

function git(dossier: string, args: string[]) {
  const r = spawnSync(
    'git',
    [
      '-C',
      dossier,
      '-c',
      'user.name=essai',
      '-c',
      'user.email=essai@exemple.test',
      '-c',
      'commit.gpgsign=false',
      ...args,
    ],
    { encoding: 'utf8' },
  )
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} : ${r.stderr}`)
  return r.stdout.trim()
}

// Copie du hook dont l'adresse officielle est remplacée par $adresse.
function copieDuHook(dossier: string, adresse: string) {
  mkdirSync(dossier, { recursive: true })
  cpSync(join(racine, '.claude/hooks/garde-production.sh'), join(dossier, 'garde-production.sh'))
  const source = readFileSync(join(racine, '.claude/hooks/garde-production.mjs'), 'utf8')
  writeFileSync(join(dossier, 'garde-production.mjs'), source.replaceAll(OFFICIEL, adresse))
  return versBash(join(dossier, 'garde-production.sh'))
}

function garde(commande: string, cwd = depot, hook = crochets) {
  const r = spawnSync('bash', [hook], {
    input: JSON.stringify({ tool_input: { command: commande, description: 'essai' }, cwd }),
    encoding: 'utf8',
  })
  return { code: r.status, sortie: r.stdout, erreur: r.stderr }
}

type Decision = {
  hookSpecificOutput: {
    permissionDecision: string
    permissionDecisionReason: string
    updatedInput: { command: string; description: string }
  }
}
const COMMANDE_COPIE =
  /^\/usr\/bin\/bash --noprofile --norc '([^']+)\/scripts\/production\.sh' (.+)$/

function decision(commande: string) {
  const r = garde(commande)
  expect(r.code, `${commande} : ${r.erreur}`).toBe(0)
  const d = (JSON.parse(r.sortie) as Decision).hookSpecificOutput
  const m = COMMANDE_COPIE.exec(d.updatedInput.command)
  expect(m, d.updatedInput.command).not.toBeNull()
  const copie = m?.[1] ?? ''
  rmSync(copie, { recursive: true, force: true })
  return { ...d, copie, action: m?.[2] ?? '' }
}

function refuse(commande: string, extrait = 'diffère de main') {
  const r = garde(commande)
  expect(r.code, commande).toBe(2)
  expect(r.erreur, commande).toContain(extrait)
  expect(r.sortie, commande).toBe('')
}

beforeAll(() => {
  temp = mkdtempSync(join(tmpdir(), 'garde-production-'))
  depot = join(temp, 'depot')
  horsDepot = join(temp, 'hors-depot')
  officiel = join(temp, 'officiel.git')
  mkdirSync(join(depot, 'scripts'), { recursive: true })
  mkdirSync(horsDepot)
  cpSync(join(racine, 'scripts/production.sh'), join(depot, 'scripts/production.sh'))
  cpSync(join(racine, 'scripts/export'), join(depot, 'scripts/export'), { recursive: true })
  writeFileSync(join(depot, 'LISEZMOI.txt'), 'essai\n')
  // Comme le dépôt : LF partout, même avec core.autocrlf (git reset --hard sous Windows).
  cpSync(join(racine, '.gitattributes'), join(depot, '.gitattributes'))
  git(temp, ['init', '-q', '--bare', officiel])
  git(depot, ['init', '-q'])
  git(depot, ['add', '.'])
  git(depot, ['commit', '-q', '--no-verify', '-m', 'essai'])
  git(depot, ['push', '-q', officiel, 'HEAD:refs/heads/main'])
  shaMain = git(depot, ['rev-parse', 'HEAD'])
  crochets = copieDuHook(join(temp, 'crochets'), versUrl(officiel))
  crochetsInjoignable = copieDuHook(
    join(temp, 'crochets-injoignable'),
    versUrl(join(temp, 'absent.git')),
  )
}, 60_000)

afterAll(() => {
  rmSync(temp, { recursive: true, force: true })
})

describe('adresse officielle', () => {
  it('le hook et le script lisent main sur la même adresse fixe', () => {
    const hook = readFileSync(join(racine, '.claude/hooks/garde-production.mjs'), 'utf8')
    expect(hook.split(OFFICIEL).length - 1).toBe(1)
    expect(readFileSync(join(racine, 'scripts/production.sh'), 'utf8')).toContain(
      `DEPOT_OFFICIEL="${OFFICIEL}"`,
    )
  })
})

describe('formes acceptées : la copie de main est lancée à la place', LENT, () => {
  it('export : copie extraite du SHA de main, fichiers identiques, champs gardés', () => {
    const r = garde('bash scripts/production.sh export')
    expect(r.code, r.erreur).toBe(0)
    const d = (JSON.parse(r.sortie) as Decision).hookSpecificOutput
    expect(d.permissionDecision).toBe('allow')
    expect(d.updatedInput.description).toBe('essai')
    const m = COMMANDE_COPIE.exec(d.updatedInput.command)
    expect(m).not.toBeNull()
    const copie = m?.[1] ?? ''
    try {
      expect(m?.[2] ?? '').toBe('export')
      expect(copie.startsWith(versBash(tmpdir()))).toBe(true)
      expect(readFileSync(join(copie, 'COPIE-DE-MAIN'), 'utf8')).toBe(`${shaMain}\n`)
      expect(readFileSync(join(copie, 'scripts/production.sh'))).toEqual(
        readFileSync(join(racine, 'scripts/production.sh')),
      )
      const exportes = readdirSync(join(racine, 'scripts/export')).sort()
      expect(readdirSync(join(copie, 'scripts/export')).sort()).toEqual(exportes)
      for (const nom of exportes) {
        expect(readFileSync(join(copie, 'scripts/export', nom))).toEqual(
          readFileSync(join(racine, 'scripts/export', nom)),
        )
      }
      expect(existsSync(join(copie, 'LISEZMOI.txt'))).toBe(false)
    } finally {
      rmSync(copie, { recursive: true, force: true })
    }
  })

  it('etat, revenir et preparer passent sans confirmation ; chaque appel a sa copie', () => {
    const formes: [string, string][] = [
      ['bash scripts/production.sh etat', 'etat'],
      ['bash scripts/production.sh revenir', 'revenir'],
      ['bash scripts/production.sh preparer main', 'preparer main'],
      [
        '  bash scripts/production.sh preparer etape-8-export-chiffre  ',
        'preparer etape-8-export-chiffre',
      ],
    ]
    for (const [commande, action] of formes) {
      const d = decision(commande)
      expect(d.permissionDecision, commande).toBe('allow')
      expect(d.action, commande).toBe(action)
    }
  })

  it('migrer et fonction demandent la confirmation de la personne, copie de main citée', () => {
    for (const commande of [
      'bash scripts/production.sh migrer',
      'bash scripts/production.sh fonction creer-compte',
    ]) {
      const d = decision(commande)
      expect(d.permissionDecision, commande).toBe('ask')
      expect(d.permissionDecisionReason, commande).toContain(
        `copie de main ${shaMain.slice(0, 12)}`,
      )
    }
  })

  it('bash -n sur un script de scripts/ passe (contrôle de syntaxe)', () => {
    for (const commande of ['bash -n scripts/production.sh', 'bash -n scripts/export/commun.sh']) {
      const r = garde(commande)
      expect(r.code, commande).toBe(0)
      expect(r.sortie, commande).toBe('')
    }
  })
})

describe('script différent de main sur l adresse officielle', LENT, () => {
  const commun = () => join(depot, 'scripts/export/commun.sh')
  const original = () => readFileSync(join(racine, 'scripts/export/commun.sh'))

  it('une fonction modifiée dans scripts/export/ bloque toutes les formes', () => {
    appendFileSync(commun(), '\n# modifié\n')
    try {
      refuse('bash scripts/production.sh export')
      refuse('bash scripts/production.sh etat')
    } finally {
      writeFileSync(commun(), original())
    }
  })

  it('assume-unchanged ou skip-worktree ne cachent pas une modification', () => {
    for (const option of ['assume-unchanged', 'skip-worktree']) {
      appendFileSync(commun(), '\n# modifié\n')
      git(depot, ['update-index', `--${option}`, 'scripts/export/commun.sh'])
      try {
        refuse('bash scripts/production.sh export')
      } finally {
        git(depot, ['update-index', `--no-${option}`, 'scripts/export/commun.sh'])
        writeFileSync(commun(), original())
      }
    }
  })

  it('un filtre clean qui efface l ajout ne le cache pas', () => {
    writeFileSync(join(depot, '.git/info/attributes'), 'scripts/export/commun.sh filter=essai\n')
    git(depot, ['config', 'filter.essai.clean', 'sed -e /ajout-essai/d'])
    appendFileSync(commun(), '\n# ajout-essai\n')
    try {
      refuse('bash scripts/production.sh export')
    } finally {
      writeFileSync(commun(), original())
      rmSync(join(depot, '.git/info/attributes'))
      git(depot, ['config', '--unset', 'filter.essai.clean'])
    }
  })

  it('un origin/main local déplacé (update-ref) ne remplace pas main officiel', () => {
    appendFileSync(commun(), '\n# modifié\n')
    git(depot, ['commit', '-q', '--no-verify', '-am', 'modifié'])
    git(depot, ['update-ref', 'refs/remotes/origin/main', 'HEAD'])
    try {
      refuse('bash scripts/production.sh export')
    } finally {
      git(depot, ['reset', '-q', '--hard', shaMain])
      git(depot, ['update-ref', '-d', 'refs/remotes/origin/main'])
    }
  })

  it('un fichier en plus dans scripts/export/, suivi ou ignoré, bloque', () => {
    writeFileSync(join(depot, '.git/info/exclude'), '*.local\n')
    for (const nom of ['autre.sh', 'ignore.local']) {
      writeFileSync(join(depot, 'scripts/export', nom), 'echo autre\n')
      try {
        refuse('bash scripts/production.sh export', 'fichier en trop')
      } finally {
        rmSync(join(depot, 'scripts/export', nom))
      }
    }
  })

  it('un script production.sh modifié bloque migrer', () => {
    const chemin = join(depot, 'scripts/production.sh')
    appendFileSync(chemin, '\n# modifié\n')
    try {
      refuse('bash scripts/production.sh migrer')
    } finally {
      writeFileSync(chemin, readFileSync(join(racine, 'scripts/production.sh')))
    }
  })

  it('main officiel plus récent que le dossier : git fetch demandé', () => {
    const autre = join(temp, 'autre')
    git(temp, ['clone', '-q', '-b', 'main', officiel, autre])
    writeFileSync(join(autre, 'LISEZMOI.txt'), 'suite\n')
    git(autre, ['commit', '-q', '--no-verify', '-am', 'suite'])
    git(autre, ['push', '-q', 'origin', 'HEAD:refs/heads/main'])
    try {
      refuse('bash scripts/production.sh export', 'git fetch origin')
    } finally {
      git(autre, ['push', '-q', '--force', 'origin', `${shaMain}:refs/heads/main`])
    }
    expect(decision('bash scripts/production.sh export').permissionDecision).toBe('allow')
  })

  it('hors d un dépôt, ou main officiel injoignable : refusé', () => {
    expect(garde('bash scripts/production.sh export', horsDepot).code).toBe(2)
    const r = garde('bash scripts/production.sh export', depot, crochetsInjoignable)
    expect(r.code).toBe(2)
    expect(r.erreur).toContain('impossible de lire main')
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

  it('écritures découpées : guillemets, barre oblique inverse, variable, motif, copie', () => {
    for (const commande of [
      "bash scripts/production.sh 'export'",
      'bash scripts/produ"ction".sh export',
      'bash scripts/production\\.sh export',
      'bash scripts\\production.sh migrer',
      'bash scripts/prod*.sh export',
      'bash scripts/p?oduction.sh etat',
      'f=scripts/production.sh; bash $f export',
      'cd scripts && bash prod*.sh export',
      'cp scripts/production.sh /tmp/p.sh',
      'cp -r scripts /tmp/s',
      'cat scripts/production.sh > /tmp/p.sh',
      'cat scripts/production.sh | tee /tmp/p.sh',
      'bash /tmp/p.sh export',
      '/tmp/p.sh migrer',
      'cat /tmp/p.sh | bash -s fonction creer-compte',
      'source scripts/export/commun.sh',
      '. scripts/export/commun.sh && export_flux a b c d e',
      'env bash scripts/production.sh export',
      'env FOO=1 bash scripts/export/restaurer.sh a b',
      'sh -c "bash scripts/production.sh export"',
      'BASH scripts/production.sh export',
      'exec bash scripts/production.sh revenir',
    ]) {
      const r = garde(commande)
      expect(r.code, commande).toBe(2)
      expect(r.erreur, commande).toContain('production.sh <action>')
    }
  })

  it('déchiffrer un export ou créer une paire de clés age, même écrit autrement', () => {
    for (const commande of [
      'age -d -i cle.txt ejp-2026-11-02-0910.dump.age',
      'age --decrypt -i cle.txt f.age > x',
      'C:/Users/x/outils/age/age.exe -d f.age',
      'cat f.age | age -i cle.txt -d',
      'age-keygen -o cle.txt',
      'age-keygen -y cle.txt',
      '"age" -d -i k f.age',
      'a\\ge -d -i k f.age',
      'C:\\Users\\x\\outils\\age\\age.exe -d f.age',
      'AGE.EXE -decrypt -i k f.age',
      'age --decrypt=true -i k f.age',
      'C:/outils/age/ag?.exe -d f.age',
      'A=age; $A -d -i k f.age',
      'bash -c "age -d -i k f.age"',
      'env age -d f.age',
      '"age-keygen" -o k',
      'C:/outils/age/age-k*.exe -o k',
    ]) {
      const r = garde(commande)
      expect(r.code, commande).toBe(2)
      expect(r.erreur, commande).toContain('réservé à la personne')
    }
  })

  it('appels distants de la CLI écrits autrement', () => {
    for (const commande of [
      'npx "supabase" db push',
      'npx supa\\base link',
      'node_modules/.bin/supa* db push',
      'npx supabase@2.122.0 db push',
      '"C:\\x\\supabase.exe" functions deploy f',
      'S=supabase; npx $S db dump',
      'bash -c "npx supabase secrets list"',
    ]) {
      expect(garde(commande).code, commande).toBe(2)
    }
  })

  it('entrée illisible : refusée par précaution', () => {
    const r = spawnSync('bash', [crochets], { input: 'pas du json', encoding: 'utf8' })
    expect(r.status).toBe(2)
  })
})

describe('commandes sans geste de production', LENT, () => {
  it('passent', () => {
    for (const commande of [
      'git add scripts/production.sh scripts/export/commun.sh',
      'git diff scripts/production.sh scripts/export/',
      'git log --oneline -- scripts/export',
      'cat scripts/export/commun.sh',
      'export FOO=1 && echo $FOO',
      'npx supabase start',
      'npx supabase db reset',
      'npx supabase test db',
      'npx supabase migration new nom',
      'age -e -r age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p -o x.age x',
      'npm run lint',
      'npx vitest run src/test/gardeProduction.node.test.ts',
      'node scripts/verifier-textes.mjs',
      'ls -d */',
      'git branch -d etape-essai',
      'git diff --stat 2>&1 | head',
    ]) {
      const r = garde(commande)
      expect(r.code, `${commande} : ${r.erreur}`).toBe(0)
      expect(r.sortie, commande).toBe('')
    }
  })
})
