import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { adressesConnexion } from '@/features/connexion/adresses'
import { BandeauErreur } from '@/features/connexion/BandeauErreur'
import { BoutonPrincipal } from '@/features/connexion/BoutonPrincipal'
import { ChampTexte } from '@/features/connexion/ChampTexte'
import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { Lien } from '@/features/connexion/Lien'
import { messagesConnexion } from '@/features/connexion/messages'
import { schemaMotDePasseOublie } from '@/features/connexion/schemas'
import type { ValeursMotDePasseOublie } from '@/features/connexion/schemas'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'

export type ProprietesEcranMotDePasseOublie = {
  /** Adresse valide (étape 2 : resetPasswordForEmail). */
  onSubmit: (valeurs: ValeursMotDePasseOublie) => void
  enCours?: boolean
  /** Message du bandeau (messagesConnexion), remis à undefined à chaque nouvel envoi. */
  erreur?: string
  /** Demande envoyée : toujours le même message, qu'un compte existe ou non. */
  envoye?: boolean
  lienConnexion?: string
}

/** Écran non dessiné « Mot de passe oublié » (lien de l'écran 16, BRIEF section 8). */
export function EcranMotDePasseOublie({
  onSubmit,
  enCours = false,
  erreur,
  envoye = false,
  lienConnexion = adressesConnexion.connexion,
}: ProprietesEcranMotDePasseOublie) {
  useTitrePage('Mot de passe oublié')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schemaMotDePasseOublie),
    defaultValues: { email: '' },
  })
  const bandeau = useRef<HTMLDivElement>(null)
  const confirmation = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (erreur) bandeau.current?.focus()
  }, [erreur])

  // Le formulaire disparaît après l'envoi : le focus passe au message qui le remplace.
  useEffect(() => {
    if (envoye) confirmation.current?.focus()
  }, [envoye])

  const envoyer = handleSubmit((valeurs) => {
    if (!enCours) onSubmit(valeurs)
  })

  return (
    <ColonneConnexion>
      <TitreConnexion surtitre="Église des Jeunes Prodiges" titre="Mot de passe oublié">
        Saisissez l'adresse de votre compte. Vous recevrez un lien pour choisir un nouveau mot de
        passe.
      </TitreConnexion>

      {envoye ? (
        <p
          ref={confirmation}
          role="status"
          tabIndex={-1}
          className="bg-nuit-pale px-4 py-3.5 text-[15px] leading-normal text-encre focus-visible:outline-hidden"
        >
          {messagesConnexion.lienEnvoye}
        </p>
      ) : (
        <form noValidate onSubmit={envoyer} className="flex flex-col gap-6">
          <ChampTexte
            id="oubli-email"
            libelle="Email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            erreur={errors.email?.message}
            {...register('email')}
          />
          {erreur ? (
            <BandeauErreur id="oubli-bandeau" ref={bandeau}>
              {erreur}
            </BandeauErreur>
          ) : null}
          <BoutonPrincipal enCours={enCours} libelleEnCours="Envoi en cours">
            Recevoir un lien
          </BoutonPrincipal>
        </form>
      )}

      <Lien to={lienConnexion}>Revenir à la connexion</Lien>
    </ColonneConnexion>
  )
}
