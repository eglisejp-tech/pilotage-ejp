import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { LibelleEnvoi } from '@/components/etats/LibelleEnvoi'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { FenetreFermerSansEnregistrer } from '@/features/saisie/FenetreFermerSansEnregistrer'
import { ChampTexteLibre } from '@/features/signalement/ChampTexteLibre'
import { lireRefusGeste } from '@/features/signalement/refusSuivi'
import type { RefusGeste } from '@/features/signalement/refusSuivi'
import { longueurEnCaracteres, schemaFormulaireReponse } from '@/features/signalement/schemas'
import type {
  FormulaireReponse as ValeursValidees,
  ValeursFormulaireReponse,
} from '@/features/signalement/schemas'
import { TEXTES_REPONSE } from '@/features/signalement/textes'

export interface ProprietesFormulaireReponse {
  /** Identifiant du champ (un panneau par signalement). */
  id: string
  /** « Votre réponse à EJP Tech », « Votre réponse à Coordination », « Réponse au ministère ». */
  libelle: string
  /** Ce qu'on attend du texte, entre le libellé et le champ. */
  aide?: string
  /** Sous le champ : qui lit la réponse, et où. */
  note?: string
  /** « Envoyer la réponse » ou « Clore le signalement », et son libellé pendant l'envoi. */
  boutonEnvoyer?: string
  boutonEnCours?: string
  /** L'appel à la base ; un refus revient en exception. */
  envoyer: (texte: string) => Promise<void>
  /** Réponse enregistrée : le parent annonce la réussite et déplace le focus. */
  surEnvoye: () => void
  /** Le signalement a changé entre-temps : le parent dit le message et relit la liste. */
  surChange: (message: string) => void
  onAnnuler: () => void
}

/**
 * Petit panneau de réponse du suivi (T77), sous un signalement : « Répondre à EJP Tech » (le
 * ministère), « Répondre au ministère » et « Clore le signalement » (EJP Tech). Un seul champ libre,
 * obligatoire (10 à 280 caractères), avec le rappel sur les données personnelles dessous et le
 * compteur ; le focus y entre à l'ouverture. Un refus du texte se dit sous le champ, texte gardé ;
 * la connexion perdue sous le bouton ; un signalement qui a changé, par le parent. « Annuler » avec
 * un texte écrit demande d'abord « Fermer sans enregistrer ? » (guide 10.7).
 */
export function FormulaireReponse({
  id,
  libelle,
  aide,
  note,
  boutonEnvoyer = TEXTES_REPONSE.boutonEnvoyer,
  boutonEnCours = TEXTES_REPONSE.boutonEnCours,
  envoyer,
  surEnvoye,
  surChange,
  onAnnuler,
}: ProprietesFormulaireReponse) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ValeursFormulaireReponse, unknown, ValeursValidees>({
    resolver: zodResolver(schemaFormulaireReponse),
    defaultValues: { texte: '' },
  })
  const texte = useWatch({ control, name: 'texte' })
  const [refus, setRefus] = useState<RefusGeste | null>(null)
  const [garde, setGarde] = useState(false)

  const annuler = () => {
    if (texte.trim() === '') onAnnuler()
    else setGarde(true)
  }

  // Le panneau s'ouvre sur son champ : le focus y va tout de suite.
  useEffect(() => {
    setFocus('texte')
  }, [setFocus])

  const soumettre = handleSubmit(async (valeurs) => {
    setRefus(null)
    try {
      await envoyer(valeurs.texte)
      surEnvoye()
    } catch (erreur) {
      const lu = lireRefusGeste(erreur)
      if (lu.ou === 'champ') setError('texte', { message: lu.message }, { shouldFocus: true })
      else if (lu.ou === 'bouton' && lu.relire) surChange(lu.message)
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
        libelle={libelle}
        note={aide}
        longueur={longueurEnCaracteres(texte)}
        avecRappel
        autoComplete="off"
        erreur={errors.texte?.message}
        {...register('texte')}
      />
      {note ? <p className="text-sm leading-normal text-encre-2">{note}</p> : null}
      <div className="flex flex-wrap gap-3 max-tablette:flex-col">
        <button
          type="submit"
          aria-disabled={isSubmitting ? true : undefined}
          className="inline-flex min-h-cible items-center justify-center bg-encre px-4 text-[15px] font-semibold text-papier aria-disabled:cursor-wait"
        >
          <LibelleEnvoi enCours={isSubmitting} libelleEnCours={boutonEnCours}>
            {boutonEnvoyer}
          </LibelleEnvoi>
        </button>
        <button
          type="button"
          onClick={annuler}
          className="inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-4 text-[15px] font-semibold text-encre hover:bg-fond"
        >
          {TEXTES_REPONSE.boutonAnnuler}
        </button>
      </div>
      {refus?.ou === 'connexion' ? <ErreurFormulaire objet="saisie" /> : null}
      {refus?.ou === 'bouton' ? <ErreurFormulaire message={refus.message} /> : null}
      {garde ? (
        <FenetreFermerSansEnregistrer
          onFermer={() => {
            setGarde(false)
            onAnnuler()
          }}
          onContinuer={() => setGarde(false)}
        />
      ) : null}
    </form>
  )
}
