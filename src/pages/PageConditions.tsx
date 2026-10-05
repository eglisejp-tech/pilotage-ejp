import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { adressesConnexion } from '@/features/connexion/adresses'
import { Lien } from '@/features/connexion/Lien'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { PartieTexte } from '@/pages/PartieTexte'

const liste = 'flex list-disc flex-col gap-2 pl-5'

/**
 * Page « Conditions d'utilisation » : texte statique, lisible sans connexion, à côté de la page
 * Confidentialité. Ajoutée au BRIEF et validée par EJP Tech et la coordination le 5 octobre 2026
 * (docs/decisions.md, T17).
 */
export function PageConditions() {
  useTitrePage("Conditions d'utilisation")
  return (
    <ColonneConnexion>
      <TitreConnexion surtitre="Pilotage EJP" titre="Conditions d'utilisation" taille="moyenne">
        Les règles d'utilisation de l'outil. Mise à jour le 5 octobre 2026.
      </TitreConnexion>
      <div className="flex flex-col gap-6 text-[15px] leading-normal text-encre-2">
        <PartieTexte titre="Objet">
          <p>
            Pilotage EJP est un outil web temporaire de l'Église des Jeunes Prodiges. Les ministères
            y saisissent leurs chiffres, leurs événements, leurs réunions et leurs points
            d'attention. Le berger et le conseil y suivent la vie des ministères.
          </p>
          <p>
            Ces conditions fixent les règles d'utilisation. Utiliser l'outil, c'est les accepter.
          </p>
        </PartieTexte>
        <PartieTexte titre="Éditeur et hébergement">
          <p>
            Éditeur : l'Église des Jeunes Prodiges (EJP), par son ministère EJP Tech, 21 rue des
            Vieilles Vignes, 77183 Croissy-Beaubourg. Contact : EJP Tech, eglisejp.tech@gmail.com.
          </p>
          <p>
            Hébergement : la base de données est hébergée par Supabase, en région Paris (Union
            européenne). Le site est hébergé par Netlify.
          </p>
        </PartieTexte>
        <PartieTexte titre="Accès à l'outil">
          <ul role="list" className={liste}>
            <li>
              L'outil est réservé aux ministères enregistrés, dont les comptes sont créés par
              l'administration de l'église. Personne ne peut s'inscrire seul.
            </li>
            <li>Chaque ministère a un compte partagé, avec une adresse email commune.</li>
            <li>
              La connexion se fait avec un mot de passe d'au moins 12 caractères, ou avec un compte
              Google invité. Elle demande ensuite toujours un code de double authentification.
            </li>
            <li>Chaque compte ne voit que ce que son profil permet.</li>
          </ul>
        </PartieTexte>
        <PartieTexte titre="Comptes partagés des ministères">
          <ul role="list" className={liste}>
            <li>
              Le mot de passe et le code de double authentification se partagent seulement entre les
              personnes autorisées du ministère.
            </li>
            <li>
              Quand une personne quitte le ministère, le responsable prévient sans délai
              l'administration de l'église et EJP Tech. Ensuite, dans cet ordre : le responsable
              change le mot de passe de la boîte mail partagée, l'administration de l'église refait
              l'activation du compte, puis le responsable choisit un nouveau mot de passe et
              réactive la double authentification avec les personnes qui restent.
            </li>
            <li>
              En cas de perte d'un téléphone, prévenez l'administration de l'église, qui refait
              l'activation.
            </li>
          </ul>
        </PartieTexte>
        <PartieTexte titre="Règles d'usage">
          <ul role="list" className={liste}>
            <li>Saisissez des informations exactes, au nom de votre ministère.</li>
            <li>
              N'écrivez aucun nom ni information personnelle dans les champs libres : pas de
              coordonnées, pas d'information sur la santé ou la situation d'une personne. Un champ
              libre compte 280 caractères au plus.
            </li>
            <li>
              Ne cherchez pas à accéder aux données d'un autre profil, ni à contourner la sécurité.
            </li>
            <li>Ne donnez pas vos accès à une personne qui n'est pas autorisée.</li>
          </ul>
        </PartieTexte>
        <PartieTexte titre="Saisies, historique et relecture">
          <ul role="list" className={liste}>
            <li>
              Une saisie n'est jamais modifiée ni effacée. Une correction est une nouvelle saisie,
              et l'historique reste visible.
            </li>
            <li>
              Chaque action (saisie, changement de statut, action sur un compte, relecture) est
              inscrite au journal avec sa date et le compte qui l'a faite. Le journal ne recopie
              jamais un texte libre ni une adresse email.
            </li>
            <li>
              EJP Tech relit les champs libres. Un texte qui contient une information personnelle
              est masqué et remplacé par « [texte masqué par EJP Tech] ».
            </li>
          </ul>
        </PartieTexte>
        <PartieTexte titre="Désactivation d'un compte">
          <p>
            L'administration de l'église peut désactiver un compte, par exemple quand un ministère
            arrête son activité ou quand ces conditions ne sont pas respectées. Les données du
            compte sont gardées. L'administration peut le réactiver.
          </p>
        </PartieTexte>
        <PartieTexte titre="Disponibilité et fin de l'outil">
          <ul role="list" className={liste}>
            <li>
              L'outil peut être interrompu, par exemple pour une maintenance ou une panne. Sa
              disponibilité n'est pas garantie.
            </li>
            <li>
              L'outil est temporaire. Son arrêt est décidé par la coordination de l'église et
              annoncé au moins une semaine avant. Un export final des données est remis à la
              coordination, puis les données sont supprimées.
            </li>
          </ul>
        </PartieTexte>
        <PartieTexte titre="Responsabilités">
          <p>
            L'église protège l'outil avec des moyens raisonnables : double authentification
            obligatoire, accès limité par profil, hébergement de la base dans l'Union européenne.
            Chaque personne répond de ce qu'elle saisit et garde ses accès confidentiels.
          </p>
        </PartieTexte>
        <PartieTexte titre="Données personnelles">
          <p>Elles sont décrites dans la page Confidentialité.</p>
        </PartieTexte>
        <PartieTexte titre="Changement des conditions">
          <p>
            L'église peut modifier ces conditions. La nouvelle version est publiée sur cette page,
            avec sa date, et s'applique dès sa publication.
          </p>
        </PartieTexte>
        <PartieTexte titre="Droit applicable">
          <p>
            Ces conditions relèvent du droit français. En cas de difficulté, écrivez d'abord à EJP
            Tech pour chercher une solution à l'amiable.
          </p>
        </PartieTexte>
      </div>
      <Lien to={adressesConnexion.confidentialite}>Confidentialité</Lien>
      <Lien to="/">Revenir à l'accueil</Lien>
    </ColonneConnexion>
  )
}
