import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { bandeauMasque } from '@/features/avancement/bandeauMasque'
import { ETAPES, MISE_A_JOUR } from '@/features/avancement/etapes'
import { ListeEtapes } from '@/features/avancement/ListeEtapes'
import { ecrireFermeture, lireFermeture } from '@/features/avancement/memoire'
import { resumer } from '@/features/avancement/resumer'
import { SegmentsAvancement } from '@/features/avancement/SegmentsAvancement'
import {
  notePanneau,
  phraseEnLigne,
  phraseProchaine,
  TEXTES,
} from '@/features/avancement/textesAvancement'

const BOUTON =
  'inline-flex min-h-cible items-center text-sm whitespace-nowrap text-encre-3 underline underline-offset-4'

// Le remplissage des cases ne joue qu'une fois par chargement de la page.
let remplissageJoue = false

/**
 * Ligne de service sous l'en-tête des pages connectées (T50). Une région nommée, sans
 * `role="status"` : rien n'est annoncé au chargement.
 */
export function BandeauAvancement() {
  const { pathname } = useLocation()
  const [ferme, setFerme] = useState(() => lireFermeture() === MISE_A_JOUR)
  const [ouvert, setOuvert] = useState(false)
  const [anime] = useState(() => !remplissageJoue)
  const bouton = useRef<HTMLButtonElement>(null)
  const idPanneau = useId()

  useEffect(() => {
    remplissageJoue = true
  }, [])

  if (ferme || bandeauMasque(pathname)) return null

  const resume = resumer(ETAPES)

  function fermer() {
    ecrireFermeture(MISE_A_JOUR)
    setFerme(true)
    document.getElementById('contenu')?.focus()
  }

  return (
    <section
      aria-label={TEXTES.region}
      className="border-b border-filet"
      onKeyDown={(evenement) => {
        if (evenement.key === 'Escape' && ouvert) {
          setOuvert(false)
          bouton.current?.focus()
        }
      }}
    >
      <div className="mx-auto box-content flex max-w-contenu flex-wrap items-center gap-x-4 px-marge">
        <p className="text-sm text-encre-2">
          <span className="font-chiffres font-extrabold text-encre">{resume.enLigne}</span>{' '}
          {phraseEnLigne(resume.enLigne, resume.total)}
          <span className="hidden lg:inline">
            {' '}
            {resume.prochaine
              ? phraseProchaine(resume.prochaine.partie.quoi, resume.prochaine.partie.date)
              : TEXTES.toutEnLigne}
          </span>
        </p>
        <SegmentsAvancement etapes={ETAPES} anime={anime} />
        <div className="ml-auto flex items-center gap-x-4">
          <button
            ref={bouton}
            type="button"
            aria-expanded={ouvert}
            aria-controls={idPanneau}
            onClick={() => setOuvert((valeur) => !valeur)}
            className={BOUTON}
          >
            {ouvert ? (
              TEXTES.masquer
            ) : (
              <>
                {TEXTES.voirCourt}{' '}
                <span className="sr-only min-[600px]:not-sr-only">{TEXTES.voirSuite}</span>
              </>
            )}
          </button>
          <button type="button" onClick={fermer} className={BOUTON}>
            {TEXTES.fermer} <span className="sr-only">{TEXTES.fermerSuite}</span>
          </button>
        </div>
      </div>
      <div
        id={idPanneau}
        hidden={!ouvert}
        className="animate-in duration-200 ease-out fade-in slide-in-from-top-1"
      >
        <div className="mx-auto box-content max-w-contenu space-y-4 px-marge pt-2 pb-6">
          <p className="text-note text-encre-3">{notePanneau(MISE_A_JOUR)}</p>
          <ListeEtapes etapes={ETAPES} numeroProchaine={resume.prochaine?.numero ?? null} />
        </div>
      </div>
    </section>
  )
}
