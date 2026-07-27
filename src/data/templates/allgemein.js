/**
 * Vorlage der Gruppe "Allgemein".
 *
 * Quelle: Textbausteine_Kardio.docx, Abschlussbrief bei Versterben eines
 * Patienten. Der Wortlaut ist bewusst unveraendert uebernommen; es handelt
 * sich um eine besonders sensible Vorlage.
 */

const QUELLE_T = 'Textbausteine_Kardio.docx';

const todesfallPalliativ = {
  id: 'todesfall_palliativ',
  title: 'Todesfall / palliativer Verlauf',
  group: 'Allgemein',
  source: `${QUELLE_T} – „Zusammenfassung und Verlauf" (Todesfall)`,
  description: 'Mitteilung über das Versterben einer Patientin oder eines Patienten nach palliativem Verlauf.',
  sharedGroups: ['stammdaten', 'vordiagnosen', 'therapieempfehlung'],
  fieldGroups: [
    {
      id: 'verlauf_felder',
      title: 'Verlauf',
      fields: [
        { key: 'vorstellung_datum', label: 'Datum der Vorstellung', type: 'date', required: true },
        {
          key: 'vorstellung_grund',
          label: 'Vorstellungsgrund',
          type: 'text',
          required: true,
          placeholder: 'z. B. zunehmender kardialer Dekompensation und starken Beinschmerzen',
        },
        { key: 'befund_klinisch', label: 'Klinischer und radiologischer Aufnahmebefund', type: 'multiline', rows: 3 },
        { key: 'befund_echo', label: 'Echokardiographischer Befund', type: 'multiline', rows: 3 },
        { key: 'antibiose_initial', label: 'Initiale antibiotische Therapie', type: 'text' },
        { key: 'antibiose_eskalation', label: 'Eskalation auf', type: 'text', visibleIf: 'antibiose_initial not empty' },
        { key: 'infektfokus', label: 'Infektfokus', type: 'multiline', rows: 2 },
        {
          key: 'therapielimitation',
          label: 'Therapielimitationen mit Angehörigen festgelegt',
          type: 'checkbox',
          default: true,
        },
        { key: 'todesdatum', label: 'Todesdatum', type: 'date', required: true },
      ],
    },
  ],
  sections: [
    {
      id: 'zusammenfassung',
      title: 'Zusammenfassung und Verlauf',
      order: 1,
      template: `Mit Bedauern müssen wir Ihnen vom Tode {{patient_gen}} gemeinsamen {{patient_wort}}, {{anrede_kurz}}{{#if vorname}} ({{voller_name}}){{/if}} berichten.
{{anrede_name}} stellte sich am {{vorstellung_datum | date}} bei {{vorstellung_grund}} in der zentralen Notaufnahme vor.
{{#if befund_klinisch}}
{{befund_klinisch}}
{{/if}}
{{#if befund_echo}}
{{befund_echo}}
{{/if}}
{{#if antibiose_initial}}
Bei einem septischen Infektbild unklarer Genese begannen wir eine i.v. Therapie mit {{antibiose_initial}}.{{#if antibiose_eskalation}} Bei weiterhin steigenden Entzündungsparameter und klinischen Zeichen der Sepsis erfolgte die Eskalation auf {{antibiose_eskalation}}.{{/if}}
{{/if}}
{{#if infektfokus}}
{{infektfokus}}
{{/if}}
Der Allgemeinzustand von {{anrede_kurz}} verschlechterte sich während des stationären Aufenthaltes zunehmends.
{{#if therapielimitation}}
Die Situation wurde mit den Angehörigen ausführlich besprochen. Gemeinsam wurden Therapielimitationen festgelegt und der Beginn palliativer Maßnahmen eingeleitet.
{{/if}}
{{anrede_name}} verstarb hierunter friedlich am {{todesdatum | dateShortYear}}. Wir bedauern diesen Verlauf.`,
    },
    {
      id: 'vordiagnosen',
      title: 'Relevante Vordiagnosen',
      order: 2,
      visibleIf: 'vordiagnosen not empty',
      template: '{{#each vordiagnosen}}- {{this.text}}\n{{/each}}',
    },
  ],
};

export default [todesfallPalliativ];
