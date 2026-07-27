/** Tests fuer Normalisierung, Validierung und abgeleitete Platzhalter. */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  defaultValueForField,
  normaliseTemplate,
  resolveFieldGroups,
  validateTemplate,
} from '../src/core/schema.js';
import { withDerivedValues } from '../src/core/derived.js';
import { findMissingRequired, generateLetter, isVisible } from '../src/core/letter.js';
import { SHARED_GROUPS_BY_ID } from '../src/data/fields.js';

const basis = (overrides = {}) => normaliseTemplate({
  id: 'test',
  title: 'Test',
  sections: [{ id: 'a', title: 'A', template: 'Text' }],
  ...overrides,
});

const pruefe = (template, options = {}) => validateTemplate(template, { sharedGroupsById: SHARED_GROUPS_BY_ID, ...options });

/* ------------------------------------------------------------------ */
/* Normalisierung                                                      */
/* ------------------------------------------------------------------ */

test('Normalisierung setzt Standardwerte und sortiert Abschnitte', () => {
  const template = normaliseTemplate({
    id: 'x',
    title: 'X',
    sections: [
      { id: 'zwei', title: 'Zwei', order: 5, template: '' },
      { id: 'eins', title: 'Eins', order: 1, template: '' },
    ],
  });
  assert.deepEqual(template.sections.map((section) => section.id), ['eins', 'zwei']);
  assert.deepEqual(template.sections.map((section) => section.order), [1, 2]);
  assert.equal(template.schemaVersion, 3);
});

test('Optionen werden auf {value,label} vereinheitlicht', () => {
  const template = basis({
    fieldGroups: [{ id: 'g', title: 'G', fields: [{ key: 'f', label: 'F', type: 'select', options: ['A', { value: 'b', label: 'B' }] }] }],
  });
  assert.deepEqual(template.fieldGroups[0].fields[0].options, [
    { value: 'A', label: 'A' },
    { value: 'b', label: 'B' },
  ]);
});

test('Standardwerte je Feldtyp', () => {
  assert.equal(defaultValueForField({ type: 'text' }), '');
  assert.equal(defaultValueForField({ type: 'checkbox' }), false);
  assert.deepEqual(defaultValueForField({ type: 'multiselect' }), []);
  assert.deepEqual(defaultValueForField({ type: 'list' }), []);
  assert.equal(defaultValueForField({ type: 'select', default: 'A' }), 'A');
  assert.deepEqual(defaultValueForField({ type: 'multiselect', default: ['A'] }), ['A']);
});

test('gemeinsame Feldgruppen erscheinen in klinischer Reihenfolge', () => {
  const template = basis({ sharedGroups: ['procedere_frei', 'stammdaten', 'befunde'] });
  const ids = resolveFieldGroups(template, SHARED_GROUPS_BY_ID).map((group) => group.id);
  assert.deepEqual(ids, ['stammdaten', 'befunde', 'procedere_frei']);
});

test('vorlageneigene Gruppen liegen zwischen Stammdaten und Standardbloecken', () => {
  const template = basis({
    sharedGroups: ['stammdaten', 'procedere_frei'],
    fieldGroups: [{ id: 'fall', title: 'Fall', fields: [{ key: 'f', label: 'F', type: 'text' }] }],
  });
  const ids = resolveFieldGroups(template, SHARED_GROUPS_BY_ID).map((group) => group.id);
  assert.deepEqual(ids, ['stammdaten', 'fall', 'procedere_frei']);
});

/* ------------------------------------------------------------------ */
/* Validierung                                                         */
/* ------------------------------------------------------------------ */

test('gueltige Vorlage erzeugt weder Fehler noch Hinweise', () => {
  const template = basis({
    fieldGroups: [{ id: 'g', title: 'G', fields: [{ key: 'name', label: 'Name', type: 'text' }] }],
    sections: [{ id: 'a', title: 'A', template: 'Hallo {{name}}' }],
  });
  assert.deepEqual(pruefe(template), { errors: [], warnings: [] });
});

test('leere und ungueltige IDs werden abgelehnt', () => {
  assert.match(pruefe(basis({ id: '' })).errors.join(' '), /Template-ID darf nicht leer/);
  assert.match(pruefe(basis({ id: '1abc' })).errors.join(' '), /Ungültige Template-ID/);
  assert.match(pruefe(basis({ id: 'mit leerzeichen' })).errors.join(' '), /Ungültige Template-ID/);
});

