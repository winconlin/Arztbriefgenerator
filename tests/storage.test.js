/**
 * Tests fuer Persistenz und Migration.
 *
 * Der localStorage wird durch eine schlichte Attrappe ersetzt; storage.js
 * greift nur innerhalb von Funktionen darauf zu, deshalb genuegt es, sie vor
 * dem Aufruf zu setzen.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  LEGACY_KEYS,
  STORAGE_KEY,
  clearStorage,
  loadState,
  migrateTemplate,
  saveState,
} from '../src/core/storage.js';
import { SCHEMA_VERSION } from '../src/core/schema.js';

function attrappe(inhalt = {}, { voll = false } = {}) {
  const daten = new Map(Object.entries(inhalt));
  return {
    getItem: (key) => (daten.has(key) ? daten.get(key) : null),
    setItem: (key, value) => {
      if (voll && key === STORAGE_KEY) {
        const fehler = new Error('quota');
        fehler.name = 'QuotaExceededError';
        throw fehler;
      }
      daten.set(key, String(value));
    },
    removeItem: (key) => daten.delete(key),
    _daten: daten,
  };
}

const mitSpeicher = (speicher, aktion) => {
  globalThis.localStorage = speicher;
  try { return aktion(); } finally { delete globalThis.localStorage; }
};

/* ------------------------------------------------------------------ */
/* Migration aus dem Prototyp                                          */
/* ------------------------------------------------------------------ */

const ALTES_TEMPLATE = {
  id: 'acs_standard',
  title: 'ACS Standard',
  variables: [
    { key: 'patient_title', label: 'Anrede', type: 'select', options: ['Herr', 'Frau'], default: 'Herr', position: 'epikrise', order: 1 },
    { key: 'patient_name', label: 'Nachname', type: 'text', default: 'Mustermann', position: 'epikrise', order: 2 },
    { key: 'p2y12', label: 'P2Y12', type: 'select', options: ['Clopidogrel'], default: 'Ticagrelor', position: 'procedere', order: 1 },
    { key: 'kontrolle', label: 'Kontrolle', type: 'boolean', default: 'ja', position: 'procedere', order: 2 },
    { key: 'ohne_position', label: 'Sonstiges', type: 'multiline', position: 'nirgends' },
  ],
  output: {
    diagnosen: 'Akutes Koronarsyndrom bei KHK.',
    epikrise: '{{patient_title}} {{patient_name}} wurde aufgenommen.',
    procedere: '- DAPT mit ASS und {{p2y12}}',
  },
};

