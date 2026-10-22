import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LibelleEnvoi } from '@/components/etats/LibelleEnvoi'
import { MOTIFS_RETRAIT, schemaMotifRetrait } from '@/data/indicateursEcriture'
import type { LigneConfiguration } from '@/features/indicateurs/configuration/lignes'
import { calculsQuiPartent } from '@/features/indicateurs/configuration/panneaux/apercu'
import { ChangeEtResteIdentique } from '@/features/indicateurs/configuration/panneaux/ChangeEtResteIdentique'
import { ChoixRadios } from '@/features/indicateurs/configuration/panneaux/ChoixRadios'
import type { ControleurPanneaux } from '@/features/indicateurs/configuration/panneaux/contexte'
import { ErreurEnvoi } from '@/features/indicateurs/configuration/panneaux/ErreurEnvoi'
import { EtatLectureTermes } from '@/features/indicateurs/configuration/panneaux/EtatLectureTermes'
import { lireRefusEcriture } from '@/features/indicateurs/configuration/panneaux/refus'
import {
  phraseCalculsLies,
  reussiteConfidentialite,
  reussiteRetrait,
  TEXTES_PANNEAUX,
} from '@/features/indicateurs/configuration/panneaux/textes'
import { useTermes } from '@/features/indicateurs/configuration/panneaux/useLecturesPanneaux'
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
 * confirmer, en une phrase, la conséquence puis « C'est définitif. » (m232) : les saisies restent
 * sur la fiche, ou le nom et la définition seront masqués ; un calcul qui en dépend est retiré
 * avec l'indicateur (lu avant l'ouverture du bouton). Un indicateur saisi dit aussi comment
 * reprendre ce chiffre plus tard (décidé, T35). « Ce qui change » et « Ce qui ne change pas »
 * suivent. Fenêtre modale : le focus y reste, Échap annule, le refus de la base s'affiche sous les
 * boutons et la fenêtre reste ouverte.
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
  const phraseCalculs = phraseCalculsLies(calculsQuiPartent(termes.data ?? [], calculs))

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
      terminer(confidentialite ? reussiteConfidentialite(retires) : reussiteRetrait(retires))
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
        <h2
          id={idTitre}
          className="font-lecture text-[28px] leading-tight font-medium text-balance"
        >
          {confidentialite
            ? TEXTES_PANNEAUX.confidentialite.titre(ligne.libelle)
            : TEXTES_PANNEAUX.retrait.titre(ligne.libelle)}
        </h2>
        <div id={idTexte} className="flex flex-col gap-2 leading-normal text-encre-2">
          <p>{texte}</p>
          {phraseCalculs !== null ? (
            <p className="font-semibold text-encre">{phraseCalculs}</p>
          ) : null}
          {/* Décidé (T35) : la fenêtre dit comment reprendre ce chiffre plus tard. */}
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
          {refus !== null ? <ErreurEnvoi message={refus} /> : null}
          {/* Les boutons restent au bas de la fenêtre quand elle défile (téléphone de 360 x 640,
              sept motifs) : la personne n'a pas à chercher « Retirer » ni « Annuler ». Un élément
              collant respecte la marge intérieure de la fenêtre : « -bottom-6 » le laisse à sa
              place tant que rien ne défile, au lieu de le remonter sur le texte. */}
          <div className="sticky -bottom-6 -mx-6 -mt-3 -mb-6 flex flex-col-reverse gap-2 bg-papier px-6 pt-3 pb-6 min-[480px]:flex-row min-[480px]:justify-end">
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
              <LibelleEnvoi enCours={enCours} libelleEnCours={TEXTES_PANNEAUX.retraitEnCours}>
                {confidentialite
                  ? TEXTES_PANNEAUX.confidentialite.bouton
                  : TEXTES_PANNEAUX.retrait.bouton}
              </LibelleEnvoi>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
