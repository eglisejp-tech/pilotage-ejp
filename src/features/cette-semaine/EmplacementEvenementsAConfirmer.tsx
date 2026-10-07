import { useContext } from 'react'
import type { FunctionComponent } from 'react'
import { EvenementsAConfirmerConnecte } from '@/features/cette-semaine/EvenementsAConfirmerConnecte'
import { ContexteSession } from '@/features/session/contexte'
import { litTout } from '@/lib/metier/droits'

/**
 * Emplacement « Événements à confirmer » (T31, lot E6), sous « À décider » dans
 * `GrilleCetteSemaine`. Le bloc ne s'adresse qu'au berger, au conseil et à EJP Tech, qui lisent
 * tout : c'est le compte connecté qui le décide ici, et non la place du bloc dans la grille. Pour
 * tout autre profil, ou hors de l'application (aperçus, chargement sans session), l'emplacement ne
 * rend rien et ne fait aucune requête. La base protège de toute façon les lignes (RLS).
 */
export const EmplacementEvenementsAConfirmer: FunctionComponent = () => {
  const etat = useContext(ContexteSession)
  if (etat?.statut !== 'connecte' || !litTout(etat.compte.type)) return null
  return <EvenementsAConfirmerConnecte />
}
