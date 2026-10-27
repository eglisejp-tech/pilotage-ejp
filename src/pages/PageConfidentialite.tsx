import { ColonneConnexion } from '@/features/connexion/ColonneConnexion'
import { adressesConnexion } from '@/features/connexion/adresses'
import { Lien } from '@/features/connexion/Lien'
import { TitreConnexion } from '@/features/connexion/TitreConnexion'
import { useTitrePage } from '@/features/connexion/useTitrePage'
import { PartieTexte } from '@/pages/PartieTexte'

const liste = 'flex list-disc flex-col gap-2 pl-5'

/**
 * Page « Confidentialité » (BRIEF section 7, « Données personnelles ») : texte statique, lisible
 * sans connexion, depuis l'écran 16, le menu et le pied de page. Texte validé par EJP Tech et la
 * coordination le 5 octobre 2026 (docs/decisions.md, T17). Mise à jour du 7 octobre 2026 pour
 * l'étape 4 (lot I) : chiffres sensibles (K56, P42, P45 à P47, P50, et P52 : valeurs exactes pour
 * le berger, le conseil et EJP Tech), signalements (T39) et envoi des emails par le Gmail gratuit
 * d'EJP Tech (T40), selon docs/conformite/. Mise à jour du 8 octobre 2026 : acceptation des
 * conditions par compte (T53), phrase proposée dans « Données traitées », à valider. Mise à jour
 * du 12 octobre 2026 : prénom déclaré sur un compte partagé (T56, décidé par la personne
 * responsable), dans « Données traitées », « Qui voit les données », « Durées de conservation »
 * (export final compris) et « Vos droits ». La version des conditions change (VERSION_CONDITIONS).
 * Mise à jour du 13 octobre 2026 : sur un compte partagé, chaque personne accepte elle-même les
 * conditions (T61), dans « Données traitées » ; phrase proposée, à valider. La version des
 * conditions change de nouveau. Mise à jour du 24 octobre 2026 : Cloudflare remplace Netlify pour
 * l'hébergement du site (T70), même rôle, mêmes données, même pays ; phrases proposées, à valider
 * par la coordination. La version des conditions ne change pas (T70). Mise à jour du 25 octobre
 * 2026 : plusieurs comptes ouverts sur un même navigateur (T73, « Changer d'espace »), dans
 * « Cookies et traceurs » ; phrase proposée. La version des conditions ne change pas : même
 * stockage, strictement nécessaire, sans nouvelle donnée ni nouvelle finalité (T73). Mise à jour
 * du 26 octobre 2026 : suivi des signalements dans l'outil (T77, lots 1 et 2), dans « Données
 * traitées » (article « Signalements ») ; texte validé par la coordination le 27 octobre 2026. La
 * version des conditions ne change pas : même adresse, même usage de service (conception T77,
 * ancienne Q9). Aucun mot sur un courriel : il n'est pas construit. Même jour : les incidents
 * d'envoi (T76, lot C), dans « Données traitées » et « Durées de conservation » (90 jours) ;
 * textes validés par la coordination le 27 octobre 2026. La version des conditions ne change pas
 * (Q7) : aucun prestataire, aucun destinataire, aucune donnée de nature nouvelle (un journal
 * technique, sans adresse IP).
 */
