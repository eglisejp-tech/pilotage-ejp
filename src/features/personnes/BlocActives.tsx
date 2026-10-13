import { EtatVide } from '@/components/etats/EtatVide'
import { BoutonEffacerPrenom } from '@/features/personnes/BoutonEffacerPrenom'
import type { CompteAffiche, PersonneAffichee } from '@/features/personnes/construirePersonnes'
import { TEXTES_PERSONNES } from '@/features/personnes/textes'
import { nombre } from '@/lib/metier/texte'

interface Props {
  actives: readonly CompteAffiche[]
  /** « Effacer ce prénom » : ouvre la fenêtre de confirmation. */
  surEffacer: (personne: PersonneAffichee, compte: CompteAffiche) => void
}

const classeChiffre = 'font-chiffres text-[19px] leading-tight font-extrabold tabular-nums'

/**
 * « Actives sur 30 jours » (T56) : par compte de ministère, chaque prénom avec ses connexions,
 * ses jours d'utilisation, ses actions et sa dernière activité, puis « Effacer ce prénom ». Une
 * liste plutôt qu'un tableau : rien ne déborde à 360 px. Les chiffres en Big Shoulders Display.
 */
export function BlocActives({ actives, surEffacer }: Props) {
  const { colonnes } = TEXTES_PERSONNES
  return (
    <section aria-labelledby="titre-actives" className="flex flex-col gap-4">
      <h2 id="titre-actives" className="font-lecture text-section leading-tight font-medium">
        {TEXTES_PERSONNES.titreActives}
      </h2>
      <div className="flex flex-col border-t-2 border-encre">
        {actives.length === 0 ? (
          <EtatVide situation="premier_usage">{TEXTES_PERSONNES.activesVide}</EtatVide>
        ) : (
          actives.map((compte) => (
            <div key={compte.compte} className="flex flex-col border-b border-filet py-4">
              <h3 className="text-base font-semibold">{compte.libelle}</h3>
              <ul role="list" className="flex flex-col">
                {compte.personnes.map((personne) => (
                  <li
                    key={personne.intervenantId}
                    className="flex flex-col gap-2 border-t border-filet py-3 first:border-t-0 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)_11rem] lg:items-center lg:gap-6"
                  >
                    <p
                      className={`min-w-0 text-[17px] font-semibold wrap-anywhere ${personne.efface ? 'text-encre-3' : ''}`}
                    >
                      {personne.prenom}
                    </p>
                    <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-encre-3">{colonnes.connexions}</dt>
                        <dd className={classeChiffre}>{nombre(personne.connexions)}</dd>
                      </div>
                      <div>
                        <dt className="text-encre-3">{colonnes.jours}</dt>
                        <dd className={classeChiffre}>{nombre(personne.jours)}</dd>
                      </div>
                      <div>
                        <dt className="text-encre-3">{colonnes.actions}</dt>
                        <dd className={classeChiffre}>{nombre(personne.actions)}</dd>
                      </div>
                      <div>
                        <dt className="text-encre-3">{colonnes.derniere}</dt>
                        <dd>{personne.derniereActivite}</dd>
                      </div>
                    </dl>
                    {personne.efface ? null : (
                      <BoutonEffacerPrenom
                        prenom={personne.prenom}
                        compte={compte.libelle}
                        onClick={() => surEffacer(personne, compte)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
