import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  LONGUEUR_DEFINITION_MAX,
  LONGUEUR_LIBELLE_MAX,
  schemaCalcul,
} from '@/data/indicateursEcriture'
import type { LigneTerme } from '@/data/indicateursEcriture'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { CaseACocher } from '@/features/indicateurs/configuration/panneaux/CaseACocher'
import type { LigneConfiguration } from '@/features/indicateurs/configuration/lignes'
import { normaliser } from '@/features/indicateurs/configuration/normaliser'
import {
  apercuCalcul,
  basCompatibles,
  calculPossible,
} from '@/features/indicateurs/configuration/panneaux/apercu'
import { ApercuDeSaisie } from '@/features/indicateurs/configuration/panneaux/ApercuDeSaisie'
import { ChampIndicateur } from '@/features/indicateurs/configuration/panneaux/ChampIndicateur'
import { ChampListe } from '@/features/indicateurs/configuration/panneaux/ChampListe'
import { ChangeEtResteIdentique } from '@/features/indicateurs/configuration/panneaux/ChangeEtResteIdentique'
import { ChoixRadios } from '@/features/indicateurs/configuration/panneaux/ChoixRadios'
import type { ControleurPanneaux } from '@/features/indicateurs/configuration/panneaux/contexte'
import { ErreurEnvoi } from '@/features/indicateurs/configuration/panneaux/ErreurEnvoi'
import { useFermetureSaisie } from '@/features/saisie/fermetureSaisie'
import { MessagesControle } from '@/features/indicateurs/configuration/panneaux/MessagesControle'
import { NoteLimites } from '@/features/indicateurs/configuration/panneaux/NoteLimites'
import {
  erreurDeChamp,
  erreursParChamp,
  lireRefusEcriture,
  sansRepetition,
} from '@/features/indicateurs/configuration/panneaux/refus'
import { EtatLectureTermes } from '@/features/indicateurs/configuration/panneaux/EtatLectureTermes'
import {
  REUSSITES_INDICATEURS,
  TEXTES_PANNEAUX,
} from '@/features/indicateurs/configuration/panneaux/textes'
import {
  useTermes,
  useVerificationLibelle,
} from '@/features/indicateurs/configuration/panneaux/useLecturesPanneaux'
import type { TypeCalcul } from '@/lib/base'

interface Props {
  controleur: ControleurPanneaux
  /** Le calcul remplacé : le formulaire est le sien, prérempli. Sans lui, un ajout. */
  remplace?: LigneConfiguration
}

interface Brouillon {
  libelle: string
  definition: string
  type: TypeCalcul | ''
  hautId: string
  basId: string
  /** P49 : à l'ajout seulement. Un remplacement reprend la part du calcul remplacé (la base). */
  part: boolean
}

const textes = TEXTES_PANNEAUX.calcul

const OPTIONS_TYPE = (['taux', 'moyenne'] as const).map((valeur) => ({
  valeur,
  libelle: textes.types[valeur],
}))

function brouillonDe(remplace: LigneConfiguration | undefined, termes: LigneTerme[]): Brouillon {
  if (remplace === undefined) {
    return { libelle: '', definition: '', type: '', hautId: '', basId: '', part: false }
  }
  const source = (role: LigneTerme['role']) =>
    termes.find((terme) => terme.role === role)?.source_id ?? ''
  return {
    libelle: remplace.libelle,
    definition: remplace.definition,
    type: remplace.calcul === 'moyenne' ? 'moyenne' : 'taux',
    hautId: source('haut'),
    basId: source('bas'),
    part: false,
  }
}

/**
 * Panneau « Ajouter un calcul » et « Remplacer le calcul » (7.2) : le nom (60) avec le rappel sur
 * les données personnelles, ce qu'on calcule (140), le chiffre du haut, le chiffre du bas (les
 * sources qui vont avec le haut), la façon d'afficher (en pourcentage ou en moyenne), un aperçu
 * avec des nombres d'exemple, puis ce qui change et ce qui ne change pas. L'administration ne lit
 * aucune valeur : l'aperçu n'en montre jamais une vraie.
 */
export function FormulaireCalcul({ controleur, remplace }: Props) {
  const { ecritures } = controleur
  const termes = useTermes(ecritures, { calculId: remplace?.id ?? '' }, remplace !== undefined)
  if (remplace !== undefined && termes.data === undefined) {
    return (
      <EtatLectureTermes
        enCours={termes.isPending}
        message={textes.lectureTermes}
        erreur={textes.termesIllisibles}
        reessayer={() => void termes.refetch()}
      />
    )
  }
  if (remplace === undefined && !calculPossible(controleur.sources)) {
    // Le lien « Retour » du panneau suffit pour revenir ; le bouton mène à ce qui manque.
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="leading-normal text-encre-2">{textes.pasAssezDeSources}</p>
        <p className="leading-normal text-encre-2">{textes.pasAssezDeSourcesSuite}</p>
        <button
          type="button"
          onClick={() => controleur.ouvrir({ genre: 'ajout' })}
          className="inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-4.5 text-[15px] font-semibold text-encre hover:bg-fond"
        >
          {TEXTES_PANNEAUX.actions.ajouterIndicateur}
        </button>
      </div>
    )
  }
  return <CorpsCalcul controleur={controleur} remplace={remplace} termes={termes.data ?? []} />
}

