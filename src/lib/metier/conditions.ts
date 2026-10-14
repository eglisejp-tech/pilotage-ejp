import { z } from 'zod'

// Ce fichier n'importe que zod : le script d'installation des parcours Playwright le lit aussi.

/**
 * Version courante des conditions d'utilisation et de la politique de confidentialité (T53),
 * au format AAAA-MM-JJ. À changer À LA MAIN, dans ce seul fichier, quand les conditions ou la
 * page Confidentialité changent sur le fond : chaque compte doit alors les accepter de nouveau.
 * Une faute de frappe corrigée ne change pas la version. Jamais une date à venir : la base refuse
 * une version postérieure au jour de Paris (T61). 2026-10-12 : prénom déclaré sur un compte
 * partagé (T56), la page Confidentialité change sur le fond. 2026-10-13 : EJP Tech crée, désactive
 * et réactive les comptes et refait l'activation (T60), les conditions changent sur le fond ; sur
 * un compte partagé, chaque personne accepte elle-même (T61), la page Confidentialité le dit.
 */
export const VERSION_CONDITIONS = '2026-10-13'

/** Une version bien formée, comme la base l'exige (AAAA-MM-JJ). */
export const schemaVersionConditions = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
