import { useEffect } from 'react'
import { EcranCompteDesactive } from '@/features/connexion/EcranCompteDesactive'
import { quitterSessionDesactivee } from '@/features/session/actions'

/**
 * /compte-desactive : message, puis signOut({ scope: 'local' }) (BRIEF section 8, routage selon
 * le niveau). Sans session, le message reste simplement affiché.
 */
export function PageCompteDesactive() {
  useEffect(() => {
    void quitterSessionDesactivee()
  }, [])

  return <EcranCompteDesactive />
}
