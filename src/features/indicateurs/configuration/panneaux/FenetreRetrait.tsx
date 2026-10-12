import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MOTIFS_RETRAIT, schemaMotifRetrait } from '@/data/indicateursEcriture'
import type { LigneConfiguration } from '@/features/indicateurs/configuration/lignes'
import { ChangeEtResteIdentique } from '@/features/indicateurs/configuration/panneaux/ChangeEtResteIdentique'
import { ChoixRadios } from '@/features/indicateurs/configuration/panneaux/ChoixRadios'
import type { ControleurPanneaux } from '@/features/indicateurs/configuration/panneaux/contexte'
import { EtatLectureTermes } from '@/features/indicateurs/configuration/panneaux/EtatLectureTermes'
import { lireRefusEcriture } from '@/features/indicateurs/configuration/panneaux/refus'
import {
  phraseCalculsLies,
  reussiteConfidentialite,
  reussiteRetrait,
  TEXTES_PANNEAUX,
} from '@/features/indicateurs/configuration/panneaux/textes'
import { useTermes } from '@/features/indicateurs/configuration/panneaux/useLecturesPanneaux'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { usePiegeFocus } from '@/features/saisie/usePiegeFocus'
import type { MotifRetraitChoisi } from '@/lib/base'

interface Props {
  controleur: ControleurPanneaux
  ligne: LigneConfiguration
  /** « retirer » : un motif de la liste ; « confidentialite » : libellé et définition masqués. */
  genre: 'retirer' | 'confidentialite'
}

const OPTIONS_MOTIF = MOTIFS_RETRAIT.map((motif) => ({
  valeur: motif.code,
  libelle: motif.libelle,
}))

/**
 * Fenêtres « Retirer » et « Retirer pour confidentialité » (7.2). Elles disent, avant de
 * confirmer, ce que le geste change et ce qui ne change pas : les saisies restent sur la fiche,
 * un calcul qui en dépend est retiré avec l'indicateur (lu avant l'ouverture du bouton), un
 * indicateur retiré ne revient pas. Le retrait pour confidentialité dit en plus que le libellé et
 * la définition seront masqués. Fenêtre modale : le focus y reste, Échap annule, le refus de la
 * base s'affiche sous les boutons et la fenêtre reste ouverte.
 */
