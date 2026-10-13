import { useEffect, useId, useMemo, useRef } from 'react'
import { Link } from 'react-router'
import { EtatVide } from '@/components/etats/EtatVide'
import { useLargeurMin } from '@/features/cette-semaine/useLargeurMin'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import { ActionsMinistere } from '@/features/indicateurs/configuration/ActionsMinistere'
import { BlocPrevus } from '@/features/indicateurs/configuration/BlocPrevus'
import type { ConfigurationMinistere } from '@/features/indicateurs/configuration/construire'
import type { ControleurPanneaux } from '@/features/indicateurs/configuration/panneaux/contexte'
import { estPanneauDePage } from '@/features/indicateurs/configuration/panneaux/contexte'
import type { EcrituresIndicateurs } from '@/features/indicateurs/configuration/panneaux/ecritures'
import { FournisseurPanneaux } from '@/features/indicateurs/configuration/panneaux/FournisseurPanneaux'
import { PanneauOuvertIndicateurs } from '@/features/indicateurs/configuration/panneaux/PanneauOuvertIndicateurs'
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
import { MessageReussite } from '@/features/saisie/MessageReussite'
import { LARGEUR_PANNEAU } from '@/features/saisie/textes'
import type { TypeCompte } from '@/lib/base'
import { gereLOutil } from '@/lib/metier/droits'
import { ErreurDePage } from '@/pages/ErreurDePage'

interface Props {
  /** Titre de l'écran pour ce profil (« Indicateurs d'un ministère »), avant que le nom arrive. */
  titre: string
  profil: TypeCompte
  ministere: ResultatConfigurationMinistere
  creation: CreationPrevus
  /**
   * Les écritures de la configuration (L3b) : ajouter, calculer, corriger, remplacer, retirer.
   * Sans elles, l'écran est en lecture seule : aucun bouton d'action.
   */
  ecritures?: EcrituresIndicateurs
}

const textes = TEXTES_CONFIGURATION

const classeTitre = 'font-lecture text-titre leading-tight font-medium focus:outline-hidden'

/** Le focus n'est plus nulle part : son élément a disparu (ligne retirée, panneau fermé). */
function focusPerdu(): boolean {
  const actif = document.activeElement
  return actif === null || actif === document.body || !actif.isConnected
}

