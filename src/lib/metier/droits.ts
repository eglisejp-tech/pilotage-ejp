// Droits de lecture et d'action par profil, côté interface (docs/decisions.md, T29 ; BRIEF.md,
// section 7). Miroir de private.lit_tout() et private.est_decideur() : la base décide, l'interface
// cache seulement ce que la base refuserait.
//
// Règle : une adresse de lecture se donne par LECTEURS (lire tout) ; un bouton du berger et du
// conseil (« Marquer traité » de « À décider » ou d'un point, commentaire facultatif) se montre
// par estDecideur, jamais par le droit de lire. Pour un ministère, les boutons d'un point
// dépendent de son lien au point (créateur ou mentionné). EJP Tech lit tout et n'a aucun bouton
// d'action sur ce qu'il lit comme le berger, sauf ceux de la modération ; il a ceux de la gestion
// (comptes, indicateurs, sessions : T60, plus bas).

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

// Gestion de l'outil (décision T60 du 13 octobre 2026). Miroir de private.controler_appelant()
// (Edge Functions de comptes) et de private.peut_configurer() (indicateurs) : EJP Tech seul
// crée et gère les ministères, les comptes et les indicateurs ; l'administration de l'église
// lit les mêmes écrans, sans aucun bouton d'action. Les sessions restent aux deux.

/** Ministères et comptes, puis indicateurs : lus par l'administration et EJP Tech. */
export const LECTEURS_GESTION: readonly TypeCompte[] = ['admin_eglise', 'admin_plateforme']

/** Sessions : l'administration de l'église et EJP Tech les déclarent et les corrigent (T60). */
export const GESTIONNAIRES_SESSIONS: readonly TypeCompte[] = LECTEURS_GESTION

/** Le profil gère-t-il les ministères, les comptes et les indicateurs ? EJP Tech seul (T60). */
export function gereLOutil(type: TypeCompte): boolean {
  return type === 'admin_plateforme'
}
