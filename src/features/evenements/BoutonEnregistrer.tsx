import { Bouton } from '@/components/ui/Bouton'

interface Props {
  /** Ce que fait le bouton (« Ajouter au calendrier », « Enregistrer la réunion »). */
  libelle: string
  /** Pendant l'envoi : « Envoi en cours », et un second clic n'envoie rien. */
  enCours: boolean
  libelleEnCours: string
  /**
   * Après un envoi réussi, tant que le formulaire n'a pas changé : un second clic n'enverrait
   * qu'un doublon (ajout seulement, rien ne le supprime). Le formulaire ignore alors l'envoi.
   */
  dejaEnvoye?: boolean
}

/**
 * Bouton d'enregistrement d'une saisie (maquette 11) : le Bouton commun (T69), jaune, pleine
 * largeur, 58 px. Pendant l'envoi, il reste dans l'ordre du clavier (`aria-disabled`) pour que le
 * focus ne se perde pas, et il redevient actif dès la réponse, réussie ou non ; la petite flamme
 * accompagne « … en cours » (T65, moment 4). Après une réussite, il reste indisponible (estompé)
 * jusqu'à la prochaine modification du formulaire.
 */
export function BoutonEnregistrer({ libelle, enCours, libelleEnCours, dejaEnvoye = false }: Props) {
  return (
    <Bouton
      type="submit"
      variante="principal"
      taille="enregistrer"
      pleineLargeur
      enCours={enCours}
      indisponible={dejaEnvoye}
      libelleEnCours={libelleEnCours}
    >
      {libelle}
    </Bouton>
  )
}