export function FenetreRetrait({ controleur, ligne, genre }: Props) {
  const { ecritures, ministere, calculs, terminer, fermer } = controleur
  const confidentialite = genre === 'confidentialite'
  const idTitre = useId()
  const idTexte = useId()
  const fenetre = useRef<HTMLDivElement>(null)
  const occupe = useRef(false)
  const [motif, setMotif] = useState<MotifRetraitChoisi | ''>('')
  const [erreurMotif, setErreurMotif] = useState<string | undefined>(undefined)
  const [refus, setRefus] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  usePiegeFocus(fenetre, true, () => {
    if (!occupe.current) fermer()
  })

  // La page ne défile plus derrière la fenêtre.
  useEffect(() => {
    const avant = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = avant
    }
  }, [])

  // Les calculs qui se servent de cet indicateur partent avec lui : la fenêtre les nomme.
  const termes = useTermes(ecritures, { sourceId: ligne.id }, ligne.calcul === null)
  const pret = ligne.calcul !== null || termes.isSuccess
  const libellesCalculs = (termes.data ?? [])
    .map((terme) => calculs.find((calcul) => calcul.id === terme.calcul_id)?.libelle)
    .filter((libelle): libelle is string => libelle !== undefined)
  const uniques = [...new Set(libellesCalculs)]
  const phraseCalculs = phraseCalculsLies(uniques)

  const texte = confidentialite
    ? TEXTES_PANNEAUX.confidentialite.texte
    : ligne.calcul !== null
      ? TEXTES_PANNEAUX.retrait.calcul
      : ligne.jamaisSaisi
        ? TEXTES_PANNEAUX.retrait.sansSaisie
        : TEXTES_PANNEAUX.retrait.avecSaisies

  const confirmer = async () => {
    if (occupe.current || !pret) return
    setRefus(null)
    let choisi: MotifRetraitChoisi | 'confidentialite' = 'confidentialite'
    if (!confidentialite) {
      const lu = schemaMotifRetrait.safeParse(motif)
      if (!lu.success) {
        setErreurMotif(TEXTES_PANNEAUX.retrait.motifManquant)
        return
      }
      choisi = lu.data
    }
    setErreurMotif(undefined)
    occupe.current = true
    setEnCours(true)
    try {
      const retires = await ecritures.retirer(ministere.id, ligne.id, choisi)
      terminer(
        confidentialite
          ? reussiteConfidentialite(retires)
          : reussiteRetrait(ligne.calcul !== null || ligne.jamaisSaisi, retires),
      )
    } catch (erreur) {
      setRefus(lireRefusEcriture(erreur, TEXTES_PANNEAUX.connexionFenetre))
      occupe.current = false
      setEnCours(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div aria-hidden="true" className="absolute inset-0 bg-encre/50" />
      <div
        ref={fenetre}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idTitre}
        aria-describedby={idTexte}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-[520px] flex-col gap-5 overflow-y-auto border border-filet bg-papier p-6 outline-hidden"
      >
        <h2 id={idTitre} className="font-lecture text-[28px] leading-tight font-medium">
          {confidentialite
            ? TEXTES_PANNEAUX.confidentialite.titre(ligne.libelle)
            : TEXTES_PANNEAUX.retrait.titre(ligne.libelle)}
        </h2>
        <div id={idTexte} className="flex flex-col gap-2 leading-normal text-encre-2">
          <p>{texte}</p>
          {phraseCalculs !== null ? (
            <p className="font-semibold text-encre">{phraseCalculs}</p>
          ) : null}
          {!confidentialite && ligne.calcul === null && !ligne.jamaisSaisi ? (
            <p>{TEXTES_PANNEAUX.retrait.reprendre}</p>
          ) : null}
        </div>
        {!pret ? (
          <EtatLectureTermes
            enCours={termes.isPending}
            message={TEXTES_PANNEAUX.retrait.lectureCalculs}
            erreur={TEXTES_PANNEAUX.retrait.calculsIllisibles}
            reessayer={() => void termes.refetch()}
          />
        ) : null}
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(evenement) => {
            evenement.preventDefault()
            void confirmer()
          }}
        >
          {confidentialite ? null : (
            <ChoixRadios
              legende={TEXTES_PANNEAUX.retrait.motif}
              options={OPTIONS_MOTIF}
              valeur={motif}
              onChange={(valeur) => {
                setMotif(valeur)
                setErreurMotif(undefined)
              }}
              erreur={erreurMotif}
            />
          )}
          <ChangeEtResteIdentique
            change={
              confidentialite
                ? TEXTES_PANNEAUX.confidentialite.change
                : TEXTES_PANNEAUX.retrait.change
            }
            resteIdentique={
              confidentialite
                ? TEXTES_PANNEAUX.confidentialite.resteIdentique
                : TEXTES_PANNEAUX.retrait.resteIdentique
            }
          />
          <div className="flex flex-col-reverse gap-2 min-[480px]:flex-row min-[480px]:justify-end">
            <button
              type="button"
              onClick={() => {
                if (!occupe.current) fermer()
              }}
              aria-disabled={enCours ? true : undefined}
              className="inline-flex min-h-cible items-center justify-center border border-encre bg-papier px-4.5 text-[15px] font-semibold text-encre hover:bg-fond"
            >
              {TEXTES_PANNEAUX.annuler}
            </button>
            <button
              type="submit"
              aria-disabled={enCours || !pret ? true : undefined}
              className="inline-flex min-h-cible items-center justify-center bg-encre px-4.5 text-[15px] font-semibold text-papier aria-disabled:cursor-wait"
            >
              {enCours
                ? TEXTES_PANNEAUX.enCours
                : confidentialite
                  ? TEXTES_PANNEAUX.confidentialite.bouton
                  : TEXTES_PANNEAUX.retrait.bouton}
            </button>
          </div>
          {refus !== null ? <ErreurFormulaire message={refus} /> : null}
        </form>
      </div>
    </div>,
    document.body,
  )
}
