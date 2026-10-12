import { FormulaireAdresse } from '@/features/comptes/FormulaireAdresse'
import { FormulaireNouveauMinistere } from '@/features/comptes/FormulaireNouveauMinistere'
import { REUSSITES_COMPTES, TEXTES_COMPTES } from '@/features/comptes/textes'
import type { CreationCompte } from '@/features/comptes/types'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'

/** Le panneau ouvert sur l'écran 13. */
export type PanneauOuvert =
  | { genre: 'ministere' }
  | { genre: 'ministere_existant'; ministereId: string; nom: string }
  | { genre: 'berger' }
  | { genre: 'conseil'; nomAffiche: string }
  | { genre: 'admin_plateforme'; nomAffiche: string }

interface Props {
  panneau: PanneauOuvert
  creer: (creation: CreationCompte) => Promise<void>
  /** Création réussie : le panneau se ferme et la page affiche ce message. */
  onCree: (message: string) => void
  onFermer: () => void
}

function titreDu(panneau: PanneauOuvert): string {
  switch (panneau.genre) {
    case 'ministere':
      return TEXTES_COMPTES.panneauMinistere
    case 'ministere_existant':
      return TEXTES_COMPTES.panneauCompteMinistere(panneau.nom)
    case 'berger':
      return TEXTES_COMPTES.panneauBerger
    case 'conseil':
      return TEXTES_COMPTES.panneauConseil
    case 'admin_plateforme':
      return TEXTES_COMPTES.panneauEjpTech
  }
}

/**
 * Panneaux d'ajout de l'écran 13, dérivés de la colonne « Déclarer une session » de 14 : page
 * entière sous 600 px, panneau de 460 px au-delà (`PanneauSaisie`). Sous le titre, la phrase qui
 * dit ce que reçoit l'adresse ; puis le formulaire.
 */
export function PanneauCompte({ panneau, creer, onCree, onFermer }: Props) {
  const contenu =
    panneau.genre === 'ministere' ? (
      <FormulaireNouveauMinistere
        onAnnuler={onFermer}
        envoyer={async ({ nom, description, email }) => {
          await creer({ type: 'ministere', nom, description, email })
          onCree(REUSSITES_COMPTES.ministereCree(nom, email))
        }}
      />
    ) : (
      <FormulaireAdresse
        libelle={
          panneau.genre === 'ministere_existant'
            ? TEXTES_COMPTES.champEmailMinistere
            : TEXTES_COMPTES.champEmailPersonnel
        }
        aide={
          panneau.genre === 'ministere_existant'
            ? 'comptes.emailMinistere'
            : 'comptes.emailPersonnel'
        }
        nomAffiche={
          panneau.genre === 'conseil' || panneau.genre === 'admin_plateforme'
            ? panneau.nomAffiche
            : panneau.genre === 'berger'
              ? 'Berger'
              : undefined
        }
        onAnnuler={onFermer}
        envoyer={async ({ email }) => {
          if (panneau.genre === 'ministere_existant') {
            await creer({
              type: 'ministere_existant',
              email,
              ministereId: panneau.ministereId,
              nom: panneau.nom,
            })
          } else {
            await creer({ type: panneau.genre, email })
          }
          onCree(REUSSITES_COMPTES.compteCree(email))
        }}
      />
    )

  return (
    <PanneauSaisie
      titre={titreDu(panneau)}
      surtitre={TEXTES_COMPTES.surtitrePanneau}
      onFermer={onFermer}
    >
      <p className="leading-normal text-encre-2">{TEXTES_COMPTES.phraseInvitation}</p>
      {contenu}
    </PanneauSaisie>
  )
}
