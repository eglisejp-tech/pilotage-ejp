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
  SOUS_LIGNES,
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
 * Une ligne d'indicateur propre de la fiche : libellé, dernière valeur, petite courbe et date de la
 * dernière saisie sur la première ligne. Dessous, sous le libellé, sur toute la largeur, en petit
 * et en gris (proposition 17, T69) : l'état « à valider » en orange (texte visible ; le détail d'un
 * calcul suffit, sans bulle, T66 t202), l'explication d'une valeur non calculée, la somme de
 * l'année avec sa complétude et son aide, la valeur du mois en cours d'un indicateur du mois,
 * puis, pour un sensible, ses précisions et sa répartition repliée (P45 à P47).
 */
export function LigneIndicateurFiche({ ligne }: Props) {
  const { aides } = ligne
  // Une liste vide ne montre rien : jamais une ligne repliable qui s'ouvre sur un bloc vide (T36).
  const repartitions =
    ligne.sensible?.repartitions && ligne.sensible.repartitions.length > 0
      ? ligne.sensible.repartitions
      : null
  // Une valeur non calculée s'explique par une phrase (« Aucune saisie de ... ») : elle passe sous
  // le libellé, et la dernière colonne ne garde que des dates courtes.
  const explication = ligne.valeur.etat === 'non_calcule' ? ligne.detail : null
  const date = explication === null ? ligne.detail : null
  const sousLignes =
    ligne.aValider !== null ||
    explication !== null ||
    ligne.somme !== null ||
    ligne.moisEnCours !== null ||
    (ligne.sensible !== null && (ligne.sensible.precisions.length > 0 || repartitions !== null))
  return (
    <li className="border-b border-filet py-3">
      <div className={GRILLE_LIGNE}>
        <span className={CASE_LIBELLE}>{ligne.libelle}</span>
        <span className={CASE_VALEUR}>
          <ValeurLigne valeur={ligne.valeur} />
        </span>
        <span className={CASE_ECART} />
        <span className={CASE_COURBE}>
          {ligne.courbe ? (
            <Courbe courbe={ligne.courbe} largeur={COURBE_LARGEUR} hauteur={COURBE_HAUTEUR} />
          ) : null}
        </span>
        <span className={cn(CASE_DETAIL, ligne.detailSignale && 'font-semibold text-attention')}>
          {date}
        </span>
      </div>
      {sousLignes ? (
        <div className={SOUS_LIGNES}>
          {ligne.aValider !== null ? (
            <p className="font-semibold text-attention">{ligne.aValider}</p>
          ) : null}
          {explication !== null ? (
            <p className={cn(ligne.detailSignale && 'font-semibold text-attention')}>
              {explication}
            </p>
          ) : null}
          {ligne.somme !== null ? (
            <p className="flex flex-wrap items-center">
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
            </p>
          ) : null}
          {ligne.moisEnCours !== null ? <p>{ligne.moisEnCours.texte}</p> : null}
          {ligne.sensible?.precisions.map((precision) => (
            <PrecisionSensible key={precision.mois} precision={precision} />
          ))}
          {repartitions !== null ? <RepartitionSensible repartitions={repartitions} /> : null}
        </div>
      ) : null}
    </li>
  )
}
