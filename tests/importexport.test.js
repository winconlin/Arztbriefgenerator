/**
 * Tests fuer Import und Export.
 *
 * Geprueft wird die Logik, die der Editor beim Ein- und Auslesen anwendet:
 * Normalisierung, Validierung jeder einzelnen Vorlage und Erkennung von
 * ID-Kollisionen. Der alte Prototyp ersetzte den gesamten Bestand ungeprueft
 * (siehe DOCS/ARCHITECTURE_AND_BUGS.md, 3.2).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { SCHEMA_VERSION, normaliseTemplate, validateTemplate } from '../src/core/schema.js';
import { BUILTIN_TEMPLATES } from '../src/data/templates/index.js';
import { SHARED_GROUPS_BY_ID } from '../src/data/fields.js';
import { generateLetter, letterToText } from '../src/core/letter.js';

/** Bildet nach, was editorView.importFile mit einer Datei macht. */
function importieren(inhalt, vorhandeneIds = []) {
  let geparst;
  try {
    geparst = JSON.parse(inhalt);
  } catch (error) {
    return { fehler: `Kein gültiges JSON: ${error.message}`, angenommen: [], abgelehnt: [] };
  }

  const eingehend = Array.isArray(geparst) ? geparst : geparst?.templates;
  if (!Array.isArray(eingehend) || eingehend.length === 0) {
    return { fehler: 'Keine Vorlagen enthalten', angenommen: [], abgelehnt: [] };
  }

  const angenommen = [];
  const abgelehnt = [];
  for (const roh of eingehend) {
    const kandidat = normaliseTemplate(roh);
    const bericht = validateTemplate(kandidat, { sharedGroupsById: SHARED_GROUPS_BY_ID });
    if (bericht.errors.length) abgelehnt.push({ id: kandidat.id, grund: bericht.errors[0] });
    else angenommen.push(kandidat);
  }

  const kollisionen = angenommen.filter((template) => vorhandeneIds.includes(template.id)).map((t) => t.id);
  return { fehler: null, angenommen, abgelehnt, kollisionen };
}

const exportPaket = (templates) => JSON.stringify({
  format: 'arztbriefgenerator-vorlagen',
  schemaVersion: SCHEMA_VERSION,
  exportiertAm: '2026-07-27',
  templates,
}, null, 2);

/* ------------------------------------------------------------------ */

test('Export und Import ergeben dieselbe Vorlage', () => {
  const original = BUILTIN_TEMPLATES.find((t) => t.id === 'acs');
  const { angenommen, abgelehnt, fehler } = importieren(exportPaket([original]));

  assert.equal(fehler, null);
  assert.deepEqual(abgelehnt, []);
  assert.equal(angenommen.length, 1);
  assert.deepEqual(angenommen[0], original, 'Rundlauf veraendert die Vorlage nicht');
});

test('nach dem Rundlauf erzeugt die Vorlage denselben Brief', () => {
  const original = BUILTIN_TEMPLATES.find((t) => t.id === 'pvi');
  const werte = {
    anrede: 'Frau', nachname: 'Müller', entlass_datum: '2026-05-21', entlass_az: 'gutem',
    vhf_typ: 'Paroxysmal', vhf_erstdiagnose: '2024-02', ehra: 'II', cha2ds2vasc: '3', hasbled: '1',
    pvi_verfahren: 'Kryo-Ballon', pvi_datum: '2026-05-19', aufnahme_datum: '2026-05-18',
  };
  const vorher = letterToText(generateLetter(original, werte, SHARED_GROUPS_BY_ID).sections);

  const { angenommen } = importieren(exportPaket([original]));
  const nachher = letterToText(generateLetter(angenommen[0], werte, SHARED_GROUPS_BY_ID).sections);

  assert.equal(nachher, vorher);
});

