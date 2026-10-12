import { FenetreRetrait } from '@/features/indicateurs/configuration/panneaux/FenetreRetrait'
import { FormulaireCalcul } from '@/features/indicateurs/configuration/panneaux/FormulaireCalcul'
import { FormulaireCorrection } from '@/features/indicateurs/configuration/panneaux/FormulaireCorrection'
import { FormulaireIndicateur } from '@/features/indicateurs/configuration/panneaux/FormulaireIndicateur'
import type { ControleurPanneaux } from '@/features/indicateurs/configuration/panneaux/contexte'
import { TEXTES_PANNEAUX } from '@/features/indicateurs/configuration/panneaux/textes'
import { PanneauSaisie } from '@/features/saisie/PanneauSaisie'

interface Props {
  controleur: ControleurPanneaux
}

/**
 * Le panneau ou la fenêtre ouvert sur l'écran d'un ministère (7.2) : les quatre panneaux de saisie
 * (ajouter, calculer, corriger, remplacer) sont des pages entières sous 600 px et des panneaux de
 * 460 px au-delà (`PanneauSaisie`) ; les deux retraits sont des fenêtres de confirmation. Le nom
 * du ministère est le surtitre, pour que la page entière dise où l'on est.
 */
export function PanneauOuvertIndicateurs({ controleur }: Props) {
  const { panneau, ministere, fermer } = controleur
  if (panneau === null) return null
  switch (panneau.genre) {
    case 'ajout':
      return (
        <PanneauSaisie
          titre={TEXTES_PANNEAUX.ajout.titre}
          surtitre={ministere.nom}
          onFermer={fermer}
        >
          <FormulaireIndicateur controleur={controleur} />
        </PanneauSaisie>
      )
    case 'calcul':
      return (
        <PanneauSaisie
          titre={TEXTES_PANNEAUX.calcul.titre}
          surtitre={ministere.nom}
          onFermer={fermer}
        >
          <FormulaireCalcul controleur={controleur} />
        </PanneauSaisie>
      )
    case 'corriger':
      return (
        <PanneauSaisie
          titre={TEXTES_PANNEAUX.correction.titre}
          surtitre={ministere.nom}
          onFermer={fermer}
        >
          <FormulaireCorrection controleur={controleur} ligne={panneau.ligne} />
        </PanneauSaisie>
      )
    case 'remplacer':
      return panneau.ligne.calcul !== null ? (
        <PanneauSaisie
          titre={TEXTES_PANNEAUX.calcul.titreRemplacement}
          surtitre={ministere.nom}
          onFermer={fermer}
        >
          <FormulaireCalcul controleur={controleur} remplace={panneau.ligne} />
        </PanneauSaisie>
      ) : (
        <PanneauSaisie
          titre={TEXTES_PANNEAUX.remplacement.titre}
          surtitre={ministere.nom}
          onFermer={fermer}
        >
          <FormulaireIndicateur controleur={controleur} remplace={panneau.ligne} />
        </PanneauSaisie>
      )
    case 'retirer':
      return <FenetreRetrait controleur={controleur} ligne={panneau.ligne} genre="retirer" />
    case 'confidentialite':
      return (
        <FenetreRetrait controleur={controleur} ligne={panneau.ligne} genre="confidentialite" />
      )
  }
}
