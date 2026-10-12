import { useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  LONGUEUR_DEFINITION_MAX,
  LONGUEUR_LIBELLE_MAX,
  schemaAjout,
  UNITES_CHOISIES,
} from '@/data/indicateursEcriture'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { CLES_CONFIGURATION } from '@/features/indicateurs/configuration/cles'
import type { LigneConfiguration } from '@/features/indicateurs/configuration/lignes'
import { normaliser } from '@/features/indicateurs/configuration/normaliser'
import { apercuSaisie } from '@/features/indicateurs/configuration/panneaux/apercu'
import { CaseACocher } from '@/features/indicateurs/configuration/panneaux/CaseACocher'
import { ChampIndicateur } from '@/features/indicateurs/configuration/panneaux/ChampIndicateur'
import { ChangeEtResteIdentique } from '@/features/indicateurs/configuration/panneaux/ChangeEtResteIdentique'
import { ChoixRadios } from '@/features/indicateurs/configuration/panneaux/ChoixRadios'
import type { ControleurPanneaux } from '@/features/indicateurs/configuration/panneaux/contexte'
import { MessagesControle } from '@/features/indicateurs/configuration/panneaux/MessagesControle'
import { NoteLimites } from '@/features/indicateurs/configuration/panneaux/NoteLimites'
import { ApercuDeSaisie } from '@/features/indicateurs/configuration/panneaux/ApercuDeSaisie'
import {
  erreursParChamp,
  lireRefusEcriture,
} from '@/features/indicateurs/configuration/panneaux/refus'
import {
  REUSSITES_INDICATEURS,
  TEXTES_PANNEAUX,
} from '@/features/indicateurs/configuration/panneaux/textes'
import { useVerificationLibelle } from '@/features/indicateurs/configuration/panneaux/useLecturesPanneaux'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import type { NatureIndicateur } from '@/lib/base'
import { libelleRythme } from '@/lib/metier/indicateurs'

interface Props {
  controleur: ControleurPanneaux
  /** L'indicateur remplacé : le formulaire est le sien, prérempli. Sans lui, un ajout. */
  remplace?: LigneConfiguration
}

type Unite = (typeof UNITES_CHOISIES)[number]

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
const OPTIONS_SORTE = UNITES_CHOISIES.map((valeur) => ({
  valeur,
  libelle: textes.sorteOptions[valeur],
}))

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
  const unite = UNITES_CHOISIES.find((choix) => choix === remplace.unite) ?? 'nombre'
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
 * s'affichent pendant la frappe ; son refus à l'envoi, sous le bouton.
 */
export function FormulaireIndicateur({ controleur, remplace }: Props) {
  const { ecritures, ministere, terminer, fermer } = controleur
  const id = useId()
  const formulaire = useRef<HTMLFormElement>(null)
  const occupe = useRef(false)
  const [brouillon, setBrouillon] = useState<Brouillon>(() => brouillonDe(remplace))
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [essais, setEssais] = useState(0)
  const [refus, setRefus] = useState<string | null>(null)
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
  const semblableSensible = verifications.some(
    (verification) => verification.famille === 'sensible',
  )
  const messageSensible = verifications.find((verification) => verification.famille === 'sensible')

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
    const lu = schemaAjout.safeParse(brouillon)
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
        remplace === undefined ? REUSSITES_INDICATEURS.ajout : REUSSITES_INDICATEURS.remplacement,
      )
    } catch (erreur) {
      setRefus(lireRefusEcriture(erreur, TEXTES_PANNEAUX.connexionFormulaire))
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
          controles={<MessagesControle verifications={controlesLibelle} />}
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
          options={OPTIONS_SORTE}
          valeur={brouillon.unite}
          onChange={(valeur) => changer('unite', valeur)}
          erreur={erreurs.unite}
          verrouille={brouillon.sensible}
        />
        <div className="flex flex-col gap-1">
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
              : TEXTES_PANNEAUX.remplacement.change
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
          libelleEnCours={TEXTES_PANNEAUX.enCours}
        />
        <button
          type="button"
          onClick={fermer}
          className="min-h-cible w-full border border-encre bg-papier px-4 text-[15px] font-semibold text-encre hover:bg-fond"
        >
          {TEXTES_PANNEAUX.annuler}
        </button>
        {refus !== null ? <ErreurFormulaire message={refus} /> : null}
      </form>
    </>
  )
}
