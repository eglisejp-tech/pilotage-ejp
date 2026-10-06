interface Props {
  /** Ce que fait le bouton (« Ajouter au calendrier », « Enregistrer la réunion »). */
  libelle: string
  /** Pendant l'envoi : « Envoi en cours », et un second clic n'envoie rien. */
  enCours: boolean
  libelleEnCours: string
}

/**
 * Bouton d'enregistrement d'une saisie (maquette 11) : jaune `--lumiere`, pleine largeur, 58 px.
 * Pendant l'envoi, il reste dans l'ordre du clavier (`aria-disabled`) pour que le focus ne se
 * perde pas, et il redevient actif dès la réponse, réussie ou non.
 */
export function BoutonEnregistrer({ libelle, enCours, libelleEnCours }: Props) {
  return (
    <button
      type="submit"
      aria-disabled={enCours ? true : undefined}
      className="min-h-14.5 w-full bg-lumiere px-4 text-[17px] font-bold text-encre aria-disabled:cursor-wait"
    >
      {enCours ? libelleEnCours : libelle}
    </button>
  )
}
