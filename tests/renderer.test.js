/** Tests fuer Parser, Renderer und Filter. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { parseTemplate, collectTemplatePaths, collectConditions } from '../src/engine/tokenizer.js';
import { render } from '../src/engine/renderer.js';

const text = (source, data) => render(source, data).text;

/* ------------------------------------------------------------------ */
/* Platzhalter                                                         */
/* ------------------------------------------------------------------ */

test('einfache Platzhalterersetzung', () => {
  assert.equal(text('Hallo {{name}}!', { name: 'Welt' }), 'Hallo Welt!');
  assert.equal(text('{{ name }} und {{name}}', { name: 'A' }), 'A und A');
});

test('fehlende Werte hinterlassen keine Reste', () => {
  assert.equal(text('Wert: {{fehlt}}', {}), 'Wert:');
});

test('Text ohne Platzhalter bleibt unveraendert', () => {
  const quelle = 'Ziel-LDL <55mg/dl, Fadenzug in 8-10 Tagen, Z.n. PCI 1/2/3.';
  assert.equal(text(quelle, {}), quelle);
});

/* ------------------------------------------------------------------ */
/* Filter                                                              */
/* ------------------------------------------------------------------ */

test('Datums-, Uhrzeit- und Monatsfilter', () => {
  assert.equal(text('{{d | date}}', { d: '2026-05-21' }), '21.05.2026');
  assert.equal(text('{{d | dateShort}}', { d: '2026-05-21' }), '21.05.');
  assert.equal(text('{{d | dateShortYear}}', { d: '2026-05-21' }), '21.05.26');
  assert.equal(text('{{m | monthyear}}', { m: '2019-03' }), '03/19');
  assert.equal(text('{{t | time}}', { t: '09:05' }), '09.05');
});

test('Filter reichen unpassende Eingaben unveraendert durch', () => {
  assert.equal(text('{{d | date}}', { d: 'XX.XX.' }), 'XX.XX.');
  assert.equal(text('{{d | date}}', { d: '' }), '');
});

test('Zahlenfilter nutzt das deutsche Dezimalkomma', () => {
  assert.equal(text('{{v | num}}', { v: '0.8' }), '0,8');
  assert.equal(text('{{v | num:2}}', { v: '1.5' }), '1,50');
});

test('Aufzaehlungs- und Verbindungsfilter', () => {
  const data = { liste: ['A', 'B', 'C'] };
  assert.equal(text('{{liste | enum}}', data), 'A, B und C');
  assert.equal(text('{{liste | enum:"sowie"}}', data), 'A, B sowie C');
  assert.equal(text('{{liste | join}}', data), 'A, B, C');
  assert.equal(text('{{liste | join:" DD "}}', data), 'A DD B DD C');
  assert.equal(text('{{liste | enum}}', { liste: ['A'] }), 'A');
  assert.equal(text('{{liste | enum}}', { liste: [] }), '');
});

test('Ersatzwert-Filter', () => {
  assert.equal(text('{{v | fallback:"XX"}}', { v: '' }), 'XX');
  assert.equal(text('{{v | fallback:"XX"}}', { v: 'A' }), 'A');
});

test('Filterkette', () => {
  assert.equal(text('{{d | date | fallback:"XX.XX.XXXX"}}', { d: '' }), 'XX.XX.XXXX');
  assert.equal(text('{{d | date | fallback:"XX.XX.XXXX"}}', { d: '2026-01-02' }), '02.01.2026');
});

test('unbekannter Filter wird gemeldet, bricht aber nicht ab', () => {
  const ergebnis = render('{{v | gibtsnicht}}', { v: 'A' });
  assert.equal(ergebnis.text, 'A');
  assert.match(ergebnis.errors[0], /Unbekannter Filter/);
});

/* ------------------------------------------------------------------ */
/* Bedingungen                                                         */
/* ------------------------------------------------------------------ */

test('if, elseif und else', () => {
  const quelle = '{{#if typ == "STEMI"}}A{{#elseif typ == "NSTEMI"}}B{{#else}}C{{/if}}';
  assert.equal(text(quelle, { typ: 'STEMI' }), 'A');
  assert.equal(text(quelle, { typ: 'NSTEMI' }), 'B');
  assert.equal(text(quelle, { typ: 'Instabile AP' }), 'C');
});

