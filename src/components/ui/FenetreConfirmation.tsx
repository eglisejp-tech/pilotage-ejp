import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import { SansCoupureAuTrait } from '@/components/ui/SansCoupureAuTrait'
import { useFenetreModale } from '@/components/ui/useFenetreModale'
import { referenceEchec } from '@/data/echecEnvoi'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'

interface Props {
  /** Le titre, en question (« Désactiver Communication ? »). */
  titre: string
  /** La conséquence, annoncée avec le titre. */
  texte: ReactNode
  /** Ce qui suit la phrase : un champ (motif), une liste. */
  children?: ReactNode
  /**
   * Le bouton d'action, qui dit ce qu'il fait (« Désactiver le ministère »). Sans lui, la fenêtre
   * informe seulement : un seul bouton, `annuler` (« Fermer », T75).
   */
  confirmer?: string
  /** Pendant l'action : « Désactivation en cours ». Sans lui, l'action est immédiate. */
  libelleEnCours?: string
  /** Défaut : « Annuler ». Échap vaut ce bouton. */
  annuler?: string
  /** Couleur du bouton d'action : jaune, ou foncé quand l'action perd quelque chose. */
  varianteConfirmer?: 'principal' | 'sombre'
  /** Faux tant que l'action n'est pas prête (motif à choisir) : bouton indisponible. */
  pret?: boolean
  /** L'action. Un refus (exception) s'affiche sous les boutons, la fenêtre reste ouverte. */
  onConfirmer?: () => Promise<void> | void
  onAnnuler: () => void
  /** La phrase d'un refus de l'action. Obligatoire pour une action qui peut échouer. */
  lireMessage?: (refus: unknown) => string
  /** Écran d'EJP Tech : la référence d'un échec technique se dit « Référence : » (T76). */
  ecranEjpTech?: boolean
}

/**
 * La fenêtre de confirmation de l'outil (proposition 20, T69), sur l'élément `<dialog>` du
 * navigateur (`alertdialog`) : titre en Newsreader de 28 px, la conséquence, puis « Annuler » et
 * l'action, côte à côte à droite à partir de 600 px ; en dessous, en pleine largeur, l'action
 * au-dessus. Une seule largeur, 480 px. Le focus entre sur la fenêtre, y reste, Échap annule
 * (sauf pendant l'action) et le focus revient au bouton d'origine (useFenetreModale). La fenêtre
 * se retire par l'écran, quand l'action réussit ou à l'annulation.
 */
export function FenetreConfirmation({
  titre,
  texte,
  children,
  confirmer,
  libelleEnCours,
  annuler = 'Annuler',
  varianteConfirmer = 'principal',
  pret = true,
  onConfirmer,
  onAnnuler,
  lireMessage,
  ecranEjpTech = false,
}: Props) {
  const idTitre = useId()
  const idTexte = useId()
  const fenetre = useRef<HTMLDialogElement>(null)
  const [enCours, setEnCours] = useState(false)
  // Lu sans attendre le rendu : deux appuis rapprochés n'envoient qu'une fois.
  const verrou = useRef(false)
  const [erreur, setErreur] = useState<string | null>(null)
  /** Référence d'un échec technique (T76), sous la phrase. */
  const [reference, setReference] = useState<string | null>(null)

  const annulerSiLibre = () => {
    if (!verrou.current) onAnnuler()
  }
  useFenetreModale(fenetre, annulerSiLibre)

  const lancer = async () => {
    if (verrou.current || !pret || !onConfirmer) return
    verrou.current = true
    setEnCours(true)
    setErreur(null)
    try {
      await onConfirmer()
      // Réussite : l'écran retire la fenêtre ; d'ici là, rien ne repart et le libellé reste.
    } catch (refus) {
      verrou.current = false
      setEnCours(false)
      if (!lireMessage) throw refus
      setErreur(lireMessage(refus))
      setReference(referenceEchec(refus))
    }
  }

  return (
    <dialog
      ref={fenetre}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={idTitre}
      aria-describedby={idTexte}
      tabIndex={-1}
      className="m-auto max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-[480px] overflow-y-auto border border-filet bg-papier p-6 text-encre outline-hidden backdrop:bg-encre/50 open:flex open:flex-col open:gap-5"
    >
      {/* Lignes équilibrées : à 390 px, le « ? » ne reste jamais seul sur sa ligne. */}
      <h2 id={idTitre} className="font-lecture text-titre-fenetre text-balance">
        <SansCoupureAuTrait texte={titre} />
      </h2>
      <div id={idTexte} className="leading-normal text-encre-2">
        {texte}
      </div>
      {children}
      <div className="flex flex-col-reverse gap-2 tablette:flex-row tablette:justify-end">
        <Bouton enCours={enCours} onClick={annulerSiLibre}>
          {annuler}
        </Bouton>
        {confirmer === undefined ? null : (
          <Bouton
            variante={varianteConfirmer}
            enCours={enCours}
            indisponible={!pret}
            libelleEnCours={libelleEnCours}
            onClick={() => void lancer()}
          >
            {confirmer}
          </Bouton>
        )}
      </div>
      {erreur !== null ? (
        <ErreurFormulaire message={erreur} reference={reference} ecranEjpTech={ecranEjpTech} />
      ) : null}
    </dialog>
  )
}
