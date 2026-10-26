// @vitest-environment node
// Export chiffré (T77, docs/conception/export-chiffre.md) : fonctions de scripts/export/commun.sh,
// lancées par bash comme dans scripts/production.sh. Ni base, ni vrai age, ni vrai pg_dump : ceux
// du flux sont simulés. L'essai complet (vraie base locale, vrais outils, restauration) tourne dans
// le job « base » de la CI (scripts/export/essai-restauration.sh).
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Chaque appel lance bash (et souvent node) : jusqu'à 2 secondes sous Windows, bien moins en CI.
const LENT = { timeout: 120_000 }
const racine = process.cwd()
const CLE = 'age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p'
let dossier = ''

const versBash = (chemin: string) => chemin.replaceAll('\\', '/')

function bash(script: string, env: Record<string, string> = {}) {
  const r = spawnSync(
    'bash',
    ['-c', `set -euo pipefail\nsource scripts/export/commun.sh\n${script}`],
    {
      cwd: racine,
      encoding: 'utf8',
      env: { ...process.env, MSYS_NO_PATHCONV: '1', DOSSIER: versBash(dossier), ...env },
    },
  )
  return { code: r.status, sortie: r.stdout, erreur: r.stderr }
}

function executable(nom: string, contenu: string) {
  const chemin = join(dossier, nom)
  writeFileSync(chemin, `#!/usr/bin/env bash\n${contenu}\n`)
  chmodSync(chemin, 0o755)
  return versBash(chemin)
}

beforeEach(() => {
  dossier = mkdtempSync(join(tmpdir(), 'export-commun-'))
})

afterEach(() => {
  rmSync(dossier, { recursive: true, force: true })
})

describe('date de Paris (Git Bash ignore TZ)', LENT, () => {
  it('dimanche 23 h 30 UTC en été : lundi 1 h 30 à Paris', () => {
    expect(bash('export_date_paris 2026-08-02T23:30:00Z').sortie).toBe('2026-08-03-0130\n')
  })
  it('en hiver, une heure de décalage ; la nuit du changement d heure', () => {
    expect(bash('export_date_paris 2026-11-01T23:30:00Z').sortie).toBe('2026-11-02-0030\n')
    expect(bash('export_date_paris 2026-10-25T00:30:00Z').sortie).toBe('2026-10-25-0230\n')
    expect(bash('export_jour_paris 2026-11-01T23:30:00Z').sortie).toBe('2026-11-02\n')
  })
  it('seuil de purge : 28 jours avant le jour de Paris', () => {
    expect(bash('export__date seuil 2026-11-02T09:00:00Z').sortie).toBe('2026-10-05\n')
  })
})

describe('clé publique des exports', LENT, () => {
  it('une seule clé age, commentaires et lignes vides ignorés', () => {
    const r = bash('export_lire_cle "$TEXTE"', { TEXTE: `# commentaire\n\n  ${CLE}  \r\n` })
    expect(r.code).toBe(0)
    expect(r.sortie).toBe(`${CLE}\n`)
  })
  it('la valeur d attente de main est refusée avec un message clair', () => {
    const texte = readFileSync(join(racine, 'scripts/export/destinataires.txt'), 'utf8')
    const r = bash('export_lire_cle "$TEXTE"', { TEXTE: texte })
    expect(r.code).toBe(1)
    expect(r.erreur).toContain("valeur d'attente")
    expect(r.erreur).toContain('G2 à G4')
  })
  it('aucune, deux ou une clé invalide : refusé', () => {
    expect(bash('export_lire_cle "$TEXTE"', { TEXTE: '# rien\n' }).erreur).toContain('trouvé : 0')
    expect(bash('export_lire_cle "$TEXTE"', { TEXTE: `${CLE}\n${CLE}\n` }).erreur).toContain(
      'trouvé : 2',
    )
    expect(bash('export_lire_cle "$TEXTE"', { TEXTE: 'age1abc\n' }).erreur).toContain(
      "n'est pas une clé age valide",
    )
  })
})

