import { useTitrePage } from '@/features/connexion/useTitrePage'
import { useActionsComptes, useComptes } from '@/features/comptes/useComptes'
import { VueComptes } from '@/features/comptes/VueComptes'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/comptes`, écran 13 « Ministères et comptes » (lot L1), pour l'administration de l'église
 * seulement : `PageApplication` donne la page non disponible aux autres profils, sans requête.
 * Les lectures passent par la RLS (`v_etat_comptes` ne rend rien aux autres profils), les
 * écritures par les cinq Edge Functions de comptes.
 */
export function PageComptes({ titre }: ProprietesPage) {
  useTitrePage(titre)
  const donnees = useComptes()
  const actions = useActionsComptes()
  return <VueComptes titre={titre} donnees={donnees} actions={actions} />
}