test('unless', () => {
  const quelle = '{{#unless pfa}}PPI-Therapie empfohlen{{/unless}}';
  assert.equal(text(quelle, { pfa: false }), 'PPI-Therapie empfohlen');
  assert.equal(text(quelle, { pfa: true }), '');
});

test('verschachtelte Bedingungen', () => {
  const quelle = '{{#if a}}{{#if b}}AB{{#else}}A{{/if}}{{/if}}';
  assert.equal(text(quelle, { a: true, b: true }), 'AB');
  assert.equal(text(quelle, { a: true, b: false }), 'A');
  assert.equal(text(quelle, { a: false, b: true }), '');
});

test('Zeilen mit ausschliesslich Blocktags erzeugen keine Leerzeile', () => {
  const quelle = [
    'Erster Satz.',
    '{{#if optional}}',
    'Optionaler Satz.',
    '{{/if}}',
    'Letzter Satz.',
  ].join('\n');
  assert.equal(text(quelle, { optional: false }), 'Erster Satz.\nLetzter Satz.');
  assert.equal(text(quelle, { optional: true }), 'Erster Satz.\nOptionaler Satz.\nLetzter Satz.');
});

/* ------------------------------------------------------------------ */
/* Schleifen                                                           */
/* ------------------------------------------------------------------ */

test('each ueber eine Wiederholgruppe', () => {
  const quelle = '{{#each diagnosen}}- {{this.text}}\n{{/each}}';
  const data = { diagnosen: [{ text: 'Erste' }, { text: 'Zweite' }] };
  assert.equal(text(quelle, data), '- Erste\n- Zweite');
});

test('each mit Alias und Schleifenvariablen', () => {
  const quelle = '{{#each werte as w}}{{@number}}:{{w}}{{#unless @last}}, {{/unless}}{{/each}}';
  assert.equal(text(quelle, { werte: ['a', 'b', 'c'] }), '1:a, 2:b, 3:c');
});

test('each ueberspringt vollstaendig leere Eintraege', () => {
  const quelle = '{{#each liste}}- {{this.text}}\n{{/each}}';
  const data = { liste: [{ text: 'A' }, { text: '' }, { text: 'B' }] };
  assert.equal(text(quelle, data), '- A\n- B');
});

test('each auf leerer oder fehlender Liste erzeugt nichts', () => {
  assert.equal(text('{{#each liste}}x{{/each}}', { liste: [] }), '');
  assert.equal(text('{{#each liste}}x{{/each}}', {}), '');
});

test('in der Schleife bleibt der aeussere Datensatz erreichbar', () => {
  const quelle = '{{#each rf}}{{this}}{{#if this == "Nikotinabusus" and py}} ({{py}} py){{/if}}{{/each}}';
  assert.equal(text(quelle, { rf: ['Nikotinabusus'], py: '30' }), 'Nikotinabusus (30 py)');
});

/* ------------------------------------------------------------------ */
/* Fehlerbehandlung und Analyse                                        */
/* ------------------------------------------------------------------ */

test('nicht geschlossener Block wird gemeldet', () => {
  const ergebnis = render('{{#if a}}Text', { a: true });
  assert.match(ergebnis.errors.join(' '), /Nicht geschlossener Block/);
});

test('falsch geschachtelte Tags werden gemeldet', () => {
  const ergebnis = render('{{#if a}}{{#each l}}{{/if}}{{/each}}', {});
  assert.ok(ergebnis.errors.length > 0);
});

test('Kommentare erscheinen nicht in der Ausgabe', () => {
  assert.equal(text('A{{! nur eine Notiz }}B', {}), 'AB');
});

test('collectTemplatePaths ignoriert Schleifenvariablen', () => {
  const { nodes } = parseTemplate('{{name}} {{#each liste as e}}{{e.wert}}{{@index}}{{this.x}}{{/each}}');
  assert.deepEqual([...collectTemplatePaths(nodes)].sort(), ['liste', 'name']);
});

test('collectConditions findet alle Bedingungen', () => {
  const { nodes } = parseTemplate('{{#if a}}{{#unless b}}x{{/unless}}{{#elseif c}}y{{/if}}');
  const bedingungen = collectConditions(nodes).map((entry) => entry.expression);
  assert.deepEqual(bedingungen.sort(), ['a', 'b', 'c']);
});
