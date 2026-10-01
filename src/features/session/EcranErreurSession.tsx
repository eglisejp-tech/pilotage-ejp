import { useEffect, useRef } from 'react'
import { BandeauErreur } from '@/features/connexion/BandeauErreur'
import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { messagesConnexion } from '@/features/connexion/messages'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'

type Proprietes = {
  onRetry: () => void
  enCours: boolean
}

/** La session n'a pas pu être lue (réseau, serveur) : bandeau et « Réessayer ». */
export function EcranErreurSession({ onRetry, enCours }: Proprietes) {
  useTitrePage('Connexion impossible')
  const bandeau = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bandeau.current?.focus()
  }, [])

  return (
    <ColonneConnexion>
      <TitreConnexion surtitre="Église des Jeunes Prodiges" titre="Pilotage EJP">
        Vos informations de connexion n'ont pas pu être vérifiées.
      </TitreConnexion>
      <BandeauErreur id="session-erreur" ref={bandeau}>
        {messagesConnexion.echecReseau}
      </BandeauErreur>
      <button
        type="button"
        aria-disabled={enCours || undefined}
        onClick={() => {
          if (!enCours) onRetry()
        }}
        className="min-h-14 w-full bg-lumiere px-4.5 text-[15px] font-semibold text-encre aria-disabled:cursor-wait"
      >
        {enCours ? 'Nouvel essai en cours' : 'Réessayer'}
      </button>
    </ColonneConnexion>
  )
}
