import { EtatVide } from '@/components/etats/EtatVide'
import type { CompteAffiche, PersonneAffichee } from '@/features/personnes/construirePersonnes'
import { TEXTES_PERSONNES } from '@/features/personnes/textes'
import { nombre } from '@/lib/metier/texte'

interface Props {
  actives: readonly CompteAffiche[]
  /** « Effacer ce prénom » : ouvre la fenêtre de confirmation. */
  surEffacer: (personne: PersonneAffichee, compte: CompteAffiche) => void
}

const classeBouton =
  'inline-flex min-h-cible items-center self-start border border-encre bg-papier px-4 text-sm font-semibold whitespace-nowrap text-encre hover:bg-fond lg:self-center lg:justify-self-end'

/**
 * « Actives sur 30 jours » (T56) : par compte de ministère, chaque prénom avec ses connexions,
 * ses jours d'utilisation, ses actions et sa dernière activité, puis « Effacer ce prénom ». Une
 * liste plutôt qu'un tableau : rien ne déborde à 360 px.
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
                      className={`min-w-0 font-lecture text-[19px] wrap-anywhere ${personne.efface ? 'text-encre-3' : ''}`}
                    >
                      {personne.prenom}
                    </p>
                    <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-encre-3">{colonnes.connexions}</dt>
                        <dd className="tabular-nums">{nombre(personne.connexions)}</dd>
                      </div>
                      <div>
                        <dt className="text-encre-3">{colonnes.jours}</dt>
                        <dd className="tabular-nums">{nombre(personne.jours)}</dd>
                      </div>
                      <div>
                        <dt className="text-encre-3">{colonnes.actions}</dt>
                        <dd className="tabular-nums">{nombre(personne.actions)}</dd>
                      </div>
                      <div>
                        <dt className="text-encre-3">{colonnes.derniere}</dt>
                        <dd>{personne.derniereActivite}</dd>
                      </div>
                    </dl>
                    {personne.efface ? null : (
                      <button
                        type="button"
                        onClick={() => surEffacer(personne, compte)}
                        className={classeBouton}
                      >
                        {TEXTES_PERSONNES.effacer}{' '}
                        <span className="sr-only">{`(${personne.prenom}, ${compte.libelle})`}</span>
                      </button>
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
