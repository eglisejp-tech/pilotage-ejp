// Vérification du hook PreToolUse (Bash) .claude/hooks/garde-production.sh, qui lance ce fichier
// avec l'entrée JSON de Claude Code sur stdin. Règles : en-tête de garde-production.sh (T79).
// Sortie : code 0 (rien à dire, ou décision JSON sur stdout), code 2 (refus, message sur stderr).
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Adresse officielle et fixe du dépôt : la seule source du SHA de main.
const DEPOT_OFFICIEL = 'https://github.com/eglisejp-tech/pilotage-ejp.git'
const PREFIXE_COPIE = 'pilotage-ejp-production-'
const DOUZE_HEURES = 12 * 60 * 60 * 1000

const LECTURE =
  /^bash scripts\/production\.sh (etat|revenir|export|preparer (main|etape-[A-Za-z0-9][A-Za-z0-9._-]*))$/
const ECRITURE = /^bash scripts\/production\.sh (migrer|fonction [a-z][a-z0-9-]*)$/
// Contrôle de syntaxe d'un script : bash -n lit le fichier sans rien exécuter.
const SYNTAXE = /^bash -n scripts\/(?!.*\.\.)[A-Za-z0-9._/-]+\.sh$/

const MESSAGE_FORMES =
  'les gestes de production passent par « bash scripts/production.sh <action> », seul dans la commande, depuis un dossier identique à main (etat, preparer <branche>, export, migrer, fonction <nom>, revenir). Le script ne se lance pas autrement (autre interpréteur, source, env, copie renommée, guillemets, barre oblique inverse, variable, motif *) et ne se copie pas. Les appels directs de la CLI Supabase vers un projet distant restent refusés.'
const MESSAGE_AGE =
  'déchiffrer un export ou créer une paire de clés age est réservé à la personne responsable (T79) : la clé privée ne vient jamais sur ce poste.'

function bloquer(message) {
  process.stderr.write(`Bloqué : ${message}\n`)
  process.exit(2)
}

// git sans configuration globale ni système (aucune règle url.*.insteadOf, aucun filtre), sans
// objets de remplacement, sans variable GIT_* héritée qui changerait de dépôt. Sans
// MSYS_NO_PATHCONV : sous Windows, git lance certains transports par le shell de Git pour Windows.
function envGit() {
  const env = {}
  for (const [cle, valeur] of Object.entries(process.env)) {
    if (!/^(GIT_|MSYS_NO_PATHCONV$)/i.test(cle)) env[cle] = valeur
  }
  return {
    ...env,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_NO_REPLACE_OBJECTS: '1',
    GIT_TERMINAL_PROMPT: '0',
  }
}

function git(args, options = {}) {
  return execFileSync('git', args, {
    env: envGit(),
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024,
    timeout: 20_000,
    ...options,
  })
}

const sha1 = (type, contenu) =>
  createHash('sha1').update(`${type} ${contenu.length}\0`).update(contenu).digest('hex')

// SHA de main lu sur l'adresse officielle, jamais dans les références locales.
function shaDeMain() {
  try {
    const sortie = git(
      [
        '-c',
        `url.${DEPOT_OFFICIEL}.insteadOf=${DEPOT_OFFICIEL}`,
        'ls-remote',
        '--exit-code',
        DEPOT_OFFICIEL,
        'refs/heads/main',
      ],
      { cwd: tmpdir(), encoding: 'utf8' },
    )
    const m = /^([0-9a-f]{40})\trefs\/heads\/main$/m.exec(sortie)
    if (m) return m[1]
  } catch {
    // traité ci-dessous
  }
  return bloquer(
    `impossible de lire main sur ${DEPOT_OFFICIEL} (réseau ?). Le script lancé doit être celui de main : réessayer une fois la connexion revenue (T79).`,
  )
}

// Objet git dont le contenu est vérifié par son empreinte : un objet altéré ou remplacé est refusé.
function objet(dossier, type, sha) {
  let contenu
  try {
    contenu = git(['-C', dossier, 'cat-file', type, sha])
  } catch {
    return bloquer(
      `le commit de main (${sha.slice(0, 12)}) est absent de ce dossier : lancer « git fetch origin », puis relancer.`,
    )
  }
  if (sha1(type, contenu) !== sha)
    bloquer(`objet git altéré dans ce dossier (${sha.slice(0, 12)}).`)
  return contenu
}

