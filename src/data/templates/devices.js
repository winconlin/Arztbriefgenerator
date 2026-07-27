/**
 * Vorlagen der Gruppe "Devices" (Schrittmacher, CRT-D).
 *
 * Quellen: Musterarztbriefe_Med._I.docx („Schrittmacherimplantation") und
 * Textbausteine_Kardio.docx („Schrittmacher", „CRT-D").
 */

import { PROCEDERE_ZUSATZ, SHARED_GROUPS_KURZFORM, SHARED_GROUPS_LANGFORM, langformRahmen } from '../sectionBlocks.js';

const QUELLE_M = 'Musterarztbriefe_Med._I.docx';
const QUELLE_T = 'Textbausteine_Kardio.docx';

const ENTLASSSATZ_M = 'Wir entlassen {{anrede_name_akk}} am {{entlass_datum | dateShort}} in {{entlass_az}} Allgemeinzustand in {{patient_poss}} häusliches Umfeld und ihre weitere fachärztliche Betreuung.';

/**
 * Kontaktangabe der Ambulanz – woertlich aus dem Quelldokument.
 * Die abweichende Schreibweise "Chefarztsekreteriat" (Schrittmacher) bzw.
 * "Chefarztsekretariat" (CRT-D) ist im Original so vorhanden und bleibt je
 * Vorlage unveraendert.
 */
const AMBULANZ_SM = 'RoMed Klinikum Rosenheim, Medizinische Klinik I, Kardiologie, Tel. Chefarztsekreteriat 08031/365 3101';
const AMBULANZ_ICD = 'RoMed Klinikum Rosenheim, Medizinische Klinik I, Kardiologie, Tel. Chefarztsekretariat 08031/365 3101';

const FELD_KAMMERN = {
  key: 'kammer_anzahl',
  label: 'Kammern',
  type: 'select',
  required: true,
  default: 'Zwei',
  options: [
    { value: 'Ein', label: 'Einkammersystem' },
    { value: 'Zwei', label: 'Zweikammersystem' },
    { value: 'Drei', label: 'Dreikammersystem' },
  ],
};

/* ================================================================== */
/* M7 – Schrittmacherimplantation (Hausstandard)                       */
/* ================================================================== */

