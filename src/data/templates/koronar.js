/**
 * Vorlagen der Gruppe "Koronar".
 *
 * Quellen: Musterarztbriefe_Med._I.docx (kompakter Hausstandard) und
 * Textbausteine_Kardio.docx (Langform). Der Wortlaut ist unveraendert
 * uebernommen; variabel sind ausschliesslich die im Original als
 * "X", "XX" oder Schraegstrich-Alternative markierten Stellen.
 */

import { KORONARGEFAESSE, P2Y12 } from '../fields.js';
import { PROCEDERE_ZUSATZ, SHARED_GROUPS_KURZFORM, SHARED_GROUPS_LANGFORM, langformRahmen } from '../sectionBlocks.js';

const QUELLE_M = 'Musterarztbriefe_Med._I.docx';
const QUELLE_T = 'Textbausteine_Kardio.docx';

/**
 * Risikofaktoren als Fliesstext – nur in den kompakten M-Vorlagen.
 * Die Zeile verschwindet vollstaendig, wenn nichts ausgewaehlt ist.
 */
const RISIKOFAKTOREN_INLINE = `{{#if kv_risikofaktoren}}
Kardiovaskuläre Risikofaktoren: {{#each kv_risikofaktoren}}{{this}}{{#if this == "Nikotinabusus" and nikotin_py}} ({{nikotin_py}} py){{/if}}{{#if this == "Diabetes Mellitus" and diabetes_typ}} Typ {{diabetes_typ}}{{/if}}{{#unless @last}}, {{/unless}}{{/each}}.
{{/if}}`;

/** "Implantation X DE-Stents" mit korrektem Numerus. */
const STENT_ANZAHL = '{{#if stent_anzahl == 1}}eines DE-Stents{{#else}}{{stent_anzahl}} DE-Stents{{/if}}';

/** Diagnosenzeilen zu kardialen Vorbehandlungen (Bypass-OP, PCI …). */
const VORBEHANDLUNGEN = '{{#each vorbehandlungen}}- {{this.art}}'
  + '{{#if this.details}} ({{this.details}}){{/if}}'
  + '{{#if this.zeitpunkt}} {{this.zeitpunkt | monthyear}}{{/if}}'
  + '{{#if this.ort}} ({{this.ort}}){{/if}}\n{{/each}}';

const FELD_VORBEHANDLUNGEN = {
  key: 'vorbehandlungen',
  label: 'Kardiale Vorbehandlungen',
  type: 'list',
  addLabel: 'Vorbehandlung hinzufügen',
  itemLabel: '{{this.art}} {{this.details}}',
  help: 'Beleg: „Koronare Bypass-OP (LIMA – LAD, usw.) XX/XX (Klinikum XX)/ PCI/DES-Implantation usw."',
  itemFields: [
    {
      key: 'art',
      label: 'Art',
      type: 'select',
      required: true,
      allowCustom: true,
      options: ['Koronare Bypass-OP', 'PCI', 'DES-Implantation'],
    },
    { key: 'details', label: 'Details', type: 'text', placeholder: 'z. B. LIMA – LAD' },
    { key: 'zeitpunkt', label: 'Zeitpunkt', type: 'month' },
    { key: 'ort', label: 'Klinik', type: 'text', placeholder: 'z. B. Klinikum XX' },
  ],
};

const FELD_ZIELGEFAESS = {
  key: 'zielgefaess',
  label: 'Zielgefäß',
  type: 'select',
  required: true,
  allowCustom: true,
  options: KORONARGEFAESSE,
};

const FELD_SEGMENT = {
  key: 'zielgefaess_segment',
  label: 'Segment',
  type: 'select',
  required: true,
  options: [
    { value: 'prox.', label: 'proximal (prox.)' },
    { value: 'med.', label: 'medial (med.)' },
    { value: 'dist.', label: 'distal (dist.)' },
  ],
};

