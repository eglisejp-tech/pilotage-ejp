import { EtatVide } from '@/components/etats/EtatVide'
import { SITUATIONS_VIDES } from '@/components/etats/situations'
import type { SituationVide } from '@/components/etats/situations'
import { LigneApercuFiche as Ligne } from '@/features/fiche/apercu/LigneApercuFiche'

const EXEMPLES_VIDES: Record<SituationVide, { message: string; suite?: string; action?: string }> =
  {
    premier_usage: {
      message: 'Aucun événement prévu.',
      suite: "Ajoutez le premier pour qu'il apparaisse ici.",
      action: 'Ajouter un événement',
    },
    en_attente_des_autres: { message: "La carte s'affichera quand FIJ aura saisi ses chiffres." },
    tout_est_fait: { message: 'Aucun point ouvert pour votre ministère.' },
    aucun_resultat: { message: 'Aucun indicateur retiré.' },
    pas_pour_ce_profil: { message: 'Cette page est réservée à un autre profil.' },
    probleme_passager: { message: 'La connexion a échoué. Réessayez.', action: 'Réessayer' },
  }

/**
 * Aperçu de développement de la fiche d'un ministère (maquettes 04 et 12) : cinq aides en bulle
 * « flottante » sur des lignes d'exemple, puis les six situations d'un état vide (T36). Sans base,
 * données d'exemple. Adresse : /apercu/fiche. Le lot E2 le remplace par la vraie fiche, en gardant
 * les aides, car `e2e/aide.spec.ts` s'appuie sur cette adresse. Enregistrée seulement en
 * développement.
 */
export function ApercuFiche() {
  return (
    <>
      <title>Aperçu, Fiche d'un ministère, Pilotage EJP</title>
      <h1 className="font-lecture text-titre leading-tight font-medium">Fiche d'un ministère</h1>
      <div className="mt-2 border-t-2 border-encre" />
      <section aria-labelledby="apercu-lecture" className="mt-8">
        <h2 id="apercu-lecture" className="font-lecture text-section font-medium">
          Lignes de lecture
        </h2>
        <ul className="mt-4 max-w-2xl">
          <Ligne libelle="Mis à jour il y a 3 jours" valeur="3 j" aide="fiche.fraicheur" />
          <Ligne
            libelle="Somme depuis janvier : 9 mois sur 9"
            valeur="112"
            aide="fiche.sommeAnnee"
          />
          <Ligne libelle="Courbe des douze derniers mois" valeur="12" aide="fiche.courbe" />
          <Ligne libelle="Indicateur de santé" valeur="moins de 3" aide="fiche.moinsDe3" />
          <Ligne libelle="Taux de résolution" valeur="80 %" aide="fiche.calcule" />
        </ul>
      </section>
      <section aria-labelledby="apercu-vides" className="mt-12">
        <h2 id="apercu-vides" className="font-lecture text-section font-medium">
          États vides
        </h2>
        <div className="mt-4 flex max-w-2xl flex-col divide-y divide-filet">
          {SITUATIONS_VIDES.map((situation) => {
            const exemple = EXEMPLES_VIDES[situation]
            return (
              <EtatVide
                key={situation}
                situation={situation}
                suite={exemple.suite}
                action={
                  exemple.action ? { libelle: exemple.action, surClic: () => undefined } : undefined
                }
              >
                {exemple.message}
              </EtatVide>
            )
          })}
        </div>
      </section>
    </>
  )
}
