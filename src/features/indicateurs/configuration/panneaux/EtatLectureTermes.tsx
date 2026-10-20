import { TEXTES_PANNEAUX } from '@/features/indicateurs/configuration/panneaux/textes'

interface Props {
  /** La lecture est en cours : « Lecture du calcul. » ; sinon elle a échoué. */
  enCours: boolean
  message: string
  erreur: string
  reessayer: () => void
}

/**
 * Chargement ou échec de la lecture des termes d'un calcul, dans un panneau ou une fenêtre. La
 * zone `status` ne porte pas `aria-busy` : certains lecteurs d'écran n'annoncent pas ce qui change
 * dans une zone occupée (T65, accessibilité).
 */
export function EtatLectureTermes({ enCours, message, erreur, reessayer }: Props) {
  if (enCours) {
    return (
      <p role="status" className="leading-normal text-encre-2">
        {message}
      </p>
    )
  }
  return (
    <div className="flex flex-col items-start gap-3">
      <p role="alert" className="bg-alerte-fond px-3.5 py-3 text-[15px] leading-normal text-alerte">
        {erreur}
      </p>
      <button
        type="button"
        onClick={reessayer}
        className="inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-4.5 text-[15px] font-semibold text-encre hover:bg-fond"
      >
        {TEXTES_PANNEAUX.reessayer}
      </button>
    </div>
  )
}
