// Pourcentage de STARs en FIJ (BRIEF.md section 3, règle 4 ; CLAUDE.md : il se calcule, il ne se
// saisit pas).
//
// Somme des « dont en FIJ » divisée par la somme des « STARs actifs », les deux prises sur les mêmes
// ministères (ceux qui ont les deux valeurs : `v_pourcentage_fij`). Arrondi à l'entier le plus
// proche, comme `round()` de la base (0,5 vers le haut). Somme des actifs nulle : « Non calculé ».
// Jamais une moyenne de pourcentages. Sert aussi à la fiche d'un ministère (ses deux dernières
// valeurs) et au formulaire du dimanche (« 79 % des actifs »).

import { accorder, ESPACE_FINE, nombre } from './texte'

export const NON_CALCULE = 'Non calculé'

function verifierSomme(valeur: number, nom: string): void {
  if (!Number.isInteger(valeur) || valeur < 0) {
    throw new RangeError(`${nom} doit être un entier positif ou nul : ${valeur}`)
  }
}

/**
 * Pourcentage entier, ou `null` s'il ne se calcule pas (une somme manque, ou aucun actif).
 * Calcul en entiers : pas d'erreur d'arrondi des nombres à virgule (12,5 donne 13).
 */
export function pourcentageFij(enFij: number | null, actifs: number | null): number | null {
  if (enFij === null || actifs === null) return null
  verifierSomme(enFij, 'enFij')
  verifierSomme(actifs, 'actifs')
  if (actifs === 0) return null
  return Math.floor((200 * enFij + actifs) / (2 * actifs))
}

/** « 77 % » (espace fine insécable), ou « Non calculé ». */
export function formaterPourcentage(pourcentage: number | null): string {
  return pourcentage === null ? NON_CALCULE : `${nombre(pourcentage)}${ESPACE_FINE}%`
}

/** « 64 sur 83 STARs actifs », ou `null` si l'une des deux sommes manque. */
export function detailFij(enFij: number | null, actifs: number | null): string | null {
  if (enFij === null || actifs === null) return null
  verifierSomme(enFij, 'enFij')
  verifierSomme(actifs, 'actifs')
  return `${nombre(enFij)} sur ${nombre(actifs)} ${accorder(actifs, 'STAR actif', 'STARs actifs')}`
}
