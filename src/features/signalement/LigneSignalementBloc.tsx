import { useEffect, useId, useRef, useState } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import type { EtapeDuSuivi, LigneSignalement } from '@/data/signalements'
import { TEXTE_MASQUE } from '@/features/cette-semaine/textesVides'
import { FenetreMasquage } from '@/features/moderation/FenetreMasquage'
import type { ChoixMasquage, Masquage } from '@/features/moderation/schemas'
import { libelleChamp } from '@/features/moderation/textes'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { FormulaireReponse } from '@/features/signalement/FormulaireReponse'
import { lireRefusGeste } from '@/features/signalement/refusSuivi'
import type { Cloture, Reponse } from '@/features/signalement/schemas'
import { etapesDuSuivi, gestesEjpTech, ligneEtatEjpTech } from '@/features/signalement/suivi'
import type { Citation } from '@/features/signalement/suivi'
import { SuiviDate } from '@/features/signalement/SuiviDate'
import { TexteSignale } from '@/features/signalement/TexteSignale'
import {
  LIBELLES_STATUT,
  ligneSignalement,
  TEXTES_BLOC_SIGNALEMENTS,
  TEXTES_REPONSE,
} from '@/features/signalement/textes'

/** Les gestes d'EJP Tech sur un signalement (T77). */
export interface GestesEjpTech {
  prendre: (signalementId: string) => Promise<void>
  repondre: (reponse: Reponse) => Promise<void>
  clore: (cloture: Cloture) => Promise<void>
}

/** Ce que le bloc donne à une ligne : les gestes et leurs suites. */
export interface SuitesLigne {
  gestes: GestesEjpTech
  /** Geste réussi : le bloc annonce le message et met le focus sur l'en-tête de la ligne. */
  surReussite: (signalementId: string, message: string) => void
  /** Le signalement a changé entre-temps : le bloc dit le message et relit la liste. */
  surChange: (signalementId: string, message: string) => void
  /** Un panneau s'ouvre : le bloc efface son ancien message. */
  surOuverture: () => void
}

interface Props {
  signalement: LigneSignalement
  /** Ses lignes de suivi, dans l'ordre. */
  lignes: readonly EtapeDuSuivi[]
  suites?: SuitesLigne
  /** Un refus venu de la base pour ce signalement, sous ses boutons. */
  refus: string | null
  /** « Masquer » (lot L6) : sans lui, le bouton n'existe pas. */
  masquage?: {
    masquer: (masquage: Masquage) => Promise<void>
    /** Texte masqué : le bloc annonce « Texte masqué. » et rend le focus à son titre. */
    surMasque: () => void
  }
}

/** L'identifiant de l'en-tête d'une ligne, cible du focus après un geste. */
export function idTitreLigne(signalementId: string): string {
  return `ligne-${signalementId}`
}

/** Un texte qu'on peut encore masquer : ni vide, ni déjà masqué. */
const masquable = (texte: string) => texte.trim() !== '' && texte !== TEXTE_MASQUE

type Panneau = 'reponse' | 'cloture' | null
/** Ce que « Masquer » vise : le texte du signalement, ou une réponse du suivi. */
type CibleMasquage = { genre: 'texte' } | { genre: 'reponse'; citation: Citation }

/**
 * Une ligne du bloc « Signalements » d'EJP Tech (maquette 15, rythme de « À relire » ; T77) : à
 * gauche le ministère (en-tête focusable), l'écran et la date d'envoi, l'étiquette du statut ; au
 * milieu le texte cité (« Masquer » discret dessous), la ligne d'état (avec l'âge lu dans la base)
 * et le suivi daté (« Masquer » sous chaque réponse) ; à droite, au plus deux boutons empilés
 * (« Prendre en charge », « Répondre au ministère ») et « Clore le signalement » discret dessous,
 * seul et ordinaire quand le ministère n'a plus de compte actif. « Répondre au ministère » et
 * « Clore le signalement » ouvrent un petit panneau sous la ligne ; le bouton de clôture laisse
 * sa place à celui du panneau, au même libellé (T66, point 9). « Annuler » rend le focus au bouton.
 */
