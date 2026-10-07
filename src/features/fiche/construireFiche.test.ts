import { describe, expect, it } from 'vitest'
import {
  lecturesExempleFiche,
  RAISON_HAUT_DEPASSE_BAS,
  SOCIAL,
} from '@/features/fiche/apercu/exemplesFiche'
import { construireFiche, construirePointsFiche } from '@/features/fiche/construireFiche'
import type { LecturesFiche } from '@/features/fiche/construireFiche'
import type { LigneIndicateurFiche, ProfilFiche } from '@/features/fiche/modeleFiche'
import { texteDePhrase } from '@/lib/metier/phrases'

const berger = (lectures: LecturesFiche = lecturesExempleFiche(false)) =>
  construireFiche(lectures, { profil: 'berger' })
const ministere = (lectures: LecturesFiche = lecturesExempleFiche(false)) =>
  construireFiche(lectures, { profil: 'ministere' })

function ligne(donnees: ReturnType<typeof berger>, libelle: string): LigneIndicateurFiche {
  const trouvee = donnees.sections
    .flatMap((section) => section.lignes)
    .find((l) => l.libelle === libelle)
  if (!trouvee) throw new Error(`Ligne absente : ${libelle}`)
  return trouvee
}

describe('construireFiche : chiffres communs', () => {
  it('service, actifs et en FIJ : valeur, écart, courbe et date ; FIJ calculé', () => {
    const [service, actifs, enFij] = berger().communs
    expect(service).toMatchObject({
      libelle: 'STARs au service',
      valeur: { etat: 'saisie', texte: '10' },
      ecart: { texte: '+1', sens: 'hausse' },
      detail: 'Dimanche 4 oct.',
    })
    expect(service?.courbe?.points).toHaveLength(10)
    // Le dimanche 16 août n'est pas saisi : un trou, jamais 0.
    expect(service?.courbe?.description).toContain('sans saisie')
    expect(actifs).toMatchObject({ valeur: { texte: '14' }, detail: 'Saisi le 24 sept.' })
    expect(enFij).toMatchObject({
      libelle: 'STARs présents en FIJ',
      valeur: { etat: 'saisie', texte: '79', unite: '%' },
      detail: '11 sur 14, calculé',
    })
  })

  it('le libellé de la demande remplace le nom du commun ; les deux lignes de référence de MDS avec leur complétude', () => {
    const lectures: LecturesFiche = {
      ...lecturesExempleFiche(false),
      libellesCommuns: [
        {
          ministere_id: SOCIAL,
          commun_code: 'service',
          libelle: 'Équipiers mobilisés',
          ordre: 1,
          reference_eglise: false,
        },
        {
          ministere_id: SOCIAL,
          commun_code: 'actifs',
          libelle: "STARs actifs de l'église",
          ordre: 4,
          reference_eglise: true,
        },
        {
          ministere_id: SOCIAL,
          commun_code: 'service',
          libelle: "STARs au service de l'église",
          ordre: 5,
          reference_eglise: true,
        },
      ],
      totauxDimanche: [
        {
          indicateur_id: 'c0000000-0000-4000-8000-000000000001',
          dimanche: '2026-10-04',
          total: 52,
          nb_saisis: 6,
          nb_attendus: 8,
        },
      ],
      totauxACeJour: [
        {
          indicateur_id: 'c0000000-0000-4000-8000-000000000002',
          code: 'actifs',
          total: 83,
          nb_saisis: 8,
          nb_actifs: 8,
          plus_ancienne: '2026-09-01',
          nb_plus_de_30_jours: 0,
        },
      ],
    }
    const communs = berger(lectures).communs
    expect(communs.map((c) => c.libelle)).toEqual([
      'Équipiers mobilisés',
      'STARs actifs',
      'STARs présents en FIJ',
      "STARs actifs de l'église",
      "STARs au service de l'église",
    ])
    expect(communs[3]).toMatchObject({
      valeur: { texte: '83' },
      detail: '8 sur 8',
      detailSignale: false,
    })
    expect(communs[4]).toMatchObject({
      valeur: { texte: '52' },
      detail: 'Dimanche 4 oct., 6 sur 8',
      detailSignale: true,
    })
  })

  it('jamais un 0 pour une absence : « vide » sans saisie, et « non saisi » quand le dimanche précédent manque', () => {
    const vide = berger(lecturesExempleFiche(true))
    expect(vide.communs.map((c) => c.valeur.etat)).toEqual(['vide', 'vide', 'vide'])
    expect(vide.communs[0]?.courbe).toBeNull()

    const lectures = lecturesExempleFiche(false)
    const sansPrecedent = berger({
      ...lectures,
      mesuresCommuns: lectures.mesuresCommuns.filter((m) => m.periode !== '2026-09-27'),
    })
    expect(sansPrecedent.communs[0]?.ecart).toMatchObject({
      texte: 'dimanche 27 sept. non saisi',
      sens: 'non_saisi',
    })
  })

  it('phrase de la fiche, surlignée pour un point du ministère en attente de décision', () => {
    const phrase = berger().phrase
    expect(texteDePhrase(phrase)).toBe(
      '10 STARs au service dimanche, 14 actifs dont 11 en FIJ. Un point attend une décision.',
    )
    expect(phrase.find((s) => s.surligne)?.texte).toBe('Un point attend une décision')
  })

  it('fraîcheur : « Mis à jour il y a 3 jours », « Aucune saisie » en premier usage', () => {
    expect(berger().fraicheur).toEqual({ libelle: 'Mis à jour il y a 3 jours', etat: 'bien' })
    expect(berger(lecturesExempleFiche(true)).fraicheur).toEqual({
      libelle: 'Aucune saisie',
      etat: 'alerte',
    })
  })
})

