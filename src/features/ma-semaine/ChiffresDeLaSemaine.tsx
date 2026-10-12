import { useId } from 'react'
import { Link } from 'react-router'
import { TitreSection } from '@/features/cette-semaine/TitreSection'
import { LigneCommuneFiche } from '@/features/fiche/LigneCommuneFiche'
import type { LigneCommune } from '@/features/fiche/modeleFiche'
import { TEXTES_MA_SEMAINE } from './textesMaSemaine'

interface Props {
  /** STARs au service, actifs, en FIJ, sessions de la semaine, indicateurs propres. */
  lignes: readonly LigneCommune[]
  /** Carte et chiffres par département : le ministère FIJ seul, vide pour les autres. */
  fij: readonly LigneCommune[]
}

/**
 * « Vos chiffres de la semaine » : les chiffres du ministère comme sur « Ma fiche » (écart au
 * dimanche d'avant, courbe des dix derniers dimanches, date de la saisie), puis un lien vers
 * l'historique complet. Une ligne sans saisie le dit (« Pas encore de saisie »), jamais un 0.
 */
export function ChiffresDeLaSemaine({ lignes, fij }: Props) {
  const idTitre = useId()
  return (
    <section aria-labelledby={idTitre} className="flex min-w-0 flex-col">
      <TitreSection id={idTitre} titre={TEXTES_MA_SEMAINE.titreChiffres} />
      <ul className="flex flex-col">
        {[...lignes, ...fij].map((ligne) => (
          <LigneCommuneFiche key={ligne.cle} ligne={ligne} />
        ))}
      </ul>
      <Link
        to="/ma-fiche"
        className="mt-1 inline-flex min-h-cible items-center self-start text-sm text-nuit underline underline-offset-4"
      >
        {TEXTES_MA_SEMAINE.lienFiche}
      </Link>
    </section>
  )
}
