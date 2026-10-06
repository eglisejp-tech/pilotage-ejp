import { useId } from 'react'
import { Aide } from '@/components/aide/Aide'
import { EtatVide } from '@/components/etats/EtatVide'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { CASE_COURBE, GRILLE_LIGNE } from '@/features/fiche/grilleFiche'
import { LigneCommuneFiche } from '@/features/fiche/LigneCommuneFiche'
import type { DonneesFiche } from '@/features/fiche/modeleFiche'
import { RetiresFiche } from '@/features/fiche/RetiresFiche'
import { SectionRythme } from '@/features/fiche/SectionRythme'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'
import { TEXTES_VIDES_INDICATEURS } from '@/features/indicateurs/textesVides'

interface Props {
  donnees: DonneesFiche
}

/**
 * « Les chiffres du ministère » (maquettes 04 et 12) : les chiffres communs sous le nom de la
 * demande (et les lignes de référence de l'église pour MDS), puis les indicateurs propres par
 * rythme, puis les retirés repliés. Premier usage : la phrase du profil, et pour le ministère une
 * seule action, « Saisir les chiffres du mois », quand un indicateur du mois n'a jamais été saisi.
 */
export function ChiffresDuMinistere({ donnees }: Props) {
  const idTitre = useId()
  const estMinistere = donnees.profil === 'ministere'
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection
        id={idTitre}
        titre={TEXTES_FICHE.titreChiffres}
        complement={
          <span className="text-note text-encre-3">{TEXTES_FICHE.complementChiffres}</span>
        }
      />
      {donnees.aideCourbe ? (
        // En-tête de la colonne des courbes (à partir de 768 px) : son aide dit ce qu'une courbe
        // montre, une seule fois pour toute la fiche.
        <div data-ligne-aide className={`${GRILLE_LIGNE} hidden md:grid`}>
          <span className={`${CASE_COURBE} col-start-4 flex items-center text-note text-encre-3`}>
            {TEXTES_FICHE.colonneCourbe}
            <Aide code="fiche.courbe" libelle={TEXTES_FICHE.colonneCourbe} placement="flottante" />
          </span>
        </div>
      ) : null}
      <ul className="flex flex-col">
        {donnees.communs.map((ligne) => (
          <LigneCommuneFiche key={ligne.cle} ligne={ligne} />
        ))}
      </ul>
      {donnees.sections.map((section) => (
        <SectionRythme key={section.nature} section={section} />
      ))}
      {donnees.sansIndicateurPropre ? (
        <EtatVide situation="premier_usage">
          {estMinistere
            ? TEXTES_VIDES_INDICATEURS.propres.ministere
            : TEXTES_VIDES_INDICATEURS.propres.autres}
        </EtatVide>
      ) : null}
      {donnees.actionSaisirMois ? (
        <EtatVide
          situation="premier_usage"
          action={{ libelle: TEXTES_VIDES_INDICATEURS.actionSaisirLeMois, vers: '/saisir/mois' }}
          peutAgir={estMinistere}
        >
          {TEXTES_FICHE.premiereSaisieDuMois}
        </EtatVide>
      ) : null}
      {donnees.sansIndicateurPropre && donnees.retires.length === 0 ? null : (
        <RetiresFiche retires={donnees.retires} />
      )}
    </section>
  )
}
