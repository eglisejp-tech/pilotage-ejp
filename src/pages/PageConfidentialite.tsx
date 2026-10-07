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
 * d'EJP Tech (T40), selon docs/conformite/.
 */
export function PageConfidentialite() {
  useTitrePage('Confidentialité')
  return (
    <ColonneConnexion>
      <TitreConnexion surtitre="Pilotage EJP" titre="Confidentialité" taille="moyenne">
        Ce que l'outil fait des données, et à qui s'adresser. Dernière mise à jour : 7 octobre 2026.
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
            <li>Les adresses IP, dans les journaux techniques de Supabase et de Netlify.</li>
            <li>
              Les signalements (« Signaler une difficulté ») : un court message qu'un ministère
              adresse à EJP Tech pour obtenir de l'aide avec l'outil. Seuls ce ministère et EJP Tech
              les lisent.
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
        </PartieTexte>
        <PartieTexte titre="Chiffres sensibles">
          <p>
            Onze indicateurs sont sensibles : ceux de la santé, de l'accompagnement et de l'écoute,
            et, pour Prodiges Junior, les nouveaux enfants et les enfants déjà venus. Pour chacun,
            le ministère concerné saisit un total par mois, le mois en cours compris : un nombre,
            jamais un nom.
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
            <li>Netlify : hébergement du site.</li>
            <li>
              Google : connexion avec Google, et envoi des emails de l'outil depuis la boîte Gmail
              gratuite d'EJP Tech.
            </li>
          </ul>
          <p>
            Supabase et Netlify agissent sous contrat. Pour Google, il n'y a pas de contrat de
            sous-traitance : la boîte Gmail gratuite d'EJP Tech relève des conditions grand public
            de Google. Google et Netlify sont établis aux États-Unis. Les transferts vers Google
            s'appuient sur le cadre de protection des données entre l'Union européenne et les
            États-Unis ; ceux vers Netlify, sur les clauses contractuelles types de la Commission
            européenne.
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
              <strong className="text-encre">Journaux techniques (adresses IP)</strong> : selon les
              durées de Supabase et de Netlify, au plus 1 an, la durée maximale recommandée par la
              CNIL pour ces journaux.
            </li>
            <li>
              <strong className="text-encre">Sauvegardes de la base</strong> : 7 jours. Un texte
              masqué reste dans les sauvegardes jusqu'à leur expiration.
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
            déconnectiez : c'est nécessaire au fonctionnement, sans consentement à donner.
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
