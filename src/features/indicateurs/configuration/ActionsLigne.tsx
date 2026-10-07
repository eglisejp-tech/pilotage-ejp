import type { FunctionComponent } from 'react'
import type { TypeCompte } from '@/lib/base'

export interface ProprietesActionsLigne {
  ministereId: string
  ministereNom: string
  indicateurId: string
  libelle: string
  /** Un calcul ne se corrige que par un remplacement ; il n'a pas de valeur saisie. */
  estCalcul: boolean
  /** Ajout d'un ministère qui attend EJP Tech. */
  enAttente: boolean
  profil: TypeCompte
}

/**
 * Emplacement des actions d'une ligne d'indicateur : « Corriger » (tant que rien n'est saisi,
 * jamais sur une suggestion), « Remplacer », « Retirer » et « Retirer pour confidentialité ».
 * Amorce du lot L3a : elle ne rend rien, le lot L3b la remplit sans toucher à la ligne.
 */
export const ActionsLigne: FunctionComponent<ProprietesActionsLigne> = () => null
