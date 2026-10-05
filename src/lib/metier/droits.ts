// Droits de lecture et d'action par profil, côté interface (docs/decisions.md, T29 ; BRIEF.md,
// section 7). Miroir de private.lit_tout() et private.est_decideur() : la base décide, l'interface
// cache seulement ce que la base refuserait.
//
// Règle : une adresse de lecture se donne par LECTEURS (lire tout) ; un bouton du berger et du
// conseil (« Marquer traité » de « À décider » ou d'un point, commentaire facultatif) se montre
// par estDecideur, jamais par le droit de lire. Pour un ministère, les boutons d'un point
// dépendent de son lien au point (créateur ou mentionné). EJP Tech lit tout et n'a aucun bouton
// d'action, sauf ceux de la modération.

import type { TypeCompte } from '@/lib/base'

/** Berger et conseil : ils lisent tout et marquent un point traité (private.est_decideur()). */
export const DECIDEURS: readonly TypeCompte[] = ['berger', 'conseil']

/** Berger, conseil et EJP Tech : ils lisent tout (private.lit_tout()). EJP Tech, en lecture seule. */
export const LECTEURS: readonly TypeCompte[] = [...DECIDEURS, 'admin_plateforme']

/** Le profil décide-t-il (« Marquer traité » du berger et du conseil) ? Jamais EJP Tech. */
export function estDecideur(type: TypeCompte): boolean {
  return DECIDEURS.includes(type)
}

/** Le profil lit-il tout, comme le berger ? Le berger, le conseil et EJP Tech. */
export function litTout(type: TypeCompte): boolean {
  return LECTEURS.includes(type)
}

/** Le profil lit tout sans rien décider : EJP Tech (T29). Aucun bouton d'action pour lui. */
export function enLectureSeule(type: TypeCompte): boolean {
  return litTout(type) && !estDecideur(type)
}
