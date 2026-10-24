import type { Personne } from '@/features/declaration/PersonneDeclaree'
import { TEXTES_EN_TETE_PERSONNE } from '@/features/declaration/textes'
import { LIBELLE_RETOUR } from '@/features/saisie/textes'

interface Proprietes {
  /** Libellé du compte connecté, toujours visible : un email de ministère est partagé. */
  libelleCompte: string
  /** Compte de ministère : la personne déclarée sur cet appareil (T56), toujours visible. */
  personne?: Pick<Personne, 'prenom'>
  /** « Retour » : la fermeture de la saisie, qui demande d'abord « Fermer sans enregistrer ? ». */
  onRetour: () => void
}

/**
 * En-tête simplifié d'une saisie au téléphone (maquette 08 ; BRIEF_DESIGN, section 7 ;
 * proposition 4, T69, écart 2) : une seule ligne, « Retour » à gauche, le compte à droite. Ni
 * menu ni nom de l'outil : rien n'invite à partir ailleurs en pleine saisie. Pour un compte de
 * ministère, « Vous : Marie D. » reste sous le libellé du compte ; « Ce n'est pas moi » attend le
 * retour à la page (menu), comme « Se déconnecter ».
 */
export function EnTeteSaisie({ libelleCompte, personne, onRetour }: Proprietes) {
  return (
    <header className="border-b border-filet bg-papier">
      <div className="flex items-center justify-between gap-4 px-5 py-3.5">
        <button
          type="button"
          onClick={onRetour}
          className="inline-flex min-h-cible shrink-0 items-center text-interface text-nuit underline underline-offset-4"
        >
          {LIBELLE_RETOUR}
        </button>
        <div className="min-w-0 text-right text-detail wrap-anywhere text-encre-2">
          <p>
            <span className="sr-only">Compte connecté : </span>
            {libelleCompte}
          </p>
          {personne ? <p>{TEXTES_EN_TETE_PERSONNE.vous(personne.prenom)}</p> : null}
        </div>
      </div>
    </header>
  )
}
