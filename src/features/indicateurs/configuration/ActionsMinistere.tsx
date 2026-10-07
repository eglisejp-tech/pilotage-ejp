import type { FunctionComponent } from 'react'
import type { TypeCompte } from '@/lib/base'

export interface ProprietesActionsMinistere {
  ministereId: string
  ministereNom: string
  /**
   * Profil qui lit l'écran : l'administration de l'église (`admin_eglise`) ou EJP Tech
   * (`admin_plateforme`). EJP Tech y a en plus le lien « Voir la fiche » (valeurs, T29).
   */
  profil: TypeCompte
}

/**
 * Emplacement des actions du ministère, sous sa phrase : « Ajouter un indicateur », « Ajouter un
 * calcul » (panneaux de 460 px) et, pour EJP Tech seulement, « Voir la fiche ». Amorce du lot L3a :
 * elle ne rend rien, le lot L3b la remplit (`src/features/indicateurs/configuration/`) sans toucher
 * à la page. Après chaque écriture, L3b relit les lectures par `invaliderConfiguration`.
 */
export const ActionsMinistere: FunctionComponent<ProprietesActionsMinistere> = () => null
