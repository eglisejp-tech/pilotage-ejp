import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { PetiteFlamme } from '@/components/etats/PetiteFlamme'

interface Props {
  /** Envoi en cours : la petite flamme et « … en cours » remplacent le libellé. */
  enCours: boolean
  /** « Envoi en cours », « Enregistrement en cours » : ce que fait le bouton pendant l'envoi. */
  libelleEnCours: string
  /** Le libellé au repos (« Enregistrer les chiffres »). */
  children: ReactNode
}

/**
 * Contenu d'un bouton qui envoie (T65, moment 4) : au repos, son libellé ; pendant l'envoi, la
 * petite flamme (dessin, `aria-hidden`) et « … en cours », qui devient le nom du bouton. Le bouton
 * garde sa largeur : il ne rétrécit pas quand le libellé change (largeur mesurée au repos, posée
 * en `min-width` pendant l'envoi, jamais plus large que la place disponible). Il ne grandit que
 * si « … en cours » demande plus de place (« Valider », « Validation en cours ») : le texte reste
 * entier, sur une ligne ; écart avec la proposition, consigné dans T65. Un bouton pleine largeur
 * n'en a pas besoin, mais la règle ne le gêne pas.
 */
export function LibelleEnvoi({ enCours, libelleEnCours, children }: Props) {
  const repere = useRef<HTMLSpanElement>(null)
  const largeurAuRepos = useRef(0)

  // Après chaque rendu, avant l'affichage : au repos, on mesure ; pendant l'envoi, on garde.
  useLayoutEffect(() => {
    const bouton = repere.current?.closest('button')
    if (!bouton) return
    if (!enCours) {
      bouton.style.minWidth = ''
      largeurAuRepos.current = bouton.getBoundingClientRect().width
      return
    }
    if (largeurAuRepos.current > 0) {
      bouton.style.minWidth = `min(${largeurAuRepos.current}px, 100%)`
    }
  })

  return (
    <span ref={repere} className="contents">
      {enCours ? (
        <span className="inline-flex items-center justify-center gap-2">
          <PetiteFlamme couleur="bouton" />
          {libelleEnCours}
        </span>
      ) : (
        children
      )}
    </span>
  )
}
