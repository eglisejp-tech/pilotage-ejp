// @vitest-environment node
// Export chiffré (T79, docs/conception/export-chiffre.md) : fonctions de scripts/export/commun.sh,
// lancées par bash comme dans scripts/production.sh. Ni base, ni vrai age, ni vrai pg_dump : ceux
// du flux sont simulés. L'essai complet (vraie base locale, vrais outils, restauration) tourne dans
// le job « base » de la CI (scripts/export/essai-restauration.sh).
import { spawnSync } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// Chaque appel lance bash (et souvent node) : jusqu'à 2 secondes sous Windows, bien moins en CI.
const LENT = { timeout: 120_000 }
const racine = process.cwd()
const CLE = 'age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p'
const OUTILS_DU_POSTE = 'C:/Users/GraceManassePASSIDEM/outils'
let dossier = ''

const versBash = (chemin: string) => chemin.replaceAll('\\', '/')
const sha256 = (contenu: Buffer | string) => createHash('sha256').update(contenu).digest('hex')

function bash(script: string, env: Record<string, string | undefined> = {}) {
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

// Outil simulé. Chemin absolu de bash : pg_dump est lancé sans PATH (environnement vidé).
function executable(nom: string, contenu: string) {
  const chemin = join(dossier, nom)
  writeFileSync(chemin, `#!/bin/bash\n${contenu}\n`)
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
  it('la valeur d attente est refusée avec un message clair', () => {
    const r = bash('export_lire_cle "$TEXTE"', {
      TEXTE: '# commentaire\nen-attente-de-la-cle-publique\n',
    })
    expect(r.code).toBe(1)
    expect(r.erreur).toContain("valeur d'attente")
    expect(r.erreur).toContain('G2 à G4')
  })
  it('le fichier de main porte une seule clé age valide', () => {
    const texte = readFileSync(join(racine, 'scripts/export/destinataires.txt'), 'utf8')
    const r = bash('export_lire_cle "$TEXTE"', { TEXTE: texte })
    expect(r.code).toBe(0)
    expect(r.sortie).toMatch(/^age1[a-z0-9]{58}\n$/)
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
    '/usr/bin/head -c 20000 /dev/urandom',
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
      { SORTIE: ESSAI_A_BLANC, EXPORT_SSLMODE: 'require' },
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
        '/usr/bin/head -c 5000 /dev/urandom',
        'exit 1',
      ].join('\n'),
    )
    const age = executable('age', ageSimule)
    const r = bash(
      `export_lire_identifiants "$SORTIE"\nexport_flux "$DOSSIER" ejp-2026-11-02-0910.dump.age "${CLE}" "${pgDump}" "${age}"`,
      { SORTIE: ESSAI_A_BLANC, EXPORT_SSLMODE: 'require' },
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
      { SORTIE: ESSAI_A_BLANC, EXPORT_SSLMODE: 'require' },
    )
    expect(r.code).toBe(1)
    expect(r.erreur).toContain('export trop petit')
    expect(readdirSync(dossier).filter((f) => f.startsWith('ejp-'))).toEqual([])
  })

  // pg_dump simulé sans PATH (environnement vidé) : chemins absolus, et liste de ce qu'il reçoit.
  function pgDumpTemoin(liste: string, avant = '') {
    const chemin = join(dossier, 'pg_dump-temoin')
    writeFileSync(
      chemin,
      [
        '#!/bin/bash',
        avant,
        `for n in $(compgen -e); do printf '%s=%s\\n' "$n" "\${!n}"; done > "${versBash(liste)}"`,
        'for t in a b c; do echo "pg_dump: dumping contents of table \\"public.$t\\"" >&2; done',
        '/usr/bin/head -c 20000 /dev/urandom',
      ].join('\n'),
    )
    chmodSync(chemin, 0o755)
    return versBash(chemin)
  }

  it('pg_dump ne reçoit que les PG* utiles : rien d hérité (PGSERVICE, PGHOSTADDR...)', () => {
    const liste = join(dossier, 'env.txt')
    const ca = join(dossier, 'ca.crt')
    writeFileSync(ca, '-----BEGIN CERTIFICATE-----\nAA==\n-----END CERTIFICATE-----\n')
    const r = bash(
      `export_lire_identifiants "$SORTIE"\nEXPORT_SSLMODE=verify-full EXPORT_SSLROOTCERT="$DOSSIER/ca.crt"\nexport_flux "$DOSSIER" ejp-2026-11-02-0910.dump.age "${CLE}" "${pgDumpTemoin(liste)}" "${executable('age', ageSimule)}"`,
      {
        SORTIE: ESSAI_A_BLANC,
        PGHOSTADDR: '192.0.2.1',
        PGSERVICE: 'autre',
        PGSSLMODE: 'disable',
        PGPASSFILE: '/autre/pgpass',
        PGSYSCONFDIR: '/autre',
        EXPORT_PG_BIN: '/autre/bin',
        CLAUDECODE: '1',
      },
    )
    expect(r.erreur).toBe('')
    expect(r.code).toBe(0)
    const recu = Object.fromEntries(
      readFileSync(liste, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
    )
    expect(recu).toMatchObject({
      PGHOST: 'aws-0-eu-west-3.pooler.supabase.com',
      PGUSER: 'cli_login_postgres.ugbitornbspatpcowlvg',
      PGSSLMODE: 'verify-full',
      PGSSLROOTCERT: versBash(ca),
      LC_ALL: 'C',
    })
    for (const nom of ['PGHOSTADDR', 'PGSERVICE', 'PGPASSFILE', 'PGSYSCONFDIR', 'EXPORT_PG_BIN'])
      expect(recu, nom).not.toHaveProperty(nom)
    for (const nom of ['CLAUDECODE', 'PATH', 'HOME', 'SORTIE', 'DOSSIER'])
      expect(recu, nom).not.toHaveProperty(nom)
  })

  it('mode TLS obligatoire ; certificat présent : seul verify-full', () => {
    const lancer = (avant: string) =>
      bash(
        `export_lire_identifiants "$SORTIE"\n${avant}\nexport_flux "$DOSSIER" ejp-2026-11-02-0910.dump.age "${CLE}" "${pgDumpTemoin(join(dossier, 'env.txt'))}" "${executable('age', ageSimule)}"`,
        { SORTIE: ESSAI_A_BLANC, EXPORT_SSLMODE: undefined },
      )
    expect(lancer('').erreur).toContain('mode TLS de la connexion non fixé')
    writeFileSync(join(dossier, 'ca.crt'), 'x')
    expect(lancer('EXPORT_SSLMODE=require EXPORT_SSLROOTCERT="$DOSSIER/ca.crt"').erreur).toContain(
      'seul verify-full est accepté',
    )
    expect(lancer('EXPORT_SSLMODE=verify-full').erreur).toContain('verify-full sans certificat')
    expect(readdirSync(dossier).filter((f) => f.startsWith('ejp-'))).toEqual([])
  })

  it('le journal de pg_dump reste dans le dossier des exports, jamais dans le dossier temporaire', () => {
    const temporaire = mkdtempSync(join(tmpdir(), 'export-temporaire-'))
    const vu = join(dossier, 'vu.txt')
    try {
      const pgDump = pgDumpTemoin(
        join(dossier, 'env.txt'),
        `/usr/bin/ls -A "${versBash(dossier)}" > "${versBash(vu)}"`,
      )
      const r = bash(
        `export_lire_identifiants "$SORTIE"\nexport_flux "$DOSSIER" ejp-2026-11-02-0910.dump.age "${CLE}" "${pgDump}" "${executable('age', ageSimule)}"`,
        {
          SORTIE: ESSAI_A_BLANC,
          EXPORT_SSLMODE: 'require',
          TMPDIR: versBash(temporaire),
          TMP: temporaire,
          TEMP: temporaire,
        },
      )
      expect(r.code, r.erreur).toBe(0)
      expect(readFileSync(vu, 'utf8')).toContain('ejp-2026-11-02-0910.dump.age.journal')
      expect(readdirSync(temporaire)).toEqual([])
      expect(readdirSync(dossier).filter((f) => f.endsWith('.journal'))).toEqual([])
    } finally {
      rmSync(temporaire, { recursive: true, force: true })
    }
  })
})

