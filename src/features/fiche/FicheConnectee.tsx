import { Arrivee } from '@/components/etats/Arrivee'
import { useAttenteChargement } from '@/components/etats/useAttenteChargement'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { FicheIntrouvable } from '@/features/fiche/FicheIntrouvable'
import type { ProfilFiche } from '@/features/fiche/modeleFiche'
import { SqueletteFiche } from '@/features/fiche/SqueletteFiche'
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
 * Fiche d'un ministère lue dans la base : chargement (titres de section tout de suite, la flamme
 * et « Chargement de la fiche » après 300 ms, au moins 600 ms une fois montrés, T65), erreur de
 * page avec « Réessayer », ministère inconnu ou désactivé, puis la fiche, en fondu.
 * L'onglet du navigateur porte l'écran (« Ma fiche, Pilotage EJP »).
 */
export function FicheConnectee({ ministereId, profil, titre }: Props) {
  useTitrePage(titre)
  const resultat = useFiche(ministereId, { profil })
  const { attente, fondu } = useAttenteChargement(resultat.etat === 'chargement')
  if (attente) return <SqueletteFiche titre={titre} />
  switch (resultat.etat) {
    case 'pret':
      return (
        <Arrivee fondu={fondu} mode="sections">
          <VueFiche
            donnees={resultat.donnees}
            points={resultat.points}
            dernieresSaisies={resultat.dernieresSaisies}
            reessayerDetailsSensibles={resultat.reessayerDetailsSensibles}
          />
        </Arrivee>
      )
    case 'chargement':
      return <SqueletteFiche titre={titre} />
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
      return (
        <Arrivee fondu={fondu}>
          <FicheIntrouvable titre={titre} profil={profil} />
        </Arrivee>
      )
  }
}