describe('construireFiche : indicateurs propres', () => {
  it('rangés par rythme puis par ordre alphabétique, les retirés à part', () => {
    const donnees = berger()
    expect(donnees.sections.map((s) => s.titre)).toEqual([
      'Chaque dimanche',
      'Chaque mois',
      'À ce jour',
    ])
    expect(donnees.sections[1]?.lignes.map((l) => l.libelle)).toEqual([
      'Actions sociales',
      'Bénéficiaires (passages)',
      'Collectes organisées',
      'Fonds levés',
      'Montant moyen par action',
      'Part des actions en partenariat',
      'Taux de passages orientés',
    ])
    expect(donnees.retires).toEqual([
      { id: expect.any(String), libelle: 'Colis distribués', detail: 'Retiré le 5 sept.' },
    ])
  })

  it('somme de l’année avec son départ et sa complétude ; « plus de 30 jours » signalé', () => {
    const donnees = berger()
    expect(ligne(donnees, 'Fonds levés').somme).toEqual({
      texte: 'Depuis août : 2 050 €',
      completude: '2 mois sur 2',
    })
    expect(ligne(donnees, 'Personnes rencontrées en maraude').somme?.completude).toBe(
      '8 dimanches sur 10',
    )
    expect(ligne(donnees, 'Partenariats actifs')).toMatchObject({
      detail: 'Saisi le 20 août, il y a plus de 30 jours',
      detailSignale: true,
    })
  })

  it('« il y a plus de 30 jours » vient de v_indicateur_suivi.plus_de_30_jours', () => {
    const lectures = lecturesExempleFiche(false)
    const recent = berger({
      ...lectures,
      suivi: lectures.suivi.map((s) =>
        s.libelle === 'Partenariats actifs' ? { ...s, plus_de_30_jours: false } : s,
      ),
    })
    expect(ligne(recent, 'Partenariats actifs')).toMatchObject({
      detail: 'Saisi le 20 août',
      detailSignale: false,
    })
  })

  it('ajout à valider : « À valider par EJP Tech » pour le berger, la phrase du ministère pour lui ; jamais saisi : « vide »', () => {
    expect(ligne(berger(), 'Collectes organisées')).toMatchObject({
      aValider: 'À valider par EJP Tech',
      valeur: { etat: 'vide' },
      moisEnCours: { texte: 'Octobre en cours : pas encore de saisie' },
    })
    expect(ligne(ministere(), 'Collectes organisées').aValider).toBe(
      'À valider par EJP Tech depuis 2 jours. Vous pouvez déjà le saisir.',
    )
  })

  it('calculs : résultat, « Non calculé » avec sa raison, et « Non calculé, à vérifier » pour une part (P49)', () => {
    const donnees = berger()
    expect(ligne(donnees, 'Taux de passages orientés')).toMatchObject({
      calcul: true,
      valeur: { etat: 'saisie', texte: '80', unite: '%' },
      detail: 'Septembre 2026 (16 sur 20)',
      somme: { texte: "Sur l'année : 78 %", completude: '2 mois sur 2' },
    })
    expect(ligne(donnees, 'Montant moyen par action')).toMatchObject({
      valeur: { etat: 'non_calcule', texte: 'Non calculé' },
      // La valeur dit déjà « Non calculé » : le détail ne le répète pas.
      detail: 'Aucune saisie de « Collectes organisées » pour septembre.',
    })
    expect(ligne(donnees, 'Part des actions en partenariat')).toMatchObject({
      valeur: { etat: 'non_calcule', texte: 'Non calculé, à vérifier' },
      detail: 'Septembre 2026 : 5 pour un total de 3. Vérifiez les deux chiffres saisis.',
    })
    expect(RAISON_HAUT_DEPASSE_BAS).toBe('haut_depasse_bas')
  })

  it('un calcul étendu absent de v_calcul n’a pas de ligne', () => {
    const lectures = lecturesExempleFiche(false)
    const donnees = berger({ ...lectures, calculs: [] })
    const libelles = donnees.sections.flatMap((s) => s.lignes).map((l) => l.libelle)
    expect(libelles).not.toContain('Taux de passages orientés')
  })

  it('premier usage : aucun indicateur propre, aucune section ; aucune action pour le berger', () => {
    const donnees = berger(lecturesExempleFiche(true))
    expect(donnees.sansIndicateurPropre).toBe(true)
    expect(donnees.sections).toEqual([])
    expect(donnees.actionSaisirMois).toBe(false)
  })

  it('« Saisir les chiffres du mois » au seul ministère, quand un indicateur du mois n’a jamais été saisi', () => {
    expect(ministere().actionSaisirMois).toBe(true)
    expect(ministere().aDesIndicateursDuMois).toBe(true)
    expect(berger().actionSaisirMois).toBe(false)
  })

  it('un indicateur du mois dont seul le mois en cours est saisi n’attend pas sa « première saisie »', () => {
    const lectures = lecturesExempleFiche(false)
    const donnees = ministere({
      ...lectures,
      suivi: lectures.suivi.map((s) =>
        s.libelle === 'Collectes organisées' ? { ...s, mois_en_cours_valeur: 6 } : s,
      ),
    })
    expect(ligne(donnees, 'Collectes organisées')).toMatchObject({
      jamaisSaisi: false,
      moisEnCours: { texte: 'Octobre en cours : 6' },
    })
    // Ni les deux messages à la fois, ni le bouton de « première saisie » : le bouton de l'en-tête
    // prend le relais.
    expect(donnees.actionSaisirMois).toBe(false)
    expect(donnees.aDesIndicateursDuMois).toBe(true)
  })
})

