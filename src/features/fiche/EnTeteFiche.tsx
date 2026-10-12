import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Aide } from '@/components/aide/Aide'
import { CLASSE_BOUTON_SECONDAIRE_FICHE } from '@/features/fiche/classesFiche'
import { MarqueFraicheur } from '@/features/fiche/MarqueFraicheur'
import type { DonneesFiche } from '@/features/fiche/modeleFiche'
import { PhraseFiche } from '@/features/fiche/PhraseFiche'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'
import { adresseSaisieSession } from '@/features/saisie-session/session'

interface Props {
  donnees: DonneesFiche
  /** Emplacement « Prochaine réunion » (lot E6), sous la fraîcheur ; rien tant qu'il est vide. */
  reunion?: ReactNode
  /** Emplacement du bouton « Nouveau point » (lot P4), à la suite des boutons de saisie. */
  nouveauPoint?: ReactNode
}

/**
 * Ouverture de la fiche (maquettes 04 et 12) : surtitre (« Votre ministère », ou le chemin
 * « Ministères, Communication »), nom du ministère, phrase de la fiche, fraîcheur avec son aide,
 * prochaine réunion (emplacement de E6), puis, pour le ministère seulement, ses boutons de saisie.
 * EJP Tech lit la fiche sans aucun bouton (T29).
 */
export function EnTeteFiche({ donnees, reunion, nouveauPoint }: Props) {
  const { ministere, profil, fraicheur } = donnees
  const estMinistere = profil === 'ministere'
  return (
    <header className="flex flex-col gap-3.5">
      {estMinistere ? (
        <p className="text-sm text-encre-3">{TEXTES_FICHE.surtitreMinistere}</p>
      ) : (
        <nav aria-label="Chemin" className="text-sm text-encre-3">
          <Link
            to="/ministeres"
            className="-my-3 inline-flex min-h-cible items-center underline underline-offset-4"
          >
            {TEXTES_FICHE.lienMinisteres}
          </Link>
          , {ministere.nom}
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div className="flex max-w-[54rem] min-w-0 flex-col gap-3.5">
          <h1 className="font-lecture text-[clamp(40px,4.2vw,56px)] leading-none font-medium break-words">
            {ministere.nom}
          </h1>
          <PhraseFiche phrase={donnees.phrase} />
        </div>
        <div className="flex min-w-60 flex-col gap-1.5 text-[15px]">
          <p data-ligne-aide className="flex items-center">
            <MarqueFraicheur libelle={fraicheur.libelle} etat={fraicheur.etat} />
            <Aide code="fiche.fraicheur" libelle={fraicheur.libelle} placement="flottante" />
          </p>
          {reunion}
        </div>
      </div>
      {estMinistere ? (
        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            to="/saisir/dimanche"
            className="inline-flex min-h-cible items-center justify-center bg-lumiere px-5 text-[15px] font-semibold whitespace-nowrap text-encre"
          >
            {TEXTES_FICHE.saisirDimanche}
          </Link>
          {/* Une seule fois sur la page : au premier usage, l'action est dans le bloc des chiffres. */}
          {donnees.aDesIndicateursDuMois && !donnees.actionSaisirMois ? (
            <Link to="/saisir/mois" className={CLASSE_BOUTON_SECONDAIRE_FICHE}>
              {TEXTES_FICHE.saisirMois}
            </Link>
          ) : null}
          <Link to={adresseSaisieSession()} className={CLASSE_BOUTON_SECONDAIRE_FICHE}>
            {TEXTES_FICHE.saisirSession}
          </Link>
          {nouveauPoint}
        </div>
      ) : null}
    </header>
  )
}