const ESSAI_A_BLANC = [
  '#!/usr/bin/env bash',
  'set -euo pipefail',
  '',
  'export PGHOST="aws-0-eu-west-3.pooler.supabase.com"',
  'export PGPORT="5432"',
  'export PGUSER="cli_login_postgres.ugbitornbspatpcowlvg"',
  'export PGPASSWORD="mot\\"secret-42"',
  'export PGDATABASE="postgres"',
  '',
  'pg_dump \\',
  '    --data-only \\',
].join('\n')

describe('identifiants temporaires (essai à blanc de la CLI)', LENT, () => {
  it('lit les cinq lignes, sans rien afficher', () => {
    const r = bash(
      'export_lire_identifiants "$SORTIE"\nprintf "%s|%s|%s|%s|%s" "$ident_hote" "$ident_port" "$ident_utilisateur" "$ident_base" "$ident_mot_de_passe"',
      { SORTIE: ESSAI_A_BLANC },
    )
    expect(r.code).toBe(0)
    expect(r.erreur).toBe('')
    expect(r.sortie).toBe(
      'aws-0-eu-west-3.pooler.supabase.com|5432|cli_login_postgres.ugbitornbspatpcowlvg|postgres|mot"secret-42',
    )
  })
  it('ligne absente ou en double : option B, et rien de la sortie à l écran', () => {
    for (const sortie of [
      ESSAI_A_BLANC.replace(/^export PGPASSWORD.*$/m, ''),
      `${ESSAI_A_BLANC}\nexport PGUSER="autre"`,
      'Docker is not running\nexport PGPASSWORD="mot-secret-42"',
    ]) {
      const r = bash('export_lire_identifiants "$SORTIE"', { SORTIE: sortie })
      expect(r.code).toBe(1)
      expect(r.erreur).toContain('option B nécessaire')
      expect(r.erreur + r.sortie).not.toContain('secret')
    }
  })
})

describe('outils', LENT, () => {
  it('cherche d abord les binaires portables, puis le PATH', () => {
    executable('pgsql-bin-fictif', 'true')
    writeFileSync(join(dossier, 'age.exe'), '')
    const r = bash(
      'mkdir -p "$DOSSIER/outils/age" && cp "$DOSSIER/age.exe" "$DOSSIER/outils/age/age.exe"\nEXPORT_OUTILS="$DOSSIER/outils" export_trouver_outil age',
    )
    expect(r.sortie.trim()).toBe(`${versBash(dossier)}/outils/age/age.exe`)
    const absent = bash(
      'EXPORT_OUTILS="$DOSSIER/outils" export_trouver_outil outil-qui-n-existe-pas',
    )
    expect(absent.code).toBe(1)
    expect(absent.erreur).toContain('outil absent')
  })
  it('pg_dump de la majeure de la base exactement', () => {
    const pgDump = executable('pg_dump', 'echo "pg_dump (PostgreSQL) 17.11"')
    expect(bash(`export_verifier_pg_dump "${pgDump}" 17`).sortie).toBe(
      'pg_dump (PostgreSQL) 17.11\n',
    )
    const r = bash(`export_verifier_pg_dump "${pgDump}" 18`)
    expect(r.code).toBe(1)
    expect(r.erreur).toContain('pg_dump 17 alors que la base est en PostgreSQL 18')
  })
  it('age 1.x', () => {
    expect(bash(`export_verifier_age "${executable('age', 'echo v1.3.2')}"`).sortie).toBe(
      'age v1.3.2\n',
    )
    expect(bash(`export_verifier_age "${executable('age0', 'echo v0.9.0')}"`).code).toBe(1)
  })
  it('majeure de la base : fichier de la CLI, sinon config.toml', () => {
    expect(bash('export_majeure_base .').sortie).toBe('17\n')
    bash(
      'mkdir -p "$DOSSIER/supabase/.temp" && echo 18.1.0.010 > "$DOSSIER/supabase/.temp/postgres-version"',
    )
    expect(bash('export_majeure_base "$DOSSIER"').sortie).toBe('18\n')
  })
})

