import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
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
  /** Prénom nettoyé et valide. */
  onDeclare: (prenom: string) => void
  onSignOut: () => void
  /** « Ce n'est pas moi » : l'écran s'ouvre depuis l'outil, « Annuler » y ramène. */
  onCancel?: () => void
  enCours?: boolean
  /** Message du bandeau (échec de l'enregistrement), remis à undefined à chaque nouvel envoi. */
  erreur?: string
  /**
   * Réussite de l'étape précédente (« Mot de passe enregistré. » après « Mot de passe oublié »,
   * « Double authentification activée. »), en tête de l'écran.
   */
  annonce?: ReactNode
}

/**
 * Écran « Qui utilise l'outil ? » (décision T56, sans maquette : il suit les écrans 16 à 18 et
 * l'écran des conditions). Un compte de ministère est partagé : la personne indique son prénom
 * après la connexion, tous les 7 jours, et après « Ce n'est pas moi ». Le bouton n'est jamais
 * grisé ; « Se déconnecter » reste l'autre sortie.
 */
export function EcranDeclaration({
  libelleCompte,
  onDeclare,
  onSignOut,
  onCancel,
  enCours = false,
  erreur,
  annonce,
}: ProprietesEcranDeclaration) {
  useTitrePage(TEXTES_DECLARATION.titre)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schemaDeclaration),
    defaultValues: { prenom: '' },
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
      {annonce}
      <TitreConnexion surtitre={libelleCompte} titre={TEXTES_DECLARATION.titre} taille="moyenne">
        {TEXTES_DECLARATION.phrase}
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
        <BoutonPrincipal enCours={enCours} libelleEnCours={TEXTES_DECLARATION.enCours}>
          {TEXTES_DECLARATION.continuer}
        </BoutonPrincipal>
      </form>

      <div className="flex flex-col">
        {onCancel ? <BoutonLien onClick={onCancel}>{TEXTES_DECLARATION.annuler}</BoutonLien> : null}
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