test('doppelte Template-ID wird abgelehnt', () => {
  const bericht = pruefe(basis({ id: 'acs' }), { existingIds: ['acs', 'pvi'] });
  assert.match(bericht.errors.join(' '), /bereits vergeben/);
});

test('doppelte Abschnitts-IDs werden abgelehnt', () => {
  const template = basis({
    sections: [
      { id: 'a', title: 'A', template: '' },
      { id: 'a', title: 'B', template: '' },
    ],
  });
  assert.match(pruefe(template).errors.join(' '), /Doppelte Abschnitts-ID/);
});

test('Vorlage ohne Abschnitt wird abgelehnt', () => {
  assert.match(pruefe(basis({ sections: [] })).errors.join(' '), /mindestens einen Abschnitt/);
});

test('Auswahlfeld ohne Optionen wird abgelehnt', () => {
  const template = basis({
    fieldGroups: [{ id: 'g', title: 'G', fields: [{ key: 'f', label: 'F', type: 'select', options: [] }] }],
    sections: [{ id: 'a', title: 'A', template: '{{f}}' }],
  });
  assert.match(pruefe(template).errors.join(' '), /keine Optionen/);
});

test('Wiederholgruppe ohne Unterfelder wird abgelehnt', () => {
  const template = basis({
    fieldGroups: [{ id: 'g', title: 'G', fields: [{ key: 'f', label: 'F', type: 'list', itemFields: [] }] }],
    sections: [{ id: 'a', title: 'A', template: '{{#each f}}x{{/each}}' }],
  });
  assert.match(pruefe(template).errors.join(' '), /keine Unterfelder/);
});

test('reservierte Schluessel abgeleiteter Platzhalter sind gesperrt', () => {
  const template = basis({
    fieldGroups: [{ id: 'g', title: 'G', fields: [{ key: 'patient_nom', label: 'X', type: 'text' }] }],
    sections: [{ id: 'a', title: 'A', template: '{{patient_nom}}' }],
  });
  assert.match(pruefe(template).errors.join(' '), /reserviert/);
});

test('unbekannter Platzhalter ist ein Hinweis, kein Fehler', () => {
  const bericht = pruefe(basis({ sections: [{ id: 'a', title: 'A', template: '{{gibtsnicht}}' }] }));
  assert.equal(bericht.errors.length, 0);
  assert.match(bericht.warnings.join(' '), /kein zugehöriges Feld/);
});

test('ungueltige Bedingung ist ein Fehler', () => {
  const bericht = pruefe(basis({ sections: [{ id: 'a', title: 'A', template: '{{#if x ==}}y{{/if}}' }] }));
  assert.match(bericht.errors.join(' '), /ungültige Bedingung/);
});

test('unbekannter Filter ist ein Fehler', () => {
  const bericht = pruefe(basis({ sections: [{ id: 'a', title: 'A', template: '{{x | quatsch}}' }] }));
  assert.match(bericht.errors.join(' '), /unbekannter Filter/);
});

test('ungenutztes Feld wird als Hinweis gemeldet', () => {
  const template = basis({
    fieldGroups: [{ id: 'g', title: 'G', fields: [{ key: 'ungenutzt', label: 'U', type: 'text' }] }],
  });
  assert.match(pruefe(template).warnings.join(' '), /wird in keinem Abschnitt verwendet/);
});

/* ------------------------------------------------------------------ */
/* Abgeleitete Platzhalter                                             */
/* ------------------------------------------------------------------ */

test('geschlechtsabhaengige Formen aus der Anrede', () => {
  const maennlich = withDerivedValues({ anrede: 'Herr', nachname: 'Müller' });
  assert.equal(maennlich.anrede_name, 'Herr Müller');
  assert.equal(maennlich.anrede_name_akk, 'Herrn Müller');
  assert.equal(maennlich.patient_nom, 'der Patient');
  assert.equal(maennlich.patient_akk, 'den Patienten');
  assert.equal(maennlich.patient_poss, 'sein');
  assert.equal(maennlich.jaehriger, 'jähriger');
  assert.equal(maennlich.ist_weiblich, false);

  const weiblich = withDerivedValues({ anrede: 'Frau', nachname: 'Müller' });
  assert.equal(weiblich.anrede_name_akk, 'Frau Müller');
  assert.equal(weiblich.patient_nom, 'die Patientin');
  assert.equal(weiblich.patient_akk, 'die Patientin');
  assert.equal(weiblich.patient_poss, 'ihr');
  assert.equal(weiblich.jaehriger, 'jährige');
  assert.equal(weiblich.ist_weiblich, true);
});

