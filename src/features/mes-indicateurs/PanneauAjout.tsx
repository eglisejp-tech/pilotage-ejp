import { useState } from 'react'
import { EtatVide } from '@/components/etats/EtatVide'
import type { LimiteAtteinte, SuggestionProposee } from '@/features/mes-indicateurs/construire'
import { FormulaireSuggestion } from '@/features/mes-indicateurs/FormulaireSuggestion'
import type { FormulaireSuggestion as Formulaire } from '@/features/mes-indicateurs/schemas'
import {
  nomBoutonChoisir,
  TEXTES_MES_INDICATEURS,
  TEXTES_PANNEAU_AJOUT,
} from '@/features/mes-indicateurs/textes'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'

interface Props {
  suggestions: readonly SuggestionProposee[]
  /** Une limite atteinte : le panneau ne montre que l'explication et ce qu'il faut faire. */
  limite: LimiteAtteinte | null
  /** L'appel à `ajouter_suggestion` pour la suggestion choisie. */
  envoyer: (code: string, formulaire: Formulaire) => Promise<void>
  /** Suggestion envoyée : la page ferme le panneau et annonce ce message. */
  onFait: (message: string) => void
  onFermer: () => void
}

const classeChoisir =
  'inline-flex min-h-cible shrink-0 items-center justify-center border border-encre bg-papier px-4 text-[15px] font-semibold whitespace-nowrap text-encre hover:bg-fond'

/**
 * Panneau « Ajouter un indicateur » (configuration-indicateurs.md, 7.3, parcours d'ajout du lot 1) :
 * page entière sous 600 px, panneau de 460 px au-delà. Une limite atteinte (3 ajouts, 30 lignes) :
 * seulement l'explication (aux 3 ajouts, « Retirez-en un » : le ministère retire lui-même, T62).
 * Sinon les suggestions que la fiche n'a pas encore, avec leur rythme et leur définition ;
 * « Choisir » ouvre le champ « Pourquoi cet indicateur ? ». Plus aucune suggestion : « Toutes les
 * suggestions sont déjà sur votre fiche. ». Dessous, ce qu'il faut faire si rien ne convient :
 * demander un indicateur à EJP Tech (le lot 2 ouvrira l'écriture de son propre indicateur).
 */
export function PanneauAjout({ suggestions, limite, envoyer, onFait, onFermer }: Props) {
  const [choisie, setChoisie] = useState<SuggestionProposee | null>(null)

  return (
    <PanneauSaisie
      titre={TEXTES_PANNEAU_AJOUT.titre}
      surtitre={TEXTES_MES_INDICATEURS.surtitre}
      onFermer={onFermer}
    >
      {limite !== null ? (
        <>
          <p className="leading-normal text-encre-2">{limite.message}</p>
          <button
            type="button"
            onClick={onFermer}
            className="min-h-cible w-full border border-encre bg-papier px-4 text-[15px] font-semibold text-encre hover:bg-fond"
          >
            {TEXTES_PANNEAU_AJOUT.fermer}
          </button>
        </>
      ) : choisie !== null ? (
        <FormulaireSuggestion
          key={choisie.code}
          suggestion={choisie}
          envoyer={(formulaire) => envoyer(choisie.code, formulaire)}
          onFait={onFait}
          onAutre={() => setChoisie(null)}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-lecture text-[24px] leading-tight font-medium">
              {TEXTES_PANNEAU_AJOUT.titreSuggestions}
            </h2>
            <p className="leading-normal text-encre-2">{TEXTES_PANNEAU_AJOUT.introSuggestions}</p>
          </div>
          {suggestions.length === 0 ? (
            <EtatVide situation="tout_est_fait">{TEXTES_PANNEAU_AJOUT.toutesDejaLa}</EtatVide>
          ) : (
            <ul className="divide-y divide-filet border-y border-filet">
              {suggestions.map((suggestion) => (
                <li key={suggestion.code} className="flex flex-col gap-2 py-4">
                  <div className="flex flex-col gap-0.5">
                    <p className="font-lecture text-[19px] leading-snug font-medium wrap-anywhere">
                      {suggestion.libelle}
                    </p>
                    <p className="text-note text-encre-3">{suggestion.rythme}</p>
                    <p className="leading-normal wrap-anywhere text-encre-2">
                      {suggestion.definition}
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      aria-label={nomBoutonChoisir(suggestion.libelle)}
                      onClick={() => setChoisie(suggestion)}
                      className={classeChoisir}
                    >
                      {TEXTES_PANNEAU_AJOUT.choisir}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="leading-normal text-encre-2">{TEXTES_PANNEAU_AJOUT.rienNeConvient}</p>
        </div>
      )}
    </PanneauSaisie>
  )
}
