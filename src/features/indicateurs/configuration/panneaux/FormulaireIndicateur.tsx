import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { referenceEchec } from '@/data/echecEnvoi'
import {
  LONGUEUR_DEFINITION_MAX,
  LONGUEUR_LIBELLE_MAX,
  schemaAjout,
  UNITES_CHOISIES,
  UNITES_GARDEES,
} from '@/data/indicateursEcriture'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { CLES_CONFIGURATION } from '@/features/indicateurs/configuration/cles'
import type { LigneConfiguration } from '@/features/indicateurs/configuration/lignes'
import { normaliser } from '@/features/indicateurs/configuration/normaliser'
import {
  apercuSaisie,
  calculsQuiPartent,
} from '@/features/indicateurs/configuration/panneaux/apercu'
import { CaseACocher } from '@/features/indicateurs/configuration/panneaux/CaseACocher'
import { ChampIndicateur } from '@/features/indicateurs/configuration/panneaux/ChampIndicateur'
import { ChangeEtResteIdentique } from '@/features/indicateurs/configuration/panneaux/ChangeEtResteIdentique'
import { ChoixRadios } from '@/features/indicateurs/configuration/panneaux/ChoixRadios'
import type { ControleurPanneaux } from '@/features/indicateurs/configuration/panneaux/contexte'
import { EtatLectureTermes } from '@/features/indicateurs/configuration/panneaux/EtatLectureTermes'
import { ErreurEnvoi } from '@/features/indicateurs/configuration/panneaux/ErreurEnvoi'
import { useFermetureSaisie } from '@/features/saisie/fermetureSaisie'
import { MessagesControle } from '@/features/indicateurs/configuration/panneaux/MessagesControle'
import { NoteLimites } from '@/features/indicateurs/configuration/panneaux/NoteLimites'
import { ApercuDeSaisie } from '@/features/indicateurs/configuration/panneaux/ApercuDeSaisie'
import {
  erreurDeChamp,
  erreursParChamp,
  lireRefusEcriture,
  sansRepetition,
} from '@/features/indicateurs/configuration/panneaux/refus'
import {
  phraseCalculsLies,
  REUSSITES_INDICATEURS,
  reussiteRemplacement,
  TEXTES_PANNEAUX,
} from '@/features/indicateurs/configuration/panneaux/textes'
import {
  useTermes,
  useVerificationLibelle,
} from '@/features/indicateurs/configuration/panneaux/useLecturesPanneaux'
import type { NatureIndicateur } from '@/lib/base'
import { libelleRythme } from '@/lib/metier/indicateurs'

interface Props {
  controleur: ControleurPanneaux
  /** L'indicateur remplacé : le formulaire est le sien, prérempli. Sans lui, un ajout. */
  remplace?: LigneConfiguration
}

type UniteGardee = (typeof UNITES_GARDEES)[number]
type Unite = (typeof UNITES_CHOISIES)[number] | UniteGardee

interface Brouillon {
  libelle: string
  definition: string
  nature: NatureIndicateur | ''
  unite: Unite
  sensible: boolean
  pasSensible: boolean
}

const textes = TEXTES_PANNEAUX.ajout

const OPTIONS_RYTHME = (['dimanche', 'mois', 'a_ce_jour'] as const).map((valeur) => ({
  valeur,
  libelle: textes.quandOptions[valeur],
}))
const OPTIONS_SORTE: readonly { valeur: Unite; libelle: string }[] = UNITES_CHOISIES.map(
  (valeur) => ({ valeur, libelle: textes.sorteOptions[valeur] }),
)

/** La sorte de l'indicateur remplacé quand elle n'est pas dans la liste (une heure, des jours). */
function uniteGardee(remplace: LigneConfiguration | undefined): UniteGardee | null {
  return UNITES_GARDEES.find((unite) => unite === remplace?.unite) ?? null
}

