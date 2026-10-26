import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useForm, useWatch } from 'react-hook-form'
import type { EtatAvantRetrait } from '@/data/validationIndicateurs'
import { lireRefusRetrait } from '@/features/mes-indicateurs/refus'
import type { RefusSuggestion } from '@/features/mes-indicateurs/refus'
import { schemaFormulaireRetrait } from '@/features/mes-indicateurs/schemas'
import type {
  FormulaireRetrait,
  ValeursFormulaireRetrait,
} from '@/features/mes-indicateurs/schemas'
import {
  LONGUEUR_MAX_MOTIF_RETRAIT,
  TEXTES_RETRAIT,
  titreRetrait,
} from '@/features/mes-indicateurs/textes'
import { Compteur } from '@/features/saisie/Compteur'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { usePiegeFocus } from '@/features/saisie/usePiegeFocus'
import { longueurEnCaracteres } from '@/lib/metier/texte'

interface Props {
  /** Le nom de l'indicateur, pour le titre. */
  libelle: string
  /** Vrai : un ajout à valider (« Retirer la demande ») ; faux : un ajout validé (« Retirer »). */
  demande: boolean
  /**
   * L'appel à `retirer_mon_indicateur`. Un refus s'affiche dans la fenêtre, qui reste ouverte. Rend
   * l'état de l'ajout au moment du retrait, relu dans la base (null s'il n'a pas pu être relu).
   */
  retirer: (motif: string) => Promise<EtatAvantRetrait | null>
  /**
   * Retrait écrit : le parent ferme la fenêtre et annonce la réussite, d'après l'état relu (EJP
   * Tech a pu valider la demande pendant que la fenêtre était ouverte).
   */
  onFait: (etatAvant: EtatAvantRetrait | null) => void
  onAnnuler: () => void
}

/**
 * Fenêtre « Retirer la demande « Projets en cours » ? » ou « Retirer « Demandes reçues » ? » de
 * « Mes indicateurs » (T62) : le champ « Pourquoi le retirer ? » (10 à 280 caractères, compteur)
 * avec dessous le rappel sur les données personnelles, ce qui arrive à l'indicateur et qui lira le
 * motif, puis le bouton qui retire. Fenêtre modale : le focus y reste, Échap annule, le focus
 * revient au bouton d'origine à la fermeture. Un refus du motif par la base se dit sous le champ ;
 * tout autre refus (déjà retiré, source d'un calcul, connexion) sous les boutons, motif gardé.
 */
export function FenetreRetrait({ libelle, demande, retirer, onFait, onAnnuler }: Props) {
  const idTitre = useId()
  const idContexte = useId()
  const idChamp = useId()
  const idRappel = `${idChamp}-rappel`
  const idCompteur = `${idChamp}-compteur`
  const idErreur = `${idChamp}-erreur`
  const fenetre = useRef<HTMLDivElement>(null)
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ValeursFormulaireRetrait, unknown, FormulaireRetrait>({
    resolver: zodResolver(schemaFormulaireRetrait),
    defaultValues: { motif: '' },
  })
  const motif = useWatch({ control, name: 'motif' })
  const [refus, setRefus] = useState<RefusSuggestion | null>(null)
  usePiegeFocus(fenetre, true, () => {
    if (!isSubmitting) onAnnuler()
  })

  // La page ne défile plus derrière la fenêtre.
  useEffect(() => {
    const avant = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = avant
    }
  }, [])

  const soumettre = handleSubmit(async (valeurs) => {
    setRefus(null)
    try {
      onFait(await retirer(valeurs.motif))
    } catch (erreur) {
      const lu = lireRefusRetrait(erreur)
      if (lu.ou === 'champ') setError('motif', { message: lu.message }, { shouldFocus: true })
      else setRefus(lu)
    }
  })

  const erreurMotif = errors.motif?.message
  const decritPar = [idRappel, idCompteur, erreurMotif ? idErreur : ''].filter(Boolean).join(' ')
  const action = demande ? TEXTES_RETRAIT.retirerDemande : TEXTES_RETRAIT.retirer

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-encre/50" />
      <div
        ref={fenetre}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        aria-describedby={idContexte}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-[520px] flex-col gap-5 overflow-y-auto border border-filet bg-papier p-6 outline-hidden"
      >
        <h2
          id={idTitre}
          className="font-lecture text-[28px] leading-tight font-medium wrap-anywhere"
        >
          {titreRetrait(libelle, demande)}
        </h2>

        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(evenement) => {
            if (isSubmitting) {
              evenement.preventDefault()
              return
            }
            void soumettre(evenement)
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor={idChamp} className="text-[15px] font-semibold">
              {TEXTES_RETRAIT.libelleChamp}
            </label>
            <textarea
              {...register('motif')}
              id={idChamp}
              rows={4}
              autoComplete="off"
              aria-invalid={erreurMotif ? true : undefined}
              aria-describedby={decritPar}
              className="min-h-28 w-full min-w-0 resize-y border border-encre bg-papier px-3.5 py-3 text-base leading-normal text-encre aria-invalid:border-2 aria-invalid:border-alerte"
            />
            <p id={idRappel} className="text-sm leading-normal text-encre-3">
              {TEXTES_RETRAIT.rappel}
            </p>
            <Compteur
              id={idCompteur}
              valeur={longueurEnCaracteres(motif)}
              max={LONGUEUR_MAX_MOTIF_RETRAIT}
            />
            {erreurMotif ? (
              <p id={idErreur} className="text-[15px] leading-normal text-alerte">
                {erreurMotif}
              </p>
            ) : null}
          </div>

          <p id={idContexte} className="leading-normal text-encre-2">
            {demande ? TEXTES_RETRAIT.consequenceDemande : TEXTES_RETRAIT.consequenceAjout}{' '}
            {TEXTES_RETRAIT.lecteurMotif}
          </p>

          <div className="flex flex-col-reverse gap-2 min-[480px]:flex-row min-[480px]:justify-end">
            <button
              type="button"
              onClick={() => {
                if (!isSubmitting) onAnnuler()
              }}
              aria-disabled={isSubmitting ? true : undefined}
              className="inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-4.5 text-[15px] font-semibold text-encre hover:bg-fond"
            >
              {TEXTES_RETRAIT.annuler}
            </button>
            <button
              type="submit"
              aria-disabled={isSubmitting ? true : undefined}
              className="inline-flex min-h-cible items-center justify-center bg-encre px-4.5 text-[15px] font-semibold text-papier aria-disabled:cursor-wait"
            >
              {isSubmitting ? TEXTES_RETRAIT.enCours : action}
            </button>
          </div>
          {refus?.ou === 'bouton' ? (
            <ErreurFormulaire message={refus.message} reference={refus.reference} />
          ) : null}
        </form>
      </div>
    </div>,
    document.body,
  )
}
