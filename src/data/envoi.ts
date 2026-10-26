// Enveloppe de toute écriture de `src/data/` (décision T76). Elle annonce l'envoi au transport,
// qui lui donne sa référence et note ce qui arrive à la requête (statut reçu, corps perdu, notre
// délai, réseau coupé au départ), puis attache ces faits à l'erreur rendue, sans la remplacer :
// l'écran la lit par `lireEchec` (src/data/echecEnvoi.ts). Une écriture qui ne passe pas par ici
// ne serait classée que d'après son message (un test le vérifie : src/data/envoi.test.ts).

import { annoncerEnvoi, oublierEnvoi } from '@/lib/transport'
import type { CibleEnvoi, Suivi } from '@/lib/transport'

const suivis = new WeakMap<object, Suivi>()

/** Faits de l'envoi qui a produit cette erreur, s'il est passé par `envoyer`. */
export function suiviDe(erreur: unknown): Suivi | undefined {
  return typeof erreur === 'object' && erreur !== null ? suivis.get(erreur) : undefined
}

function attacher(erreur: unknown, suivi: Suivi): void {
  if (typeof erreur === 'object' && erreur !== null && !suivis.has(erreur))
    suivis.set(erreur, suivi)
}

/**
 * Lance l'écriture `appel` vers `cible` (`rpc/ajouter_evenement`, `table/mesure`,
 * `functions/creer-compte`). Rend sa réponse telle quelle ; l'erreur d'une réponse
 * (`{ data, error }` de supabase-js) ou une exception gardent leur identité et reçoivent le
 * suivi de l'envoi.
 */
export async function envoyer<R>(cible: CibleEnvoi, appel: () => PromiseLike<R>): Promise<R> {
  const suivi = annoncerEnvoi(cible)
  try {
    const reponse = await appel()
    if (typeof reponse === 'object' && reponse !== null && 'error' in reponse) {
      attacher(reponse.error, suivi)
    }
    return reponse
  } catch (erreur) {
    attacher(erreur, suivi)
    throw erreur
  } finally {
    oublierEnvoi(suivi)
  }
}
