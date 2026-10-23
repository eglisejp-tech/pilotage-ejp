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
 * Vérification de la session, plein écran (T65, moment 1 ; T67). La première fois depuis le
 * chargement de l'application, l'ouverture s'affiche tout de suite : le monogramme « ejp » se
 * dessine, la flamme s'allume, le nom apparaît (2,5 s), puis la flamme vit si l'attente continue.
 * Les fois suivantes, et avec moins d'animations, rien pendant 300 ms, puis le monogramme entier
 * et la flamme vivante (immobile avec moins d'animations). Le texte lu arrive à 300 ms ; après
 * 4 s, « Chargement plus long que d'habitude » s'affiche sous le nom (m248).
 */
export function OuvertureOutil({ ouverture }: Props) {
  const mot = useMotChargement(TEXTE_OUVERTURE)
  const moinsDAnimations = useMoinsDAnimations()
  const [phase, setPhase] = useState<'dessin' | 'vivante'>(() =>
    ouverture && !moinsDAnimations ? 'dessin' : 'vivante',
  )
  // L'ouverture se montre dès l'arrivée ; la flamme vivante seule, après 300 ms, avec le texte.
  const visible = phase === 'dessin' || mot !== null
  // Le dessin peut n'apparaître qu'après 300 ms : la ref de rappel le suit dès qu'il est là.
  const { ref: dessin, immobile } = useSvgImmobile()
  const idFlamme = useIdDessin()

  // L'ouverture commence à l'arrivée de l'écran et dure 2,5 s. Effet ordinaire : sa minuterie
  // part après celle de la garde (`useAttenteChargement`, effet de mise en page), qui finit donc
  // la première quand la session est déjà lue : les écrans remplacent le logo complet, sans
  // flamme vivante entre les deux.
  useEffect(() => {
    if (phase !== 'dessin') return
    const minuterie = window.setTimeout(() => setPhase('vivante'), DUREE_OUVERTURE_MS)
    return () => window.clearTimeout(minuterie)
  }, [phase])

  const long = mot === MESSAGES_COMMUNS.chargementLong
  // `aria-busy` marque l'attente sur le dessin ; la zone `status`, à côté, n'est jamais dans un
  // élément `aria-busy` (certains lecteurs d'écran n'annoncent pas ce qui change dans une zone
  // occupée). Elle existe dès le départ, vide, pour que le texte soit annoncé à son arrivée.
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div aria-busy="true" className="contents">
        {!visible ? null : (
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
          </>
        )}
      </div>
      <p role="status" className={long ? 'text-[15px] leading-normal text-encre-2' : 'sr-only'}>
        {mot}
      </p>
    </div>
  )
}
