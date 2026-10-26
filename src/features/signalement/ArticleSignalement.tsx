import { useEffect, useId, useRef, useState } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import type { EtapeDuSuivi, LigneSignalement } from '@/data/signalements'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { FormulaireReponse } from '@/features/signalement/FormulaireReponse'
import { lireRefusGeste } from '@/features/signalement/refusSuivi'
import type { Reponse } from '@/features/signalement/schemas'
import {
  derniereReponse,
  etapesDuSuivi,
  ligneEtatMinistere,
  reponseDeCloture,
} from '@/features/signalement/suivi'
import { SuiviDate } from '@/features/signalement/SuiviDate'
import { TexteSignale } from '@/features/signalement/TexteSignale'
import {
  jourDeLaBase,
  LIBELLES_STATUT,
  ligneSignalement,
  TEXTES_REPONSE,
  TEXTES_SUIVI,
} from '@/features/signalement/textes'

/** Les deux gestes du ministère, à l'étape Répondu (T77). */
export interface GestesMinistere {
  confirmer: (signalementId: string) => Promise<void>
  repondre: (reponse: Reponse) => Promise<void>
}

interface Props {
  signalement: LigneSignalement
  /** Ses lignes de suivi, dans l'ordre. */
  lignes: readonly EtapeDuSuivi[]
  gestes: GestesMinistere
  /** Un refus venu de la base pour ce signalement (« Ce signalement est déjà clos. »). */
  refus: string | null
  /** Geste réussi : la page annonce le message et met le focus sur l'en-tête déplacé. */
  surReussite: (signalementId: string, message: string) => void
  /** Le signalement a changé entre-temps : la page dit le message et relit la liste. */
  surChange: (signalementId: string, message: string) => void
}

/** L'identifiant de l'en-tête d'un signalement, cible du focus après un geste et de l'ancre. */
export function idTitreSignalement(signalementId: string): string {
  return `titre-${signalementId}`
}

/**
 * Un signalement dans « Mes signalements » (T77) : l'en-tête « Ajouter un événement, 26 oct. »
 * (focusable, cible de l'ancre `/signalements#<id>`) et l'étiquette du statut, en texte ; le texte
 * entre guillemets ; la ligne d'état ; pour un Répondu, la réponse d'EJP Tech, « Est-ce réglé ? »
 * avec « Oui, c'est réglé » et « Répondre à EJP Tech », puis la date limite ; pour un clos par EJP
 * Tech, sa réponse ; enfin le suivi daté. « Répondre à EJP Tech » ouvre un petit panneau sous les
 * boutons ; « Annuler » le referme et rend le focus au bouton.
 */