function Donnees({
  donnees,
  profil,
  creation,
  controleur,
}: {
  donnees: ConfigurationMinistere
  profil: TypeCompte
  creation: CreationPrevus
  controleur: ControleurPanneaux | null
}) {
  // La première ligne qui a un usage porte l'aide : une seule pour tout l'écran.
  const idLigneAide =
    donnees.sections.flatMap((section) => section.lignes).find((ligne) => ligne.usage !== null)
      ?.id ?? null
  // T60 : seul EJP Tech crée les prévus ; l'administration lit la fiche, sans le bloc des prévus.
  const gestion = gereLOutil(profil)
  return (
    <>
      {donnees.phrase !== null ? (
        <p className="mt-4 max-w-prose text-encre-2">{donnees.phrase}</p>
      ) : null}
      <ActionsMinistere ministereId={donnees.id} ministereNom={donnees.nom} profil={profil} />
      <ReussiteCreation creation={creation} />
      {controleur !== null ? (
        <div className="[&_p]:mt-4">
          <MessageReussite message={controleur.reussite} envoi={controleur.envoi} />
        </div>
      ) : null}
      {gestion ? <BlocPrevus key={donnees.id} donnees={donnees} creation={creation} /> : null}
      {donnees.sansIndicateur && (!gestion || !resteAChoisirOuCreer(donnees.prevus)) ? (
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

interface PropsEcran extends Props {
  controleur: ControleurPanneaux | null
}

function Ecran({ titre, profil, ministere, creation, controleur }: PropsEcran) {
  const idTitre = useId()
  const titreRef = useRef<HTMLHeadingElement>(null)
  const enPanneau = useLargeurMin(LARGEUR_PANNEAU)
  const titreAffiche =
    ministere.etat === 'pret' ? `Indicateurs ${deMinistere(ministere.donnees.nom)}` : titre
  useTitrePage(titreAffiche)

  // Sous 600 px, un panneau de saisie prend la page entière : il n'y a plus ni titre ni liste.
  const pleinePage = controleur !== null && estPanneauDePage(controleur.panneau) && !enPanneau
  const pleinePagePrecedente = useRef(pleinePage)
  const envoi = controleur?.envoi ?? 0
  useEffect(() => {
    const etaitPleinePage = pleinePagePrecedente.current
    pleinePagePrecedente.current = pleinePage
    // Le panneau ou la ligne qui avait le focus a disparu : le titre le reprend.
    if (!pleinePage && (etaitPleinePage || envoi > 0) && focusPerdu()) titreRef.current?.focus()
  }, [pleinePage, envoi])

  if (pleinePage && controleur !== null) {
    return (
      <>
        <PanneauOuvertIndicateurs controleur={controleur} />
        <div className="[&_p]:mt-4">
          <MessageReussite message={controleur.reussite} envoi={controleur.envoi} />
        </div>
      </>
    )
  }

  return (
    <section aria-labelledby={idTitre} className="flex flex-col">
      <Link
        to="/indicateurs"
        className="inline-flex min-h-cible items-center self-start text-[15px] underline underline-offset-4"
      >
        {textes.ministere.retour}
      </Link>
      <h1 id={idTitre} ref={titreRef} tabIndex={-1} className={classeTitre}>
        {titreAffiche}
      </h1>
      <div className="mt-2 border-t-2 border-encre" />
      {gereLOutil(profil) ? null : (
        <p className="mt-4 max-w-prose text-encre-2">{textes.lecture}</p>
      )}
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
        <Donnees
          donnees={ministere.donnees}
          profil={profil}
          creation={creation}
          controleur={controleur}
        />
      ) : null}
      {controleur !== null ? <PanneauOuvertIndicateurs controleur={controleur} /> : null}
    </section>
  )
}

/** Les panneaux d'un ministère prêt : l'état des panneaux et ce qu'ils lisent de la fiche. */
function AvecEcritures({
  donnees,
  ecritures,
  ...proprietes
}: Props & { donnees: ConfigurationMinistere; ecritures: EcrituresIndicateurs }) {
  const { id, nom } = donnees
  const identite = useMemo(() => ({ id, nom }), [id, nom])
  const calculs = useMemo(
    () =>
      donnees.sections
        .filter((section) => section.cle === 'calculs')
        .flatMap((section) =>
          section.lignes.map((ligne) => ({ id: ligne.id, libelle: ligne.libelle })),
        ),
    [donnees.sections],
  )
  return (
    <FournisseurPanneaux
      ecritures={ecritures}
      ministere={identite}
      profil={proprietes.profil}
      sources={donnees.sources}
      calculs={calculs}
    >
      {(controleur) => <Ecran {...proprietes} controleur={controleur} />}
    </FournisseurPanneaux>
  )
}

/**
 * Écran `/indicateurs/:id` (administration et EJP Tech ; configuration-indicateurs.md, 7.2) : la
 * phrase du ministère, ses actions (ajouter un indicateur ou un calcul ; « Voir la fiche » pour EJP
 * Tech), le bloc « Prévus par la coordination » tant qu'il en reste à créer, puis les sections par
 * rythme, les calculs et les retirés repliés. Chaque ligne a ses actions (corriger, remplacer,
 * retirer, retirer pour confidentialité), qui ouvrent un panneau ou une fenêtre. Jamais une valeur.
 * Un ministère inconnu ou désactivé donne l'état « introuvable », sans requête de plus.
 */
export function VueIndicateursMinistere(proprietes: Props) {
  const { ministere, ecritures } = proprietes
  if (ministere.etat === 'pret' && ecritures !== undefined) {
    return <AvecEcritures {...proprietes} donnees={ministere.donnees} ecritures={ecritures} />
  }
  return <Ecran {...proprietes} controleur={null} />
}