function CorpsCalcul({ controleur, remplace, termes }: Props & { termes: LigneTerme[] }) {
  const { ecritures, ministere, sources, terminer, fermer } = controleur
  // « Annuler » demande confirmation si un champ a changé (m265).
  const annuler = useFermetureSaisie(fermer)
  const id = useId()
  const formulaire = useRef<HTMLFormElement>(null)
  const occupe = useRef(false)
  const [brouillon, setBrouillon] = useState<Brouillon>(() => brouillonDe(remplace, termes))
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [essais, setEssais] = useState(0)
  const [refus, setRefus] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const haut = sources.find((source) => source.id === brouillon.hautId)
  const bas = basCompatibles(sources, brouillon.hautId)
  const verifications = useVerificationLibelle(
    ecritures,
    ministere.id,
    brouillon.libelle,
    haut?.nature ?? '',
  )
  const memeLibelle =
    remplace !== undefined && normaliser(brouillon.libelle) === normaliser(remplace.libelle)
  // Le nom d'un calcul peut dire « taux » ou « moyenne » : seule la saisie d'un chiffre l'interdit.
  const controles = verifications.filter(
    (verification) =>
      verification.famille !== 'calcul' &&
      verification.famille !== 'sensible' &&
      !(verification.famille === 'doublon' && memeLibelle),
  )

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

  const choisirHaut = (hautId: string) => {
    // Le bas doit aller avec le haut : un bas devenu incompatible est retiré du choix.
    setBrouillon((precedent) => {
      const compatible = basCompatibles(sources, hautId).some(
        (source) => source.id === precedent.basId,
      )
      return { ...precedent, hautId, basId: compatible ? precedent.basId : '' }
    })
    setErreurs((precedentes) => {
      const reste = { ...precedentes }
      delete reste.hautId
      delete reste.basId
      return reste
    })
  }

  const soumettre = async (evenement: FormEvent) => {
    evenement.preventDefault()
    if (occupe.current) return
    setRefus(null)
    const { part, ...saisi } = brouillon
    // La part se pose à la création et ne change plus : un remplacement ne l'envoie pas, la base
    // reprend celle de l'ancien calcul. Un calcul en moyenne n'est jamais une part.
    const lu = schemaCalcul.safeParse(
      remplace === undefined ? { ...saisi, part: part && brouillon.type === 'taux' } : saisi,
    )
    if (!lu.success) {
      setErreurs(erreursParChamp(lu.error))
      setEssais((precedent) => precedent + 1)
      return
    }
    setErreurs({})
    occupe.current = true
    setEnCours(true)
    try {
      await ecritures.ajouterCalcul(ministere.id, lu.data, remplace?.id ?? null)
      terminer(
        remplace === undefined
          ? REUSSITES_INDICATEURS.calcul
          : REUSSITES_INDICATEURS.remplacementCalcul,
      )
    } catch (erreur) {
      // Un refus du nom ou de la définition se dit sous son champ, une seule fois.
      const surChamp = erreurDeChamp(erreur)
      if (surChamp === null) {
        setRefus(lireRefusEcriture(erreur, TEXTES_PANNEAUX.connexionFormulaire, true))
      } else {
        setErreurs(surChamp)
        setEssais((precedent) => precedent + 1)
      }
      occupe.current = false
      setEnCours(false)
    }
  }

  const optionsSources = (liste: readonly { id: string; libelle: string }[]) =>
    liste.map((source) => ({ valeur: source.id, libelle: source.libelle }))

  return (
    <>
      {remplace !== undefined ? (
        <p className="leading-normal text-encre-2">
          {TEXTES_PANNEAUX.remplacement.phrase(remplace.libelle, 'calcul')}
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
            <MessagesControle verifications={sansRepetition(controles, erreurs.libelle)} />
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
        <ChampListe
          id={`${id}-haut`}
          libelle={textes.haut}
          aide="indicateurs.calcul"
          valeur={brouillon.hautId}
          onChange={choisirHaut}
          options={optionsSources(sources)}
          invite={textes.choisir}
          erreur={erreurs.hautId}
        />
        <ChampListe
          id={`${id}-bas`}
          libelle={textes.bas}
          valeur={brouillon.basId}
          onChange={(valeur) => changer('basId', valeur)}
          options={optionsSources(bas)}
          invite={textes.choisir}
          erreur={erreurs.basId}
          note={textes.noteBas}
        />
        <ChoixRadios
          legende={textes.afficher}
          options={OPTIONS_TYPE}
          valeur={brouillon.type}
          onChange={(valeur) => changer('type', valeur)}
          erreur={erreurs.type}
        />
        {remplace === undefined && brouillon.type === 'taux' ? (
          <CaseACocher
            libelle={textes.part}
            coche={brouillon.part}
            onChange={(coche) => changer('part', coche)}
            note={textes.partNote}
          />
        ) : null}
        <ApercuDeSaisie
          titre={textes.apercu}
          texte={apercuCalcul(brouillon.type === '' ? null : brouillon.type, haut?.unite)}
        />
        <ChangeEtResteIdentique
          change={remplace === undefined ? textes.change(ministere.nom) : textes.changeRemplacement}
          resteIdentique={
            remplace === undefined ? textes.resteIdentique : textes.resteIdentiqueRemplacement
          }
        />
        <BoutonEnregistrer
          libelle={remplace === undefined ? textes.bouton : textes.boutonRemplacement}
          enCours={enCours}
          libelleEnCours={
            remplace === undefined
              ? TEXTES_PANNEAUX.ajoutEnCours
              : TEXTES_PANNEAUX.remplacementEnCours
          }
        />
        {refus !== null ? <ErreurEnvoi message={refus} /> : null}
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
