import { useTitrePage } from '@/features/connexion/useTitrePage'
import { ChargementBloc } from '@/features/fiche/ChargementBloc'
import { FicheIntrouvable } from '@/features/fiche/FicheIntrouvable'
import type { ProfilFiche } from '@/features/fiche/modeleFiche'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'
import { useFiche } from '@/features/fiche/useFiche'
import { VueFiche } from '@/features/fiche/VueFiche'
import { ErreurDePage } from '@/pages/ErreurDePage'

interface Props {
  ministereId: string
  profil: ProfilFiche
  /** Titre de l'écran (« Ma fiche », « Fiche du ministère »), avant que le nom soit connu. */
  titre: string
}

/**
 * Fiche d'un ministère lue dans la base : chargement (titre tout de suite, « Chargement » après
 * 300 ms), erreur de page avec « Réessayer », ministère inconnu ou désactivé, puis la fiche.
 * L'onglet du navigateur porte l'écran (« Ma fiche, Pilotage EJP »).
 */
export function FicheConnectee({ ministereId, profil, titre }: Props) {
  useTitrePage(titre)
  const resultat = useFiche(ministereId, { profil })
  switch (resultat.etat) {
    case 'pret':
      return (
        <VueFiche
          donnees={resultat.donnees}
          points={resultat.points}
          dernieresSaisies={resultat.dernieresSaisies}
        />
      )
    case 'chargement':
      return (
        <>
          <h1 className="font-lecture text-titre leading-tight font-medium">{titre}</h1>
          <ChargementBloc />
        </>
      )
    case 'erreur':
      return (
        <>
          <h1 className="sr-only">{titre}</h1>
          <ErreurDePage
            message={TEXTES_FICHE.erreur}
            libelleBouton={TEXTES_FICHE.reessayer}
            onReessayer={resultat.reessayer}
          />
        </>
      )
    case 'introuvable':
      return <FicheIntrouvable titre={titre} profil={profil} />
  }
}
