import { Link, useSearchParams } from 'react-router'
import { exempleCetteSemaine } from '@/features/cette-semaine/exemple'
import type { ProfilVue } from '@/features/cette-semaine/types'
import { VueCetteSemaine } from '@/features/cette-semaine/VueCetteSemaine'

const profils: { valeur: ProfilVue; libelle: string }[] = [
  { valeur: 'berger', libelle: 'Berger' },
  { valeur: 'conseil', libelle: 'Conseil' },
  { valeur: 'ministere', libelle: 'Ministère (Communication)' },
  { valeur: 'admin_eglise', libelle: "Administration de l'église" },
]

function lireProfil(valeur: string | null): ProfilVue {
  return profils.find((profil) => profil.valeur === valeur)?.valeur ?? 'berger'
}

/**
 * Aperçu de développement de la vue « Cette semaine » avec les données d'exemple, sans base.
 * Adresse : /apercu/cette-semaine?profil=berger|conseil|ministere|admin_eglise
 * (et &session=anti-dispersion). Enregistrée seulement en développement (src/app/routes.tsx).
 */
export function ApercuCetteSemaine() {
  const [parametres] = useSearchParams()
  const profil = lireProfil(parametres.get('profil'))
  const session = parametres.get('session') === 'anti-dispersion' ? 'anti_dispersion' : 'batir'

  return (
    <>
      <title>Aperçu, Cette semaine, Pilotage EJP</title>
      <nav
        aria-label="Profil de l'aperçu"
        className="mb-8 flex flex-wrap items-center gap-x-5 border-b border-filet pb-1 text-sm"
      >
        <p className="text-encre-3">Aperçu, données d'exemple. Profil :</p>
        <ul className="flex flex-wrap gap-x-5">
          {profils.map(({ valeur, libelle }) => (
            <li key={valeur}>
              <Link
                to={`?profil=${valeur}`}
                aria-current={valeur === profil ? 'page' : undefined}
                className="inline-flex min-h-cible items-center text-nuit underline underline-offset-4 aria-[current=page]:font-semibold aria-[current=page]:text-encre aria-[current=page]:no-underline"
              >
                {libelle}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <VueCetteSemaine profil={profil} donnees={exempleCetteSemaine(profil, session)} />
    </>
  )
}
