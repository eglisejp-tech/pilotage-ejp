import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { BandeauErreur } from '@/features/connexion/BandeauErreur'
import { BoutonLien } from '@/features/connexion/BoutonLien'
import { BoutonPrincipal } from '@/features/connexion/BoutonPrincipal'
import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { ChampPrenom } from '@/features/declaration/ChampPrenom'
import { TEXTES_DECLARATION } from '@/features/declaration/textes'
import { schemaPrenom } from '@/lib/metier/declaration'

const schemaDeclaration = z.object({ prenom: schemaPrenom })

export type ProprietesEcranDeclaration = {
  /** Libellé du compte connecté (« Ministère Communication »). */
  libelleCompte: string
  /**
   * Rappel du jour (T63) : le prénom de la dernière déclaration de cette connexion, déjà écrit
   * dans le champ ; « Continuer » le confirme. Vide ou absent : le champ part vide.
   */
  prenomPropose?: string
  /** Prénom nettoyé et valide. */
  onDeclare: (prenom: string) => void
  onSignOut: () => void
  /** « Ce n'est pas moi » : l'écran s'ouvre depuis l'outil, « Annuler » y ramène. */
  onCancel?: () => void
  enCours?: boolean
  /** Message du bandeau (échec de l'enregistrement), remis à undefined à chaque nouvel envoi. */
  erreur?: string
}

/**
 * Écran « Qui utilise l'outil ? » (décision T56, sans maquette : il suit les écrans 16 à 18 et
 * l'écran des conditions). Un compte de ministère est partagé : la personne indique son prénom à
 * chaque connexion, à la première ouverture de chaque nouvelle journée (T63 : le prénom de la
 * veille est proposé) et après « Ce n'est pas moi ». Le bouton n'est jamais grisé ; « Se
 * déconnecter » reste l'autre sortie.
 */
export function EcranDeclaration({
  libelleCompte,
  prenomPropose = '',
  onDeclare,
  onSignOut,
  onCancel,
  enCours = false,
  erreur,
}: ProprietesEcranDeclaration) {
  useTitrePage(TEXTES_DECLARATION.titre)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schemaDeclaration),
    defaultValues: { prenom: prenomPropose },
  })
  const bandeau = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (erreur) bandeau.current?.focus()
  }, [erreur])

  const envoyer = handleSubmit(({ prenom }) => {
    if (!enCours) onDeclare(prenom)
  })

  return (
    <ColonneConnexion>
      <TitreConnexion surtitre={libelleCompte} titre={TEXTES_DECLARATION.titre} taille="moyenne">
        {prenomPropose ? TEXTES_DECLARATION.phraseRappel : TEXTES_DECLARATION.phrase}
      </TitreConnexion>

      <form
        noValidate
        onSubmit={envoyer}
        aria-busy={enCours || undefined}
        className="flex flex-col gap-6"
      >
        <ChampPrenom erreur={errors.prenom?.message} {...register('prenom')} />
        {erreur ? (
          <BandeauErreur id="declaration-bandeau" ref={bandeau}>
            {erreur}
          </BandeauErreur>
        ) : null}
        {/* « Annuler » (après « Ce n'est pas moi ») : le retour, en bouton secondaire sous
            « Continuer », distinct des sorties du pied de colonne. */}
        <div className="flex flex-col gap-3">
          <BoutonPrincipal enCours={enCours} libelleEnCours={TEXTES_DECLARATION.enCours}>
            {TEXTES_DECLARATION.continuer}
          </BoutonPrincipal>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-cible w-full border border-encre bg-papier px-4.5 text-[15px] font-semibold text-encre hover:bg-fond"
            >
              {TEXTES_DECLARATION.annuler}
            </button>
          ) : null}
        </div>
      </form>

      {/* Les deux sorties secondaires sur une ligne quand la largeur le permet. */}
      <div className="flex flex-wrap items-center gap-x-6">
        <BoutonLien onClick={onSignOut}>{TEXTES_DECLARATION.seDeconnecter}</BoutonLien>
        <a
          href="/confidentialite"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-cible items-center self-start text-[15px] text-nuit underline underline-offset-4"
        >
          {TEXTES_DECLARATION.lienConfidentialite}{' '}
          <span className="sr-only">{TEXTES_DECLARATION.nouvelOnglet}</span>
        </a>
      </div>
    </ColonneConnexion>
  )
}
