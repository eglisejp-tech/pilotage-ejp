import { CalendrierMinistere } from '@/features/fiche/CalendrierMinistere'
import { ChiffresParDepartement } from '@/features/fiche/ChiffresParDepartement'
import { ComptagesEvenements } from '@/features/fiche/ComptagesEvenements'
import { EmplacementGererIndicateurs } from '@/features/fiche/EmplacementGererIndicateurs'
import { EmplacementNouveauPoint } from '@/features/fiche/EmplacementNouveauPoint'
import { GraphiquesFiche } from '@/features/fiche/GraphiquesFiche'
import { ProchaineReunion } from '@/features/fiche/ProchaineReunion'
import type { EmplacementFiche, ProprietesEmplacementFiche } from '@/features/fiche/types'

type Proprietes = ProprietesEmplacementFiche & { emplacement: EmplacementFiche }

/**
 * Les emplacements de la fiche d'un ministère, écrits une fois par W0 pour que les lots E4, E6
 * et L2 à L3 ne touchent jamais la page de la fiche (lot E2). La fiche pose
 * `<EmplacementDeFiche emplacement="calendrier" ... />` où elle veut le bloc ; chaque lot remplit
 * le fichier de son bloc. Un bloc sans rien à montrer ne rend rien.
 */
export function EmplacementDeFiche({ emplacement, ...fiche }: Proprietes) {
  switch (emplacement) {
    case 'calendrier':
      return <CalendrierMinistere {...fiche} />
    case 'reunion':
      return <ProchaineReunion {...fiche} />
    case 'statistiquesFij':
      return <ChiffresParDepartement {...fiche} />
    case 'comptages':
      return <ComptagesEvenements {...fiche} />
    case 'graphiques':
      return <GraphiquesFiche {...fiche} />
    case 'nouveauPoint':
      return <EmplacementNouveauPoint {...fiche} />
    case 'gererIndicateurs':
      return <EmplacementGererIndicateurs {...fiche} />
  }
}
