import { useEffect, useRef } from 'react'
import { estErreurConfiguration, phraseLecture } from '@/data/messagesBase'
import { BandeauErreur } from '@/features/connexion/BandeauErreur'
import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { messagesConnexion } from '@/features/connexion/messages'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'

type Proprietes = {
  onRetry: () => void
  enCours: boolean
  /** L'erreur de la lecture de la session : elle choisit la phrase du bandeau. */
  erreur?: unknown
}

/**
 * La session n'a pas pu être lue : bandeau et « Réessayer ». Réseau : « La connexion a échoué » ;
 * 10 s dépassées : « La réponse met trop de temps » (m252). Un mauvais déploiement (adresse ou
 * clé publique absente, clé secrète fournie) ne se règle pas en réessayant : le bandeau dit de
 * prévenir EJP Tech, sans bouton (m253), et sans la phrase sur les informations de connexion :
 * la panne ne vient pas du compte. Le texte technique reste dans la console, en développement
 * seulement.
 */
export function EcranErreurSession({ onRetry, enCours, erreur }: Proprietes) {
  useTitrePage('Connexion impossible')
  const bandeau = useRef<HTMLDivElement>(null)
  const configuration = estErreurConfiguration(erreur)

  useEffect(() => {
    bandeau.current?.focus()
  }, [])

  useEffect(() => {
    if (configuration && import.meta.env.DEV) console.error(erreur)
  }, [configuration, erreur])

  return (
    <ColonneConnexion>
      <TitreConnexion surtitre="Église des Jeunes Prodiges" titre="Pilotage EJP">
        {configuration ? null : "Vos informations de connexion n'ont pas pu être vérifiées."}
      </TitreConnexion>
      <BandeauErreur id="session-erreur" ref={bandeau}>
        {configuration
          ? messagesConnexion.indisponible
          : phraseLecture(erreur, messagesConnexion.echecReseau)}
      </BandeauErreur>
      {configuration ? null : (
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
      )}
    </ColonneConnexion>
  )
}
