import { useParams } from 'react-router'
import { FicheConnectee } from '@/features/fiche/FicheConnectee'
import { FicheIntrouvable } from '@/features/fiche/FicheIntrouvable'
import type { ProfilFiche } from '@/features/fiche/modeleFiche'
import { estIdentifiantMinistere } from '@/features/fiche/useFiche'
import { useCompteConnecte } from '@/features/session/contexte'
import type { TypeCompte } from '@/lib/base'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import type { ProprietesPage } from '@/pages/proprietesPage'

/** Profils qui lisent la fiche 04 : le berger, le conseil et EJP Tech (lecture seule, T29). */
function profilLecteur(type: TypeCompte): Exclude<ProfilFiche, 'ministere'> | null {
  return type === 'berger' || type === 'conseil' || type === 'admin_plateforme' ? type : null
}

/**
 * `/ministeres/:id` (lot E2, maquette 04) : la fiche d'un ministère pour le berger, le conseil et
 * EJP Tech, en lecture (EJP Tech sans aucun bouton). Un ministère n'arrive jamais ici :
 * `PageApplication` renvoie son propre identifiant vers `/ma-fiche` et donne la page non
 * disponible pour tout autre, sans requête ; l'administration reçoit aussi la page non disponible.
 * Un identifiant mal formé donne la fiche introuvable, sans requête.
 */
export function PageFicheMinistere({ titre }: ProprietesPage) {
  const { id } = useParams()
  const compte = useCompteConnecte()
  const profil = profilLecteur(compte.type)
  if (profil === null) return <PageNonDisponible />
  if (!estIdentifiantMinistere(id)) return <FicheIntrouvable titre={titre} profil={profil} />
  return <FicheConnectee key={id} ministereId={id} profil={profil} titre={titre} />
}
