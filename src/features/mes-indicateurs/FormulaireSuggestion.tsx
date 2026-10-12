import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { LibelleAvecAide } from '@/components/aide/LibelleAvecAide'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import type { SuggestionProposee } from '@/features/mes-indicateurs/construire'
import { lireRefusSuggestion } from '@/features/mes-indicateurs/refus'
import type { RefusSuggestion } from '@/features/mes-indicateurs/refus'
import { schemaFormulaireSuggestion } from '@/features/mes-indicateurs/schemas'
import type {
  FormulaireSuggestion as Formulaire,
  ValeursFormulaireSuggestion,
} from '@/features/mes-indicateurs/schemas'
import {
  LONGUEUR_MAX_POURQUOI,
  reussiteSuggestion,
  TEXTES_PANNEAU_AJOUT,
} from '@/features/mes-indicateurs/textes'
import { Compteur } from '@/features/saisie/Compteur'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { longueurEnCaracteres } from '@/lib/metier/texte'

interface Props {
  suggestion: SuggestionProposee
  /** L'appel à `ajouter_suggestion`. Un refus de la base s'affiche dans le formulaire. */
  envoyer: (formulaire: Formulaire) => Promise<void>
  /** Suggestion envoyée : le panneau se ferme par le parent, qui annonce ce message. */
  onFait: (message: string) => void
  /** « Choisir une autre suggestion » : retour à la liste, sans rien envoyer. */
  onAutre: () => void
}

/**
 * Formulaire d'envoi d'une suggestion (configuration-indicateurs.md, 7.3 ; validation-metier.md,
 * 2.2 et 5.2) : le libellé, le rythme et la définition de la suggestion en lecture, puis « Pourquoi
 * cet indicateur ? » (10 à 280 caractères, compteur, aide), sans aucun rappel sur les données
 * personnelles dessous (exception voulue, T30), la phrase « EJP Tech vérifie chaque ajout... » et
 * « Envoyer pour validation ». Un refus du texte par la base se dit sous le champ ; une limite ou
 * la connexion perdue sous le bouton, texte gardé.
 */
export function FormulaireSuggestion({ suggestion, envoyer, onFait, onAutre }: Props) {
  const idChamp = useId()
  const idCompteur = `${idChamp}-compteur`
  const idErreur = `${idChamp}-erreur`
  const idPhrase = `${idChamp}-phrase`
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ValeursFormulaireSuggestion, unknown, Formulaire>({
    resolver: zodResolver(schemaFormulaireSuggestion),
    defaultValues: { pourquoi: '' },
  })
  const pourquoi = useWatch({ control, name: 'pourquoi' })
  const [refus, setRefus] = useState<RefusSuggestion | null>(null)

  const soumettre = handleSubmit(async (formulaire) => {
    setRefus(null)
    try {
      await envoyer(formulaire)
      onFait(reussiteSuggestion(suggestion.libelle, suggestion.nature))
    } catch (erreur) {
      const lu = lireRefusSuggestion(erreur)
      if (lu.ou === 'champ') setError('pourquoi', { message: lu.message }, { shouldFocus: true })
      else setRefus(lu)
    }
  })

  const erreurPourquoi = errors.pourquoi?.message
  const decritPar = [idCompteur, idPhrase, erreurPourquoi ? idErreur : ''].filter(Boolean).join(' ')

  return (
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
      <div className="flex flex-col gap-1 border-l-2 border-encre pl-4">
        <p className="font-lecture text-[22px] leading-snug font-medium wrap-anywhere">
          {suggestion.libelle}
        </p>
        <p className="text-note text-encre-3">{suggestion.rythme}</p>
        <p className="leading-normal wrap-anywhere text-encre-2">{suggestion.definition}</p>
      </div>

      <div className="flex flex-col">
        <LibelleAvecAide
          htmlFor={idChamp}
          libelle={TEXTES_PANNEAU_AJOUT.libellePourquoi}
          code="indicateurs.pourquoi"
        />
        <textarea
          {...register('pourquoi')}
          id={idChamp}
          rows={4}
          autoComplete="off"
          aria-invalid={erreurPourquoi ? true : undefined}
          aria-describedby={decritPar}
          className="min-h-28 w-full min-w-0 resize-y border border-encre bg-papier px-3.5 py-3 text-base leading-normal text-encre aria-invalid:border-2 aria-invalid:border-alerte"
        />
        <div className="mt-1.5">
          <Compteur
            id={idCompteur}
            valeur={longueurEnCaracteres(pourquoi)}
            max={LONGUEUR_MAX_POURQUOI}
          />
        </div>
        {erreurPourquoi ? (
          <p id={idErreur} className="mt-1.5 text-[15px] leading-normal text-alerte">
            {erreurPourquoi}
          </p>
        ) : null}
      </div>

      <p id={idPhrase} className="leading-normal text-encre-2">
        {TEXTES_PANNEAU_AJOUT.phraseVerification}
      </p>

      <BoutonEnregistrer
        libelle={TEXTES_PANNEAU_AJOUT.envoyer}
        enCours={isSubmitting}
        libelleEnCours={TEXTES_PANNEAU_AJOUT.envoiEnCours}
      />
      <button
        type="button"
        onClick={onAutre}
        className="min-h-cible w-full border border-encre bg-papier px-4 text-[15px] font-semibold text-encre hover:bg-fond"
      >
        {TEXTES_PANNEAU_AJOUT.autreSuggestion}
      </button>
      {refus?.ou === 'connexion' ? <ErreurFormulaire objet="message" /> : null}
      {refus?.ou === 'bouton' ? <ErreurFormulaire message={refus.message} /> : null}
    </form>
  )
}
