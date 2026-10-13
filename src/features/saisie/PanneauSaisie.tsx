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
import { aChange, GESTES_AVANT_CHANGEMENT, noterReferences } from '@/features/saisie/modifications'
import type { References } from '@/features/saisie/modifications'
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
  const panneau = useRef<HTMLDivElement>(null)
  const page = useRef<HTMLElement>(null)
  const references = useRef<References>(new WeakMap())
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

  const zone = useCallback(() => (enPanneau ? panneau.current : page.current), [enPanneau])

  // Chaque champ est noté juste avant le premier geste qui pourrait le changer.
  useEffect(() => {
    const racine = zone()
    if (!racine) return
    const noter = () => noterReferences(racine, references.current)
    for (const geste of GESTES_AVANT_CHANGEMENT) racine.addEventListener(geste, noter, true)
    return () => {
      for (const geste of GESTES_AVANT_CHANGEMENT) racine.removeEventListener(geste, noter, true)
    }
  }, [zone])

  const saisieModifiee = useCallback(() => {
    if (fermeturePermise.current) return false
    const racine = zone()
    return racine !== null && aChange(racine, references.current)
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
  const enregistree = useCallback(() => {
    references.current = new WeakMap()
  }, [])
  const fermeture = useMemo<FermetureSaisie>(
    () => ({ demander, enregistree }),
    [demander, enregistree],
  )
  const demanderFermeture = () => demander(onFermer)
  usePiegeFocus(panneau, enPanneau, demanderFermeture)

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

  if (!enPanneau) {
    return (
      <ContexteFermetureSaisie.Provider value={fermeture}>
        <section
          ref={page}
          aria-labelledby={idTitre}
          data-colonne
          inert={questionPosee}
          className="flex flex-col gap-5"
        >
          {contenu}
        </section>
        {confirmation}
        {garde}
      </ContexteFermetureSaisie.Provider>
    )
  }

  return (
    <ContexteFermetureSaisie.Provider value={fermeture}>
      <div className="fixed inset-0 z-40 flex justify-end">
        <div
          aria-hidden="true"
          onClick={demanderFermeture}
          className="absolute inset-0 bg-encre/50"
        />
        <div
          ref={panneau}
          role="dialog"
          aria-modal="true"
          aria-labelledby={idTitre}
          tabIndex={-1}
          data-colonne
          inert={questionPosee}
          className="relative flex h-full w-full max-w-[460px] flex-col gap-5 overflow-y-auto border-l border-filet bg-papier px-6 py-6 outline-hidden"
        >
          {contenu}
        </div>
        {confirmation}
      </div>
      {garde}
    </ContexteFermetureSaisie.Provider>
  )
}