/** Les sortes proposées : les trois du panneau, plus celle de l'ancien indicateur s'il en a une autre. */
function optionsSorte(remplace: LigneConfiguration | undefined) {
  const gardee = uniteGardee(remplace)
  return gardee === null
    ? OPTIONS_SORTE
    : [...OPTIONS_SORTE, { valeur: gardee, libelle: textes.sorteGardeeOptions[gardee] }]
}

function brouillonDe(remplace: LigneConfiguration | undefined): Brouillon {
  if (remplace === undefined) {
    return {
      libelle: '',
      definition: '',
      nature: '',
      unite: 'nombre',
      sensible: false,
      pasSensible: false,
    }
  }
  const unite: Unite =
    UNITES_CHOISIES.find((choix) => choix === remplace.unite) ?? uniteGardee(remplace) ?? 'nombre'
  return {
    libelle: remplace.libelle,
    definition: remplace.definition,
    nature: remplace.nature,
    unite,
    sensible: remplace.sensible,
    pasSensible: false,
  }
}

/**
 * Panneau « Ajouter un indicateur » et panneau « Remplacer l'indicateur » (7.2), qui est le même
 * formulaire prérempli : ce qu'on compte (60 caractères, avec le rappel sur les données
 * personnelles), ce qu'on compte exactement (140), quand le saisir, la sorte de nombre, la case
 * « Domaine sensible » (cochée et verrouillée pour le remplaçant d'un indicateur sensible),
 * l'aperçu de la saisie, puis ce qui change et ce qui ne change pas. Les contrôles de la base
 * s'affichent pendant la frappe ; son refus à l'envoi, sous le champ qu'il vise (nom, définition),
 * sans répéter le contrôle, sinon sous le bouton. Un remplacement lit d'abord
 * les calculs qui se servent de l'ancien indicateur : ils partent avec lui, le panneau les nomme.
 */
export function FormulaireIndicateur({ controleur, remplace }: Props) {
  const { ecritures, calculs } = controleur
  const termes = useTermes(ecritures, { sourceId: remplace?.id ?? '' }, remplace !== undefined)
  if (remplace !== undefined && termes.data === undefined) {
    return (
      <EtatLectureTermes
        enCours={termes.isPending}
        message={TEXTES_PANNEAUX.remplacement.lectureCalculs}
        erreur={TEXTES_PANNEAUX.remplacement.calculsIllisibles}
        reessayer={() => void termes.refetch()}
      />
    )
  }
  return (
    <CorpsIndicateur
      controleur={controleur}
      remplace={remplace}
      calculsLies={calculsQuiPartent(termes.data ?? [], calculs)}
    />
  )
}

