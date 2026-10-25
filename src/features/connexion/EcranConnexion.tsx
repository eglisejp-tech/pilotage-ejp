import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
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
import { MessageReussite } from '@/features/saisie/MessageReussite'

export type ProprietesEcranConnexion = {
  /** « Continuer avec Google » (étape 2 : signInWithOAuth). */
  onGoogle: () => void
  /** Email et mot de passe valides (étape 2 : signInWithPassword). */
  onSubmit: (valeurs: ValeursConnexion) => void
  /** Action en cours : redirection vers Google ou vérification du mot de passe. */
  enCours?: 'google' | 'mot-de-passe'
  /** Message du bandeau (messagesConnexion), remis à undefined à chaque nouvel envoi. */
  erreur?: string
  /** Confirmation sous le titre, sans alerte (« Compte déconnecté. », m060). */
  information?: string
  lienMotDePasseOublie?: string
  lienConfidentialite?: string
  lienConditions?: string
  /** Les autres comptes ouverts sur l'appareil (T73), sous le titre : « Revenir à ... ». */
  autresEspaces?: ReactNode
}

/** Écran 16 : Google ou email et mot de passe. Pas d'inscription : l'église crée les comptes. */
export function EcranConnexion({
  onGoogle,
  onSubmit,
  enCours,
  erreur,
  information,
  lienMotDePasseOublie = adressesConnexion.motDePasseOublie,
  lienConfidentialite = adressesConnexion.confidentialite,
  lienConditions = adressesConnexion.conditions,
  autresEspaces,
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

  // « Compte déconnecté. » (m060) : la région `status` existe d'abord vide, et le message y entre
  // juste après, pour qu'un lecteur d'écran l'annonce (une région ajoutée avec son texte ne l'est
  // pas toujours). Visible 6 secondes, comme toute réussite (MessageReussite).
  const [informationPrete, setInformationPrete] = useState<string>()
  useEffect(() => {
    if (!information) return
    const minuterie = window.setTimeout(() => setInformationPrete(information), 0)
    return () => window.clearTimeout(minuterie)
  }, [information])

  const envoyer = handleSubmit((valeurs) => {
    if (!occupe) onSubmit(valeurs)
  })

  return (
    <ColonneConnexion>
      <TitreConnexion surtitre="Église des Jeunes Prodiges" titre="Pilotage EJP">
        Connectez-vous avec l'adresse de votre ministère ou votre adresse personnelle.
      </TitreConnexion>

      {information ? (
        // Une fois le message masqué, la région vide ne prend pas de place dans la colonne : une
        // marge négative annule son écart.
        <div className="-mb-6 has-[p]:mb-0">
          <MessageReussite message={informationPrete === information ? information : null} />
        </div>
      ) : null}

      {autresEspaces}

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

      {/* T66 (t002 à t004) : le lien se comprend seul, sur sa ligne ; la double authentification
          s'annonce sur l'écran suivant. La marge négative compense la cible de 44 px du lien. */}
      <div className="-mt-3 flex flex-col gap-1">
        <Lien to={lienMotDePasseOublie}>Mot de passe oublié</Lien>
        <p className="text-sm leading-[1.55] text-encre-3">
          Pas de compte&nbsp;? Demandez-en un à EJP Tech.
        </p>
      </div>

      <div className="flex flex-wrap gap-x-6">
        <Lien to={lienConfidentialite}>Confidentialité</Lien>
        <Lien to={lienConditions}>Conditions d'utilisation</Lien>
      </div>
    </ColonneConnexion>
  )
}
