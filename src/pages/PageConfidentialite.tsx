import type { ReactNode } from 'react'
import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { Lien } from '@/features/connexion/Lien'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'

function Partie({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-lecture text-xl font-medium">{titre}</h2>
      {children}
    </section>
  )
}

/**
 * Page « Confidentialité » (BRIEF section 7, « Données personnelles ») : texte statique, lisible
 * sans connexion, depuis l'écran 16 et le menu. Texte à valider par la coordination.
 */
export function PageConfidentialite() {
  useTitrePage('Confidentialité')
  return (
    <ColonneConnexion>
      <TitreConnexion surtitre="Pilotage EJP" titre="Confidentialité" taille="moyenne">
        Ce que l'outil fait des données, et à qui s'adresser.
      </TitreConnexion>
      <div className="flex flex-col gap-6 text-[15px] leading-normal text-encre-2">
        <Partie titre="Responsable">
          <p>L'association Église des Jeunes Prodiges (EJP).</p>
        </Partie>
        <Partie titre="À quoi sert l'outil">
          <p>
            Suivre les chiffres, les événements, les réunions et les points d'attention des
            ministères, pour le berger et le conseil. Rien d'autre.
          </p>
        </Partie>
        <Partie titre="Données traitées">
          <ul role="list" className="flex list-disc flex-col gap-2 pl-5">
            <li>
              L'adresse email de chaque compte. Un ministère utilise une adresse partagée, jamais
              celle d'une personne.
            </li>
            <li>
              Le nom et la photo du profil Google, transmis par Google quand une personne se
              connecte avec Google. L'outil ne les affiche pas et ne les copie pas.
            </li>
            <li>Les adresses IP, dans les journaux techniques de Supabase et de l'hébergeur.</li>
            <li>
              Ce qui est écrit dans les champs libres. N'y écrivez aucune information sur une
              personne : ce qui y est écrit par erreur est masqué.
            </li>
          </ul>
        </Partie>
        <Partie titre="Qui y a accès">
          <p>
            Les comptes de l'église, chacun selon son profil, avec la double authentification. Les
            données sont hébergées dans l'Union européenne. Les sous-traitants (Supabase,
            l'hébergeur du site, Google pour la connexion, le service d'envoi des emails) sont sous
            contrat.
          </p>
        </Partie>
        <Partie titre="Durée">
          <p>
            L'outil est temporaire. À son arrêt, ses données sont supprimées selon les règles fixées
            par la coordination de l'église.
          </p>
        </Partie>
        <Partie titre="Traceurs">
          <p>
            Aucun traceur ni cookie publicitaire, aucun appel à un autre service au chargement.
            Votre connexion est gardée dans ce navigateur jusqu'à ce que vous vous déconnectiez.
          </p>
        </Partie>
        <Partie titre="Vos droits">
          <p>
            Pour consulter, corriger ou supprimer une donnée, adressez-vous à l'administration de
            l'église.
          </p>
        </Partie>
      </div>
      <Lien to="/">Revenir à l'accueil</Lien>
    </ColonneConnexion>
  )
}
