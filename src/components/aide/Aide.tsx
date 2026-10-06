import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { positionnerBulle } from '@/components/aide/positionAide'
import type { PlacementAide } from '@/components/aide/placementAide'
import { TEXTES_AIDE } from '@/components/aide/textesAide'
import type { CodeAide } from '@/components/aide/textesAide'
import { cn } from '@/lib/utils'

export interface AideProps {
  code: CodeAide
  /** Libellé du champ ou du chiffre, pour le nom accessible « Aide : <libellé> ». */
  libelle: string
  /** « flux » (défaut) : sous le libellé, dans le flux. « flottante » : écrans de lecture. */
  placement?: PlacementAide
}

/**
 * Aide contextuelle (T38, docs/conception/aides-contextuelles.md) : un toggletip. Un bouton « ? »
 * juste après le libellé ouvre une bulle par une action volontaire, au clic ou au toucher, à
 * Entrée ou à Espace, jamais au survol seul. Elle se ferme à Échap, à un clic en dehors, au second
 * clic et quand le focus passe sur une autre commande, sans minuterie. Le focus reste sur le
 * bouton. La bulle est dans une région `status`, présente avant l'ouverture et remplie à
 * l'ouverture, pour que les lecteurs d'écran l'annoncent.
 *
 * Le bouton se place hors de tout `<label>` (LibelleAvecAide) et jamais dans un titre. Zone
 * cliquable de 44 px, disque rond de 20 px, le seul élément rond de l'outil (T38, décidé le
 * 6 octobre 2026 ; classe `.aide-forme`, `src/index.css`), la bulle garde ses angles droits. Les écouteurs du
 * document ne vivent que pendant l'ouverture. Ouvrir une aide en ferme une autre : le clic ou le
 * focus sur un autre bouton est « en dehors ». Un clic en dehors ferme au clic, pas à l'appui
 * (voir l'effet ci-dessous).
 */
export function Aide({ code, libelle, placement = 'flux' }: AideProps) {
  const [ouvert, setOuvert] = useState(false)
  const idBulle = useId()
  const bouton = useRef<HTMLButtonElement>(null)
  const zone = useRef<HTMLSpanElement>(null)
  const bulle = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ouvert) return
    const estDedans = (cible: EventTarget | null) =>
      cible instanceof Node &&
      (bouton.current?.contains(cible) === true || zone.current?.contains(cible) === true)
    // La bulle « flux » pousse la page : si elle se fermait dès l'appui (pointerdown, ou le focus
    // que l'appui donne au bouton visé), ce bouton remonterait avant le relâchement et le clic
    // serait perdu (une autre aide, « Enregistrer »). Un appui ne ferme donc rien : la fermeture
    // attend le clic. L'appui dure jusqu'au clic, et non jusqu'au relâchement : au toucher, le
    // navigateur donne le focus après le relâchement (pointerup, puis mousedown et focus, puis
    // click). Un geste annulé (défilement au doigt) ou une touche du clavier y met fin. Le focus
    // qui arrive sans appui (Tab) ferme tout de suite.
    let appui = false
    const surAppui = () => {
      appui = true
    }
    const surAnnulation = () => {
      appui = false
    }
    const surClic = (evenement: Event) => {
      appui = false
      if (!estDedans(evenement.target)) setOuvert(false)
    }
    const surFocus = (evenement: Event) => {
      if (!appui && !estDedans(evenement.target)) setOuvert(false)
    }
    // En capture : Échap ferme l'aide avant le panneau de saisie qui la contient.
    const surTouche = (evenement: KeyboardEvent) => {
      appui = false
      if (evenement.key !== 'Escape') return
      evenement.stopPropagation()
      setOuvert(false)
    }
    document.addEventListener('pointerdown', surAppui)
    document.addEventListener('pointercancel', surAnnulation)
    document.addEventListener('click', surClic)
    document.addEventListener('focusin', surFocus)
    document.addEventListener('keydown', surTouche, true)
    return () => {
      document.removeEventListener('pointerdown', surAppui)
      document.removeEventListener('pointercancel', surAnnulation)
      document.removeEventListener('click', surClic)
      document.removeEventListener('focusin', surFocus)
      document.removeEventListener('keydown', surTouche, true)
    }
  }, [ouvert])

  useLayoutEffect(() => {
    if (!ouvert) return
    const placer = () => {
      if (bulle.current && bouton.current) {
        positionnerBulle(bulle.current, bouton.current, placement)
      }
    }
    placer()
    window.addEventListener('resize', placer)
    return () => window.removeEventListener('resize', placer)
  }, [ouvert, placement])

  const flux = placement === 'flux'

  const boutonAide = (
    <button
      ref={bouton}
      type="button"
      aria-label={`Aide : ${libelle}`}
      aria-expanded={ouvert}
      aria-controls={idBulle}
      onClick={() => setOuvert((precedent) => !precedent)}
      className="group/aide inline-flex size-cible shrink-0 items-center justify-center"
    >
      <span
        aria-hidden="true"
        className="aide-forme grid place-items-center border border-encre-2 bg-papier text-[13px] leading-none font-bold text-encre group-aria-expanded/aide:bg-encre group-aria-expanded/aide:text-papier"
      >
        ?
      </span>
    </button>
  )

  const region = (
    <span ref={zone} id={idBulle} role="status" className={cn(flux && ouvert && 'basis-full')}>
      {ouvert ? (
        <span
          ref={bulle}
          data-cote="bas"
          className={cn(
            'group/bulle block border border-encre bg-encre px-3.5 py-3 text-left text-sm leading-[1.45] font-normal text-papier',
            flux
              ? 'relative mt-2 w-full min-[600px]:max-w-(--aide-largeur)'
              : 'absolute top-[calc(100%+8px)] z-30 w-(--aide-largeur) max-w-[calc(100vw-1rem)] data-[cote=haut]:top-auto data-[cote=haut]:bottom-[calc(100%+8px)]',
          )}
        >
          {TEXTES_AIDE[code]}
          <span
            aria-hidden="true"
            className="absolute -top-1 left-[var(--fleche,1rem)] size-2 -translate-x-1/2 rotate-45 bg-encre group-data-[cote=haut]/bulle:top-auto group-data-[cote=haut]/bulle:-bottom-1"
          />
        </span>
      ) : null}
    </span>
  )

  return flux ? (
    <>
      {boutonAide}
      {region}
    </>
  ) : (
    <span className="relative inline-flex align-middle">
      {boutonAide}
      {region}
    </span>
  )
}
