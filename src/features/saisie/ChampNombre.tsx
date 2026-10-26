import { LibelleAvecAide } from '@/components/aide/LibelleAvecAide'
import type { CodeAide } from '@/components/aide/textesAide'
import {
  ajusterNombre,
  formatAReprendre,
  MESSAGE_NOMBRE_ENTIER,
  peutAjuster,
} from '@/features/saisie/chiffres'
import { MOINS } from '@/lib/metier/texte'
import { cn } from '@/lib/utils'

interface Props {
  id: string
  libelle: string
  /** Texte du champ : vide tant que la personne n'a rien écrit (jamais un 0 par défaut). */
  valeur: string
  onChange: (valeur: string) => void
  /** Plafond de l'unité : les boutons « plus » et « moins » ne le dépassent pas. */
  max: number
  /** « grand » : boutons moins et plus de 64 px (maquette 08) ; « compact » : champ seul de 58 px. */
  variante?: 'grand' | 'compact'
  /** Aide à côté du libellé (T38) : jamais à la place de la définition affichée. */
  aide?: CodeAide
  /** Définition visible sous le libellé, lue avec le champ. */
  definition?: string
  /** Mention visible sous la définition, avant le champ (« En attente de validation... »). */
  mention?: string
  /** Note visible sous le champ (« Saisi le 24 sept. », « 79 % des actifs »). */
  note?: string
  /** « Déjà saisi : 10, le 27 sept. à 12 h 41... » : sous le champ, lue avec lui. */
  dejaSaisi?: string
  /** Message de validation sous le champ, lu avec le champ. */
  erreur?: string
  /** Champ en erreur sans message à lui (le message est ailleurs : groupe, ligne d'état). */
  invalide?: boolean
  /** Identifiants d'autres éléments qui décrivent le champ (message d'un groupe, par exemple). */
  decritAussi?: string
  /** Unité écrite après le nombre (« € », « jours »). */
  suffixe?: string | null
}

/**
 * Champ numérique des saisies (maquette 08) : un vrai champ entre « moins » et « plus », de
 * grandes cibles de 64 px. Le texte est gardé tel quel (champ vide possible), jamais réécrit : un
 * texte qui n'est pas un nombre entier (« 12,5 », « 12a ») reste visible, et la consigne
 * `MESSAGE_NOMBRE_ENTIER` s'affiche sous le champ dès la frappe, annoncée une fois aux lecteurs
 * d'écran (m100). « Ajouter 1 » au plafond, « Retirer 1 » à 0 et les deux sur un texte à corriger
 * sont inactifs (`aria-disabled` : le focus reste sur le bouton, qui se dit indisponible). Le
 * libellé reste un `<label>` ; l'aide, si elle existe, est son voisin. Les boutons « moins » et
 * « plus » portent le libellé du champ dans leur nom accessible (« Ajouter 1 : STARs actifs », T66
 * t063) : un formulaire en a plusieurs paires, qui ne doivent pas se confondre.
 * Le champ a deux parties : sa tête (libellé, aide, définition, mention), puis sa case suivie de
 * son pied (note, « Déjà saisi », messages). Dans une `GrilleChamps`, chacune prend la rangée de
 * ses voisines (sous-grille) : titres, cases et notes de champs côte à côte restent alignés.
 * Ailleurs, elles s'empilent, 6 px entre elles.
 */
