// CI économe (veille du 25 octobre 2026) : le job « changements » de .github/workflows/ci.yml
// décide si un envoi touche autre chose que de la documentation. Documentation seule : seul le
// job « qualite » tourne (lint, contrôle des textes, qui lit aussi les .md, format, types, tests
// unitaires, build) ; la base, les parcours, les Edge Functions et la mise en ligne sont sautés.
// Dans le doute, tout tourne.
//
// La comparaison part du dernier run vert de la même branche (tous ses jobs au vert), pas de
// l'envoi précédent : un run de code annulé ou en échec, suivi d'un envoi de documentation seule,
// fait tout tourner, et, sur main, mettre en ligne. Écrit `code=oui` ou `code=non` dans
// $GITHUB_OUTPUT, et la raison dans le résumé du run. Il ne lit que le jeton du run (GH_TOKEN,
// lecture des runs), jamais un secret du dépôt. Description : docs/exploitation.md, section 7.8.
import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/** Fichier de documentation : sous docs/ ou .claude/, ou tout fichier .md. */
export function estDocumentation(chemin) {
  return (
    chemin.startsWith('docs/') ||
    chemin.startsWith('.claude/') ||
    chemin.toLowerCase().endsWith('.md')
  )
}

/**
 * Décision, à partir de l'événement et des fichiers changés depuis le dernier run vert (`null`
 * quand ce run est introuvable). Rend `{ code, raison }` : `code` vrai fait tout tourner.
 */
export function decider({ evenement, fichiers }) {
  if (evenement !== 'push') {
    return { code: true, raison: `événement « ${evenement} » : tout tourne` }
  }
  if (fichiers === null) {
    return { code: true, raison: 'aucun run vert de la branche à comparer : tout tourne' }
  }
  if (fichiers.length === 0) {
    return { code: true, raison: 'aucun fichier changé depuis le dernier run vert : tout tourne' }
  }
  const autres = fichiers.filter((chemin) => !estDocumentation(chemin))
  if (autres.length === 0) {
    return {
      code: false,
      raison: `documentation seule (${fichiers.length} fichier(s)) : seul le job « qualite » tourne`,
    }
  }
  return {
    code: true,
    raison: `${autres.length} fichier(s) hors documentation, dont ${autres.slice(0, 3).join(', ')} : tout tourne`,
  }
}

/**
 * Commit de comparaison : le plus récent des runs verts dont le commit est un ancêtre du commit
 * envoyé (un envoi forcé peut avoir retiré les autres de l'historique). `null` sinon.
 */
export function choisirBase(commitsVerts, estAncetre) {
  return commitsVerts.find((sha) => estAncetre(sha)) ?? null
}

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' })
}

function estAncetre(sha) {
  try {
    git('merge-base', '--is-ancestor', sha, 'HEAD')
    return true
  } catch {
    return false
  }
}

/** Commits des derniers runs verts de ce workflow sur la branche, du plus récent au plus ancien. */
async function commitsDesRunsVerts({ depot, branche, jeton }) {
  const adresse =
    `https://api.github.com/repos/${depot}/actions/workflows/ci.yml/runs` +
    `?branch=${encodeURIComponent(branche)}&status=success&per_page=30`
  const reponse = await fetch(adresse, {
    headers: { Authorization: `Bearer ${jeton}`, Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!reponse.ok) throw new Error(`API GitHub, statut ${reponse.status}`)
  const corps = await reponse.json()
  return corps.workflow_runs.map((run) => run.head_sha)
}

/** Fichiers changés entre un commit et le commit envoyé (un renommage compte pour deux). */
function fichiersDepuis(base) {
  return git('diff', '--name-only', '--no-renames', base, 'HEAD').split('\n').filter(Boolean)
}

/**
 * Toute la décision, avec ses lectures en paramètres (le test les simule) : `lireCommitsVerts`
 * (API GitHub), `estAncetre` et `fichiersDepuis` (git). Une lecture qui échoue fait tout tourner.
 */
export async function analyser({ evenement, lireCommitsVerts, estAncetre, fichiersDepuis }) {
  if (evenement !== 'push') return { base: null, ...decider({ evenement, fichiers: null }) }
  try {
    const base = choisirBase(await lireCommitsVerts(), estAncetre)
    const fichiers = base === null ? null : fichiersDepuis(base)
    return { base, ...decider({ evenement, fichiers }) }
  } catch (erreur) {
    return {
      base: null,
      code: true,
      raison: `comparaison impossible (${erreur instanceof Error ? erreur.message : erreur}) : tout tourne`,
    }
  }
}

async function principal() {
  const env = process.env
  const { base, code, raison } = await analyser({
    evenement: env.GITHUB_EVENT_NAME ?? '',
    lireCommitsVerts: () =>
      commitsDesRunsVerts({
        depot: env.GITHUB_REPOSITORY,
        branche: env.GITHUB_REF_NAME,
        jeton: env.GH_TOKEN,
      }),
    estAncetre,
    fichiersDepuis,
  })
  const ligne = `Comparaison avec ${base ?? 'aucun run vert'} : ${raison}.`
  console.log(ligne)
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `code=${code ? 'oui' : 'non'}\n`)
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${ligne}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await principal()
