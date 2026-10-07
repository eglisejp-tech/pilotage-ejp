import { useId } from 'react'
import { Link } from 'react-router'
import { EtatVide } from '@/components/etats/EtatVide'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import { ActionsMinistere } from '@/features/indicateurs/configuration/ActionsMinistere'
import { BlocPrevus } from '@/features/indicateurs/configuration/BlocPrevus'
import type { ConfigurationMinistere } from '@/features/indicateurs/configuration/construire'
import { deMinistere } from '@/features/indicateurs/configuration/phrases'
import { resteAChoisirOuCreer } from '@/features/indicateurs/configuration/prevus'
import { ReussiteCreation } from '@/features/indicateurs/configuration/ReussiteCreation'
import { RetiresConfiguration } from '@/features/indicateurs/configuration/RetiresConfiguration'
import { SectionConfiguration } from '@/features/indicateurs/configuration/SectionConfiguration'
import {
  aucunIndicateurPour,
  TEXTES_CONFIGURATION,
} from '@/features/indicateurs/configuration/textes'
import type { CreationPrevus } from '@/features/indicateurs/configuration/useCreationPrevus'
import type { ResultatConfigurationMinistere } from '@/features/indicateurs/configuration/useLecturesConfiguration'
import type { TypeCompte } from '@/lib/base'
import { ErreurDePage } from '@/pages/ErreurDePage'

interface Props {
  /** Titre de l'écran pour ce profil (« Indicateurs d'un ministère »), avant que le nom arrive. */
  titre: string
  profil: TypeCompte
  ministere: ResultatConfigurationMinistere
  creation: CreationPrevus
}

const textes = TEXTES_CONFIGURATION

const classeTitre = 'font-lecture text-titre leading-tight font-medium'

function Donnees({
  donnees,
  profil,
  creation,
}: {
  donnees: ConfigurationMinistere
  profil: TypeCompte
  creation: CreationPrevus
}) {
  // La première ligne qui a un usage porte l'aide : une seule pour tout l'écran.
  const idLigneAide =
    donnees.sections.flatMap((section) => section.lignes).find((ligne) => ligne.usage !== null)
      ?.id ?? null
  return (
    <>
      {donnees.phrase !== null ? (
        <p className="mt-4 max-w-prose text-encre-2">{donnees.phrase}</p>
      ) : null}
      <ActionsMinistere ministereId={donnees.id} ministereNom={donnees.nom} profil={profil} />
      <ReussiteCreation creation={creation} />
      <BlocPrevus key={donnees.id} donnees={donnees} creation={creation} />
      {donnees.sansIndicateur && !resteAChoisirOuCreer(donnees.prevus) ? (
        <EtatVide situation="premier_usage">{aucunIndicateurPour(donnees.nom)}</EtatVide>
      ) : null}
      {donnees.sections.map((section) => (
        <SectionConfiguration
          key={section.cle}
          section={section}
          ministereId={donnees.id}
          ministereNom={donnees.nom}
          profil={profil}
          idLigneAide={idLigneAide}
        />
      ))}
      <RetiresConfiguration retires={donnees.retires} />
    </>
  )
}

/**
 * Écran `/indicateurs/:id` (administration et EJP Tech ; configuration-indicateurs.md, 7.2) : la
 * phrase du ministère, les actions (L3b), le bloc « Prévus par la coordination » tant qu'il en
 * reste à créer, puis les sections par rythme, les calculs et les retirés repliés. Jamais une
 * valeur. Un ministère inconnu ou désactivé donne l'état « introuvable », sans requête de plus.
 */
export function VueIndicateursMinistere({ titre, profil, ministere, creation }: Props) {
  const idTitre = useId()
  const titreAffiche =
    ministere.etat === 'pret' ? `Indicateurs ${deMinistere(ministere.donnees.nom)}` : titre
  useTitrePage(titreAffiche)
  return (
    <section aria-labelledby={idTitre} className="flex flex-col">
      <Link
        to="/indicateurs"
        className="inline-flex min-h-cible items-center self-start text-[15px] underline underline-offset-4"
      >
        {textes.ministere.retour}
      </Link>
      <h1 id={idTitre} className={classeTitre}>
        {titreAffiche}
      </h1>
      <div className="mt-2 border-t-2 border-encre" />
      {ministere.etat === 'erreur' ? (
        <div className="mt-6">
          <ErreurDePage
            message={textes.erreur}
            libelleBouton={textes.reessayer}
            onReessayer={ministere.reessayer}
          />
        </div>
      ) : null}
      {ministere.etat === 'chargement' ? <ChargementBloc /> : null}
      {ministere.etat === 'introuvable' ? (
        <EtatVide
          situation="aucun_resultat"
          action={{ libelle: textes.revenir, vers: '/indicateurs' }}
        >
          {textes.introuvable}
        </EtatVide>
      ) : null}
      {ministere.etat === 'pret' ? (
        <Donnees donnees={ministere.donnees} profil={profil} creation={creation} />
      ) : null}
    </section>
  )
}
