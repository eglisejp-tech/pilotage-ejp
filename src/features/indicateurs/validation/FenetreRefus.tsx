import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useForm, useWatch } from 'react-hook-form'
import { lireRefusValidation } from '@/features/indicateurs/validation/refus'
import type { RefusValidation } from '@/features/indicateurs/validation/refus'
import { schemaFormulaireRefus } from '@/features/indicateurs/validation/schemas'
import type {
  FormulaireRefus,
  ValeursFormulaireRefus,
} from '@/features/indicateurs/validation/schemas'
import {
  LONGUEUR_MAX_MOTIF,
  TEXTES_FENETRE_REFUS,
  titreRefus,
} from '@/features/indicateurs/validation/textes'
import { Compteur } from '@/features/saisie/Compteur'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { usePiegeFocus } from '@/features/saisie/usePiegeFocus'
import { longueurEnCaracteres } from '@/lib/metier/texte'

interface Props {
  /** Le ministère qui lira le motif : « Communication ». */
  ministere: string
  /** Le nom de l'indicateur refusé, pour le titre. */
  libelle: string
  /** L'appel à `valider_indicateur`. Un refus s'affiche dans la fenêtre, qui reste ouverte. */
  refuser: (motif: string) => Promise<void>
  /** Refus écrit : la fenêtre se ferme par le parent, qui annonce « Indicateur refusé. ». */
  onFait: () => void
  /**
   * La base refuse la demande elle-même (déjà décidée, retirée) : la liste se relit et la ligne
   * disparaît avec la fenêtre, le parent ferme donc la fenêtre et garde le message à sa place.
   */
  onRefusDeDemande: (message: string) => void
  onAnnuler: () => void
}

/**
 * Fenêtre « Refuser « Demandes reçues » ? » (validation-metier.md, 5.1) : le champ « Pourquoi ce
 * refus ? » (10 à 280 caractères, compteur) avec dessous le rappel sur les données personnelles,
 * une phrase qui dit ce qui arrive à l'indicateur et qui lira le motif, puis « Refuser ». Fenêtre
 * modale : le focus y reste, Échap annule, le focus revient au bouton d'origine à la fermeture. Un
 * refus du motif par la base se dit sous le champ ; la connexion perdue, la connexion expirée ou un
 * refus inattendu sous les boutons, motif gardé.
 */
export function FenetreRefus({
  ministere,
  libelle,
  refuser,
  onFait,
  onRefusDeDemande,
  onAnnuler,
}: Props) {
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
  } = useForm<ValeursFormulaireRefus, unknown, FormulaireRefus>({
    resolver: zodResolver(schemaFormulaireRefus),
    defaultValues: { motif: '' },
  })
  const motif = useWatch({ control, name: 'motif' })
  const [refus, setRefus] = useState<RefusValidation | null>(null)
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
      await refuser(valeurs.motif)
      onFait()
    } catch (erreur) {
      const lu = lireRefusValidation(erreur, { formulaire: true })
      if (lu.ou === 'champ') setError('motif', { message: lu.message }, { shouldFocus: true })
      else if (lu.ou === 'bouton') onRefusDeDemande(lu.message)
      else setRefus(lu)
    }
  })

  const erreurMotif = errors.motif?.message
  const decritPar = [idRappel, idCompteur, erreurMotif ? idErreur : ''].filter(Boolean).join(' ')

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
          {titreRefus(libelle)}
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
              {TEXTES_FENETRE_REFUS.libelleChamp}
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
              {TEXTES_FENETRE_REFUS.rappel}
            </p>
            <Compteur
              id={idCompteur}
              valeur={longueurEnCaracteres(motif)}
              max={LONGUEUR_MAX_MOTIF}
            />
            {erreurMotif ? (
              <p id={idErreur} className="text-[15px] leading-normal text-alerte">
                {erreurMotif}
              </p>
            ) : null}
          </div>

          <p id={idContexte} className="leading-normal text-encre-2">
            {TEXTES_FENETRE_REFUS.consequence(ministere)}
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
              {TEXTES_FENETRE_REFUS.annuler}
            </button>
            <button
              type="submit"
              aria-disabled={isSubmitting ? true : undefined}
              className="inline-flex min-h-cible items-center justify-center bg-encre px-4.5 text-[15px] font-semibold text-papier aria-disabled:cursor-wait"
            >
              {isSubmitting ? TEXTES_FENETRE_REFUS.boutonEnCours : TEXTES_FENETRE_REFUS.bouton}
            </button>
          </div>
          {refus?.ou === 'connexion' ? <ErreurFormulaire objet="saisie" /> : null}
          {refus?.ou === 'formulaire' ? <ErreurFormulaire message={refus.message} /> : null}
        </form>
      </div>
    </div>,
    document.body,
  )
}
