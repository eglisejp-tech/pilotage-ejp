import type { FunctionComponent } from 'react'
import type { ProprietesEmplacementFiche } from '@/features/fiche/types'

/**
 * Emplacement du lien « Gérer mes indicateurs » de « Ma fiche » (maquette 12 ;
 * configuration-indicateurs.md, 7.3 et 7.5), sous les chiffres du ministère, en bas de la section.
 * Amorce de C0 : elle ne rend rien, le lot L4 la remplit (un lien vers `/ma-fiche/indicateurs`,
 * pour le profil « ministère » seulement ; rien pour le berger, le conseil ni EJP Tech, T29).
 */
export const EmplacementGererIndicateurs: FunctionComponent<ProprietesEmplacementFiche> = () => null