export function ArticleSignalement({
  signalement,
  lignes,
  gestes,
  refus,
  surReussite,
  surChange,
}: Props) {
  const idPanneau = useId()
  const idQuestion = useId()
  const [ouvert, setOuvert] = useState(false)
  const [enCours, setEnCours] = useState(false)
  const [echec, setEchec] = useState<string | null>(null)
  const boutonRepondre = useRef<HTMLButtonElement>(null)
  // Le panneau se referme par « Annuler » : le bouton reprend le focus une fois affiché.
  const rendreFocus = useRef(false)
  const verrou = useRef(false)

  useEffect(() => {
    if (ouvert || !rendreFocus.current) return
    rendreFocus.current = false
    boutonRepondre.current?.focus()
  }, [ouvert])

  const repondu = signalement.statut === 'repondu'
  const reponse = repondu ? derniereReponse(lignes) : null
  const cloture = signalement.fin === 'ejp_tech' ? reponseDeCloture(lignes) : null

  const confirmer = async () => {
    if (verrou.current) return
    verrou.current = true
    setEnCours(true)
    setEchec(null)
    try {
      await gestes.confirmer(signalement.id)
      surReussite(signalement.id, TEXTES_SUIVI.reussiteRegle)
    } catch (erreur) {
      const lu = lireRefusGeste(erreur)
      if (lu.ou === 'connexion') setEchec(TEXTES_REPONSE.echecEnvoi)
      else if (lu.ou === 'bouton' && lu.relire) surChange(signalement.id, lu.message)
      else setEchec(lu.message)
    } finally {
      verrou.current = false
      setEnCours(false)
    }
  }

  const message = echec ?? refus

  return (
    <article id={signalement.id} className="flex scroll-mt-6 flex-col gap-3 py-[18px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3
          id={idTitreSignalement(signalement.id)}
          tabIndex={-1}
          className="text-[15px] font-semibold outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-encre"
        >
          {ligneSignalement(signalement.ecran, signalement.saisi_le)}
        </h3>
        <p className="text-note font-semibold text-encre-2">
          {LIBELLES_STATUT[signalement.statut]}
        </p>
      </div>
      <p className="min-w-0 font-lecture text-citation wrap-anywhere">
        «&nbsp;
        <TexteSignale texte={signalement.texte} />
        &nbsp;»
      </p>
      <p className="text-interface leading-normal">{ligneEtatMinistere(signalement)}</p>
      {reponse ? (
        <p className="min-w-0 border-l-2 border-filet pl-3 leading-normal wrap-anywhere">
          <TexteSignale texte={reponse.texte} />
        </p>
      ) : null}
      {cloture ? (
        <p className="min-w-0 text-sm leading-normal wrap-anywhere text-encre-2">
          {TEXTES_SUIVI.reponse} <TexteSignale texte={cloture.texte} />
        </p>
      ) : null}

      {repondu ? (
        <div className="flex flex-col gap-3">
          <div role="group" aria-labelledby={idQuestion} className="flex flex-col gap-2">
            <p id={idQuestion} className="text-interface font-semibold">
              {TEXTES_SUIVI.question}
            </p>
            <div className="flex flex-wrap gap-3 max-tablette:flex-col">
              <Bouton
                variante="sombre"
                enCours={enCours}
                libelleEnCours={TEXTES_REPONSE.boutonEnCours}
                onClick={() => void confirmer()}
                className="max-tablette:w-full"
              >
                {TEXTES_SUIVI.boutonOui}
              </Bouton>
              <Bouton
                ref={boutonRepondre}
                aria-expanded={ouvert}
                aria-controls={idPanneau}
                onClick={() => {
                  setEchec(null)
                  setOuvert(true)
                }}
                className="max-tablette:w-full"
              >
                {TEXTES_SUIVI.boutonRepondre}
              </Bouton>
            </div>
          </div>
          {message ? <ErreurFormulaire message={message} /> : null}
          {signalement.reponse_possible_jusquau ? (
            <p className="text-sm text-encre-2">
              {TEXTES_SUIVI.delai(jourDeLaBase(signalement.reponse_possible_jusquau))}
            </p>
          ) : null}
          <div id={idPanneau}>
            {ouvert ? (
              <FormulaireReponse
                id={`${idPanneau}-texte`}
                libelle={TEXTES_SUIVI.libelleReponse}
                aide={TEXTES_SUIVI.aideReponse}
                envoyer={(texte) => gestes.repondre({ signalementId: signalement.id, texte })}
                surEnvoye={() => {
                  setOuvert(false)
                  surReussite(signalement.id, TEXTES_SUIVI.reussiteReponse)
                }}
                surChange={(texte) => {
                  setOuvert(false)
                  surChange(signalement.id, texte)
                }}
                onAnnuler={() => {
                  rendreFocus.current = true
                  setOuvert(false)
                }}
              />
            ) : null}
          </div>
        </div>
      ) : message ? (
        <ErreurFormulaire message={message} />
      ) : null}

      <SuiviDate etapes={etapesDuSuivi(signalement, lignes, 'ministere')} />
    </article>
  )
}
