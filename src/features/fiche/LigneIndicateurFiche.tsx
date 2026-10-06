import { Aide } from '@/components/aide/Aide'
import { Courbe } from '@/features/cette-semaine/Courbe'
import {
  CASE_COURBE,
  CASE_DETAIL,
  CASE_ECART,
  CASE_LIBELLE,
  CASE_VALEUR,
  COURBE_HAUTEUR,
  COURBE_LARGEUR,
  GRILLE_LIGNE,
} from '@/features/fiche/grilleFiche'
import type { LigneIndicateurFiche as Ligne } from '@/features/fiche/modeleFiche'
import { PrecisionSensible } from '@/features/fiche/PrecisionSensible'
import { RepartitionSensible } from '@/features/fiche/RepartitionSensible'
import { ValeurLigne } from '@/features/fiche/ValeurLigne'
import { cn } from '@/lib/utils'

interface Props {
  ligne: Ligne
}

/**
 * Une ligne d'indicateur propre de la fiche : libellé (marque « à valider » en texte visible,
 * aide de la première ligne calculée), dernière valeur, petite courbe, date de la dernière saisie
 * et somme de l'année avec sa complétude. Dessous, pour un indicateur du mois, la valeur du mois
 * en cours ; pour un sensible, ses précisions et sa répartition repliée (P45 à P47).
 */
export function LigneIndicateurFiche({ ligne }: Props) {
  const { aides } = ligne
  const sousLignes =
    ligne.moisEnCours !== null ||
    (ligne.sensible !== null &&
      (ligne.sensible.precisions.length > 0 || ligne.sensible.repartitions !== null))
  return (
    <li className="border-b border-filet py-3">
      <div className={GRILLE_LIGNE}>
        <span className={CASE_LIBELLE}>
          <span className="inline-flex flex-wrap items-center">
            <span>{ligne.libelle}</span>
            {aides.calcule ? (
              <Aide code="fiche.calcule" libelle={ligne.libelle} placement="flottante" />
            ) : null}
          </span>
          {ligne.aValider !== null ? (
            <span className="block text-note font-semibold text-attention">{ligne.aValider}</span>
          ) : null}
        </span>
        <span className={CASE_VALEUR}>
          <ValeurLigne
            valeur={ligne.valeur}
            aideMoinsDe3={aides.moinsDe3 === 'valeur' ? ligne.libelle : undefined}
          />
        </span>
        <span className={CASE_ECART} />
        <span className={CASE_COURBE}>
          {ligne.courbe ? (
            <Courbe courbe={ligne.courbe} largeur={COURBE_LARGEUR} hauteur={COURBE_HAUTEUR} />
          ) : null}
        </span>
        <span className={CASE_DETAIL}>
          {ligne.detail !== null ? (
            <span className={cn('block', ligne.detailSignale && 'font-semibold text-attention')}>
              {ligne.detail}
            </span>
          ) : null}
          {ligne.somme !== null ? (
            <span className="flex flex-wrap items-center">
              <span>
                {ligne.somme.texte}
                {ligne.somme.completude !== null ? ` (${ligne.somme.completude})` : null}
              </span>
              {aides.somme ? (
                <Aide
                  code="fiche.sommeAnnee"
                  libelle={`${ligne.libelle}, ${ligne.somme.completude ?? ligne.somme.texte}`}
                  placement="flottante"
                />
              ) : null}
              {aides.moinsDe3 === 'somme' ? (
                <Aide code="fiche.moinsDe3" libelle={ligne.somme.texte} placement="flottante" />
              ) : null}
            </span>
          ) : null}
        </span>
      </div>
      {sousLignes ? (
        <div className="mt-1.5 flex flex-col gap-1 text-sm text-encre-2">
          {ligne.moisEnCours !== null ? (
            <p className="flex min-h-7 items-center">
              <span>{ligne.moisEnCours.texte}</span>
              {aides.moinsDe3 === 'moisEnCours' ? (
                <Aide
                  code="fiche.moinsDe3"
                  libelle={ligne.moisEnCours.texte}
                  placement="flottante"
                />
              ) : null}
            </p>
          ) : null}
          {ligne.sensible?.precisions.map((precision) => (
            <PrecisionSensible key={precision.mois} precision={precision} />
          ))}
          {ligne.sensible?.repartitions ? (
            <RepartitionSensible
              repartitions={ligne.sensible.repartitions}
              avecAide={aides.repartition === true}
            />
          ) : null}
        </div>
      ) : null}
    </li>
  )
}