test('abgeleitete Werte kommen auch ohne Nachnamen zurecht', () => {
  const daten = withDerivedValues({ anrede: 'Frau' });
  assert.equal(daten.anrede_name, 'Frau');
  assert.equal(daten.anrede_kurz, 'Fr.');
});

test('die Originaldaten werden nicht veraendert', () => {
  const original = { anrede: 'Herr' };
  withDerivedValues(original);
  assert.deepEqual(original, { anrede: 'Herr' });
});

/* ------------------------------------------------------------------ */
/* Sichtbarkeit und Pflichtfelder                                      */
/* ------------------------------------------------------------------ */

test('Sichtbarkeitsregeln von Feldern', () => {
  const feld = { visibleIf: 'acs_typ == "STEMI"' };
  assert.equal(isVisible(feld, { acs_typ: 'STEMI' }), true);
  assert.equal(isVisible(feld, { acs_typ: 'NSTEMI' }), false);
  assert.equal(isVisible({}, {}), true, 'ohne Regel immer sichtbar');
});

test('Pflichtfelder zaehlen nur, solange sie sichtbar sind', () => {
  const template = basis({
    fieldGroups: [{
      id: 'g',
      title: 'G',
      fields: [
        { key: 'typ', label: 'Typ', type: 'select', options: ['A', 'B'], required: true },
        { key: 'nur_bei_a', label: 'Nur bei A', type: 'text', required: true, visibleIf: 'typ == "A"' },
      ],
    }],
    sections: [{ id: 's', title: 'S', template: '{{typ}} {{nur_bei_a}}' }],
  });

  assert.deepEqual(findMissingRequired(template, { typ: 'B' }, SHARED_GROUPS_BY_ID).map((e) => e.key), []);
  assert.deepEqual(findMissingRequired(template, { typ: 'A' }, SHARED_GROUPS_BY_ID).map((e) => e.key), ['nur_bei_a']);
});

test('Abschnitte mit Sichtbarkeitsregel entfallen', () => {
  const template = basis({
    sections: [
      { id: 'immer', title: 'Immer', template: 'A' },
      { id: 'manchmal', title: 'Manchmal', template: 'B', visibleIf: 'zeigen' },
    ],
  });
  assert.deepEqual(generateLetter(template, {}, SHARED_GROUPS_BY_ID).sections.map((s) => s.id), ['immer']);
  assert.deepEqual(generateLetter(template, { zeigen: true }, SHARED_GROUPS_BY_ID).sections.map((s) => s.id), ['immer', 'manchmal']);
});

test('manuell bearbeitete Abschnitte werden nicht ueberschrieben', () => {
  const template = basis({
    fieldGroups: [{ id: 'g', title: 'G', fields: [{ key: 'name', label: 'N', type: 'text' }] }],
    sections: [{ id: 's', title: 'S', template: 'Hallo {{name}}' }],
  });

  const manual = new Map([['s', { text: 'Eigener Text', basedOn: 'Hallo A' }]]);
  const brief = generateLetter(template, { name: 'A' }, SHARED_GROUPS_BY_ID, { manualSections: manual });
  assert.equal(brief.sections[0].text, 'Eigener Text');
  assert.equal(brief.sections[0].manual, true);
  assert.equal(brief.sections[0].outdated, false, 'Vorlage unveraendert');

  const geaendert = generateLetter(template, { name: 'B' }, SHARED_GROUPS_BY_ID, { manualSections: manual });
  assert.equal(geaendert.sections[0].text, 'Eigener Text', 'manuelle Fassung bleibt stehen');
  assert.equal(geaendert.sections[0].outdated, true, 'Aenderung wird gemeldet');
  assert.equal(geaendert.sections[0].generatedText, 'Hallo B');
});
