import { MESSAGE_DEJA_ENREGISTRE } from '@/features/saisie-session/useEnvoiSaisie'

interface Props {
  /** « Enregistrer la présence », « Enregistrer la carte »... */
  libelle: string
  /** Pendant l'envoi : « Enregistrement en cours », le bouton ne répond plus (BRIEF, section 9). */
  enCours: boolean
  /** Le formulaire contient ce qui vient d'être enregistré : un nouvel appui n'envoie rien. */
  dejaEnvoye?: boolean
  /** La personne vient de réessayer d'envoyer la même chose : la phrase le dit. */
  doublon?: boolean
}

/** Bouton principal d'une saisie (maquettes 08 et 09) : jaune, pleine largeur, 58 px. */
export function BoutonEnregistrer({
  libelle,
  enCours,
  dejaEnvoye = false,
  doublon = false,
}: Props) {
  return (
    <>
      <button
        type="submit"
        disabled={enCours}
        aria-disabled={dejaEnvoye ? true : undefined}
        className="min-h-14.5 w-full bg-lumiere px-4 text-[17px] font-bold text-encre disabled:cursor-wait aria-disabled:opacity-60"
      >
        {enCours ? 'Enregistrement en cours' : libelle}
      </button>
      {doublon ? (
        <p role="status" className="text-[15px] leading-normal text-encre-3">
          {MESSAGE_DEJA_ENREGISTRE}
        </p>
      ) : null}
    </>
  )
}