export function PageConfidentialite() {
  useTitrePage('Confidentialité')
  return (
    <ColonneConnexion>
      <TitreConnexion surtitre="Pilotage EJP" titre="Confidentialité" taille="moyenne">
        Ce que l'outil fait des données, et à qui s'adresser. Dernière mise à jour : 26 octobre
        2026.
      </TitreConnexion>
      <div className="flex flex-col gap-6 text-[15px] leading-normal text-encre-2">
        <PartieTexte titre="Responsable du traitement">
          <p>
            L'Église des Jeunes Prodiges (EJP), par son ministère EJP Tech, 21 rue des Vieilles
            Vignes, 77183 Croissy-Beaubourg. Contact pour toute question sur vos données : EJP Tech,
            eglisejp.tech@gmail.com.
          </p>
        </PartieTexte>
        <PartieTexte titre="À quoi sert l'outil">
          <p>
            Suivre les chiffres, les événements, les réunions et les points d'attention des
            ministères, pour le berger et le conseil. Rien d'autre : pas de publicité, pas de
            profilage, pas de revente.
          </p>
        </PartieTexte>
        <PartieTexte titre="Bases légales">
          <p>
            L'intérêt légitime de l'association à organiser ses ministères (article 6.1.f du RGPD).
            Un compte dans l'outil d'une église peut révéler une appartenance religieuse : ce
            traitement fait partie des activités légitimes de l'association, il concerne seulement
            ses membres et les données ne sont pas communiquées à l'extérieur (article 9.2.d du
            RGPD).
          </p>
        </PartieTexte>
        <PartieTexte titre="Données traitées">
          <ul role="list" className={liste}>
            <li>
              L'adresse email de chaque compte. Un ministère utilise une adresse partagée, jamais
              celle d'une personne.
            </li>
            <li>
              Le nom et la photo du profil Google, transmis par Google quand une personne se
              connecte avec Google. L'outil ne les affiche pas et ne les copie pas.
            </li>
            <li>Les adresses IP, dans les journaux techniques de Supabase et de Cloudflare.</li>
            <li>
              La date à laquelle chaque compte accepte les conditions, et leur version ; sur le
              compte partagé d'un ministère, chaque personne les accepte elle-même, sous le prénom
              qu'elle indique. EJP Tech seul lit ces dates.
            </li>
            <li>
              Le prénom que chaque personne indique quand elle utilise le compte partagé d'un
              ministère, avec l'heure de chaque connexion, les jours d'utilisation et les actions
              faites ensuite. EJP Tech seul le lit, pour suivre l'utilisation de l'outil et savoir
              qui a fait quoi en cas de problème. Il ne sert pas à évaluer les personnes.
            </li>
            <li>
              Les incidents d'envoi : quand un enregistrement échoue, l'heure, l'écran, le type
              d'erreur, le nom et la version du navigateur et la version du site, avec le ministère
              ou le profil du compte. Jamais ce qui a été saisi. EJP Tech seul les lit, pour
              corriger l'outil.
            </li>
            <li>
              Les signalements (« Signaler une difficulté ») : un court message qu'un ministère
              adresse à EJP Tech pour obtenir de l'aide avec l'outil, puis les réponses d'EJP Tech
              et du ministère, et la date de chaque étape. Ces réponses se lisent dans l'outil.
              Seuls ce ministère et EJP Tech lisent les signalements et leurs réponses.
            </li>
            <li>
              Ce qui est écrit dans les champs libres. N'y écrivez aucune information sur une
              personne : ce qui y est écrit par erreur est masqué.
            </li>
          </ul>
        </PartieTexte>
        <PartieTexte titre="Qui voit les données">
          <p>
            Les comptes de l'église, chacun selon son profil : un ministère voit sa fiche, la vue de
            l'église et les points qui le concernent ; le berger et le conseil voient l'ensemble,
            sauf les signalements ; EJP Tech voit l'ensemble en lecture, pour administrer l'outil,
            et relit les champs libres.
          </p>
          <p>
            Pendant la vie de l'outil, le prénom indiqué à la connexion n'est lu que par EJP Tech :
            ni l'administration de l'église, ni le berger, ni le conseil, ni les ministères. Les
            prénoms qui restent à l'arrêt de l'outil figurent dans l'export final remis à la
            coordination.
          </p>
        </PartieTexte>
        <PartieTexte titre="Chiffres sensibles">
          <p>
            Douze indicateurs sont sensibles : ceux de la santé, de l'accompagnement et de l'écoute,
            les nouveaux enfants et les enfants déjà venus de Prodiges Junior, et les manquements à
            la confidentialité constatés par Protocole. Pour chacun, le ministère concerné saisit un
            total par mois, le mois en cours compris : un nombre, jamais un nom.
          </p>
          <p>
            Le ministère peut répartir ce total entre quelques catégories larges, quand la
            coordination en a fixé la liste. Il peut aussi joindre à ce total une « Précision » de
            280 caractères au plus.
          </p>
          <p>
            La « Précision » ne doit contenir aucune information sur une personne. L'outil refuse un
            texte qui contient une adresse email, un lien, une suite de 5 chiffres ou plus, ou une
            civilité suivie d'un nom. EJP Tech relit chaque précision et peut la masquer.
          </p>
          <p>
            Les valeurs exactes de ces indicateurs, leur répartition et la « Précision » sont lues
            par le ministère qui les saisit, le berger, le conseil et EJP Tech. L'administration de
            l'église voit la date de chaque saisie, jamais sa valeur. Les autres ministères ne
            voient pas ces valeurs, et la vue de l'église ne les affiche jamais. Le journal de
            l'outil ne garde jamais ces valeurs.
          </p>
          <p>
            Les autres chiffres ne sont pas sensibles. Ils se saisissent chaque dimanche, chaque
            mois ou à ce jour, selon l'indicateur, et ne contiennent jamais de nom. Par exemple,
            Prodiges Junior saisit chaque dimanche le nombre d'enfants présents, en un seul total,
            sans âge ni nom.
          </p>
        </PartieTexte>
        <PartieTexte titre="Sous-traitants">
          <ul role="list" className={liste}>
            <li>Supabase : base de données et connexion, en région Paris (Union européenne).</li>
            <li>Cloudflare : hébergement du site.</li>
            <li>
              Google : connexion avec Google, et envoi des emails de l'outil depuis la boîte Gmail
              gratuite d'EJP Tech.
            </li>
          </ul>
          <p>
            Supabase et Cloudflare agissent sous contrat. Pour Google, il n'y a pas de contrat de
            sous-traitance : la boîte Gmail gratuite d'EJP Tech relève des conditions grand public
            de Google. Google et Cloudflare sont établis aux États-Unis. Les transferts vers Google
            et vers Cloudflare s'appuient sur le cadre de protection des données entre l'Union
            européenne et les États-Unis ; pour Cloudflare, les clauses contractuelles types de la
            Commission européenne prennent le relais si ce cadre ne s'applique plus.
          </p>
        </PartieTexte>
        <PartieTexte titre="Durées de conservation">
          <ul role="list" className={liste}>
            <li>
              <strong className="text-encre">Comptes, saisies, historique et journal</strong> :
              pendant toute la vie de l'outil, puis supprimés à son arrêt, après l'export final
              remis à la coordination.
            </li>
            <li>
              <strong className="text-encre">Compte désactivé</strong> : gardé jusqu'à l'arrêt de
              l'outil, car ses saisies restent dans l'historique.
            </li>
            <li>
              <strong className="text-encre">Nom et photo du profil Google</strong> : gardés avec le
              compte, jamais affichés, supprimés avec lui.
            </li>
            <li>
              <strong className="text-encre">Prénoms indiqués à la connexion</strong> : 12 mois,
              puis remplacés par « [prénom effacé] ». Ils restent dans les sauvegardes 4 semaines au
              plus. Ceux qui restent à l'arrêt de l'outil figurent dans l'export final remis à la
              coordination.
            </li>
            <li>
              <strong className="text-encre">Incidents d'envoi</strong> : 90 jours, puis effacés.
            </li>
            <li>
              <strong className="text-encre">Journaux techniques (adresses IP)</strong> : selon les
              durées de Supabase et de Cloudflare, au plus 1 an, la durée maximale recommandée par
              la CNIL pour ces journaux.
            </li>
            <li>
              <strong className="text-encre">Sauvegardes de la base</strong> : une copie chiffrée
              chaque semaine ; les 4 dernières sont gardées. Un texte masqué reste dans ces copies
              jusqu'à leur suppression, 4 semaines au plus.
            </li>
            <li>
              <strong className="text-encre">Copies des emails envoyés</strong> : dans la boîte
              Gmail gratuite d'EJP Tech qui les envoie, supprimées au plus tard à l'arrêt de
              l'outil.
            </li>
          </ul>
        </PartieTexte>
        <PartieTexte titre="Cookies et traceurs">
          <p>
            Aucun traceur ni cookie publicitaire, aucun appel à un autre service au chargement des
            pages. Votre connexion est gardée dans ce navigateur jusqu'à ce que vous vous
            déconnectiez : c'est nécessaire au fonctionnement, sans consentement à donner. Si vous
            ajoutez un compte (« Changer d'espace »), sa connexion y est gardée aussi, avec le nom
            et le type de chaque compte ouvert ; « Se déconnecter » les ferme toutes. Ce navigateur
            retient aussi que vous avez fermé le bandeau d'avancement.
          </p>
        </PartieTexte>
        <PartieTexte titre="Sécurité">
          <p>
            Double authentification obligatoire, accès limité par profil et vérifié par la base de
            données, base hébergée dans l'Union européenne, saisies jamais modifiées.
          </p>
        </PartieTexte>
        <PartieTexte titre="Vos droits">
          <p>
            Vous pouvez demander l'accès à vos données, leur correction, leur effacement, la
            limitation de leur traitement, ou vous y opposer. Écrivez à EJP Tech,
            eglisejp.tech@gmail.com. Une réponse vous est donnée dans un délai d'un mois.
          </p>
          <p>
            Une saisie ne se modifie pas : une correction s'ajoute comme une nouvelle saisie. Un
            texte qui contient une information personnelle est masqué.
          </p>
          <p>
            Vous pouvez demander à EJP Tech d'effacer votre prénom : il est remplacé par « [prénom
            effacé] » partout. À la connexion, une initiale ou un surnom suffit.
          </p>
          <p>
            Si la réponse ne vous convient pas, vous pouvez adresser une réclamation à la CNIL, sur
            cnil.fr.
          </p>
        </PartieTexte>
        <PartieTexte titre="Mise à jour">
          <p>Cette politique peut évoluer. Sa date de mise à jour figure en haut de la page.</p>
        </PartieTexte>
      </div>
      <Lien to={adressesConnexion.conditions}>Conditions d'utilisation</Lien>
      <Lien to="/">Revenir à l'accueil</Lien>
    </ColonneConnexion>
  )
}
