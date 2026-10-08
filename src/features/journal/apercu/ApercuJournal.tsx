import { useMemo } from 'react'
import { useJournalDExemple } from '@/features/journal/apercu/useJournalDExemple'
import { ChargementJournal } from '@/features/journal/ChargementJournal'
import { ErreurJournal } from '@/features/journal/ErreurJournal'
import { useFiltresDeLAdresse } from '@/features/journal/useFiltresDeLAdresse'
import { VueJournal } from '@/features/journal/VueJournal'
import { lireProfilApercu } from '@/features/navigation/apercu/exemples'
import { titrePour, trouverAdresse } from '@/features/navigation/profils'
import { PageNonDisponible } from '@/pages/PageNonDisponible'
import { useSearchParams } from 'react-router'

const ETATS = ['liste', 'vide', 'chargement', 'erreur'] as const
type EtatApercu = (typeof ETATS)[number]

const reessayer = () => undefined

function lireEtat(valeur: string | null): EtatApercu {
  return ETATS.find((etat) => etat === valeur) ?? 'liste'
}

/**
 * Aperçu de développement de l'écran 06 « Journal » (lot L5), sans base ni requête : les vrais
 * composants, nourris du journal d'exemple de `exemplesJournal.ts` par les mêmes fonctions que la
 * page (`construireJournal`, `filtresRetenus`). Adresse : /apercu/journal. `?profil=` choisit le
 * lecteur (berger par défaut ; `conseil` ; `ministere` lit « Mon journal » de Communication, sans
 * filtre « Compte » ; `admin_eglise` lit sa liste fermée ; `admin_plateforme` lit « Journal
 * technique », sur /journal-technique en vrai), `?compte=`, `?action=`, `?periode=` et
 * `?ministere=` comme l'adresse réelle, `?etat=` : `liste` (par défaut), `vide`, `chargement`,
 * `erreur`. Enregistrée seulement en développement (src/app/routes.tsx).
 */
export function ApercuJournal() {
  const [parametres] = useSearchParams()
  const profil = lireProfilApercu(parametres.get('profil'))
  const etat = lireEtat(parametres.get('etat'))
  const [filtres, changerFiltres] = useFiltresDeLAdresse()
  const { donnees, afficherPlus } = useJournalDExemple(profil, filtres, etat === 'vide')

  const adresse = trouverAdresse(profil === 'admin_plateforme' ? '/journal-technique' : '/journal')
  const titre = useMemo(
    () => (adresse === null ? 'Journal' : titrePour(adresse, profil)),
    [adresse, profil],
  )
  if (adresse === null) return <PageNonDisponible />

  if (etat === 'chargement') return <ChargementJournal titre={titre} profil={profil} />
  if (etat === 'erreur') return <ErreurJournal titre={titre} onReessayer={reessayer} />
  return (
    <VueJournal
      titre={titre}
      profil={profil}
      donnees={donnees}
      surFiltres={changerFiltres}
      surPlus={afficherPlus}
    />
  )
}
