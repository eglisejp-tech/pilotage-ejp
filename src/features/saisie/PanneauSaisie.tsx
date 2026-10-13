import { useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { UNSAFE_DataRouterContext } from 'react-router'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { ContexteFermetureSaisie } from '@/features/saisie/fermetureSaisie'
import type { FermetureSaisie } from '@/features/saisie/fermetureSaisie'
import { FenetreFermerSansEnregistrer } from '@/features/saisie/FenetreFermerSansEnregistrer'
import { GardeNavigationSaisie } from '@/features/saisie/GardeNavigationSaisie'
import type { NavigationRetenue } from '@/features/saisie/GardeNavigationSaisie'
import {
  aChange,
  CHANGEMENTS,
  GESTES_AVANT_CHANGEMENT,
  noterChangement,
  noterChangementsDepuis,
  noterClic,
  noterReferences,
  nouveauSuivi,
  releverValeurs,
} from '@/features/saisie/modifications'
import type { SuiviSaisie } from '@/features/saisie/modifications'
import { LARGEUR_PANNEAU } from '@/features/saisie/textes'
import { usePiegeFocus } from '@/features/saisie/usePiegeFocus'

interface Props {
  /** Titre de la saisie, aussi le titre de l'onglet (« Ajouter un événement »). */
  titre: string
  /** Petit libellé au-dessus du titre (« Chiffres du dimanche »), maquettes 08 à 11. */
  surtitre?: string
  /** « Retour », Échap, le fond du panneau et le bouton Précédent ramènent à la page d'origine. */
  onFermer: () => void
  /** Champs, bouton d'enregistrement, erreur et lien « Signaler une difficulté ». */
  children: ReactNode
}

/** La question « Fermer sans enregistrer ? » en attente : ce que fait chacune des deux réponses. */
interface Question {
  fermer: () => void
  continuer?: () => void
}

/**
 * Cadre de toutes les saisies (BRIEF section 9, LISEZMOI) : une page entière sous 600 px, un
 * panneau latéral de 460 px au-dessus de la page d'origine à partir de 600 px. En panneau, c'est
 * une fenêtre modale (focus gardé dedans, Échap ferme, le focus revient à la fermeture). Le
 * contenu est le même aux deux largeurs ; le panneau marque sa colonne (`data-colonne`) pour que
 * les bulles d'aide restent dedans.
 *
 * Une saisie ne se perd jamais sans prévenir (m265) : si un champ a changé depuis l'ouverture ou
 * depuis le dernier enregistrement réussi, « Retour », Échap, le fond du panneau, les boutons
 * « Annuler » des formulaires (`useFermetureSaisie`), le bouton Précédent du navigateur et les
 * liens qui quittent la saisie ouvrent « Fermer sans enregistrer ? ». Sans changement, ils ferment
 * directement. Pendant la question, le contenu du panneau est inerte.
 */
export function PanneauSaisie({ titre, surtitre, onFermer, children }: Props) {
  const idTitre = useId()
  const enPanneau = useLargeurMin(LARGEUR_PANNEAU)
  // En fenêtre, le titre est lu quand le focus y entre : seule la page entière s'annonce (m254).
  useTitrePage(titre, { annoncer: !enPanneau })
  const routeurDeDonnees = useContext(UNSAFE_DataRouterContext) !== null
  const cadre = useRef<HTMLElement>(null)
  const suivi = useRef<SuiviSaisie>(nouveauSuivi())
  // La personne a choisi de fermer : la navigation qui suit ne se retient plus.
  const fermeturePermise = useRef(false)
  const [question, setQuestion] = useState<Question | null>(null)
  const questionPosee = question !== null
  // Élément d'où la fermeture a été demandée : le focus y revient après « Continuer la saisie ».
  const ouvreur = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (questionPosee || !ouvreur.current) return
    ouvreur.current.focus()
    ouvreur.current = null
  }, [questionPosee])

  // Le cadre est le même élément aux deux largeurs : l'écoute des gestes s'installe une fois.
  const zone = useCallback(() => cadre.current, [])

  // Les changements faits par la personne (modifications.ts) : chaque champ est noté dès son
  // entrée dans le cadre et avant chaque geste ; un `input`, un `change` ou une valeur changée
  // pendant un geste le marque comme changé. `generation` écarte les relevés d'avant un
  // enregistrement ou un nouveau départ du formulaire.
  const generation = useRef(0)
  useEffect(() => {
    const racine = zone()
    if (!racine) return
    let monte = true
    noterReferences(racine, suivi.current)
    const observateur = new MutationObserver(() => noterReferences(racine, suivi.current))
    observateur.observe(racine, { childList: true, subtree: true })
    const releverPuisComparer = () => {
      const releve = releverValeurs(racine)
      const numero = generation.current
      // Le formulaire réagit au geste dans la même tâche : la tâche suivante voit le résultat.
      window.setTimeout(() => {
        if (monte && numero === generation.current) {
          noterChangementsDepuis(racine, releve, suivi.current)
        }
      }, 0)
    }
    const avantGeste = () => {
      noterReferences(racine, suivi.current)
      releverPuisComparer()
    }
    const surClic = (evenement: Event) => {
      noterClic(racine, evenement.target, suivi.current)
      releverPuisComparer()
    }
    const surChangement = (evenement: Event) =>
      noterChangement(racine, evenement.target, suivi.current)
    for (const geste of GESTES_AVANT_CHANGEMENT) racine.addEventListener(geste, avantGeste, true)
    racine.addEventListener('click', surClic, true)
    for (const nom of CHANGEMENTS) racine.addEventListener(nom, surChangement, true)
    return () => {
      monte = false
      observateur.disconnect()
      for (const geste of GESTES_AVANT_CHANGEMENT) {
        racine.removeEventListener(geste, avantGeste, true)
      }
      racine.removeEventListener('click', surClic, true)
      for (const nom of CHANGEMENTS) racine.removeEventListener(nom, surChangement, true)
    }
  }, [zone])

  const saisieModifiee = useCallback(() => {
    if (fermeturePermise.current) return false
    const racine = zone()
    return racine !== null && aChange(racine, suivi.current)
  }, [zone])

  const poser = useCallback((attente: Question) => {
    ouvreur.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setQuestion(attente)
  }, [])

  const demander = useCallback(
    (fermer: () => void) => {
      // La question est déjà posée : Échap y vaut « Continuer la saisie » (sa propre fenêtre).
      if (questionPosee) return
      if (saisieModifiee()) poser({ fermer })
      else fermer()
    },
    [questionPosee, saisieModifiee, poser],
  )
  const retenue = useCallback(
    ({ continuer, quitter }: NavigationRetenue) => poser({ fermer: quitter, continuer }),
    [poser],
  )
  // Après un enregistrement, ou quand le formulaire se remplit de nouveau : rien n'est à perdre.
  const repartir = useCallback(() => {
    generation.current += 1
    suivi.current = nouveauSuivi()
    const racine = zone()
    if (racine) noterReferences(racine, suivi.current)
  }, [zone])
  const fermeture = useMemo<FermetureSaisie>(
    () => ({ demander, enregistree: repartir, repartir }),
    [demander, repartir],
  )
  const demanderFermeture = () => demander(onFermer)
  usePiegeFocus(cadre, enPanneau, demanderFermeture)

  const confirmation =
    question !== null ? (
      <FenetreFermerSansEnregistrer
        onContinuer={() => {
          setQuestion(null)
          question.continuer?.()
        }}
        onFermer={() => {
          setQuestion(null)
          fermeturePermise.current = true
          question.fermer()
        }}
      />
    ) : null
  const garde = routeurDeDonnees ? (
    <GardeNavigationSaisie doitRetenir={saisieModifiee} onRetenue={retenue} />
  ) : null

  const contenu = (
    <>
      <div>
        <button
          type="button"
          onClick={demanderFermeture}
          className="inline-flex min-h-cible items-center text-[15px] text-nuit underline underline-offset-4"
        >
          Retour
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {surtitre ? <p className="text-[13px] font-semibold text-encre-3">{surtitre}</p> : null}
        <h1
          id={idTitre}
          className="font-lecture text-[32px] leading-[1.1] font-medium min-[600px]:text-[34px]"
        >
          {titre}
        </h1>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </>
  )

  // Un seul cadre aux deux largeurs, à la même place dans l'arbre : passer de la page entière au
  // panneau (téléphone tourné, fenêtre redimensionnée) garde le formulaire monté et la saisie.
  return (
    <ContexteFermetureSaisie.Provider value={fermeture}>
      <div className={enPanneau ? 'fixed inset-0 z-40 flex justify-end' : 'contents'}>
        {enPanneau ? (
          <div
            key="fond"
            aria-hidden="true"
            onClick={demanderFermeture}
            className="absolute inset-0 bg-encre/50"
          />
        ) : null}
        <section
          key="cadre"
          ref={cadre}
          role={enPanneau ? 'dialog' : undefined}
          aria-modal={enPanneau ? true : undefined}
          aria-labelledby={idTitre}
          tabIndex={enPanneau ? -1 : undefined}
          data-colonne
          inert={questionPosee}
          className={
            enPanneau
              ? 'relative flex h-full w-full max-w-[460px] flex-col gap-5 overflow-y-auto border-l border-filet bg-papier px-6 py-6 outline-hidden'
              : 'flex flex-col gap-5'
          }
        >
          {contenu}
        </section>
        {confirmation}
      </div>
      {garde}
    </ContexteFermetureSaisie.Provider>
  )
}
