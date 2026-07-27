/**
 * Gemeinsame Feldgruppen.
 *
 * Diese Felder wiederholen sich in nahezu jeder Vorlage. Sie werden einmal
 * definiert und von den Templates ueber `sharedGroups: ['stammdaten', …]`
 * referenziert. Dadurch bleiben eingegebene Stammdaten beim Wechsel der
 * Vorlage erhalten.
 *
 * Alle Optionswerte sind woertlich aus den Quelldokumenten uebernommen
 * (siehe DOCS/QUELLTEXTE.md).
 */

import { normaliseFieldGroup } from '../core/schema.js';

/** Belegstelle: Textbausteine_Kardio.docx, Abschnitt "Kardiovaskuläre Risikofaktoren". */
export const RISIKOFAKTOREN = [
  'Arterielle Hypertonie',
  'Adipositas',
  'Nikotinabusus',
  'Diabetes Mellitus',
  'Hypercholesterinämie',
  'Hyperlipoproteinämie',
  'Hyperurikämie',
  'positive Familienanamnese',
];

/** Belegstellen: "hochgradiger LAD/RCA/RCX-Stenose", "Verschluss der LAD/RCX/RCA". */
export const KORONARGEFAESSE = ['LAD', 'RCX', 'RCA', 'Hauptstamm', 'Ramus diagonalis', 'Ramus marginalis', 'Ramus intermedius'];

export const P2Y12 = ['Clopidogrel', 'Prasugrel', 'Ticagrelor'];

