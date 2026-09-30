import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { adressesConnexion } from '@/features/connexion/adresses'
import { BandeauErreur } from '@/features/connexion/BandeauErreur'
import { BoutonGoogle } from '@/features/connexion/BoutonGoogle'
import { BoutonPrincipal } from '@/features/connexion/BoutonPrincipal'
import { ChampTexte } from '@/features/connexion/ChampTexte'
import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { Lien } from '@/features/connexion/Lien'
import { schemaConnexion } from '@/features/connexion/schemas'
import type { ValeursConnexion } from '@/features/connexion/schemas'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'

export type ProprietesEcranConnexion = {
  /** « Continuer avec Google » (étape 2 : signInWithOAuth). */
  onGoogle: () => void
  /** Email et mot de passe valides (étape 2 : signInWithPassword). */
  onSubmit: (valeurs: ValeursConnexion) => void
  /** Action en cours : redirection vers Google ou vérification du mot de passe. */
  enCours?: 'google' | 'mot-de-passe'
  /** Message du bandeau (messagesConnexion), remis à undefined à chaque nouvel envoi. */
  erreur?: string
  lienMotDePasseOublie?: string
  lienConfidentialite?: string
}

/** Écran 16 : Google ou email et mot de passe. Pas d'inscription : l'église crée les comptes. */
export function EcranConnexion({
  onGoogle,
  onSubmit,
  enCours,
  erreur,
  lienMotDePasseOublie = adressesConnexion.motDePasseOublie,
  lienConfidentialite = adressesConnexion.confidentialite,
}: ProprietesEcranConnexion) {
  useTitrePage('Connexion')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schemaConnexion),
    defaultValues: { email: '', motDePasse: '' },
  })
  const bandeau = useRef<HTMLDivElement>(null)
  const occupe = enCours !== undefined

  // Erreur du serveur : le focus va au bandeau, qui résume ce qui ne va pas.
  useEffect(() => {
    if (erreur) bandeau.current?.focus()
  }, [erreur])

  const envoyer = handleSubmit((valeurs) => {
    if (!occupe) onSubmit(valeurs)
  })

  return (
    <ColonneConnexion>
      <TitreConnexion surtitre="Église des Jeunes Prodiges" titre="Pilotage EJP">
        Connectez-vous avec l'adresse de votre ministère ou votre adresse personnelle.
      </TitreConnexion>

      <BoutonGoogle onClick={onGoogle} enCours={enCours === 'google'} occupe={occupe} />

      <div className="flex items-center gap-3 text-sm text-encre-3">
        <span aria-hidden="true" className="h-px flex-1 bg-filet" />
        ou avec votre email
        <span aria-hidden="true" className="h-px flex-1 bg-filet" />
      </div>

      <form noValidate onSubmit={envoyer} className="flex flex-col gap-6">
        <ChampTexte
          id="connexion-email"
          libelle="Email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          erreur={errors.email?.message}
          {...register('email')}
        />
        <ChampTexte
          id="connexion-mot-de-passe"
          libelle="Mot de passe"
          type="password"
          autoComplete="current-password"
          erreur={errors.motDePasse?.message}
          {...register('motDePasse')}
        />
        {erreur ? (
          <BandeauErreur id="connexion-erreur" ref={bandeau}>
            {erreur}
          </BandeauErreur>
        ) : null}
        <BoutonPrincipal enCours={enCours === 'mot-de-passe'} libelleEnCours="Connexion en cours">
          Se connecter
        </BoutonPrincipal>
      </form>

      <p className="text-sm leading-[1.55] text-encre-3">
        Pas de compte&nbsp;? Les comptes sont créés par l'administration de l'église. Mot de passe
        oublié&nbsp;:{' '}
        {/* Lien dans la phrase : la marge intérieure porte la zone cliquable à 44 px sans
            changer la hauteur de ligne. */}
        <Link
          to={lienMotDePasseOublie}
          className="-my-3 inline-block py-3 text-nuit underline underline-offset-2"
        >
          recevoir un lien
        </Link>
        . Un code de double authentification vous sera demandé ensuite.
      </p>

      <Lien to={lienConfidentialite}>Confidentialité</Lien>
    </ColonneConnexion>
  )
}
