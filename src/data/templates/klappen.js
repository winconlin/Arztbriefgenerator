/**
 * Vorlagen der Gruppe "Klappenvitien".
 *
 * Quellen: Musterarztbriefe_Med._I.docx („Aortenklappenstenose/TAVI") und
 * Textbausteine_Kardio.docx („Klappenoperation").
 *
 * Die genannten Kooperationspartner (Radiologisches Zentrum Rosenheim,
 * Deutsches Herzzentrum München, Schön Klinik Vogtareuth) stehen so in den
 * Quelldokumenten und sind daher fest hinterlegt.
 */

import { PROCEDERE_ZUSATZ, SHARED_GROUPS_KURZFORM, SHARED_GROUPS_LANGFORM, langformRahmen } from '../sectionBlocks.js';

const QUELLE_M = 'Musterarztbriefe_Med._I.docx';
const QUELLE_T = 'Textbausteine_Kardio.docx';

/* ================================================================== */
/* M6 – Aortenklappenstenose / TAVI                                    */
/* ================================================================== */

const aortenklappenstenoseTavi = {
  id: 'aortenklappenstenose_tavi',
  title: 'Aortenklappenstenose / TAVI',
  group: 'Klappenvitien',
  source: `${QUELLE_M} – „Aortenklappenstenose/TAVI"`,
  description: 'Hochgradige Aortenklappenstenose mit Indikation zur TAVI, ambulantem TAVI-CT und Heart-Team-Vorstellung.',
  sharedGroups: SHARED_GROUPS_KURZFORM,
  fieldGroups: [
    {
      id: 'klappe',
      title: 'Klappenbefund',
      fields: [
        { key: 'koef', label: 'KÖF', type: 'number', unit: 'cm²', step: '0.1', required: true, help: 'Beleg: „KÖF: 0,X cm²". Dezimalpunkt eingeben – die Ausgabe erfolgt mit Komma.' },
        { key: 'pmean', label: 'pmean', type: 'number', unit: 'mmHg', required: true },
        {
          key: 'aufnahmegrund',
          label: 'Aufnahmegrund',
          type: 'select',
          required: true,
          default: 'Belastungsdyspnoe',
          options: ['Belastungsdyspnoe', 'dekompensierter Herzinsuffizienz'],
        },
        {
          key: 'indikationsgrund',
          label: 'Indikationsgrund',
          type: 'select',
          required: true,
          default: 'der Symptome',
          options: [
            { value: 'der Symptome', label: 'Symptome' },
            { value: 'der eingeschränkten Linksventrikulären Funktion', label: 'Eingeschränkte linksventrikuläre Funktion' },
          ],
        },
        {
          key: 'tavi_grund',
          label: 'Begründung für das interventionelle Verfahren',
          type: 'select',
          required: true,
          default: 'des fortgeschrittenen Patientenalters',
          options: [
            { value: 'des fortgeschrittenen Patientenalters', label: 'Fortgeschrittenes Patientenalter' },
            { value: 'der ausgeprägten Komorbiditäten (Frailty-Syndrom)', label: 'Ausgeprägte Komorbiditäten (Frailty-Syndrom)' },
          ],
        },
      ],
    },
    {
      id: 'khk',
      title: 'Begleitende KHK',
      fields: [
        { key: 'khk_vorhanden', label: 'Chronisches Koronarsyndrom vorhanden', type: 'checkbox' },
        {
          key: 'gefaesserkrankung',
          label: 'Gefäßerkrankung',
          type: 'select',
          options: [
            { value: '1', label: '1-Gefäßerkrankung' },
            { value: '2', label: '2-Gefäßerkrankung' },
            { value: '3', label: '3-Gefäßerkrankung' },
          ],
          visibleIf: 'khk_vorhanden',
        },
        { key: 'koro_befund', label: 'Koronarangiographischer Befund', type: 'multiline', rows: 2, visibleIf: 'khk_vorhanden' },
      ],
    },
    {
      id: 'termine',
      title: 'Termine',
      fields: [
        { key: 'tavi_ct_datum', label: 'Ambulantes TAVI-CT (Radiologisches Zentrum Rosenheim)', type: 'date', required: true },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `Hochgradige Aortenklappenstenose mit Indikation zur TAVI
- KÖF: {{koef | num}} cm², pmean {{pmean}}mmHg
{{#if khk_vorhanden}}
Chronisches Koronarsyndrom bei {{gefaesserkrankung}}-Gefäßerkrankung
{{/if}}`,
    },
    {
      id: 'epikrise',
      title: 'Epikrise',
      order: 2,
      template: `{{anrede_name}} stellte sich mit {{aufnahmegrund}} stationär vor. Echokardiographisch imponiert eine hochgradige Aortenklappenstenose (KÖF {{koef | num}}cm²), angesichts {{indikationsgrund}} stellt sich die Indikation zum Aortenklappenersatz. Die weiteren OP-Vorbereitungen wurden wie obenstehend durchgeführt, angesichts {{tavi_grund}} wurde die Indikation zum interventionellen Klappenersatz gestellt.{{#if khk_vorhanden}} Koronarangiographisch zeigt sich eine {{gefaesserkrankung}}-Gefäßerkrankung{{#if koro_befund}} mit {{koro_befund}}{{/if}}{{/if}}
Eine ambulante TAVI-CT wurde im Radiologischen Zentrum Rosenheim wie untenstehend vereinbart. Ein Termin im Deutschen Herzzentrum München zur Heart-Team-Vorstellung und ggf. TAVI wird durch uns vereinbart und {{anrede_name_dat}} telefonisch mitgeteilt.
Wir entlassen {{anrede_name_akk}} am {{entlass_datum | dateShort}} in {{entlass_az}} Allgemeinzustand in {{patient_poss}} häusliches Umfeld und ihre weitere fachärztliche Betreuung.`,
    },
    {
      id: 'procedere',
      title: 'Procedere',
      order: 3,
      template: `- Ambulantes TAVI-CT am radiologischen Zentrum Rosenheim am {{tavi_ct_datum | date}}
- Terminmitteilung am Deutschen Herzzentrum München erfolgt durch unser Sekretariat
${PROCEDERE_ZUSATZ}`,
    },
  ],
};

/* ================================================================== */
/* T9 – Klappenoperation (operativer Ersatz, Verlegung)                */
/* ================================================================== */

const klappenoperation = {
  id: 'klappenoperation',
  title: 'Klappenoperation (operativer Ersatz)',
  group: 'Klappenvitien',
  source: `${QUELLE_T} – „Klappenoperation"`,
  description: 'Symptomatisch hochgradige Aortenklappenstenose mit Indikation zur operativen Versorgung und Verlegung.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'klappe',
      title: 'Klappenbefund',
      fields: [
        {
          key: 'klappe',
          label: 'Vitium',
          type: 'select',
          required: true,
          allowCustom: true,
          default: 'Aortenklappenstenose',
          options: ['Aortenklappenstenose'],
          help: 'Belegwert der Vorlage. Andere Vitien können als Freitext ergänzt werden.',
        },
        { key: 'koef', label: 'KÖF', type: 'number', unit: 'cm²', step: '0.1', required: true },
        { key: 'ef_prozent', label: 'EF', type: 'number', unit: '%', required: true },
        { key: 'lv_funktion', label: 'LV-Funktion', type: 'text', placeholder: 'z. B. normale' },
        { key: 'diast_funktion', label: 'Diastolische Funktion', type: 'text', placeholder: 'z. B. gestörte' },
      ],
    },
    {
      id: 'verlauf_felder',
      title: 'Verlauf',
      fields: [
        { key: 'aufnahmegrund', label: 'Aufnahmegrund', type: 'text', required: true, default: 'Schwindel und präsynkopalen Ereignissen' },
        {
          key: 'auskultation',
          label: 'Systolikum auskultiert',
          type: 'checkbox',
          default: true,
          help: 'Beleg: „Systolikum mit Punktum maximum im 2.ICR parasternal rechts ohne eindeutige Fortleitung".',
        },
        { key: 'echo_klappe', label: 'Echokardiographischer Befund', type: 'multiline', rows: 2 },
        { key: 'koro_befund', label: 'Koronarangiographischer Befund', type: 'multiline', rows: 2 },
      ],
    },
    {
      id: 'op',
      title: 'Operation und Vorbereitung',
      fields: [
        { key: 'aufnahme_extern_datum', label: 'Aufnahmetermin Schön Klinik Vogtareuth', type: 'date', required: true },
        { key: 'op_datum', label: 'Datum der Klappenoperation', type: 'date', required: true },
        { key: 'verlegung_datum', label: 'Verlegungsdatum', type: 'date', required: true },
        { key: 'praeop_rx_thorax', label: 'Röntgen-Thorax ohne pulmonalvenöse Stauung', type: 'checkbox', default: true },
        { key: 'praeop_nnh', label: 'Nasennebenhöhlen ohne floride Sinusitis', type: 'checkbox', default: true },
        { key: 'praeop_abdomen', label: 'Abdomensonographie unauffällig', type: 'checkbox', default: true },
        { key: 'praeop_lufu', label: 'Lungenfunktionsdiagnostik unauffällig', type: 'checkbox', default: true },
        { key: 'praeop_zahnarzt', label: 'Zahnärztliche Untersuchung unauffällig', type: 'checkbox', default: true },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: `- Symptomatisch hochgradige {{klappe}} mit Indikation zur operativen Klappenversorgung
  - Echokardiographisch KÖF {{koef | num}} cm2, EF {{ef_prozent}}%{{#if lv_funktion}}, {{lv_funktion}} LV-Funktion{{/if}}{{#if diast_funktion}}, {{diast_funktion}} diastolische Funktion{{/if}}`,
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte aufgrund von {{aufnahmegrund}}.{{#if auskultation}} Auskultatorisch zeigte sich ein Systolikum mit Punktum maximum im 2.ICR parasternal rechts ohne eindeutige Fortleitung.{{/if}}
{{#if echo_klappe}}
Echokardiographisch fand sich eine {{echo_klappe}}
{{/if}}
Es besteht die Indikation zum operativen Klappenersatz, sodass wir eine Koronarangiographie durchführten.{{#if koro_befund}} Hierbei zeigte sich {{koro_befund}}{{/if}}
Die aktuelle Situation, Krankheitsbild und das Procedere wurden mit {{patient_dat}} ausführlich besprochen. Wir vereinbarten einen Aufnahmetermin in der Schön Klinik Vogtareuth am {{aufnahme_extern_datum | date}} zur Klappenoperation am {{op_datum | date}}.
In den präoperativen Vorbereitungsuntersuchungen ergaben sich keine Kontraindikationen für den bevorstehenden Eingriff.
{{#if praeop_rx_thorax or praeop_nnh or praeop_abdomen or praeop_lufu or praeop_zahnarzt}}
{{#if praeop_rx_thorax}}Im Röntgen-Thorax zeigten sich keine Hinweise auf pulmonalvenöse Stauung. {{/if}}{{#if praeop_nnh}}In der Aufnahme der Nasennebenhöhlen ergaben sich keine Hinweise auf eine floride Sinusitis. {{/if}}{{#if praeop_abdomen}}Die Abdomensonographie war unauffällig. {{/if}}{{#if praeop_lufu}}In der Lungenfunktionsdiagnostik zeigten sich keine Auffälligkeiten. {{/if}}{{#if praeop_zahnarzt}}Die zahnärztliche Untersuchung war soweit unauffällig.{{/if}}
{{/if}}

Wir konnten {{patient_akk}} am {{verlegung_datum | date}} in stabilem Allgemeinzustand in die Schön Klinik Vogtareuth verlegen.`,
    procedere: '- Aufnahmetermin in der Schön Klinik Vogtareuth am {{aufnahme_extern_datum | date}} zur Klappenoperation am {{op_datum | date}}',
  }),
};

export default [aortenklappenstenoseTavi, klappenoperation];
