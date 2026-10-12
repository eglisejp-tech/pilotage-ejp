import type { FunctionComponent } from 'react'
import { ANCRE_A_VALIDER } from '@/features/indicateurs/validation/ancre'
import {
  useBlocAdministration,
  useBlocEjpTech,
} from '@/features/indicateurs/validation/useAValider'
import { VueAValider } from '@/features/indicateurs/validation/VueAValider'
import type { TypeCompte } from '@/lib/base'

export { ANCRE_A_VALIDER }

export interface ProprietesBlocAValider {
  /**
   * Profil qui lit l'écran `/indicateurs` : EJP Tech (`admin_plateforme`) décide (« Valider »,
   * « Refuser » avec un motif) et lit le « Pourquoi » ; l'administration de l'église
   * (`admin_eglise`) lit le bloc sans bouton ni « Pourquoi ». Aucun autre profil n'ouvre cet écran.
   */
  profil: TypeCompte
}

function BlocEjpTech() {
  const { lignes, decidees, actions } = useBlocEjpTech()
  return <VueAValider decide lignes={lignes} decidees={decidees} actions={actions} />
}

function BlocAdministration() {
  const { lignes, decidees, actions } = useBlocAdministration()
  return <VueAValider decide={false} lignes={lignes} decidees={decidees} actions={actions} />
}

/**
 * Bloc « À valider » de l'écran Indicateurs (configuration-indicateurs.md, 7.1 ;
 * validation-metier.md, 5.1), sous la phrase de l'écran : les ajouts des ministères qui attendent
 * EJP Tech, du plus ancien au plus récent. Propriétés figées par le lot C0 ; le lot L3a le pose
 * dans `PageIndicateurs.tsx`, le lot L4 le remplit (`src/features/indicateurs/validation/`). Le
 * bloc lit ses données lui-même. Il garde son titre quand rien n'attend (« Rien à valider. »),
 * pour que son ancre et les liens qui y mènent arrivent toujours quelque part. Un profil sans
 * droit ne lit rien : le bloc ne rend rien, sans requête.
 */
export const BlocAValider: FunctionComponent<ProprietesBlocAValider> = ({ profil }) => {
  if (profil === 'admin_plateforme') return <BlocEjpTech />
  if (profil === 'admin_eglise') return <BlocAdministration />
  return null
}