describe('flux pg_dump vers age (outils simulés)', LENT, () => {
  const pgDumpBon = [
    'for t in a b c; do echo "pg_dump: dumping contents of table \\"public.$t\\"" >&2; done',
    'head -c 20000 /dev/urandom',
  ].join('\n')
  const ageSimule = [
    'sortie=""',
    'while [ $# -gt 0 ]; do case $1 in -o) sortie=$2; shift 2 ;; -r) shift 2 ;; *) shift ;; esac; done',
    '{ printf \'age-encryption.org/v1\\n\'; cat; } > "$sortie"',
  ].join('\n')

  it('garde le seul fichier chiffré, compte les tables, ne montre rien', () => {
    const pgDump = executable('pg_dump', pgDumpBon)
    const age = executable('age', ageSimule)
    const r = bash(
      `export_lire_identifiants "$SORTIE"\nexport_flux "$DOSSIER" ejp-2026-11-02-0910.dump.age "${CLE}" "${pgDump}" "${age}"\necho "$EXPORT_TABLES $EXPORT_TAILLE \${#EXPORT_SHA256}"`,
      { SORTIE: ESSAI_A_BLANC },
    )
    expect(r.erreur).toBe('')
    expect(r.code).toBe(0)
    expect(r.sortie).toBe('3 20022 64\n')
    expect(readdirSync(dossier).filter((f) => f.startsWith('ejp-'))).toEqual([
      'ejp-2026-11-02-0910.dump.age',
    ])
  })

  it('export interrompu : aucun fichier gardé, erreurs filtrées, mot de passe masqué', () => {
    const pgDump = executable(
      'pg_dump',
      [
        'echo "pg_dump: error: connection failed: FATAL: password authentication failed PGPASSWORD=$PGPASSWORD" >&2',
        'echo "pg_dump: detail: postgresql://u:$PGPASSWORD@hote/base" >&2',
        'head -c 5000 /dev/urandom',
        'exit 1',
      ].join('\n'),
    )
    const age = executable('age', ageSimule)
    const r = bash(
      `export_lire_identifiants "$SORTIE"\nexport_flux "$DOSSIER" ejp-2026-11-02-0910.dump.age "${CLE}" "${pgDump}" "${age}"`,
      { SORTIE: ESSAI_A_BLANC },
    )
    expect(r.code).toBe(1)
    expect(r.erreur).toContain('export incomplet, aucun fichier gardé')
    expect(r.erreur).toContain('password authentication failed')
    expect(r.erreur + r.sortie).not.toContain('secret')
    expect(readdirSync(dossier).filter((f) => f.startsWith('ejp-'))).toEqual([])
  })

  it('export trop petit : refusé, aucun fichier gardé', () => {
    const pgDump = executable(
      'pg_dump',
      'echo "pg_dump: dumping contents of table \\"public.a\\"" >&2; echo petit',
    )
    const age = executable('age', ageSimule)
    const r = bash(
      `export_lire_identifiants "$SORTIE"\nexport_flux "$DOSSIER" ejp-2026-11-02-0910.dump.age "${CLE}" "${pgDump}" "${age}"`,
      { SORTIE: ESSAI_A_BLANC },
    )
    expect(r.code).toBe(1)
    expect(r.erreur).toContain('export trop petit')
    expect(readdirSync(dossier).filter((f) => f.startsWith('ejp-'))).toEqual([])
  })
})

