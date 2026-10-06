interface Props {
  /** « Enregistrer la présence », « Enregistrer la carte »... */
  libelle: string
  /** Pendant l'envoi : « Enregistrement en cours », le bouton ne répond plus (BRIEF, section 9). */
  enCours: boolean
}

/** Bouton principal d'une saisie (maquettes 08 et 09) : jaune, pleine largeur, 58 px. */
export function BoutonEnregistrer({ libelle, enCours }: Props) {
  return (
    <button
      type="submit"
      disabled={enCours}
      className="min-h-14.5 w-full bg-lumiere px-4 text-[17px] font-bold text-encre disabled:cursor-wait"
    >
      {enCours ? 'Enregistrement en cours' : libelle}
    </button>
  )
}
