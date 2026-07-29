/**
 * Vorlagen der Gruppe "Rhythmologie".
 *
 * Quellen: Musterarztbriefe_Med._I.docx (PVI, sonstige EPU, elektrische
 * Cardioversion) und Textbausteine_Kardio.docx (TAA bei Vorhofflimmern,
 * ambulante Cardioversion, EPU bei VHF).
 */

import { PROCEDERE_ZUSATZ, SHARED_GROUPS_KURZFORM, SHARED_GROUPS_LANGFORM, langformRahmen } from '../sectionBlocks.js';

const QUELLE_M = 'Musterarztbriefe_Med._I.docx';
const QUELLE_T = 'Textbausteine_Kardio.docx';

const ENTLASSSATZ_M = 'Wir entlassen {{anrede_name_akk}} am {{entlass_datum | dateShort}} in {{entlass_az}} Allgemeinzustand in {{patient_poss}} häusliches Umfeld und ihre weitere fachärztliche Betreuung.';

const PUNKTIONSSATZ_FEMORAL = 'Die beidseits punktierten Vv. Femorales sind am Entlasstag inspektorisch und palpatorisch reizlos, die periphere Durchblutung, Sensibilität und Motorik waren allzeit intakt.';

const FELD_CHA2DS2VASC = {
  key: 'cha2ds2vasc',
  label: 'CHA₂DS₂-VA-Score',
  type: 'number',
  required: true,
  min: 0,
  max: 9,
  help: 'Ab 2 wird die orale Antikoagulation dauerhaft empfohlen, sonst zeitlich befristet (Beleg: „dauerhaft (X ≥ 2)/ … (X = 0-1)").',
};

const FELD_HASBLED = { key: 'hasbled', label: 'HAS-BLED-Score', type: 'number', required: true, min: 0, max: 9 };

const FELD_EHRA = {
  key: 'ehra',
  label: 'EHRA-Klasse',
  type: 'select',
  required: true,
  default: 'II',
  options: ['I', 'II', 'III', 'IV'],
};

/* ================================================================== */
/* M1 – Pulmonalvenenisolation                                         */
/* ================================================================== */

