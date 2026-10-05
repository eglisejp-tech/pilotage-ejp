import { Link, useSearchParams } from 'react-router'
import { ChargementCetteSemaine } from '@/features/cette-semaine/ChargementCetteSemaine'
import { exempleCetteSemaine, exemplePremierDimanche } from '@/features/cette-semaine/exemple'
import { TEXTES_VIDES } from '@/features/cette-semaine/textesVides'
import type { DonneesCetteSemaine, ProfilVue } from '@/features/cette-semaine/types'
import { VueCetteSemaine } from '@/features/cette-semaine/VueCetteSemaine'
import { ErreurDePage } from '@/pages/ErreurDePage'

const profils: { valeur: ProfilVue; libelle: string }[] = [
  { valeur: 'berger', libelle: 'Berger' },
  { valeur: 'conseil', libelle: 'Conseil' },
  { valeur: 'ministere', libelle: 'Ministère (Communication)' },
  { valeur: 'admin_eglise', libelle: "Administration de l'église" },
]

type EtatApercu = 'semaine' | 'premier-dimanche' | 'session-jamais-tenue' | 'chargement' | 'erreur'

const etats: { valeur: EtatApercu; libelle: string }[] = [
  { valeur: 'semaine', libelle: 'Semaine 39' },
  { valeur: 'premier-dimanche', libelle: 'Premier dimanche' },
  { valeur: 'session-jamais-tenue', libelle: 'Rassemblement jamais tenu' },
  { valeur: 'chargement', libelle: 'Chargement' },
  { valeur: 'erreur', libelle: 'Erreur' },
]

function lireProfil(valeur: string | null): ProfilVue {
  return profils.find((profil) => profil.valeur === valeur)?.valeur ?? 'berger'
}

function lireEtat(valeur: string | null): EtatApercu {
  return etats.find((etat) => etat.valeur === valeur)?.valeur ?? 'semaine'
}

/** `?session=autre` sans aucun autre rassemblement passé (T20, T22). */
function sessionJamaisTenue(profil: ProfilVue): DonneesCetteSemaine {
  return {
    ...exempleCetteSemaine(profil),
    session: {
      etat: 'aucune_session_du_type',
      type: 'autre',
      titre: 'Autre rassemblement',
      autres: [
        { libelle: "Voir Bâtir l'Église", href: `?profil=${profil}` },
        { libelle: 'Voir Anti-Dispersion', href: `?profil=${profil}&session=anti-dispersion` },
      ],
    },
  }
}

const classeLien =
  'inline-flex min-h-cible min-w-cible items-center text-nuit underline underline-offset-4 aria-[current=page]:font-semibold aria-[current=page]:text-encre aria-[current=page]:no-underline'

/**
 * Aperçu de développement de la vue « Cette semaine » avec les données d'exemple, sans base.
 * Adresse : /apercu/cette-semaine?profil=berger|conseil|ministere|admin_eglise
 * (et &session=anti-dispersion, &etat=premier-dimanche|session-jamais-tenue|chargement|erreur).
 * Enregistrée seulement en développement (src/app/routes.tsx).
 */
export function ApercuCetteSemaine() {
  const [parametres] = useSearchParams()
  const profil = lireProfil(parametres.get('profil'))
  const etat = lireEtat(parametres.get('etat'))
  const session = parametres.get('session') === 'anti-dispersion' ? 'anti_dispersion' : 'batir'

  function contenu() {
    switch (etat) {
      case 'semaine':
        return <VueCetteSemaine donnees={exempleCetteSemaine(profil, session)} />
      case 'premier-dimanche':
        return <VueCetteSemaine donnees={exemplePremierDimanche(profil)} />
      case 'session-jamais-tenue':
        return <VueCetteSemaine donnees={sessionJamaisTenue(profil)} />
      case 'chargement':
        return <ChargementCetteSemaine profil={profil} />
      case 'erreur':
        return (
          <>
            <h1 className="sr-only">Cette semaine</h1>
            <ErreurDePage
              message={TEXTES_VIDES.page.erreur}
              libelleBouton={TEXTES_VIDES.page.reessayer}
              onReessayer={() => undefined}
            />
          </>
        )
    }
  }

  return (
    <>
      <title>Aperçu, Cette semaine, Pilotage EJP</title>
      <div className="mb-8 flex flex-col border-b border-filet pb-1 text-sm">
        <nav aria-label="Profil de l'aperçu" className="flex flex-wrap items-center gap-x-5">
          <p className="text-encre-3">Aperçu, données d'exemple. Profil :</p>
          <ul className="flex flex-wrap gap-x-5">
            {profils.map(({ valeur, libelle }) => (
              <li key={valeur}>
                <Link
                  to={`?profil=${valeur}${etat === 'semaine' ? '' : `&etat=${etat}`}`}
                  aria-current={valeur === profil ? 'page' : undefined}
                  className={classeLien}
                >
                  {libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="État de l'aperçu" className="flex flex-wrap items-center gap-x-5">
          <p className="text-encre-3">État :</p>
          <ul className="flex flex-wrap gap-x-5">
            {etats.map(({ valeur, libelle }) => (
              <li key={valeur}>
                <Link
                  to={`?profil=${profil}${valeur === 'semaine' ? '' : `&etat=${valeur}`}`}
                  aria-current={valeur === etat ? 'page' : undefined}
                  className={classeLien}
                >
                  {libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {contenu()}
    </>
  )
}
