import { Bouton } from '@/components/ui/Bouton'
import { MESSAGE_DEJA_ENREGISTRE } from '@/features/saisie-session/useEnvoiSaisie'

interface Props {
  /** « Enregistrer la présence », « Enregistrer la carte »... */
  libelle: string
  /**
   * Pendant l'envoi : « Enregistrement en cours » ; un second appui n'envoie rien (verrou de
   * useEnvoiSaisie), et le bouton garde le focus (BRIEF, section 9).
   */
  enCours: boolean
  /** Le formulaire contient ce qui vient d'être enregistré : un nouvel appui n'envoie rien. */
  dejaEnvoye?: boolean
  /** La personne vient de réessayer d'envoyer la même chose : la phrase le dit. */
  doublon?: boolean
}

/**
 * Bouton principal d'une saisie (maquettes 08 et 09) : le Bouton commun (T69), jaune, pleine
 * largeur, 58 px. Pendant l'envoi, la petite flamme accompagne « Enregistrement en cours » (T65,
 * moment 4), sans que le bouton quitte l'ordre du clavier (`aria-disabled`, jamais `disabled`).
 */
export function BoutonEnregistrer({
  libelle,
  enCours,
  dejaEnvoye = false,
  doublon = false,
}: Props) {
  return (
    <>
      <Bouton
        type="submit"
        variante="principal"
        taille="enregistrer"
        pleineLargeur
        enCours={enCours}
        indisponible={dejaEnvoye}
        libelleEnCours="Enregistrement en cours"
      >
        {libelle}
      </Bouton>
      {doublon ? (
        <p role="status" className="text-interface leading-normal text-encre-3">
          {MESSAGE_DEJA_ENREGISTRE}
        </p>
      ) : null}
    </>
  )
}