const pvi = {
  id: 'pvi',
  title: 'Pulmonalvenenisolation',
  group: 'Rhythmologie',
  source: `${QUELLE_M} – „Pulmonalvenenisolation"`,
  description: 'Elektive PVI nach TEE-gesteuertem Thrombusausschluss. Die PPI-Empfehlung entfällt automatisch bei Pulsed Field Ablation.',
  sharedGroups: SHARED_GROUPS_KURZFORM,
  fieldGroups: [
    {
      id: 'vhf',
      title: 'Vorhofflimmern',
      fields: [
        {
          key: 'vhf_typ',
          label: 'Typ des Vorhofflimmerns',
          type: 'select',
          required: true,
          default: 'Paroxysmal',
          options: [
            { value: 'Paroxysmal', label: 'Paroxysmales Vorhofflimmern' },
            { value: 'Kurz-Persistierend', label: 'Kurz-Persistierendes Vorhofflimmern' },
            { value: 'Persistierend', label: 'Persistierendes Vorhofflimmern' },
          ],
          help: 'Wird im Brief automatisch gebeugt („Paroxysmales" bzw. „mit symptomatischem Paroxysmalen").',
        },
        { key: 'vhf_erstdiagnose', label: 'Erstdiagnose', type: 'month', required: true },
        FELD_EHRA,
        FELD_CHA2DS2VASC,
        FELD_HASBLED,
      ],
    },
    {
      id: 'intervention',
      title: 'Intervention',
      fields: [
        {
          key: 'pvi_verfahren',
          label: 'Ablationsverfahren',
          type: 'select',
          required: true,
          default: 'Kryo-Ballon',
          options: ['Kryo-Ballon', 'Radiofrequenzablation', 'Pulsed Field Ablation'],
          help: 'Bei Pulsed Field Ablation entfällt die PPI-Empfehlung (Beleg: „nicht bei PFA").',
        },
        { key: 'pvi_datum', label: 'Datum der PVI', type: 'date', required: true },
      ],
    },
    {
      id: 'vorbehandlung',
      title: 'Vorbehandlung',
      fields: [
        { key: 'vorherige_ekv', label: 'Vorausgegangene elektrische Cardioversion', type: 'checkbox' },
        { key: 'vorherige_ekv_primaer_erfolgreich', label: 'Primär erfolgreich', type: 'checkbox', visibleIf: 'vorherige_ekv' },
        { key: 'vorherige_ekv_zeitpunkt', label: 'Zeitpunkt der Cardioversion', type: 'month', visibleIf: 'vorherige_ekv' },
        { key: 'aa_substanz', label: 'Antiarrhythmikum', type: 'text', visibleIf: 'vorherige_ekv', placeholder: 'z. B. Amiodaron' },
        { key: 'aa_von', label: 'Therapie von', type: 'month', visibleIf: 'aa_substanz not empty' },
        { key: 'aa_bis', label: 'Therapie bis', type: 'month', visibleIf: 'aa_substanz not empty' },
      ],
    },
    {
      id: 'nachsorge',
      title: 'Nachsorge',
      fields: [
        { key: 'wv_datum', label: 'Wiedervorstellung rhythmologische Sprechstunde', type: 'date' },
        { key: 'wv_uhrzeit', label: 'Uhrzeit', type: 'time', visibleIf: 'wv_datum not empty' },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `{{vhf_typ}}es Vorhofflimmern, Erstdiagnose {{vhf_erstdiagnose | monthyear}}, EHRA {{ehra}}, CHA2DS2-VASc: {{cha2ds2vasc}}, HAS-BLED: {{hasbled}}
- Aktuell: erfolgreiche Pulmonalvenenisolation mittels {{pvi_verfahren}} am {{pvi_datum | date}}
{{#if vorherige_ekv}}
- {{#if vorherige_ekv_primaer_erfolgreich}}(Primär) erfolgreiche{{#else}}Erfolgreiche{{/if}} elektrische Cardioversion {{vorherige_ekv_zeitpunkt | monthyear}}{{#if aa_substanz}}, medikamentöse antiarrhythmische Therapie mit {{aa_substanz}} {{aa_von | monthyear}} – {{aa_bis | monthyear}}{{/if}}
{{/if}}`,
    },
    {
      id: 'epikrise',
      title: 'Epikrise',
      order: 2,
      template: `{{anrede_name}} stellte sich mit symptomatischem {{vhf_typ}}en Vorhofflimmern stationär vor. Nach dem Ausschluss intracavitärer Thromben in einer transösophagealen Echokardiographie erfolgte komplikationslos die Elektrophysiologische Untersuchung mit erfolgreicher Isolation aller Pulmonalvenen mittels {{pvi_verfahren}}. Der weitere Aufenthalt gestaltete sich unauffällig, in seriellen echokardiographischen Kontrollen konnte postinterventionell ein Perikarderguss ausgeschlossen werden. Bei einem CHA2DS2-VASc-Score von {{cha2ds2vasc}} ist eine orale Antikoagulation {{#if cha2ds2vasc >= 2}}dauerhaft{{#else}}für drei Monate{{/if}} indiziert{{#unless pvi_verfahren == "Pulsed Field Ablation"}}, ergänzend ist eine PPI-Therapie in doppelter Standarddosis für vier Wochen nach PVI zu empfehlen{{/unless}}.
${PUNKTIONSSATZ_FEMORAL}
${ENTLASSSATZ_M}`,
    },
    {
      id: 'procedere',
      title: 'Procedere',
      order: 3,
      template: `- Fortführung der oralen Antikoagulation {{#if cha2ds2vasc >= 2}}dauerhaft{{#else}}für drei Monate{{/if}}
{{#unless pvi_verfahren == "Pulsed Field Ablation"}}
- PPI in doppelter Standarddosis für vier Wochen
{{/unless}}
{{#if wv_datum}}
- Wiedervorstellung in unserer rhythmologischen Sprechstunde am {{wv_datum | date}}{{#if wv_uhrzeit}} um {{wv_uhrzeit | time}} Uhr{{/if}}, bitte Einweisungsschein ausstellen
{{/if}}
${PROCEDERE_ZUSATZ}`,
    },
  ],
};

/* ================================================================== */
/* M2 – Sonstige elektrophysiologische Untersuchung                    */
/* ================================================================== */

const epuSonstige = {
  id: 'epu_sonstige',
  title: 'Sonstige elektrophysiologische Untersuchung',
  group: 'Rhythmologie',
  source: `${QUELLE_M} – „Sonstige Elektrophysiologische Untersuchung"`,
  description: 'AVNRT, AVRT/WPW oder typisches Vorhofflattern. Die Antikoagulations-Passagen erscheinen nur beim Vorhofflattern (Beleg: „Nur Vorhofflattern:").',
  sharedGroups: SHARED_GROUPS_KURZFORM,
  fieldGroups: [
    {
      id: 'prozedur',
      title: 'Prozedur',
      fields: [
        {
          key: 'epu_typ',
          label: 'Prozedur',
          type: 'radio',
          required: true,
          default: 'avnrt',
          options: [
            { value: 'avnrt', label: 'AV-Knoten-Reentrytachykardie (Slow-Pathway-Modulation)' },
            { value: 'avrt', label: 'AV-Reentry-Tachykardie / WPW-Syndrom (Bahnablation)' },
            { value: 'flattern', label: 'Typisches Vorhofflattern (CTI-Ablation)' },
          ],
        },
        { key: 'epu_datum', label: 'Datum der EPU', type: 'date', required: true },
        {
          key: 'bahn_lokalisation',
          label: 'Lokalisation der akzessorischen Bahn',
          type: 'select',
          allowCustom: true,
          default: 'posterioren',
          options: [
            { value: 'posterioren', label: 'posterior' },
            { value: 'anterioren', label: 'anterior' },
          ],
          visibleIf: 'epu_typ == "avrt"',
        },
        {
          key: 'flattern_richtung',
          label: 'Flatterrichtung',
          type: 'select',
          default: 'counter-clockwise',
          options: ['clockwise', 'counter-clockwise'],
          visibleIf: 'epu_typ == "flattern"',
        },
        {
          key: 'tee_erfolgt',
          label: 'TEE-Thrombusausschluss erfolgt',
          type: 'checkbox',
          default: true,
          help: 'Beleg: „Nach dem Ausschluss intracavitärer Thromben … / Es erfolgte komplikationslos …"',
        },
      ],
    },
    {
      id: 'antikoagulation',
      title: 'Antikoagulation (nur bei Vorhofflattern)',
      visibleIf: 'epu_typ == "flattern"',
      fields: [FELD_CHA2DS2VASC, FELD_HASBLED],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `{{#if epu_typ == "avnrt"}}
AV-Knoten-Reentrytachykardie
- Aktuell: Modulation des slow-pathway am {{epu_datum | date}}
{{#elseif epu_typ == "avrt"}}
AV-Reentry-Tachykardie/ WPW-Syndrom
- Aktuell: Ablation einer {{bahn_lokalisation}} akzessorischen Leitungsbahn am {{epu_datum | date}}
{{#else}}
Typisches „{{flattern_richtung}}" Vorhofflattern, CHA2DS2-VASc: {{cha2ds2vasc}}, HAS-BLED: {{hasbled}}
- Aktuell: Ablation des Cavotriksupidalen Isthmus am {{epu_datum | date}}
{{/if}}`,
    },
    {
      id: 'epikrise',
      title: 'Epikrise',
      order: 2,
      template: `{{anrede_name}} stellte sich mit {{#if epu_typ == "flattern"}}symptomatischem Vorhofflattern{{#else}}symptomatischen paroxysmalen Tachykardien{{/if}} stationär vor.
{{#if tee_erfolgt}}Nach dem Ausschluss intracavitärer Thromben in einer transösophagealen Echokardiographie erfolgte{{#else}}Es erfolgte{{/if}} komplikationslos die Elektrophysiologische Untersuchung mit erfolgreicher {{#if epu_typ == "avnrt"}}Modulation des slow-pathway bei AVNRT{{#elseif epu_typ == "avrt"}}Ablation einer {{bahn_lokalisation}} akzessorischen Leitungsbahn{{#else}}Ablation des Cavotrikuspidalen Isthmus{{/if}}.
Der weitere Aufenthalt gestaltete sich unauffällig, in echokardiographischen Kontrollen konnte postinterventionell ein Perikarderguss ausgeschlossen werden.
{{#if epu_typ == "flattern"}}
Bei einem CHA2DS2-VASc-Score von {{cha2ds2vasc}} ist eine orale Antikoagulation {{#if cha2ds2vasc >= 2}}dauerhaft{{#else}}für vier Wochen{{/if}} indiziert, bei erneuten Beschwerden bitten wir um Wiedervorstellung über unsere rhythmologische Ambulanz.
{{/if}}
${PUNKTIONSSATZ_FEMORAL}
${ENTLASSSATZ_M}`,
    },
    {
      id: 'procedere',
      title: 'Procedere',
      order: 3,
      template: `{{#if epu_typ == "flattern"}}
- Orale Antikoagulation {{#if cha2ds2vasc >= 2}}dauerhaft{{#else}}für vier Wochen{{/if}}
{{/if}}
- Wiedervorstellung bei erneuten Beschwerden über unsere rhythmologische Ambulanz
${PROCEDERE_ZUSATZ}`,
    },
  ],
};

/* ================================================================== */
/* M3 – Elektrische Cardioversion (stationär)                          */
/* ================================================================== */

const RHYTHMUSSTOERUNGEN = [
  { value: 'Paroxysmalen Vorhofflimmern', label: 'Paroxysmales Vorhofflimmern' },
  { value: 'Kurz-Persistierenden Vorhofflimmern', label: 'Kurz-Persistierendes Vorhofflimmern' },
  { value: 'Persistierenden Vorhofflimmern', label: 'Persistierendes Vorhofflimmern' },
  { value: 'Typischen Vorhofflattern', label: 'Typisches Vorhofflattern' },
  { value: 'Atypischen Vorhofflattern', label: 'Atypisches Vorhofflattern' },
  { value: 'Fokal-Atrialen Tachykardie', label: 'Fokal-Atriale Tachykardie' },
];

/** "(Rezidiv eines/r)" – Artikel richtet sich nach der gewählten Störung. */
const REZIDIV_PRAEFIX = '{{#if rezidiv}}(Rezidiv {{#if rhythmusstoerung contains "Tachykardie"}}einer{{#else}}eines{{/if}}) {{/if}}';

const kardioversionStationaer = {
  id: 'kardioversion_stationaer',
  title: 'Elektrische Cardioversion (stationär)',
  group: 'Rhythmologie',
  source: `${QUELLE_M} – „Elektrische Cardioversion"`,
  description: 'Stationäre elektrische Cardioversion in Kurznarkose nach TEE.',
  sharedGroups: SHARED_GROUPS_KURZFORM,
  fieldGroups: [
    {
      id: 'rhythmus',
      title: 'Rhythmusstörung',
      fields: [
        {
          key: 'rhythmusstoerung',
          label: 'Rhythmusstörung',
          type: 'select',
          required: true,
          default: 'Persistierenden Vorhofflimmern',
          options: RHYTHMUSSTOERUNGEN,
        },
        { key: 'rezidiv', label: 'Rezidiv', type: 'checkbox' },
        {
          key: 'vhf_erstdiagnose',
          label: 'Erstdiagnose',
          type: 'month',
          visibleIf: 'rhythmusstoerung contains "Vorhofflimmern"',
        },
        { ...FELD_EHRA, required: false, visibleIf: 'rhythmusstoerung contains "Vorhofflimmern"' },
        FELD_CHA2DS2VASC,
        FELD_HASBLED,
      ],
    },
    {
      id: 'kardioversion',
      title: 'Cardioversion',
      fields: [
        { key: 'ekv_energie', label: 'Energie', type: 'number', unit: 'J', required: true, help: 'Beleg: „mit XXXJ biphasisch".' },
        { key: 'ekv_datum', label: 'Datum der Cardioversion', type: 'date', required: true },
      ],
    },
    {
      id: 'vorbehandlung',
      title: 'Vorbehandlung',
      fields: [
        { key: 'vorherige_ablation', label: 'Vorausgegangene Ablation / PVI', type: 'checkbox' },
        {
          key: 'vorherige_ablation_verfahren',
          label: 'Verfahren',
          type: 'select',
          options: ['Kryo-Ballon', 'RF'],
          visibleIf: 'vorherige_ablation',
        },
        { key: 'vorherige_ablation_datum', label: 'Datum', type: 'date', visibleIf: 'vorherige_ablation' },
        { key: 'vorherige_ekv', label: 'Vorausgegangene elektrische Cardioversion', type: 'checkbox' },
        { key: 'vorherige_ekv_primaer_erfolgreich', label: 'Primär erfolgreich', type: 'checkbox', visibleIf: 'vorherige_ekv' },
        { key: 'vorherige_ekv_zeitpunkt', label: 'Zeitpunkt', type: 'month', visibleIf: 'vorherige_ekv' },
        { key: 'aa_substanz', label: 'Antiarrhythmikum', type: 'text', visibleIf: 'vorherige_ekv' },
        { key: 'aa_von', label: 'Therapie von', type: 'month', visibleIf: 'aa_substanz not empty' },
        { key: 'aa_bis', label: 'Therapie bis', type: 'month', visibleIf: 'aa_substanz not empty' },
      ],
    },
    {
      id: 'nachsorge',
      title: 'Nachsorge',
      fields: [
        {
          key: 'wv_ort',
          label: 'Wiedervorstellung',
          type: 'select',
          default: 'unserer rhythmologischen Sprechstunde',
          options: [
            { value: 'unserer rhythmologischen Sprechstunde', label: 'Rhythmologische Sprechstunde' },
            { value: 'Station', label: 'Station' },
          ],
        },
        { key: 'wv_station', label: 'Station', type: 'text', visibleIf: 'wv_ort == "Station"' },
        { key: 'wv_datum', label: 'Datum', type: 'date' },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `${REZIDIV_PRAEFIX}{{rhythmusstoerung}}{{#if vhf_erstdiagnose}}, Erstdiagnose {{vhf_erstdiagnose | monthyear}}{{/if}}{{#if ehra}}, EHRA {{ehra}}{{/if}}, CHA2DS2-VASc: {{cha2ds2vasc}}, HAS-BLED: {{hasbled}}
- Aktuell: erfolgreiche elektrische Cardioversion mit {{ekv_energie}}J biphasisch am {{ekv_datum | date}}
{{#if vorherige_ablation}}
- Ablation/ Pulmonalvenenisolation mittels {{vorherige_ablation_verfahren}} am {{vorherige_ablation_datum | date}}
{{/if}}
{{#if vorherige_ekv}}
- {{#if vorherige_ekv_primaer_erfolgreich}}(Primär) erfolgreiche{{#else}}Erfolgreiche{{/if}} elektrische Cardioversion {{vorherige_ekv_zeitpunkt | monthyear}}{{#if aa_substanz}}, medikamentöse antiarrhythmische Therapie mit {{aa_substanz}} {{aa_von | monthyear}} – {{aa_bis | monthyear}}{{/if}}
{{/if}}`,
    },
    {
      id: 'epikrise',
      title: 'Epikrise',
      order: 2,
      template: `{{anrede_name}} stellte sich mit symptomatischem ${REZIDIV_PRAEFIX}{{rhythmusstoerung}} stationär vor. Nach dem Ausschluss intracavitärer Thromben in einer transösophagealen Echokardiographie erfolgte komplikationslos die elektrische Cardioversion mit {{ekv_energie}}J in Kurznarkose. Im weiteren Aufenthalt zeigte sich anhaltend ein normfrequenter Sinusrhythmus. Bei einem CHA2DS2-VASc-Score von {{cha2ds2vasc}} ist eine orale Antikoagulation {{#if cha2ds2vasc >= 2}}dauerhaft{{#else}}für vier Wochen{{/if}} indiziert.
Mit {{anrede_name_dat}} wurden die weiteren Therapieoptionen eines dauerhaften Rhythmuserhaltes (medikamentös vs. Interventionell) besprochen und ein Termin zur Wiedervorstellung wie untenstehend vereinbart.
${ENTLASSSATZ_M}`,
    },
    {
      id: 'procedere',
      title: 'Procedere',
      order: 3,
      template: `- Fortführung der oralen Antikoagulation {{#if cha2ds2vasc >= 2}}dauerhaft{{#else}}für vier Wochen{{/if}}
{{#if wv_datum}}
- Wiedervorstellung in {{wv_ort}}{{#if wv_station}} {{wv_station}}{{/if}} am {{wv_datum | date}}
{{/if}}
${PROCEDERE_ZUSATZ}`,
    },
  ],
};

/* ================================================================== */
/* T6 – TAA bei Vorhofflimmern (Langform)                              */
/* ================================================================== */

const taaVorhofflimmern = {
  id: 'taa_vorhofflimmern',
  title: 'Tachyarrhythmia absoluta bei Vorhofflimmern',
  group: 'Rhythmologie',
  source: `${QUELLE_T} – „TAA bei Vorhofflimmern"`,
  description: 'Modularer Verlauf: acht einzeln zuschaltbare Absätze (OAK, LZ-EKG, Frequenzkontrolle, Kardioversion, Koronarangiographie/Cardio-MRT, Blutdruck, Diabetesberatung).',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'aufnahme',
      title: 'Aufnahme',
      fields: [
        {
          key: 'erstereignis',
          label: 'Erstereignis',
          type: 'select',
          required: true,
          default: 'erstmalig aufgetretenen',
          options: [
            { value: 'erstmalig aufgetretenen', label: 'erstmalig aufgetreten' },
            { value: 'erstmalig diagnostizierten', label: 'erstmalig diagnostiziert' },
          ],
        },
        { key: 'oak_begonnen', label: 'Orale Antikoagulation begonnen', type: 'checkbox' },
        { ...FELD_CHA2DS2VASC, required: false, visibleIf: 'oak_begonnen' },
        { key: 'oak_substanz', label: 'Antikoagulans', type: 'text', visibleIf: 'oak_begonnen' },
      ],
    },
    {
      id: 'diagnostik',
      title: 'Diagnostik',
      fields: [
        { key: 'lz_ekg', label: 'Langzeit-EKG durchgeführt', type: 'checkbox' },
        { key: 'vhf_mittlere_frequenz', label: 'Mittlere Frequenz', type: 'number', unit: '/min', visibleIf: 'lz_ekg' },
        { key: 'taa_max_frequenz', label: 'TAA-Episoden bis', type: 'number', unit: '/min', visibleIf: 'lz_ekg' },
      ],
    },
    {
      id: 'rhythmustherapie',
      title: 'Rhythmus- und Frequenztherapie',
      fields: [
        {
          key: 'frequenzkontrolle',
          label: 'Frequenzkontrolle statt Kardioversion',
          type: 'checkbox',
          help: 'Beleg: „… weshalb wir … von einer Elektrokardioversion absahen und uns auf eine Frequenzkontrolle … beschränkten."',
        },
        {
          key: 'frequenz_substanz',
          label: 'Substanz zur Frequenzkontrolle',
          type: 'select',
          allowCustom: true,
          options: ['Digitoxin', 'Bisoprolol', 'Amiodaron'],
          visibleIf: 'frequenzkontrolle',
        },
        { key: 'ekv_durchgefuehrt', label: 'Elektrokardioversion durchgeführt', type: 'checkbox' },
        { key: 'ekv_energie', label: 'Energie', type: 'number', unit: 'Joule', visibleIf: 'ekv_durchgefuehrt' },
        { key: 'ekv_rezidiv', label: 'Frühes Rezidiv des Vorhofflimmerns', type: 'checkbox', visibleIf: 'ekv_durchgefuehrt' },
        {
          key: 'amiodaron_aufsaettigung_g',
          label: 'Amiodaron-Aufsättigung',
          type: 'number',
          unit: 'g',
          visibleIf: 'ekv_rezidiv',
          help: 'Zieht die Monitoring-Empfehlung (QTc, Schilddrüse, Leber, Lunge, Augenarzt) nach sich.',
        },
      ],
    },
    {
      id: 'weitere_abklaerung',
      title: 'Weitere Abklärung',
      fields: [
        { key: 'koro_erfolgt', label: 'Koronarangiographie zum Ischämieausschluss', type: 'checkbox' },
        { key: 'cmrt_erfolgt', label: 'Cardio-MRT durchgeführt', type: 'checkbox', visibleIf: 'koro_erfolgt' },
        { key: 'bd_eskalation', label: 'Blutdrucktherapie eskaliert', type: 'checkbox' },
        { key: 'diabetesberatung', label: 'Diabetes- und Ernährungsberatung erfolgt', type: 'checkbox' },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: '- Tachyarrhythmia absoluta bei {{erstereignis}} Vorhofflimmern',
    verlauf: `Es erfolgte die stationäre Aufnahme bei einem {{erstereignis}} tachyarrhythmischen Vorhofflimmern.{{#if oak_begonnen}} Bei einem CHADS-VASc-Score von {{cha2ds2vasc}} begannen wir eine orale Antikoagulation mit {{oak_substanz}}.{{/if}}
{{#if lz_ekg}}
Im Langzeit-EKG konnte ein Vorhofflimmern mit mittlerer Frequenz von {{vhf_mittlere_frequenz}}/min nachgewiesen werden, zusätzlich zeigten sich mehrere Episoden einer TAA mit Frequenzen bis zu {{taa_max_frequenz}}/min.
{{/if}}
{{#if frequenzkontrolle}}
Echokardiographisch präsentierte sich ein deutlich dilatierter Vorhof, weshalb wir in Anbetracht {{patient_gen}} und der mangelnden Erfolgsaussicht von einer Elektrokardioversion absahen und uns auf eine Frequenzkontrolle mittels {{frequenz_substanz}} beschränkten.
{{/if}}
{{#if ekv_durchgefuehrt}}
Nach Ausschluss intracavitärer Thromben erfolgte die komplikationslose Elektrokardioversion mittels {{ekv_energie}} Joule in den Sinusrhythmus{{#if ekv_rezidiv}}, es kam allerdings zu einem frühen Rezidiv des Vorhofflimmerns{{/if}}.
{{/if}}
{{#if ekv_rezidiv}}
Wir begannen zur Rhythmuskontrolle eine Dauertherapie mit Amiodaron nach initialer Aufsättigung auf {{amiodaron_aufsaettigung_g}} g. Hierunter stellte sich ein stabiler Sinusrhythmus ein. Wir empfehlen in diesem Zusammenhang die Kontrolle des EKGs (QTc < 500 ms), der Schilddrüsen-, Leber- und Lungenfunktion sowie eine Vorstellung beim Augenarzt im Verlauf. Außerdem empfehlen wir eine regelmäßige kardiologische Anbindung mit echokardiographischen Verlaufskontrollen der Pumpfunktionen.
{{/if}}
{{#if koro_erfolgt}}
In der Echokardiographie zeigte sich eine verminderte linksventrikuläre Pumpfunktion unklarer Genese. Daher erfolgte zum Ausschluss einer Myokardischämie eine Koronarangiographie. Hier zeigte sich kein Anhalt für eine relevante koronare Herzkrankheit bei beginnender Koronarsklerose.{{#if cmrt_erfolgt}} Zur besseren Beurteilung der reduzierten Pumpfunktion erfolgte eine Cardio-MRT-Untersuchung. Hier zeigte sich eine Kardiomyopathie, am ehesten tachysystolischer Genese ohne Anhalt für eine Myokarditis oder infiltrative Erkrankung.{{/if}}
{{/if}}
{{#if bd_eskalation}}
Aufgrund von erhöhten Werten in der Langzeit-Blutdruckuntersuchung eskalierten wir die medikamentöse Blutdrucktherapie.
{{/if}}
{{#if diabetesberatung}}
Bei initial erhöhten Blutzuckerwerten erfolgte eine Diabetes- und Ernährungsberatung.
{{/if}}

Wir entlassen {{patient_akk}} am {{entlass_datum | date}} in gutem Allgemeinzustand in Ihre geschätzte haus-und fachärztliche Weiterbetreuung und stehen bei Rückfragen jederzeit gerne zur Verfügung.`,
    procedere: '',
  }),
};

/* ================================================================== */
/* T11 – Cardioversion (Tagesklinik, ambulant)                         */
/* ================================================================== */

const kardioversionAmbulant = {
  id: 'kardioversion_ambulant',
  title: 'Cardioversion (Tagesklinik, ambulant)',
  group: 'Rhythmologie',
  source: `${QUELLE_T} – „Cardioversion (Tagesklinik ambulant)"`,
  description: 'Ambulante Kardioversion mit taggleicher Entlassung – abweichende Entlassformel („Am selben Tag …").',
  sharedGroups: ['stammdaten', 'risikofaktoren', 'vordiagnosen', 'anamnese_untersuchung', 'befunde', 'therapieempfehlung', 'procedere_frei'],
  fieldGroups: [
    {
      id: 'kardioversion',
      title: 'Cardioversion',
      fields: [
        {
          key: 'ekv_erfolg',
          label: 'Ergebnis',
          type: 'select',
          required: true,
          default: 'Erfolgreiche',
          options: [
            { value: 'Erfolgreiche', label: 'Erfolgreich' },
            { value: 'Frustrane', label: 'Frustran' },
          ],
        },
        { key: 'ekv_anzahl', label: 'Anzahl Schocks', type: 'number', required: true, default: '1', min: 1 },
        { key: 'ekv_energie', label: 'Energie', type: 'number', unit: 'J', required: true },
        {
          key: 'vhf_typ',
          label: 'Rhythmusstörung',
          type: 'select',
          required: true,
          default: 'persistierendem Vorhofflimmern',
          options: [
            { value: 'persistierendem Vorhofflimmern', label: 'Persistierendes Vorhofflimmern' },
            { value: 'paroxysmalem Vorhofflimmern', label: 'Paroxysmales Vorhofflimmern' },
          ],
        },
        { ...FELD_CHA2DS2VASC, help: 'Beleg: „CHADS-VA-Score XX".' },
        { key: 'oak_substanz', label: 'Orale Antikoagulation mit', type: 'text', required: true },
        { key: 'tee_erfolgt', label: 'TEE-Thrombusausschluss erfolgt', type: 'checkbox', default: true },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnose',
      order: 1,
      template: '- {{ekv_erfolg}} elektrische Kardioversion mit {{ekv_anzahl}}x {{ekv_energie}} J bei {{vhf_typ}}, CHADS-VA-Score {{cha2ds2vasc}}, OAK mit {{oak_substanz}}',
    },
    { id: 'risikofaktoren', title: 'Kardiovaskuläre Risikofaktoren', order: 2, visibleIf: 'kv_risikofaktoren not empty', template: '{{#each kv_risikofaktoren}}- {{this}}\n{{/each}}' },
    { id: 'vordiagnosen', title: 'Relevante Vordiagnosen', order: 3, visibleIf: 'vordiagnosen not empty', template: '{{#each vordiagnosen}}- {{this.text}}\n{{/each}}' },
    { id: 'untersuchung', title: 'Körperlicher Untersuchungsbefund', order: 4, visibleIf: 'ku_variante not empty', template: '{{#if ku_variante == "kurz"}}{{alter}}-{{jaehriger}} {{patient_wort}} in gutem Allgemein- und normalem Ernährungszustand (Größe {{groesse_cm}} cm, Gewicht {{gewicht_kg}} kg). Cor: auskultatorisch rein, {{ku_rhythmus}}; Pulmo: vesikuläres Atemgeräusch, keine Rasselgeräusche; Fuß- und Leistenpulse gut tastbar, keine Jugularvenenstauung; keine peripheren Ödeme; keine Zyanose; Abdomen: weich, kein Druckschmerz, keine Resistenzen; neurologisch orientierend kein fokal-neurologisches Defizit.{{/if}}' },
    {
      id: 'befunde',
      title: 'Befunde',
      order: 5,
      visibleIf: 'ekg_aufnahme not empty or weitere_befunde not empty',
      template: `{{#if ekg_aufnahme}}
EKG bei Aufnahme:
{{ekg_aufnahme}}
{{/if}}
{{#if weitere_befunde}}
{{weitere_befunde}}
{{/if}}`,
    },
    {
      id: 'verlauf',
      title: 'Therapie und Verlauf',
      order: 6,
      template: `{{#if tee_erfolgt}}Nach Ausschluss intracavitärer Thromben mittels TEE konnte eine {{#if ekv_erfolg == "Erfolgreiche"}}erfolgreiche{{#else}}frustrane{{/if}} elektrische Kardioversion mit {{ekv_anzahl}}x {{ekv_energie}} J in einen Sinusrhythmus durchgeführt werden.{{#else}}Es konnte eine {{#if ekv_erfolg == "Erfolgreiche"}}erfolgreiche{{#else}}frustrane{{/if}} elektrische Kardioversion mit {{ekv_anzahl}}x {{ekv_energie}} J in einen Sinusrhythmus durchgeführt werden.{{/if}}
Die orale Antikoagulation mit {{oak_substanz}} ist fortzuführen.

Am selben Tag konnten wir {{patient_akk}} in stabilem und beschwerdefreiem Zustand wieder in Ihre geschätzte ambulante ärztliche Weiterbehandlung entlassen und stehen für Rückfragen gerne zur Verfügung.`,
    },
    { id: 'therapieempfehlung', title: 'Therapieempfehlung', order: 7, visibleIf: 'medikation not empty or therapieempfehlung_text not empty', template: '{{#each medikation}}- {{this.wirkstoff}}{{#if this.staerke}} {{this.staerke}}{{/if}}{{#if this.schema}} {{this.schema}}{{/if}}\n{{/each}}{{#if therapieempfehlung_text}}{{therapieempfehlung_text}}{{/if}}' },
    { id: 'procedere', title: 'Procedere', order: 8, visibleIf: 'procedere_zusatz not empty', template: PROCEDERE_ZUSATZ },
  ],
};

/* ================================================================== */
/* T12 – EPU bei Vorhofflimmern                                        */
/* ================================================================== */

const epuBeiVhf = {
  id: 'epu_bei_vhf',
  title: 'EPU bei Vorhofflimmern',
  group: 'Rhythmologie',
  source: `${QUELLE_T} – „EPU bei VHF"`,
  description: 'Einzige Vorlage mit vorformuliertem Anamnese-Absatz. Der Kurzbefund lautet hier „arrhythmisch".',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'vhf',
      title: 'Vorhofflimmern',
      fields: [
        {
          key: 'vhf_typ',
          label: 'Typ',
          type: 'select',
          required: true,
          default: 'Persistierendes',
          options: [
            { value: 'Paroxysmales', label: 'Paroxysmales Vorhofflimmern' },
            { value: 'Persistierendes', label: 'Persistierendes Vorhofflimmern' },
          ],
        },
        FELD_EHRA,
        FELD_CHA2DS2VASC,
        {
          key: 'aktueller_rhythmus',
          label: 'Aktueller Rhythmus',
          type: 'select',
          required: true,
          default: 'Vorhofflimmern',
          options: ['Vorhofflimmern', 'Sinusrhythmus'],
        },
      ],
    },
    {
      id: 'prozedur',
      title: 'Prozedur',
      fields: [
        { key: 'epu_datum', label: 'Datum der EPU', type: 'date', required: true },
        {
          key: 'ablation_art',
          label: 'Ablationsverfahren',
          type: 'select',
          required: true,
          default: 'Kryoablation',
          options: ['Kryoablation', 'Radiofrequenzablation', 'Pulsed Field Ablation'],
        },
        { key: 'tee_datum', label: 'Datum der TEE', type: 'date' },
        {
          key: 'punktion_seite',
          label: 'Punktionsstelle',
          type: 'select',
          required: true,
          default: 'rechten',
          options: [{ value: 'rechten', label: 'rechte Leiste' }, { value: 'linken', label: 'linke Leiste' }],
        },
        {
          key: 'anamnese_vorlage',
          label: 'Vorformulierten Anamnese-Absatz verwenden',
          type: 'checkbox',
          default: true,
          help: 'Beleg: „Die Aufnahme erfolgte zur Pulmonalvenenisolation (Kryoablation). … Bereits im letzten Aufenthalt war die PVI geplant …"',
        },
        { key: 'pvi_verschoben', label: 'PVI war zuvor verschoben worden', type: 'checkbox', visibleIf: 'anamnese_vorlage' },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `- {{vhf_typ}} Vorhofflimmern, EHRA {{ehra}}, CHA2DS2-Vasc-Score {{cha2ds2vasc}}, aktuell {{aktueller_rhythmus}}
  - EPU vom {{epu_datum | date}} erfolgreiche {{ablation_art}}, aktuell {{aktueller_rhythmus}}`,
    },
    { id: 'risikofaktoren', title: 'Kardiovaskuläre Risikofaktoren', order: 2, visibleIf: 'kv_risikofaktoren not empty', template: '{{#each kv_risikofaktoren}}- {{this}}\n{{/each}}' },
    { id: 'vordiagnosen', title: 'Relevante Vordiagnosen', order: 3, visibleIf: 'vordiagnosen not empty', template: '{{#each vordiagnosen}}- {{this.text}}\n{{/each}}' },
    {
      id: 'anamnese',
      title: 'Anamnese',
      order: 4,
      visibleIf: 'anamnese_vorlage or anamnese not empty',
      template: `{{#if anamnese_vorlage}}
Die Aufnahme erfolgte zur Pulmonalvenenisolation ({{ablation_art}}). {{anrede_name}} klagt über eine einschränkende Belastbarkeit und Belastungsdyspnoe durch das bekannte Vorhofflimmern beziehungsweise im Rahmen {{patient_poss_gen}} hypertensiven Herzerkrankung.
{{#if pvi_verschoben}}
Bereits im letzten Aufenthalt war die PVI geplant, wurde nach der Koronarangiografie mit DES Implantation auf einen späteren Termin verschoben.
{{/if}}
{{/if}}
{{#if anamnese}}
{{anamnese}}
{{/if}}`,
    },
    {
      id: 'untersuchung',
      title: 'Körperlicher Untersuchungsbefund',
      order: 5,
      visibleIf: 'ku_variante not empty',
      template: '{{alter}}-{{jaehriger}} {{patient_wort}} in gutem Allgemein- und normalem Ernährungszustand (Größe {{groesse_cm}} cm, Gewicht {{gewicht_kg}} kg). Cor: auskultatorisch rein, {{ku_rhythmus}}; Pulmo: vesikuläres Atemgeräusch, keine Rasselgeräusche; Fuß- und Leistenpulse gut tastbar, keine Jugularvenenstauung; keine peripheren Ödeme; keine Zyanose; Abdomen: weich, kein Druckschmerz, keine Resistenzen; neurologisch orientierend kein fokal-neurologisches Defizit.',
    },
    {
      id: 'befunde',
      title: 'Befunde',
      order: 6,
      visibleIf: 'ekg_aufnahme not empty or echo_befund not empty or weitere_befunde not empty or tee_datum not empty',
      template: `{{#if ekg_aufnahme}}
12 Kanal EKG:
{{ekg_aufnahme}}
{{/if}}
{{#if tee_datum}}
Transösophageale Echokardiografie vom {{tee_datum | date}}
{{/if}}
{{#if echo_befund}}
TTE:
{{echo_befund}}
{{/if}}
{{#if weitere_befunde}}
{{weitere_befunde}}
{{/if}}`,
    },
    {
      id: 'verlauf',
      title: 'Therapie und Verlauf',
      order: 7,
      template: `Nach Ausschluss intrakavitärere Thromben mittel TEE erfolgte die komplikationslose EPU am {{epu_datum | date}}.
Postinterventionell konnte ein Perikarderguss ausgeschlossen werden. Die Punktionsstelle in der {{punktion_seite}} Leiste zeigte sich blande bei geringem lokalem Hämatom.
Wir entlassen {{patient_akk}} am {{entlass_datum | date}} in Ihre geschätzte Haus- und fachärztliche Weiterbehandlung.`,
    },
    { id: 'therapieempfehlung', title: 'Therapieempfehlung', order: 8, visibleIf: 'medikation not empty or therapieempfehlung_text not empty', template: '{{#each medikation}}- {{this.wirkstoff}}{{#if this.staerke}} {{this.staerke}}{{/if}}{{#if this.schema}} {{this.schema}}{{/if}}\n{{/each}}{{#if therapieempfehlung_text}}{{therapieempfehlung_text}}{{/if}}' },
    { id: 'procedere', title: 'Procedere', order: 9, visibleIf: 'procedere_zusatz not empty', template: PROCEDERE_ZUSATZ },
  ],
};

export default [pvi, epuSonstige, kardioversionStationaer, taaVorhofflimmern, kardioversionAmbulant, epuBeiVhf];