test('alle mitgelieferten Vorlagen ueberstehen den Rundlauf', () => {
  const { angenommen, abgelehnt } = importieren(exportPaket(BUILTIN_TEMPLATES));
  assert.deepEqual(abgelehnt, []);
  assert.equal(angenommen.length, BUILTIN_TEMPLATES.length);
  assert.deepEqual(angenommen, BUILTIN_TEMPLATES);
});

test('ungueltiges JSON wird gemeldet, statt still zu scheitern', () => {
  const ergebnis = importieren('{kein json');
  assert.match(ergebnis.fehler, /Kein gültiges JSON/);
  assert.deepEqual(ergebnis.angenommen, []);
});

test('eine Datei ohne Vorlagen loescht nichts', () => {
  assert.match(importieren('{"templates": []}').fehler, /Keine Vorlagen/);
  assert.match(importieren('{"etwas": 1}').fehler, /Keine Vorlagen/);
  assert.match(importieren('[]').fehler, /Keine Vorlagen/);
});

test('eine blosse Liste von Vorlagen wird ebenfalls angenommen', () => {
  const original = BUILTIN_TEMPLATES.find((t) => t.id === 'acs');
  const ergebnis = importieren(JSON.stringify([original]));
  assert.equal(ergebnis.angenommen.length, 1);
});

test('fehlerhafte Vorlagen werden einzeln abgelehnt, gueltige uebernommen', () => {
  const gut = BUILTIN_TEMPLATES.find((t) => t.id === 'acs');
  const schlecht = { id: '', title: 'Ohne ID', sections: [{ id: 'a', title: 'A', template: 'x' }] };
  const kaputteBedingung = {
    id: 'kaputt', title: 'Kaputte Bedingung',
    sections: [{ id: 'a', title: 'A', template: '{{#if x ==}}y{{/if}}' }],
  };

  const ergebnis = importieren(exportPaket([gut, schlecht, kaputteBedingung]));
  assert.deepEqual(ergebnis.angenommen.map((t) => t.id), ['acs']);
  assert.deepEqual(ergebnis.abgelehnt.map((e) => e.id).sort(), ['', 'kaputt']);
});

test('ID-Kollisionen werden vor dem Ueberschreiben erkannt', () => {
  const original = BUILTIN_TEMPLATES.find((t) => t.id === 'acs');
  const ergebnis = importieren(exportPaket([original]), ['acs', 'pvi']);
  assert.deepEqual(ergebnis.kollisionen, ['acs']);

  const ohneKollision = importieren(exportPaket([{ ...original, id: 'acs_eigen' }]), ['acs']);
  assert.deepEqual(ohneKollision.kollisionen, []);
});

test('Fremdfelder im Import werden verworfen, nicht uebernommen', () => {
  const eingeschleust = {
    id: 'fremd',
    title: 'Fremd',
    boesesFeld: '<script>alert(1)</script>',
    sections: [{ id: 'a', title: 'A', template: 'Text', schadcode: 'x' }],
  };
  const { angenommen } = importieren(exportPaket([eingeschleust]));
  assert.equal(angenommen.length, 1);
  assert.equal(angenommen[0].boesesFeld, undefined, 'unbekannte Felder werden nicht uebernommen');
  assert.equal(angenommen[0].sections[0].schadcode, undefined);
});

test('Markup in Vorlagentexten bleibt Text und wird nicht ausgewertet', () => {
  // Die Oberflaeche schreibt ausschliesslich ueber textContent; hier wird
  // geprueft, dass die Engine Markup unveraendert als Text durchreicht.
  const template = normaliseTemplate({
    id: 'markup', title: 'Markup',
    fieldGroups: [{ id: 'g', title: 'G', fields: [{ key: 'wert', label: '<img src=x onerror=alert(1)>', type: 'text' }] }],
    sections: [{ id: 'a', title: 'A', template: 'Wert: {{wert}}' }],
  });
  const brief = generateLetter(template, { wert: '<script>alert(1)</script>' }, SHARED_GROUPS_BY_ID);
  assert.equal(brief.sections[0].text, 'Wert: <script>alert(1)</script>');
});
