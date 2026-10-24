import { useId, useRef } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import { TEXTES_FERMER_SANS_ENREGISTRER } from '@/features/saisie/textes'
import { usePiegeFocus } from '@/features/saisie/usePiegeFocus'

interface Props {
  /** « Fermer sans enregistrer » : le panneau se ferme, la saisie est perdue. */
  onFermer: () => void
  /** « Continuer la saisie », Échap : la fenêtre se ferme, le focus revient où il était. */
  onContinuer: () => void
}

/**
 * Confirmation avant de fermer un panneau de saisie dont un champ a changé (m265 ; guide des
 * messages, 10.7) : titre en question, la conséquence, « Continuer la saisie » et « Fermer sans
 * enregistrer ». Fenêtre modale (`alertdialog`) comme les autres confirmations : le focus entre sur
 * la fenêtre, qui annonce son titre et sa phrase, Tab et Maj+Tab y restent, Échap vaut « Continuer
 * la saisie », et le focus revient à l'élément d'où la fermeture a été demandée.
 */
export function FenetreFermerSansEnregistrer({ onFermer, onContinuer }: Props) {
  const idTitre = useId()
  const idTexte = useId()
  const fenetre = useRef<HTMLDivElement>(null)
  usePiegeFocus(fenetre, true, onContinuer)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-encre/50" />
      <div
        ref={fenetre}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        aria-describedby={idTexte}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-[480px] flex-col gap-5 overflow-y-auto border border-filet bg-papier p-6 outline-hidden"
      >
        {/* Lignes équilibrées : à 390 px, le « ? » ne reste jamais seul sur sa ligne. */}
        <h2 id={idTitre} className="font-lecture text-titre-fenetre text-balance">
          {TEXTES_FERMER_SANS_ENREGISTRER.titre}
        </h2>
        <p id={idTexte} className="leading-normal text-encre-2">
          {TEXTES_FERMER_SANS_ENREGISTRER.texte}
        </p>
        {/* Comme FenetreConfirmation : côte à côte à droite à partir de 600 px. */}
        <div className="flex flex-col-reverse gap-2 tablette:flex-row tablette:justify-end">
          <Bouton onClick={onContinuer}>{TEXTES_FERMER_SANS_ENREGISTRER.continuer}</Bouton>
          <Bouton variante="sombre" onClick={onFermer}>
            {TEXTES_FERMER_SANS_ENREGISTRER.fermer}
          </Bouton>
        </div>
      </div>
    </div>
  )
}