const FELD_GEFAESSERKRANKUNG = {
  key: 'gefaesserkrankung',
  label: 'Gefäßerkrankung',
  type: 'select',
  required: true,
  options: [
    { value: '1', label: '1-Gefäßerkrankung' },
    { value: '2', label: '2-Gefäßerkrankung' },
    { value: '3', label: '3-Gefäßerkrankung' },
  ],
};

const FELD_P2Y12 = { key: 'p2y12', label: 'P2Y12-Inhibitor', type: 'select', required: true, options: P2Y12 };

const FELD_PUNKTION = [
  {
    key: 'punktion_gefaess',
    label: 'Punktierte Arterie',
    type: 'select',
    required: true,
    default: 'A. rad.',
    options: [
      { value: 'A. rad.', label: 'A. radialis (A. rad.)' },
      { value: 'A. fem.', label: 'A. femoralis (A. fem.)' },
    ],
  },
  { key: 'punktion_seite', label: 'Seite', type: 'select', required: true, default: 'rechts', options: ['rechts', 'links'] },
];

const PUNKTIONSSATZ = 'Die punktierte {{punktion_gefaess}} {{punktion_seite}} präsentiert sich am Entlasstag klinisch reizlos, die periphere Durchblutung, Sensibilität und Motorik waren allzeit intakt.';

const ENTLASSSATZ_M = 'Wir entlassen {{anrede_name_akk}} am {{entlass_datum | dateShort}} in {{entlass_az}} Allgemeinzustand in {{patient_poss}} häusliches Umfeld und ihre weitere fachärztliche Betreuung.';

const ENTLASSSATZ_T = 'Am {{entlass_datum | date}} konnten wir {{patient_akk}} in stabilem und beschwerdefreiem Zustand wieder in Ihre geschätzte ambulante ärztliche Weiterbehandlung entlassen und stehen für Rückfragen gerne zur Verfügung.';

/* ================================================================== */
/* M4 – Akutes Koronarsyndrom (Hausstandard, kompakt)                  */
/* ================================================================== */