function CorpsIndicateur({
  controleur,
  remplace,
  calculsLies,
}: Props & { calculsLies: readonly string[] }) {
  const { ecritures, ministere, terminer, fermer } = controleur
  // « Annuler » demande confirmation si un champ a changé (m265).
  const annuler = useFermetureSaisie(fermer)
  const id = useId()
  const formulaire = useRef<HTMLFormElement>(null)
  const blocSensible = useRef<HTMLDivElement>(null)
  const occupe = useRef(false)
  const [brouillon, setBrouillon] = useState<Brouillon>(() => brouillonDe(remplace))
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [essais, setEssais] = useState(0)
  const [refus, setRefus] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const sensibleVerrouille = remplace?.sensible === true

  // Le jour de Paris pour l'aperçu : sans lui, l'aperçu garde le libellé sans période.
  const semaine = useQuery({
    queryKey: [...CLES_CONFIGURATION.racine, 'semaine'],
    queryFn: ecritures.semaine,
    retry: false,
  })
  const verifications = useVerificationLibelle(
    ecritures,
    ministere.id,
    brouillon.libelle,
    brouillon.nature,
  )
  // Le libellé de l'indicateur remplacé reste permis : la base l'écarte du doublon, pas la liste.
  const memeLibelle =
    remplace !== undefined && normaliser(brouillon.libelle) === normaliser(remplace.libelle)
  const controlesLibelle = verifications.filter(
    (verification) =>
      verification.famille !== 'sensible' && !(verification.famille === 'doublon' && memeLibelle),
  )
  // La base écarte aussi un mot sensible de la définition, tant que rien n'est confirmé : la
  // définition passe donc par le même contrôle, et seule la famille « sensible » en est gardée.
  const verificationsDefinition = useVerificationLibelle(
    ecritures,
    ministere.id,
    brouillon.definition,
    brouillon.nature,
  )
  const messageSensible = [...verifications, ...verificationsDefinition].find(
    (verification) => verification.famille === 'sensible',
  )
  const semblableSensible = messageSensible !== undefined
  // Une confirmation ne vaut que pour l'avertissement qu'elle suit : sans lui, elle retombe.
  if (!semblableSensible && brouillon.pasSensible) {
    setBrouillon((precedent) => ({ ...precedent, pasSensible: false }))
  }

  // Le premier champ en erreur reçoit le focus après un envoi refusé par le schéma.
  useEffect(() => {
    if (essais > 0) formulaire.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [essais])

  const changer = <Cle extends keyof Brouillon>(cle: Cle, valeur: Brouillon[Cle]) => {
    setBrouillon((precedent) => ({ ...precedent, [cle]: valeur }))
    setErreurs((precedentes) => {
      if (!(cle in precedentes)) return precedentes
      const reste = { ...precedentes }
      delete reste[cle]
      return reste
    })
  }

  const cocherSensible = (coche: boolean) => {
    // Un indicateur sensible se saisit chaque mois, en compte simple : la base l'impose (3.7).
    setBrouillon((precedent) => ({
      ...precedent,
      sensible: coche,
      pasSensible: false,
      ...(coche ? { nature: 'mois' as const, unite: 'nombre' as const } : {}),
    }))
    setErreurs({})
  }

  const soumettre = async (evenement: FormEvent) => {
    evenement.preventDefault()
    if (occupe.current) return
    setRefus(null)
    const lu = schemaAjout.safeParse({
      ...brouillon,
      pasSensible: brouillon.pasSensible && semblableSensible,
    })
    if (!lu.success) {
      setErreurs(erreursParChamp(lu.error))
      setEssais((precedent) => precedent + 1)
      return
    }
    setErreurs({})
    occupe.current = true
    setEnCours(true)
    try {
      await ecritures.ajouter(ministere.id, lu.data, remplace?.id ?? null)
      terminer(
        remplace === undefined
          ? REUSSITES_INDICATEURS.ajout
          : reussiteRemplacement(calculsLies.length),
      )
    } catch (erreur) {
      // Un refus du nom ou de la définition se dit sous son champ, une seule fois. L'avertissement
      // « Ce chiffre semble sensible » est déjà sous la case : elle prend le focus, sans le répéter.
      const surChamp = erreurDeChamp(erreur)
      if (surChamp === null) {
        setRefus(lireRefusEcriture(erreur, TEXTES_PANNEAUX.connexionFormulaire, true))
        setReference(referenceEchec(erreur))
      } else if (surChamp.libelle !== undefined && surChamp.libelle === messageSensible?.message) {
        blocSensible.current?.querySelector<HTMLElement>('input:not(:disabled)')?.focus()
      } else {
        setErreurs(surChamp)
        setEssais((precedent) => precedent + 1)
      }
      occupe.current = false
      setEnCours(false)
    }
  }

  const apercu = apercuSaisie({
    libelle: brouillon.libelle,
    nature: brouillon.nature === '' ? null : brouillon.nature,
    unite: brouillon.unite,
    aujourdhui: semaine.data?.aujourdhui ?? null,
    dimancheReference: semaine.data?.dimanche ?? null,
  })

  return (
    <>
      {remplace !== undefined ? (
        <p className="leading-normal text-encre-2">
          {TEXTES_PANNEAUX.remplacement.phrase(
            remplace.libelle,
            libelleRythme(remplace.nature).toLowerCase(),
          )}
        </p>
      ) : null}
      <NoteLimites
        ecritures={ecritures}
        ministereId={ministere.id}
        remplace={remplace !== undefined}
      />
      <form
        ref={formulaire}
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(evenement) => void soumettre(evenement)}
      >
        <ChampIndicateur
          id={`${id}-libelle`}
          libelle={textes.libelle}
          valeur={brouillon.libelle}
          onChange={(valeur) => changer('libelle', valeur)}
          max={LONGUEUR_LIBELLE_MAX}
          avecRappel
          erreur={erreurs.libelle}
          controles={
            <MessagesControle verifications={sansRepetition(controlesLibelle, erreurs.libelle)} />
          }
        />
        <ChampIndicateur
          id={`${id}-definition`}
          libelle={textes.definition}
          valeur={brouillon.definition}
          onChange={(valeur) => changer('definition', valeur)}
          max={LONGUEUR_DEFINITION_MAX}
          multiligne
          erreur={erreurs.definition}
        />
        <ChoixRadios
          legende={textes.quand}
          options={OPTIONS_RYTHME}
          valeur={brouillon.nature}
          onChange={(valeur) => changer('nature', valeur)}
          erreur={erreurs.nature}
          verrouille={brouillon.sensible}
        />
        <ChoixRadios
          legende={textes.sorte}
          options={optionsSorte(remplace)}
          valeur={brouillon.unite}
          onChange={(valeur) => changer('unite', valeur)}
          erreur={erreurs.unite}
          verrouille={brouillon.sensible}
        />
        <div ref={blocSensible} className="flex flex-col gap-1">
          <CaseACocher
            libelle={textes.sensible}
            aide="indicateurs.domaine"
            coche={brouillon.sensible}
            onChange={cocherSensible}
            verrouillee={sensibleVerrouille}
            note={
              sensibleVerrouille
                ? `${textes.sensibleConsequence} ${TEXTES_PANNEAUX.remplacement.sensibleVerrouille}`
                : brouillon.sensible
                  ? textes.sensibleConsequence
                  : undefined
            }
          />
          {semblableSensible && !brouillon.sensible && messageSensible !== undefined ? (
            <>
              <p className="text-[15px] leading-normal text-alerte">{messageSensible.message}</p>
              <CaseACocher
                libelle={textes.pasSensible}
                coche={brouillon.pasSensible}
                onChange={(coche) => changer('pasSensible', coche)}
              />
            </>
          ) : null}
        </div>
        <ApercuDeSaisie titre={textes.apercu} texte={apercu} />
        <ChangeEtResteIdentique
          change={
            remplace === undefined
              ? textes.change(ministere.nom)
              : [TEXTES_PANNEAUX.remplacement.change, phraseCalculsLies(calculsLies)]
                  .filter((phrase) => phrase !== null)
                  .join(' ')
          }
          resteIdentique={
            remplace === undefined
              ? textes.resteIdentique
              : TEXTES_PANNEAUX.remplacement.resteIdentique
          }
        />
        <BoutonEnregistrer
          libelle={remplace === undefined ? textes.bouton : TEXTES_PANNEAUX.remplacement.bouton}
          enCours={enCours}
          libelleEnCours={
            remplace === undefined
              ? TEXTES_PANNEAUX.ajoutEnCours
              : TEXTES_PANNEAUX.remplacementEnCours
          }
        />
        {refus !== null ? <ErreurEnvoi message={refus} reference={reference} /> : null}
        <button
          type="button"
          onClick={annuler}
          className="min-h-cible w-full border border-encre bg-papier px-4 text-[15px] font-semibold text-encre hover:bg-fond"
        >
          {TEXTES_PANNEAUX.annuler}
        </button>
      </form>
    </>
  )
}
