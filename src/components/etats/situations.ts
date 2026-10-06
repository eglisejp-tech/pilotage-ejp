/**
 * Les six situations d'un état vide (docs/decisions.md, T36 ; LISEZMOI, « États vides partout »).
 * Chaque écran et chaque bloc a un état vide rangé dans l'une d'elles.
 */
export const SITUATIONS_VIDES = [
  'premier_usage',
  'en_attente_des_autres',
  'tout_est_fait',
  'aucun_resultat',
  'pas_pour_ce_profil',
  'probleme_passager',
] as const

export type SituationVide = (typeof SITUATIONS_VIDES)[number]

/** Une seule action par état vide, et seulement pour le profil qui peut la faire. */
export type ActionVide =
  | { libelle: string; vers: string; surClic?: never }
  | { libelle: string; surClic: () => void; vers?: never }
