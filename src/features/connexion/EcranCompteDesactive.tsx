import { adressesConnexion } from '@/features/connexion/adresses'
import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { Lien } from '@/features/connexion/Lien'
import { messagesConnexion } from '@/features/connexion/messages'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'

export type ProprietesEcranCompteDesactive = {
  lienConnexion?: string
}

/**
 * Compte désactivé ou sans ligne `compte` (BRIEF section 8, routage selon le niveau). L'étape 2
 * appelle ensuite signOut({ scope: 'local' }) : le lien ramène à la connexion.
 */
export function EcranCompteDesactive({
  lienConnexion = adressesConnexion.connexion,
}: ProprietesEcranCompteDesactive) {
  useTitrePage('Compte désactivé')

  return (
    <ColonneConnexion>
      <TitreConnexion surtitre="Église des Jeunes Prodiges" titre="Compte désactivé">
        {messagesConnexion.compteDesactive}
      </TitreConnexion>
      <Lien to={lienConnexion}>Revenir à la connexion</Lien>
    </ColonneConnexion>
  )
}
