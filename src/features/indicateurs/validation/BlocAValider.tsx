import type { FunctionComponent } from 'react'
import type { TypeCompte } from '@/lib/base'

/**
 * Ancre du bloc dans `/indicateurs` : le lien « Voir dans À valider » d'une ligne de
 * `/indicateurs/:id` (L3a) et celui de l'en-tête de la modération (L6) mènent à
 * `/indicateurs#a-valider`.
 */
export const ANCRE_A_VALIDER = 'a-valider'

export interface ProprietesBlocAValider {
  /**
   * Profil qui lit l'écran `/indicateurs` : EJP Tech (`admin_plateforme`) décide (« Valider »,
   * « Refuser » avec un motif) et lit le « Pourquoi » ; l'administration de l'église
   * (`admin_eglise`) lit le bloc sans bouton ni « Pourquoi ». Aucun autre profil n'ouvre cet écran.
   */
  profil: TypeCompte
}

/**
 * Bloc « À valider » de l'écran Indicateurs (configuration-indicateurs.md, 7.1 ;
 * validation-metier.md, 5.1), sous la phrase de l'écran : les ajouts des ministères qui attendent
 * EJP Tech, du plus ancien au plus récent. Propriétés figées par le lot C0 : le lot L3a le pose
 * dans `PageIndicateurs.tsx`, le lot L4 le remplit (`src/features/indicateurs/validation/`), sans
 * changer ces propriétés. Le bloc lit ses données lui-même et ne rend rien quand rien n'attend.
 * Amorce : ne rend rien.
 */
export const BlocAValider: FunctionComponent<ProprietesBlocAValider> = () => null