describe('purge et export du jour', LENT, () => {
  function fichiers(noms: string[]) {
    for (const nom of noms) writeFileSync(join(dossier, nom), 'x')
  }

  it('supprime ce qui a plus de 28 jours et sa fiche, garde le reste', () => {
    fichiers([
      'ejp-2026-10-01-0900.dump.age',
      'ejp-2026-10-01-0900.json',
      'ejp-2026-10-05-0900.dump.age',
      'ejp-2026-11-02-0910.dump.age',
      'ejp-2026-09-01-0900.dump.age.partiel',
      'autre.txt',
    ])
    const r = bash(
      'export_purger "$DOSSIER" 2026-11-02T09:00:00Z\necho "$EXPORT_SUPPRIMES $EXPORT_GARDES"',
    )
    expect(r.sortie).toBe('1 2\n')
    expect(readdirSync(dossier).sort()).toEqual([
      'autre.txt',
      'ejp-2026-09-01-0900.dump.age.partiel',
      'ejp-2026-10-05-0900.dump.age',
      'ejp-2026-11-02-0910.dump.age',
    ])
  })

  it('ne supprime jamais le plus récent, même vieux', () => {
    fichiers(['ejp-2026-01-01-0900.dump.age', 'ejp-2026-02-01-0900.dump.age'])
    expect(
      bash('export_purger "$DOSSIER" 2026-11-02T09:00:00Z\necho "$EXPORT_SUPPRIMES $EXPORT_GARDES"')
        .sortie,
    ).toBe('1 1\n')
    expect(readdirSync(dossier)).toEqual(['ejp-2026-02-01-0900.dump.age'])
  })

  it('les restes .partiel s effacent, rien d autre', () => {
    fichiers(['ejp-2026-11-02-0910.dump.age.partiel', 'ejp-2026-11-02-0800.dump.age'])
    bash('export_nettoyer_partiels "$DOSSIER"')
    expect(readdirSync(dossier)).toEqual(['ejp-2026-11-02-0800.dump.age'])
  })

  it('migrer : un export complet du jour de Paris, ni partiel, ni vide, ni de la veille', () => {
    const existe = (instant: string) =>
      bash(`if export_existe_aujourdhui "$DOSSIER" ${instant}; then echo oui; else echo non; fi`)
        .sortie
    fichiers(['ejp-2026-11-02-0005.dump.age.partiel'])
    writeFileSync(join(dossier, 'ejp-2026-11-01-2330.dump.age'), 'x')
    writeFileSync(join(dossier, 'ejp-2026-11-02-0010.dump.age'), '')
    expect(existe('2026-11-02T08:00:00Z')).toBe('non\n')
    writeFileSync(join(dossier, 'ejp-2026-11-02-0910.dump.age'), 'x')
    expect(existe('2026-11-02T08:00:00Z')).toBe('oui\n')
    expect(existe('2026-11-01T22:30:00Z')).toBe('oui\n')
    expect(existe('2026-11-03T08:00:00Z')).toBe('non\n')
  })
})

