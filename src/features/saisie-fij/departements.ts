import type { Departement, RubriqueFij } from '@/lib/base'

// Départements de la carte des FIJ et rubriques des chiffres par département (BRIEF, section 9,
// « FIJ par département » ; contrat de l'étape 4, section 4). Les libellés des rubriques viennent
// de la base (`v_fij_statistique.rubrique_libelle`) ; ceux d'ici servent quand la base n'en a pas
// encore rendu (formulaire vide, aperçus).

export interface DepartementFij {
  code: Departement
  nom: string
}

/** Les 8 départements, dans l'ordre des codes (BRIEF, section 9). */
export const DEPARTEMENTS_FIJ: readonly DepartementFij[] = [
  { code: '75', nom: 'Paris' },
  { code: '77', nom: 'Seine-et-Marne' },
  { code: '78', nom: 'Yvelines' },
  { code: '91', nom: 'Essonne' },
  { code: '92', nom: 'Hauts-de-Seine' },
  { code: '93', nom: 'Seine-Saint-Denis' },
  { code: '94', nom: 'Val-de-Marne' },
  { code: '95', nom: "Val-d'Oise" },
]

export const NOMBRE_DEPARTEMENTS = DEPARTEMENTS_FIJ.length

/** « 75 Paris » : libellé d'un champ (BRIEF, section 9). */
export function libelleDepartement(departement: DepartementFij): string {
  return `${departement.code} ${departement.nom}`
}

export interface RubriqueFijLibelle {
  code: RubriqueFij
  libelle: string
}

/** Les 4 rubriques, dans l'ordre de `private.fij_rubrique.ordre` (lot B5). */
export const RUBRIQUES_FIJ: readonly RubriqueFijLibelle[] = [
  { code: 'culte_ejp', libelle: 'Présents au culte EJP' },
  { code: 'reunion_fij', libelle: 'Présents à la réunion FIJ' },
  { code: 'evangelisation', libelle: "Présents à l'évangélisation" },
  { code: 'membres_mardi', libelle: 'Membres du mardi' },
]

/** Plafond d'une valeur de la carte ou d'une rubrique (`fij_departement`, `fij_statistique`). */
export const VALEUR_FIJ_MAX = 9999