describe('mode TLS de pg_dump en production', LENT, () => {
  const mode = () =>
    bash('export_mode_ssl "$DOSSIER/ca.crt"\necho "$EXPORT_SSLMODE|$EXPORT_SSLROOTCERT"')
  it('certificat absent : require, annoncé', () => {
    const r = mode()
    expect(r.code).toBe(0)
    expect(r.sortie).toContain('require')
    expect(r.sortie).toContain('geste G7')
    expect(r.sortie.trim().split('\n').pop()).toBe('require|')
  })
  it('certificat présent : verify-full, sans repli si le fichier est illisible', () => {
    writeFileSync(
      join(dossier, 'ca.crt'),
      '-----BEGIN CERTIFICATE-----\nAA==\n-----END CERTIFICATE-----\n',
    )
    expect(mode().sortie.trim().split('\n').pop()).toBe(`verify-full|${versBash(dossier)}/ca.crt`)
    writeFileSync(join(dossier, 'ca.crt'), 'pas un certificat')
    const r = mode()
    expect(r.code).toBe(1)
    expect(r.erreur).toContain('sans repli vers require')
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

  it('les restes .partiel et .journal s effacent au démarrage suivant, rien d autre', () => {
    fichiers([
      'ejp-2026-11-02-0910.dump.age.partiel',
      'ejp-2026-11-02-0910.dump.age.journal',
      'ejp-2026-11-02-0800.dump.age',
    ])
    bash('export_nettoyer_partiels "$DOSSIER"')
    expect(readdirSync(dossier)).toEqual(['ejp-2026-11-02-0800.dump.age'])
  })

  // Export complet : en-tête d'age, au moins 10 Kio, fiche cohérente (modifiable par $fiche).
  function exportComplet(nom: string, contenu?: Buffer, fiche: Record<string, unknown> = {}) {
    const octets =
      contenu ?? Buffer.concat([Buffer.from('age-encryption.org/v1\n'), randomBytes(20000)])
    writeFileSync(join(dossier, nom), octets)
    writeFileSync(
      join(dossier, nom.replace(/\.dump\.age$/, '.json')),
      JSON.stringify({
        fichier: nom,
        taille_octets: octets.length,
        sha256: sha256(octets),
        ...fiche,
      }),
    )
  }

  it('migrer : un export complet du jour de Paris, fiche, taille, en-tête et empreinte vérifiés', () => {
    const existe = (instant = '2026-11-02T08:00:00Z') =>
      bash(`if export_existe_aujourdhui "$DOSSIER" ${instant}; then echo oui; else echo non; fi`)
        .sortie
    const nom = 'ejp-2026-11-02-0910.dump.age'
    const effacer = () => {
      for (const f of readdirSync(dossier)) rmSync(join(dossier, f))
    }
    fichiers(['ejp-2026-11-02-0005.dump.age.partiel'])
    exportComplet('ejp-2026-11-01-2330.dump.age')
    writeFileSync(join(dossier, 'ejp-2026-11-02-0010.dump.age'), '')
    expect(existe()).toBe('non\n')
    expect(existe('2026-11-01T22:30:00Z')).toBe('oui\n')
    effacer()
    // Sans fiche, empreinte fausse, trop petit, sans l'en-tête d'age : refusé.
    exportComplet(nom)
    rmSync(join(dossier, 'ejp-2026-11-02-0910.json'))
    expect(existe()).toBe('non\n')
    exportComplet(nom, undefined, { sha256: 'a'.repeat(64) })
    expect(existe()).toBe('non\n')
    exportComplet(nom, Buffer.from('age-encryption.org/v1\npetit'))
    expect(existe()).toBe('non\n')
    exportComplet(nom, randomBytes(20000))
    expect(existe()).toBe('non\n')
    exportComplet(nom, Buffer.concat([Buffer.from('age-encryption.org/v2\n'), randomBytes(20000)]))
    expect(existe()).toBe('non\n')
    exportComplet(nom)
    expect(existe()).toBe('oui\n')
    expect(existe('2026-11-03T08:00:00Z')).toBe('non\n')
  })
})

describe('relance sous env -i : ni trace, ni BASH_ENV, ni variable héritée', LENT, () => {
  it('le mot de passe ne s affiche pas sous bash -x, l environnement est réduit', () => {
    const script = join(dossier, 'relance.sh')
    writeFileSync(
      script,
      [
        '#!/usr/bin/env bash',
        'set +xv',
        `source "${versBash(join(racine, 'scripts/export/commun.sh'))}"`,
        'export_relancer_propre "/usr/bin:/bin" "$0" "$@"',
        'mot_de_passe="valeur-secrete-42"',
        'echo "options=$- arguments=$* chemin=$PATH"',
        'compgen -e | tr "\\n" " "; echo',
        'declare -Fx | wc -l',
      ].join('\n'),
    )
    const bashEnv = join(dossier, 'bash-env.sh')
    writeFileSync(bashEnv, 'set -x\nexport -f compgen 2>/dev/null; f() { :; }; export -f f\n')
    const r = spawnSync('bash', ['-x', versBash(script), 'a', 'b'], {
      cwd: racine,
      encoding: 'utf8',
      env: {
        ...process.env,
        BASH_ENV: versBash(bashEnv),
        SHELLOPTS: 'braceexpand:hashall:interactive-comments:xtrace',
        PGHOSTADDR: '192.0.2.1',
        PGSERVICE: 'autre',
        CLAUDECODE: '1',
        EXPORT_PG_BIN: '/autre',
      },
    })
    expect(r.status, r.stderr).toBe(0)
    expect(r.stderr + r.stdout).not.toContain('valeur-secrete-42')
    const [ligne, noms, fonctions] = r.stdout.trim().split('\n')
    expect(ligne).toMatch(/^options=[^x ]* arguments=a b chemin=\/usr\/bin:\/bin$/)
    const exportees = (noms ?? '').trim().split(' ')
    for (const nom of ['PGHOSTADDR', 'PGSERVICE', 'CLAUDECODE', 'EXPORT_PG_BIN', 'BASH_ENV'])
      expect(exportees, nom).not.toContain(nom)
    expect(exportees).toContain('EXPORT_RELANCE')
    expect((fonctions ?? '').trim()).toBe('0')
  })

  it('déjà propre : pas de relance ; encore sale après la relance : arrêt', () => {
    const propre = bash(
      "/usr/bin/env -i PATH=/usr/bin:/bin /usr/bin/bash --noprofile --norc -c 'source scripts/export/commun.sh; export_relancer_propre /usr/bin:/bin x; echo suite'",
    )
    expect(propre.erreur).toBe('')
    expect(propre.sortie).toBe('suite\n')
    const sale = bash('export_relancer_propre /usr/bin:/bin x', { EXPORT_RELANCE: '1' })
    expect(sale.code).toBe(1)
    expect(sale.erreur).toContain('impossible à nettoyer')
  })
})

describe('binaires du poste : empreintes épinglées', LENT, () => {
  it('table : age.exe, pg_dump.exe et les DLL chargées, sommes de 64 caractères', () => {
    const lignes = bash('printf "%s\\n" "${EXPORT_EMPREINTES_POSTE[@]}"').sortie.trim().split('\n')
    for (const l of lignes) expect(l).toMatch(/^[0-9a-f]{64} {2}(age|pgsql\/bin)\/[a-z0-9_.-]+$/)
    const chemins = lignes.map((l) => l.slice(66))
    for (const c of [
      'age/age.exe',
      'pgsql/bin/pg_dump.exe',
      'pgsql/bin/libpq.dll',
      'pgsql/bin/libssl-3-x64.dll',
      'pgsql/bin/libcrypto-3-x64.dll',
    ])
      expect(chemins).toContain(c)
  })

  it('conforme : accepté ; un octet changé, un fichier absent ou une DLL en plus : refusé', () => {
    const outils = join(dossier, 'outils')
    mkdirSync(join(outils, 'age'), { recursive: true })
    mkdirSync(join(outils, 'pgsql/bin'), { recursive: true })
    writeFileSync(join(outils, 'age/age.exe'), 'age')
    writeFileSync(join(outils, 'pgsql/bin/pg_dump.exe'), 'pg_dump')
    writeFileSync(join(outils, 'pgsql/bin/libpq.dll'), 'libpq')
    const table = `"${sha256('age')}  age/age.exe" "${sha256('pg_dump')}  pgsql/bin/pg_dump.exe" "${sha256('libpq')}  pgsql/bin/libpq.dll"`
    const verifier = () => bash(`export_verifier_binaires "$DOSSIER/outils" ${table}`)
    expect(verifier().code).toBe(0)
    writeFileSync(join(outils, 'pgsql/bin/pg_dump.exe'), 'pg_dumq')
    expect(verifier().erreur).toContain('empreinte inattendue pour pgsql/bin/pg_dump.exe')
    writeFileSync(join(outils, 'pgsql/bin/pg_dump.exe'), 'pg_dump')
    writeFileSync(join(outils, 'pgsql/bin/VERSION.dll'), 'x')
    expect(verifier().erreur).toContain('DLL inattendue : pgsql/bin/VERSION.dll')
    rmSync(join(outils, 'pgsql/bin/VERSION.dll'))
    writeFileSync(join(outils, 'age/libpq.dll'), 'x')
    expect(verifier().erreur).toContain('DLL inattendue : age/libpq.dll')
    rmSync(join(outils, 'age/libpq.dll'))
    rmSync(join(outils, 'age/age.exe'))
    expect(verifier().erreur).toContain('binaire absent : age/age.exe')
  })

  it.runIf(existsSync(`${OUTILS_DU_POSTE}/age/age.exe`))(
    'sur ce poste : les binaires installés sont ceux épinglés',
    () => {
      const r = bash(`export_outils_poste "${OUTILS_DU_POSTE}"\necho "$EXPORT_AGE|$EXPORT_PG_DUMP"`)
      expect(r.erreur).toBe('')
      expect(r.sortie).toBe(
        `${OUTILS_DU_POSTE}/age/age.exe|${OUTILS_DU_POSTE}/pgsql/bin/pg_dump.exe\n`,
      )
    },
  )
})

describe('branche récupérée depuis l adresse officielle, jamais le origin du clone', LENT, () => {
  function git(cwd: string, args: string[]) {
    const r = spawnSync(
      'git',
      ['-C', cwd, '-c', 'user.name=e', '-c', 'user.email=e@exemple.test', ...args],
      { encoding: 'utf8' },
    )
    if (r.status !== 0) throw new Error(`git ${args.join(' ')} : ${r.stderr}`)
    return r.stdout.trim()
  }
  // Dépôt nu $nom dont main porte un seul commit (fichier a = $contenu) ; rend son SHA.
  function depotNu(nom: string, contenu: string) {
    const source = join(dossier, `${nom}-source`)
    mkdirSync(source)
    writeFileSync(join(source, 'a'), contenu)
    git(source, ['init', '-q'])
    git(source, ['add', 'a'])
    git(source, ['commit', '-q', '--no-verify', '-m', nom])
    git(dossier, ['init', '-q', '--bare', join(dossier, `${nom}.git`)])
    git(source, ['push', '-q', join(dossier, `${nom}.git`), 'HEAD:refs/heads/main'])
    return git(source, ['rev-parse', 'HEAD'])
  }

  it('origin détourné, règle insteadOf globale : main officiel quand même ; règle du clone : arrêt', () => {
    const officiel = depotNu('officiel', 'officiel')
    depotNu('detourne', 'detourne')
    const clone = join(dossier, 'clone')
    mkdirSync(clone)
    git(clone, ['init', '-q'])
    git(clone, ['remote', 'add', 'origin', versBash(join(dossier, 'detourne.git'))])
    const globale = join(dossier, 'gitconfig')
    writeFileSync(
      globale,
      `[url "${versBash(join(dossier, 'detourne.git'))}"]\n\tinsteadOf = ${versBash(join(dossier, 'officiel.git'))}\n`,
    )
    const recuperer = () =>
      bash('export_recuperer "$DOSSIER/clone" "$DOSSIER/officiel.git" main', {
        GIT_CONFIG_GLOBAL: versBash(globale),
      })
    const r = recuperer()
    expect(r.erreur).toBe('')
    expect(r.sortie).toBe(`${officiel}\n`)
    expect(git(clone, ['rev-parse', 'refs/remotes/origin/main'])).toBe(officiel)
    git(clone, [
      'config',
      `url.${versBash(join(dossier, 'detourne.git'))}.insteadOf`,
      versBash(join(dossier, 'officiel.git')),
    ])
    const regle = recuperer()
    expect(regle.code).toBe(1)
    expect(regle.erreur).toContain('règle url.*.insteadOf')
  })

  it('clé publique affichée entière dans le résumé', () => {
    const r = bash(
      `EXPORT_TAILLE=20000 EXPORT_SHA256=$(printf "a%.0s" {1..64}) EXPORT_TABLES=3 EXPORT_GARDES=1 EXPORT_SUPPRIMES=0\nexport_resume ejp-2026-11-02-0910.dump.age "${CLE}" inconnue | sed -n 5p`,
    )
    expect(r.sortie).toBe(`Clé : ${CLE}\n`)
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
      `Clé : ${CLE}`,
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
      `Clé : ${CLE}`,
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