describe('construireFiche : indicateur sensible (P45 à P47, P52)', () => {
  const sensible = (profil: ProfilFiche) =>
    ligne(construireFiche(lecturesExempleFiche(false), { profil }), 'Bénéficiaires (passages)')
  const LECTEURS: ProfilFiche[] = ['ministere', 'berger', 'conseil', 'admin_plateforme']

  it.each(LECTEURS)(
    '%s : valeur, somme de l’année, mois en cours et courbe exacts, jamais « moins de 3 »',
    (profil) => {
      const l = sensible(profil)
      expect(l.valeur).toEqual({ etat: 'saisie', texte: '2', unite: null })
      expect(l.somme?.texte).toBe('Depuis juin : 9')
      expect(l.moisEnCours).toEqual({ texte: 'Octobre en cours : 7' })
      expect(l.courbe?.description).toContain('6, 1, 0, 2')
      expect(l.courbe?.description).not.toContain('moins de 3')
    },
  )

  it.each(LECTEURS)(
    '%s : répartition exacte avec « Non réparti » ; un mois sans ligne : « Pas de répartition »',
    (profil) => {
      const repartitions = sensible(profil).sensible?.repartitions
      expect(repartitions?.map((r) => r.titre)).toEqual(['Septembre 2026', 'Octobre en cours'])
      expect(repartitions?.[0]).toMatchObject({
        etat: 'aucune',
        texte: 'Pas de répartition pour septembre.',
      })
      expect(repartitions?.[1]).toEqual({
        mois: '2026-10-01',
        titre: 'Octobre en cours',
        etat: 'cases',
        cases: [
          { libelle: 'Malaise', texte: '4' },
          { libelle: 'Blessure', texte: '2' },
          { libelle: 'Autre', texte: '1' },
          { libelle: 'Non réparti', texte: '0' },
        ],
      })
    },
  )

  it('sans catégorie : aucune répartition ; précisions des deux mois, la masquée signalée', () => {
    const lectures = lecturesExempleFiche(false)
    const sansCategorie = ligne(
      berger({ ...lectures, categories: [], repartitions: [] }),
      'Bénéficiaires (passages)',
    )
    expect(sansCategorie.sensible?.repartitions).toBeNull()
    // Une liste de moins de 3 catégories en cours n'a pas de répartition (B8) ; une répartition
    // déjà écrite reste lue.
    const listeCourte = ligne(
      berger({ ...lectures, categories: lectures.categories.slice(0, 2), repartitions: [] }),
      'Bénéficiaires (passages)',
    )
    expect(listeCourte.sensible?.repartitions).toBeNull()
    const ancienne = ligne(
      berger({ ...lectures, categories: lectures.categories.slice(0, 2) }),
      'Bénéficiaires (passages)',
    )
    expect(ancienne.sensible?.repartitions).not.toBeNull()
    expect(sansCategorie.sensible?.repartitions).toBeNull()
    expect(sensible('berger').sensible?.precisions).toEqual([
      {
        mois: '2026-09-01',
        titre: 'Précision de septembre',
        texte: { texte: '[texte masqué par EJP Tech]', masque: true },
      },
      {
        mois: '2026-10-01',
        titre: "Précision d'octobre",
        texte: { texte: expect.stringContaining('collecte de rentrée'), masque: false },
      },
    ])
  })

  it('des catégories mais aucune saisie : ni répartition ni ligne vide sous l’indicateur (T36)', () => {
    const lectures = lecturesExempleFiche(false)
    const jamaisSaisi = berger({
      ...lectures,
      suivi: lectures.suivi.map((s) =>
        s.libelle === 'Bénéficiaires (passages)'
          ? {
              ...s,
              derniere_periode: null,
              derniere_valeur: null,
              derniere_moins_de_3: false,
              mois_en_cours_valeur: null,
              mois_en_cours_moins_de_3: false,
              somme_depuis: null,
              somme_annee: null,
              somme_moins_de_3: false,
            }
          : s,
      ),
      repartitions: [],
      precisions: [],
    })
    expect(lectures.categories.length).toBeGreaterThanOrEqual(3)
    expect(ligne(jamaisSaisi, 'Bénéficiaires (passages)').sensible).toEqual({
      precisions: [],
      repartitions: null,
    })
  })

  it('aides : chacune une fois, les mêmes pour le berger et le ministère', () => {
    const aides = (donnees: ReturnType<typeof berger>) =>
      donnees.sections.flatMap((s) => s.lignes).map((l) => l.aides)
    const duBerger = aides(berger())
    expect(duBerger.filter((a) => a.calcule)).toHaveLength(1)
    expect(duBerger.filter((a) => a.somme)).toHaveLength(1)
    expect(aides(ministere())).toEqual(duBerger)
    expect(berger().aideCourbe).toBe(true)
  })
})

