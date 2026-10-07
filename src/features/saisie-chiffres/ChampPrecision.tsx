import { LONGUEUR_TEXTE_MAX } from '@/features/indicateurs/schemas'
import { Compteur } from '@/features/saisie/Compteur'
import { RappelDonneesPersonnelles } from '@/features/saisie/RappelDonneesPersonnelles'
import { idPrecision } from '@/features/saisie-chiffres/envoi'
import { TEXTES_CHIFFRES } from '@/features/saisie-chiffres/textes'

interface Props {
  indicateurId: string
  valeur: string
  onChange: (valeur: string) => void
  /** Premier champ « Précision » du formulaire : le rappel sur les données personnelles dessous. */
  rappel: boolean
  /** Une précision du total le plus récent est reprise dans le champ : la phrase du retrait. */
  reprise: boolean
  /** La précision du total le plus récent a été masquée par EJP Tech. */
  masquee: boolean
  erreur?: string
}

/**
 * « Précision (facultatif) » sous le total d'un indicateur sensible (P46) : 10 à 280 caractères,
 * compteur « 0 sur 280 », qui la lit en texte visible, et le rappel sur les données personnelles
 * sous le premier de ces champs (c'est le premier champ libre du formulaire). Pas d'aide : ce
 * qu'il faut savoir avant d'écrire est visible (aides-contextuelles.md, section 8). Le champ
 * reprend la précision du total le plus récent ; vidé, il la retire de l'affichage.
 */
export function ChampPrecision({
  indicateurId,
  valeur,
  onChange,
  rappel,
  reprise,
  masquee,
  erreur,
}: Props) {
  const id = idPrecision(indicateurId)
  const idLecteurs = `${id}-lecteurs`
  const idRappel = `${id}-rappel`
  const idCompteur = `${id}-compteur`
  const idNote = `${id}-note`
  const idErreur = `${id}-erreur`
  const note = masquee
    ? TEXTES_CHIFFRES.precisionMasquee
    : reprise
      ? TEXTES_CHIFFRES.precisionRetrait
      : null
  const decritPar = [
    idLecteurs,
    rappel ? idRappel : '',
    idCompteur,
    note ? idNote : '',
    erreur ? idErreur : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {TEXTES_CHIFFRES.precisionLibelle}
      </label>
      <p id={idLecteurs} className="text-sm leading-normal text-encre-3">
        {TEXTES_CHIFFRES.precisionLecteurs}
      </p>
      <textarea
        id={id}
        rows={3}
        value={valeur}
        onChange={(evenement) => onChange(evenement.target.value)}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decritPar}
        className="w-full border border-encre bg-papier px-3 py-2 text-[15px] leading-normal text-encre aria-invalid:border-2 aria-invalid:border-alerte"
      />
      {rappel ? <RappelDonneesPersonnelles id={idRappel} /> : null}
      <Compteur id={idCompteur} valeur={Array.from(valeur).length} max={LONGUEUR_TEXTE_MAX} />
      {note ? (
        <p id={idNote} className="text-sm leading-normal text-encre-3">
          {note}
        </p>
      ) : null}
      {erreur ? (
        <p id={idErreur} className="text-[15px] leading-normal text-alerte">
          {erreur}
        </p>
      ) : null}
    </div>
  )
}
