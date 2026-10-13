import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  LONGUEUR_DEFINITION_MAX,
  LONGUEUR_LIBELLE_MAX,
  schemaCorrection,
} from '@/data/indicateursEcriture'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import type { LigneConfiguration } from '@/features/indicateurs/configuration/lignes'
import { normaliser } from '@/features/indicateurs/configuration/normaliser'
import { ChampIndicateur } from '@/features/indicateurs/configuration/panneaux/ChampIndicateur'
import { ChangeEtResteIdentique } from '@/features/indicateurs/configuration/panneaux/ChangeEtResteIdentique'
import type { ControleurPanneaux } from '@/features/indicateurs/configuration/panneaux/contexte'
import { EtatLectureTermes } from '@/features/indicateurs/configuration/panneaux/EtatLectureTermes'
import { ErreurEnvoi } from '@/features/indicateurs/configuration/panneaux/ErreurEnvoi'
import { MessagesControle } from '@/features/indicateurs/configuration/panneaux/MessagesControle'
import {
  erreurDeChamp,
  erreursParChamp,
  lireRefusEcriture,
  sansErreur,
  sansRepetition,
} from '@/features/indicateurs/configuration/panneaux/refus'
import {
  REUSSITES_INDICATEURS,
  TEXTES_PANNEAUX,
} from '@/features/indicateurs/configuration/panneaux/textes'
import {
  useTermes,
  useVerificationLibelle,
} from '@/features/indicateurs/configuration/panneaux/useLecturesPanneaux'

interface Props {
  controleur: ControleurPanneaux
  ligne: LigneConfiguration
}

const textes = TEXTES_PANNEAUX.correction

/**
 * Panneau « Corriger l'indicateur » (7.2) : le libellé et la définition, préremplis, avec le
 * rappel de l'administration sous le premier champ et la phrase « Vous pouvez corriger le libellé
 * et la définition tant que rien n'est saisi. Ensuite, remplacez l'indicateur. ». Le rythme, la
 * sorte de nombre et le domaine ne changent jamais : un changement de sens passe par un
 * remplacement. La base refuse la correction d'un chiffre qui a déjà des valeurs, d'un calcul dont
 * les sources en ont, et d'une suggestion. Pour un calcul, les sources sont lues avant : si l'une
 * a déjà des valeurs, le panneau le dit et propose « Remplacer le calcul », sans formulaire qui
 * ne ferait que recevoir le refus de la base.
 */
export function FormulaireCorrection({ controleur, ligne }: Props) {
  const { ecritures, sources } = controleur
  const estCalcul = ligne.calcul !== null
  const termes = useTermes(ecritures, { calculId: ligne.id }, estCalcul)
  if (estCalcul && termes.data === undefined) {
    return (
      <EtatLectureTermes
        enCours={termes.isPending}
        message={TEXTES_PANNEAUX.calcul.lectureTermes}
        erreur={TEXTES_PANNEAUX.calcul.termesIllisibles}
        reessayer={() => void termes.refetch()}
      />
    )
  }
  // Une source absente de la liste (retirée, sensible) n'est pas jugée ici : la base répondra.
  const sourcesSaisies = (termes.data ?? []).some((terme) =>
    sources.some((source) => source.id === terme.source_id && !source.jamaisSaisi),
  )
  if (estCalcul && sourcesSaisies) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="leading-normal text-encre-2">{textes.calculDejaSaisi}</p>
        <button
          type="button"
          onClick={() => controleur.ouvrir({ genre: 'remplacer', ligne })}
          className="inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-4.5 text-[15px] font-semibold text-encre hover:bg-fond"
        >
          {TEXTES_PANNEAUX.calcul.boutonRemplacement}
        </button>
      </div>
    )
  }
  return <CorpsCorrection controleur={controleur} ligne={ligne} />
}

function CorpsCorrection({ controleur, ligne }: Props) {
  const { ecritures, ministere, terminer, fermer } = controleur
  const id = useId()
  const formulaire = useRef<HTMLFormElement>(null)
  const occupe = useRef(false)
  const [libelle, setLibelle] = useState(ligne.libelle)
  const [definition, setDefinition] = useState(ligne.definition)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [essais, setEssais] = useState(0)
  const [refus, setRefus] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const verifications = useVerificationLibelle(ecritures, ministere.id, libelle, ligne.nature)
  const memeLibelle = normaliser(libelle) === normaliser(ligne.libelle)
  const controles = verifications.filter(
    (verification) =>
      verification.famille !== 'sensible' &&
      !(verification.famille === 'calcul' && ligne.calcul !== null) &&
      !(verification.famille === 'doublon' && memeLibelle),
  )

  useEffect(() => {
    if (essais > 0) formulaire.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [essais])

  const soumettre = async (evenement: FormEvent) => {
    evenement.preventDefault()
    if (occupe.current) return
    setRefus(null)
    const lu = schemaCorrection.safeParse({ libelle, definition })
    if (!lu.success) {
      setErreurs(erreursParChamp(lu.error))
      setEssais((precedent) => precedent + 1)
      return
    }
    setErreurs({})
    occupe.current = true
    setEnCours(true)
    try {
      await ecritures.corriger(ministere.id, ligne.id, lu.data)
      terminer(REUSSITES_INDICATEURS.correction)
    } catch (erreur) {
      // Un refus du nom ou de la définition se dit sous son champ, une seule fois.
      const surChamp = erreurDeChamp(erreur)
      if (surChamp === null) {
        setRefus(lireRefusEcriture(erreur, TEXTES_PANNEAUX.connexionFormulaire))
      } else {
        setErreurs(surChamp)
        setEssais((precedent) => precedent + 1)
      }
      occupe.current = false
      setEnCours(false)
    }
  }

  return (
    <>
      <p className="leading-normal text-encre-2">{textes.note}</p>
      <form
        ref={formulaire}
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(evenement) => void soumettre(evenement)}
      >
        <ChampIndicateur
          id={`${id}-libelle`}
          libelle={TEXTES_PANNEAUX.ajout.libelle}
          valeur={libelle}
          onChange={(valeur) => {
            setLibelle(valeur)
            setErreurs((precedentes) => sansErreur(precedentes, 'libelle'))
          }}
          max={LONGUEUR_LIBELLE_MAX}
          avecRappel
          erreur={erreurs.libelle}
          controles={
            <MessagesControle verifications={sansRepetition(controles, erreurs.libelle)} />
          }
        />
        <ChampIndicateur
          id={`${id}-definition`}
          libelle={TEXTES_PANNEAUX.ajout.definition}
          valeur={definition}
          onChange={(valeur) => {
            setDefinition(valeur)
            setErreurs((precedentes) => sansErreur(precedentes, 'definition'))
          }}
          max={LONGUEUR_DEFINITION_MAX}
          multiligne
          erreur={erreurs.definition}
        />
        <ChangeEtResteIdentique
          change={textes.change}
          resteIdentique={
            ligne.calcul === null ? textes.resteIdentique : textes.resteIdentiqueCalcul
          }
        />
        <BoutonEnregistrer
          libelle={textes.bouton}
          enCours={enCours}
          libelleEnCours={TEXTES_PANNEAUX.enCours}
        />
        {refus !== null ? <ErreurEnvoi message={refus} /> : null}
        <button
          type="button"
          onClick={fermer}
          className="min-h-cible w-full border border-encre bg-papier px-4 text-[15px] font-semibold text-encre hover:bg-fond"
        >
          {TEXTES_PANNEAUX.annuler}
        </button>
      </form>
    </>
  )
}
