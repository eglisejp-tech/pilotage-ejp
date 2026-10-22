import { Link, useSearchParams } from 'react-router'
import { BoutonLigneSimule } from '@/features/chargement/apercu/BoutonLigneSimule'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { DernieresSaisies } from '@/features/fiche/DernieresSaisies'
import type { DerniereSaisieFiche } from '@/features/fiche/modeleFiche'
import { VueCalendrier } from '@/features/fiche/VueCalendrier'
import { ChargementJournal } from '@/features/journal/ChargementJournal'
import { ChargementMaSemaine } from '@/features/ma-semaine/ChargementMaSemaine'

type Moment = 'page' | 'liste' | 'bloc' | 'envoi'

/**
 * Les moments d'attente de T65, chacun avec l'adresse de son aperçu. `onglet` : l'onglet de
 * l'écran montré (le journal, la fiche), actif dans l'en-tête comme dans l'application.
 */
const MOMENTS: { valeur: Moment | 'ouverture'; libelle: string; adresse: string }[] = [
  { valeur: 'ouverture', libelle: "Ouverture de l'outil", adresse: '/apercu/ouverture' },
  {
    valeur: 'page',
    libelle: 'Une page qui charge',
    adresse: '/apercu/chargement?moment=page&profil=ministere',
  },
  {
    valeur: 'liste',
    libelle: 'Une liste qui charge',
    adresse: '/apercu/chargement?moment=liste&profil=berger&onglet=/journal',
  },
  {
    valeur: 'bloc',
    libelle: 'Un bloc qui se relit',
    adresse: '/apercu/chargement?moment=bloc&profil=ministere&onglet=/ma-fiche',
  },
  {
    valeur: 'envoi',
    libelle: 'Un envoi',
    adresse: '/apercu/chargement?moment=envoi&profil=ministere',
  },
]

function lireMoment(valeur: string | null): Moment {
  return valeur === 'liste' || valeur === 'bloc' || valeur === 'envoi' ? valeur : 'page'
}

/** Deux lignes d'exemple, sans donnée personnelle, pour le bloc déjà lu. */
const SAISIES_EXEMPLE: DerniereSaisieFiche[] = [
  {
    id: 1,
    quand: '11 oct., 12 h 41',
    texte: 'Chiffres du dimanche 11 oct. enregistrés',
    objet: null,
  },
  {
    id: 2,
    quand: '4 oct., 12 h 15',
    texte: 'Chiffres du dimanche 4 oct. enregistrés',
    objet: null,
  },
]

const classeLien =
  'inline-flex min-h-cible items-center text-nuit underline underline-offset-4 aria-[current=page]:font-semibold aria-[current=page]:text-encre aria-[current=page]:no-underline'

/**
 * Un envoi (moment 4) : le bouton d'enregistrement d'une saisie (pleine largeur) et deux boutons
 * de ligne. « Renvoyer l'invitation » devient « Envoi en cours », plus court : le bouton garde sa
 * largeur. « Valider » devient « Validation en cours », plus long : le bouton ne rétrécit jamais,
 * mais s'élargit pour l'afficher (écart consigné dans T65). `enCours` force l'état pour les
 * captures ; sinon un clic simule un envoi de 1,5 s.
 */
function Envoi({ enCours }: { enCours: boolean }) {
  return (
    <div className="flex max-w-[460px] flex-col gap-8">
      <h1 className="font-lecture text-titre leading-tight font-medium">Chiffres du dimanche</h1>
      <form className="flex flex-col gap-4" onSubmit={(evenement) => evenement.preventDefault()}>
        <p className="text-[15px]">STARs au service ce dimanche : 10</p>
        <BoutonEnregistrer
          libelle="Enregistrer les chiffres"
          enCours={enCours}
          libelleEnCours="Enregistrement en cours"
        />
      </form>
      <div className="flex flex-wrap items-center gap-3 border-t border-filet pt-4">
        <p className="text-[15px]">Projets en cours, demandé par Communication</p>
        <BoutonLigneSimule
          libelle="Valider"
          libelleEnCours="Validation en cours"
          enCours={enCours}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-filet pt-4">
        <p className="text-[15px]">Compte de Social, invitation sans réponse</p>
        <BoutonLigneSimule
          libelle="Renvoyer l'invitation"
          libelleEnCours="Envoi en cours"
          enCours={enCours}
        />
      </div>
    </div>
  )
}

/**
 * Aperçu de développement des attentes de l'outil (T65), sans base : les composants réels de
 * chaque moment, figés dans leur attente. Adresse : /apercu/chargement?moment=page|liste|bloc|envoi
 * (et &etat=en-cours pour l'envoi). L'ouverture de l'outil, plein écran, est sur
 * /apercu/ouverture.
 */
export function ApercuChargement() {
  const [parametres] = useSearchParams()
  const moment = lireMoment(parametres.get('moment'))
  return (
    <div className="flex flex-col gap-10">
      <nav aria-label="Moments d'attente" className="flex flex-wrap gap-x-5 text-sm">
        {MOMENTS.map((choix) => (
          <Link
            key={choix.valeur}
            to={choix.adresse}
            aria-current={choix.valeur === moment ? 'page' : undefined}
            className={classeLien}
          >
            {choix.libelle}
          </Link>
        ))}
      </nav>
      {moment === 'page' ? <ChargementMaSemaine /> : null}
      {moment === 'liste' ? <ChargementJournal titre="Journal" profil="berger" /> : null}
      {moment === 'bloc' ? (
        <div className="flex max-w-[720px] flex-col gap-12">
          <h1 className="font-lecture text-titre leading-tight font-medium">Ma fiche</h1>
          <DernieresSaisies
            bloc={{ etat: 'donnees', donnees: SAISIES_EXEMPLE }}
            lienJournal="/apercu/journal"
          />
          <VueCalendrier etat={{ etat: 'chargement' }} profil="ministere" />
        </div>
      ) : null}
      {moment === 'envoi' ? <Envoi enCours={parametres.get('etat') === 'en-cours'} /> : null}
    </div>
  )
}
