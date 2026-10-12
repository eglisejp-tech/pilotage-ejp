import { useId, useState } from 'react'
import { ChampLibre } from '@/features/cette-semaine/ChampLibre'
import { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'
import type { LigneAValider as Ligne } from '@/features/indicateurs/validation/construire'
import { FenetreRefus } from '@/features/indicateurs/validation/FenetreRefus'
import { MasquageTexte } from '@/features/indicateurs/validation/MasquageTexte'
import { lireRefusValidation } from '@/features/indicateurs/validation/refus'
import type { Masquage } from '@/features/moderation/schemas'
import { TEXTES_MODERATION } from '@/features/moderation/textes'
import {
  nomBoutonDecision,
  reussiteRefus,
  TEXTES_A_VALIDER,
  texteNouvelIndicateur,
  texteValeursSaisies,
} from '@/features/indicateurs/validation/textes'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'

/** Les deux décisions d'EJP Tech sur une ligne ; absentes pour l'administration, qui lit sans décider. */
export interface ActionsLigne {
  valider: (ligne: Ligne) => Promise<void>
  refuser: (ligne: Ligne, motif: string) => Promise<void>
  /** « Masquer le texte » d'un « Pourquoi » ou d'un motif de refus (`masquer_texte`). */
  masquer: (masquage: Masquage) => Promise<void>
}

interface Props {
  ligne: Ligne
  /** `null` : lecture seule (administration de l'église), ni bouton ni « Pourquoi ». */
  actions: ActionsLigne | null
  /** Une décision est écrite : le bloc annonce ce message et rend le focus à son titre. */
  surFait: (message: string) => void
  /**
   * La base refuse la décision (« Cette demande a déjà été décidée. », demande sortie) : la liste
   * se relit et la ligne disparaît, le bloc garde donc le message à sa place.
   */
  surRefus: (message: string) => void
}

const boutonSecondaire =
  'inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-4 text-[15px] font-semibold whitespace-nowrap text-encre hover:bg-fond aria-disabled:cursor-wait'
const boutonPrincipal =
  'inline-flex min-h-cible items-center justify-center bg-encre px-4 text-[15px] font-semibold whitespace-nowrap text-papier aria-disabled:cursor-wait'

/**
 * Une ligne du bloc « À valider » (maquette 15 pour la mise en page ; validation-metier.md, 5.1) :
 * à gauche le ministère, le jour de l'envoi et l'attente (« depuis 9 jours, en retard », en orange
 * avec le mot) ; au centre « Nouvel indicateur : « X » (chaque mois) », sa définition et, pour
 * EJP Tech seulement, le « Pourquoi » ; à droite « Valider » (un clic, sans fenêtre) et
 * « Refuser » (fenêtre avec un motif). L'administration lit la ligne sans bouton et sans
 * « Pourquoi ». Un refus de la base se dit sous les boutons.
 */
export function LigneAValider({ ligne, actions, surFait, surRefus }: Props) {
  const idTitre = useId()
  const [fenetre, setFenetre] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [connexionPerdue, setConnexionPerdue] = useState(false)

  const valider = async () => {
    if (enCours || actions === null) return
    setEnCours(true)
    setConnexionPerdue(false)
    try {
      await actions.valider(ligne)
      surFait(TEXTES_A_VALIDER.reussiteValide)
    } catch (erreur) {
      const lu = lireRefusValidation(erreur)
      if (lu.ou === 'connexion') setConnexionPerdue(true)
      else surRefus(lu.message)
      setEnCours(false)
    }
  }

  return (
    <article aria-labelledby={idTitre} className="flex flex-col gap-3 py-[18px]">
      <div className="grid gap-x-8 gap-y-3 min-[1024px]:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id={idTitre} className="text-[15px] font-semibold wrap-anywhere">
            {ligne.ministere}
          </h3>
          <p className="text-note text-encre-3">{ligne.envoyeLe}</p>
          {ligne.depuis !== null ? (
            <p className="text-note text-encre-3">
              {ligne.depuis}
              {ligne.enRetard ? (
                <>
                  ,{' '}
                  <span className="font-semibold text-attention">{TEXTES_A_VALIDER.enRetard}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <p className="font-lecture text-[19px] leading-snug wrap-anywhere">
            {texteNouvelIndicateur(ligne.libelle, ligne.rythme)}
          </p>
          <p className="leading-normal wrap-anywhere text-encre-2">{ligne.definition}</p>
          {ligne.pourquoi !== null ? (
            <p className="font-lecture text-[17px] leading-snug wrap-anywhere">
              <span className="font-interface text-note text-encre-3">
                {TEXTES_A_VALIDER.pourquoi}
                {' : '}
              </span>
              «&nbsp;
              <ChampLibre
                texte={{ texte: ligne.pourquoi, masque: ligne.pourquoi === TEXTE_MASQUE }}
              />
              &nbsp;»
            </p>
          ) : null}
          {actions !== null && ligne.pourquoi !== null && ligne.pourquoi !== TEXTE_MASQUE ? (
            <div>
              <MasquageTexte
                contexte={`${TEXTES_A_VALIDER.contexteMasquagePourquoi}, ${ligne.ministere}`}
                cible="demande_indicateur"
                cibleId={ligne.id}
                champ={{
                  code: 'pourquoi',
                  libelle: TEXTES_A_VALIDER.pourquoi,
                  texte: ligne.pourquoi,
                }}
                masquer={actions.masquer}
                surMasque={() => surFait(TEXTES_MODERATION.reussiteMasque)}
                decritPar={idTitre}
              />
            </div>
          ) : null}
          {ligne.nbValeurs !== null && ligne.nbValeurs > 0 ? (
            <p className="text-note text-encre-3">{texteValeursSaisies(ligne.nbValeurs)}</p>
          ) : null}
        </div>

        {actions !== null ? (
          <div className="flex min-w-0 flex-col items-start gap-2 min-[1024px]:items-end">
            <div className="flex flex-wrap gap-3 max-[599px]:w-full max-[599px]:flex-col">
              <button
                type="button"
                aria-label={nomBoutonDecision('refuser', ligne.libelle, ligne.ministere)}
                aria-haspopup="dialog"
                aria-disabled={enCours ? true : undefined}
                onClick={() => {
                  if (!enCours) setFenetre(true)
                }}
                className={boutonSecondaire}
              >
                {TEXTES_A_VALIDER.refuser}
              </button>
              <button
                type="button"
                aria-label={nomBoutonDecision('valider', ligne.libelle, ligne.ministere)}
                aria-disabled={enCours ? true : undefined}
                onClick={() => void valider()}
                className={boutonPrincipal}
              >
                {TEXTES_A_VALIDER.valider}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {connexionPerdue ? <ErreurFormulaire message={TEXTES_A_VALIDER.erreur} /> : null}
      {fenetre && actions !== null ? (
        <FenetreRefus
          ministere={ligne.ministere}
          libelle={ligne.libelle}
          refuser={(motif) => actions.refuser(ligne, motif)}
          onFait={() => {
            setFenetre(false)
            surFait(reussiteRefus(ligne.ministere))
          }}
          onRefusDeDemande={(message) => {
            setFenetre(false)
            surRefus(message)
          }}
          onAnnuler={() => setFenetre(false)}
        />
      ) : null}
    </article>
  )
}
