import type { FunctionComponent } from 'react'
import { useCalendrierMinistere } from '@/features/fiche/useCalendrierMinistere'
import type { ProprietesEmplacementFiche } from '@/features/fiche/types'
import { VueCalendrier } from '@/features/fiche/VueCalendrier'

/**
 * Emplacement « Calendrier » de la fiche (maquettes 04 et 12, lot E6) : lit les événements du
 * ministère et ceux qui le mentionnent, puis les montre dans `VueCalendrier`, avec le bandeau
 * d'alerte des événements à confirmer. « Mettre à jour » n'existe que pour le ministère porteur
 * sur sa propre fiche ; EJP Tech, le berger et le conseil lisent sans aucun bouton.
 */
export const CalendrierMinistere: FunctionComponent<ProprietesEmplacementFiche> = ({
  ministereId,
  profil,
}) => <VueCalendrier etat={useCalendrierMinistere(ministereId, profil)} profil={profil} />
