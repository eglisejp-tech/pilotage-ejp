import { EtatVide } from '@/components/etats/EtatVide'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import type { ProfilFiche } from '@/features/fiche/modeleFiche'
import { TEXTES_FICHE } from '@/features/fiche/textesFiche'

interface Props {
  titre: string
  profil: ProfilFiche
}

/**
 * `/ministeres/:id` d'un identifiant inconnu ou d'un ministère désactivé (aucun résultat) : le
 * titre de l'écran, la phrase, et « Revenir aux ministères » pour le berger, le conseil et EJP Tech.
 */
export function FicheIntrouvable({ titre, profil }: Props) {
  useTitrePage(titre)
  return (
    <section aria-labelledby="titre-page">
      <h1 id="titre-page" className="font-lecture text-titre leading-tight font-medium">
        {titre}
      </h1>
      <div className="mt-2 border-t-2 border-encre" />
      <EtatVide
        situation="aucun_resultat"
        action={{ libelle: TEXTES_FICHE.revenirAuxMinisteres, vers: '/ministeres' }}
        peutAgir={profil !== 'ministere'}
      >
        {TEXTES_FICHE.introuvable}
      </EtatVide>
    </section>
  )
}
