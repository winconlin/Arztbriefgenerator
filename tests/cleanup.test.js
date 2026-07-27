/**
 * Tests fuer die Nachbereinigung.
 *
 * Zwei Anforderungen stehen sich gegenueber: fehlende optionale Werte duerfen
 * keine Reste hinterlassen, medizinische Notation muss aber unangetastet
 * bleiben. Beides wird hier geprueft.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { cleanupText, joinSections } from '../src/engine/cleanup.js';
import { render } from '../src/engine/renderer.js';

test('leere Klammern werden entfernt', () => {
  assert.equal(cleanupText('Nikotinabusus ()'), 'Nikotinabusus');
  assert.equal(cleanupText('Wert [ ]'), 'Wert');
  assert.equal(cleanupText('Text (, )'), 'Text');
});

test('doppelte Leerzeichen werden zusammengefasst', () => {
  assert.equal(cleanupText('Wir entlassen  Herrn  Mueller'), 'Wir entlassen Herrn Mueller');
});

test('Leerzeichen vor Satzzeichen verschwindet', () => {
  assert.equal(cleanupText('Satzende .'), 'Satzende.');
  assert.equal(cleanupText('A , B'), 'A, B');
  assert.equal(cleanupText('Cor : rein'), 'Cor: rein');
});

test('verwaiste Satzzeichenfolgen werden zusammengefasst', () => {
  assert.equal(cleanupText('A,, B'), 'A, B');
  assert.equal(cleanupText('A, . B'), 'A. B');
  assert.equal(cleanupText(', Der weitere Aufenthalt'), 'Der weitere Aufenthalt');
});

test('leere Aufzaehlungspunkte fallen weg', () => {
  assert.equal(cleanupText('- A\n- \n- B'), '- A\n- B');
  assert.equal(cleanupText('- A\n•\n- B'), '- A\n- B');
});

test('hoechstens eine Leerzeile am Stueck', () => {
  assert.equal(cleanupText('A\n\n\n\nB'), 'A\n\nB');
  assert.equal(cleanupText('\n\nA\n\n'), 'A');
});

test('medizinische Notation bleibt unveraendert', () => {
  const unveraendert = [
    'Ziel-LDL <55mg/dl',
    'KÖF 0,8 cm², pmean 45 mmHg',
    'Z.n. PCI, Fadenzug in 8-10 Tagen',
    'koronare 1/2/3-Gefäßerkrankung',
    'Tel. Chefarztsekreteriat 08031/365 3101',
    'Punktum maximum im 2.ICR parasternal rechts',
    'Echokardiographisch zeigt sich….',
    'QTc < 500 ms',
    'FEV1 1,33L (50,2%)',
    'CHA2DS2-VASc: 3, HAS-BLED: 2',
    'RV/TLC %.',
    'z. B. 4x 30 gtt. Metamizol',
  ];
  for (const zeile of unveraendert) {
    assert.equal(cleanupText(zeile), zeile, zeile);
  }
});

test('Einrueckung von Unterpunkten bleibt erhalten', () => {
  assert.equal(cleanupText('- Diagnose\n  - Unterpunkt'), '- Diagnose\n  - Unterpunkt');
});

test('zusammen mit dem Renderer entstehen keine Luecken', () => {
  const quelle = 'Diagnose{{#if zusatz}} ({{zusatz}}){{/if}} vom {{datum | date}}.';
  assert.equal(render(quelle, { datum: '2026-01-02' }).text, 'Diagnose vom 02.01.2026.');
  assert.equal(render(quelle, { zusatz: 'ED', datum: '2026-01-02' }).text, 'Diagnose (ED) vom 02.01.2026.');
});

test('joinSections laesst leere Abschnitte weg', () => {
  const abschnitte = [
    { title: 'Diagnosen', text: 'A' },
    { title: 'Leer', text: '   ' },
    { title: 'Procedere', text: 'B' },
  ];
  assert.equal(joinSections(abschnitte), 'Diagnosen\nA\n\nProcedere\nB');
  assert.equal(joinSections(abschnitte, { withTitles: false }), 'A\n\nB');
});
