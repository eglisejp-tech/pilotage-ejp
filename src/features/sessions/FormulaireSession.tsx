import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import { referenceEchec } from '@/data/echecEnvoi'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { ChampDate } from '@/features/evenements/ChampDate'
import { ChampTexteCourt } from '@/features/evenements/ChampTexteCourt'
import { DejaEnregistre } from '@/features/saisie/DejaEnregistre'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'
import { useFermetureSaisie } from '@/features/saisie/fermetureSaisie'
import { ChoixMinisteres } from '@/features/sessions/ChoixMinisteres'
import type { MinistereAChoisir } from '@/features/sessions/ChoixMinisteres'
import { ChoixType } from '@/features/sessions/ChoixType'
import { lireRefusDeclaration } from '@/features/sessions/refus'
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
  /** EJP Tech, qui ajoute les ministères : la phrase sans ministère actif le lui dit (T60). */
  gestionMinisteres?: boolean
}

type Erreurs = Partial<Record<'type' | 'date' | 'nom' | 'ministeres', string>>

function sansAction() {}

/** Les deux listes cochent les mêmes ministères, dans n'importe quel ordre. */
function memesMinisteres(a: readonly string[], b: readonly string[]): boolean {
  const ensemble = new Set(a)
  return ensemble.size === new Set(b).size && b.every((id) => ensemble.has(id))
}

/**
 * Formulaire de l'écran 14 (maquette 14) : type, date, nom de la session (pour « Autre session »
 * seulement, avec le rappel sur les données personnelles), ministères attendus cochés par défaut
 * avec leur indication, puis « Ajouter la session ». En mode « modifier », seuls les ministères
 * attendus changent ; les enregistrer sans changement ne part pas et le dit (m206). Une session
 * déjà déclarée à cette date se dit sous le champ date, qui prend le focus (m210) ; les autres
 * messages de la base se disent sous le bouton ; les valeurs restent. Après un ajout réussi, le
 * formulaire revient à son état de départ.
 */
export function FormulaireSession({
  mode,
  id,
  aujourdhui,
  ministeres,
  coches,
  envoyer,
  onAnnuler,
  gestionMinisteres = false,
}: Props) {
  const depart = (): ValeursDeclaration => ({
    type: 'batir',
    date: prochainSamedi(aujourdhui),
    nom: '',
    ministeres: [...(coches ?? ministeres.map((ministere) => ministere.id))],
  })
  const [valeurs, setValeurs] = useState<ValeursDeclaration>(depart)
  // Dans le panneau : « Annuler » demande confirmation si un champ a changé (m265).
  const annuler = useFermetureSaisie(onAnnuler ?? sansAction)
  const [erreurs, setErreurs] = useState<Erreurs>({})
  const [refus, setRefus] = useState<string | null>(null)
  /** Référence d'un échec technique, sous le refus (T76). */
  const [reference, setReference] = useState<string | null>(null)
  /** Refus de la date par la base (session déjà déclarée ce jour-là), sous le champ date. */
  const [refusDate, setRefusDate] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  // Appuis sur « Enregistrer » sans changement (0 : aucun depuis le dernier changement), m206.
  const [inchange, setInchange] = useState(0)
  const premierMinistere = useRef<HTMLInputElement>(null)
  const declarer = mode === 'declarer'

  const modifier = (changement: Partial<ValeursDeclaration>) => {
    setValeurs((avant) => ({ ...avant, ...changement }))
    setRefus(null)
    setRefusDate(null)
    setInchange(0)
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
    if (!declarer && coches !== undefined && memesMinisteres(valeurs.ministeres, coches)) {
      setRefus(null)
      setInchange((essais) => essais + 1)
      return
    }
    setEnCours(true)
    setRefus(null)
    setRefusDate(null)
    try {
      await envoyer(valeurs)
      if (declarer) setValeurs(depart())
    } catch (erreur) {
      const lu = lireRefusDeclaration(erreur, TEXTES_SESSIONS.erreurConnexion, declarer)
      if (declarer && lu.champ === 'date') {
        setRefusDate(lu.message)
        document.getElementById(`${id}-date`)?.focus()
      } else {
        setRefus(lu.message)
        setReference(referenceEchec(erreur))
      }
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
            erreur={erreurs.date ?? refusDate ?? undefined}
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
        note={TEXTES_SESSIONS.indicationMinisteres}
        erreur={erreurs.ministeres}
        gestionMinisteres={gestionMinisteres}
      />
      <BoutonEnregistrer
        libelle={declarer ? TEXTES_SESSIONS.boutonDeclarer : TEXTES_SESSIONS.boutonEnregistrer}
        enCours={enCours}
        libelleEnCours={TEXTES_SESSIONS.enCours}
      />
      <DejaEnregistre
        message={inchange > 0 ? TEXTES_SESSIONS.dejaEnregistres : null}
        essai={inchange}
      />
      {onAnnuler ? (
        <Bouton pleineLargeur onClick={annuler}>
          {TEXTES_SESSIONS.annuler}
        </Bouton>
      ) : null}
      {refus !== null ? (
        <ErreurFormulaire message={refus} reference={reference} ecranEjpTech />
      ) : null}
    </form>
  )
}
