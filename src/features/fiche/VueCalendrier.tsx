import { useId } from 'react'
import { Link } from 'react-router'
import { EtatVide } from '@/components/etats/EtatVide'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { BandeauAlerteFiche } from '@/features/fiche/BandeauAlerteFiche'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import { phrasesBandeau } from '@/features/fiche/construireCalendrier'
import type { LigneCalendrier } from '@/features/fiche/construireCalendrier'
import {
  GRILLE_EVENEMENT,
  GRILLE_EVENEMENT_ACTION,
  LigneEvenement,
} from '@/features/fiche/LigneEvenement'
import { TEXTES_CALENDRIER } from '@/features/fiche/textesCalendrier'
import type { TypeCompte } from '@/lib/base'
import { cn } from '@/lib/utils'

export type EtatCalendrier =
  | { etat: 'chargement' }
  | { etat: 'erreur'; reessayer: () => void }
  | { etat: 'donnees'; lignes: readonly LigneCalendrier[] }

interface Props {
  etat: EtatCalendrier
  profil: TypeCompte
}

const classeBouton =
  'inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-4 text-[15px] font-semibold whitespace-nowrap text-encre hover:bg-fond'

/**
 * « Calendrier prévisionnel » de la fiche (maquettes 04 et 12) : les événements du ministère et
 * ceux qui le mentionnent, datés d'au plus 7 jours dans le passé (et les événements à confirmer,
 * même plus anciens), par date puis nom, avec le statut en mots. Le ministère a « Ajouter un
 * événement » et « Mettre à jour » sur ses événements ; il lit sans bouton ceux qui le mentionnent.
 * Le bandeau d'alerte (T31) ouvre le bloc quand un événement est à confirmer, et disparaît sinon.
 * Vide : « Aucun événement prévu. » (avec « Ajouter un événement » pour le ministère). Lu à part :
 * son problème passager garde le titre et propose « Réessayer ».
 */
export function VueCalendrier({ etat, profil }: Props) {
  const idTitre = useId()
  const estMinistere = profil === 'ministere'
  const ajouter = (
    <Link to="/saisir/evenement" className={classeBouton}>
      {TEXTES_CALENDRIER.ajouter}
    </Link>
  )
  const lignes = etat.etat === 'donnees' ? etat.lignes : []
  const avecAction = lignes.some((ligne) => ligne.versMiseAJour !== null)
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection
        id={idTitre}
        titre={TEXTES_CALENDRIER.titre}
        complement={estMinistere && lignes.length > 0 ? ajouter : undefined}
      />
      {etat.etat === 'chargement' ? <ChargementBloc /> : null}
      {etat.etat === 'erreur' ? (
        <EtatVide
          situation="probleme_passager"
          action={{ libelle: TEXTES_CALENDRIER.reessayer, surClic: etat.reessayer }}
        >
          {TEXTES_CALENDRIER.erreur}
        </EtatVide>
      ) : null}
      {etat.etat === 'donnees' ? (
        etat.lignes.length === 0 ? (
          <EtatVide
            situation="premier_usage"
            peutAgir={estMinistere}
            action={{ libelle: TEXTES_CALENDRIER.ajouter, vers: '/saisir/evenement' }}
          >
            {TEXTES_CALENDRIER.aucun}
          </EtatVide>
        ) : (
          <>
            <BandeauAlerteFiche phrases={phrasesBandeau(etat.lignes, profil)} />
            <div
              aria-hidden="true"
              className={cn(
                GRILLE_EVENEMENT,
                avecAction && GRILLE_EVENEMENT_ACTION,
                'hidden border-b border-filet py-2.5 text-sm text-encre-3 md:grid',
              )}
            >
              <span>{TEXTES_CALENDRIER.colonneDate}</span>
              <span>{TEXTES_CALENDRIER.colonneEvenement}</span>
              <span>{TEXTES_CALENDRIER.colonneStatut}</span>
            </div>
            <ul className="flex flex-col">
              {etat.lignes.map((ligne) => (
                <LigneEvenement key={ligne.id} ligne={ligne} avecAction={avecAction} />
              ))}
            </ul>
          </>
        )
      ) : null}
    </section>
  )
}