const RAW_GROUPS = [
  {
    id: 'stammdaten',
    order: 10,
    title: 'Patientenstammdaten',
    description: 'Steuert zugleich die geschlechtsabhängigen Formulierungen („sein/ihr", „der Patient/die Patientin").',
    fields: [
      {
        key: 'anrede',
        label: 'Anrede',
        type: 'select',
        required: true,
        default: 'Herr',
        options: ['Herr', 'Frau'],
        help: 'Bestimmt alle geschlechtsabhängigen Formulierungen im Brief.',
      },
      { key: 'nachname', label: 'Nachname', type: 'text', required: true, placeholder: 'z. B. Müller' },
      { key: 'vorname', label: 'Vorname', type: 'text', help: 'Nur für Vorlagen, die den vollen Namen nennen.' },
      { key: 'alter', label: 'Alter', type: 'number', unit: 'Jahre', min: 0, max: 120 },
      { key: 'groesse_cm', label: 'Größe', type: 'number', unit: 'cm', min: 0, max: 250 },
      { key: 'gewicht_kg', label: 'Gewicht', type: 'number', unit: 'kg', min: 0, max: 400 },
    ],
  },
  {
    id: 'aufenthalt',
    order: 20,
    title: 'Aufenthalt',
    fields: [
      { key: 'aufnahme_datum', label: 'Aufnahmedatum', type: 'date', required: true },
      { key: 'entlass_datum', label: 'Entlassdatum', type: 'date', required: true },
      {
        key: 'entlass_az',
        label: 'Allgemeinzustand bei Entlassung',
        type: 'select',
        required: true,
        default: 'gutem',
        options: [
          { value: 'gutem', label: 'gutem Allgemeinzustand' },
          { value: 'stabilem', label: 'stabilem Allgemeinzustand' },
          { value: 'deutlich gebessertem', label: 'deutlich gebessertem Allgemeinzustand' },
        ],
        help: 'Beleg: „in gutem/stabilem Allgemeinzustand" (Musterarztbriefe).',
      },
    ],
  },
  {
    id: 'risikofaktoren',
    order: 60,
    title: 'Kardiovaskuläre Risikofaktoren',
    description: 'Belegstelle: Textbausteine_Kardio.docx, Kopfabschnitt.',
    fields: [
      {
        key: 'kv_risikofaktoren',
        label: 'Risikofaktoren',
        type: 'multiselect',
        options: RISIKOFAKTOREN,
        help: 'Mehrfachauswahl; erscheint als Aufzählung im Abschnitt „Kardiovaskuläre Risikofaktoren".',
      },
      {
        key: 'nikotin_py',
        label: 'Nikotinabusus',
        type: 'number',
        unit: 'py',
        visibleIf: 'kv_risikofaktoren contains "Nikotinabusus"',
        help: 'Beleg: „Nikotinabusus (XX py)".',
      },
      {
        key: 'diabetes_typ',
        label: 'Diabetes-Typ',
        type: 'select',
        options: ['I', 'II'],
        visibleIf: 'kv_risikofaktoren contains "Diabetes Mellitus"',
        help: 'Beleg: „Diabetes Mellitus Typ I/II".',
      },
    ],
  },
  {
    id: 'vordiagnosen',
    order: 62,
    title: 'Relevante Vordiagnosen',
    fields: [
      {
        key: 'vordiagnosen',
        label: 'Vordiagnosen',
        type: 'list',
        addLabel: 'Vordiagnose hinzufügen',
        itemLabel: '{{this.text}}',
        itemFields: [
          { key: 'text', label: 'Diagnose', type: 'text', required: true, placeholder: 'z. B. Arterielle Hypertonie' },
        ],
      },
    ],
  },
  {
    id: 'anamnese_untersuchung',
    order: 64,
    title: 'Anamnese und Untersuchung',
    fields: [
      { key: 'anamnese', label: 'Anamnese', type: 'multiline', rows: 5, help: 'Freitext; Bausteine über die Bausteinbibliothek einfügbar.' },
      {
        key: 'ku_variante',
        label: 'Körperlicher Untersuchungsbefund',
        type: 'select',
        default: '',
        options: [
          { value: '', label: '– kein Standardbefund –' },
          { value: 'ausfuehrlich', label: 'Ausführlicher Standardbefund' },
          { value: 'kurz', label: 'Kurzform' },
        ],
        help: 'Wörtlich aus Textbausteine_Kardio.docx.',
      },
      {
        key: 'ku_rhythmus',
        label: 'Herzaktion',
        type: 'select',
        default: 'rhythmisch',
        options: ['rhythmisch', 'arrhythmisch'],
        visibleIf: 'ku_variante == "kurz"',
        help: 'Beleg: Kurzbefund „auskultatorisch rein, rhythmisch" bzw. „arrhythmisch" (EPU bei VHF).',
      },
      { key: 'ku_zusatz', label: 'Ergänzung zum Untersuchungsbefund', type: 'multiline', rows: 3 },
      {
        key: 'veg_anamnese',
        label: 'Vegetative Anamnese ergänzen',
        type: 'checkbox',
        help: 'Fügt den Standardtext aus Textbausteine_Kardio.docx ein.',
      },
    ],
  },
  {
    id: 'befunde',
    order: 66,
    title: 'Befunde',
    fields: [
      {
        key: 'befund_datum',
        label: 'Befunddatum für Bausteine',
        type: 'date',
        help: 'Wird von Bausteinen verwendet, die „vom XX.XX.XXXX" enthalten.',
      },
      { key: 'ekg_aufnahme', label: 'EKG bei Aufnahme', type: 'multiline', rows: 2, placeholder: 'SR/VHF, HF /min, XT, R/S-Umschlag in V / V, keine signifikanten ERBS' },
      { key: 'labor_auffaellig', label: 'Pathologische Laborwerte bei Aufnahme', type: 'multiline', rows: 2 },
      { key: 'echo_befund', label: 'Echokardiographie', type: 'multiline', rows: 3 },
      { key: 'weitere_befunde', label: 'Weitere technische Befunde', type: 'multiline', rows: 4, help: 'Bausteine (LZ-EKG, LZ-RR, Lungenfunktion …) über die Bausteinbibliothek einfügbar.' },
    ],
  },
  {
    id: 'therapieempfehlung',
    order: 80,
    title: 'Therapieempfehlung',
    fields: [
      {
        key: 'medikation',
        label: 'Medikation bei Entlassung',
        type: 'list',
        addLabel: 'Medikament hinzufügen',
        itemLabel: '{{this.wirkstoff}} {{this.staerke}} {{this.schema}}',
        itemFields: [
          { key: 'wirkstoff', label: 'Wirkstoff / Präparat', type: 'text', required: true },
          { key: 'staerke', label: 'Stärke', type: 'text', placeholder: 'z. B. 5 mg' },
          { key: 'schema', label: 'Einnahmeschema', type: 'text', placeholder: 'z. B. 1-0-0' },
          { key: 'hinweis', label: 'Hinweis', type: 'text' },
        ],
      },
      { key: 'therapieempfehlung_text', label: 'Ergänzende Therapieempfehlung', type: 'multiline', rows: 3 },
    ],
  },
  {
    id: 'procedere_frei',
    order: 90,
    title: 'Procedere – zusätzliche Zeilen',
    fields: [
      {
        key: 'procedere_zusatz',
        label: 'Weitere Procedere-Punkte',
        type: 'list',
        addLabel: 'Punkt hinzufügen',
        itemLabel: '{{this.text}}',
        itemFields: [
          { key: 'text', label: 'Text', type: 'text', required: true },
        ],
      },
    ],
  },
];

export const SHARED_FIELD_GROUPS = RAW_GROUPS.map(normaliseFieldGroup);

export const SHARED_GROUPS_BY_ID = new Map(SHARED_FIELD_GROUPS.map((group) => [group.id, group]));