const schrittmacher = {
  id: 'schrittmacher',
  title: 'Schrittmacherimplantation',
  group: 'Devices',
  source: `${QUELLE_M} – „Schrittmacherimplantation"`,
  description: 'Kompakter Hausstandard zur Schrittmacherimplantation mit Erstkontrolltermin.',
  sharedGroups: SHARED_GROUPS_KURZFORM,
  fieldGroups: [
    {
      id: 'indikation',
      title: 'Indikation',
      fields: [
        {
          key: 'indikation',
          label: 'Rhythmusstörung',
          type: 'select',
          required: true,
          default: 'AV-Block',
          options: [
            { value: 'SA-Block', label: 'SA-Block' },
            { value: 'AV-Block', label: 'AV-Block' },
            { value: 'Bradykardie-Tachykardie-Syndrom', label: 'Bradykardie-Tachykardie-Syndrom' },
          ],
        },
        {
          key: 'block_grad',
          label: 'Grad',
          type: 'select',
          options: ['I°', 'II°', 'III°'],
          visibleIf: 'indikation == "SA-Block" or indikation == "AV-Block"',
        },
      ],
    },
    {
      id: 'implantation',
      title: 'Implantation',
      fields: [
        FELD_KAMMERN,
        { key: 'sm_modus', label: 'Modus', type: 'text', required: true, placeholder: 'z. B. DDD' },
        { key: 'sm_firma', label: 'Firma / Aggregat', type: 'text', required: true },
        { key: 'sm_sn', label: 'Seriennummer (SN)', type: 'text', required: true },
        { key: 'implantation_datum', label: 'Implantationsdatum', type: 'date', required: true },
      ],
    },
    {
      id: 'nachsorge',
      title: 'Nachsorge',
      fields: [
        { key: 'kontrolle_datum', label: 'Erstkontrolle Schrittmacherambulanz', type: 'date', required: true },
        { key: 'kontrolle_uhrzeit', label: 'Uhrzeit', type: 'time', required: true },
        { key: 'oak_pause_tage', label: 'OAK pausieren für', type: 'number', unit: 'Tage' },
        { key: 'oak_wiederbeginn', label: 'Wiederbeginn OAK ab', type: 'date', visibleIf: 'oak_pause_tage not empty' },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnosen',
      order: 1,
      template: `Symptomatischer {{indikation}}{{#if block_grad}} {{block_grad}}{{/if}}
- Aktuell: Implantation eines {{kammer_anzahl}}-Kammer-Schrittmachers ({{sm_modus}}, {{sm_firma}}, SN: {{sm_sn}}) am {{implantation_datum | dateShort}}`,
    },
    {
      id: 'epikrise',
      title: 'Epikrise',
      order: 2,
      template: `{{anrede_name}} wurde mit symptomatischer Rhythmusstörung ({{indikation}}{{#if block_grad}} {{block_grad}}{{/if}}) stationär aufgenommen.
Es erfolgte die komplikationslose Implantation eines {{kammer_anzahl}}-Kammerschrittmacher ({{sm_modus}}, {{sm_firma}}, SN: {{sm_sn}}) am {{implantation_datum | dateShort}}. Postinterventionell lässt sich radiomorphologisch eine korrekte Aggregats- und Sondenlage ohne Anhalt für Pneumothorax abgrenzen. Eine abschließende Device-Kontrolle zeigt eine korrekte Funktion bei unauffälligen Sondenmesswerten. Wir bitten um ambulante Wundkontrolle und Fadenzug in 8-10 Tagen.
Ein Termin zur Erstkontrolle in unserer Schrittmacherambulanz wurde wie untenstehend vereinbart.
{{#if oak_pause_tage}}
Die orale Antikoagulation sollte für {{oak_pause_tage}} Tage nach Implantation pausiert werden.
{{/if}}
${ENTLASSSATZ_M}`,
    },
    {
      id: 'procedere',
      title: 'Procedere',
      order: 3,
      template: `- Wiedervorstellung zur Erstkontrolle in unserer Schrittmacherambulanz am {{kontrolle_datum | dateShortYear}}, {{kontrolle_uhrzeit | time}} Uhr; bitte Überweisungsschein ausstellen
{{#if oak_wiederbeginn}}
- Wiederbeginn OAK ab {{oak_wiederbeginn | dateShort}}
{{/if}}
${PROCEDERE_ZUSATZ}`,
    },
  ],
};

/* ================================================================== */
/* T3 – Schrittmacher (Langform)                                       */
/* ================================================================== */

const schrittmacherLangform = {
  id: 'schrittmacher_langform',
  title: 'Schrittmacherimplantation (Langform)',
  group: 'Devices',
  source: `${QUELLE_T} – „Schrittmacher"`,
  description: 'Ausführliche Fassung mit Fahrverbot, Aggregat-Ausweis und Kontaktangabe der Schrittmacherambulanz.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'indikation',
      title: 'Indikation',
      fields: [
        {
          key: 'indikationen',
          label: 'Indikationen',
          type: 'multiselect',
          required: true,
          options: [
            'symptomatischem AV-Block III° mit Kammerersatzrhythmus',
            'Sick-Sinus-Syndrom',
            'teils kurzen Tachyarrhythmien i.S. von paroxysmalem Vorhofflimmern',
          ],
          help: 'Belegstelle: Diagnose- und Verlaufssatz der Vorlage „Schrittmacher".',
        },
        {
          key: 'sss_frequenz',
          label: 'Frequenzen bis',
          type: 'number',
          unit: '/min',
          visibleIf: 'indikationen contains "Sick-Sinus-Syndrom"',
          help: 'Beleg: „mit Frequenzen bis xx/min und präsynkopalen Zuständen".',
        },
      ],
    },
    {
      id: 'implantation',
      title: 'Implantation',
      fields: [
        FELD_KAMMERN,
        {
          key: 'sm_firma',
          label: 'Firma / Aggregat',
          type: 'select',
          required: true,
          allowCustom: true,
          default: 'St. Jude Medical',
          options: ['St. Jude Medical', 'Medtronic'],
        },
        { key: 'sm_modus', label: 'Modus', type: 'text', required: true },
        { key: 'sm_sn', label: 'Seriennummer (SN)', type: 'text', required: true },
        { key: 'implantation_datum', label: 'Implantationsdatum', type: 'date', required: true },
        { key: 'kontrolle_device_datum', label: 'Datum der Schrittmacherkontrolle', type: 'date' },
      ],
    },
    {
      id: 'nachsorge',
      title: 'Nachsorge',
      fields: [
        { key: 'kontrolle_datum', label: 'Ambulanztermin', type: 'date', required: true },
        { key: 'kontrolle_uhrzeit', label: 'Uhrzeit', type: 'time', required: true },
        {
          key: 'fahrverbot',
          label: 'Fahrverbot',
          type: 'select',
          required: true,
          default: '3 Monate',
          options: ['3 Monate', '6 Monate', '12 Monate', 'lebenslang'],
        },
        { key: 'oak_pause_tage', label: 'Antikoagulantien pausieren für', type: 'number', unit: 'Tage', default: '5' },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: 'Implantation eines {{kammer_anzahl}}-Kammer-Schrittmachers (Firma/Aggregat: {{sm_firma}}, Modus: {{sm_modus}}, SN: {{sm_sn}}) am {{implantation_datum | date}} bei {{indikationen | enum:"sowie"}}{{#if sss_frequenz}} mit Frequenzen bis {{sss_frequenz}}/min und präsynkopalen Zuständen{{/if}}.',
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte zur Implantation eines Schrittmachers bei Nachweis eines {{indikationen | enum:"sowie"}}{{#if sss_frequenz}} mit Frequenzen bis {{sss_frequenz}}/min und präsynkopalen Zuständen{{/if}}.
Am {{implantation_datum | date}} erfolgte die komplikationslose Implantation eines {{kammer_anzahl}}kammerschrittmachers (Firma/Aggregat: {{sm_firma}}, Modus: {{sm_modus}}, SN: {{sm_sn}})
Radiomorphologisch ergab sich im Röntgen-Thorax bei regelrechter Aggregat- und Sondenpositionierung kein Anhalt für einen Pneumothorax.
{{#if kontrolle_device_datum}}
In der Schrittmacherkontrolle vom {{kontrolle_device_datum | date}} zeigte sich eine regelrechte Funktion des Aggregats.
{{/if}}
{{anrede_name}} hat am {{kontrolle_datum | date}} um {{kontrolle_uhrzeit | time}} Uhr einen Termin zur ambulanten Vorstellung zur Schrittmacher-Kontrolle mit hausärztlicher Überweisung in unserer Schrittmacherambulanz (${AMBULANZ_SM}).
Ein Fahrverbot über {{fahrverbot}} ist aus medizinischer Sicht zwingend erforderlich. Ein Aggregat-Ausweis und eine Infobroschüre wurden {{patient_dat}} ausgehändigt.
Das Nahtmaterial sollte bei regelmäßiger Wundkontrolle und Verbandswechsel in ca. 8-10 Tagen entfernt werden.
{{#if oak_pause_tage}}
Für {{oak_pause_tage}} Tage nach Schrittmacherimplantation ist eine Behandlung mit Antikoagulantien zu pausieren.
{{/if}}

Am {{entlass_datum | date}} entließen wir {{patient_akk}} in kardiopulmonal stabilem und beschwerdefreiem Zustand wieder in Ihre geschätzte ambulante ärztliche Weiterbehandlung und stehen für Rückfragen gerne zur Verfügung.`,
    procedere: `- Nach regelmäßigen Wundkontrollen und Verbandswechsel, Entfernung des Nahtmaterials 8-10 Tage postoperativ.
{{#if oak_pause_tage}}
- Für {{oak_pause_tage}} Tage nach Schrittmacherimplantation Antikoagulantien pausieren.
{{/if}}
- Schrittmacherkontrolle am {{kontrolle_datum | date}} in unserer Schrittmacherambulanz mit hausärztlicher Überweisung.`,
  }),
};

/* ================================================================== */
/* T4 – CRT-D-Implantation                                             */
/* ================================================================== */

const crtD = {
  id: 'crt_d',
  title: 'CRT-D-Implantation',
  group: 'Devices',
  source: `${QUELLE_T} – „CRT-D"`,
  description: 'Elektive CRT-D-Implantation bei hochgradig eingeschränkter LV-Funktion und breitem Linksschenkelblock.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'device',
      title: 'Device',
      fields: [
        { key: 'aggregat', label: 'Firma / Aggregat', type: 'text', required: true, placeholder: 'z. B. Quadra Assura/Jude Medical' },
        { key: 'sn', label: 'Seriennummer (SN)', type: 'text', required: true },
        { key: 'implantation_datum', label: 'Implantationsdatum', type: 'date', required: true },
        { key: 'kontrolle_device_datum', label: 'Datum der Defibrillatorkontrolle', type: 'date' },
      ],
    },
    {
      id: 'grunderkrankung',
      title: 'Grunderkrankung',
      fields: [
        {
          key: 'kardiomyopathie_dd',
          label: 'Kardiomyopathie DD',
          type: 'multiselect',
          required: true,
          default: ['dilatativ', 'ischämisch'],
          options: ['dilatativ', 'ischämisch'],
        },
      ],
    },
    {
      id: 'nachsorge',
      title: 'Nachsorge',
      fields: [
        { key: 'kontrolle_datum', label: 'Ambulanztermin', type: 'date', required: true },
        { key: 'kontrolle_uhrzeit', label: 'Uhrzeit', type: 'time', required: true },
        { key: 'remarcumarisierung_datum', label: 'Beginn der Remarcumarisierung', type: 'date' },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: `- Implantation eines CRT-D-Systems (Firma/Aggregat: {{aggregat}}, SN: {{sn}}) bei
  - Kardiomyopathie DD {{kardiomyopathie_dd | join:" DD "}}`,
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte am {{aufnahme_datum | date}} zur elektiven CRT-D-Implantation bei hochgradig eingeschränkter linksventrikulärer Pumpfunktion und Asynchronie bei einem breiten Linksschenkelblock.
Am {{implantation_datum | date}} erfolgte die komplikationslose Implantation des CRT-D-Systems.
Radiomorphologisch ergab sich im Röntgen-Thorax kein Anhalt für einen Pneumothorax sowie eine korrekte Sondenlage.
{{#if kontrolle_device_datum}}
In der Schrittmacher-/Defibrillatorkontrolle vom {{kontrolle_device_datum | date}} zeige sich eine regelrechte Funktion des Aggregats.
{{/if}}
{{anrede_name}} hat am {{kontrolle_datum | date}} um {{kontrolle_uhrzeit | time}} Uhr einen Termin zur ambulanten Vorstellung zur Defibrillator-Kontrolle mit hausärztlicher Überweisung in unserer Defibrillatorambulanz (${AMBULANZ_ICD}).
Das Nahtmaterial sollte bei regelmäßiger Wundkontrolle und Verbandswechsel in ca. 8-10 Tagen entfernt werden.

Am {{entlass_datum | date}} entlassen wir {{patient_akk}} in stabilem und beschwerdefreiem Zustand wieder in Ihre geschätzte ambulante ärztliche Weiterbehandlung und stehen für Rückfragen gerne zur Verfügung.`,
    procedere: `- Nach regelmäßigen Wundkontrollen Entfernung des Nahtmaterials in 8-10 Tagen.
{{#if remarcumarisierung_datum}}
- Beginn der Remarcumarisierung ab dem {{remarcumarisierung_datum | date}}
{{/if}}
- Schrittmacher-/Defibrillatorkontrolle am {{kontrolle_datum | date}} in unserer Schrittmacherambulanz mit hausärztlicher Überweisung (${AMBULANZ_ICD})`,
  }),
};

export default [schrittmacher, schrittmacherLangform, crtD];
