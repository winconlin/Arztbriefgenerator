/** Tests fuer den sicheren Ausdrucksparser. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateCondition, validateExpression, collectExpressionPaths } from '../src/engine/expression.js';

const evaluate = (expression, data = {}) => evaluateCondition(expression, data, () => {});

test('leere Bedingung gilt als erfuellt', () => {
  assert.equal(evaluate(''), true);
  assert.equal(evaluate(undefined), true);
});

test('Wahrheitswert eines Feldes', () => {
  assert.equal(evaluate('aktiv', { aktiv: true }), true);
  assert.equal(evaluate('aktiv', { aktiv: false }), false);
  assert.equal(evaluate('name', { name: 'Mueller' }), true);
  assert.equal(evaluate('name', { name: '   ' }), false);
  assert.equal(evaluate('liste', { liste: [] }), false);
  assert.equal(evaluate('liste', { liste: ['a'] }), true);
});

test('numerische Vergleiche, auch bei Zahlen als Zeichenkette', () => {
  assert.equal(evaluate('score >= 2', { score: '2' }), true);
  assert.equal(evaluate('score >= 2', { score: 1 }), false);
  assert.equal(evaluate('score <= 1', { score: '0' }), true);
  assert.equal(evaluate('score > 1.5', { score: '1,8' }), true, 'deutsches Dezimalkomma');
  assert.equal(evaluate('score != 3', { score: '3' }), false);
});

test('Zeichenkettenvergleich ist unabhaengig von Gross- und Kleinschreibung', () => {
  assert.equal(evaluate('typ == "STEMI"', { typ: 'STEMI' }), true);
  assert.equal(evaluate('typ == "stemi"', { typ: 'STEMI' }), true);
  assert.equal(evaluate('typ != "NSTEMI"', { typ: 'STEMI' }), true);
});

test('und, oder, nicht sowie Klammern', () => {
  const data = { a: true, b: false, score: 3 };
  assert.equal(evaluate('a and not b', data), true);
  assert.equal(evaluate('a && !b', data), true);
  assert.equal(evaluate('b or score > 2', data), true);
  assert.equal(evaluate('(b or a) and score < 2', data), false);
});

test('contains prueft Mehrfachauswahl und Text', () => {
  const data = { rf: ['Arterielle Hypertonie', 'Nikotinabusus'], text: 'Vorderwandinfarkt' };
  assert.equal(evaluate('rf contains "Nikotinabusus"', data), true);
  assert.equal(evaluate('rf contains "Adipositas"', data), false);
  assert.equal(evaluate('text contains "wand"', data), true);
});

test('in kehrt contains um', () => {
  const data = { rf: ['Adipositas'], typ: 'NSTEMI' };
  assert.equal(evaluate('"Adipositas" in rf', data), true);
  assert.equal(evaluate('"Nikotinabusus" in rf', data), false);
  assert.equal(evaluate('typ in ["STEMI", "NSTEMI"]', data), true);
  assert.equal(evaluate('typ not in ["STEMI"]', data), true);
});

test('empty und not empty', () => {
  assert.equal(evaluate('wert empty', { wert: '' }), true);
  assert.equal(evaluate('wert empty', { wert: '  ' }), true);
  assert.equal(evaluate('wert not empty', { wert: 'x' }), true);
  assert.equal(evaluate('wert not empty', { wert: [] }), false);
  assert.equal(evaluate('wert empty', {}), true, 'fehlendes Feld gilt als leer');
});

test('Pfadzugriff in Schleifen', () => {
  assert.equal(evaluate('this.art == "PCI"', { this: { art: 'PCI' } }), true);
  assert.equal(evaluate('eintrag.zahl > 2', { eintrag: { zahl: 5 } }), true);
});

test('kein eval: Ausdruecke mit Code sind ungueltig, nicht ausfuehrbar', () => {
  // Weder Syntaxfehler noch Auswertung duerfen Code ausfuehren.
  globalThis.__eingeschleust = false;
  const boeseAusdruecke = [
    'globalThis.__eingeschleust = true',
    'constructor.constructor("globalThis.__eingeschleust=true")()',
    'a; globalThis.__eingeschleust = true',
  ];
  for (const ausdruck of boeseAusdruecke) {
    assert.equal(evaluate(ausdruck, {}), false, ausdruck);
  }
  assert.equal(globalThis.__eingeschleust, false, 'es wurde kein Code ausgefuehrt');
});

test('fehlerhafte Ausdruecke liefern false und melden den Fehler', () => {
  const fehler = [];
  assert.equal(evaluateCondition('score >=', {}, (error) => fehler.push(error)), false);
  assert.equal(fehler.length, 1);
});

test('validateExpression meldet Syntaxfehler', () => {
  assert.equal(validateExpression('a == "x"'), null);
  assert.equal(validateExpression('a =='), 'Unvollstaendiger Ausdruck "a =="');
  assert.notEqual(validateExpression('(a and b'), null);
});

test('collectExpressionPaths findet die verwendeten Felder', () => {
  const pfade = collectExpressionPaths('acs_typ == "STEMI" and ck_max not empty');
  assert.deepEqual([...pfade].sort(), ['acs_typ', 'ck_max']);
});