function entreesArbre(contenu) {
  const entrees = []
  let i = 0
  while (i < contenu.length) {
    const espace = contenu.indexOf(0x20, i)
    const nul = contenu.indexOf(0, espace)
    if (espace < 0 || nul < 0 || nul + 21 > contenu.length) bloquer('arbre git illisible.')
    entrees.push({
      mode: contenu.subarray(i, espace).toString('latin1'),
      nom: contenu.subarray(espace + 1, nul).toString('utf8'),
      sha: contenu.subarray(nul + 1, nul + 21).toString('hex'),
    })
    i = nul + 21
  }
  return entrees
}

function sousArbre(dossier, shaArbre, nom) {
  const e = entreesArbre(objet(dossier, 'tree', shaArbre)).find((x) => x.nom === nom)
  return e && e.mode === '40000' ? e.sha : bloquer(`${nom}/ absent de main.`)
}

// Fichiers couverts dans main : scripts/production.sh et tout scripts/export/, avec leur blob.
function fichiersDeMain(dossier, sha) {
  const commit = objet(dossier, 'commit', sha).toString('utf8')
  const racine = /^tree ([0-9a-f]{40})$/m.exec(commit)
  if (!racine) bloquer('commit de main illisible.')
  const scripts = sousArbre(dossier, racine[1], 'scripts')
  const fichiers = new Map()
  const production = entreesArbre(objet(dossier, 'tree', scripts)).find(
    (x) => x.nom === 'production.sh',
  )
  if (!production || !/^100(644|755)$/.test(production.mode))
    bloquer('scripts/production.sh absent de main.')
  fichiers.set('scripts/production.sh', production.sha)
  const parcourir = (shaArbre, prefixe) => {
    for (const e of entreesArbre(objet(dossier, 'tree', shaArbre))) {
      const chemin = `${prefixe}/${e.nom}`
      if (e.mode === '40000') parcourir(e.sha, chemin)
      else if (e.mode === '100644' || e.mode === '100755') fichiers.set(chemin, e.sha)
      else bloquer(`${chemin} n'est pas un fichier ordinaire dans main.`)
    }
  }
  parcourir(sousArbre(dossier, scripts, 'export'), 'scripts/export')
  return fichiers
}

// Fichiers présents dans le dossier de travail sous scripts/export/ (suivis, ignorés ou non).
function fichiersDuDossier(dossier, relatif, liste = []) {
  let entrees
  try {
    entrees = readdirSync(join(dossier, relatif), { withFileTypes: true })
  } catch {
    return bloquer(`${relatif}/ introuvable dans ce dossier.`)
  }
  for (const e of entrees) {
    const chemin = `${relatif}/${e.name}`
    if (e.isDirectory()) fichiersDuDossier(dossier, chemin, liste)
    else if (e.isFile()) liste.push(chemin)
    else bloquer(`${chemin} n'est pas un fichier ordinaire (lien ?).`)
  }
  return liste
}

// Compare chaque fichier couvert, octet pour octet (même calcul que git hash-object --no-filters :
// ni filtre, ni index, ni assume-unchanged, ni skip-worktree), au blob de main.
function verifierDossier(dossier, sha, fichiers) {
  const presents = ['scripts/production.sh', ...fichiersDuDossier(dossier, 'scripts/export')]
  const court = sha.slice(0, 12)
  for (const chemin of presents) {
    if (!fichiers.has(chemin))
      bloquer(`${chemin} n'existe pas dans main (${court}) : fichier en trop dans scripts/export/.`)
  }
  for (const [chemin, blob] of fichiers) {
    const complet = join(dossier, chemin)
    let contenu
    try {
      if (!lstatSync(complet).isFile()) throw new Error('pas un fichier')
      contenu = readFileSync(complet)
    } catch {
      bloquer(`${chemin} manque dans ce dossier (main ${court}).`)
    }
    if (sha1('blob', contenu) !== blob)
      bloquer(
        `${chemin} diffère de main (${court}) dans ce dossier. Le script lancé doit être celui de main : travailler depuis un dossier à jour de main (T79).`,
      )
  }
}

