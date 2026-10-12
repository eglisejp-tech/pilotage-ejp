import { useCompteConnecte } from '@/features/session/contexte'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { ChargementJournal } from '@/features/journal/ChargementJournal'
import { ErreurJournal } from '@/features/journal/ErreurJournal'
import { useFiltresDeLAdresse } from '@/features/journal/useFiltresDeLAdresse'
import { useJournal } from '@/features/journal/useJournal'
import { VueJournal } from '@/features/journal/VueJournal'
import type { ProprietesPage } from '@/pages/proprietesPage'

/**
 * Écran 06 « Journal » sur `/journal` (berger, conseil, administration de l'église ; « Mon journal »
 * pour un ministère) et « Journal technique » sur `/journal-technique` (EJP Tech) : une seule page
 * sert les deux adresses (BRIEF, section 9). `PageApplication` a déjà vérifié le profil de
 * l'adresse ; la base décide de ce que chaque profil lit (RLS de `journal`). Trois états : le
 * chargement (titre tout de suite, « Chargement » après 300 ms), l'erreur de page avec « Réessayer »
 * (échec ou 10 s sans réponse), puis la vue. Titre de l'onglet : « Journal, Pilotage EJP ».
 */
export function PageJournal({ titre }: ProprietesPage) {
  const compte = useCompteConnecte()
  const [filtres, changerFiltres] = useFiltresDeLAdresse()
  const resultat = useJournal(compte.type, filtres)
  useTitrePage(titre)

  if (resultat.etat === 'erreur') {
    return <ErreurJournal titre={titre} onReessayer={resultat.reessayer} />
  }
  if (resultat.etat === 'pret') {
    return (
      <VueJournal
        titre={titre}
        profil={compte.type}
        donnees={resultat.donnees}
        surFiltres={changerFiltres}
        surPlus={resultat.afficherPlus}
        surReessayer={resultat.reessayerPlus}
      />
    )
  }
  return <ChargementJournal titre={titre} profil={compte.type} />
}