test('Migration erhaelt Texte und Platzhalter unveraendert', () => {
  const migriert = migrateTemplate(ALTES_TEMPLATE);
  assert.equal(migriert.id, 'acs_standard');
  assert.equal(migriert.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(migriert.sections.map((s) => s.id), ['diagnosen', 'epikrise', 'procedere']);
  assert.equal(migriert.sections[0].template, ALTES_TEMPLATE.output.diagnosen);
  assert.equal(migriert.sections[1].template, ALTES_TEMPLATE.output.epikrise);
  assert.equal(migriert.sections[2].template, ALTES_TEMPLATE.output.procedere);
});

test('Migration ordnet Variablen nach ihrer alten Position und Sortierung', () => {
  const migriert = migrateTemplate(ALTES_TEMPLATE);
  const gruppen = migriert.fieldGroups.map((gruppe) => gruppe.id);
  assert.deepEqual(gruppen, ['felder_epikrise', 'felder_procedere', 'felder_sonstige']);

  const epikrise = migriert.fieldGroups[0].fields.map((feld) => feld.key);
  assert.deepEqual(epikrise, ['patient_title', 'patient_name'], 'Reihenfolge aus "order"');
});

test('Migration bildet die alten Typen ab', () => {
  const migriert = migrateTemplate(ALTES_TEMPLATE);
  const alle = migriert.fieldGroups.flatMap((gruppe) => gruppe.fields);
  const nach = (key) => alle.find((feld) => feld.key === key);

  assert.equal(nach('patient_title').type, 'select');
  assert.deepEqual(nach('patient_title').options, [{ value: 'Herr', label: 'Herr' }, { value: 'Frau', label: 'Frau' }]);
  assert.equal(nach('kontrolle').type, 'checkbox');
  assert.equal(nach('kontrolle').default, true, '"ja" wird zu true');
  assert.equal(nach('ohne_position').type, 'multiline');
});

test('Migration verkraftet unbrauchbare Eingaben', () => {
  assert.equal(migrateTemplate(null), null);
  assert.equal(migrateTemplate(undefined), null);
  const leer = migrateTemplate({ id: 'x', title: 'X' });
  assert.equal(leer.sections.length, 0);
  assert.equal(leer.fieldGroups.length, 0);
});

/* ------------------------------------------------------------------ */
/* Laden und Speichern                                                 */
/* ------------------------------------------------------------------ */

test('ohne gespeicherte Daten wird ein leerer Zustand geliefert', () => {
  const { state, notices } = mitSpeicher(attrappe(), loadState);
  assert.deepEqual(state.templates, []);
  assert.equal(state.settings.persistValues, false, 'Eingaben werden standardmaessig nicht gespeichert');
  assert.deepEqual(notices, []);
});

test('Daten der Vorversion werden uebernommen und die alten Daten bleiben erhalten', () => {
  const speicher = attrappe({ [LEGACY_KEYS[0]]: JSON.stringify({ templates: [ALTES_TEMPLATE] }) });
  const { state, notices } = mitSpeicher(speicher, loadState);

  assert.equal(state.templates.length, 1);
  assert.equal(state.templates[0].id, 'acs_standard');
  assert.match(notices.join(' '), /aus der Vorversion/);
  assert.ok(speicher.getItem(LEGACY_KEYS[0]), 'die alten Daten wurden nicht geloescht');
  assert.ok(speicher.getItem(STORAGE_KEY), 'die migrierten Daten wurden geschrieben');
});

test('defekte Daten fuehren zu einer Sicherung statt zum Datenverlust', () => {
  const speicher = attrappe({ [STORAGE_KEY]: '{kein gueltiges json' });
  const { state, notices } = mitSpeicher(speicher, loadState);

  assert.deepEqual(state.templates, []);
  assert.match(notices.join(' '), /konnten nicht gelesen werden/);
  const sicherungen = [...speicher._daten.keys()].filter((key) => key.includes('__defekt_'));
  assert.equal(sicherungen.length, 1, 'die defekten Daten wurden gesichert');
});

test('Eingaben werden nur bei ausdruecklicher Zustimmung gespeichert', () => {
  const ohne = attrappe();
  mitSpeicher(ohne, () => saveState({
    templates: [], hiddenBuiltins: [], settings: { persistValues: false }, values: { nachname: 'Müller' }, activeTemplateId: 'acs',
  }));
  assert.deepEqual(JSON.parse(ohne.getItem(STORAGE_KEY)).values, {}, 'keine Patientendaten im Speicher');

  const mit = attrappe();
  mitSpeicher(mit, () => saveState({
    templates: [], hiddenBuiltins: [], settings: { persistValues: true }, values: { nachname: 'Müller' }, activeTemplateId: 'acs',
  }));
  assert.deepEqual(JSON.parse(mit.getItem(STORAGE_KEY)).values, { nachname: 'Müller' });
});

test('voller Speicher liefert eine verstaendliche Meldung', () => {
  const meldung = mitSpeicher(attrappe({}, { voll: true }), () => saveState({
    templates: [], hiddenBuiltins: [], settings: {}, values: {}, activeTemplateId: '',
  }));
  assert.match(meldung, /Speicher ist voll/);
});

test('ohne localStorage bleibt die Anwendung benutzbar', () => {
  const { state, notices } = loadState();
  assert.deepEqual(state.templates, []);
  assert.match(notices.join(' '), /Kein Zugriff auf den lokalen Speicher/);
  assert.match(saveState({ templates: [], hiddenBuiltins: [], settings: {}, values: {} }), /Kein Zugriff/);
});

test('clearStorage entfernt aktuelle und alte Schluessel', () => {
  const speicher = attrappe({ [STORAGE_KEY]: '{}', [LEGACY_KEYS[0]]: '{}' });
  mitSpeicher(speicher, clearStorage);
  assert.equal(speicher.getItem(STORAGE_KEY), null);
  assert.equal(speicher.getItem(LEGACY_KEYS[0]), null);
});

test('gespeicherte Vorlagen im aktuellen Schema werden unveraendert gelesen', () => {
  const speicher = attrappe();
  const template = {
    schemaVersion: SCHEMA_VERSION,
    id: 'eigen',
    title: 'Eigene Vorlage',
    group: 'Eigene',
    sharedGroups: ['stammdaten'],
    fieldGroups: [],
    sections: [{ id: 'a', title: 'A', order: 1, template: 'Text {{nachname}}' }],
  };
  mitSpeicher(speicher, () => saveState({
    templates: [template], hiddenBuiltins: ['acs'], settings: { persistValues: false }, values: {}, activeTemplateId: 'eigen',
  }));

  const { state } = mitSpeicher(speicher, loadState);
  assert.equal(state.templates[0].id, 'eigen');
  assert.equal(state.templates[0].sections[0].template, 'Text {{nachname}}');
  assert.deepEqual(state.hiddenBuiltins, ['acs']);
  assert.equal(state.activeTemplateId, 'eigen');
});