export function LigneSignalementBloc({ signalement, lignes, suites, refus, masquage }: Props) {
  const idPanneau = useId()
  const [panneau, setPanneau] = useState<Panneau>(null)
  const [enCours, setEnCours] = useState(false)
  const [echec, setEchec] = useState<string | null>(null)
  const [aMasquer, setAMasquer] = useState<CibleMasquage | null>(null)
  const boutonRepondre = useRef<HTMLButtonElement>(null)
  const boutonClore = useRef<HTMLButtonElement>(null)
  // Le panneau se referme par « Annuler » : son bouton reprend le focus une fois affiché.
  const rendreFocus = useRef<Panneau>(null)
  const verrou = useRef(false)

  useEffect(() => {
    if (panneau !== null || rendreFocus.current === null) return
    const bouton = rendreFocus.current === 'reponse' ? boutonRepondre : boutonClore
    rendreFocus.current = null
    bouton.current?.focus()
  }, [panneau])

  const gestes = gestesEjpTech(signalement)
  const ouvrir = (choix: Panneau) => {
    setEchec(null)
    suites?.surOuverture()
    setPanneau(choix)
  }
  const replier = (depuis: Panneau) => {
    rendreFocus.current = depuis
    setPanneau(null)
  }

  const prendre = async () => {
    if (!suites || verrou.current) return
    verrou.current = true
    setEnCours(true)
    setEchec(null)
    try {
      await suites.gestes.prendre(signalement.id)
      suites.surReussite(signalement.id, TEXTES_BLOC_SIGNALEMENTS.reussitePrise)
    } catch (erreur) {
      const lu = lireRefusGeste(erreur)
      if (lu.ou === 'connexion') setEchec(TEXTES_REPONSE.echecEnvoi)
      else if (lu.ou === 'bouton' && lu.relire) suites.surChange(signalement.id, lu.message)
      else setEchec(lu.message)
    } finally {
      verrou.current = false
      setEnCours(false)
    }
  }

  // « Masquer » : le texte du signalement (cible signalement) ou une réponse (signalement_suivi).
  const masquer = (choix: ChoixMasquage): Promise<void> => {
    if (!masquage || !aMasquer) return Promise.resolve()
    if (aMasquer.genre === 'texte') {
      return masquage.masquer({
        cible: 'signalement',
        cibleId: signalement.id,
        champ: 'texte',
        motif: choix.motif,
      })
    }
    return masquage.masquer({
      cible: 'signalement_suivi',
      cibleId: aMasquer.citation.suiviId,
      champ: 'commentaire',
      motif: choix.motif,
    })
  }
  const boutonMasquer = (cible: CibleMasquage) => (
    <Bouton
      variante="lien"
      taille="lien"
      aria-describedby={idTitreLigne(signalement.id)}
      aria-haspopup="dialog"
      onClick={() => setAMasquer(cible)}
    >
      {TEXTES_BLOC_SIGNALEMENTS.boutonMasquer}
    </Bouton>
  )
  let champMasque = null
  if (aMasquer?.genre === 'texte') {
    champMasque = {
      code: 'texte',
      libelle: libelleChamp('signalement', 'texte'),
      texte: signalement.texte,
    }
  } else if (aMasquer?.genre === 'reponse') {
    champMasque = {
      code: 'commentaire',
      libelle: libelleChamp('signalement_suivi', 'commentaire'),
      texte: aMasquer.citation.texte,
    }
  }

  const message = echec ?? refus
  const gestesVisibles = suites && (gestes.prendre || gestes.repondre || gestes.clore)

  return (
    <article
      aria-labelledby={idTitreLigne(signalement.id)}
      className="flex flex-col gap-3 py-[18px]"
    >
      <div className="grid gap-x-8 gap-y-3 ordinateur:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_minmax(0,15rem)]">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h4
            id={idTitreLigne(signalement.id)}
            tabIndex={-1}
            className="text-[15px] font-semibold wrap-anywhere outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-encre"
          >
            {signalement.ministere_nom}
          </h4>
          <p className="text-note text-encre-3">
            {ligneSignalement(signalement.ecran, signalement.saisi_le)}
          </p>
          <p className="text-note font-semibold text-encre-2">
            {LIBELLES_STATUT[signalement.statut]}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div>
            <p className="min-w-0 font-lecture text-citation wrap-anywhere">
              «&nbsp;
              <TexteSignale texte={signalement.texte} />
              &nbsp;»
            </p>
            {masquage && masquable(signalement.texte) ? boutonMasquer({ genre: 'texte' }) : null}
          </div>
          <p className="text-interface leading-normal">{ligneEtatEjpTech(signalement)}</p>
          <SuiviDate
            etapes={etapesDuSuivi(signalement, lignes, 'ejp_tech')}
            sousCitation={
              masquage
                ? (citation) =>
                    masquable(citation.texte) ? boutonMasquer({ genre: 'reponse', citation }) : null
                : undefined
            }
          />
        </div>
        {gestesVisibles ? (
          // Au plus deux boutons empilés, à la largeur du plus large, puis « Clore » discret.
          <div className="flex min-w-0 flex-col gap-2 ordinateur:items-end">
            <div className="flex flex-col gap-3 max-tablette:w-full tablette:w-max tablette:max-w-full">
              {gestes.prendre ? (
                <Bouton
                  aria-describedby={idTitreLigne(signalement.id)}
                  enCours={enCours}
                  libelleEnCours={TEXTES_BLOC_SIGNALEMENTS.boutonPrendreEnCours}
                  onClick={() => void prendre()}
                  className="whitespace-nowrap"
                >
                  {TEXTES_BLOC_SIGNALEMENTS.boutonPrendre}
                </Bouton>
              ) : null}
              {gestes.repondre ? (
                <Bouton
                  ref={boutonRepondre}
                  aria-describedby={idTitreLigne(signalement.id)}
                  aria-expanded={panneau === 'reponse'}
                  aria-controls={idPanneau}
                  onClick={() => ouvrir('reponse')}
                  className="whitespace-nowrap"
                >
                  {TEXTES_BLOC_SIGNALEMENTS.boutonRepondre}
                </Bouton>
              ) : null}
              {gestes.cloreSeul && panneau !== 'cloture' ? (
                <Bouton
                  ref={boutonClore}
                  aria-describedby={idTitreLigne(signalement.id)}
                  onClick={() => ouvrir('cloture')}
                  className="whitespace-nowrap"
                >
                  {TEXTES_BLOC_SIGNALEMENTS.boutonClore}
                </Bouton>
              ) : null}
            </div>
            {gestes.clore && !gestes.cloreSeul && panneau !== 'cloture' ? (
              <Bouton
                ref={boutonClore}
                variante="lien"
                taille="lien"
                aria-describedby={idTitreLigne(signalement.id)}
                onClick={() => ouvrir('cloture')}
                className="self-start ordinateur:self-end"
              >
                {TEXTES_BLOC_SIGNALEMENTS.boutonClore}
              </Bouton>
            ) : null}
          </div>
        ) : null}
      </div>
      {message ? <ErreurFormulaire message={message} /> : null}
      <div id={idPanneau} className="ordinateur:ml-auto ordinateur:w-[32rem]">
        {panneau === 'reponse' && suites ? (
          <FormulaireReponse
            id={`${idPanneau}-reponse`}
            libelle={TEXTES_BLOC_SIGNALEMENTS.libelleReponse(signalement.ministere_nom)}
            aide={TEXTES_BLOC_SIGNALEMENTS.aideReponse}
            note={TEXTES_BLOC_SIGNALEMENTS.noteReponse(signalement.ministere_nom)}
            envoyer={(texte) => suites.gestes.repondre({ signalementId: signalement.id, texte })}
            surEnvoye={() => {
              setPanneau(null)
              suites.surReussite(signalement.id, TEXTES_BLOC_SIGNALEMENTS.reussiteReponse)
            }}
            surChange={(texte) => {
              setPanneau(null)
              suites.surChange(signalement.id, texte)
            }}
            onAnnuler={() => replier('reponse')}
          />
        ) : null}
        {panneau === 'cloture' && suites ? (
          <FormulaireReponse
            id={`${idPanneau}-cloture`}
            libelle={TEXTES_BLOC_SIGNALEMENTS.libelleCommentaire}
            note={TEXTES_BLOC_SIGNALEMENTS.noteCloture}
            boutonEnvoyer={TEXTES_BLOC_SIGNALEMENTS.boutonConfirmer}
            boutonEnCours={TEXTES_BLOC_SIGNALEMENTS.boutonClotureEnCours}
            envoyer={(texte) =>
              suites.gestes.clore({ signalementId: signalement.id, commentaire: texte })
            }
            surEnvoye={() => {
              setPanneau(null)
              suites.surReussite(signalement.id, TEXTES_BLOC_SIGNALEMENTS.reussite)
            }}
            surChange={(texte) => {
              setPanneau(null)
              suites.surChange(signalement.id, texte)
            }}
            onAnnuler={() => replier('cloture')}
          />
        ) : null}
      </div>
      {aMasquer && champMasque && masquage ? (
        <FenetreMasquage
          contexte={`Signalement, ${signalement.ministere_nom}`}
          champs={[champMasque]}
          masquer={masquer}
          onFait={() => {
            setAMasquer(null)
            masquage.surMasque()
          }}
          onAnnuler={() => setAMasquer(null)}
        />
      ) : null}
    </article>
  )
}
