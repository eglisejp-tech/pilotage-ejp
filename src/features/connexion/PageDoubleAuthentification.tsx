import { ActivationConnectee } from '@/features/connexion/ActivationConnectee'
import { CodeConnecte } from '@/features/connexion/CodeConnecte'
import { useEtatVerifie } from '@/features/session/contexte'

/** /double-authentification : 17 si aucun facteur vérifié, sinon 18 (BRIEF section 9). */
export function PageDoubleAuthentification() {
  const etat = useEtatVerifie()
  if (etat.statut === 'activation') return <ActivationConnectee compte={etat.compte} />
  if (etat.statut === 'code') {
    return <CodeConnecte compte={etat.compte} facteurId={etat.facteurId} />
  }
  // La garde de la zone ne laisse passer que ces deux états.
  return null
}
