import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { schemaAcceptation } from '@/features/acceptation/schemas'
import { BandeauErreur } from '@/features/connexion/BandeauErreur'
import { BoutonLien } from '@/features/connexion/BoutonLien'
import { BoutonPrincipal } from '@/features/connexion/BoutonPrincipal'
import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import type { Personne } from '@/features/declaration/PersonneDeclaree'
import { TEXTES_EN_TETE_PERSONNE } from '@/features/declaration/textes'
import { dateDeVersionConditions } from '@/lib/metier/dateConditions'

/** Phrase d'un compte partagé (T61), suivie de « Vous : Marie » dans le même paragraphe. */
export const PHRASE_ACCEPTATION_PERSONNE = 'Chaque personne du compte accepte elle-même.'

export type ProprietesEcranAcceptation = {
  /** Libellé du compte connecté (« Ministère Communication »), jamais le nom d'une personne. */
  libelleCompte: string
  /**
   * Compte de ministère (T61) : la personne déclarée sur cet appareil, qui accepte elle-même, et
   * l'adresse de « Ce n'est pas moi ». Absente pour un compte non partagé.
   */
  personne?: Personne
  /** Version des conditions affichée, AAAA-MM-JJ. */
  version: string
  onAccept: () => void
  onSignOut: () => void
  enCours?: boolean
  /** Message du bandeau (échec de l'enregistrement), remis à undefined à chaque nouvel envoi. */
  erreur?: string
  /** Réussite de l'étape précédente (« Double authentification activée. »), en tête de l'écran. */
  annonce?: ReactNode
  /**
   * Le compte avait accepté une version précédente : l'écran dit pourquoi il revient (m056). La
   * lecture de cette acceptation précédente reste à écrire dans `src/data/conditions.ts`.
   */
  conditionsChangees?: boolean
}

const lienTexte =
  'inline-flex min-h-cible items-center self-start text-interface text-nuit underline underline-offset-4'

/**
 * Écran « Conditions d'utilisation » (décision T53, sans maquette : il suit les écrans 16 à 18).
 * Les conditions sont acceptées ; la politique de confidentialité est seulement lue (jamais un
 * consentement). Pas de « Refuser » : « Se déconnecter » reste l'unique autre sortie. Sur un
 * compte de ministère, la personne déclarée accepte elle-même (T61) : l'écran dit qui elle est,
 * avec « Ce n'est pas moi » si l'appareil a changé de mains.
 */
export function EcranAcceptation({
  libelleCompte,
  personne,
  version,
  onAccept,
  onSignOut,
  enCours = false,
  erreur,
  annonce,
  conditionsChangees = false,
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
      {annonce}
      {/* Les liens et la case suffisent : pas de phrase sous le titre (T66, t037). */}
      <TitreConnexion surtitre={libelleCompte} titre="Conditions d'utilisation" taille="moyenne" />
      {/* Un encadré blanc à filet fin, sans barre sur son bord (proposition 10, T69). */}
      {conditionsChangees ? (
        <p className="border border-filet bg-papier px-3.5 py-3 text-interface leading-normal text-encre">
          Les conditions ont changé. Lisez-les avant de continuer.
        </p>
      ) : null}

      {personne ? (
        // Un seul paragraphe (« Vous : Marie D. » sur sa propre ligne), puis « Ce n'est pas moi »
        // dessiné comme les liens de lecture : la sortie de la mauvaise personne se voit autant
        // qu'eux.
        <div className="flex flex-col">
          <p className="text-interface leading-normal wrap-anywhere">
            {PHRASE_ACCEPTATION_PERSONNE}{' '}
            <span className="block">{TEXTES_EN_TETE_PERSONNE.vous(personne.prenom)}</span>
          </p>
          <Link to={personne.lienChangement} className={lienTexte}>
            {TEXTES_EN_TETE_PERSONNE.pasMoi}
          </Link>
        </div>
      ) : null}

      {/* La version, en petit sous les liens de lecture : ce que la case accepte. */}
      <div className="flex flex-col">
        <a href="/conditions" target="_blank" rel="noopener noreferrer" className={lienTexte}>
          Lire les conditions d'utilisation (nouvel onglet)
        </a>
        <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className={lienTexte}>
          Lire la politique de confidentialité (nouvel onglet)
        </a>
        <p className="text-detail text-encre-3">Conditions du {dateDeVersionConditions(version)}</p>
      </div>

      <form noValidate onSubmit={envoyer} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="flex min-h-cible items-start gap-3 text-interface leading-normal">
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
            <p id="acceptation-erreur" className="text-interface leading-normal text-alerte">
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
