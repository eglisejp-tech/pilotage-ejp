import { useTitrePage } from '@/features/connexion/useTitrePage'
import { useActionsComptes, useComptes } from '@/features/comptes/useComptes'
import { VueComptes } from '@/features/comptes/VueComptes'
import { useCompteConnecte } from '@/features/session/contexte'
import { gereLOutil } from '@/lib/metier/droits'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * `/comptes`, écran 13 « Ministères et comptes » (lot L1), pour EJP Tech, qui gère, et
 * l'administration de l'église, qui lit sans aucun bouton (décision T60) : `PageApplication`
 * donne la page non disponible aux autres profils, sans requête. Les lectures passent par la RLS
 * (`v_etat_comptes` ne rend rien aux autres profils), les écritures par les cinq Edge Functions
 * de comptes, qui n'acceptent qu'EJP Tech.
 */
export function PageComptes({ titre }: ProprietesPage) {
  useTitrePage(titre)
  const compte = useCompteConnecte()
  const donnees = useComptes()
  const actions = useActionsComptes()
  return (
    <VueComptes
      titre={titre}
      donnees={donnees}
      actions={actions}
      lectureSeule={!gereLOutil(compte.type)}
      moi={compte.id}
    />
  )
}