// Copie extraite des objets vérifiés, dans un dossier temporaire neuf : c'est elle qui est lancée.
function copier(dossier, sha, fichiers) {
  try {
    for (const nom of readdirSync(tmpdir())) {
      if (!nom.startsWith(PREFIXE_COPIE)) continue
      const ancien = join(tmpdir(), nom)
      if (Date.now() - statSync(ancien).mtimeMs > DOUZE_HEURES)
        rmSync(ancien, { recursive: true, force: true })
    }
  } catch {
    // le ménage des anciennes copies n'empêche rien
  }
  const copie = mkdtempSync(join(tmpdir(), PREFIXE_COPIE))
  for (const [chemin, blob] of fichiers) {
    const cible = join(copie, chemin)
    mkdirSync(join(cible, '..'), { recursive: true })
    writeFileSync(cible, objet(dossier, 'blob', blob))
  }
  writeFileSync(join(copie, 'COPIE-DE-MAIN'), `${sha}\n`)
  const chemin = copie.replaceAll('\\', '/')
  if (!/^[A-Za-z0-9:/._~ -]+$/.test(chemin)) bloquer(`dossier temporaire inattendu : ${chemin}`)
  return chemin
}

// Normalisation : sans guillemets ; barres obliques inverses retirées (a\ge) ou changées en /
// (C:\outils\age.exe). Les deux formes sont examinées.
function formes(commande) {
  const sans = commande.toLowerCase().replace(/["']/g, '')
  return [sans.replace(/\\/g, ''), sans.replace(/\\/g, '/')]
}

const segmentsDe = (texte) =>
  texte
    .split(/[;&|()\n\r`{}]+/)
    .map((s) => s.split(/[\s<>]+/).filter(Boolean))
    .filter((s) => s.length > 0)

function base(jeton) {
  const nom = jeton.replace(/\/+$/, '').split('/').pop() || ''
  return nom.replace(/^-+[a-z0-9-]*=/, '').replace(/@[^/]*$/, '')
}

const estMotif = (jeton) => /[*?[]/.test(jeton)
function motifCorrespond(jeton, noms) {
  const source = base(jeton)
    .replace(/[.+^${}()|\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  try {
    const re = new RegExp(`^${source}$`)
    return noms.some((n) => re.test(n))
  } catch {
    return true
  }
}

const ENVELOPPES = new Set([
  'env',
  'command',
  'exec',
  'nohup',
  'time',
  'sudo',
  'xargs',
  'nice',
  'timeout',
  'winpty',
  'builtin',
  'stdbuf',
  'start',
])
// Mot de commande : premier jeton après les affectations et les enveloppes (env, xargs...).
function motCommande(jetons) {
  let i = 0
  while (i < jetons.length) {
    const j = jetons[i]
    if (/^[a-z_][a-z0-9_]*=/.test(j) || /^-/.test(j) || /^[0-9]+(\.[0-9]+)?[smhd]?$/.test(j)) i++
    else if (ENVELOPPES.has(base(j))) i++
    else return j
  }
  return ''
}

const ACTIONS = new Set(['etat', 'preparer', 'migrer', 'fonction', 'revenir', 'export'])
const SHELLS = new Set(['bash', 'sh', 'dash', 'zsh', 'ksh', 'source', 'env', 'exec'])
const COPIES = new Set([
  'cp',
  'mv',
  'ln',
  'install',
  'rsync',
  'robocopy',
  'xcopy',
  'copy',
  'tee',
  'dd',
  'tar',
  'zip',
  '7z',
  'scp',
])
const SCRIPTS =
  /(^|\/)scripts(\/|$)|(^|\/)export\/|production\.sh|commun\.sh|restaurer\.sh|empreintes\.(sh|sql)|essai-restauration\.sh|destinataires\.txt|supabase-ca\.crt/
const DISTANT =
  /\b(db\s+(push|pull|dump)|functions\s+(deploy|delete|download)|link|unlink|login|secrets|config\s+push|migration\s+(repair|fetch|list|squash)|projects|orgs|branches|inspect|storage|backups|sso|domains)\b|--(workdir|linked|db-url|project-ref|project-id)\b/
const AGE = ['age', 'age.exe']
const AGE_KEYGEN = ['age-keygen', 'age-keygen.exe']
const SUPABASE = ['supabase', 'supabase.exe', 'supabase.cmd']
const LANCEURS = new Set(['npx', 'npm', 'pnpm', 'yarn', 'bunx', 'node'])

const estShell = (jetons) =>
  jetons.some((j) => SHELLS.has(base(j)) || SHELLS.has(base(j).replace(/\.exe$/, ''))) ||
  motCommande(jetons) === '.'

// Redirection vers un fichier (> f, >> f, &> f), hors /dev/null et des copies de descripteur (2>&1).
function redirigeVersFichier(texte) {
  for (const m of texte.matchAll(/>+\|?\s*([^\s;&|()<>]*)/g)) {
    const cible = m[1]
    if (cible !== '' && cible !== '/dev/null' && cible !== 'nul') return true
  }
  return false
}

// 0 : rien à dire ; 4 : geste de production hors des formes exactes ; 7 : age réservé.
function analyser(texte) {
  const segments = segmentsDe(texte)
  const jetons = segments.flat()
  for (const s of segments) {
    const cmd = motCommande(s)
    const citeAge =
      s.some((j) => AGE.includes(base(j))) ||
      cmd.includes('$') ||
      (estMotif(cmd) && motifCorrespond(cmd, AGE))
    if (citeAge && s.some((j) => /^--?(d|decrypt)(=.*)?$/.test(j))) return 7
    if (
      s.some((j) => AGE_KEYGEN.includes(base(j))) ||
      (estMotif(cmd) && motifCorrespond(cmd, AGE_KEYGEN))
    )
      return 7
  }
  for (const s of segments) {
    const cmd = motCommande(s)
    const citeCli =
      s.some((j) => SUPABASE.includes(base(j)) || (estMotif(j) && motifCorrespond(j, SUPABASE))) ||
      cmd.includes('$') ||
      (LANCEURS.has(base(cmd)) && s.some((j) => j.includes('$')))
    if (citeCli && DISTANT.test(s.join(' '))) return 4
  }
  // Le script cité avec une action (lancé directement, par une variable, après un cd...).
  if (/production\.sh/.test(texte) && jetons.some((j) => ACTIONS.has(j))) return 4
  // Un interpréteur, ou un fichier .sh, avec une action : copie renommée, motif, lecture sur stdin.
  for (const s of segments) {
    if ((estShell(s) || s.some((j) => /\.sh$/.test(j))) && s.some((j) => ACTIONS.has(j))) return 4
  }
  const citeScripts = jetons.some((j) => SCRIPTS.test(j))
  // bash, sh, source, . ou env qui vise un fichier de scripts/, hors des formes exactes.
  if (citeScripts && segments.some(estShell)) return 4
  // Copie du script ou de ses fonctions.
  if (
    citeScripts &&
    (segments.some((s) => s.some((j) => COPIES.has(base(j)))) || redirigeVersFichier(texte))
  )
    return 4
  return 0
}

function decision(entree, permission, raison, commande) {
  const sortie = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: permission,
      permissionDecisionReason: raison,
      updatedInput: { ...entree.tool_input, command: commande },
    },
  }
  process.stdout.write(`${JSON.stringify(sortie)}\n`)
  process.exit(0)
}

let texte = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (morceau) => (texte += morceau))
process.stdin.on('end', () => {
  let entree
  try {
    entree = JSON.parse(texte)
  } catch {
    bloquer('entrée du hook illisible, impossible de vérifier la commande. Refusée par précaution.')
  }
  const commande = entree && entree.tool_input && entree.tool_input.command
  if (typeof commande !== 'string')
    bloquer('entrée du hook illisible, impossible de vérifier la commande. Refusée par précaution.')
  const dossier =
    (typeof entree.cwd === 'string' && entree.cwd) ||
    process.env.CLAUDE_PROJECT_DIR ||
    process.cwd()
  const brute = commande.trim()

  if (LECTURE.test(brute) || ECRITURE.test(brute)) {
    const sha = shaDeMain()
    const fichiers = fichiersDeMain(dossier, sha)
    verifierDossier(dossier, sha, fichiers)
    const copie = copier(dossier, sha, fichiers)
    const action = brute.slice('bash scripts/production.sh '.length)
    const lancee = `/usr/bin/bash --noprofile --norc '${copie}/scripts/production.sh' ${action}`
    const court = sha.slice(0, 12)
    if (LECTURE.test(brute))
      decision(entree, 'allow', `Copie de main ${court} vérifiée, lancée à la place.`, lancee)
    decision(
      entree,
      'ask',
      `Écriture en production (migration ou Edge Function) : à confirmer, seulement après votre accord écrit pour cette mise en ligne. Script lancé : copie de main ${court}.`,
      lancee,
    )
  }
  if (SYNTAXE.test(brute)) process.exit(0)

  let code = 0
  for (const forme of formes(commande)) code = Math.max(code, analyser(forme))
  if (code === 7) bloquer(MESSAGE_AGE)
  if (code === 4) bloquer(MESSAGE_FORMES)
  process.exit(0)
})
