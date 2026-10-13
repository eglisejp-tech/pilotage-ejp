import { BoutonEffacerPrenom } from '@/features/personnes/BoutonEffacerPrenom'
import type { CompteAffiche, PersonneAffichee } from '@/features/personnes/construirePersonnes'
import { TEXTES_PERSONNES } from '@/features/personnes/textes'

interface Props {
  comptes: readonly CompteAffiche[]
  /** « Effacer ce prénom » : ouvre la fenêtre de confirmation. */
  surEffacer: (personne: PersonneAffichee, compte: CompteAffiche) => void
}

/**
 * « Sans activité depuis 30 jours » (T56) : les prénoms pas encore effacés des personnes qui n'ont
 * rien fait depuis 30 jours, avec leur dernière activité et « Effacer ce prénom ». Une personne
 * qui demande l'effacement longtemps après sa dernière venue s'efface ici, sans attendre les
 * 12 mois. Le bloc n'apparaît que s'il a une ligne.
 */
export function BlocSansActivite({ comptes, surEffacer }: Props) {
  if (comptes.length === 0) return null
  return (
    <section aria-labelledby="titre-sans-activite" className="flex flex-col gap-4">
      <h2 id="titre-sans-activite" className="font-lecture text-section leading-tight font-medium">
        {TEXTES_PERSONNES.titreSansActivite}
      </h2>
      <div className="flex flex-col border-t-2 border-encre">
        {comptes.map((compte) => (
          <div key={compte.compte} className="flex flex-col border-b border-filet py-4">
            <h3 className="text-base font-semibold">{compte.libelle}</h3>
            <ul role="list" className="flex flex-col">
              {compte.personnes.map((personne) => (
                <li
                  key={personne.intervenantId}
                  className="flex flex-col gap-2 border-t border-filet py-3 first:border-t-0 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)_11rem] lg:items-center lg:gap-6"
                >
                  <p className="min-w-0 text-[17px] font-semibold wrap-anywhere">
                    {personne.prenom}
                  </p>
                  <dl className="text-sm">
                    <dt className="text-encre-3">{TEXTES_PERSONNES.colonnes.derniere}</dt>
                    <dd>{personne.derniereActivite}</dd>
                  </dl>
                  <BoutonEffacerPrenom
                    prenom={personne.prenom}
                    compte={compte.libelle}
                    onClick={() => surEffacer(personne, compte)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