describe('fiche, dernière migration, résumé', LENT, () => {
  it('dernière migration : la plus grande version de la colonne Remote', () => {
    const liste = [
      '  ',
      '   Local          | Remote         | Time (UTC)',
      '  ----------------|----------------|---------------------',
      '   20261010100000 | 20261010100000 | 2026-10-10 10:00:00',
      '   20261026084227 | 20261026084227 | 2026-10-26 08:42:27',
      '   20261027090000 |                | 20261027090000',
    ].join('\n')
    expect(bash('export_derniere_migration "$LISTE"', { LISTE: liste }).sortie).toBe(
      '20261026084227\n',
    )
    expect(bash('export_derniere_migration ""').sortie).toBe('inconnue\n')
    const tableau = [
      'Connecting to local database...',
      '  Local          │ Remote         │ Time (UTC)',
      '  ───────────────┼────────────────┼────────────────────',
      '  20261010100000 │ 20261010100000 │ 2026-10-10 10:00:00',
      '  20261026084227 │ 20261026084227 │ 2026-10-26 08:42:27',
    ].join('\n')
    expect(bash('export_derniere_migration "$LISTE"', { LISTE: tableau }).sortie).toBe(
      '20261026084227\n',
    )
    // Forme relevée dans la CI le 26 octobre 2026 (CLI 2.122, migration list --local).
    const cli = [
      'Connecting to local database...',
      '',
      '  ',
      '   Local            | Remote           | Time (UTC)            ',
      '  ------------------|------------------|-----------------------',
      '   `20261013100000` | `20261013100000` | `2026-10-13 10:00:00` ',
      '   `20261013110000` | `20261013110000` | `2026-10-13 11:00:00` ',
      '   `20261027090000` |                  | `20261027090000`      ',
    ].join('\n')
    expect(bash('export_derniere_migration "$LISTE"', { LISTE: cli }).sortie).toBe(
      '20261013110000\n',
    )
  })

  it('fiche sans donnée, résumé de sept lignes autorisées', () => {
    const r = bash(
      [
        'EXPORT_TAILLE=123456 EXPORT_SHA256=$(printf "a%.0s" {1..64}) EXPORT_TABLES=61',
        'EXPORT_GARDES=4 EXPORT_SUPPRIMES=1',
        `export_ecrire_fiche "$DOSSIER" ejp-2026-11-02-0910.dump.age "${CLE}" 2e3aabf 20261026084227 "pg_dump (PostgreSQL) 17.11" "age v1.3.2" 2.122.0`,
        `export_resume ejp-2026-11-02-0910.dump.age "${CLE}" 20261026084227 > "$DOSSIER/resume.txt"`,
        'cat "$DOSSIER/resume.txt"',
        'export_verifier_resume < "$DOSSIER/resume.txt"',
      ].join('\n'),
    )
    expect(r.erreur).toBe('')
    expect(r.code).toBe(0)
    expect(r.sortie.split('\n')).toEqual([
      'Export chiffré : ejp-2026-11-02-0910.dump.age',
      'Taille : 123456 octets (121 Kio)',
      `Empreinte SHA-256 : ${'a'.repeat(64)}`,
      'Sommaire : 61 tables exportées',
      'Clé : age1ql3z7h...mcac8p',
      'Dernière migration en production : 20261026084227',
      'Exports gardés : 4 (1 supprimé(s), plus vieux que 28 jours)',
      '',
    ])
    const fiche: unknown = JSON.parse(
      readFileSync(join(dossier, 'ejp-2026-11-02-0910.json'), 'utf8'),
    )
    expect(fiche).toMatchObject({
      fichier: 'ejp-2026-11-02-0910.dump.age',
      horodatage_paris: '2026-11-02-0910',
      taille_octets: 123456,
      tables: 61,
      cle_publique: CLE,
      commit_main: '2e3aabf',
      derniere_migration: '20261026084227',
    })
  })

  it('un résumé avec une ligne de plus ou modifiée est refusé', () => {
    const lignes = [
      'Export chiffré : ejp-2026-11-02-0910.dump.age',
      'Taille : 1 octets (1 Kio)',
      `Empreinte SHA-256 : ${'a'.repeat(64)}`,
      'Sommaire : 1 tables exportées',
      'Clé : age1ql3z7h...mcac8p',
      'Dernière migration en production : inconnue',
      'Exports gardés : 1 (0 supprimé(s), plus vieux que 28 jours)',
    ]
    expect(bash('export_verifier_resume <<< "$R"', { R: lignes.join('\n') }).code).toBe(0)
    expect(
      bash('export_verifier_resume <<< "$R"', { R: [...lignes, 'compte : 12'].join('\n') }).code,
    ).toBe(1)
    const modifiees = [...lignes]
    modifiees[3] = 'Sommaire : 1 tables exportées (public.compte : 12 lignes)'
    expect(bash('export_verifier_resume <<< "$R"', { R: modifiees.join('\n') }).code).toBe(1)
  })
})