export function ChampNombre({
  id,
  libelle,
  valeur,
  onChange,
  max,
  variante = 'grand',
  aide,
  definition,
  mention,
  note,
  dejaSaisi,
  erreur,
  invalide,
  decritAussi,
  suffixe,
}: Props) {
  const idDefinition = `${id}-definition`
  const idMention = `${id}-mention`
  const idNote = `${id}-note`
  const idDeja = `${id}-deja`
  const idErreur = `${id}-erreur`
  // Un texte qui n'est pas un nombre entier : la consigne passe avant tout autre message, car
  // l'erreur reçue (une borne, un refus) portait sur un nombre que le champ ne contient plus.
  const aReprendre = formatAReprendre(valeur)
  const message = aReprendre ? MESSAGE_NOMBRE_ENTIER : erreur
  const decritPar = [
    definition ? idDefinition : '',
    mention ? idMention : '',
    note ? idNote : '',
    dejaSaisi ? idDeja : '',
    decritAussi ?? '',
    message ? idErreur : '',
  ]
    .filter(Boolean)
    .join(' ')
  const grand = variante === 'grand'
  const enErreur = Boolean(message) || invalide === true
  const peutRetirer = peutAjuster(valeur, -1, max)
  const peutAjouter = peutAjuster(valeur, 1, max)
  // Le nombre domine la page (maquette 08 : 112 px, graisse 900). Au-delà de 3 chiffres il se
  // réduit, pour que 4 chiffres tiennent entre les deux boutons à 390 px, puis « 1 000 ». Un texte
  // à corriger (« 12,5 », « 1250,5 ») se réduit davantage : il tient entre les boutons à 360 px.
  const longueur = valeur.trim().length
  const tailleGrand = aReprendre
    ? longueur > 4
      ? 'text-[40px]'
      : 'text-[56px]'
    : longueur > 4
      ? 'text-[64px]'
      : longueur > 3
        ? 'text-[84px]'
        : 'text-[112px]'

  const champ = (
    // Entre les boutons, une marge : la bordure d'erreur ne les touche jamais.
    <div className={cn('relative min-w-0', grand && 'px-1.5')}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={valeur}
        onChange={(evenement) => onChange(evenement.target.value)}
        aria-invalid={enErreur ? true : undefined}
        aria-describedby={decritPar || undefined}
        className={cn(
          'w-full min-w-0 bg-papier text-center font-chiffres font-black text-encre tabular-nums aria-invalid:border-2 aria-invalid:border-alerte',
          grand
            ? // Proposition 1 (T69, écart 1) : un trait de 2 px sous la place du chiffre, comme
              // une ligne d'écriture, pour que le champ se voie même vide (--encre-3 : 5,40:1 sur
              // le blanc). Il fonce quand on touche le champ. Jamais de 0 par défaut.
              cn('h-[100px] border-b-2 border-encre-3 leading-[.9] focus:border-encre', tailleGrand)
            : 'h-14.5 border border-encre text-[32px]',
        )}
      />
      {suffixe ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-encre-3"
        >
          {suffixe}
        </span>
      ) : null}
    </div>
  )

  return (
    // Deux parties, enfants directs : la tête, puis la case et son pied. Elles ne sont jamais
    // vides : l'écart de 6 px de la sous-grille remplace exactement celui de la grille entre
    // elles. Hors d'une grille, `grid-rows-subgrid` n'a pas de parent et `row-span-2` est sans
    // effet : elles s'empilent.
    <div className="row-span-2 grid grid-cols-1 grid-rows-subgrid gap-y-1.5">
      <div className="flex flex-col gap-1.5">
        {aide ? (
          <LibelleAvecAide
            htmlFor={id}
            libelle={libelle}
            code={aide}
            classeLibelle={grand ? undefined : 'text-detail'}
          />
        ) : (
          <label
            htmlFor={id}
            className={cn('font-semibold', grand ? 'text-interface' : 'text-detail')}
          >
            {libelle}
          </label>
        )}
        {definition ? (
          <p id={idDefinition} className="text-detail leading-normal text-encre-3">
            {definition}
          </p>
        ) : null}
        {mention ? (
          <p id={idMention} className="text-note text-encre-3">
            {mention}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        {grand ? (
          <div className="grid grid-cols-[var(--cible-saisie)_minmax(0,1fr)_var(--cible-saisie)] items-center">
            <button
              type="button"
              aria-label={`Retirer 1 : ${libelle}`}
              aria-disabled={peutRetirer ? undefined : true}
              onClick={() => {
                if (peutRetirer) onChange(ajusterNombre(valeur, -1, max))
              }}
              className="retour-appui h-cible-saisie border border-encre bg-papier font-chiffres text-[34px] font-extrabold text-encre aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
            >
              <span aria-hidden="true">{MOINS}</span>
            </button>
            {champ}
            <button
              type="button"
              aria-label={`Ajouter 1 : ${libelle}`}
              aria-disabled={peutAjouter ? undefined : true}
              onClick={() => {
                if (peutAjouter) onChange(ajusterNombre(valeur, 1, max))
              }}
              className="retour-appui retour-clair h-cible-saisie bg-encre font-chiffres text-[34px] font-extrabold text-papier aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
            >
              <span aria-hidden="true">+</span>
            </button>
          </div>
        ) : (
          champ
        )}
        {note ? (
          <p id={idNote} className="text-center text-note text-encre-3">
            {note}
          </p>
        ) : null}
        {dejaSaisi ? (
          <p id={idDeja} className="text-center text-note text-encre-3">
            {dejaSaisi}
          </p>
        ) : null}
        {/* La consigne de format apparaît pendant la frappe : son paragraphe, sous le champ et
            relié à lui, est dans une région annoncée, toujours présente (vide, elle ne prend
            aucune place). Une erreur reçue à l'envoi n'y est pas : le focus va au champ, qui la
            lit avec lui. */}
        <div aria-live="polite" className="-mt-1.5">
          {aReprendre ? (
            <p id={idErreur} className={cn('mt-1.5', classeMessage)}>
              {MESSAGE_NOMBRE_ENTIER}
            </p>
          ) : null}
        </div>
        {!aReprendre && message ? (
          <p id={idErreur} className={classeMessage}>
            {message}
          </p>
        ) : null}
      </div>
    </div>
  )
}

const classeMessage = 'text-interface leading-normal text-alerte'
