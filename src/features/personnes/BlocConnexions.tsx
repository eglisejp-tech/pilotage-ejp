import { EtatVide } from '@/components/etats/EtatVide'
import type { ConnexionAffichee } from '@/features/personnes/construirePersonnes'
import { TEXTES_PERSONNES } from '@/features/personnes/textes'

interface Props {
  connexions: readonly ConnexionAffichee[]
  aPlus: boolean
  plusEnCours: boolean
  surPlus: () => void
}

const classeBouton =
  'inline-flex min-h-cible items-center self-start border border-encre bg-papier px-4 text-sm font-semibold whitespace-nowrap text-encre hover:bg-fond aria-disabled:cursor-wait'

/**
 * « Dernières connexions » (T56) : une phrase par connexion (« Dim. 11 oct., 11 h : Ministère
 * Communication, Marie D. »), de la plus récente à la plus ancienne, 50 puis « Afficher 50 de
 * plus ». Trois personnes connectées au même compte sur trois appareils font trois lignes.
 */
export function BlocConnexions({ connexions, aPlus, plusEnCours, surPlus }: Props) {
  return (
    <section aria-labelledby="titre-connexions" className="flex flex-col gap-4">
      <h2 id="titre-connexions" className="font-lecture text-section leading-tight font-medium">
        {TEXTES_PERSONNES.titreConnexions}
      </h2>
      <div aria-busy={plusEnCours} className="flex flex-col border-t-2 border-encre">
        {connexions.length === 0 ? (
          <EtatVide situation="premier_usage">{TEXTES_PERSONNES.connexionsVide}</EtatVide>
        ) : (
          <ol aria-label={TEXTES_PERSONNES.titreConnexions} className="flex flex-col">
            {connexions.map((connexion) => (
              <li key={connexion.id} className="border-b border-filet py-2.5 wrap-anywhere">
                {connexion.texte}
              </li>
            ))}
          </ol>
        )}
      </div>
      {aPlus ? (
        <button
          type="button"
          aria-disabled={plusEnCours || undefined}
          onClick={() => {
            if (!plusEnCours) surPlus()
          }}
          className={classeBouton}
        >
          {plusEnCours ? TEXTES_PERSONNES.plusEnCours : TEXTES_PERSONNES.plus}
        </button>
      ) : null}
    </section>
  )
}
