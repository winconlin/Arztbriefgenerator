/**
 * Vorlagen der Gruppen "Herzinsuffizienz", "Gefäße" und "Hypertonie".
 *
 * Quelle: Textbausteine_Kardio.docx („Kardiale Dekompensation",
 * „Lungenarterienembolie", „Hypertensive Krise").
 */

import { langformRahmen, SHARED_GROUPS_LANGFORM } from '../sectionBlocks.js';

const QUELLE_T = 'Textbausteine_Kardio.docx';

const ENTLASSSATZ_T_HAUS = 'Wir entlassen {{patient_akk}} am {{entlass_datum | date}} in gutem Allgemeinzustand in Ihre geschätzte haus-und fachärztliche Weiterbetreuung und stehen bei Rückfragen jederzeit gerne zur Verfügung.';

/* ================================================================== */
/* T5 – Kardiale Dekompensation                                        */
/* ================================================================== */

const kardialeDekompensation = {
  id: 'kardiale_dekompensation',
  title: 'Kardiale Dekompensation',
  group: 'Herzinsuffizienz',
  source: `${QUELLE_T} – „Kardiale Dekompensation"`,
  description: 'Dekompensierte Herzinsuffizienz. Der Verlaufsabsatz wechselt je nach Ansprechen auf die diuretische Therapie.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'diagnose',
      title: 'Diagnose',
      fields: [
        {
          key: 'grunderkrankung',
          label: 'Dekompensierte Herzinsuffizienz bei',
          type: 'text',
          required: true,
          placeholder: 'z. B. ischämischer Kardiomyopathie',
        },
      ],
    },
    {
      id: 'verlauf_felder',
      title: 'Verlauf',
      fields: [
        { key: 'ntprobnp', label: 'NT-pro-BNP', type: 'number', unit: 'pg/ml' },
        {
          key: 'diurese_verlauf',
          label: 'Ansprechen auf die diuretische Therapie',
          type: 'radio',
          required: true,
          default: 'forciert',
          options: [
            { value: 'forciert', label: 'Gutes Ansprechen unter forcierter diuretischer Therapie' },
            { value: 'perfusor', label: 'Ungenügendes Ansprechen auf Furosemid i.v. → Perfusor' },
          ],
        },
        { key: 'entlassgewicht', label: 'Entlassgewicht', type: 'number', unit: 'kg', required: true },
        {
          key: 'mobilisiert_kg',
          label: 'Insgesamt mobilisiert',
          type: 'number',
          unit: 'kg',
          visibleIf: 'diurese_verlauf == "perfusor"',
        },
        {
          key: 'umstellung_torasemid',
          label: 'Umstellung auf Torasemid',
          type: 'checkbox',
          visibleIf: 'diurese_verlauf == "perfusor"',
        },
        {
          key: 'lvef_grad',
          label: 'Einschränkung der LVEF',
          type: 'select',
          options: [
            { value: 'leicht', label: 'leichtgradig' },
            { value: 'mittel', label: 'mittelgradig' },
            { value: 'hoch', label: 'hochgradig' },
          ],
          help: 'Beleg: „XXgradig eingeschränkte LVEF bei…."',
        },
        { key: 'lvef_zusatz', label: 'Ergänzung zum Echobefund', type: 'text', visibleIf: 'lvef_grad not empty' },
        { key: 'lz_ekg_unauffaellig', label: 'LZ-EKG: durchgehender Sinusrhythmus', type: 'checkbox' },
        { key: 'lz_rr_normoton', label: 'LZ-RR: normotensive Werte', type: 'checkbox' },
        {
          key: 'troponin_auslenkung',
          label: 'Dezente Troponin-T-Auslenkung',
          type: 'checkbox',
          help: 'Beleg: „… ist im Rahmen der Dekompensation zu werten."',
        },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: '- Dekompensierte Herzinsuffizienz bei {{grunderkrankung}}',
    verlaufTitel: 'Therapie & Verlauf',
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte bei kardialer Dekompensation verbunden mit Dyspnoe. Radiologisch imponierte eine pulmonalvenöse Stauung und in der körperlichen Untersuchung waren deutliche Beinödeme nachweisbar.
{{#if ntprobnp}}
Das NT-pro-BNP lag bei {{ntprobnp}}.
{{/if}}
{{#if diurese_verlauf == "forciert"}}
Unter einer forcierten diuretischen Therapie konnten eine deutliche Beschwerdebesserung und eine gute Negativbilanz (Entlassgewicht: {{entlassgewicht}} kg) erzielt werden.
{{#else}}
Eine gesteigerte diuretische Therapie mit Furosemid i.v. bewirkte ein ungenügendes Ansprechen, sodass eine Furosemid-Gabe mittels Perfusore eingeleitet wurde. Hierunter konnten eine deutliche Beschwerdebesserung und eine gute Negativbilanz (Entlassgewicht: {{entlassgewicht}} kg) erzielt werden.{{#if mobilisiert_kg}} Insgesamt konnte {{mobilisiert_kg}} kg mobilisiert werden.{{/if}}{{#if umstellung_torasemid}} Wir stellten im Verlauf auf Torasemid um.{{/if}}
{{/if}}
{{#if lvef_grad}}
Echokardiographisch zeigte sich eine {{lvef_grad}}gradig eingeschränkte LVEF{{#if lvef_zusatz}} bei {{lvef_zusatz}}{{/if}}
{{/if}}
{{#if lz_ekg_unauffaellig or lz_rr_normoton}}

{{#if lz_ekg_unauffaellig}}Im LZ-EKG stellte sich ein durchgehender Sinusrhythmus ohne höhergradige Rhythmusstörungen dar. {{/if}}{{#if lz_rr_normoton}}Ein LZ-RR zeigte normotensive Werte.{{/if}}
{{/if}}
{{#if troponin_auslenkung}}
Die dezente Troponin-T-Auslenkung ist im Rahmen der Dekompensation zu werten.
{{/if}}
Wir empfehlen tägliche Gewichtskontrollen und eine maximale tägliche Flüssigkeitszufuhr von 1,5 l.

Am {{entlass_datum | date}} konnten wir {{patient_akk}} in stabilem und beschwerdefreiem Zustand wieder in Ihre geschätzte ambulante ärztliche Weiterbehandlung entlassen und stehen für Rückfragen gerne zur Verfügung.`,
    procedere: `- Regelmäßige Nierenretentionsparameter- und Elektrolytkontrollen unter diuretischer Therapie
- Tägliche Gewichtskontrollen
- Tägliche Flüssigkeitszufuhr von max. 1,5 L
- Ausreizen der Herzinsuffizienztherapie`,
  }),
};

/* ================================================================== */
/* T7 – Lungenarterienembolie                                          */
/* ================================================================== */

const lungenarterienembolie = {
  id: 'lungenarterienembolie',
  title: 'Lungenarterienembolie',
  group: 'Gefäße',
  source: `${QUELLE_T} – „Lungenarterienembolie"`,
  description: 'Lungenarterienembolie mit CT-Nachweis, stufenweiser Antikoagulation und Dauerempfehlung nach Provokationsstatus.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'diagnose',
      title: 'Diagnose',
      fields: [
        {
          key: 'lae_lokalisation',
          label: 'Lokalisation',
          type: 'select',
          required: true,
          allowCustom: true,
          default: 'Beidseitige',
          options: [
            { value: 'Beidseitige', label: 'Beidseitig' },
            { value: 'Rechtsseitige', label: 'Rechtsseitig' },
            { value: 'Linksseitige', label: 'Linksseitig' },
          ],
        },
        { key: 'erstdiagnose', label: 'Erstdiagnose (ED)', type: 'checkbox', default: true },
        {
          key: 'reitender_thrombus_seite',
          label: 'Reitender Thrombus in der A. pulmonalis',
          type: 'select',
          options: [
            { value: '', label: '– kein reitender Thrombus –' },
            { value: 'rechten', label: 'rechts' },
            { value: 'linken', label: 'links' },
          ],
        },
        { key: 'partialinsuffizienz', label: 'Respiratorische Partialinsuffizienz', type: 'checkbox', default: true },
      ],
    },
    {
      id: 'verlauf_felder',
      title: 'Verlauf',
      fields: [
        {
          key: 'ueberwachung_ort',
          label: 'Überwachung',
          type: 'select',
          options: [
            { value: '', label: '– keine Verlegung –' },
            { value: 'internistische Intensivstation', label: 'Internistische Intensivstation' },
            { value: 'CPU', label: 'CPU' },
          ],
        },
        { key: 'echo_lae', label: 'Echokardiographischer Befund', type: 'multiline', rows: 2 },
        { key: 'tvt_ausgeschlossen', label: 'Tiefe Beinvenenthrombose sonographisch ausgeschlossen', type: 'checkbox' },
        { key: 'oak_substanz', label: 'Orale Antikoagulation', type: 'select', required: true, allowCustom: true, default: 'Apixaban', options: ['Apixaban'] },
        {
          key: 'ereignis_typ',
          label: 'Ereignis',
          type: 'select',
          required: true,
          default: 'unprovozierten',
          options: [
            { value: 'unprovozierten', label: 'unprovoziert' },
            { value: 'provozierten', label: 'provoziert' },
          ],
        },
        {
          key: 'oak_monate',
          label: 'Antikoagulation für',
          type: 'select',
          required: true,
          default: '3',
          options: [{ value: '3', label: '3 Monate' }, { value: '6', label: '6 Monate' }],
        },
        { key: 'kompressionsstruempfe', label: 'Antithrombosestrümpfe Klasse II verordnet', type: 'checkbox', default: true },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: `- {{lae_lokalisation}} Lungenarterienembolie{{#if erstdiagnose}} (ED){{/if}}{{#if reitender_thrombus_seite}} mit reitendem Thrombus in der {{reitender_thrombus_seite}} A. pulmonalis{{/if}}
{{#if partialinsuffizienz}}
  - Respiratorische Partialinsuffizienz
{{/if}}`,
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte bei zunehmender Dyspnoe. Laborchemisch zeigten sich ein erhöhtes D-Dimer und eine respiratorische Partialinsuffizienz. Bei klinischem Verdacht auf eine Lungenarterienembolie führten wir ein Thorax-CT durch. Hierbei konnte eine {{lae_lokalisation | lower}} Lungenarterienembolie{{#if reitender_thrombus_seite}} mit reitendem Thrombus in der {{reitender_thrombus_seite}} A. pulmonalis{{/if}} nachgewiesen werden.
{{#if ueberwachung_ort}}
Zur weiteren Überwachung erfolgte die Verlegung auf die {{ueberwachung_ort}}. Bei kardiopulmonal stabiler Situation konnte {{patient_nom}} schließlich auf Normalstation verlegt werden.
{{/if}}
{{#if echo_lae}}
Echokardiographisch fand sich eine {{echo_lae}}
{{/if}}
{{#if tvt_ausgeschlossen}}
Eine tiefe Beinvenenthrombose konnte sonographisch ausgeschlossen werden.
{{/if}}
Nach einer initialen Heparinisierung mittels Heparinperfusor stellten wir die Antikoagulation im Verlauf auf ein nierdemolekulares Heparin und schlussendlich auf {{oak_substanz}} um.
Bei einem {{ereignis_typ}} Ereignis empfehlen wir eine Antikoagulation für insgesamt {{oak_monate}} Monate.
{{#if kompressionsstruempfe}}
Antithrombosestrümpfe der Klasse II wurden verordnet.
{{/if}}

${ENTLASSSATZ_T_HAUS}`,
    procedere: `- Antikoagulation mit {{oak_substanz}} für insgesamt {{oak_monate}} Monate
{{#if kompressionsstruempfe}}
- Antithrombosestrümpfe der Klasse II
{{/if}}`,
  }),
};

/* ================================================================== */
/* T8 – Hypertensive Krise                                             */
/* ================================================================== */

const hypertensiveKrise = {
  id: 'hypertensive_krise',
  title: 'Hypertensive Krise',
  group: 'Hypertonie',
  source: `${QUELLE_T} – „Hypertensive Krise"`,
  description: 'Hypertensive Entgleisung mit stufenweiser Abklärung sekundärer Ursachen – jeder Abklärungsschritt ist einzeln zuschaltbar.',
  sharedGroups: SHARED_GROUPS_LANGFORM,
  fieldGroups: [
    {
      id: 'diagnose',
      title: 'Diagnose und Akuttherapie',
      fields: [
        { key: 'rr_max', label: 'Blutdruck bis max.', type: 'number', unit: 'mmHg', required: true },
        { key: 'akuttherapie', label: 'Initiale Blutdrucksenkung mit', type: 'text', required: true, placeholder: 'z. B. Urapidil' },
        {
          key: 'therapie_verzichtet',
          label: 'Auf weitere antihypertensive Therapie vorerst verzichtet',
          type: 'checkbox',
          default: true,
        },
        {
          key: 'lz_rr_befund',
          label: 'Langzeit-RR',
          type: 'text',
          required: true,
          default: 'tagsüber leicht hypertone Durchschnittswerte',
        },
      ],
    },
    {
      id: 'abklaerung',
      title: 'Abklärung sekundärer Ursachen',
      description: 'Jeder aktivierte Punkt fügt den zugehörigen Absatz aus der Vorlage ein.',
      fields: [
        { key: 'abklaerung_cushing', label: 'Cushing-Syndrom (Cortisol, ACTH, Dexamethasonhemmtest)', type: 'checkbox' },
        { key: 'abklaerung_phaeo', label: 'Phäochromozytom (Metanephrine im Plasma)', type: 'checkbox' },
        { key: 'abklaerung_nierenarterie', label: 'Nierenarterienstenose (Duplexsonographie)', type: 'checkbox' },
        { key: 'abklaerung_hyperaldo', label: 'Hyperaldosteronismus (Aldosteron/Renin)', type: 'checkbox' },
      ],
    },
  ],
  sections: langformRahmen({
    diagnosen: '- Hypertensive Krise bis max. {{rr_max}} mmHg',
    verlauf: `Die stationäre Aufnahme {{patient_gen}} erfolgte bei hypertensiver Entgleisung. Nach initialer Blutdrucksenkung mit {{akuttherapie}} zeigten sich während des Aufenthaltes in engmaschigen Kontrollen normotone Werte.{{#if therapie_verzichtet}} Auf eine weitere antihypertensive Therapie verzichteten wir deshalb vorerst.{{/if}} Ein Langzeit-RR und Langzeit-EKG-Messung wurde durchgeführt. Im Langzeit-RR ergaben sich {{lz_rr_befund}}. Wir empfehlen eine erneute LZ-RR-Messung in 4 Wochen. Abhängig davon kann ggf. eine antihypertensive Therapie erwogen werden. Ein Langzeit-EKG zeigte keine relevanten Herzrhythmusstörungen.
{{#if abklaerung_cushing or abklaerung_phaeo or abklaerung_nierenarterie or abklaerung_hyperaldo}}
Zur Abklärung möglicher sekundärer Ursachen eines Hypertonus wurden weitere Tests durchgeführt.
{{/if}}
{{#if abklaerung_cushing}}
So wurde zum Ausschluss eines Cushing-Syndroms Cortisol und ACTH bestimmt, sowie eine Dexamethasonhemmtest durchgeführt. Die Ergebnisse waren normwertig.
{{/if}}
{{#if abklaerung_phaeo}}
Zum Ausschluss eines Phächromozytoms bestimmten wir die Metanephrine im Plasma, welche nicht erhöht waren.
{{/if}}
{{#if abklaerung_nierenarterie}}
Eine Nierenarterienstenose konnte duplexsonographisch, bei eingeschränkter Beurteilbarkeit nicht sicher ausgeschlossen werden. Bei weiterem Verdacht auf sekundäre Hypertonie kann, in Abhängigkeit der Verlaufskontrolle der LZ-RR-Messung, diesbezüglich die Durchführung einer MRT-Angiographie im Verlauf erwogen werden.
{{/if}}
{{#if abklaerung_hyperaldo}}
Zur Abklärung eines möglichen Hyperaldosteronismus wurden Aldosteron und Renin bestimmt. Hierbei zeigte sich ein erhöhter Aldosteron-Renin-Quotient, weshalb der Verdacht auf einen primären Hyperaldosteronismus besteht. Wir empfehlen die Durchführung eines Kochsalzbelastungstestes. Die Durchführung eines solchen wäre auch in unserer Abteilung möglich.
{{/if}}

${ENTLASSSATZ_T_HAUS}`,
    procedere: `- Erneute LZ-RR-Messung in 4 Wochen
{{#if abklaerung_hyperaldo}}
- Durchführung eines Kochsalzbelastungstestes
{{/if}}`,
  }),
};

export default [kardialeDekompensation, lungenarterienembolie, hypertensiveKrise];
