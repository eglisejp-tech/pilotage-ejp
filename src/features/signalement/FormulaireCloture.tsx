import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { ChampTexteLibre } from '@/features/signalement/ChampTexteLibre'
import { estDejaClos, lireRefusSignalement } from '@/features/signalement/refus'
import type { RefusSignalement } from '@/features/signalement/refus'
import { longueurEnCaracteres, schemaFormulaireCloture } from '@/features/signalement/schemas'
import type {
  Cloture,
  FormulaireCloture as ValeursValidees,
  ValeursFormulaireCloture,
} from '@/features/signalement/schemas'
import { MESSAGES_BASE_SIGNALEMENT, TEXTES_BLOC_SIGNALEMENTS } from '@/features/signalement/textes'

export interface ProprietesFormulaireCloture {
  /** Identifiant du champ (un formulaire par ligne ouverte). */
  id: string
  signalementId: string
  cloturer: (cloture: Cloture) => Promise<void>
  /** Clôture enregistrée : la ligne passe dans les clos. */
  surClos: () => void
  /** La base dit « Ce signalement est déjà clos. » : le bloc le dit et relit la liste. */
  surDejaClos: (message: string) => void
  onAnnuler: () => void
}

/**
 * Petit panneau « Clore le signalement » (BRIEF, « Modération ») : commentaire facultatif (10 à
 * 280 caractères, rappel en dessous, premier champ libre), « Une clôture est définitive. », puis
 * « Clore définitivement ». Un refus du commentaire se dit sous le champ ; la connexion perdue
 * sous le bouton, commentaire gardé.
 */
export function FormulaireCloture({
  id,
  signalementId,
  cloturer,
  surClos,
  surDejaClos,
  onAnnuler,
}: ProprietesFormulaireCloture) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ValeursFormulaireCloture, unknown, ValeursValidees>({
    resolver: zodResolver(schemaFormulaireCloture),
    defaultValues: { commentaire: '' },
  })
  const commentaire = useWatch({ control, name: 'commentaire' })
  const [refus, setRefus] = useState<RefusSignalement | null>(null)

  // Le panneau s'ouvre sur le commentaire : le focus y va tout de suite.
  useEffect(() => {
    setFocus('commentaire')
  }, [setFocus])

  const soumettre = handleSubmit(async (valeurs) => {
    setRefus(null)
    try {
      await cloturer({ signalementId, commentaire: valeurs.commentaire })
      surClos()
    } catch (erreur) {
      const lu = lireRefusSignalement(erreur)
      if (estDejaClos(lu)) surDejaClos(MESSAGES_BASE_SIGNALEMENT.dejaClos)
      else if (lu.ou === 'champ')
        setError('commentaire', { message: lu.message }, { shouldFocus: true })
      else setRefus(lu)
    }
  })

  return (
    <form
      noValidate
      className="flex flex-col gap-4 border-t border-filet pt-4"
      onSubmit={(evenement) => {
        if (isSubmitting) {
          evenement.preventDefault()
          return
        }
        void soumettre(evenement)
      }}
    >
      <ChampTexteLibre
        id={id}
        libelle={TEXTES_BLOC_SIGNALEMENTS.libelleCommentaire}
        note={TEXTES_BLOC_SIGNALEMENTS.noteCommentaire}
        longueur={longueurEnCaracteres(commentaire)}
        avecRappel
        autoComplete="off"
        erreur={errors.commentaire?.message}
        {...register('commentaire')}
      />
      <p className="text-sm text-encre-2">{TEXTES_BLOC_SIGNALEMENTS.noteDefinitive}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          aria-disabled={isSubmitting ? true : undefined}
          className="inline-flex min-h-cible items-center bg-encre px-4 text-[15px] font-semibold text-papier aria-disabled:cursor-wait"
        >
          {isSubmitting
            ? TEXTES_BLOC_SIGNALEMENTS.boutonEnCours
            : TEXTES_BLOC_SIGNALEMENTS.boutonConfirmer}
        </button>
        <button
          type="button"
          onClick={onAnnuler}
          className="inline-flex min-h-cible items-center border border-encre bg-papier px-4 text-[15px] font-semibold text-encre hover:bg-fond"
        >
          {TEXTES_BLOC_SIGNALEMENTS.boutonAnnuler}
        </button>
      </div>
      {refus?.ou === 'connexion' ? <ErreurFormulaire objet="message" /> : null}
      {refus?.ou === 'bouton' ? <ErreurFormulaire message={refus.message} /> : null}
    </form>
  )
}
