import { useState } from 'react'
import type { FormEvent } from 'react'
import { Bouton } from '@/components/ui/Bouton'
import { lireEchecCorrection } from '@/data/evenementsCorrections'
import type { EchecLu } from '@/data/echecEnvoi'
import { BoutonEnregistrer } from '@/features/evenements/BoutonEnregistrer'
import { ChampTexteCourt } from '@/features/evenements/ChampTexteCourt'
import { schemaNomEvenement } from '@/features/evenements/schemasCorrections'
import { TEXTES_EVENEMENT, TEXTES_REUNION } from '@/features/evenements/textes'
import { TEXTES_CORRECTIONS } from '@/features/evenements/textesCorrections'
import { FenetreAction } from '@/features/points-actions/FenetreAction'
import { DejaEnregistre } from '@/features/saisie/DejaEnregistre'
import { ErreurFormulaire } from '@/features/saisie/ErreurFormulaire'

interface Props {
  /** Nom en vigueur, rappelé sous le titre et prérempli ; masqué, le champ s'ouvre vide. */
  nom: { texte: string; masque: boolean }
  /** Écrit le nouveau nom (`corriger_titre_evenement`). */
  envoyer: (titre: string) => Promise<void>
  /** Après un envoi réussi : le panneau dit « Nom corrigé. ». */
  onReussite: () => void
  /** « Annuler », « Retour », Échap et le fond ferment sans rien écrire. */
  onFermer: () => void
}

/**
 * Fenêtre « Corriger le nom » (T78, conception calendrier-evenements.md, 8.2) : le champ « Nom de
 * l'événement » prérempli, le rappel sur les données personnelles dessous (premier et seul champ
 * libre), puis « Enregistrer le nom » et « Annuler ». Le même nom ne part pas : la phrase le dit
 * sous le bouton. Un nom vide ou trop long se dit sous le champ, avant l'envoi ; un refus de la
 * base (événement retiré entre-temps) ou une connexion perdue, sous le bouton, le nom gardé.
 * L'ancien nom reste dans l'historique de l'événement.
 */
export function FenetreNomEvenement({ nom, envoyer, onReussite, onFermer }: Props) {
  const [valeur, setValeur] = useState(nom.masque ? '' : nom.texte)
  const [erreurChamp, setErreurChamp] = useState<string | null>(null)
  const [refus, setRefus] = useState<EchecLu | null>(null)
  const [enCours, setEnCours] = useState(false)
  // Appuis sur « Enregistrer » sans changement (0 : aucun depuis la dernière frappe).
  const [inchange, setInchange] = useState(0)

  const soumettre = async (evenement: FormEvent<HTMLFormElement>) => {
    evenement.preventDefault()
    if (enCours) return
    setRefus(null)
    const lu = schemaNomEvenement.safeParse({ titre: valeur })
    if (!lu.success) {
      setErreurChamp(lu.error.issues[0]?.message ?? TEXTES_EVENEMENT.erreurNomVide)
      return
    }
    setErreurChamp(null)
    if (!nom.masque && lu.data.titre === nom.texte.trim()) {
      setInchange((essais) => essais + 1)
      return
    }
    setInchange(0)
    setEnCours(true)
    try {
      await envoyer(lu.data.titre)
      onReussite()
    } catch (erreur) {
      const echec = lireEchecCorrection(erreur)
      if (echec.champ === 'nom') setErreurChamp(echec.message)
      else setRefus(echec)
    } finally {
      setEnCours(false)
    }
  }

  return (
    <FenetreAction titre={TEXTES_CORRECTIONS.corrigerNom} point={nom} onFermer={onFermer}>
      <form noValidate className="flex flex-col gap-5" onSubmit={(e) => void soumettre(e)}>
        <ChampTexteCourt
          id="evenement-nom-corrige"
          libelle={TEXTES_EVENEMENT.libelleNom}
          longueur={valeur.length}
          avecRappel
          note={nom.masque ? TEXTES_REUNION.texteMasque : undefined}
          erreur={erreurChamp ?? undefined}
          value={valeur}
          autoComplete="off"
          onChange={(evenement) => {
            setValeur(evenement.target.value)
            setErreurChamp(null)
            setRefus(null)
            setInchange(0)
          }}
        />
        <BoutonEnregistrer
          libelle={TEXTES_CORRECTIONS.boutonNom}
          enCours={enCours}
          libelleEnCours={TEXTES_CORRECTIONS.enCours}
        />
        <DejaEnregistre
          message={inchange > 0 ? TEXTES_CORRECTIONS.nomDejaEnregistre : null}
          essai={inchange}
        />
        {refus ? <ErreurFormulaire message={refus.message} reference={refus.reference} /> : null}
        <Bouton pleineLargeur onClick={onFermer}>
          {TEXTES_CORRECTIONS.annuler}
        </Bouton>
      </form>
    </FenetreAction>
  )
}
