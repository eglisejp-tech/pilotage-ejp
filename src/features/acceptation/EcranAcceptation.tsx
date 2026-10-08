import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { schemaAcceptation } from '@/features/acceptation/schemas'
import { BandeauErreur } from '@/features/connexion/BandeauErreur'
import { BoutonLien } from '@/features/connexion/BoutonLien'
import { BoutonPrincipal } from '@/features/connexion/BoutonPrincipal'
import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { dateDeVersionConditions } from '@/lib/metier/dateConditions'

export type ProprietesEcranAcceptation = {
  /** Libellé du compte connecté (« Ministère Communication »), jamais le nom d'une personne. */
  libelleCompte: string
  /** Version des conditions affichée, AAAA-MM-JJ. */
  version: string
  onAccept: () => void
  onSignOut: () => void
  enCours?: boolean
  /** Message du bandeau (échec de l'enregistrement), remis à undefined à chaque nouvel envoi. */
  erreur?: string
}

const lienTexte =
  'inline-flex min-h-cible items-center self-start text-[15px] text-nuit underline underline-offset-4'

/**
 * Écran « Conditions d'utilisation » (décision T53, sans maquette : il suit les écrans 16 à 18).
 * Les conditions sont acceptées ; la politique de confidentialité est seulement lue (jamais un
 * consentement). Pas de « Refuser » : « Se déconnecter » reste l'unique autre sortie.
 */
export function EcranAcceptation({
  libelleCompte,
  version,
  onAccept,
  onSignOut,
  enCours = false,
  erreur,
}: ProprietesEcranAcceptation) {
  useTitrePage("Conditions d'utilisation")
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schemaAcceptation),
    defaultValues: { accepte: false },
  })
  const bandeau = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (erreur) bandeau.current?.focus()
  }, [erreur])

  const envoyer = handleSubmit(() => {
    if (!enCours) onAccept()
  })
  const message = errors.accepte?.message

  return (
    <ColonneConnexion>
      <TitreConnexion surtitre={libelleCompte} titre="Conditions d'utilisation" taille="moyenne">
        Avant d'ouvrir l'outil, lisez les conditions d'utilisation et la politique de
        confidentialité.
      </TitreConnexion>

      <p className="text-sm text-encre-3">Conditions du {dateDeVersionConditions(version)}</p>

      <div className="flex flex-col">
        <a href="/conditions" target="_blank" rel="noopener noreferrer" className={lienTexte}>
          Lire les conditions d'utilisation (nouvel onglet)
        </a>
        <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className={lienTexte}>
          Lire la politique de confidentialité (nouvel onglet)
        </a>
      </div>

      <form noValidate onSubmit={envoyer} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="flex min-h-cible items-start gap-3 text-[15px] leading-normal">
            <input
              type="checkbox"
              aria-invalid={message ? true : undefined}
              aria-describedby={message ? 'acceptation-erreur' : undefined}
              className="mt-0.5 size-6 shrink-0 accent-encre"
              {...register('accepte')}
            />
            J'accepte les conditions d'utilisation et j'ai pris connaissance de la politique de
            confidentialité
          </label>
          {message ? (
            <p id="acceptation-erreur" className="text-[15px] leading-normal text-alerte">
              {message}
            </p>
          ) : null}
        </div>
        {erreur ? (
          <BandeauErreur id="acceptation-bandeau" ref={bandeau}>
            {erreur}
          </BandeauErreur>
        ) : null}
        <BoutonPrincipal enCours={enCours} libelleEnCours="Enregistrement en cours">
          Accepter et continuer
        </BoutonPrincipal>
      </form>

      <BoutonLien onClick={onSignOut}>Se déconnecter</BoutonLien>
    </ColonneConnexion>
  )
}
