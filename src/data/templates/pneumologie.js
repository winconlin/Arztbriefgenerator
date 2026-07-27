/**
 * Vorlagen der Gruppe "Pneumologie / Onkologie".
 *
 * Quelle: Textbausteine_Kardio.docx. Diese Briefe stehen im hinteren Teil des
 * Dokuments und gehoeren nicht zur Kardiologie, sind aber Bestandteil der
 * gelieferten Vorlagen und werden daher vollstaendig uebernommen.
 */

import { PROCEDERE_ZUSATZ, SECTION_BEFUNDE, SECTION_THERAPIEEMPFEHLUNG } from '../sectionBlocks.js';

const QUELLE_T = 'Textbausteine_Kardio.docx';

const BASIS_GRUPPEN = ['stammdaten', 'aufenthalt', 'vordiagnosen', 'anamnese_untersuchung', 'befunde', 'therapieempfehlung', 'procedere_frei'];

/* ================================================================== */
/* T13 – Infektexazerbierte COPD                                       */
/* ================================================================== */

const copdExazerbation = {
  id: 'copd_exazerbation',
  title: 'Infektexazerbierte COPD',
  group: 'Pneumologie',
  source: `${QUELLE_T} – „Infektexacerbierte COPD"`,
  description: 'Infektexazerbation einer bekannten COPD mit Antibiose, Inhalations- und Kortisontherapie.',
  sharedGroups: BASIS_GRUPPEN,
  fieldGroups: [
    {
      id: 'copd',
      title: 'COPD',
      fields: [
        {
          key: 'gold_stadium',
          label: 'GOLD-Stadium',
          type: 'select',
          required: true,
          allowCustom: true,
          default: 'II-III',
          options: ['I', 'II', 'III', 'IV', 'II-III', 'III-IV'],
        },
        { key: 'fev1_liter', label: 'Aktuelle FEV1', type: 'number', unit: 'L', step: '0.01', required: true },
        { key: 'fev1_prozent', label: 'FEV1', type: 'number', unit: '%', step: '0.1', required: true },
        { key: 'emphysem', label: 'Zentrilobuläres Lungenemphysem', type: 'checkbox' },
        { key: 'o2_nacht_lmin', label: 'Nächtliche O2-Substitution', type: 'number', unit: 'l O2/min' },
      ],
    },
    {
      id: 'therapie_felder',
      title: 'Therapie und Verlauf',
      fields: [
        { key: 'antibiose', label: 'Antibiotische Therapie', type: 'select', required: true, allowCustom: true, default: 'Ampicillin/Sulbactam', options: ['Ampicillin/Sulbactam'] },
        { key: 'blutkulturen_negativ', label: 'Blutkulturen ohne Keimwachstum', type: 'checkbox', default: true },
        { key: 'kortison_dosis_aktuell', label: 'Kortison-Tagesdosis bei Entlassung', type: 'number', unit: 'mg' },
        { key: 'kortison_zieldosis', label: 'Zieldosis im Verlauf', type: 'number', unit: 'mg', visibleIf: 'kortison_dosis_aktuell not empty' },
        { key: 'lufu_gebessert', label: 'Lungenfunktion gegenüber Voruntersuchung gebessert', type: 'checkbox', default: true },
        { key: 'torasemid_reduziert', label: 'Torasemiddosis reduziert', type: 'checkbox' },
        { key: 'mobilisation_hilfsmittel', label: 'Mobilisation mit', type: 'text', placeholder: 'z. B. Rollator' },
        { key: 'ahb_ort', label: 'Anschlussheilbehandlung in', type: 'text' },
        { key: 'ahb_datum', label: 'AHB vorgesehen ab', type: 'date', visibleIf: 'ahb_ort not empty' },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Diagnosen',
      order: 1,
      template: `Infektexacerbierte COPD GOLD {{gold_stadium}}, aktuelle FEV1 {{fev1_liter | num}}L ({{fev1_prozent | num}}%)
{{#if emphysem}}
- zentrilobuläres Lungenemphysem
{{/if}}
{{#if o2_nacht_lmin}}
- nächtliche O2-Substitution mit {{o2_nacht_lmin}} l O2/min, tagsüber keine Sauerstofftherapie
{{/if}}
{{#each vordiagnosen}}
- {{this.text}}
{{/each}}`,
    },
    { ...SECTION_BEFUNDE, order: 2 },
    {
      id: 'verlauf',
      title: 'Therapie und Verlauf',
      order: 3,
      template: `Die stationäre Aufnahme {{patient_gen}} erfolgte bei erneuter Infektexacerbation der bekannten COPD. Bei Fieber sowie deutlich erhöhten Infektparametern wurde umgehend eine antibiotische Therapie mit {{antibiose}} eingeleitet, zudem erfolgte eine antiobstruktive Inhalationstherapie begleitet von systemischer antinflammatorischer Therapie.
Hierunter waren die Entzündungsparameter gut rückläufig, der Zustand {{patient_gen}} besserte sich langsam.{{#if blutkulturen_negativ}} In entnommenen Blutkulturen konnte kein Keimwachstum festgestellt werden.{{/if}}{{#if kortison_dosis_aktuell}} Die Kortisontherapie wurde zuletzt auf eine Tagesdosis von {{kortison_dosis_aktuell}}mg reduziert, wir bitten um weitere Reduktion bis {{kortison_zieldosis}}mg im Verlauf.{{/if}}
{{#if lufu_gebessert}}
Lungenfunktionell zeigte sich eine im Vergleich zu den Voruntersuchungen leicht gebesserte Vitalkapazität sowie FEV1.
{{/if}}
{{#if torasemid_reduziert}}
Radiologisch zeigten sich allenfalls Zeichen einer geringen pulmonalvenösen Stauung, das Körpergewicht im Vergleich zum Voraufenthalt jedoch konstant. Die Torasemiddosis wurde im Verlauf reduziert, wir bitten hierunter um regelmäßige Gewichtskontrollen.
{{/if}}
{{#if mobilisation_hilfsmittel}}
Mittels physiotherapeutischer Beübung gelang eine zunehmend gebesserte Mobilisierung {{patient_gen}} am {{mobilisation_hilfsmittel}}.
{{/if}}
Wir konnten {{patient_akk}} am {{entlass_datum | date}} im deutlich gebesserten Allgemeinzustand nach Hause entlassen.{{#if ahb_ort}} Eine Fortsetzung der Anschlussheilbehandlung in {{ahb_ort}} ist ab {{ahb_datum | date}} vorgesehen.{{/if}}`,
    },
    { ...SECTION_THERAPIEEMPFEHLUNG, order: 4 },
    { id: 'procedere', title: 'Procedere', order: 5, visibleIf: 'procedere_zusatz not empty', template: PROCEDERE_ZUSATZ },
  ],
};

/* ================================================================== */
/* T14 – Septische Pneumonie                                           */
/* ================================================================== */

const pneumonie = {
  id: 'pneumonie',
  title: 'Septische Pneumonie',
  group: 'Pneumologie',
  source: `${QUELLE_T} – „Schwere septische Pneumonie"`,
  description: 'Schwere ambulant erworbene Pneumonie mit antibiotischer Therapie.',
  sharedGroups: BASIS_GRUPPEN,
  fieldGroups: [
    {
      id: 'pneumonie_felder',
      title: 'Pneumonie',
      fields: [
        {
          key: 'lokalisation',
          label: 'Lokalisation',
          type: 'select',
          required: true,
          allowCustom: true,
          default: 'rechten Unterlappen',
          options: ['rechten Unterlappen', 'linken Unterlappen', 'rechten Oberlappen', 'linken Oberlappen', 'rechten Mittellappen'],
        },
        {
          key: 'erworben',
          label: 'Erwerbsart',
          type: 'select',
          required: true,
          default: 'community-aquired',
          options: [
            { value: 'community-aquired', label: 'ambulant erworben (community-aquired)' },
            { value: 'nosokomial', label: 'nosokomial' },
          ],
          help: 'Die Schreibweise „community-aquired" steht so im Quelldokument.',
        },
        {
          key: 'antibiose_substanzen',
          label: 'Antibiotische Therapie',
          type: 'multiselect',
          required: true,
          default: ['Clarithromycin', 'Ceftriaxon'],
          options: ['Clarithromycin', 'Ceftriaxon'],
        },
        { key: 'antibiose_tage', label: 'Therapiedauer', type: 'number', unit: 'Tage', required: true, default: '6' },
        { key: 'ventilationsstoerung', label: 'Initial restriktive Ventilationsstörung', type: 'checkbox', default: true },
        { key: 'pleuraerguss_ausgeschlossen', label: 'Sonographisch kein Pleuraerguss', type: 'checkbox', default: true },
        { key: 'ct_vorbefund', label: 'CT Thorax im Vorjahr ambulant erfolgt', type: 'checkbox' },
        { key: 'allergien', label: 'Allergien', type: 'text', placeholder: 'z. B. Penicillin' },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Diagnosen',
      order: 1,
      template: `Schwere septische Pneumonie im {{lokalisation}}, {{erworben}}
{{#each vordiagnosen}}
- {{this.text}}
{{/each}}
{{#if allergien}}
- Allergien: {{allergien}}
{{/if}}`,
    },
    { ...SECTION_BEFUNDE, order: 2, title: 'Technische Befunde' },
    {
      id: 'verlauf',
      title: 'Therapie und Verlauf',
      order: 3,
      template: `Die Aufnahme erfolgte bei einer septischen Pneumonie des {{lokalisation}}s. Wir behandelten antibiotisch mittels {{antibiose_substanzen | enum}} für {{antibiose_tage}} Tage.
{{#if ventilationsstoerung or pleuraerguss_ausgeschlossen or ct_vorbefund}}
{{#if ventilationsstoerung}}Initial zeigte sich eine restriktive Ventilationsstörung, {{/if}}{{#if pleuraerguss_ausgeschlossen}}sonografisch fand sich kein Anhalt für einen Pleuraerguss. {{/if}}{{#if ct_vorbefund}}Bereits Herbst letzten Jahres erhielt {{patient_nom}} ein CT Thorax im ambulanten Bereich.{{/if}}
{{/if}}`,
    },
    { ...SECTION_THERAPIEEMPFEHLUNG, order: 4 },
    { id: 'procedere', title: 'Procedere', order: 5, visibleIf: 'procedere_zusatz not empty', template: PROCEDERE_ZUSATZ },
  ],
};

/* ================================================================== */
/* T15 – Lungenkarzinom, Staging-Komplettierung                        */
/* ================================================================== */

const lungenkarzinomStaging = {
  id: 'lungenkarzinom_staging',
  title: 'Lungenkarzinom – Staging-Komplettierung',
  group: 'Pneumologie',
  source: `${QUELLE_T} – „Adenokarzinom des rechten Lungenoberlappenostiums"`,
  description: 'Elektive Aufnahme zur Komplettierung des Stagings bei Erstdiagnose eines Lungenkarzinoms.',
  sharedGroups: BASIS_GRUPPEN,
  fieldGroups: [
    {
      id: 'tumor',
      title: 'Tumor',
      fields: [
        { key: 'histologie', label: 'Histologie', type: 'text', required: true, default: 'Gering differenziertes Adenokarzinom' },
        { key: 'lokalisation', label: 'Lokalisation', type: 'text', required: true, default: 'des rechten Lungenoberlappenostiums' },
        { key: 'ed_monat', label: 'Erstdiagnose', type: 'month', required: true },
        { key: 'grading', label: 'Grading', type: 'select', required: true, default: 'G3', options: ['G1', 'G2', 'G3', 'G4'] },
        { key: 'tnm', label: 'TNM', type: 'text', required: true, placeholder: 'z. B. cT4N3M1a' },
        { key: 'uicc', label: 'Stadium nach UICC8', type: 'text', required: true, placeholder: 'z. B. IV A' },
        { key: 'pdl1_prozent', label: 'PD-L1', type: 'number', unit: '%' },
        { key: 'pleuraerguss_malign', label: 'Maligner Pleuraerguss', type: 'checkbox' },
        {
          key: 'pleuraerguss_seite',
          label: 'Seite',
          type: 'select',
          options: ['rechts', 'links'],
          visibleIf: 'pleuraerguss_malign',
        },
        {
          key: 'metastasen',
          label: 'Metastasen / weitere Befunde',
          type: 'list',
          addLabel: 'Befund hinzufügen',
          itemLabel: '{{this.text}}',
          itemFields: [{ key: 'text', label: 'Befund', type: 'text', required: true, placeholder: 'z. B. V.a. hepatische Metastasierung im Lebersegment 2' }],
        },
      ],
    },
    {
      id: 'diagnostik',
      title: 'Diagnostik',
      fields: [
        {
          key: 'tumormarker',
          label: 'Tumormarker',
          type: 'list',
          addLabel: 'Tumormarker hinzufügen',
          itemLabel: '{{this.name}} {{this.wert}}',
          itemFields: [
            { key: 'name', label: 'Marker', type: 'text', required: true, placeholder: 'z. B. Cyfra 21-1' },
            { key: 'wert', label: 'Wert', type: 'text', required: true },
            { key: 'einheit', label: 'Einheit', type: 'text', default: 'ng/ml' },
            { key: 'referenz', label: 'Referenz', type: 'text', placeholder: 'z. B. < 3.30' },
          ],
        },
        { key: 'molekulardiagnostik_nachgefordert', label: 'Molekulardiagnostik nachgefordert', type: 'checkbox' },
        { key: 'molekulardiagnostik_ort', label: 'Pathologie', type: 'text', visibleIf: 'molekulardiagnostik_nachgefordert', default: 'Starnberg' },
        { key: 'atelektase', label: 'Ausgeprägte Atelektase mit Begleiterguss im Röntgen-Thorax', type: 'checkbox' },
        { key: 'punktion_datum', label: 'Datum der Pleurapunktion', type: 'date', visibleIf: 'atelektase' },
        { key: 'punktion_menge_ml', label: 'Drainierte Menge', type: 'number', unit: 'ml', visibleIf: 'atelektase' },
        { key: 'bronchoskopie_befund', label: 'Bronchoskopischer Befund', type: 'multiline', rows: 2 },
      ],
    },
  ],
  sections: [
    {
      id: 'diagnosen',
      title: 'Aktuelle Diagnose',
      order: 1,
      template: `{{histologie}} {{lokalisation}} (ED {{ed_monat | monthyear}}), {{grading}}, {{tnm}} Stadium {{uicc}} nach UICC8
{{#if pdl1_prozent}}
PDL1 {{pdl1_prozent}}%
{{/if}}
{{#if pleuraerguss_malign}}
Maligner PLE {{pleuraerguss_seite}}
{{/if}}
{{#each metastasen}}
{{this.text}}
{{/each}}`,
    },
    {
      id: 'befunde',
      title: 'Technische Befunde',
      order: 2,
      visibleIf: 'labor_auffaellig not empty or tumormarker not empty or weitere_befunde not empty',
      template: `{{#if labor_auffaellig}}
Pathologische Laborparameter bei Aufnahme:
{{labor_auffaellig}}
{{/if}}
{{#if tumormarker}}
Tumormarker: {{#each tumormarker}}{{this.name}} {{this.wert}} {{this.einheit}}{{#if this.referenz}} ({{this.referenz}}){{/if}}{{#unless @last}}, {{/unless}}{{/each}}.
{{/if}}
{{#if weitere_befunde}}
{{weitere_befunde}}
{{/if}}`,
    },
    {
      id: 'verlauf',
      title: 'Therapie und Verlauf',
      order: 3,
      template: `Elektive Aufnahme zur Komplettierung des Stagings bei Erstdiagnose eines {{histologie | lower}}s {{lokalisation}}.{{#if molekulardiagnostik_nachgefordert}} Bei noch nicht erfolgter Molekulardiagnostik wurde diese in der Pathologie {{molekulardiagnostik_ort}} nachgefordert.{{/if}}
{{#if atelektase}}
Im Röntgen-Thorax zeigte sich eine ausgeprägte Atelektase rechts mit Begleiterguss. Dieser wurde am {{punktion_datum | date}} komplikationslos punktiert. Es konnten insgesamt {{punktion_menge_ml}} ml Erguss drainiert werden. Die Histopathologie ergab den Nachweis von Zellen eines Adenokarzinoms.
{{/if}}
{{#if bronchoskopie_befund}}
Bronchoskopisch zeigte sich {{bronchoskopie_befund}} Histologisch zeigten sich in den Proben Zellen vereinbar mit einem Adenokarzinom. Die weitere immunhistochemische Untersuchung folgt.
{{/if}}`,
    },
    { ...SECTION_THERAPIEEMPFEHLUNG, order: 4 },
    { id: 'procedere', title: 'Procedere', order: 5, visibleIf: 'procedere_zusatz not empty', template: PROCEDERE_ZUSATZ },
  ],
};

export default [copdExazerbation, pneumonie, lungenkarzinomStaging];
