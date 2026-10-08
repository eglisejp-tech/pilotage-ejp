import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { ChampDate } from '@/features/evenements/ChampDate'
import { ChampTexteCourt } from '@/features/evenements/ChampTexteCourt'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { ChoixMinisteres } from '@/features/sessions/ChoixMinisteres'
import type { MinistereAChoisir } from '@/features/sessions/ChoixMinisteres'
import { ChoixType } from '@/features/sessions/ChoixType'
import { lireRefusSession } from '@/features/sessions/refus'
import { schemaDeclaration, schemaMinisteresAttendus } from '@/features/sessions/schemas'
import type { ValeursDeclaration } from '@/features/sessions/schemas'
import { prochainSamedi, TEXTES_SESSIONS } from '@/features/sessions/textes'
import type { DateIso } from '@/lib/metier/dates'
import { longueurEnCaracteres } from '@/lib/metier/texte'

interface Props {
  /** « declarer » : type, date, nom et ministères ; « modifier » : les ministères seulement. */
  mode: 'declarer' | 'modifier'
  /** Préfixe des identifiants : deux formulaires peuvent coexister dans la page. */
  id: string
  /** Jour de Paris (`v_semaine.aujourdhui`) : la date proposée est le prochain samedi. */
  aujourdhui: DateIso
  /** Ministères actifs, dans l'ordre alphabétique. */
  ministeres: readonly MinistereAChoisir[]
  /** Ministères cochés au départ : tous à la déclaration, les attendus à la modification. */
  coches?: readonly string[]
  /** Envoie la déclaration ou la modification ; rejette avec le refus de la base. */
  envoyer: (valeurs: ValeursDeclaration) => Promise<void>
  /** Présent dans un panneau : bouton « Annuler » sous le bouton principal. */
  onAnnuler?: () => void
}

type Erreurs = Partial<Record<'type' | 'date' | 'nom' | 'ministeres', string>>

/**
 * Formulaire de l'écran 14 (maquette 14) : type, date, nom du rassemblement (pour « Autre
 * rassemblement » seulement, avec le rappel sur les données personnelles), ministères attendus
 * cochés par défaut, puis « Déclarer la session ». En mode « modifier », seuls les ministères
 * attendus changent. Les messages de la base (session déjà déclarée...) se disent sous le bouton ;
 * les valeurs restent. Après une déclaration réussie, le formulaire revient à son état de départ.
 */
export function FormulaireSession({
  mode,
  id,
  aujourdhui,
  ministeres,
  coches,
  envoyer,
  onAnnuler,
}: Props) {
  const depart = (): ValeursDeclaration => ({
    type: 'batir',
    date: prochainSamedi(aujourdhui),
    nom: '',
    ministeres: [...(coches ?? ministeres.map((ministere) => ministere.id))],
  })
  const [valeurs, setValeurs] = useState<ValeursDeclaration>(depart)
  const [erreurs, setErreurs] = useState<Erreurs>({})
  const [refus, setRefus] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const premierMinistere = useRef<HTMLInputElement>(null)
  const declarer = mode === 'declarer'

  const modifier = (changement: Partial<ValeursDeclaration>) => {
    setValeurs((avant) => ({ ...avant, ...changement }))
    setRefus(null)
  }

  const valider = (): Erreurs => {
    const trouvees: Erreurs = {}
    if (declarer) {
      const lue = schemaDeclaration.safeParse(valeurs)
      if (!lue.success) {
        for (const probleme of lue.error.issues) {
          const champ = probleme.path[0]
          if (
            (champ === 'type' || champ === 'date' || champ === 'nom' || champ === 'ministeres') &&
            trouvees[champ] === undefined
          ) {
            trouvees[champ] = probleme.message
          }
        }
      }
    } else {
      const lue = schemaMinisteresAttendus.safeParse(valeurs.ministeres)
      if (!lue.success) trouvees.ministeres = lue.error.issues[0]?.message
    }
    return trouvees
  }

  const soumettre = async (evenement: FormEvent) => {
    evenement.preventDefault()
    if (enCours) return
    const trouvees = valider()
    setErreurs(trouvees)
    if (Object.keys(trouvees).length > 0) {
      const premiere = document.getElementById(
        trouvees.date ? `${id}-date` : trouvees.nom ? `${id}-nom` : '',
      )
      if (premiere) premiere.focus()
      else premierMinistere.current?.focus()
      return
    }
    setEnCours(true)
    setRefus(null)
    try {
      await envoyer(valeurs)
      if (declarer) setValeurs(depart())
    } catch (erreur) {
      setRefus(lireRefusSession(erreur, TEXTES_SESSIONS.erreurConnexion))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(evenement) => void soumettre(evenement)}
    >
      {declarer ? (
        <>
          <ChoixType
            id={`${id}-type`}
            valeur={valeurs.type}
            onChange={(type) => modifier({ type })}
          />
          <ChampDate
            id={`${id}-date`}
            libelle={TEXTES_SESSIONS.champDate}
            value={valeurs.date}
            onChange={(evenement) => modifier({ date: evenement.target.value })}
            dateChoisie={valeurs.date}
            erreur={erreurs.date}
          />
          {valeurs.type === 'autre' ? (
            <ChampTexteCourt
              id={`${id}-nom`}
              libelle={TEXTES_SESSIONS.champNom}
              value={valeurs.nom}
              onChange={(evenement) => modifier({ nom: evenement.target.value })}
              longueur={longueurEnCaracteres(valeurs.nom)}
              autoComplete="off"
              avecRappel
              erreur={erreurs.nom}
            />
          ) : null}
        </>
      ) : null}
      <ChoixMinisteres
        id={`${id}-ministeres`}
        ministeres={ministeres}
        valeur={valeurs.ministeres}
        onChange={(ids) => modifier({ ministeres: ids })}
        refPremier={premierMinistere}
        erreur={erreurs.ministeres}
      />
      <BoutonEnregistrer
        libelle={declarer ? TEXTES_SESSIONS.boutonDeclarer : TEXTES_SESSIONS.boutonEnregistrer}
        enCours={enCours}
        libelleEnCours={TEXTES_SESSIONS.enCours}
      />
      {onAnnuler ? (
        <button
          type="button"
          onClick={onAnnuler}
          className="min-h-cible w-full border border-encre bg-papier px-4 text-[15px] font-semibold text-encre hover:bg-fond"
        >
          {TEXTES_SESSIONS.annuler}
        </button>
      ) : null}
      {refus !== null ? <ErreurFormulaire message={refus} /> : null}
    </form>
  )
}