describe('construirePointsFiche', () => {
  it('ouverts par priorité puis échéance, puis les traités des 7 derniers jours', () => {
    const points = construirePointsFiche(lecturesExempleFiche(false), {
      profil: 'berger',
    })
    expect(points.map((p) => p.titre.texte)).toEqual([
      'Local de stockage des dons',
      'Accueil des familles le dimanche',
      'Bénévoles pour la collecte de rentrée',
    ])
    expect(points[0]).toMatchObject({
      ministere: 'Social',
      echeance: { texte: 'avant le 15 oct.', depassee: false },
      mentions: ['Coordination'],
      mentionnePar: null,
    })
    expect(points[1]?.echeance).toEqual({ texte: 'avant le 2 oct.', depassee: true })
    expect(points[1]?.description).toEqual({ texte: '[texte masqué par EJP Tech]', masque: true })
    expect(points[2]?.traite?.texte).toBe('Traité le 3 oct.')
  })

  it('le ministère mentionné lit « Mentionné par Intégration. » ; un traité de plus de 7 jours disparaît', () => {
    const lectures = lecturesExempleFiche(false)
    const points = construirePointsFiche(
      {
        ...lectures,
        points: {
          ...lectures.points,
          points: lectures.points.points.map((p) =>
            p.traite_le === null ? p : { ...p, traite_le: '2026-09-29T10:00:00+02:00' },
          ),
        },
      },
      { profil: 'ministere' },
    )
    expect(points).toHaveLength(2)
    expect(points[1]?.mentionnePar).toBe('Intégration')
  })
})
