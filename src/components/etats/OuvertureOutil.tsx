import { useEffect, useState } from 'react'
import { FlammeAnimee } from '@/components/etats/FlammeAnimee'
import { FLAMME, MONOGRAMME } from '@/components/etats/formesFlamme'
import { DUREE_OUVERTURE_MS } from '@/components/etats/tempsChargement'
import { useIdDessin } from '@/components/etats/useIdDessin'
import { useMoinsDAnimations } from '@/components/etats/useMoinsDAnimations'
import { useMotChargement } from '@/components/etats/useMotChargement'
import { useSvgImmobile } from '@/components/etats/useSvgImmobile'
import { MESSAGES_COMMUNS } from '@/data/messagesBase'

/** Ce que lit un lecteur d'écran pendant la vérification de la session. */
export const TEXTE_OUVERTURE = 'Chargement de Pilotage EJP'

/** Le nom de l'outil, sous le monogramme (un dessin : le lecteur d'écran lit TEXTE_OUVERTURE). */
const NOM_OUTIL = 'Pilotage EJP'

interface Props {
  /** Première vérification depuis le chargement de l'application : l'ouverture joue. */
  ouverture: boolean
}

/**
 * Vérification de la session, plein écran (T65, moment 1). Rien pendant 300 ms. Puis, la première
 * fois depuis le chargement de l'application, l'ouverture : le monogramme « ejp » se dessine et
 * la flamme s'allume (1,2 s), puis la flamme vit si l'attente continue ; les fois suivantes, le
 * monogramme est déjà là et la flamme vit tout de suite. Après 4 s, « Chargement plus long que
 * d'habitude » s'affiche sous le nom (m248). Avec moins d'animations : tout est immobile.
 */
export function OuvertureOutil({ ouverture }: Props) {
  const mot = useMotChargement(TEXTE_OUVERTURE)
  const moinsDAnimations = useMoinsDAnimations()
  const [phase, setPhase] = useState<'dessin' | 'vivante'>(() =>
    ouverture && !moinsDAnimations ? 'dessin' : 'vivante',
  )
  const visible = mot !== null
  // Le dessin n'apparaît qu'après 300 ms : la ref de rappel le suit dès qu'il est là.
  const { ref: dessin, immobile } = useSvgImmobile()
  const idFlamme = useIdDessin()

  // L'ouverture commence quand le dessin apparaît (300 ms) et dure 1,2 s.
  useEffect(() => {
    if (!visible || phase !== 'dessin') return
    const minuterie = window.setTimeout(() => setPhase('vivante'), DUREE_OUVERTURE_MS)
    return () => window.clearTimeout(minuterie)
  }, [visible, phase])

  const long = mot === MESSAGES_COMMUNS.chargementLong
  return (
    <div role="status" className="flex flex-col items-center gap-3 text-center">
      {mot === null ? null : (
        <>
          <svg
            ref={dessin}
            viewBox="8 82 152 204"
            aria-hidden="true"
            focusable="false"
            data-ouverture={phase}
            data-immobile={immobile ? '' : undefined}
            className="h-32 w-24 overflow-visible"
          >
            {MONOGRAMME.map((trait) => (
              <path key={trait} className="ouverture-trace" pathLength={1} d={trait} />
            ))}
            {phase === 'dessin' ? (
              <>
                <defs>
                  <linearGradient id={idFlamme} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" style={{ stopColor: 'var(--flamme-haut)' }} />
                    <stop offset="1" style={{ stopColor: 'var(--flamme-bas)' }} />
                  </linearGradient>
                </defs>
                <path className="ouverture-allumage" fill={`url(#${idFlamme})`} d={FLAMME} />
              </>
            ) : (
              <FlammeAnimee />
            )}
          </svg>
          <p
            aria-hidden="true"
            className={`font-lecture text-xl font-semibold text-encre ${phase === 'dessin' ? 'ouverture-nom' : ''}`}
          >
            {NOM_OUTIL}
          </p>
          <p className={long ? 'text-[15px] leading-normal text-encre-2' : 'sr-only'}>{mot}</p>
        </>
      )}
    </div>
  )
}
