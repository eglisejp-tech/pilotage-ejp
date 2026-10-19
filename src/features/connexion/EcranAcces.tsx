import { useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { adressesConnexion } from '@/features/connexion/adresses'
import { BandeauErreur } from '@/features/connexion/BandeauErreur'
import { BoutonPrincipal } from '@/features/connexion/BoutonPrincipal'
import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { Lien } from '@/features/connexion/Lien'
import { messagesConnexion } from '@/features/connexion/messages'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'

// T66 (t015 à t018) : le titre d'onglet dit le lien reçu, le bouton dit la suite ; la phrase de
// la récupération répétait le bouton.
const TEXTES = {
  invitation: { onglet: 'Invitation', phrase: 'Votre compte est prêt.' },
  recuperation: { onglet: 'Mot de passe oublié', phrase: undefined },
} as const

export type ProprietesEcranAcces = {
  /** Lien reçu par email : `type=invite` ou `type=recovery` dans l'adresse /acces. */
  type: keyof typeof TEXTES
  /** Clic sur « Choisir un mot de passe » (étape 2 : verifyOtp, puis retrait du jeton de l'adresse). Le clic
   * est demandé parce que les antivirus de messagerie ouvrent les liens et consommeraient le
   * jeton à usage unique. */
  onContinue: () => void
  enCours?: boolean
  /** Lien expiré ou déjà utilisé. */
  lienInvalide?: boolean
  /** Autre erreur (réseau), remise à undefined à chaque nouvel essai. */
  erreur?: string
  lienConnexion?: string
  lienMotDePasseOublie?: string
}

/** Page /acces, non dessinée, dans la colonne des écrans 16 à 18 (BRIEF section 8). */
export function EcranAcces({
  type,
  onContinue,
  enCours = false,
  lienInvalide = false,
  erreur,
  lienConnexion = adressesConnexion.connexion,
  lienMotDePasseOublie = adressesConnexion.motDePasseOublie,
}: ProprietesEcranAcces) {
  useTitrePage(lienInvalide ? 'Lien plus valable' : TEXTES[type].onglet)
  const titre = useRef<HTMLHeadingElement>(null)
  const bandeau = useRef<HTMLDivElement>(null)

  // Le bouton disparaît quand le lien est refusé : le focus passe au titre qui l'explique.
  useEffect(() => {
    if (lienInvalide) titre.current?.focus()
  }, [lienInvalide])

  useEffect(() => {
    if (erreur) bandeau.current?.focus()
  }, [erreur])

  function continuer(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    if (!enCours) onContinue()
  }

  if (lienInvalide) {
    return (
      <ColonneConnexion>
        <TitreConnexion
          ref={titre}
          surtitre="Église des Jeunes Prodiges"
          titre={messagesConnexion.lienInvalide}
          taille="moyenne"
        >
          {type === 'invitation' ? messagesConnexion.lienInvalideInvitation : undefined}
        </TitreConnexion>
        {type === 'invitation' ? (
          <Lien to={lienConnexion}>Revenir à la connexion</Lien>
        ) : (
          <Lien to={lienMotDePasseOublie}>Demander un nouveau lien</Lien>
        )}
      </ColonneConnexion>
    )
  }

  return (
    <ColonneConnexion>
      <TitreConnexion surtitre="Église des Jeunes Prodiges" titre="Pilotage EJP">
        {TEXTES[type].phrase}
      </TitreConnexion>
      <form onSubmit={continuer} className="flex flex-col gap-6">
        {erreur ? (
          <BandeauErreur id="acces-bandeau" ref={bandeau}>
            {erreur}
          </BandeauErreur>
        ) : null}
        <BoutonPrincipal enCours={enCours} libelleEnCours="Vérification du lien">
          Choisir un mot de passe
        </BoutonPrincipal>
      </form>
    </ColonneConnexion>
  )
}
