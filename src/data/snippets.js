/**
 * Bausteinbibliothek.
 *
 * Quelle: Textbausteine_Kardio.docx – alle Bloecke, die dort kein
 * vollstaendiger Brief sind, sondern wiederverwendbare Absaetze
 * (Untersuchungsbefunde, technische Befunde, Prozeduren, Procedere-Zeilen).
 *
 * Bausteine werden mit denselben Platzhaltern gerendert wie Vorlagen und
 * lassen sich an der Cursorposition in jeden Abschnitt einfuegen. Wo im
 * Original nur ein Leerfeld steht ("Koronarangiographie vom XX.08.2018:"),
 * bleibt es ein Leerfeld – es wird kein Befund erfunden.
 */

import { KU_AUSFUEHRLICH, KU_KURZ, VEGETATIVE_ANAMNESE } from './sectionBlocks.js';

/**
 * @typedef {object} Snippet
 * @property {string} id
 * @property {string} title
 * @property {string} category
 * @property {string} text        Vorlagentext mit denselben Platzhaltern
 * @property {string} [note]      Hinweis fuer die Bedienoberflaeche
 */

/** @type {Snippet[]} */
export const SNIPPETS = [
  /* --- Anamnese und Untersuchung --------------------------------- */
  {
    id: 'veg_anamnese',
    title: 'Vegetative Anamnese',
    category: 'Anamnese & Untersuchung',
    text: VEGETATIVE_ANAMNESE,
  },
  {
    id: 'ku_ausfuehrlich',
    title: 'Körperlicher Untersuchungsbefund (ausführlich)',
    category: 'Anamnese & Untersuchung',
    text: KU_AUSFUEHRLICH,
    note: 'Nutzt Alter, Größe und Gewicht aus den Stammdaten.',
  },
  {
    id: 'ku_kurz',
    title: 'Körperlicher Untersuchungsbefund (Kurzform)',
    category: 'Anamnese & Untersuchung',
    text: KU_KURZ,
    note: 'Herzaktion („rhythmisch"/„arrhythmisch") über das Feld in der Maske.',
  },

  /* --- Technische Befunde ---------------------------------------- */
  {
    id: 'lz_rr',
    title: 'Langzeit-RR',
    category: 'Technische Befunde',
    text: `Langzeit-RR vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:
Gesamtdurchschnitt: xx/xx mmHg
Max. syst. xx mmHg, Max. diast. xx mmHg.
Tagesintervall: durchschn. xx/xx mmHg, Messungen über 135mmHg syst: x,x%, über 85mmHg diastolisch: x,x%
Nachtintervall: durchschn. xx/xx mmHg, Messungen über 125mmHg: x,x%, über 80mmHg diastolisch: x,x%
Gestörte Tag-/Nachtabsenkung (Non-dipper), CAVE: Krankenhausmessung`,
  },
  {
    id: 'lz_ekg',
    title: 'Langzeit-EKG (Variante 1)',
    category: 'Technische Befunde',
    text: `Langzeit-EKG vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:
Zugrundeliegendes Vorhofflimmern/Zugrundeliegender Sinusrhythmus, HF im Mittel xx/min, HF-Spektrum von min xx/min bis max xx/min, keine SVTs/VTs, keine Pausen > 2,5s, keine relevanten Bradykardien, wenige VES/SVES`,
  },
  {
    id: 'lz_ekg_2',
    title: 'Langzeit-EKG (Variante 2)',
    category: 'Technische Befunde',
    text: `durchgehender Sinusrhythmus, Herzfrequenz durchschnittlich 78/min (Min 59/min - Max 111/min)
Supraventrikuläre Extrasystolie, supraventrikuläre Runs, einzelne VES, keine relevanten Brady/Tachykardien, keine höhergradigen Herzrhythmusstörungen`,
  },
  {
    id: 'ekg_aufnahme',
    title: 'EKG bei Aufnahme',
    category: 'Technische Befunde',
    text: `EKG bei Aufnahme:
SR/VHF, HF /min, XT, R/S-Umschlag in V / V, keine signifikanten ERBS`,
  },
  {
    id: 'belastungs_ekg',
    title: 'Belastungs-EKG',
    category: 'Technische Befunde',
    text: `Belastungs-EKG vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:
Abbruch wegen peripherer Erschöpfung, Belastung bis XX Watt, max. HF xx/min, max. RR XX mmHg, adäquate HF-/RR-Veränderung, keine AP-Beschwerden, keine signifikanten ST-Streckenveränderungen, isolierte VES/SVES. Normaler Belastungstest/positiver Belastungstest - Ischämie möglich`,
  },
  {
    id: 'lufu',
    title: 'Lungenfunktionsdiagnostik',
    category: 'Technische Befunde',
    text: `Lungenfunktionsdiagnostik vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:
FEV1  l (%), FEV1/VC max %, MEF 50  l (%), R eff   kPa*s/l,
TLC  l (%), RV/TLC %.
Bodyplethysmographisch  Obstruktion und  Blähung.
Spirometrisch  Obstruktion.
Keine Restriktion.`,
  },
  {
    id: 'bga',
    title: 'Blutgasanalyse',
    category: 'Technische Befunde',
    text: `Blutgasanalyse (unter  l Sauerstoff):
pH , pCO2  mmHg, pO2  mmHg, BE  mmol/l, HCO3  mmol/l
Sauerstoffsättigung  %.
Beurteilung: Normoxämie?, Normokapnie?. Azidose? Metabolisch? Resp.?`,
    note: 'Im Original als Tabelle; hier als Fließtext mit denselben Parametern.',
  },
  {
    id: 'ukg',
    title: 'UKG – Normalbefund',
    category: 'Technische Befunde',
    text: `UKG
Linker Ventrikel mit normalen Diametern und normaler systolischer Funktion. Keine regionalen WBST. Normale Wanddicke. Normale diastolische Funktion.
Aortenklappe unauffällig. AoW nicht erweitert. Keine relevante Mitralinsuffizienz.
Linker Vorhof nicht vergrößert.
Rechts Herz nicht vergrößert. Keine pulmonale Hypertonie.
Keine relevante Trikuspidalinsuffizienz.
Lebervenen nicht gestaut. Kein Perikarderguß. Kein Pleuraerguß.`,
  },
  {
    id: 'abdomensono_kurz',
    title: 'Abdomensonographie (Kurzform)',
    category: 'Technische Befunde',
    text: `Abdomensonographie
Leber: normal groß und regelrecht konfiguriert, homogene echonormale Parenchymstruktur, keine fokalen Läsionen, unauffällige Gefäßarchitektur
Gallenblase: GBwand unauffällig, kein Steinnachweiß
Gallenwege: intra- und extrahep. nicht erweitert,
Pankreas: Pankreas kaum beurteilbar, soweit erkennbar unauffällig
Milz: normal groß, homogen,
Nieren: bds. normal groß, kein Aufstau, Parenchym normal
abd. Gef. Retroper.: soweit einsehbar Bauchaorta, normal weit, Aortensklerose?? / VCI und Lebervenen normalkalibrig
Blase/ Genitale: gut gefüllt, Prostata vergrößert??????
Sonstiges: Pleuraerguss .?????`,
  },
  {
    id: 'abdomensono_lang',
    title: 'Abdomensonographie (ausführlich)',
    category: 'Technische Befunde',
    text: `Leber: Gut beurteilbar, normal groß und regelrecht konfiguriert, homogene echonormale Parenchymstruktur, keine fokalen Läsionen, unauffällige Gefäßarchitektur.
Gallenblase: postbrandial nicht darstellbar
Gallenwege: Gallengänge eingeschränkt beurteilbar, soweit erkennbar unauffällig.
Pankreas: Pankreas eingeschränkt beurteilbar bei deutlicher Darmgasüberlagerung, soweit erkennbar unauffällig.
Milz: Milz eingeschränkt beurteilbar, normal groß.
Nieren: Rechte Niere, normal groß normale Parenchymdicke, orthotop gelegen, mit einer Zyste am Oberpol. Parenchymstruktur homogen, mit normaler Echogenität.
Linke Niere gut beurteilbar und orthotop gelegen, normale Organgröße, Parenchymsaum altersentsprechend, glatte Organkontur, kein Harnstau.
abd. Gef./ Retroper.: Die Aorta und Vena Cava ist eingeschränkt beurteilbar, soweit erkennbar unauffällig.
Magen/ Darm: Kein Nachweis von freier Flüssigkeit in der Bauchhöhle.
Blase/ Genitale: Harnblase gefüllt, unauffällig, Z.n. Prostatektomie.
Lymphknoten: Abdomineller Lymphknotenstatus nicht beurteilbar.
Sonstiges: Beidseits kein Pleuraerguss.`,
  },
  {
    id: 'befund_ueberschriften',
    title: 'Befundüberschriften (leer)',
    category: 'Technische Befunde',
    text: `Transthorakale Echokardiographie vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:

Transösophageale Echokardographie vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:

Koronarangiographie vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:

Röntgen-Thorax vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:

Röntgen-Nasennebenhöhlen vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:

Abdomensonographie vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:

Duplexsonographie der Carotiden vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:

Schellong-Test vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:`,
    note: 'Leere Überschriften wie im Original – zum manuellen Befüllen.',
  },

  /* --- Prozeduren ------------------------------------------------- */
  {
    id: 'aszitespunktion',
    title: 'Aszitespunktion',
    category: 'Prozeduren',
    text: `Aszitespunktion vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:
Nach ausführlicher Patientenaufklärung, unter sterilen Bedingungen und sonographischer Kontrolle, Punktion und komplikationslose Drainage von insgesamt  l bernsteinfarbenen Sekret. Substitution von  ml Humanalbumin 20%. Klinische Chemie, zytologische und mikrobiologische Untersuchung veranlasst.`,
  },
  {
    id: 'pleurapunktion',
    title: 'Sonographie Pleura mit Punktion',
    category: 'Prozeduren',
    text: `Sonographie Pleura mit Punktion vom {{befund_datum | date | fallback:"XX.XX.XXXX"}}:
Nach ausführlicher Patientenaufklärung, komplikationslose sonographiegesteuerte Pleurapunktion rechts unter sterilen Bedingungen. Ca.  ml trübe, gelbliche Flüssigkeit gewonnen. Röntgen-Thorax veranlasst.
Klinische Chemie, zytologische und mikrobiologische Untersuchung veranlasst.`,
  },
  {
    id: 'zvk_anlage',
    title: 'ZVK-Anlage',
    category: 'Prozeduren',
    text: `ZVK-Anlage
Nach ausführlicher Patientenaufklärung und subkutaner Applikation von Lokalanästhetikum sonographiegesteuerte Anlage eines dreilumigen zentralen Venenkatheters unter sterilen Kautelen in die rechte/linke V. jugularis interna.
Lagekontrolle mittels konventioneller Röntgen-Thorax-Aufnahme empfohlen.`,
  },
  {
    id: 'thoraxdrainage',
    title: 'Thoraxdrainageanlage',
    category: 'Prozeduren',
    text: `Thoraxdrainageanlage
Nach ausführlicher Patientenaufklärung und sonographischem Aufsuchen des Drainageortes, unter sterilen Kautelen Minithorakotomie, stumpfes Vorpräparieren und komplikationsloses Einbringen einer Thorax-Drainage (doppellumig 20 Cha) in der rechten/linken vorderen Axillarlinie. ca.   ml klaren Erguss im Schuss gewonnen, dann abgeklemmt.
Klinische Chemie, zytologische und mikrobiologische Untersuchung veranlasst.
Röntgen-Thorax-Kontrolle empfohlen. Festes analgetisches Regime mit z.B. 4x 30 gtt. Metamizol und 0,2 mg Buprenorphin bei Bedarf empfohlen.`,
  },

  /* --- Procedere-Zeilen ------------------------------------------- */
  {
    id: 'proc_nierenretention',
    title: 'Nierenretentions- und Elektrolytkontrollen',
    category: 'Procedere',
    text: '- Regelmäßige Nierenretentionsparameter- und Elektrolytkontrollen unter diuretischer Therapie',
  },
  {
    id: 'proc_ldl70',
    title: 'Risikofaktoren, Ziel-LDL < 70 mg/dl',
    category: 'Procedere',
    text: '- Optimale Kontrolle und Einstellung der kardiovaskulären Risikofaktoren, u.a. mit einem Ziel LDL < 70 mg/dl',
  },
  {
    id: 'proc_kontrollkoro',
    title: 'Wiedervorstellung zur Kontrollkoronarangiographie',
    category: 'Procedere',
    text: '- Bei erneuten/persistierenden Beschwerden Wiedervorstellung zur Kontrollkoronarangiographie (RoMed Klinikum Rosenheim, Medizinische Klinik I, Kardiologie, Tel. Chefarztsekreteriat 08031/365 3101).',
  },
  {
    id: 'proc_hk_termin',
    title: 'Termin Herzkatheteruntersuchung',
    category: 'Procedere',
    text: '- Termin für Herzkatheteruntersuchung am {{befund_datum | date | fallback:"XX.XX.XXXX"}} um 7.30 Uhr auf Station XX (Bitte mit Überweisungsschein und aktuellem Labor)',
  },
  {
    id: 'proc_heparin_bridging',
    title: 'Überlappende Heparin-Therapie',
    category: 'Procedere',
    text: '- Überlappende Heparin-Therapie für 2 Tage bei erreichtem Ziel-INR von 2,0 bis 3,0 unter Marcumar-Therapie',
  },
  {
    id: 'proc_amiodaron',
    title: 'Amiodaron-Monitoring',
    category: 'Procedere',
    text: '- Unter Amiodarontherapie bitte regelmäßige EKG-Kontrollen (QTc <500 ms), Laborkontrollen (Schilddrüsenhormone, Leberwerte), sowie jährliche augenärztliche Kontrollen und jährliche Lungenfunktionsprüfungen',
  },
  {
    id: 'proc_prednisolon',
    title: 'Prednisolon-Ausschleichschema',
    category: 'Procedere',
    text: '- Prednisolon 25mg z. B. Decortin H 1-0-0 bis einschließlich {{befund_datum | date | fallback:"XX.XX.XXXX"}}, dann wöchentliche Dosisreduktion zunächst auf 12,5mg, dann 7,5mg, dann in 2,5mg-Schritten ausschleichen und absetzen.',
  },
];

export const SNIPPET_CATEGORIES = [...new Set(SNIPPETS.map((snippet) => snippet.category))];

/**
 * Feld, das die datumsabhaengigen Bausteine speist. Es wird beim Einfuegen
 * eines Bausteins gebraucht und deshalb allen Vorlagen zugeschlagen.
 */
export const SNIPPET_DATE_FIELD = {
  key: 'befund_datum',
  label: 'Befunddatum für Bausteine',
  type: 'date',
  help: 'Wird von Bausteinen verwendet, die „vom XX.XX.XXXX" enthalten.',
};