const acs = {
  id: 'acs',
  title: 'Akutes Koronarsyndrom',
  group: 'Koronar',
  source: `${QUELLE_M} – „Akutes Koronarsyndrom"`,
  description: 'Kompakter Hausstandard: STEMI/NSTEMI/instabile AP mit DE-Stent-PCI. DAPT-Dauer 12 Monate, Ziel-LDL <55 mg/dl.',
  sharedGroups: [...SHARED_GROUPS_KURZFORM, 'risikofaktoren'],
  fieldGroups: [
    {
      id: 'aufnahme',
      title: 'Aufnahmegrund und Diagnose',
      fields: [
        {
          key: 'acs_typ',
          label: 'ACS-Typ',
          type: 'select',
          required: true,
          default: 'NSTEMI',
          options: ['STEMI', 'NSTEMI', 'Instabile AP'],
        },
        FELD_GEFAESSERKRANKUNG,
        {
          key: 'laesionsart',
          label: 'Läsionsart',
          type: 'select',
          required: true,
          default: 'hochgradiger Stenose',
          options: [
            { value: 'Verschluss', label: 'Verschluss' },
            { value: 'hochgradiger Stenose', label: 'hochgradige Stenose' },
          ],
        },
        FELD_ZIELGEFAESS,
        FELD_SEGMENT,
      ],
    },
    {
      id: 'intervention',
      title: 'Intervention',
      fields: [
        { key: 'stent_anzahl', label: 'Anzahl DE-Stents', type: 'number', required: true, default: '1', min: 1, max: 10 },
        { key: 'pci_datum', label: 'Datum der PCI', type: 'date', required: true },
        {
          key: 'ck_max',
          label: 'CK max.',
          type: 'number',
          unit: 'U/l',
          visibleIf: 'acs_typ == "STEMI"',
          help: 'Beleg: „CK max.: XXXX U/l (nur bei STEMI)".',
        },
        ...FELD_PUNKTION,
        FELD_VORBEHANDLUNGEN,
      ],
    },
    {
      id: 'verlauf',
      title: 'Verlauf und Befunde',
      fields: [
        { key: 'telemetrie_tage', label: 'Telemetrische Überwachung', type: 'number', unit: 'Tage' },
        {
          key: 'telemetrie_rhythmusstoerungen',
          label: 'Rhythmusstörungen',
          type: 'text',
          placeholder: 'z. B. keine',
          help: 'Beleg: „waren X Rhythmusstörungen auffällig".',
        },
        { key: 'echo_befund', label: 'Echokardiographie', type: 'multiline', rows: 3, help: 'Beleg: „Echokardiographisch zeigt sich…."' },
      ],
    },
    {
      id: 'therapie',
      title: 'Therapie und Nachsorge',
      fields: [
        FELD_P2Y12,
        {
          key: 'ahb_beantragt',
          label: 'Kardiologische AHB beantragt',
          type: 'checkbox',
          help: 'Beleg: „Kardiologische AHB beantragt, Terminbescheid erfolgt postalisch".',
        },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `{{acs_typ}} bei koronarer {{gefaesserkrankung}}-Gefäßerkrankung mit {{laesionsart}} des {{zielgefaess}}
- Aktuell: DE-Stent-PCI der {{zielgefaess_segment}} {{zielgefaess}} am {{pci_datum | date}}
{{#if acs_typ == "STEMI" and ck_max}}- CK max.: {{ck_max}} U/l
{{/if}}${VORBEHANDLUNGEN}`,
    },
    {
      id: 'epikrise',
      title: 'Epikrise',
      order: 2,
      template: `{{anrede_name}} wurde mit akutem Koronarsyndrom auf unsere Chest-Pain-Unit aufgenommen. Koronarangiographisch imponiert eine koronare {{gefaesserkrankung}}-Gefäßerkrankung mit {{laesionsart}} des {{zielgefaess}}, welche in gleicher Sitzung komplikationslos mit PCI und Implantation ${STENT_ANZAHL} rekanalisiert wird.
Eine duale Thrombozytenaggregationshemmung mit ASS und {{p2y12}} ist für 12 Monate indiziert, anschließend eine lebensbegleitende Monotherapie.
{{#if telemetrie_tage or telemetrie_rhythmusstoerungen}}
Während der telemetrischen EKG-Überwachung{{#if telemetrie_tage}} über {{telemetrie_tage}} Tage{{/if}} waren {{telemetrie_rhythmusstoerungen}} Rhythmusstörungen auffällig.
{{/if}}
{{#if echo_befund}}
Echokardiographisch zeigt sich {{echo_befund}}
{{/if}}
${RISIKOFAKTOREN_INLINE}
${PUNKTIONSSATZ}
${ENTLASSSATZ_M}`,
    },
    {
      id: 'procedere',
      title: 'Procedere',
      order: 3,
      template: `- Duale Thrombozytenaggregationshemmung mit ASS und {{p2y12}} für 12 Monate unter PPI-Schutz, anschließend lebensbegleitend Monotherapie
- Optimale Einstellung der kardiovaskulären Risikofaktoren, Statintherapie mit Ziel-LDL <55mg/dl
{{#if ahb_beantragt}}- Kardiologische AHB beantragt, Terminbescheid erfolgt postalisch
{{/if}}${PROCEDERE_ZUSATZ}`,
    },
  ],
};

/* ================================================================== */
/* M5 – Perkutane Koronarintervention (chronisches Koronarsyndrom)     */
/* ================================================================== */

const pciElektiv = {
  id: 'pci_elektiv',
  title: 'Perkutane Koronarintervention',
  group: 'Koronar',
  source: `${QUELLE_M} – „Perkutane Koronarintervention"`,
  description: 'Kompakter Hausstandard bei Progress einer bekannten KHK. DAPT-Dauer frei wählbar, Ziel-LDL <55 mg/dl.',
  sharedGroups: [...SHARED_GROUPS_KURZFORM, 'risikofaktoren'],
  fieldGroups: [
    {
      id: 'diagnose',
      title: 'Diagnose und Intervention',
      fields: [
        FELD_GEFAESSERKRANKUNG,
        {
          key: 'laesionsart',
          label: 'Läsionsart',
          type: 'select',
          required: true,
          default: 'hochgradiger Stenose',
          options: [
            { value: 'Verschluss', label: 'Verschluss' },
            { value: 'hochgradiger Stenose', label: 'hochgradige Stenose' },
          ],
        },
        FELD_ZIELGEFAESS,
        FELD_SEGMENT,
        { key: 'stent_anzahl', label: 'Anzahl DE-Stents', type: 'number', required: true, default: '1', min: 1, max: 10 },
        { key: 'pci_datum', label: 'Datum der PCI', type: 'date', required: true },
        ...FELD_PUNKTION,
        FELD_VORBEHANDLUNGEN,
      ],
    },
    {
      id: 'therapie',
      title: 'Therapie',
      fields: [
        FELD_P2Y12,
        {
          key: 'dapt_monate',
          label: 'DAPT-Dauer',
          type: 'number',
          unit: 'Monate',
          required: true,
          default: '6',
          help: 'Beleg: „ist für X Monate indiziert" – anders als beim ACS variabel.',
        },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `Chronisches Koronarsyndrom bei {{gefaesserkrankung}}-Gefäßerkrankung
- Aktuell: DE-Stent-PCI der {{zielgefaess_segment}} {{zielgefaess}} am {{pci_datum | date}}
${VORBEHANDLUNGEN}`,
    },
    {
      id: 'epikrise',
      title: 'Epikrise',
      order: 2,
      template: `{{anrede_name}} wurde mit Verdacht auf Progress einer bekannten KHK stationär aufgenommen. Koronarangiographisch imponiert eine koronare {{gefaesserkrankung}}-Gefäßerkrankung mit {{laesionsart}} des {{zielgefaess}}, welche in gleicher Sitzung komplikationslos mit PCI und Implantation ${STENT_ANZAHL} rekanalisiert wird.
Eine duale Thrombozytenaggregationshemmung mit ASS und {{p2y12}} ist für {{dapt_monate}} Monate indiziert, anschließend eine lebensbegleitende Monotherapie.
${RISIKOFAKTOREN_INLINE}
${PUNKTIONSSATZ}
${ENTLASSSATZ_M}`,
    },
    {
      id: 'procedere',
      title: 'Procedere',
      order: 3,
      template: `- Duale Thrombozytenaggregationshemmung mit ASS und {{p2y12}} für {{dapt_monate}} Monate unter PPI-Schutz, anschließend lebensbegleitend Monotherapie
- Optimale Einstellung der kardiovaskulären Risikofaktoren, Statintherapie mit Ziel-LDL <55mg/dl
${PROCEDERE_ZUSATZ}`,
    },
  ],
};

/* ================================================================== */
/* T1 – Koronarangiographie (elektiv, Langform)                        */
/* ================================================================== */

const koronarangiographieElektiv = {
  id: 'koronarangiographie_elektiv',
  title: 'Koronarangiographie (elektiv)',
  group: 'Koronar',
  source: `${QUELLE_T} – „Koronarangiographie"`,
  description: 'Ausführliche Gliederung mit neun Abschnitten. Achtung: In dieser Quelle lautet der Zielwert LDL < 70 mg/dl und der Wirkstoff wird „Aspirin" genannt.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'diagnose',
      title: 'Diagnose',
      fields: [
        FELD_GEFAESSERKRANKUNG,
        { key: 'acvb_situation', label: 'Mit ACVB-Situation', type: 'checkbox' },
        { key: 'acvb_jahr', label: 'ACVB Jahr', type: 'text', visibleIf: 'acvb_situation' },
        { key: 'acvb_ort', label: 'ACVB Ort', type: 'text', visibleIf: 'acvb_situation' },
        FELD_ZIELGEFAESS,
        {
          key: 'intervention',
          label: 'Intervention',
          type: 'select',
          required: true,
          default: 'DES-Implantation',
          options: ['PTCA', 'DES-Implantation', 'PTCA/DES-Implantation'],
        },
      ],
    },
    {
      id: 'verlauf_felder',
      title: 'Verlauf',
      fields: [
        {
          key: 'aufnahmegrund_freitext',
          label: 'Aufnahmegrund',
          type: 'text',
          help: 'Beleg: „zur elektiv geplanten Koronarangiographie bei … / bekannter koronarer … Erkrankung".',
        },
        { key: 'koro_befund', label: 'Koronarangiographischer Befund', type: 'multiline', rows: 3, required: true, help: 'Beleg: „Koronarangiographisch zeigte sich , welche in gleicher Sitzung mittels … versorgt wurde."' },
        FELD_P2Y12,
        {
          key: 'dapt_monate',
          label: 'DAPT-Dauer',
          type: 'select',
          required: true,
          default: '6',
          options: [
            { value: '6', label: '6 Monate' },
            { value: '12', label: '12 Monate' },
          ],
        },
        { key: 'echo_verlaufskontrollen', label: 'Echokardiographische Verlaufskontrollen empfehlen', type: 'checkbox', default: true },
        {
          key: 'punktion_seite',
          label: 'Punktionsseite',
          type: 'select',
          required: true,
          default: 'rechte',
          options: [{ value: 'linke', label: 'linke' }, { value: 'rechte', label: 'rechte' }],
        },
        {
          key: 'punktion_region',
          label: 'Punktionsregion',
          type: 'select',
          required: true,
          default: 'Radialis',
          options: [{ value: 'Leisten', label: 'Leistenregion' }, { value: 'Radialis', label: 'Radialisregion' }],
        },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: `- Koronare {{gefaesserkrankung}}-Gefäßerkrankung{{#if acvb_situation}} (mit ACVB Situation{{#if acvb_jahr}}, {{acvb_jahr}}{{/if}}{{#if acvb_ort}}, {{acvb_ort}}{{/if}}){{/if}} mit hochgradiger {{zielgefaess}}-Stenose
  - {{intervention}}`,
    verlaufTitel: 'Therapie & Verlauf',
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte am {{aufnahme_datum | date}} zur elektiv geplanten Koronarangiographie{{#if aufnahmegrund_freitext}} bei {{aufnahmegrund_freitext}}{{/if}}.
Koronarangiographisch zeigte sich {{koro_befund}}, welche in gleicher Sitzung mittels {{intervention}} versorgt wurde.
Der postinterventionelle Verlauf gestaltete sich komplikationslos.
Aufgrund der Stentimplantation empfehlen wir eine duale Plättchenhemmung mit Aspirin und {{p2y12}} für {{dapt_monate}} Monate, anschließend eine lebenslange Gabe von Aspirin.
{{#if echo_verlaufskontrollen}}
Außerdem sollten regelmäßige echokardiographische Verlaufskontrollen erfolgen.
{{/if}}
Wir empfehlen die konsequente Therapie kardiovaskulärer Risikofaktoren mit Ziel LDL-Cholesterin < 70 mg/dl.
Die {{punktion_seite}} {{punktion_region}}region war nach Punktion im Rahmen der Koronarangiographie zuletzt palpatorisch und auskultatorisch unauffällig und reizlos bei geringem lokalem Hämatom.

${ENTLASSSATZ_T}`,
    procedere: `- Duale Plättchenhemmung mit ASS und {{p2y12}} für {{dapt_monate}} Monate, anschließend eine lebenslange Gabe von ASS
- Optimale Einstellung der kardiovaskulären Risikofaktoren, u.a. mit einem Ziel LDL < 70 mg/dl`,
  }),
};

/* ================================================================== */
/* T2 – Akutes Koronarsyndrom (Langform)                               */
/* ================================================================== */

const acsLangform = {
  id: 'acs_langform',
  title: 'Akutes Koronarsyndrom (Langform)',
  group: 'Koronar',
  source: `${QUELLE_T} – „Akutes Koronarsyndrom"`,
  description: 'Ausführliche Gliederung mit Intensivverlauf, Telemetrie, LZ-EKG und LZ-RR. Zielwert dieser Quelle: LDL < 70 mg/dl.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'infarkt',
      title: 'Infarkt',
      fields: [
        { key: 'acs_typ', label: 'Infarkttyp', type: 'select', required: true, default: 'NSTEMI', options: ['STEMI', 'NSTEMI'] },
        {
          key: 'wand',
          label: 'Wandbezug',
          type: 'select',
          required: true,
          default: 'Vorderwand',
          options: [{ value: 'Vorderwand', label: 'Vorderwand' }, { value: 'Hinterwand', label: 'Hinterwand' }],
        },
        FELD_ZIELGEFAESS,
        { key: 'infarkt_datum', label: 'Datum', type: 'date', required: true },
        {
          key: 'intervention',
          label: 'Intervention',
          type: 'select',
          required: true,
          default: 'DES-Implantation',
          options: ['PTCA', 'DES-Implantation', 'PTCA/DES-Implantation'],
        },
        { key: 'ck_max', label: 'Maximale CK-Auslenkung', type: 'number', unit: 'U/l' },
        { key: 'sofortige_uebernahme', label: 'Sofortige Übernahme ins Herzkatheterlabor', type: 'checkbox', visibleIf: 'acs_typ == "STEMI"' },
        { key: 'intensiv_verlegung', label: 'Verlegung auf Intensivstation', type: 'checkbox' },
      ],
    },
    {
      id: 'verlauf_felder',
      title: 'Verlauf',
      fields: [
        {
          key: 'medikation_erweitert',
          label: 'Medikation erweitert um',
          type: 'multiselect',
          options: ['Ramipril', 'Bisoprolol', 'Atorvastatin'],
          help: 'Beleg: „Wir erweiterten die Medikation um Ramipril, Bisoprolol und Atorvastatin."',
        },
        { key: 'reperfusionsarrhythmien', label: 'Reperfusionsarrhythmien in der Telemetrie', type: 'checkbox' },
        { key: 'lz_ekg_befund', label: 'Langzeit-EKG', type: 'text', placeholder: 'durchgehender Sinusrhythmus ohne höhergradige Rhythmusstörungen' },
        {
          key: 'lz_rr_dipper',
          label: 'Langzeit-RR',
          type: 'select',
          options: [{ value: 'Dipper', label: 'Dipper' }, { value: 'Non-Dipper', label: 'Non-Dipper' }],
        },
        FELD_P2Y12,
        { key: 'dapt_monate', label: 'DAPT-Dauer', type: 'number', unit: 'Monate', required: true, default: '12' },
        { key: 'ahb_beantragt', label: 'Kardiologische AHB über Sozialdienst beantragt', type: 'checkbox' },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: `- {{acs_typ}} der {{wand}} bei Verschluss der {{zielgefaess}} am {{infarkt_datum | date}}
  - {{intervention}}`,
    verlauf: `{{#if sofortige_uebernahme}}Bei einem STEMI erfolgte die sofortige Übernahme ins Herzkatheterlabor. {{/if}}Koronarangiographisch zeigte sich ein {{zielgefaess}}-Verschluss als Korrelat des {{wand}}infarktes. Es erfolgte eine komplikationslose Rekanalisation und DES-Implantation des verschlossenen Gefäßes.{{#if ck_max}} Die maximale CK-Auslenkung lag bei {{ck_max}} U/l{{/if}}
{{#if intensiv_verlegung or medikation_erweitert}}
{{#if intensiv_verlegung}}{{patient_nom | cap}} wurde anschließend auf die Intensivstation verlegt. {{/if}}{{#if medikation_erweitert}}Wir erweiterten die Medikation um {{medikation_erweitert | enum}}.{{/if}}
{{/if}}
{{#if reperfusionsarrhythmien or lz_ekg_befund}}
{{#if reperfusionsarrhythmien}}In der weiteren telemetrischen Überwachung waren Reperfusionsarrhythmien erkennbar, welche im Verlauf rückläufig waren. {{/if}}{{#if lz_ekg_befund}}In einem LZ-EKG stellte sich ein {{lz_ekg_befund}} dar.{{/if}}
{{/if}}
{{#if echo_befund}}
Echokardiographisch zeigte sich {{echo_befund}}
{{/if}}
{{#if lz_rr_dipper}}
In einem LZ-RR fanden sich normotensive Werte mit adäquater Nachtabsenkung (im Sinne eines {{lz_rr_dipper}}).
{{/if}}
Aufgrund der Stentimplantation empfehlen wir eine duale Plättchenhemmung mit ASS und {{p2y12}} für {{dapt_monate}} Monate, anschließend eine lebenslange Gabe von ASS.
Wir empfehlen eine kardiologische Anbindung mit regelmäßigen echokardiographischen Verlaufsbeurteilungen. Weiters bitten wir um eine optimale Einstellung der kardiovaskulären Risikofaktoren, u.a. mit einem Ziel-LDL < 70 mg/dl.
{{#if ahb_beantragt}}
Auf Wunsch {{patient_gen}} beantragten wir über unseren Sozialdienst eine kardiologische AHB. Über Zeit und Ort wird {{patient_nom}} postalisch informiert.
{{/if}}

${ENTLASSSATZ_T}`,
    procedere: `{{#if ahb_beantragt}}
- Eine AHB wurde beantragt. Über Zeit und Ort wird {{patient_nom}} postalisch informiert.
{{/if}}
- duale Plättchenhemmung mit ASS und {{p2y12}} für {{dapt_monate}} Monate, anschließend eine lebenslange Gabe von ASS
- optimale Einstellung der kardiovaskulären Risikofaktoren, u.a. mit einem Ziel-LDL < 70 mg/dl
- kardiologische Anbindung mit regelmäßigen echokardiographischen Verlaufsbeurteilungen
- Ausreizen der Herzinsuffizienzmedikation nach Patientenverträglichkeit`,
  }),
};

/* ================================================================== */
/* T10 – Bypass-OP (Verlegung)                                         */
/* ================================================================== */

const bypassOp = {
  id: 'bypass_op',
  title: 'Bypass-OP (Verlegung)',
  group: 'Koronar',
  source: `${QUELLE_T} – „Bypass-OP"`,
  description: 'Elektive Koronarangiographie mit Indikation zur operativen Bypass-Versorgung und Verlegung.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'diagnose',
      title: 'Diagnose',
      fields: [
        FELD_GEFAESSERKRANKUNG,
        { key: 'acvb_situation', label: 'Mit ACVB-Situation', type: 'checkbox' },
        { key: 'acvb_jahr', label: 'ACVB Jahr', type: 'text', visibleIf: 'acvb_situation' },
        { key: 'acvb_ort', label: 'ACVB Ort', type: 'text', visibleIf: 'acvb_situation' },
        FELD_ZIELGEFAESS,
      ],
    },
    {
      id: 'verlauf_felder',
      title: 'Verlauf und Verlegung',
      fields: [
        {
          key: 'lvef_grad',
          label: 'Einschränkung der LVEF',
          type: 'select',
          options: [
            { value: 'leicht', label: 'leichtgradig' },
            { value: 'mittel', label: 'mittelgradig' },
            { value: 'hoch', label: 'hochgradig' },
          ],
          help: 'Beleg: „XXgradig eingeschränkte LVEF".',
        },
        { key: 'lvef_zusatz', label: 'Ergänzung zum Echobefund', type: 'text' },
        { key: 'aufnahme_extern_datum', label: 'Aufnahmetermin Schön Klinik Vogtareuth', type: 'date', required: true },
        { key: 'op_datum', label: 'Datum der Bypass-OP', type: 'date', required: true },
        { key: 'praeop_rx_thorax', label: 'Röntgen-Thorax ohne pulmonalvenöse Stauung', type: 'checkbox', default: true },
        { key: 'praeop_abdomen', label: 'Abdomensonographie unauffällig', type: 'checkbox', default: true },
        { key: 'praeop_lufu', label: 'Lungenfunktionsdiagnostik unauffällig', type: 'checkbox', default: true },
        {
          key: 'punktion_seite',
          label: 'Punktionsseite',
          type: 'select',
          default: 'rechte',
          options: [{ value: 'linke', label: 'linke' }, { value: 'rechte', label: 'rechte' }],
        },
        {
          key: 'punktion_region',
          label: 'Punktionsregion',
          type: 'select',
          default: 'Radialis',
          options: [{ value: 'Leisten', label: 'Leistenregion' }, { value: 'Radialis', label: 'Radialisregion' }],
        },
        { key: 'verlegung_datum', label: 'Verlegungsdatum', type: 'date', required: true },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: `- Schwere koronare {{gefaesserkrankung}}-Gefäßerkrankung{{#if acvb_situation}} (mit ACVB Situation{{#if acvb_jahr}}, {{acvb_jahr}}{{/if}}{{#if acvb_ort}}, {{acvb_ort}}{{/if}}){{/if}} mit hochgradiger {{zielgefaess}}-Stenose mit Bypass-Indikation`,
    verlaufTitel: 'Therapie & Verlauf',
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte am {{aufnahme_datum | date}} zur elektiv geplanten Koronarangiographie. Hierbei zeigte sich eine schwere koronare {{gefaesserkrankung}}-Gefäßerkrankung mit oben genanntem Befund und Indikation zur operativen Bypass-Versorgung.
{{#if lvef_grad}}
Echokardiographisch fand sich eine {{lvef_grad}}gradig eingeschränkte LVEF{{#if lvef_zusatz}} bei {{lvef_zusatz}}{{/if}}
{{/if}}

Die aktuelle Situation, das Krankheitsbild und das weitere Procedere wurden mit {{patient_dat}} ausführlich besprochen. Wir vereinbarten einen Aufnahmetermin in der Schön Klinik Vogtareuth am {{aufnahme_extern_datum | date}} zur Bypass-OP am {{op_datum | date}}.
In den präoperativen Vorbereitungsuntersuchungen ergaben sich keine Kontraindikationen für den bevorstehenden Eingriff.
{{#if praeop_rx_thorax or praeop_abdomen or praeop_lufu}}
{{#if praeop_rx_thorax}}Im Röntgen-Thorax zeigten sich keine Hinweise auf pulmonalvenöse Stauung. {{/if}}{{#if praeop_abdomen}}Die Abdomensonographie war unauffällig. {{/if}}{{#if praeop_lufu}}In der Lungenfunktionsdiagnostik zeigten sich keine Auffälligkeiten.{{/if}}
{{/if}}

{{#if punktion_seite}}
Die {{punktion_seite}} {{punktion_region}}region war nach Punktion im Rahmen der Koronarangiographie zuletzt palpatorisch und auskultatorisch unauffällig und reizlos bei geringem lokalem Hämatom.

{{/if}}
Wir konnten {{patient_akk}} am {{verlegung_datum | date}} in stabilem Allgemeinzustand in die Schön Klinik Vogtareuth verlegen.`,
    procedere: '- Aufnahmetermin in der Schön Klinik Vogtareuth am {{aufnahme_extern_datum | date}} zur Bypassoperation am {{op_datum | date}}',
  }),
};

export default [acs, pciElektiv, koronarangiographieElektiv, acsLangform, bypassOp];
